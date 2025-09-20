import { db } from './connection.js';

/**
 * Repositorio para operaciones CRUD de pedidos en PostgreSQL
 * Maneja la persistencia manteniendo la compatibilidad con el modelo artifact-centric
 */
export class PedidoRepository {
  constructor() {
    this.db = db;
  }

  /**
   * Crea un nuevo pedido en la base de datos
   */
  async crear(pedidoData) {
    const {
      id,
      fechaCreacion,
      fechaActualizacion,
      cliente,
      productos,
      especificaciones,
      fechaEntregaSolicitada,
      prioridad,
      observaciones,
      estados,
      presupuesto
    } = pedidoData;

    const query = `
      INSERT INTO pedidos (
        id, fecha_creacion, fecha_actualizacion,
        cliente_nombre, cliente_email, cliente_telefono, cliente_empresa, cliente_direccion,
        productos, especificaciones, fecha_entrega_solicitada, prioridad, observaciones,
        estado_comercial, estado_admin, estado_taller,
        datos_comercial, datos_admin, datos_taller,
        responsable_comercial, responsable_admin, responsable_taller,
        fecha_comercial, fecha_admin, fecha_taller,
        presupuesto_importe, presupuesto_iva, presupuesto_descuento, presupuesto_total
      ) VALUES (
        $1, $2, $3,
        $4, $5, $6, $7, $8,
        $9, $10, $11, $12, $13,
        $14, $15, $16,
        $17, $18, $19,
        $20, $21, $22,
        $23, $24, $25,
        $26, $27, $28, $29
      ) RETURNING *
    `;

    const values = [
      id,
      fechaCreacion,
      fechaActualizacion,
      cliente.nombre,
      cliente.email,
      cliente.telefono,
      cliente.empresa,
      cliente.direccion,
      JSON.stringify(productos),
      especificaciones,
      fechaEntregaSolicitada,
      prioridad,
      observaciones,
      estados.comercial.estado,
      estados.admin.estado,
      estados.taller.estado,
      JSON.stringify(estados.comercial.datos || {}),
      JSON.stringify(estados.admin.datos || {}),
      JSON.stringify(estados.taller.datos || {}),
      estados.comercial.responsable,
      estados.admin.responsable,
      estados.taller.responsable,
      estados.comercial.fechaCambio,
      estados.admin.fechaCambio,
      estados.taller.fechaCambio,
      presupuesto.importe,
      presupuesto.iva,
      presupuesto.descuento,
      presupuesto.total
    ];

    try {
      const result = await this.db.query(query, values);
      return this.mapRowToPedido(result.rows[0]);
    } catch (error) {
      console.error('❌ Error creando pedido:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene un pedido por ID
   */
  async obtenerPorId(pedidoId) {
    const query = `
      SELECT * FROM pedidos
      WHERE id = $1
    `;

    try {
      const result = await this.db.query(query, [pedidoId]);

      if (result.rows.length === 0) {
        return null;
      }

      const pedidoData = this.mapRowToPedido(result.rows[0]);

      // Obtener historial
      const historial = await this.obtenerHistorial(pedidoId);
      pedidoData.historial = historial;

      // Obtener documentos
      const documentos = await this.obtenerDocumentos(pedidoId);
      pedidoData.documentos = documentos;

      return pedidoData;
    } catch (error) {
      console.error('❌ Error obteniendo pedido:', error.message);
      throw error;
    }
  }

  /**
   * Actualiza un pedido existente
   */
  async actualizar(pedidoId, pedidoData) {
    const {
      fechaActualizacion,
      cliente,
      productos,
      especificaciones,
      fechaEntregaSolicitada,
      prioridad,
      observaciones,
      estados,
      presupuesto
    } = pedidoData;

    const query = `
      UPDATE pedidos SET
        fecha_actualizacion = $2,
        cliente_nombre = $3, cliente_email = $4, cliente_telefono = $5,
        cliente_empresa = $6, cliente_direccion = $7,
        productos = $8, especificaciones = $9, fecha_entrega_solicitada = $10,
        prioridad = $11, observaciones = $12,
        estado_comercial = $13, estado_admin = $14, estado_taller = $15,
        datos_comercial = $16, datos_admin = $17, datos_taller = $18,
        responsable_comercial = $19, responsable_admin = $20, responsable_taller = $21,
        fecha_comercial = $22, fecha_admin = $23, fecha_taller = $24,
        presupuesto_importe = $25, presupuesto_iva = $26,
        presupuesto_descuento = $27, presupuesto_total = $28
      WHERE id = $1
      RETURNING *
    `;

    const values = [
      pedidoId,
      fechaActualizacion,
      cliente.nombre,
      cliente.email,
      cliente.telefono,
      cliente.empresa,
      cliente.direccion,
      JSON.stringify(productos),
      especificaciones,
      fechaEntregaSolicitada,
      prioridad,
      observaciones,
      estados.comercial.estado,
      estados.admin.estado,
      estados.taller.estado,
      JSON.stringify(estados.comercial.datos || {}),
      JSON.stringify(estados.admin.datos || {}),
      JSON.stringify(estados.taller.datos || {}),
      estados.comercial.responsable,
      estados.admin.responsable,
      estados.taller.responsable,
      estados.comercial.fechaCambio,
      estados.admin.fechaCambio,
      estados.taller.fechaCambio,
      presupuesto.importe,
      presupuesto.iva,
      presupuesto.descuento,
      presupuesto.total
    ];

    try {
      const result = await this.db.query(query, values);
      return this.mapRowToPedido(result.rows[0]);
    } catch (error) {
      console.error('❌ Error actualizando pedido:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene pedidos por departamento
   */
  async obtenerPorDepartamento(departamento, estado = null, limite = 100, offset = 0) {
    let query = `
      SELECT * FROM obtener_pedidos_departamento($1, $2, $3, $4)
    `;

    try {
      const result = await this.db.query(query, [departamento, estado, limite, offset]);
      return result.rows.map(row => this.mapFunctionRowToPedido(row, departamento));
    } catch (error) {
      console.error('❌ Error obteniendo pedidos por departamento:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene todos los pedidos
   */
  async obtenerTodos(limite = 100, offset = 0) {
    const query = `
      SELECT * FROM pedidos
      ORDER BY fecha_actualizacion DESC
      LIMIT $1 OFFSET $2
    `;

    try {
      const result = await this.db.query(query, [limite, offset]);
      return result.rows.map(row => this.mapRowToPedido(row));
    } catch (error) {
      console.error('❌ Error obteniendo todos los pedidos:', error.message);
      throw error;
    }
  }

  /**
   * Registra un cambio de estado en el historial
   */
  async registrarCambioEstado(pedidoId, cambio) {
    const {
      fecha,
      departamento,
      estadoAnterior,
      estadoNuevo,
      responsable,
      observaciones,
      datosAdicionales
    } = cambio;

    const query = `
      INSERT INTO estados_historial (
        pedido_id, fecha, departamento, estado_anterior, estado_nuevo,
        responsable, observaciones, datos_adicionales
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const values = [
      pedidoId,
      fecha,
      departamento,
      estadoAnterior,
      estadoNuevo,
      responsable,
      observaciones,
      JSON.stringify(datosAdicionales || {})
    ];

    try {
      const result = await this.db.query(query, values);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error registrando cambio de estado:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene el historial de un pedido
   */
  async obtenerHistorial(pedidoId) {
    const query = `
      SELECT * FROM estados_historial
      WHERE pedido_id = $1
      ORDER BY fecha ASC
    `;

    try {
      const result = await this.db.query(query, [pedidoId]);
      return result.rows.map(row => ({
        fecha: row.fecha,
        departamento: row.departamento,
        estadoAnterior: row.estado_anterior,
        estadoNuevo: row.estado_nuevo,
        responsable: row.responsable,
        observaciones: row.observaciones,
        datosAdicionales: typeof row.datos_adicionales === 'string'
          ? JSON.parse(row.datos_adicionales)
          : row.datos_adicionales
      }));
    } catch (error) {
      console.error('❌ Error obteniendo historial:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene documentos de un pedido
   */
  async obtenerDocumentos(pedidoId) {
    const query = `
      SELECT * FROM documentos
      WHERE pedido_id = $1
      ORDER BY fecha_subida DESC
    `;

    try {
      const result = await this.db.query(query, [pedidoId]);
      return result.rows.map(row => ({
        id: row.id,
        nombre: row.nombre,
        tipo: row.tipo,
        url: row.url,
        tamaño: row.tamaño,
        fechaSubida: row.fecha_subida,
        subidoPor: row.subido_por,
        departamento: row.departamento
      }));
    } catch (error) {
      console.error('❌ Error obteniendo documentos:', error.message);
      throw error;
    }
  }

  /**
   * Elimina un pedido (para desarrollo/testing)
   */
  async eliminar(pedidoId) {
    const query = `DELETE FROM pedidos WHERE id = $1`;

    try {
      const result = await this.db.query(query, [pedidoId]);
      return result.rowCount > 0;
    } catch (error) {
      console.error('❌ Error eliminando pedido:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene estadísticas de pedidos
   */
  async obtenerEstadisticas() {
    const query = `
      SELECT
        COUNT(*) as total,
        COUNT(CASE WHEN estado_comercial = 'propuesto' THEN 1 END) as propuestos,
        COUNT(CASE WHEN estado_comercial = 'confirmado' THEN 1 END) as confirmados,
        COUNT(CASE WHEN estado_admin = 'en_fabricacion' THEN 1 END) as en_fabricacion,
        COUNT(CASE WHEN estado_admin = 'entregado' THEN 1 END) as entregados,
        COUNT(CASE WHEN estado_admin = 'cobrado' THEN 1 END) as cobrados,
        AVG(presupuesto_total) as valor_promedio,
        SUM(presupuesto_total) as valor_total
      FROM pedidos
    `;

    try {
      const result = await this.db.query(query);
      return result.rows[0];
    } catch (error) {
      console.error('❌ Error obteniendo estadísticas:', error.message);
      throw error;
    }
  }

  /**
   * Mapea una fila de base de datos a objeto Pedido
   */
  mapRowToPedido(row) {
    return {
      id: row.id,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
      cliente: {
        nombre: row.cliente_nombre,
        email: row.cliente_email,
        telefono: row.cliente_telefono,
        empresa: row.cliente_empresa,
        direccion: row.cliente_direccion
      },
      productos: typeof row.productos === 'string' ? JSON.parse(row.productos) : row.productos,
      especificaciones: row.especificaciones,
      fechaEntregaSolicitada: row.fecha_entrega_solicitada,
      prioridad: row.prioridad,
      observaciones: row.observaciones,
      estados: {
        comercial: {
          estado: row.estado_comercial,
          fechaCambio: row.fecha_comercial,
          responsable: row.responsable_comercial,
          datos: typeof row.datos_comercial === 'string'
            ? JSON.parse(row.datos_comercial)
            : row.datos_comercial || {}
        },
        admin: {
          estado: row.estado_admin,
          fechaCambio: row.fecha_admin,
          responsable: row.responsable_admin,
          datos: typeof row.datos_admin === 'string'
            ? JSON.parse(row.datos_admin)
            : row.datos_admin || {}
        },
        taller: {
          estado: row.estado_taller,
          fechaCambio: row.fecha_taller,
          responsable: row.responsable_taller,
          datos: typeof row.datos_taller === 'string'
            ? JSON.parse(row.datos_taller)
            : row.datos_taller || {}
        }
      },
      presupuesto: {
        importe: parseFloat(row.presupuesto_importe) || 0,
        iva: parseFloat(row.presupuesto_iva) || 21,
        descuento: parseFloat(row.presupuesto_descuento) || 0,
        total: parseFloat(row.presupuesto_total) || 0
      },
      historial: [],
      documentos: []
    };
  }

  /**
   * Mapea resultado de función de base de datos a objeto simplificado
   */
  mapFunctionRowToPedido(row, departamento) {
    return {
      id: row.id,
      fechaCreacion: row.fecha_creacion,
      fechaActualizacion: row.fecha_actualizacion,
      cliente: {
        nombre: row.cliente_nombre,
        empresa: row.cliente_empresa
      },
      productos: typeof row.productos === 'string' ? JSON.parse(row.productos) : row.productos,
      especificaciones: row.especificaciones,
      prioridad: row.prioridad,
      estadoActual: {
        estado: row.estado_actual,
        responsable: row.responsable_actual,
        datos: typeof row.datos_departamento === 'string'
          ? JSON.parse(row.datos_departamento)
          : row.datos_departamento || {}
      },
      departamento: departamento,
      presupuesto: {
        total: parseFloat(row.presupuesto_total) || 0
      }
    };
  }
}