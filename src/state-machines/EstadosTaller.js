import { EstadosTaller } from '../models/Pedido.js';

/**
 * Máquina de estados para el departamento de taller
 */
export class MaquinaEstadosTaller {
  static transicionesPermitidas = {
    [EstadosTaller.PENDIENTE_DOC]: [
      EstadosTaller.EN_FABRICACION
    ],
    [EstadosTaller.EN_FABRICACION]: [
      EstadosTaller.ENTREGADO,
      EstadosTaller.CANCELADO,
      EstadosTaller.MODIFICADO
    ],
    [EstadosTaller.ENTREGADO]: [], // Estado final para taller
    [EstadosTaller.CANCELADO]: [], // Estado final
    [EstadosTaller.MODIFICADO]: [
      EstadosTaller.EN_FABRICACION,
      EstadosTaller.CANCELADO
    ],
    [EstadosTaller.INCIDENCIA]: [
      EstadosTaller.EN_FABRICACION,
      EstadosTaller.CANCELADO
    ]
  };

  static puedeTransicionarA(estadoActual, nuevoEstado) {
    const transicionesValidas = this.transicionesPermitidas[estadoActual] || [];
    return transicionesValidas.includes(nuevoEstado);
  }

  static obtenerTransicionesDisponibles(estadoActual) {
    return this.transicionesPermitidas[estadoActual] || [];
  }

  static validarDatosParaEstado(estado, datos) {
    const validaciones = {
      [EstadosTaller.PENDIENTE_DOC]: this.validarPendienteDoc,
      [EstadosTaller.EN_FABRICACION]: this.validarEnFabricacion,
      [EstadosTaller.ENTREGADO]: this.validarEntregado,
      [EstadosTaller.CANCELADO]: this.validarCancelado,
      [EstadosTaller.MODIFICADO]: this.validarModificado,
      [EstadosTaller.INCIDENCIA]: this.validarIncidencia
    };

    const validador = validaciones[estado];
    return validador ? validador(datos) : { valido: true };
  }

  static validarPendienteDoc(datos) {
    return {
      valido: true,
      errores: [],
      datosRequeridos: [] // Taller espera orden de admin
    };
  }

  static validarEnFabricacion(datos) {
    const errores = [];

    if (!datos.responsableFabricacion) {
      errores.push('Responsable de fabricación es obligatorio');
    }
    if (!datos.fechaInicioReal) {
      errores.push('Fecha de inicio real es obligatoria');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['responsableFabricacion', 'fechaInicioReal', 'procesosRequeridos']
    };
  }

  static validarEntregado(datos) {
    const errores = [];

    if (!datos.controlCalidad) {
      errores.push('Control de calidad es obligatorio');
    }
    if (!datos.fechaFinalizacion) {
      errores.push('Fecha de finalización es obligatoria');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['controlCalidad', 'fechaFinalizacion', 'observacionesCalidad']
    };
  }

  static validarCancelado(datos) {
    const errores = [];

    if (!datos.motivoCancelacion) {
      errores.push('Motivo de cancelación es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['motivoCancelacion', 'materialUtilizado']
    };
  }

  static validarModificado(datos) {
    const errores = [];

    if (!datos.tipoModificacion) {
      errores.push('Tipo de modificación es obligatorio');
    }
    if (!datos.impactoFabricacion) {
      errores.push('Impacto en fabricación es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['tipoModificacion', 'impactoFabricacion', 'tiempoAdicional']
    };
  }

  static validarIncidencia(datos) {
    const errores = [];

    if (!datos.problemaDetectado) {
      errores.push('Problema detectado es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['problemaDetectado', 'solucionPropuesta', 'tiempoParada']
    };
  }

  static obtenerFormularioParaEstado(estado) {
    const formularios = {
      [EstadosTaller.PENDIENTE_DOC]: {
        titulo: 'Esperando Orden de Fabricación',
        campos: [] // Solo visualización, no hay acciones
      },
      [EstadosTaller.EN_FABRICACION]: {
        titulo: 'Iniciar Fabricación',
        campos: [
          { nombre: 'responsableFabricacion', tipo: 'text', label: 'Responsable fabricación', obligatorio: true },
          { nombre: 'fechaInicioReal', tipo: 'datetime-local', label: 'Fecha inicio real', obligatorio: true },
          { nombre: 'procesosRequeridos', tipo: 'array', label: 'Procesos requeridos', obligatorio: false },
          { nombre: 'materialesAsignados', tipo: 'textarea', label: 'Materiales asignados', obligatorio: false }
        ]
      },
      [EstadosTaller.ENTREGADO]: {
        titulo: 'Finalizar y Entregar',
        campos: [
          { nombre: 'controlCalidad', tipo: 'select', label: 'Control calidad', opciones: ['aprobado', 'rechazado', 'condicional'], obligatorio: true },
          { nombre: 'fechaFinalizacion', tipo: 'datetime-local', label: 'Fecha finalización', obligatorio: true },
          { nombre: 'observacionesCalidad', tipo: 'textarea', label: 'Observaciones calidad', obligatorio: false },
          { nombre: 'certificadosCalidad', tipo: 'array', label: 'Certificados calidad', obligatorio: false }
        ]
      },
      [EstadosTaller.CANCELADO]: {
        titulo: 'Cancelar Fabricación',
        campos: [
          { nombre: 'motivoCancelacion', tipo: 'textarea', label: 'Motivo cancelación', obligatorio: true },
          { nombre: 'materialUtilizado', tipo: 'number', label: 'Material utilizado (%)', obligatorio: false },
          { nombre: 'trabajoRealizado', tipo: 'textarea', label: 'Trabajo realizado', obligatorio: false }
        ]
      },
      [EstadosTaller.MODIFICADO]: {
        titulo: 'Gestionar Modificación',
        campos: [
          { nombre: 'tipoModificacion', tipo: 'select', label: 'Tipo modificación', opciones: ['especificaciones', 'materiales', 'diseño', 'cantidad'], obligatorio: true },
          { nombre: 'impactoFabricacion', tipo: 'select', label: 'Impacto fabricación', opciones: ['bajo', 'medio', 'alto', 'critico'], obligatorio: true },
          { nombre: 'tiempoAdicional', tipo: 'number', label: 'Tiempo adicional (horas)', obligatorio: false },
          { nombre: 'costesAdicionales', tipo: 'number', label: 'Costes adicionales', obligatorio: false }
        ]
      },
      [EstadosTaller.INCIDENCIA]: {
        titulo: 'Reportar Incidencia',
        campos: [
          { nombre: 'problemaDetectado', tipo: 'textarea', label: 'Problema detectado', obligatorio: true },
          { nombre: 'solucionPropuesta', tipo: 'textarea', label: 'Solución propuesta', obligatorio: false },
          { nombre: 'tiempoParada', tipo: 'number', label: 'Tiempo parada (horas)', obligatorio: false },
          { nombre: 'requiereAprobacion', tipo: 'checkbox', label: 'Requiere aprobación', obligatorio: false }
        ]
      }
    };

    return formularios[estado] || { titulo: 'Sin formulario', campos: [] };
  }

  /**
   * Calcula métricas específicas del taller
   */
  static calcularMetricasTaller(pedido) {
    const estadoTaller = pedido.estados.taller;
    const historialTaller = pedido.historial.filter(h => h.departamento === 'taller');

    return {
      tiempoEnFabricacion: this.calcularTiempoEnFabricacion(historialTaller),
      eficienciaFabricacion: this.calcularEficienciaFabricacion(pedido),
      calidadEntrega: estadoTaller.datos.controlCalidad || null
    };
  }

  static calcularTiempoEnFabricacion(historial) {
    const inicioFabricacion = historial.find(h => h.estadoNuevo === EstadosTaller.EN_FABRICACION);
    const finFabricacion = historial.find(h => h.estadoNuevo === EstadosTaller.ENTREGADO);

    if (inicioFabricacion && finFabricacion) {
      const tiempoMs = new Date(finFabricacion.fecha) - new Date(inicioFabricacion.fecha);
      return Math.round(tiempoMs / (1000 * 60 * 60)); // Horas
    }

    return null;
  }

  static calcularEficienciaFabricacion(pedido) {
    const fechaEstimada = pedido.estados.admin.datos.fechaEntregaEstimada;
    const fechaReal = pedido.estados.taller.datos.fechaFinalizacion;

    if (fechaEstimada && fechaReal) {
      const diferenciaDias = (new Date(fechaReal) - new Date(fechaEstimada)) / (1000 * 60 * 60 * 24);
      return diferenciaDias <= 0 ? 'puntual' : 'retrasado';
    }

    return null;
  }
}