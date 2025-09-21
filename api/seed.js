import { PedidoManager } from '../src/services/PedidoManager.js';
import { EventManager } from '../src/events/EventManager.js';

export default async function handler(req, res) {
  // Solo permitir POST
  if (req.method !== 'POST') {
    return res.status(405).json({
      success: false,
      error: 'Método no permitido'
    });
  }

  try {
    // Verificar clave (opcional)
    const { key } = req.body;
    if (key !== 'desarrollo') {
      return res.status(403).json({
        success: false,
        error: 'Clave incorrecta'
      });
    }

    console.log('🌱 Iniciando seed...');

    // Inicializar componentes
    const eventManager = new EventManager();
    const pedidoManager = new PedidoManager(eventManager);

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
      message: 'Seed completado',
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
}