import { Pedido } from '../models/Pedido.js';
import { MaquinaEstadosComercial } from '../state-machines/EstadosComercial.js';
import { MaquinaEstadosAdmin } from '../state-machines/EstadosAdmin.js';
import { MaquinaEstadosTaller } from '../state-machines/EstadosTaller.js';
import { EventTypes } from '../events/EventManager.js';

/**
 * Gestor central de pedidos que coordina el ciclo de vida artifact-centric
 */
export class PedidoManager {
  constructor(eventManager) {
    this.pedidos = new Map();
    this.eventManager = eventManager;
    this.maquinasEstado = {
      comercial: MaquinaEstadosComercial,
      admin: MaquinaEstadosAdmin,
      taller: MaquinaEstadosTaller
    };
  }

  /**
   * Crea un nuevo pedido
   */
  async crearPedido(datosIniciales, responsableComercial) {
    const pedido = new Pedido(datosIniciales);

    // Asignar responsable inicial
    pedido.estados.comercial.responsable = responsableComercial;

    this.pedidos.set(pedido.id, pedido);

    // Emitir evento de creación
    await this.eventManager.emit(EventTypes.PEDIDO_PROPUESTO, {
      pedidoId: pedido.id,
      responsable: responsableComercial,
      datos: {
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
    });

    return pedido;
  }

  /**
   * Obtiene un pedido por ID
   */
  obtenerPedido(pedidoId) {
    const pedido = this.pedidos.get(pedidoId);
    if (!pedido) {
      throw new Error(`Pedido ${pedidoId} no encontrado`);
    }
    return pedido;
  }

  /**
   * Cambia el estado de un pedido en un departamento específico
   */
  async cambiarEstado(pedidoId, departamento, nuevoEstado, responsable, observaciones = '', datosAdicionales = {}) {
    const pedido = this.obtenerPedido(pedidoId);
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

    return pedido;
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
  obtenerPedidosPorDepartamento(departamento, estado = null) {
    const pedidosArray = Array.from(this.pedidos.values());

    let pedidosFiltrados = pedidosArray.filter(pedido => {
      const estadoDepartamento = pedido.estados[departamento];
      return estadoDepartamento && estadoDepartamento.estado !== null;
    });

    if (estado) {
      pedidosFiltrados = pedidosFiltrados.filter(pedido =>
        pedido.estados[departamento].estado === estado
      );
    }

    return pedidosFiltrados.map(pedido => ({
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
      formulario: this.maquinasEstado[departamento].obtenerFormularioParaEstado(
        pedido.estados[departamento].estado
      ),
      transicionesDisponibles: this.maquinasEstado[departamento].obtenerTransicionesDisponibles(
        pedido.estados[departamento].estado
      )
    }));
  }

  /**
   * Obtiene todos los pedidos susceptibles de trabajar por un departamento
   * Incluye pedidos donde puede iniciar trabajo y donde ya tiene trabajo asignado
   */
  obtenerPedidosParaTrabajar(departamento, estado = null) {
    const pedidosArray = Array.from(this.pedidos.values());

    let pedidosFiltrados = pedidosArray.filter(pedido => {
      return this.puedeDepartamentoTrabajar(pedido, departamento);
    });

    if (estado) {
      pedidosFiltrados = pedidosFiltrados.filter(pedido => {
        const estadoDepartamento = pedido.estados[departamento];
        return estadoDepartamento && estadoDepartamento.estado === estado;
      });
    }

    return pedidosFiltrados.map(pedido => ({
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
      formulario: this.maquinasEstado[departamento].obtenerFormularioParaEstado(
        pedido.estados[departamento].estado
      ),
      transicionesDisponibles: this.maquinasEstado[departamento].obtenerTransicionesDisponibles(
        pedido.estados[departamento].estado
      )
    }));
  }

  /**
   * Determina si un departamento puede trabajar en un pedido
   */
  puedeDepartamentoTrabajar(pedido, departamento) {
    const estadoDepartamento = pedido.estados[departamento];

    // Si el departamento ya tiene un estado asignado y no está finalizado, puede trabajar
    if (estadoDepartamento && estadoDepartamento.estado !== null) {
      const estadosFinalizados = {
        'admin': ['cobrado', 'cancelado'],
        'taller': ['entregado', 'cancelado'],
        'comercial': ['cancelado']
      };

      return !estadosFinalizados[departamento]?.includes(estadoDepartamento.estado);
    }

    // Si no tiene estado, verificar si puede empezar a trabajar según las dependencias
    switch (departamento) {
      case 'admin':
        // Admin puede empezar si comercial está confirmado
        return pedido.estados.comercial.estado === 'confirmado';

      case 'taller':
        // Taller puede empezar si admin está en fabricación
        return pedido.estados.admin.estado === 'en_fabricacion';

      case 'comercial':
        // Comercial siempre puede trabajar en pedidos nuevos o existentes
        return true;

      default:
        return false;
    }
  }

  /**
   * Obtiene la vista completa de un pedido para un departamento específico
   */
  obtenerVistaPedido(pedidoId, departamento) {
    const pedido = this.obtenerPedido(pedidoId);
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
        puedeTrabajar: this.puedeDepartamentoTrabajar(pedido, departamento)
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
      puedeTrabajar: this.puedeDepartamentoTrabajar(pedido, departamento)
    };
  }

  /**
   * Procesa modificaciones parciales sin pasar por verificación completa
   */
  async procesarModificacionParcial(pedidoId, tipoModificacion, cambios, responsable) {
    const pedido = this.obtenerPedido(pedidoId);

    // Determinar qué departamentos se ven afectados
    const departamentosAfectados = this.determinarImpactoModificacion(tipoModificacion, pedido);

    // Aplicar cambios al pedido
    Object.assign(pedido, cambios);
    pedido.fechaActualizacion = new Date();

    // Registrar modificación en historial
    pedido.historial.push({
      fecha: new Date(),
      departamento: 'sistema',
      estadoAnterior: null,
      estadoNuevo: 'modificacion_parcial',
      responsable: responsable,
      observaciones: `Modificación parcial: ${tipoModificacion}`
    });

    // Emitir eventos de modificación
    await this.eventManager.emit(EventTypes.PEDIDO_MODIFICADO, {
      pedidoId: pedidoId,
      tipoModificacion: tipoModificacion,
      departamentoOrigen: 'comercial',
      departamentosAfectados: departamentosAfectados,
      cambios: cambios
    });

    return {
      pedido: pedido,
      departamentosAfectados: departamentosAfectados
    };
  }

  /**
   * Determina qué departamentos se ven afectados por una modificación
   */
  determinarImpactoModificacion(tipoModificacion, pedido) {
    const afectados = [];

    const impactos = {
      'especificaciones': ['taller'],
      'fechaEntrega': ['admin', 'taller'],
      'presupuesto': ['admin'],
      'cliente': ['admin'],
      'productos': ['taller', 'admin'],
      'prioridad': ['admin', 'taller']
    };

    const departamentosPotenciales = impactos[tipoModificacion] || [];

    // Solo incluir departamentos que ya están activos
    for (const dept of departamentosPotenciales) {
      if (pedido.estados[dept].estado !== null) {
        afectados.push(dept);
      }
    }

    return afectados;
  }

  /**
   * Obtiene métricas del sistema
   */
  obtenerMetricas() {
    const pedidosArray = Array.from(this.pedidos.values());

    return {
      totalPedidos: pedidosArray.length,
      porDepartamento: {
        comercial: this.contarPorEstados(pedidosArray, 'comercial'),
        admin: this.contarPorEstados(pedidosArray, 'admin'),
        taller: this.contarPorEstados(pedidosArray, 'taller')
      },
      tiempoPromedio: this.calcularTiemposPromedio(pedidosArray),
      eficiencia: this.calcularEficiencia(pedidosArray)
    };
  }

  contarPorEstados(pedidos, departamento) {
    const conteo = {};
    pedidos.forEach(pedido => {
      const estado = pedido.estados[departamento].estado;
      if (estado) {
        conteo[estado] = (conteo[estado] || 0) + 1;
      }
    });
    return conteo;
  }

  calcularTiemposPromedio(pedidos) {
    // Implementar cálculo de tiempos promedio por fase
    return {
      comercial: 0,
      admin: 0,
      taller: 0,
      total: 0
    };
  }

  calcularEficiencia(pedidos) {
    const completados = pedidos.filter(p =>
      p.estados.admin.estado === 'cobrado' ||
      p.estados.comercial.estado === 'cancelado'
    );

    return {
      porcentajeCompletados: (completados.length / pedidos.length) * 100,
      pedidosEnCurso: pedidos.length - completados.length
    };
  }
}