import { EstadosComercial } from '../models/Pedido.js';

/**
 * Máquina de estados para el departamento comercial
 * Define las transiciones permitidas y validaciones
 */
export class MaquinaEstadosComercial {
  static transicionesPermitidas = {
    [EstadosComercial.PROPUESTO]: [
      EstadosComercial.CONFIRMADO,
      EstadosComercial.CANCELADO
    ],
    [EstadosComercial.CONFIRMADO]: [
      EstadosComercial.MODIFICADO,
      EstadosComercial.EN_ESPERA,
      EstadosComercial.CANCELADO
    ],
    [EstadosComercial.MODIFICADO]: [
      EstadosComercial.CONFIRMADO,
      EstadosComercial.CANCELADO
    ],
    [EstadosComercial.EN_ESPERA]: [
      EstadosComercial.CONFIRMADO,
      EstadosComercial.CANCELADO
    ],
    [EstadosComercial.CANCELADO]: [] // Estado final
  };

  /**
   * Verifica si una transición es válida
   */
  static puedeTransicionarA(estadoActual, nuevoEstado) {
    const transicionesValidas = this.transicionesPermitidas[estadoActual] || [];
    return transicionesValidas.includes(nuevoEstado);
  }

  /**
   * Obtiene las transiciones disponibles desde un estado
   */
  static obtenerTransicionesDisponibles(estadoActual) {
    return this.transicionesPermitidas[estadoActual] || [];
  }

  /**
   * Valida los datos necesarios para cada estado
   */
  static validarDatosParaEstado(estado, datos) {
    const validaciones = {
      [EstadosComercial.PROPUESTO]: this.validarPropuesto,
      [EstadosComercial.CONFIRMADO]: this.validarConfirmado,
      [EstadosComercial.MODIFICADO]: this.validarModificado,
      [EstadosComercial.EN_ESPERA]: this.validarEnEspera,
      [EstadosComercial.CANCELADO]: this.validarCancelado
    };

    const validador = validaciones[estado];
    return validador ? validador(datos) : { valido: true };
  }

  /**
   * Datos necesarios para estado PROPUESTO
   */
  static validarPropuesto(datos) {
    const errores = [];

    if (!datos.cliente?.nombre) errores.push('Nombre del cliente es obligatorio');
    if (!datos.cliente?.email) errores.push('Email del cliente es obligatorio');
    if (!datos.productos || datos.productos.length === 0) errores.push('Debe especificar al menos un producto');

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['cliente.nombre', 'cliente.email', 'productos', 'especificaciones']
    };
  }

  /**
   * Datos necesarios para estado CONFIRMADO
   */
  static validarConfirmado(datos) {
    const errores = [];

    if (!datos.presupuesto?.total || datos.presupuesto.total <= 0) {
      errores.push('Presupuesto total es obligatorio y debe ser mayor a 0');
    }
    if (!datos.fechaEntregaSolicitada) {
      errores.push('Fecha de entrega solicitada es obligatoria');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['presupuesto.total', 'fechaEntregaSolicitada', 'especificaciones']
    };
  }

  /**
   * Datos necesarios para estado MODIFICADO
   */
  static validarModificado(datos) {
    const errores = [];

    if (!datos.motivoModificacion) {
      errores.push('Motivo de la modificación es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['motivoModificacion', 'cambiosRealizados']
    };
  }

  /**
   * Datos necesarios para estado EN_ESPERA
   */
  static validarEnEspera(datos) {
    const errores = [];

    if (!datos.motivoEspera) {
      errores.push('Motivo de la espera es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['motivoEspera', 'fechaRevision']
    };
  }

  /**
   * Datos necesarios para estado CANCELADO
   */
  static validarCancelado(datos) {
    const errores = [];

    if (!datos.motivoCancelacion) {
      errores.push('Motivo de cancelación es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['motivoCancelacion']
    };
  }

  /**
   * Obtiene los campos que debe completar el usuario para un estado específico
   */
  static obtenerFormularioParaEstado(estado) {
    const formularios = {
      [EstadosComercial.PROPUESTO]: {
        titulo: 'Crear Propuesta',
        campos: [
          { nombre: 'cliente.nombre', tipo: 'text', label: 'Nombre del cliente', obligatorio: true },
          { nombre: 'cliente.email', tipo: 'email', label: 'Email del cliente', obligatorio: true },
          { nombre: 'cliente.telefono', tipo: 'tel', label: 'Teléfono', obligatorio: false },
          { nombre: 'cliente.empresa', tipo: 'text', label: 'Empresa', obligatorio: false },
          { nombre: 'productos', tipo: 'array', label: 'Productos', obligatorio: true },
          { nombre: 'especificaciones', tipo: 'textarea', label: 'Especificaciones', obligatorio: true }
        ]
      },
      [EstadosComercial.CONFIRMADO]: {
        titulo: 'Confirmar Pedido',
        campos: [
          { nombre: 'presupuesto.total', tipo: 'number', label: 'Presupuesto total', obligatorio: true },
          { nombre: 'fechaEntregaSolicitada', tipo: 'date', label: 'Fecha de entrega', obligatorio: true },
          { nombre: 'prioridad', tipo: 'select', label: 'Prioridad', opciones: ['baja', 'normal', 'alta', 'urgente'], obligatorio: false }
        ]
      },
      [EstadosComercial.MODIFICADO]: {
        titulo: 'Registrar Modificación',
        campos: [
          { nombre: 'motivoModificacion', tipo: 'textarea', label: 'Motivo de la modificación', obligatorio: true },
          { nombre: 'cambiosRealizados', tipo: 'textarea', label: 'Cambios realizados', obligatorio: true }
        ]
      },
      [EstadosComercial.EN_ESPERA]: {
        titulo: 'Poner en Espera',
        campos: [
          { nombre: 'motivoEspera', tipo: 'textarea', label: 'Motivo de la espera', obligatorio: true },
          { nombre: 'fechaRevision', tipo: 'date', label: 'Fecha de revisión', obligatorio: false }
        ]
      },
      [EstadosComercial.CANCELADO]: {
        titulo: 'Cancelar Pedido',
        campos: [
          { nombre: 'motivoCancelacion', tipo: 'textarea', label: 'Motivo de cancelación', obligatorio: true }
        ]
      }
    };

    return formularios[estado] || { titulo: 'Sin formulario', campos: [] };
  }
}