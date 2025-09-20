-- Esquema de base de datos para el sistema artifact-centric de gestión de pedidos
-- Compatible con PostgreSQL/Neon

-- Eliminar tablas si existen (para desarrollo)
DROP TABLE IF EXISTS documentos CASCADE;
DROP TABLE IF EXISTS estados_historial CASCADE;
DROP TABLE IF EXISTS pedidos CASCADE;

-- Extensiones necesarias
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Tabla principal de pedidos
CREATE TABLE pedidos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    fecha_creacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,

    -- Datos del cliente
    cliente_nombre VARCHAR(255) NOT NULL,
    cliente_email VARCHAR(255),
    cliente_telefono VARCHAR(50),
    cliente_empresa VARCHAR(255),
    cliente_direccion TEXT,

    -- Datos del pedido
    productos JSONB NOT NULL DEFAULT '[]',
    especificaciones TEXT,
    fecha_entrega_solicitada TIMESTAMP WITH TIME ZONE,
    prioridad VARCHAR(20) DEFAULT 'normal' CHECK (prioridad IN ('baja', 'normal', 'alta', 'urgente')),
    observaciones TEXT,

    -- Estados por departamento
    estado_comercial VARCHAR(50),
    estado_admin VARCHAR(50),
    estado_taller VARCHAR(50),

    -- Datos adicionales por departamento (JSON flexible)
    datos_comercial JSONB DEFAULT '{}',
    datos_admin JSONB DEFAULT '{}',
    datos_taller JSONB DEFAULT '{}',

    -- Responsables actuales
    responsable_comercial VARCHAR(100),
    responsable_admin VARCHAR(100),
    responsable_taller VARCHAR(100),

    -- Fechas de cambio de estado
    fecha_comercial TIMESTAMP WITH TIME ZONE,
    fecha_admin TIMESTAMP WITH TIME ZONE,
    fecha_taller TIMESTAMP WITH TIME ZONE,

    -- Datos financieros
    presupuesto_importe DECIMAL(12,2) DEFAULT 0,
    presupuesto_iva DECIMAL(5,2) DEFAULT 21,
    presupuesto_descuento DECIMAL(12,2) DEFAULT 0,
    presupuesto_total DECIMAL(12,2) DEFAULT 0,

    -- Índices para búsquedas
    CONSTRAINT valid_estados CHECK (
        estado_comercial IS NULL OR estado_comercial IN ('propuesto', 'confirmado', 'modificado', 'en_espera', 'cancelado')
    ),
    CONSTRAINT valid_estados_admin CHECK (
        estado_admin IS NULL OR estado_admin IN ('confirmado', 'pendiente_doc', 'en_fabricacion', 'entregado', 'facturado', 'cobrado', 'cancelado', 'incidencia')
    ),
    CONSTRAINT valid_estados_taller CHECK (
        estado_taller IS NULL OR estado_taller IN ('pendiente_doc', 'en_fabricacion', 'entregado', 'cancelado', 'modificado', 'incidencia')
    )
);

-- Tabla de historial de cambios de estado
CREATE TABLE estados_historial (
    id SERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    fecha TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    departamento VARCHAR(20) NOT NULL CHECK (departamento IN ('comercial', 'admin', 'taller', 'sistema')),
    estado_anterior VARCHAR(50),
    estado_nuevo VARCHAR(50),
    responsable VARCHAR(100),
    observaciones TEXT,
    datos_adicionales JSONB DEFAULT '{}'
);

-- Tabla de documentos adjuntos
CREATE TABLE documentos (
    id SERIAL PRIMARY KEY,
    pedido_id UUID NOT NULL REFERENCES pedidos(id) ON DELETE CASCADE,
    nombre VARCHAR(255) NOT NULL,
    tipo VARCHAR(100),
    url TEXT,
    tamaño INTEGER,
    fecha_subida TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    subido_por VARCHAR(100),
    departamento VARCHAR(20) CHECK (departamento IN ('comercial', 'admin', 'taller'))
);

-- Índices para optimizar consultas
CREATE INDEX idx_pedidos_fecha_creacion ON pedidos(fecha_creacion);
CREATE INDEX idx_pedidos_estado_comercial ON pedidos(estado_comercial);
CREATE INDEX idx_pedidos_estado_admin ON pedidos(estado_admin);
CREATE INDEX idx_pedidos_estado_taller ON pedidos(estado_taller);
CREATE INDEX idx_pedidos_prioridad ON pedidos(prioridad);
CREATE INDEX idx_pedidos_cliente_empresa ON pedidos(cliente_empresa);

CREATE INDEX idx_historial_pedido_id ON estados_historial(pedido_id);
CREATE INDEX idx_historial_fecha ON estados_historial(fecha);
CREATE INDEX idx_historial_departamento ON estados_historial(departamento);

CREATE INDEX idx_documentos_pedido_id ON documentos(pedido_id);
CREATE INDEX idx_documentos_fecha_subida ON documentos(fecha_subida);

-- Triggers para mantener fecha_actualizacion actualizada
CREATE OR REPLACE FUNCTION update_fecha_actualizacion()
RETURNS TRIGGER AS $$
BEGIN
    NEW.fecha_actualizacion = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_pedidos_fecha_actualizacion
    BEFORE UPDATE ON pedidos
    FOR EACH ROW
    EXECUTE FUNCTION update_fecha_actualizacion();

-- Función para obtener pedidos por departamento con filtros
CREATE OR REPLACE FUNCTION obtener_pedidos_departamento(
    p_departamento VARCHAR(20),
    p_estado VARCHAR(50) DEFAULT NULL,
    p_limite INTEGER DEFAULT 100,
    p_offset INTEGER DEFAULT 0
)
RETURNS TABLE (
    id UUID,
    fecha_creacion TIMESTAMP WITH TIME ZONE,
    fecha_actualizacion TIMESTAMP WITH TIME ZONE,
    cliente_nombre VARCHAR(255),
    cliente_empresa VARCHAR(255),
    productos JSONB,
    especificaciones TEXT,
    prioridad VARCHAR(20),
    estado_actual VARCHAR(50),
    responsable_actual VARCHAR(100),
    datos_departamento JSONB,
    presupuesto_total DECIMAL(12,2)
) AS $$
BEGIN
    RETURN QUERY
    SELECT
        p.id,
        p.fecha_creacion,
        p.fecha_actualizacion,
        p.cliente_nombre,
        p.cliente_empresa,
        p.productos,
        p.especificaciones,
        p.prioridad,
        CASE
            WHEN p_departamento = 'comercial' THEN p.estado_comercial
            WHEN p_departamento = 'admin' THEN p.estado_admin
            WHEN p_departamento = 'taller' THEN p.estado_taller
        END as estado_actual,
        CASE
            WHEN p_departamento = 'comercial' THEN p.responsable_comercial
            WHEN p_departamento = 'admin' THEN p.responsable_admin
            WHEN p_departamento = 'taller' THEN p.responsable_taller
        END as responsable_actual,
        CASE
            WHEN p_departamento = 'comercial' THEN p.datos_comercial
            WHEN p_departamento = 'admin' THEN p.datos_admin
            WHEN p_departamento = 'taller' THEN p.datos_taller
        END as datos_departamento,
        p.presupuesto_total
    FROM pedidos p
    WHERE
        (p_estado IS NULL OR
         (p_departamento = 'comercial' AND p.estado_comercial = p_estado) OR
         (p_departamento = 'admin' AND p.estado_admin = p_estado) OR
         (p_departamento = 'taller' AND p.estado_taller = p_estado))
    ORDER BY p.fecha_actualizacion DESC
    LIMIT p_limite OFFSET p_offset;
END;
$$ LANGUAGE plpgsql;

-- Comentarios para documentación
COMMENT ON TABLE pedidos IS 'Tabla principal que almacena todos los pedidos con enfoque artifact-centric';
COMMENT ON TABLE estados_historial IS 'Historial completo de cambios de estado para auditoría';
COMMENT ON TABLE documentos IS 'Documentos adjuntos asociados a pedidos';

COMMENT ON COLUMN pedidos.productos IS 'Array JSON de productos del pedido';
COMMENT ON COLUMN pedidos.datos_comercial IS 'Datos específicos del departamento comercial en formato JSON';
COMMENT ON COLUMN pedidos.datos_admin IS 'Datos específicos del departamento administrativo en formato JSON';
COMMENT ON COLUMN pedidos.datos_taller IS 'Datos específicos del departamento de taller en formato JSON';