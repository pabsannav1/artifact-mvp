import { EstadosAdmin } from '../models/Pedido.js';

/**
 * Máquina de estados para el departamento de administración
 */
export class MaquinaEstadosAdmin {
  static transicionesPermitidas = {
    [EstadosAdmin.CONFIRMADO]: [
      EstadosAdmin.PENDIENTE_DOC,
      EstadosAdmin.CANCELADO
    ],
    [EstadosAdmin.PENDIENTE_DOC]: [
      EstadosAdmin.EN_FABRICACION,
      EstadosAdmin.CANCELADO
    ],
    [EstadosAdmin.EN_FABRICACION]: [
      EstadosAdmin.ENTREGADO,
      EstadosAdmin.INCIDENCIA,
      EstadosAdmin.CANCELADO
    ],
    [EstadosAdmin.ENTREGADO]: [
      EstadosAdmin.FACTURADO,
      EstadosAdmin.INCIDENCIA
    ],
    [EstadosAdmin.FACTURADO]: [
      EstadosAdmin.COBRADO
    ],
    [EstadosAdmin.COBRADO]: [], // Estado final
    [EstadosAdmin.CANCELADO]: [], // Estado final
    [EstadosAdmin.INCIDENCIA]: [
      EstadosAdmin.EN_FABRICACION,
      EstadosAdmin.ENTREGADO,
      EstadosAdmin.CANCELADO
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
      [EstadosAdmin.CONFIRMADO]: this.validarConfirmado,
      [EstadosAdmin.PENDIENTE_DOC]: this.validarPendienteDoc,
      [EstadosAdmin.EN_FABRICACION]: this.validarEnFabricacion,
      [EstadosAdmin.ENTREGADO]: this.validarEntregado,
      [EstadosAdmin.FACTURADO]: this.validarFacturado,
      [EstadosAdmin.COBRADO]: this.validarCobrado,
      [EstadosAdmin.CANCELADO]: this.validarCancelado,
      [EstadosAdmin.INCIDENCIA]: this.validarIncidencia
    };

    const validador = validaciones[estado];
    return validador ? validador(datos) : { valido: true };
  }

  static validarConfirmado(datos) {
    const errores = [];

    if (!datos.presupuesto?.total || datos.presupuesto.total <= 0) {
      errores.push('Presupuesto verificado es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['presupuesto.total', 'cliente.direccion']
    };
  }

  static validarPendienteDoc(datos) {
    const errores = [];

    if (!datos.documentosRequeridos || datos.documentosRequeridos.length === 0) {
      errores.push('Lista de documentos requeridos es obligatoria');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['documentosRequeridos', 'fechaLimiteDocumentacion']
    };
  }

  static validarEnFabricacion(datos) {
    const errores = [];

    if (!datos.fechaInicioFabricacion) {
      errores.push('Fecha de inicio de fabricación es obligatoria');
    }
    if (!datos.responsableTaller) {
      errores.push('Responsable del taller es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['fechaInicioFabricacion', 'responsableTaller', 'fechaEntregaEstimada']
    };
  }

  static validarEntregado(datos) {
    const errores = [];

    if (!datos.fechaEntregaReal) {
      errores.push('Fecha de entrega real es obligatoria');
    }
    if (!datos.conformidadCliente) {
      errores.push('Conformidad del cliente es obligatoria');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['fechaEntregaReal', 'conformidadCliente', 'documentosEntrega']
    };
  }

  static validarFacturado(datos) {
    const errores = [];

    if (!datos.numeroFactura) {
      errores.push('Número de factura es obligatorio');
    }
    if (!datos.fechaFactura) {
      errores.push('Fecha de factura es obligatoria');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['numeroFactura', 'fechaFactura', 'importeFacturado']
    };
  }

  static validarCobrado(datos) {
    const errores = [];

    if (!datos.fechaCobro) {
      errores.push('Fecha de cobro es obligatoria');
    }
    if (!datos.metodoCobro) {
      errores.push('Método de cobro es obligatorio');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['fechaCobro', 'metodoCobro', 'importeCobrado']
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
      datosRequeridos: ['motivoCancelacion', 'afectacionFacturacion']
    };
  }

  static validarIncidencia(datos) {
    const errores = [];

    if (!datos.tipoIncidencia) {
      errores.push('Tipo de incidencia es obligatorio');
    }
    if (!datos.descripcionIncidencia) {
      errores.push('Descripción de la incidencia es obligatoria');
    }

    return {
      valido: errores.length === 0,
      errores: errores,
      datosRequeridos: ['tipoIncidencia', 'descripcionIncidencia', 'accionesCorrectivas']
    };
  }

  static obtenerFormularioParaEstado(estado) {
    const formularios = {
      [EstadosAdmin.CONFIRMADO]: {
        titulo: 'Verificar Confirmación',
        campos: [
          { nombre: 'presupuesto.total', tipo: 'number', label: 'Presupuesto verificado', obligatorio: true },
          { nombre: 'cliente.direccion', tipo: 'textarea', label: 'Dirección de entrega', obligatorio: true }
        ]
      },
      [EstadosAdmin.PENDIENTE_DOC]: {
        titulo: 'Gestionar Documentación',
        campos: [
          { nombre: 'documentosRequeridos', tipo: 'array', label: 'Documentos requeridos', obligatorio: true },
          { nombre: 'fechaLimiteDocumentacion', tipo: 'date', label: 'Fecha límite documentación', obligatorio: false }
        ]
      },
      [EstadosAdmin.EN_FABRICACION]: {
        titulo: 'Enviar a Fabricación',
        campos: [
          { nombre: 'fechaInicioFabricacion', tipo: 'date', label: 'Fecha inicio fabricación', obligatorio: true },
          { nombre: 'responsableTaller', tipo: 'text', label: 'Responsable del taller', obligatorio: true },
          { nombre: 'fechaEntregaEstimada', tipo: 'date', label: 'Fecha entrega estimada', obligatorio: false }
        ]
      },
      [EstadosAdmin.ENTREGADO]: {
        titulo: 'Registrar Entrega',
        campos: [
          { nombre: 'fechaEntregaReal', tipo: 'date', label: 'Fecha entrega real', obligatorio: true },
          { nombre: 'conformidadCliente', tipo: 'select', label: 'Conformidad cliente', opciones: ['si', 'no', 'parcial'], obligatorio: true },
          { nombre: 'documentosEntrega', tipo: 'array', label: 'Documentos de entrega', obligatorio: false }
        ]
      },
      [EstadosAdmin.FACTURADO]: {
        titulo: 'Crear Factura',
        campos: [
          { nombre: 'numeroFactura', tipo: 'text', label: 'Número de factura', obligatorio: true },
          { nombre: 'fechaFactura', tipo: 'date', label: 'Fecha factura', obligatorio: true },
          { nombre: 'importeFacturado', tipo: 'number', label: 'Importe facturado', obligatorio: true }
        ]
      },
      [EstadosAdmin.COBRADO]: {
        titulo: 'Registrar Cobro',
        campos: [
          { nombre: 'fechaCobro', tipo: 'date', label: 'Fecha cobro', obligatorio: true },
          { nombre: 'metodoCobro', tipo: 'select', label: 'Método cobro', opciones: ['transferencia', 'efectivo', 'cheque', 'tarjeta'], obligatorio: true },
          { nombre: 'importeCobrado', tipo: 'number', label: 'Importe cobrado', obligatorio: true }
        ]
      },
      [EstadosAdmin.CANCELADO]: {
        titulo: 'Cancelar Pedido',
        campos: [
          { nombre: 'motivoCancelacion', tipo: 'textarea', label: 'Motivo cancelación', obligatorio: true },
          { nombre: 'afectacionFacturacion', tipo: 'select', label: 'Afecta facturación', opciones: ['si', 'no'], obligatorio: false }
        ]
      },
      [EstadosAdmin.INCIDENCIA]: {
        titulo: 'Gestionar Incidencia',
        campos: [
          { nombre: 'tipoIncidencia', tipo: 'select', label: 'Tipo incidencia', opciones: ['calidad', 'entrega', 'facturacion', 'cliente'], obligatorio: true },
          { nombre: 'descripcionIncidencia', tipo: 'textarea', label: 'Descripción', obligatorio: true },
          { nombre: 'accionesCorrectivas', tipo: 'textarea', label: 'Acciones correctivas', obligatorio: false }
        ]
      }
    };

    return formularios[estado] || { titulo: 'Sin formulario', campos: [] };
  }
}