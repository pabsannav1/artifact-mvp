import { v4 as uuidv4 } from 'uuid';

/**
 * Estados posibles para cada departamento
 */
export const EstadosComercial = {
  PROPUESTO: 'propuesto',
  CONFIRMADO: 'confirmado',
  MODIFICADO: 'modificado',
  EN_ESPERA: 'en_espera',
  CANCELADO: 'cancelado'
};

export const EstadosAdmin = {
  CONFIRMADO: 'confirmado',
  PENDIENTE_DOC: 'pendiente_doc',
  EN_FABRICACION: 'en_fabricacion',
  ENTREGADO: 'entregado',
  FACTURADO: 'facturado',
  COBRADO: 'cobrado',
  CANCELADO: 'cancelado',
  INCIDENCIA: 'incidencia'
};

export const EstadosTaller = {
  PENDIENTE_DOC: 'pendiente_doc',
  EN_FABRICACION: 'en_fabricacion',
  ENTREGADO: 'entregado',
  CANCELADO: 'cancelado',
  MODIFICADO: 'modificado',
  INCIDENCIA: 'incidencia'
};

/**
 * Artefacto central del sistema: Pedido
 * Contiene todos los datos necesarios y estados independientes por departamento
 */
export class Pedido {
  constructor(datosIniciales = {}) {
    this.id = datosIniciales.id || uuidv4();
    this.fechaCreacion = datosIniciales.fechaCreacion || new Date();
    this.fechaActualizacion = new Date();

    // Datos del cliente
    this.cliente = {
      nombre: datosIniciales.cliente?.nombre || '',
      email: datosIniciales.cliente?.email || '',
      telefono: datosIniciales.cliente?.telefono || '',
      empresa: datosIniciales.cliente?.empresa || '',
      direccion: datosIniciales.cliente?.direccion || ''
    };

    // Datos del pedido
    this.productos = datosIniciales.productos || [];
    this.especificaciones = datosIniciales.especificaciones || '';
    this.fechaEntregaSolicitada = datosIniciales.fechaEntregaSolicitada || null;
    this.prioridad = datosIniciales.prioridad || 'normal';
    this.observaciones = datosIniciales.observaciones || '';

    // Estados independientes por departamento
    this.estados = {
      comercial: {
        estado: datosIniciales.estados?.comercial?.estado || EstadosComercial.PROPUESTO,
        fechaCambio: new Date(),
        responsable: datosIniciales.estados?.comercial?.responsable || null,
        datos: datosIniciales.estados?.comercial?.datos || {}
      },
      admin: {
        estado: datosIniciales.estados?.admin?.estado || null,
        fechaCambio: null,
        responsable: datosIniciales.estados?.admin?.responsable || null,
        datos: datosIniciales.estados?.admin?.datos || {}
      },
      taller: {
        estado: datosIniciales.estados?.taller?.estado || null,
        fechaCambio: null,
        responsable: datosIniciales.estados?.taller?.responsable || null,
        datos: datosIniciales.estados?.taller?.datos || {}
      }
    };

    // Historial de cambios
    this.historial = datosIniciales.historial || [{
      fecha: this.fechaCreacion,
      departamento: 'comercial',
      estadoAnterior: null,
      estadoNuevo: this.estados.comercial.estado,
      responsable: this.estados.comercial.responsable,
      observaciones: 'Pedido creado'
    }];

    // Datos financieros
    this.presupuesto = {
      importe: datosIniciales.presupuesto?.importe || 0,
      iva: datosIniciales.presupuesto?.iva || 21,
      descuento: datosIniciales.presupuesto?.descuento || 0,
      total: datosIniciales.presupuesto?.total || 0
    };

    // Documentación
    this.documentos = datosIniciales.documentos || [];
  }

  /**
   * Cambia el estado de un departamento específico
   */
  cambiarEstado(departamento, nuevoEstado, responsable, observaciones = '', datosAdicionales = {}) {
    const estadoAnterior = this.estados[departamento].estado;

    this.estados[departamento] = {
      estado: nuevoEstado,
      fechaCambio: new Date(),
      responsable: responsable,
      datos: { ...this.estados[departamento].datos, ...datosAdicionales }
    };

    this.historial.push({
      fecha: new Date(),
      departamento: departamento,
      estadoAnterior: estadoAnterior,
      estadoNuevo: nuevoEstado,
      responsable: responsable,
      observaciones: observaciones
    });

    this.fechaActualizacion = new Date();
  }

  /**
   * Obtiene el estado actual de un departamento
   */
  obtenerEstado(departamento) {
    return this.estados[departamento];
  }

  /**
   * Verifica si el pedido está en un estado específico para un departamento
   */
  estaEn(departamento, estado) {
    return this.estados[departamento].estado === estado;
  }

  /**
   * Obtiene todos los datos del pedido (vista completa para contexto)
   */
  obtenerDatosCompletos() {
    return {
      id: this.id,
      fechaCreacion: this.fechaCreacion,
      fechaActualizacion: this.fechaActualizacion,
      cliente: this.cliente,
      productos: this.productos,
      especificaciones: this.especificaciones,
      fechaEntregaSolicitada: this.fechaEntregaSolicitada,
      prioridad: this.prioridad,
      observaciones: this.observaciones,
      estados: this.estados,
      historial: this.historial,
      presupuesto: this.presupuesto,
      documentos: this.documentos
    };
  }

  /**
   * Obtiene una vista específica para un departamento y estado
   */
  obtenerVistaDepartamento(departamento) {
    const datosCompletos = this.obtenerDatosCompletos();
    const estadoActual = this.estados[departamento];

    return {
      ...datosCompletos,
      estadoActual: estadoActual,
      departamento: departamento
    };
  }
}