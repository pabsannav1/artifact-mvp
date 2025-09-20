import express from 'express';
import { ComercialController } from '../controllers/ComercialController.js';
import { AdminController } from '../controllers/AdminController.js';
import { TallerController } from '../controllers/TallerController.js';

/**
 * Configuración de rutas del sistema artifact-centric
 * Cada departamento tiene sus propias rutas específicas
 */
export function setupRoutes(app, pedidoManager, notificationManager) {
  const comercialController = new ComercialController(pedidoManager);
  const adminController = new AdminController(pedidoManager);
  const tallerController = new TallerController(pedidoManager);

  // === RUTAS COMERCIALES ===
  const comercialRouter = express.Router();

  // Dashboard y listados
  comercialRouter.get('/dashboard', comercialController.obtenerDashboard.bind(comercialController));
  comercialRouter.get('/pedidos', comercialController.obtenerPedidos.bind(comercialController));
  comercialRouter.get('/pedidos/:pedidoId', comercialController.obtenerPedido.bind(comercialController));

  // Gestión de estados
  comercialRouter.post('/propuestas', comercialController.crearPropuesta.bind(comercialController));
  comercialRouter.patch('/pedidos/:pedidoId/confirmar', comercialController.confirmarPedido.bind(comercialController));
  comercialRouter.patch('/pedidos/:pedidoId/modificar', comercialController.modificarPedido.bind(comercialController));
  comercialRouter.patch('/pedidos/:pedidoId/espera', comercialController.ponerEnEspera.bind(comercialController));
  comercialRouter.patch('/pedidos/:pedidoId/cancelar', comercialController.cancelarPedido.bind(comercialController));

  // Utilidades
  comercialRouter.get('/formularios/:estado', comercialController.obtenerFormulario.bind(comercialController));
  comercialRouter.get('/transiciones/:estado', comercialController.obtenerTransiciones.bind(comercialController));

  app.use('/api/comercial', comercialRouter);

  // === RUTAS ADMINISTRATIVAS ===
  const adminRouter = express.Router();

  // Dashboard y listados
  adminRouter.get('/dashboard', adminController.obtenerDashboard.bind(adminController));
  adminRouter.get('/pedidos', adminController.obtenerPedidos.bind(adminController));
  adminRouter.get('/pedidos/:pedidoId', adminController.obtenerPedido.bind(adminController));

  // Gestión de estados
  adminRouter.patch('/pedidos/:pedidoId/verificar', adminController.verificarConfirmacion.bind(adminController));
  adminRouter.patch('/pedidos/:pedidoId/documentacion', adminController.gestionarDocumentacion.bind(adminController));
  adminRouter.patch('/pedidos/:pedidoId/fabricacion', adminController.enviarAFabricacion.bind(adminController));
  adminRouter.patch('/pedidos/:pedidoId/entrega', adminController.registrarEntrega.bind(adminController));
  adminRouter.patch('/pedidos/:pedidoId/facturar', adminController.crearFactura.bind(adminController));
  adminRouter.patch('/pedidos/:pedidoId/cobrar', adminController.registrarCobro.bind(adminController));
  adminRouter.patch('/pedidos/:pedidoId/incidencia', adminController.gestionarIncidencia.bind(adminController));
  adminRouter.patch('/pedidos/:pedidoId/cancelar', adminController.cancelarPedido.bind(adminController));

  // Métricas y reportes
  adminRouter.get('/metricas/financieras', adminController.obtenerMetricasFinancieras.bind(adminController));

  app.use('/api/admin', adminRouter);

  // === RUTAS TALLER ===
  const tallerRouter = express.Router();

  // Dashboard y listados
  tallerRouter.get('/dashboard', tallerController.obtenerDashboard.bind(tallerController));
  tallerRouter.get('/pedidos', tallerController.obtenerPedidos.bind(tallerController));
  tallerRouter.get('/pedidos/:pedidoId', tallerController.obtenerPedido.bind(tallerController));

  // Gestión de estados
  tallerRouter.patch('/pedidos/:pedidoId/iniciar', tallerController.iniciarFabricacion.bind(tallerController));
  tallerRouter.patch('/pedidos/:pedidoId/finalizar', tallerController.finalizarFabricacion.bind(tallerController));
  tallerRouter.patch('/pedidos/:pedidoId/cancelar', tallerController.cancelarFabricacion.bind(tallerController));
  tallerRouter.patch('/pedidos/:pedidoId/modificar', tallerController.gestionarModificacion.bind(tallerController));
  tallerRouter.patch('/pedidos/:pedidoId/incidencia', tallerController.reportarIncidencia.bind(tallerController));

  // Estadísticas
  tallerRouter.get('/estadisticas/productividad', tallerController.obtenerEstadisticasProductividad.bind(tallerController));

  app.use('/api/taller', tallerRouter);

  // === RUTAS GENERALES DEL SISTEMA ===
  const sistemaRouter = express.Router();

  // Métricas generales
  sistemaRouter.get('/metricas', (req, res) => {
    try {
      const metricas = pedidoManager.obtenerMetricas();
      res.json({
        success: true,
        data: metricas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Notificaciones
  sistemaRouter.get('/notificaciones/:destinatario', (req, res) => {
    try {
      const { destinatario } = req.params;
      const { soloNoLeidas } = req.query;

      const notificaciones = notificationManager.obtenerNotificaciones(
        destinatario,
        soloNoLeidas === 'true'
      );

      res.json({
        success: true,
        data: notificaciones
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  sistemaRouter.patch('/notificaciones/:notificationId/leer', (req, res) => {
    try {
      const { notificationId } = req.params;
      const resultado = notificationManager.marcarComoLeida(notificationId);

      if (resultado) {
        res.json({
          success: true,
          message: 'Notificación marcada como leída'
        });
      } else {
        res.status(404).json({
          success: false,
          error: 'Notificación no encontrada'
        });
      }
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Historial de eventos
  sistemaRouter.get('/eventos', (req, res) => {
    try {
      const { tipo } = req.query;
      const eventos = pedidoManager.eventManager.getEventHistory(tipo);

      res.json({
        success: true,
        data: eventos
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  });

  // Vista completa de un pedido (cross-departamental)
  sistemaRouter.get('/pedidos/:pedidoId/completo', (req, res) => {
    try {
      const { pedidoId } = req.params;
      const pedido = pedidoManager.obtenerPedido(pedidoId);

      const vistaCompleta = {
        ...pedido.obtenerDatosCompletos(),
        vistas: {
          comercial: pedidoManager.obtenerVistaPedido(pedidoId, 'comercial'),
          admin: pedidoManager.obtenerVistaPedido(pedidoId, 'admin'),
          taller: pedidoManager.obtenerVistaPedido(pedidoId, 'taller')
        }
      };

      res.json({
        success: true,
        data: vistaCompleta
      });
    } catch (error) {
      res.status(404).json({
        success: false,
        error: error.message
      });
    }
  });

  app.use('/api/sistema', sistemaRouter);

  // === MIDDLEWARE DE MANEJO DE ERRORES ===
  app.use((error, req, res, next) => {
    console.error('Error en API:', error);

    if (error.name === 'ValidationError') {
      return res.status(400).json({
        success: false,
        error: 'Error de validación',
        details: error.message
      });
    }

    if (error.name === 'UnauthorizedError') {
      return res.status(401).json({
        success: false,
        error: 'No autorizado'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Error interno del servidor'
    });
  });

  // === RUTA DE DOCUMENTACIÓN DE LA API ===
  app.get('/api/docs', (req, res) => {
    const documentacion = {
      title: 'API Gestor de Pedidos Artifact-Centric',
      version: '1.0.0',
      description: 'Sistema de gestión de pedidos basado en artefactos con ciclos de vida independientes por departamento',
      endpoints: {
        comercial: {
          base: '/api/comercial',
          endpoints: [
            'GET /dashboard - Dashboard comercial',
            'GET /pedidos - Listar pedidos',
            'GET /pedidos/:id - Obtener pedido específico',
            'POST /propuestas - Crear propuesta',
            'PATCH /pedidos/:id/confirmar - Confirmar pedido',
            'PATCH /pedidos/:id/modificar - Modificar pedido',
            'PATCH /pedidos/:id/espera - Poner en espera',
            'PATCH /pedidos/:id/cancelar - Cancelar pedido'
          ]
        },
        admin: {
          base: '/api/admin',
          endpoints: [
            'GET /dashboard - Dashboard administrativo',
            'GET /pedidos - Listar pedidos',
            'PATCH /pedidos/:id/verificar - Verificar confirmación',
            'PATCH /pedidos/:id/documentacion - Gestionar documentación',
            'PATCH /pedidos/:id/fabricacion - Enviar a fabricación',
            'PATCH /pedidos/:id/entrega - Registrar entrega',
            'PATCH /pedidos/:id/facturar - Crear factura',
            'PATCH /pedidos/:id/cobrar - Registrar cobro',
            'GET /metricas/financieras - Métricas financieras'
          ]
        },
        taller: {
          base: '/api/taller',
          endpoints: [
            'GET /dashboard - Dashboard del taller',
            'GET /pedidos - Listar pedidos',
            'PATCH /pedidos/:id/iniciar - Iniciar fabricación',
            'PATCH /pedidos/:id/finalizar - Finalizar fabricación',
            'PATCH /pedidos/:id/modificar - Gestionar modificación',
            'PATCH /pedidos/:id/incidencia - Reportar incidencia',
            'GET /estadisticas/productividad - Estadísticas de productividad'
          ]
        },
        sistema: {
          base: '/api/sistema',
          endpoints: [
            'GET /metricas - Métricas generales',
            'GET /notificaciones/:destinatario - Obtener notificaciones',
            'PATCH /notificaciones/:id/leer - Marcar notificación como leída',
            'GET /eventos - Historial de eventos',
            'GET /pedidos/:id/completo - Vista completa del pedido'
          ]
        }
      },
      conceptos: {
        'Artifact-Centric': 'El pedido es el artefacto central con múltiples estados por departamento',
        'Estados Independientes': 'Cada departamento mantiene su propio estado sin dependencias estrictas',
        'Eventos de Coordinación': 'Los cambios en un departamento pueden activar automáticamente acciones en otros',
        'Vistas Contextuales': 'Cada departamento ve los datos relevantes para su contexto específico'
      }
    };

    res.json(documentacion);
  });

  return app;
}