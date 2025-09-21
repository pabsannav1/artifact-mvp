import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { PedidoManager } from './services/PedidoManager.js';
import { EventManager, EventConfiguration, NotificationManager } from './events/EventManager.js';
import { setupRoutes } from './routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class GestorPedidosApp {
  static async crear() {
    const app = express();

    // Configurar middleware básico
    app.use(express.json({ limit: '10mb' }));
    app.use(express.urlencoded({ extended: true }));

    // CORS
    app.use((req, res, next) => {
      res.header('Access-Control-Allow-Origin', '*');
      res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
      res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

      if (req.method === 'OPTIONS') {
        res.sendStatus(200);
      } else {
        next();
      }
    });

    // Logging middleware
    app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      next();
    });

    // Inicializar componentes del sistema
    const eventManager = new EventManager();
    const pedidoManager = new PedidoManager(eventManager);
    const notificationManager = new NotificationManager(eventManager);

    // Configurar eventos
    EventConfiguration.configure(eventManager, pedidoManager);

    // Configurar rutas
    setupRoutes(app, pedidoManager, notificationManager);

    // Endpoint para crear datos de prueba
    app.post('/api/seed', async (req, res) => {
      try {
        const { key } = req.body;
        if (key !== 'desarrollo') {
          return res.status(403).json({
            success: false,
            error: 'Clave incorrecta'
          });
        }

        console.log('🌱 Iniciando seed...');

        const empresas = [
          { nombre: 'Construcciones ABC', email: 'contacto@abc.com', telefono: '+34 600 123 456' },
          { nombre: 'Industrias XYZ', email: 'pedidos@xyz.com', telefono: '+34 600 789 012' },
          { nombre: 'Proyectos DEF', email: 'info@def.es', telefono: '+34 600 345 678' }
        ];

        const productos = [
          ['Estructura metálica', 'Acabados especiales'],
          ['Componentes mecánicos', 'Piezas de precisión'],
          ['Prototipo', 'Diseño personalizado']
        ];

        const especificaciones = [
          'Estructura para edificio con acabados anti-corrosión',
          'Lote de piezas mecanizadas según planos',
          'Prototipo industrial según especificaciones'
        ];

        const pedidosCreados = [];

        // Crear 10 pedidos
        for (let i = 0; i < 10; i++) {
          const empresa = empresas[i % empresas.length];

          const datosEjemplo = {
            cliente: {
              nombre: `Cliente ${i + 1}`,
              email: empresa.email,
              telefono: empresa.telefono,
              empresa: empresa.nombre,
              direccion: `Calle Ejemplo ${i + 1}, Madrid`
            },
            productos: productos[i % productos.length],
            especificaciones: especificaciones[i % especificaciones.length],
            presupuesto: {
              total: Math.floor(Math.random() * 50000) + 5000,
              iva: 21
            },
            fechaEntregaSolicitada: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
            prioridad: ['baja', 'normal', 'alta'][i % 3]
          };

          const pedido = await pedidoManager.crearPedido(datosEjemplo, `comercial_${(i % 3) + 1}`);
          pedidosCreados.push(pedido.id);

          // Algunos estados de ejemplo
          if (i < 5) {
            await pedidoManager.cambiarEstado(
              pedido.id, 'comercial', 'confirmado', `comercial_${(i % 3) + 1}`,
              'Cliente confirmó pedido',
              { presupuesto: datosEjemplo.presupuesto }
            );
          }
        }

        res.json({
          success: true,
          message: 'Seed completado exitosamente',
          pedidosCreados: pedidosCreados.length,
          pedidos: pedidosCreados
        });

      } catch (error) {
        console.error('❌ Error en seed:', error);
        res.status(500).json({
          success: false,
          error: error.message
        });
      }
    });

    // Rutas estáticas
    app.use(express.static(path.join(__dirname, '../public')));
    app.use('/static', express.static(path.join(__dirname, '../public')));
    app.use('/assets', express.static(path.join(__dirname, '../assets')));

    // Ruta para la interfaz de usuario
    app.get('/app', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Ruta demo
    app.get('/demo', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/demo.html'));
    });

    // Ruta raíz
    app.get('/', (req, res) => {
      res.json({
        sistema: 'Gestor de Pedidos Artifact-Centric',
        version: '1.0.0',
        entorno: process.env.NODE_ENV || 'production',
        timestamp: new Date().toISOString(),
        interfaces: {
          aplicacion: '/app',
          demo: '/demo',
          documentacion: '/api/docs',
          health: '/health'
        },
        endpoints: {
          comercial: '/api/comercial',
          admin: '/api/admin',
          taller: '/api/taller',
          sistema: '/api/sistema'
        }
      });
    });

    // Health check
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        timestamp: new Date().toISOString(),
        memoria: process.memoryUsage(),
        sistema: {
          totalPedidos: pedidoManager.pedidos.size,
          eventosEjecutados: eventManager.eventHistory.length,
          notificacionesPendientes: notificationManager.notifications.filter(n => !n.leida).length
        }
      });
    });

    // Manejo de rutas no encontradas
    app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
        metodo: req.method,
        timestamp: new Date().toISOString()
      });
    });

    // Manejo de errores
    app.use((error, req, res, next) => {
      console.error('❌ Error no manejado:', error);

      res.status(error.status || 500).json({
        success: false,
        error: 'Error interno del servidor',
        mensaje: error.message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl
      });
    });

    return app;
  }
}