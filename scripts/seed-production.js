import { db } from '../src/database/connection.js';
import { PedidoManager } from '../src/services/PedidoManager.js';
import { EventManager } from '../src/events/EventManager.js';

/**
 * Script para crear datos de prueba en producción
 */
async function seedProduction() {
  console.log('🌱 Iniciando seed de datos de producción...');

  try {
    // Conectar a la base de datos
    await db.connect();
    console.log('✅ Conectado a Neon PostgreSQL');

    // Inicializar managers
    const eventManager = new EventManager();
    const pedidoManager = new PedidoManager(eventManager);

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

    console.log('📊 Creando 32 pedidos de ejemplo...');

    // Generar 32 pedidos con diferentes estados
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

      try {
        const pedido = await pedidoManager.crearPedido(datosEjemplo, responsable);
        console.log(`✓ Pedido ${i + 1}/32 creado: ${pedido.id}`);

        // Simular diferentes estados para cada departamento
        await simularEstadosPedido(pedidoManager, pedido, i, responsable);

        // Pausa pequeña para no sobrecargar
        if (i % 5 === 4) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }

      } catch (error) {
        console.error(`❌ Error creando pedido ${i + 1}:`, error.message);
      }
    }

    console.log('✅ Seed de producción completado');
    console.log('   • 32 pedidos creados con diferentes estados');
    console.log('   • Distribuidos entre todos los departamentos');

  } catch (error) {
    console.error('❌ Error en seed de producción:', error);
    process.exit(1);
  } finally {
    await db.close();
    process.exit(0);
  }
}

async function simularEstadosPedido(pedidoManager, pedido, index, responsable) {
  try {
    // 10 pedidos en diferentes estados comerciales
    if (index < 10) {
      if (index < 4) {
        // 4 pedidos confirmados
        await pedidoManager.cambiarEstado(
          pedido.id, 'comercial', 'confirmado', responsable,
          'Cliente confirmó pedido',
          {
            presupuesto: pedido.presupuesto,
            fechaEntregaSolicitada: pedido.fechaEntregaSolicitada
          }
        );
      } else if (index < 6) {
        // 2 pedidos modificados
        await pedidoManager.cambiarEstado(
          pedido.id, 'comercial', 'confirmado', responsable,
          'Cliente confirmó pedido inicialmente',
          {
            presupuesto: pedido.presupuesto,
            fechaEntregaSolicitada: pedido.fechaEntregaSolicitada
          }
        );

        await pedidoManager.cambiarEstado(
          pedido.id, 'comercial', 'modificado', responsable,
          'Cliente solicitó cambios en especificaciones',
          {
            motivoModificacion: 'Cliente solicitó cambios en especificaciones',
            cambiosRealizados: 'Cambio de material, Ajuste de dimensiones'
          }
        );
      } else if (index < 8) {
        // 2 pedidos en espera
        await pedidoManager.cambiarEstado(
          pedido.id, 'comercial', 'confirmado', responsable,
          'Cliente confirmó pedido inicialmente',
          {
            presupuesto: pedido.presupuesto,
            fechaEntregaSolicitada: pedido.fechaEntregaSolicitada
          }
        );

        await pedidoManager.cambiarEstado(
          pedido.id, 'comercial', 'en_espera', responsable,
          'Esperando aprobación del cliente',
          { motivoEspera: 'Aprobación presupuesto' }
        );
      }
    }
    // 10 pedidos en diferentes estados administrativos
    else if (index < 20) {
      // Confirmar comercialmente primero
      await pedidoManager.cambiarEstado(
        pedido.id, 'comercial', 'confirmado', responsable,
        'Pedido confirmado por comercial',
        {
          presupuesto: pedido.presupuesto,
          fechaEntregaSolicitada: pedido.fechaEntregaSolicitada
        }
      );

      const adminIndex = index - 10;
      const adminResponsable = `admin_${(adminIndex % 3) + 1}`;

      if (adminIndex < 3) {
        // 3 pedidos pendientes de documentación
        await pedidoManager.cambiarEstado(
          pedido.id, 'admin', 'pendiente_doc', adminResponsable,
          'Verificación completada, solicitando documentación',
          {
            documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas', 'Planos de fabricación'],
            fechaLimiteDocumentacion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        );
      } else if (adminIndex < 6) {
        // 3 pedidos con documentación completa
        await pedidoManager.cambiarEstado(
          pedido.id, 'admin', 'pendiente_doc', adminResponsable,
          'Documentación solicitada',
          {
            documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas'],
            fechaLimiteDocumentacion: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
          }
        );

        await pedidoManager.cambiarEstado(
          pedido.id, 'admin', 'en_fabricacion', adminResponsable,
          'Documentación aprobada y enviada a fabricación',
          {
            documentosAprobados: ['Contrato firmado', 'Especificaciones técnicas'],
            responsableTaller: `taller_${(adminIndex % 3) + 1}`,
            fechaInicioFabricacion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000)
          }
        );
      } else if (adminIndex < 8) {
        // 2 pedidos cancelados
        await pedidoManager.cambiarEstado(
          pedido.id, 'admin', 'cancelado', adminResponsable,
          'Documentación incompleta o incorrecta',
          {
            motivoCancelacion: 'Especificaciones técnicas insuficientes'
          }
        );
      }
    }
    // 12 pedidos en diferentes estados de taller
    else {
      // Pasar por comercial y admin
      await pedidoManager.cambiarEstado(
        pedido.id, 'comercial', 'confirmado', responsable,
        'Pedido confirmado por comercial',
        {
          presupuesto: pedido.presupuesto,
          fechaEntregaSolicitada: pedido.fechaEntregaSolicitada
        }
      );

      const adminResponsable = `admin_${((index - 20) % 3) + 1}`;
      await pedidoManager.cambiarEstado(
        pedido.id, 'admin', 'pendiente_doc', adminResponsable,
        'Procesando documentación requerida',
        {
          documentosRequeridos: ['Contrato firmado', 'Especificaciones técnicas'],
          fechaLimiteDocumentacion: new Date(Date.now() + 24 * 60 * 60 * 1000)
        }
      );

      await pedidoManager.cambiarEstado(
        pedido.id, 'admin', 'en_fabricacion', adminResponsable,
        'Documentación aprobada y enviada a fabricación',
        {
          fechaInicioFabricacion: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          responsableTaller: `taller_${((index - 20) % 4) + 1}`,
          fechaEntregaEstimada: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
        }
      );

      const tallerIndex = index - 20;
      const tallerResponsable = `taller_${(tallerIndex % 4) + 1}`;

      if (tallerIndex < 4) {
        // 4 pedidos en fabricación
        await pedidoManager.cambiarEstado(
          pedido.id, 'taller', 'en_fabricacion', tallerResponsable,
          'Fabricación iniciada',
          {
            responsableFabricacion: tallerResponsable,
            fechaInicioReal: new Date(),
            maquinasAsignadas: ['Torno CNC', 'Fresadora', 'Soldadora'],
            planFabricacion: 'Producción en 3 fases según especificaciones'
          }
        );
      } else if (tallerIndex < 7) {
        // 3 pedidos entregados
        await pedidoManager.cambiarEstado(
          pedido.id, 'taller', 'en_fabricacion', tallerResponsable,
          'Fabricación iniciada',
          {
            responsableFabricacion: tallerResponsable,
            fechaInicioReal: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
            maquinasAsignadas: ['Torno CNC', 'Fresadora'],
            planFabricacion: 'Producción completada'
          }
        );

        await pedidoManager.cambiarEstado(
          pedido.id, 'taller', 'entregado', tallerResponsable,
          'Fabricación completada y entregada',
          {
            controlCalidad: 'aprobado',
            fechaFinalizacion: new Date(),
            observacionesCalidad: 'Producto conforme a especificaciones'
          }
        );
      } else if (tallerIndex < 9) {
        // 2 pedidos con incidencias
        await pedidoManager.cambiarEstado(
          pedido.id, 'taller', 'incidencia', tallerResponsable,
          'Incidencia detectada durante fabricación',
          {
            problemaDetectado: 'Material defectuoso detectado',
            solucionPropuesta: 'Reemplazo de material y reinicio de proceso',
            tiempoParada: 24
          }
        );
      }
    }
  } catch (error) {
    console.error(`❌ Error simulando estados para pedido ${pedido.id}:`, error.message);
  }
}

// Ejecutar si se llama directamente
if (import.meta.url === `file://${process.argv[1]}`) {
  seedProduction();
}