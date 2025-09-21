import { GestorPedidosApp } from '../src/app.js';
import { PedidoManager } from '../src/services/PedidoManager.js';
import { EventManager } from '../src/events/EventManager.js';

export default async function handler(req, res) {
  // Solo permitir POST para ejecutar el seed
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido',
      message: 'Solo se permite POST para ejecutar el seed'
    });
  }

  // Verificar que es entorno de desarrollo o que se proporcione una clave
  const { key } = req.body;
  const expectedKey = process.env.SEED_KEY || 'desarrollo';

  if (key !== expectedKey) {
    return res.status(403).json({
      success: false,
      error: 'No autorizado',
      message: 'Clave de seed incorrecta'
    });
  }

  try {
    console.log('🌱 Iniciando seed desde API...');

    // Inicializar componentes
    const eventManager = new EventManager();
    const pedidoManager = new PedidoManager(eventManager);

    // Datos de ejemplo (versión reducida para producción)
    const empresas = [
      { nombre: 'Construcciones ABC', email: 'contacto@abc.com', telefono: '+34 600 123 456' },
      { nombre: 'Industrias XYZ', email: 'pedidos@xyz.com', telefono: '+34 600 789 012' },
      { nombre: 'Proyectos DEF', email: 'info@def.es', telefono: '+34 600 345 678' },
      { nombre: 'Metalúrgica GHI', email: 'ventas@ghi.com', telefono: '+34 600 456 789' },
      { nombre: 'Ingeniería JKL', email: 'proyectos@jkl.es', telefono: '+34 600 567 890' }
    ];

    const productos = [
      ['Estructura metálica', 'Acabados especiales'],
      ['Componentes mecánicos', 'Piezas de precisión'],
      ['Prototipo', 'Diseño personalizado'],
      ['Maquinaria industrial', 'Sistemas automatizados'],
      ['Herramientas especializadas', 'Equipos de medición']
    ];

    const especificaciones = [
      'Estructura para edificio de 5 plantas con acabados anti-corrosión',
      'Lote de 100 piezas mecanizadas según planos adjuntos',
      'Prototipo de maquinaria industrial según especificaciones técnicas',
      'Sistema automatizado para línea de producción con sensores IoT',
      'Herramientas de precisión para sector aeronáutico con certificación'
    ];

    const prioridades = ['baja', 'normal', 'alta', 'urgente'];
    const pedidosCreados = [];

    // Crear 15 pedidos de ejemplo
    for (let i = 0; i < 15; i++) {
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

      const responsable = `comercial_${(i % 3) + 1}`;

      try {
        const pedido = await pedidoManager.crearPedido(datosEjemplo, responsable);
        pedidosCreados.push(pedido.id);

        // Simular algunos estados para variedad
        if (i < 5) {
          await pedidoManager.cambiarEstado(
            pedido.id, 'comercial', 'confirmado', responsable,
            'Cliente confirmó pedido',
            {
              presupuesto: datosEjemplo.presupuesto,
              fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
            }
          );
        }

        if (i >= 5 && i < 10) {
          await pedidoManager.cambiarEstado(
            pedido.id, 'comercial', 'confirmado', responsable,
            'Pedido confirmado por comercial',
            {
              presupuesto: datosEjemplo.presupuesto,
              fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
            }
          );

          await pedidoManager.cambiarEstado(
            pedido.id, 'admin', 'pendiente_doc', `admin_${(i % 2) + 1}`,
            'Verificación completada, solicitando documentación',
            {
              documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas'],
              fechaLimiteDocumentacion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          );
        }

        if (i >= 10) {
          await pedidoManager.cambiarEstado(
            pedido.id, 'comercial', 'confirmado', responsable,
            'Pedido confirmado por comercial',
            {
              presupuesto: datosEjemplo.presupuesto,
              fechaEntregaSolicitada: datosEjemplo.fechaEntregaSolicitada
            }
          );

          await pedidoManager.cambiarEstado(
            pedido.id, 'admin', 'pendiente_doc', `admin_${(i % 2) + 1}`,
            'Procesando documentación requerida',
            {
              documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas'],
              fechaLimiteDocumentacion: new Date(Date.now() + 24 * 60 * 60 * 1000)
            }
          );

          await pedidoManager.cambiarEstado(
            pedido.id, 'admin', 'en_fabricacion', `admin_${(i % 2) + 1}`,
            'Documentación aprobada y enviada a fabricación',
            {
              fechaInicioFabricacion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              responsableTaller: `taller_${(i % 2) + 1}`,
              fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
            }
          );

          await pedidoManager.cambiarEstado(
            pedido.id, 'taller', 'en_fabricacion', `taller_${(i % 2) + 1}`,
            'Fabricación iniciada',
            {
              responsableFabricacion: `taller_${(i % 2) + 1}`,
              fechaInicioReal: new Date(),
              maquinasAsignadas: ['Torno CNC', 'Fresadora'],
              planFabricacion: 'Producción según especificaciones'
            }
          );
        }

      } catch (error) {
        console.error(`Error creando pedido ${i + 1}:`, error.message);
      }
    }

    res.json({
      success: true,
      message: 'Seed completado exitosamente',
      pedidosCreados: pedidosCreados.length,
      pedidos: pedidosCreados,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('❌ Error en seed:', error);
    res.status(500).json({
      success: false,
      error: 'Error ejecutando seed',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
}