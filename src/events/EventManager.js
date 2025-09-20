/**
 * Sistema de eventos para coordinar transiciones entre departamentos
 * Permite que los cambios en un departamento activen automáticamente
 * acciones en otros departamentos sin acoplamiento directo
 */
export class EventManager {
  constructor() {
    this.listeners = new Map();
    this.eventHistory = [];
  }

  /**
   * Suscribe un listener a un tipo de evento
   */
  subscribe(eventType, callback) {
    if (!this.listeners.has(eventType)) {
      this.listeners.set(eventType, []);
    }
    this.listeners.get(eventType).push(callback);
  }

  /**
   * Emite un evento y ejecuta todos los listeners suscritos
   */
  async emit(eventType, eventData) {
    const event = {
      type: eventType,
      data: eventData,
      timestamp: new Date(),
      id: this.generateEventId()
    };

    this.eventHistory.push(event);

    const callbacks = this.listeners.get(eventType) || [];
    const results = [];

    for (const callback of callbacks) {
      try {
        const result = await callback(event);
        results.push(result);
      } catch (error) {
        console.error(`Error en listener para evento ${eventType}:`, error);
        results.push({ error: error.message });
      }
    }

    return results;
  }

  /**
   * Genera un ID único para el evento
   */
  generateEventId() {
    return `event_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Obtiene el historial de eventos
   */
  getEventHistory(filterByType = null) {
    if (filterByType) {
      return this.eventHistory.filter(event => event.type === filterByType);
    }
    return this.eventHistory;
  }
}

/**
 * Definición de eventos del sistema
 */
export const EventTypes = {
  // Eventos del departamento comercial
  PEDIDO_PROPUESTO: 'comercial.pedido.propuesto',
  PEDIDO_CONFIRMADO: 'comercial.pedido.confirmado',
  PEDIDO_MODIFICADO: 'comercial.pedido.modificado',
  PEDIDO_CANCELADO_COMERCIAL: 'comercial.pedido.cancelado',

  // Eventos del departamento admin
  DOCUMENTACION_VERIFICADA: 'admin.documentacion.verificada',
  ORDEN_FABRICACION_ENVIADA: 'admin.orden_fabricacion.enviada',
  PEDIDO_ENTREGADO: 'admin.pedido.entregado',
  FACTURA_CREADA: 'admin.factura.creada',
  COBRO_REGISTRADO: 'admin.cobro.registrado',
  INCIDENCIA_DETECTADA: 'admin.incidencia.detectada',

  // Eventos del departamento taller
  FABRICACION_INICIADA: 'taller.fabricacion.iniciada',
  FABRICACION_FINALIZADA: 'taller.fabricacion.finalizada',
  MODIFICACION_REQUERIDA: 'taller.modificacion.requerida',
  PROBLEMA_FABRICACION: 'taller.problema.detectado',

  // Eventos del sistema
  ESTADO_CAMBIADO: 'sistema.estado.cambiado',
  NOTIFICACION_REQUERIDA: 'sistema.notificacion.requerida'
};

/**
 * Configurador de eventos predeterminados del sistema
 */
export class EventConfiguration {
  static configure(eventManager, pedidoManager) {
    // Cuando comercial confirma un pedido, admin debe verificarlo
    eventManager.subscribe(EventTypes.PEDIDO_CONFIRMADO, async (event) => {
      const { pedidoId } = event.data;

      // Activar estado en admin si no existe
      const pedido = pedidoManager.obtenerPedido(pedidoId);
      if (!pedido.estados.admin.estado) {
        await pedidoManager.cambiarEstado(
          pedidoId,
          'admin',
          'confirmado',
          'sistema',
          'Pedido confirmado por comercial - verificación automática'
        );
      }

      return { status: 'admin_activado', pedidoId };
    });

    // Cuando admin envía orden de fabricación, taller debe recibirla
    eventManager.subscribe(EventTypes.ORDEN_FABRICACION_ENVIADA, async (event) => {
      const { pedidoId } = event.data;

      const pedido = pedidoManager.obtenerPedido(pedidoId);
      if (!pedido.estados.taller.estado) {
        await pedidoManager.cambiarEstado(
          pedidoId,
          'taller',
          'pendiente_doc',
          'sistema',
          'Orden de fabricación recibida desde administración'
        );
      }

      return { status: 'taller_activado', pedidoId };
    });

    // Cuando taller finaliza fabricación, notificar a admin
    eventManager.subscribe(EventTypes.FABRICACION_FINALIZADA, async (event) => {
      const { pedidoId } = event.data;

      await pedidoManager.cambiarEstado(
        pedidoId,
        'admin',
        'entregado',
        'sistema',
        'Fabricación finalizada por taller'
      );

      // Emitir evento de notificación
      eventManager.emit(EventTypes.NOTIFICACION_REQUERIDA, {
        destinatario: 'admin',
        tipo: 'fabricacion_completada',
        pedidoId: pedidoId,
        mensaje: 'Pedido listo para entrega'
      });

      return { status: 'admin_notificado', pedidoId };
    });

    // Cuando hay modificaciones, evaluar impacto en otros departamentos
    eventManager.subscribe(EventTypes.PEDIDO_MODIFICADO, async (event) => {
      const { pedidoId, tipoModificacion, departamentoOrigen } = event.data;

      const acciones = [];

      // Si la modificación afecta especificaciones y ya está en fabricación
      if (tipoModificacion === 'especificaciones') {
        const pedido = pedidoManager.obtenerPedido(pedidoId);

        if (pedido.estados.taller.estado === 'en_fabricacion') {
          await pedidoManager.cambiarEstado(
            pedidoId,
            'taller',
            'modificado',
            'sistema',
            'Modificación de especificaciones requiere revisión'
          );
          acciones.push('taller_notificado_modificacion');
        }
      }

      return { status: 'modificacion_procesada', acciones, pedidoId };
    });

    // Gestión de incidencias
    eventManager.subscribe(EventTypes.INCIDENCIA_DETECTADA, async (event) => {
      const { pedidoId, tipoIncidencia, departamento } = event.data;

      // Notificar a los departamentos relevantes
      const notificaciones = [];

      if (tipoIncidencia === 'calidad' && departamento === 'taller') {
        notificaciones.push({
          destinatario: 'admin',
          mensaje: 'Incidencia de calidad detectada en fabricación'
        });
      }

      if (tipoIncidencia === 'entrega' && departamento === 'admin') {
        notificaciones.push({
          destinatario: 'comercial',
          mensaje: 'Problema en entrega - cliente requiere atención'
        });
      }

      // Emitir notificaciones
      for (const notif of notificaciones) {
        eventManager.emit(EventTypes.NOTIFICACION_REQUERIDA, {
          ...notif,
          pedidoId,
          tipo: 'incidencia'
        });
      }

      return { status: 'incidencia_procesada', notificaciones, pedidoId };
    });

    // Log de todos los cambios de estado
    eventManager.subscribe(EventTypes.ESTADO_CAMBIADO, async (event) => {
      const { pedidoId, departamento, estadoAnterior, estadoNuevo } = event.data;

      console.log(`[${new Date().toISOString()}] Pedido ${pedidoId}: ${departamento} ${estadoAnterior} → ${estadoNuevo}`);

      return { status: 'logged', timestamp: new Date() };
    });
  }
}

/**
 * Clase para gestión de notificaciones
 */
export class NotificationManager {
  constructor(eventManager) {
    this.eventManager = eventManager;
    this.notifications = [];
    this.setupNotificationHandling();
  }

  setupNotificationHandling() {
    this.eventManager.subscribe(EventTypes.NOTIFICACION_REQUERIDA, async (event) => {
      const notification = {
        id: this.generateNotificationId(),
        timestamp: new Date(),
        ...event.data,
        leida: false
      };

      this.notifications.push(notification);

      // Aquí se podría integrar con sistemas externos (email, SMS, etc.)
      console.log(`📧 Notificación para ${notification.destinatario}: ${notification.mensaje}`);

      return { status: 'notificacion_creada', notificationId: notification.id };
    });
  }

  generateNotificationId() {
    return `notif_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
  }

  obtenerNotificaciones(destinatario, soloNoLeidas = false) {
    let notificaciones = this.notifications.filter(n => n.destinatario === destinatario);

    if (soloNoLeidas) {
      notificaciones = notificaciones.filter(n => !n.leida);
    }

    return notificaciones.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
  }

  marcarComoLeida(notificationId) {
    const notification = this.notifications.find(n => n.id === notificationId);
    if (notification) {
      notification.leida = true;
      return true;
    }
    return false;
  }
}