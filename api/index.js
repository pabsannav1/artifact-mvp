import { GestorPedidosApp } from '../src/app.js';

let app = null;

export default async function handler(req, res) {
  try {
    if (!app) {
      console.log('🔧 Inicializando aplicación para Vercel...');
      app = await GestorPedidosApp.crear();
      console.log('✅ Aplicación inicializada correctamente');
    }

    return app(req, res);
  } catch (error) {
    console.error('❌ Error en handler de Vercel:', error);

    return res.status(500).json({
      success: false,
      error: 'Error interno del servidor',
      mensaje: error.message,
      timestamp: new Date().toISOString()
    });
  }
}