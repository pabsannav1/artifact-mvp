# Gestor de Pedidos Artifact-Centric

Sistema de gestión de pedidos basado en el enfoque **artifact-centric**, donde cada departamento mantiene su propio ciclo de vida independiente del mismo artefacto central: el **Pedido**.

## 🎯 Filosofía del Sistema

### Principios Fundamentales

1. **El framework sirve al problema, nunca al revés**
2. **Lo que no se puede explicar no se entiende. Lo que no se entiende no se puede implementar ni arreglar**
3. **Cada artefacto tiene un ciclo de vida diferente para cada actor**
4. **Cada actor debe tener todos los datos necesarios para operar**
5. **El sistema debe estar abierto a automatizaciones pero modelado para humanos**

### Enfoque Artifact-Centric

- **Artefacto Central**: El Pedido como concepto unificador
- **Estados Independientes**: Cada departamento (comercial, admin, taller) mantiene su propio estado
- **Vistas Contextuales**: Cada actor ve exactamente los datos necesarios para su operación
- **Eventos de Coordinación**: Los cambios en un departamento pueden activar automáticamente acciones en otros
- **Gestión de Casos Extremos**: Modificaciones parciales sin rigidez de flujos tradicionales

## 🏗️ Arquitectura

### Componentes Principales

```
src/
├── models/           # Artefacto central Pedido
├── state-machines/   # Máquinas de estado por departamento
├── events/          # Sistema de eventos y coordinación
├── services/        # Lógica de negocio (PedidoManager)
├── controllers/     # Controladores API por departamento
├── routes/          # Configuración de rutas
├── views/           # Generadores de vistas y formularios
└── index.js         # Servidor principal
```

### Departamentos y Estados

#### 🛒 Comercial
- **Estados**: Propuesto → Confirmado → (Modificado|En_espera|Cancelado)
- **Responsabilidades**: Gestión de propuestas, confirmaciones, modificaciones de clientes

#### 📋 Administración
- **Estados**: Confirmado → Pendiente_doc → En_fabricacion → Entregado → Facturado → Cobrado
- **Responsabilidades**: Verificación, documentación, facturación, cobros, incidencias

#### 🔧 Taller
- **Estados**: Pendiente_doc → En_fabricacion → Entregado
- **Responsabilidades**: Fabricación, control de calidad, entregas, incidencias técnicas

## 🚀 Instalación y Uso

### Prerrequisitos

- Node.js 18+
- npm o yarn

### Instalación

```bash
# Instalar dependencias
npm install

# Modo desarrollo (con datos de ejemplo)
npm run dev

# Modo producción
npm start
```

### Endpoints Principales

```
http://localhost:3000/                    # Información del sistema
http://localhost:3000/api/docs           # Documentación completa
http://localhost:3000/health             # Health check

# Dashboards por departamento
http://localhost:3000/api/comercial/dashboard
http://localhost:3000/api/admin/dashboard
http://localhost:3000/api/taller/dashboard

# APIs departamentales
/api/comercial/*    # Operaciones comerciales
/api/admin/*        # Operaciones administrativas
/api/taller/*       # Operaciones de taller
/api/sistema/*      # Operaciones del sistema
```

## 📊 Características Principales

### ✅ Vistas Contextuales

Cada departamento ve exactamente los datos que necesita:

```javascript
// Vista comercial - enfoque en cliente y propuesta
{
  cliente: { nombre, email, empresa },
  productos: [...],
  especificaciones: "...",
  estadoActual: { estado: "propuesto", responsable: "comercial_1" },
  formulario: { titulo: "Crear Propuesta", campos: [...] }
}

// Vista taller - enfoque en fabricación
{
  especificaciones: "...",
  procesosRequeridos: [...],
  estadoActual: { estado: "en_fabricacion", responsable: "taller_1" },
  metricas: { tiempoEnFabricacion: 5, eficienciaFabricacion: "puntual" }
}
```

### 🔄 Sistema de Eventos

Coordinación automática entre departamentos sin acoplamiento:

```javascript
// Cuando comercial confirma → admin se activa automáticamente
eventManager.subscribe(EventTypes.PEDIDO_CONFIRMADO, async (event) => {
  const pedido = pedidoManager.obtenerPedido(event.data.pedidoId);
  await pedidoManager.cambiarEstado(pedidoId, 'admin', 'confirmado', 'sistema');
});
```

### 📝 Formularios Dinámicos

Formularios que se adaptan al estado actual:

```javascript
// Estado "propuesto" en comercial
{
  titulo: "Crear Propuesta",
  campos: [
    { nombre: "cliente.nombre", tipo: "text", obligatorio: true },
    { nombre: "productos", tipo: "array", obligatorio: true },
    { nombre: "especificaciones", tipo: "textarea", obligatorio: true }
  ]
}

// Estado "facturado" en admin
{
  titulo: "Crear Factura",
  campos: [
    { nombre: "numeroFactura", tipo: "text", obligatorio: true },
    { nombre: "importeFacturado", tipo: "number", obligatorio: true }
  ]
}
```

### 📈 Dashboards Específicos

Cada departamento tiene métricas relevantes:

- **Comercial**: Conversión de propuestas, tiempo en espera, alertas de revisión
- **Admin**: Facturación, cobros pendientes, eficiencia financiera
- **Taller**: Carga de trabajo, eficiencia, control de calidad, puntualidad

### 🔀 Modificaciones Parciales

Gestión inteligente de cambios que solo afectan a los departamentos necesarios:

```javascript
// Modificación de especificaciones → solo afecta al taller si ya está en fabricación
await pedidoManager.procesarModificacionParcial(
  pedidoId,
  'especificaciones',
  { especificaciones: "Nuevas especificaciones..." },
  responsable
);
// → El taller recibe automáticamente la modificación sin pasar por admin
```

## 🧪 Ejemplos de Uso

### Crear una Propuesta

```bash
curl -X POST http://localhost:3000/api/comercial/propuestas \
  -H "Content-Type: application/json" \
  -d '{
    "responsable": "comercial_1",
    "cliente": {
      "nombre": "Empresa Ejemplo",
      "email": "contacto@ejemplo.com"
    },
    "productos": ["Producto A", "Producto B"],
    "especificaciones": "Especificaciones detalladas..."
  }'
```

### Confirmar Pedido

```bash
curl -X PATCH http://localhost:3000/api/comercial/pedidos/{pedidoId}/confirmar \
  -H "Content-Type: application/json" \
  -d '{
    "responsable": "comercial_1",
    "presupuesto": { "total": 15000 },
    "fechaEntregaSolicitada": "2024-03-15"
  }'
```

### Iniciar Fabricación

```bash
curl -X PATCH http://localhost:3000/api/taller/pedidos/{pedidoId}/iniciar \
  -H "Content-Type: application/json" \
  -d '{
    "responsableFabricacion": "taller_1",
    "procesosRequeridos": ["Corte", "Soldadura", "Acabado"]
  }'
```

## 🎭 Casos de Uso Avanzados

### Modificación con Impacto Selectivo

```javascript
// Cliente cambia especificaciones → solo se notifica al taller
const resultado = await pedidoManager.procesarModificacionParcial(
  pedidoId,
  'especificaciones',
  { especificaciones: 'Nuevas especificaciones técnicas' },
  'comercial_1'
);

// Resultado: { departamentosAfectados: ['taller'] }
// El taller recibe automáticamente una notificación de modificación
```

### Estados Paralelos Sin Sincronización

```javascript
// Admin puede facturar mientras taller gestiona incidencias
// No hay bloqueos ni dependencias estrictas entre departamentos

// Taller reporta incidencia
await pedidoManager.cambiarEstado(pedidoId, 'taller', 'incidencia', 'taller_1');

// Admin sigue con su flujo independiente
await pedidoManager.cambiarEstado(pedidoId, 'admin', 'facturado', 'admin_1');
```

### Métricas Cross-Departamentales

```javascript
// Vista completa del pedido desde cualquier departamento
const vistaCompleta = await fetch(`/api/sistema/pedidos/${pedidoId}/completo`);

// Incluye:
// - Datos completos del artefacto
// - Estados actuales de todos los departamentos
// - Historial completo de cambios
// - Métricas calculadas por departamento
```

## 🔧 Configuración

### Variables de Entorno

```bash
PORT=3000                    # Puerto del servidor
NODE_ENV=development         # Entorno (development/production)
```

### Modo Desarrollo

- Datos de ejemplo precargados
- CORS habilitado para todos los orígenes
- Logging detallado de requests
- Endpoints de desarrollo adicionales

## 📚 Documentación Técnica

### Máquinas de Estado

Cada departamento define sus transiciones válidas:

```javascript
// Ejemplo: EstadosComercial
static transicionesPermitidas = {
  'propuesto': ['confirmado', 'cancelado'],
  'confirmado': ['modificado', 'en_espera', 'cancelado'],
  'modificado': ['confirmado', 'cancelado'],
  // ...
};
```

### Sistema de Validaciones

Validaciones específicas por estado:

```javascript
static validarConfirmado(datos) {
  const errores = [];
  if (!datos.presupuesto?.total) errores.push('Presupuesto obligatorio');
  if (!datos.fechaEntregaSolicitada) errores.push('Fecha entrega obligatoria');

  return { valido: errores.length === 0, errores };
}
```

### Eventos del Sistema

```javascript
const EventTypes = {
  // Comercial
  PEDIDO_CONFIRMADO: 'comercial.pedido.confirmado',
  PEDIDO_MODIFICADO: 'comercial.pedido.modificado',

  // Admin
  ORDEN_FABRICACION_ENVIADA: 'admin.orden_fabricacion.enviada',
  FACTURA_CREADA: 'admin.factura.creada',

  // Taller
  FABRICACION_FINALIZADA: 'taller.fabricacion.finalizada',
  PROBLEMA_FABRICACION: 'taller.problema.detectado'
};
```

## 🤝 Contribución

Este proyecto implementa un patrón de diseño específico (artifact-centric) para demostrar cómo modelar procesos complejos de manera natural y flexible.

### Principios de Contribución

1. **Mantener la filosofía artifact-centric**: El artefacto es el centro, no los procesos
2. **Estados independientes**: Cada departamento es autónomo en su ciclo de vida
3. **Vistas contextuales**: Mostrar solo los datos necesarios para cada actor
4. **Eventos de coordinación**: Usar eventos para sincronización, no dependencias directas
5. **Preparado para humanos**: Diseñar para casos extremos y operación manual

## 📝 Licencia

MIT - Ver archivo `LICENSE` para detalles.

## 🚧 Roadmap

- [ ] Interfaz web completa con React/Vue
- [ ] Persistencia en base de datos (PostgreSQL)
- [ ] Sistema de autenticación y autorización
- [ ] API GraphQL complementaria
- [ ] Webhooks para integraciones externas
- [ ] Módulo de reportes avanzados
- [ ] Tests automatizados completos
- [ ] Documentación interactiva (Swagger UI)

---

**"El sistema se adapta a las personas, no las personas al sistema"**