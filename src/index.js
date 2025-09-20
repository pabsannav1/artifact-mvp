import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';

import { PedidoManager } from './services/PedidoManager.js';
import { EventManager, EventConfiguration, NotificationManager } from './events/EventManager.js';
import { setupRoutes } from './routes/index.js';

// Configuración ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Servidor principal del sistema artifact-centric de gestión de pedidos
 */
class GestorPedidosServer {
  constructor() {
    this.app = express();
    this.puerto = process.env.PORT || 3000;
    this.entorno = process.env.NODE_ENV || 'development';

    // Inicializar componentes del sistema
    this.eventManager = new EventManager();
    this.pedidoManager = new PedidoManager(this.eventManager);
    this.notificationManager = new NotificationManager(this.eventManager);

    this.inicializar();
  }

  async inicializar() {
    try {
      console.log('🚀 Iniciando Gestor de Pedidos Artifact-Centric...');

      this.configurarMiddleware();
      this.configurarEventos();
      this.configurarRutas();
      this.configurarManejadorErrores();
      await this.crearDatosEjemplo();

      console.log('✅ Sistema inicializado correctamente');
    } catch (error) {
      console.error('❌ Error inicializando el sistema:', error);
      process.exit(1);
    }
  }

  configurarMiddleware() {
    // Middleware básico
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // CORS para desarrollo
    if (this.entorno === 'development') {
      this.app.use((req, res, next) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');

        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });
    }

    // Middleware de logging
    this.app.use((req, res, next) => {
      const timestamp = new Date().toISOString();
      console.log(`[${timestamp}] ${req.method} ${req.path}`);
      next();
    });

    // Servir archivos estáticos
    this.app.use(express.static(path.join(__dirname, '../public')));
    this.app.use('/static', express.static(path.join(__dirname, '../public')));
    this.app.use('/assets', express.static(path.join(__dirname, '../assets')));
  }

  configurarEventos() {
    console.log('⚙️ Configurando sistema de eventos...');

    // Configurar eventos predeterminados del sistema
    EventConfiguration.configure(this.eventManager, this.pedidoManager);

    console.log('✅ Sistema de eventos configurado');
  }

  configurarRutas() {
    console.log('🛣️ Configurando rutas del API...');

    // Configurar todas las rutas
    setupRoutes(this.app, this.pedidoManager, this.notificationManager);

    // Ruta para la interfaz de usuario
    this.app.get('/app', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/index.html'));
    });

    // Ruta demo
    this.app.get('/demo', (req, res) => {
      res.sendFile(path.join(__dirname, '../public/demo.html'));
    });

    // Ruta raíz con información del sistema
    this.app.get('/', (req, res) => {
      res.json({
        sistema: 'Gestor de Pedidos Artifact-Centric',
        version: '1.0.0',
        entorno: this.entorno,
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
        },
        conceptos: {
          'artifact-centric': 'El pedido es el artefacto central con múltiples perspectivas departamentales',
          'estados-independientes': 'Cada departamento mantiene su propio ciclo de vida',
          'eventos-coordinacion': 'Los cambios en un departamento pueden activar automáticamente acciones en otros',
          'vistas-contextuales': 'Cada actor ve exactamente los datos que necesita para operar'
        }
      });
    });

    // Ruta de health check
    this.app.get('/health', (req, res) => {
      const health = {
        status: 'ok',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
        memoria: process.memoryUsage(),
        sistema: {
          totalPedidos: this.pedidoManager.pedidos.size,
          eventosEjecutados: this.eventManager.eventHistory.length,
          notificacionesPendientes: this.notificationManager.notifications.filter(n => !n.leida).length
        }
      };

      res.json(health);
    });

    console.log('✅ Rutas configuradas');
  }

  configurarManejadorErrores() {
    // Manejo de rutas no encontradas
    this.app.use('*', (req, res) => {
      res.status(404).json({
        success: false,
        error: 'Endpoint no encontrado',
        path: req.originalUrl,
        metodo: req.method,
        timestamp: new Date().toISOString(),
        ayuda: 'Consulta /api/docs para ver los endpoints disponibles'
      });
    });

    // Manejo global de errores
    this.app.use((error, req, res, next) => {
      console.error('❌ Error no manejado:', error);

      const esDesarrollo = this.entorno === 'development';

      res.status(error.status || 500).json({
        success: false,
        error: 'Error interno del servidor',
        mensaje: error.message,
        timestamp: new Date().toISOString(),
        path: req.originalUrl,
        ...(esDesarrollo && { stack: error.stack })
      });
    });
  }

  async crearDatosEjemplo() {
    if (this.entorno !== 'development') return;

    console.log('📊 Creando 30+ pedidos de ejemplo para todos los departamentos...');

    try {
      // Datos base para generar pedidos variados
      const empresas = [
        { nombre: 'Construcciones ABC', email: 'contacto@abc.com', telefono: '+34 600 123 456' },
        { nombre: 'Industrias XYZ', email: 'pedidos@xyz.com', telefono: '+34 600 789 012' },
        { nombre: 'Proyectos DEF', email: 'info@def.es', telefono: '+34 600 345 678' },
        { nombre: 'Metalúrgica GHI', email: 'ventas@ghi.com', telefono: '+34 600 456 789' },
        { nombre: 'Ingeniería JKL', email: 'proyectos@jkl.es', telefono: '+34 600 567 890' },
        { nombre: 'Manufacturas MNO', email: 'contacto@mno.com', telefono: '+34 600 678 901' },
        { nombre: 'Tecnología PQR', email: 'info@pqr.es', telefono: '+34 600 789 012' },
        { nombre: 'Sistemas STU', email: 'ventas@stu.com', telefono: '+34 600 890 123' },
        { nombre: 'Desarrollos VWX', email: 'pedidos@vwx.es', telefono: '+34 600 901 234' },
        { nombre: 'Soluciones YZ', email: 'contacto@yz.com', telefono: '+34 600 012 345' }
      ];

      const productos = [
        ['Estructura metálica', 'Acabados especiales'],
        ['Componentes mecánicos', 'Piezas de precisión'],
        ['Prototipo', 'Diseño personalizado'],
        ['Maquinaria industrial', 'Sistemas automatizados'],
        ['Herramientas especializadas', 'Equipos de medición'],
        ['Piezas de recambio', 'Componentes electrónicos'],
        ['Sistemas de ventilación', 'Conductos metálicos'],
        ['Estructuras soldadas', 'Marcos de acero'],
        ['Equipos hidráulicos', 'Cilindros neumáticos'],
        ['Moldes industriales', 'Troqueles de corte']
      ];

      const especificaciones = [
        'Estructura para edificio de 5 plantas con acabados anti-corrosión',
        'Lote de 100 piezas mecanizadas según planos adjuntos',
        'Prototipo de maquinaria industrial según especificaciones técnicas',
        'Sistema automatizado para línea de producción con sensores IoT',
        'Herramientas de precisión para sector aeronáutico con certificación',
        'Componentes electrónicos resistentes a altas temperaturas',
        'Sistema de ventilación industrial para nave de 2000m²',
        'Estructuras soldadas con certificado de calidad ISO 9001',
        'Equipos hidráulicos para maquinaria pesada con garantía extendida',
        'Moldes de inyección para producción en serie de 10000 unidades'
      ];

      const prioridades = ['baja', 'normal', 'alta', 'urgente'];

      // Generar 30+ pedidos con diferentes estados
      for (let i = 0; i < 32; i++) {
        const empresaIndex = i % empresas.length;
        const empresa = empresas[empresaIndex];

        const datosEjemplo = {
          cliente: {
            nombre: `${empresa.nombre.split(' ')[0]} Cliente ${i + 1}`,
            email: empresa.email,
            telefono: empresa.telefono,
            empresa: empresa.nombre,
            direccion: `Calle Ejemplo ${i + 1}, ${['Madrid', 'Barcelona', 'Valencia', 'Sevilla', 'Bilbao'][i % 5]}`
          },
          productos: productos[i % productos.length],
          especificaciones: especificaciones[i % especificaciones.length],
          presupuesto: {
            total: Math.floor(Math.random() * 50000) + 5000,
            iva: 21
          },
          fechaEntregaSolicitada: new Date(Date.now() + (Math.floor(Math.random() * 60) + 10) * 24 * 60 * 60 * 1000),
          prioridad: prioridades[Math.floor(Math.random() * prioridades.length)]
        };

        const responsable = `comercial_${(i % 5) + 1}`;
        const pedido = await this.pedidoManager.crearPedido(datosEjemplo, responsable);

        // Simular diferentes estados para cada departamento
        // 10 pedidos en diferentes estados comerciales
        if (i < 10) {
          if (i < 4) {
            // 4 pedidos confirmados
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'comercial', 'confirmado', responsable,
              'Cliente confirmó pedido',
              {
                presupuesto: datosEjemplo.presupuesto,
                fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
              }
            );
          } else if (i < 6) {
            // 2 pedidos modificados (primero confirmar, luego modificar)
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'comercial', 'confirmado', responsable,
              'Cliente confirmó pedido inicialmente',
              {
                presupuesto: datosEjemplo.presupuesto,
                fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
              }
            );

            await this.pedidoManager.cambiarEstado(
              pedido.id, 'comercial', 'modificado', responsable,
              'Cliente solicitó cambios en especificaciones',
              {
                motivoModificacion: 'Cliente solicitó cambios en especificaciones',
                cambiosRealizados: 'Cambio de material, Ajuste de dimensiones'
              }
            );
          } else if (i < 8) {
            // 2 pedidos en espera (primero confirmar, luego poner en espera)
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'comercial', 'confirmado', responsable,
              'Cliente confirmó pedido inicialmente',
              {
                presupuesto: datosEjemplo.presupuesto,
                fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
              }
            );

            await this.pedidoManager.cambiarEstado(
              pedido.id, 'comercial', 'en_espera', responsable,
              'Esperando aprobación del cliente',
              { motivoEspera: 'Aprobación presupuesto' }
            );
          }
          // 2 pedidos se quedan en propuesto
        }

        // 10 pedidos en diferentes estados administrativos
        else if (i < 20) {
          // Primero confirmar comercialmente
          await this.pedidoManager.cambiarEstado(
            pedido.id, 'comercial', 'confirmado', responsable,
            'Pedido confirmado por comercial',
            {
              presupuesto: datosEjemplo.presupuesto,
              fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
            }
          );

          const adminIndex = i - 10;
          if (adminIndex < 3) {
            // 3 pedidos pendientes de documentación
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'admin', 'pendiente_doc', `admin_${(adminIndex % 3) + 1}`,
              'Verificación completada, solicitando documentación',
              {
                documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas', 'Planos de fabricación'],
                fechaLimiteDocumentacion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              }
            );
          } else if (adminIndex < 6) {
            // 3 pedidos con documentación completa
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'admin', 'pendiente_doc', `admin_${(adminIndex % 3) + 1}`,
              'Documentación solicitada',
              {
                documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas'],
                fechaLimiteDocumentacion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
              }
            );

            await this.pedidoManager.cambiarEstado(
              pedido.id, 'admin', 'en_fabricacion', `admin_${(adminIndex % 3) + 1}`,
              'Documentación aprobada y enviada a fabricación',
              {
                documentosAprobados: ['Contrato firmado', 'Especificaciones técnicas'],
                responsableTaller: `taller_${(adminIndex % 3) + 1}`,
                fechaInicioFabricacion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
              }
            );
          } else if (adminIndex < 8) {
            // 2 pedidos cancelados
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'admin', 'cancelado', `admin_${(adminIndex % 3) + 1}`,
              'Documentación incompleta o incorrecta',
              {
                motivoCancelacion: 'Especificaciones técnicas insuficientes'
              }
            );
          }
          // 2 pedidos se quedan en verificacion
        }

        // 12 pedidos en diferentes estados de taller
        else {
          // Primero pasar por comercial y admin
          await this.pedidoManager.cambiarEstado(
            pedido.id, 'comercial', 'confirmado', responsable,
            'Pedido confirmado por comercial',
            {
              presupuesto: datosEjemplo.presupuesto,
              fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
            }
          );

          await this.pedidoManager.cambiarEstado(
            pedido.id, 'admin', 'pendiente_doc', `admin_${((i - 20) % 3) + 1}`,
            'Procesando documentación requerida',
            {
              documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas'],
              fechaLimiteDocumentacion: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          );

          await this.pedidoManager.cambiarEstado(
            pedido.id, 'admin', 'en_fabricacion', `admin_${((i - 20) % 3) + 1}`,
            'Documentación aprobada y enviada a fabricación',
            {
              fechaInicioFabricacion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              responsableTaller: `taller_${((i - 20) % 4) + 1}`,
              fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          );

          const tallerIndex = i - 20;
          if (tallerIndex < 4) {
            // 4 pedidos en fabricación
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'taller', 'en_fabricacion', `taller_${(tallerIndex % 4) + 1}`,
              'Fabricación iniciada',
              {
                responsableFabricacion: `taller_${(tallerIndex % 4) + 1}`,
                fechaInicioReal: new Date(),
                maquinasAsignadas: ['Torno CNC', 'Fresadora', 'Soldadora'],
                planFabricacion: 'Producción en 3 fases según especificaciones'
              }
            );
          } else if (tallerIndex < 7) {
            // 3 pedidos entregados
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'taller', 'en_fabricacion', `taller_${(tallerIndex % 4) + 1}`,
              'Fabricación iniciada',
              {
                responsableFabricacion: `taller_${(tallerIndex % 4) + 1}`,
                fechaInicioReal: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                maquinasAsignadas: ['Torno CNC', 'Fresadora'],
                planFabricacion: 'Producción completada'
              }
            );

            await this.pedidoManager.cambiarEstado(
              pedido.id, 'taller', 'entregado', `taller_${(tallerIndex % 4) + 1}`,
              'Fabricación completada y entregada',
              {
                controlCalidad: 'aprobado',
                fechaFinalizacion: new Date(),
                observacionesCalidad: 'Producto conforme a especificaciones'
              }
            );
          } else if (tallerIndex < 9) {
            // 2 pedidos con incidencias
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'taller', 'incidencia', `taller_${(tallerIndex % 4) + 1}`,
              'Incidencia detectada durante fabricación',
              {
                problemaDetectado: 'Material defectuoso detectado',
                solucionPropuesta: 'Reemplazo de material y reinicio de proceso',
                tiempoParada: 24
              }
            );
          } else if (tallerIndex < 11) {
            // 2 pedidos modificados
            await this.pedidoManager.cambiarEstado(
              pedido.id, 'taller', 'modificado', `taller_${(tallerIndex % 4) + 1}`,
              'Modificación en fabricación',
              {
                tipoModificacion: 'especificaciones',
                impactoFabricacion: 'medio',
                tiempoAdicional: 48
              }
            );
          }
          // 1 pedido se queda pendiente_doc en taller
        }

        // Pequeña pausa para evitar sobrecargar
        if (i % 10 === 9) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      }

      console.log(`✅ Creados 32 pedidos de ejemplo distribuidos en todos los departamentos`);
      console.log(`   • Comercial: 10 pedidos en diferentes estados`);
      console.log(`   • Admin: 10 pedidos en diferentes estados`);
      console.log(`   • Taller: 12 pedidos en diferentes estados`);

    } catch (error) {
      console.error('❌ Error creando datos de ejemplo:', error);
    }
  }

  async iniciarServidor() {
    return new Promise((resolve, reject) => {
      const servidor = this.app.listen(this.puerto, (error) => {
        if (error) {
          reject(error);
          return;
        }

        console.log('');
        console.log('🎉 ¡Gestor de Pedidos Artifact-Centric iniciado!');
        console.log('');
        console.log(`📍 Servidor: http://localhost:${this.puerto}`);
        console.log(`🎨 Interfaz Principal: http://localhost:${this.puerto}/app`);
        console.log(`🎯 Demo Explicativo: http://localhost:${this.puerto}/demo`);
        console.log(`📋 Documentación: http://localhost:${this.puerto}/api/docs`);
        console.log(`💚 Health Check: http://localhost:${this.puerto}/health`);
        console.log('');
        console.log('📊 Endpoints principales:');
        console.log(`   • Comercial: http://localhost:${this.puerto}/api/comercial/dashboard`);
        console.log(`   • Admin: http://localhost:${this.puerto}/api/admin/dashboard`);
        console.log(`   • Taller: http://localhost:${this.puerto}/api/taller/dashboard`);
        console.log(`   • Sistema: http://localhost:${this.puerto}/api/sistema/metricas`);
        console.log('');

        if (this.entorno === 'development') {
          console.log('🔧 Modo desarrollo activo');
          console.log('   • CORS habilitado para todos los orígenes');
          console.log('   • Datos de ejemplo creados');
          console.log('   • Logging detallado activado');
          console.log('');
        }

        resolve(servidor);
      });

      // Manejo graceful de cierre
      const cerrarGracefully = (signal) => {
        console.log(`\n🛑 Recibida señal ${signal}. Cerrando servidor...`);

        servidor.close(() => {
          console.log('✅ Servidor cerrado correctamente');

          // Limpiar recursos si es necesario
          this.eventManager.eventHistory = [];
          this.notificationManager.notifications = [];

          console.log('👋 ¡Hasta luego!');
          process.exit(0);
        });
      };

      process.on('SIGTERM', () => cerrarGracefully('SIGTERM'));
      process.on('SIGINT', () => cerrarGracefully('SIGINT'));
    });
  }

  // Métodos para testing
  obtenerEstadisticas() {
    return {
      pedidos: this.pedidoManager.pedidos.size,
      eventos: this.eventManager.eventHistory.length,
      notificaciones: this.notificationManager.notifications.length,
      memoria: process.memoryUsage(),
      uptime: process.uptime()
    };
  }
}

// Inicializar y arrancar el servidor si este archivo se ejecuta directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  const servidor = new GestorPedidosServer();

  servidor.iniciarServidor()
    .catch(error => {
      console.error('❌ Error fatal iniciando el servidor:', error);
      process.exit(1);
    });
}

export default GestorPedidosServer;