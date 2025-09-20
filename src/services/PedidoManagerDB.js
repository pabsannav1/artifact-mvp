import { Pedido } from '../models/Pedido.js';
import { PedidoRepository } from '../database/PedidoRepository.js';
import { MaquinaEstadosComercial } from '../state-machines/EstadosComercial.js';
import { MaquinaEstadosAdmin } from '../state-machines/EstadosAdmin.js';
import { MaquinaEstadosTaller } from '../state-machines/EstadosTaller.js';
import { EventTypes } from '../events/EventManager.js';

/**
 * Gestor central de pedidos con persistencia en PostgreSQL
 * Mantiene la compatibilidad con el modelo artifact-centric
 */
export class PedidoManagerDB {
  constructor(eventManager) {
    this.repository = new PedidoRepository();
    this.eventManager = eventManager;
    this.maquinasEstado = {
      comercial: MaquinaEstadosComercial,
      admin: MaquinaEstadosAdmin,
      taller: MaquinaEstadosTaller
    };

    // Cache en memoria para optimizar consultas frecuentes
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutos
  }

  /**
   * Crea un nuevo pedido
   */
  async crearPedido(datosIniciales, responsableComercial) {
    const pedido = new Pedido(datosIniciales);

    // Asignar responsable inicial
    pedido.estados.comercial.responsable = responsableComercial;

    try {
      // Guardar en base de datos
      const pedidoGuardado = await this.repository.crear(pedido);

      // Registrar en historial
      await this.repository.registrarCambioEstado(pedido.id, {
        fecha: pedido.fechaCreacion,
        departamento: 'comercial',
        estadoAnterior: null,
        estadoNuevo: pedido.estados.comercial.estado,
        responsable: responsableComercial,
        observaciones: 'Pedido creado'
      });

      // Invalidar cache
      this.invalidateCache();

      // Emitir evento de creación
      await this.eventManager.emit(EventTypes.PEDIDO_PROPUESTO, {
        pedidoId: pedido.id,
        responsable: responsableComercial,
        datos: pedidoGuardado
      });

      return pedidoGuardado;
    } catch (error) {
      console.error('❌ Error creando pedido:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene un pedido por ID
   */
  async obtenerPedido(pedidoId) {
    try {
      // Verificar cache primero
      if (this.cache.has(pedidoId)) {
        const cached = this.cache.get(pedidoId);
        if (Date.now() - cached.timestamp < this.cacheTimeout) {
          return cached.data;
        }
      }

      const pedidoData = await this.repository.obtenerPorId(pedidoId);

      if (!pedidoData) {
        throw new Error(`Pedido ${pedidoId} no encontrado`);
      }

      // Crear instancia de Pedido para mantener compatibilidad
      const pedido = this.createPedidoFromData(pedidoData);

      // Guardar en cache
      this.cache.set(pedidoId, {
        data: pedido,
        timestamp: Date.now()
      });

      return pedido;
    } catch (error) {
      console.error('❌ Error obteniendo pedido:', error.message);
      throw error;
    }
  }

  /**
   * Cambia el estado de un pedido en un departamento específico
   */
  async cambiarEstado(pedidoId, departamento, nuevoEstado, responsable, observaciones = '', datosAdicionales = {}) {
    const pedido = await this.obtenerPedido(pedidoId);
    const maquinaEstado = this.maquinasEstado[departamento];

    if (!maquinaEstado) {
      throw new Error(`Departamento ${departamento} no válido`);
    }

    const estadoActual = pedido.estados[departamento].estado;

    // Validar transición
    if (estadoActual && !maquinaEstado.puedeTransicionarA(estadoActual, nuevoEstado)) {
      throw new Error(`Transición no permitida: ${estadoActual} → ${nuevoEstado} en ${departamento}`);
    }

    // Validar datos necesarios para el nuevo estado
    const validacionDatos = maquinaEstado.validarDatosParaEstado(nuevoEstado, {
      id: pedido.id,
      fechaCreacion: pedido.fechaCreacion,
      fechaActualizacion: pedido.fechaActualizacion,
      cliente: pedido.cliente,
      productos: pedido.productos,
      especificaciones: pedido.especificaciones,
      fechaEntregaSolicitada: pedido.fechaEntregaSolicitada,
      prioridad: pedido.prioridad,
      observaciones: pedido.observaciones,
      estados: pedido.estados,
      historial: pedido.historial,
      presupuesto: pedido.presupuesto,
      documentos: pedido.documentos,
      ...datosAdicionales
    });

    if (!validacionDatos.valido) {
      throw new Error(`Datos insuficientes para estado ${nuevoEstado}: ${validacionDatos.errores.join(', ')}`);
    }

    // Aplicar cambio de estado
    pedido.cambiarEstado(departamento, nuevoEstado, responsable, observaciones, datosAdicionales);

    try {
      // Actualizar en base de datos
      const pedidoActualizado = await this.repository.actualizar(pedidoId, pedido);

      // Registrar en historial
      await this.repository.registrarCambioEstado(pedidoId, {
        fecha: new Date(),
        departamento: departamento,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        responsable: responsable,
        observaciones: observaciones,
        datosAdicionales: datosAdicionales
      });

      // Invalidar cache
      this.invalidateCache(pedidoId);

      // Emitir evento de cambio de estado
      await this.eventManager.emit(EventTypes.ESTADO_CAMBIADO, {
        pedidoId: pedidoId,
        departamento: departamento,
        estadoAnterior: estadoActual,
        estadoNuevo: nuevoEstado,
        responsable: responsable,
        observaciones: observaciones
      });

      // Emitir eventos específicos según el cambio
      await this.emitirEventosEspecificos(pedidoId, departamento, nuevoEstado, datosAdicionales);

      return this.createPedidoFromData(pedidoActualizado);
    } catch (error) {
      console.error('❌ Error actualizando pedido:', error.message);
      throw error;
    }
  }

  /**
   * Emite eventos específicos basados en cambios de estado
   */
  async emitirEventosEspecificos(pedidoId, departamento, nuevoEstado, datosAdicionales) {
    const eventosEspecificos = {
      // Eventos comerciales
      'comercial.confirmado': EventTypes.PEDIDO_CONFIRMADO,
      'comercial.modificado': EventTypes.PEDIDO_MODIFICADO,
      'comercial.cancelado': EventTypes.PEDIDO_CANCELADO_COMERCIAL,

      // Eventos admin
      'admin.pendiente_doc': EventTypes.DOCUMENTACION_VERIFICADA,
      'admin.en_fabricacion': EventTypes.ORDEN_FABRICACION_ENVIADA,
      'admin.entregado': EventTypes.PEDIDO_ENTREGADO,
      'admin.facturado': EventTypes.FACTURA_CREADA,
      'admin.cobrado': EventTypes.COBRO_REGISTRADO,
      'admin.incidencia': EventTypes.INCIDENCIA_DETECTADA,

      // Eventos taller
      'taller.en_fabricacion': EventTypes.FABRICACION_INICIADA,
      'taller.entregado': EventTypes.FABRICACION_FINALIZADA,
      'taller.modificado': EventTypes.MODIFICACION_REQUERIDA,
      'taller.incidencia': EventTypes.PROBLEMA_FABRICACION
    };

    const claveEvento = `${departamento}.${nuevoEstado}`;
    const tipoEvento = eventosEspecificos[claveEvento];

    if (tipoEvento) {
      await this.eventManager.emit(tipoEvento, {
        pedidoId: pedidoId,
        departamento: departamento,
        estado: nuevoEstado,
        ...datosAdicionales
      });
    }
  }

  /**
   * Obtiene pedidos por departamento y estado
   */
  async obtenerPedidosPorDepartamento(departamento, estado = null) {
    try {
      const pedidosData = await this.repository.obtenerPorDepartamento(departamento, estado);

      return pedidosData.map(pedidoData => ({
        ...pedidoData,
        formulario: this.maquinasEstado[departamento].obtenerFormularioParaEstado(
          pedidoData.estadoActual.estado
        ),
        transicionesDisponibles: this.maquinasEstado[departamento].obtenerTransicionesDisponibles(
          pedidoData.estadoActual.estado
        )
      }));
    } catch (error) {
      console.error('❌ Error obteniendo pedidos por departamento:', error.message);
      throw error;
    }
  }

  /**
   * Obtiene todos los pedidos susceptibles de trabajar por un departamento
   */
  async obtenerPedidosParaTrabajar(departamento, estado = null) {
    try {
      // Por ahora, usamos la misma lógica que obtenerPedidosPorDepartamento
      // En futuras iteraciones se puede optimizar con lógica específica
      const pedidosData = await this.repository.obtenerPorDepartamento(departamento, estado);

      // Filtrar según las reglas de negocio de cada departamento
      const pedidosFiltrados = pedidosData.filter(pedidoData => {
        return this.puedeDepartamentoTrabajar(pedidoData, departamento);
      });

      return pedidosFiltrados.map(pedidoData => ({
        id: pedidoData.id,
        fechaCreacion: pedidoData.fechaCreacion,
        fechaActualizacion: pedidoData.fechaActualizacion,
        cliente: pedidoData.cliente,
        productos: pedidoData.productos,
        especificaciones: pedidoData.especificaciones,
        fechaEntregaSolicitada: pedidoData.fechaEntregaSolicitada,
        prioridad: pedidoData.prioridad,
        observaciones: pedidoData.observaciones,
        estados: {
          [departamento]: pedidoData.estadoActual
        },
        historial: [],
        presupuesto: pedidoData.presupuesto,
        documentos: [],
        estadoActual: pedidoData.estadoActual,
        departamento: departamento,
        formulario: this.maquinasEstado[departamento].obtenerFormularioParaEstado(
          pedidoData.estadoActual.estado
        ),
        transicionesDisponibles: this.maquinasEstado[departamento].obtenerTransicionesDisponibles(
          pedidoData.estadoActual.estado
        )
      }));
    } catch (error) {
      console.error('❌ Error obteniendo pedidos para trabajar:', error.message);
      throw error;
    }
  }

  /**
   * Determina si un departamento puede trabajar en un pedido
   */
  puedeDepartamentoTrabajar(pedidoData, departamento) {
    const estadoDepartamento = pedidoData.estadoActual;

    // Si el departamento ya tiene un estado asignado y no está finalizado, puede trabajar
    if (estadoDepartamento && estadoDepartamento.estado !== null) {
      const estadosFinalizados = {
        'admin': ['cobrado', 'cancelado'],
        'taller': ['entregado', 'cancelado'],
        'comercial': ['cancelado']
      };

      return !estadosFinalizados[departamento]?.includes(estadoDepartamento.estado);
    }

    // Lógica simplificada para determinar si puede empezar
    return true;
  }

  /**
   * Obtiene la vista completa de un pedido para un departamento específico
   */
  async obtenerVistaPedido(pedidoId, departamento) {
    const pedido = await this.obtenerPedido(pedidoId);
    const estadoActual = pedido.estados[departamento].estado;

    // Si el departamento no tiene estado asignado, mostrar información básica
    if (estadoActual === null) {
      return {
        id: pedido.id,
        fechaCreacion: pedido.fechaCreacion,
        fechaActualizacion: pedido.fechaActualizacion,
        cliente: pedido.cliente,
        productos: pedido.productos,
        especificaciones: pedido.especificaciones,
        fechaEntregaSolicitada: pedido.fechaEntregaSolicitada,
        prioridad: pedido.prioridad,
        observaciones: pedido.observaciones,
        estados: pedido.estados,
        historial: pedido.historial,
        presupuesto: pedido.presupuesto,
        documentos: pedido.documentos,
        estadoActual: pedido.estados[departamento],
        departamento: departamento,
        formulario: { titulo: 'Sin asignar', campos: [] },
        transicionesDisponibles: [],
        validacionEstado: { valido: false, errores: ['No asignado a este departamento aún'] },
        puedeTrabajar: this.puedeDepartamentoTrabajar({ estadoActual: pedido.estados[departamento] }, departamento)
      };
    }

    return {
      id: pedido.id,
      fechaCreacion: pedido.fechaCreacion,
      fechaActualizacion: pedido.fechaActualizacion,
      cliente: pedido.cliente,
      productos: pedido.productos,
      especificaciones: pedido.especificaciones,
      fechaEntregaSolicitada: pedido.fechaEntregaSolicitada,
      prioridad: pedido.prioridad,
      observaciones: pedido.observaciones,
      estados: pedido.estados,
      historial: pedido.historial,
      presupuesto: pedido.presupuesto,
      documentos: pedido.documentos,
      estadoActual: pedido.estados[departamento],
      departamento: departamento,
      formulario: this.maquinasEstado[departamento].obtenerFormularioParaEstado(estadoActual),
      transicionesDisponibles: this.maquinasEstado[departamento].obtenerTransicionesDisponibles(estadoActual),
      validacionEstado: this.maquinasEstado[departamento].validarDatosParaEstado(
        estadoActual,
        {
          id: pedido.id,
          fechaCreacion: pedido.fechaCreacion,
          fechaActualizacion: pedido.fechaActualizacion,
          cliente: pedido.cliente,
          productos: pedido.productos,
          especificaciones: pedido.especificaciones,
          fechaEntregaSolicitada: pedido.fechaEntregaSolicitada,
          prioridad: pedido.prioridad,
          observaciones: pedido.observaciones,
          estados: pedido.estados,
          historial: pedido.historial,
          presupuesto: pedido.presupuesto,
          documentos: pedido.documentos
        }
      ),
      puedeTrabajar: this.puedeDepartamentoTrabajar({ estadoActual: pedido.estados[departamento] }, departamento)
    };
  }

  /**
   * Obtiene métricas del sistema
   */
  async obtenerMetricas() {
    try {
      const estadisticas = await this.repository.obtenerEstadisticas();

      return {
        totalPedidos: parseInt(estadisticas.total),
        valorTotal: parseFloat(estadisticas.valor_total) || 0,
        valorPromedio: parseFloat(estadisticas.valor_promedio) || 0,
        distribucion: {
          propuestos: parseInt(estadisticas.propuestos),
          confirmados: parseInt(estadisticas.confirmados),
          en_fabricacion: parseInt(estadisticas.en_fabricacion),
          entregados: parseInt(estadisticas.entregados),
          cobrados: parseInt(estadisticas.cobrados)
        }
      };
    } catch (error) {
      console.error('❌ Error obteniendo métricas:', error.message);
      throw error;
    }
  }

  /**
   * Crea una instancia de Pedido a partir de datos de base de datos
   */
  createPedidoFromData(pedidoData) {
    const pedido = new Pedido(pedidoData);

    // Asegurarse de que las propiedades están correctamente asignadas
    pedido.id = pedidoData.id;
    pedido.fechaCreacion = pedidoData.fechaCreacion;
    pedido.fechaActualizacion = pedidoData.fechaActualizacion;
    pedido.historial = pedidoData.historial || [];
    pedido.documentos = pedidoData.documentos || [];

    return pedido;
  }

  /**
   * Invalida cache
   */
  invalidateCache(pedidoId = null) {
    if (pedidoId) {
      this.cache.delete(pedidoId);
    } else {
      this.cache.clear();
    }
  }

  /**
   * Obtiene información de salud del sistema
   */
  async healthCheck() {
    try {
      const dbHealth = await this.repository.db.healthCheck();
      const metricas = await this.obtenerMetricas();

      return {
        database: dbHealth,
        pedidos: {
          total: metricas.totalPedidos,
          cache_size: this.cache.size
        },
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        database: { status: 'error', error: error.message },
        timestamp: new Date().toISOString()
      };
    }
  }
}