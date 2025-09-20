/**
 * Controlador para el departamento comercial
 * Maneja todas las operaciones específicas del ciclo de vida comercial
 */
export class ComercialController {
  constructor(pedidoManager) {
    this.pedidoManager = pedidoManager;
  }

  /**
   * Obtiene todos los pedidos desde la perspectiva comercial
   */
  async obtenerPedidos(req, res) {
    try {
      const { estado } = req.query;
      const pedidos = this.pedidoManager.obtenerPedidosPorDepartamento('comercial', estado);

      res.json({
        success: true,
        data: pedidos,
        meta: {
          total: pedidos.length,
          departamento: 'comercial',
          estadoFiltro: estado || 'todos'
        }
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene un pedido específico con vista completa (todos los departamentos)
   */
  async obtenerPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      const pedido = this.pedidoManager.obtenerPedido(pedidoId);

      // Obtener vista completa con información de todos los departamentos
      const vistaCompleta = {
        ...pedido.obtenerDatosCompletos(),
        vistas: {
          comercial: this.pedidoManager.obtenerVistaPedido(pedidoId, 'comercial'),
          admin: this.pedidoManager.obtenerVistaPedido(pedidoId, 'admin'),
          taller: this.pedidoManager.obtenerVistaPedido(pedidoId, 'taller')
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
  }

  /**
   * Crea una nueva propuesta de pedido
   */
  async crearPropuesta(req, res) {
    try {
      const { responsable } = req.body;
      const datosIniciales = {
        cliente: req.body.cliente,
        productos: req.body.productos,
        especificaciones: req.body.especificaciones,
        observaciones: req.body.observaciones
      };

      const pedido = await this.pedidoManager.crearPedido(datosIniciales, responsable);

      res.status(201).json({
        success: true,
        data: pedido.obtenerVistaDepartamento('comercial'),
        message: 'Propuesta creada exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Confirma un pedido propuesto
   */
  async confirmarPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      const { responsable, presupuesto, fechaEntregaSolicitada, prioridad } = req.body;

      const pedido = await this.pedidoManager.cambiarEstado(
        pedidoId,
        'comercial',
        'confirmado',
        responsable,
        'Pedido confirmado por cliente',
        {
          presupuesto: presupuesto,
          fechaEntregaSolicitada: fechaEntregaSolicitada,
          prioridad: prioridad
        }
      );

      res.json({
        success: true,
        data: pedido.obtenerVistaDepartamento('comercial'),
        message: 'Pedido confirmado exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Registra modificaciones en un pedido
   */
  async modificarPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      const { responsable, motivoModificacion, cambiosRealizados, tipoModificacion, cambios } = req.body;

      // Si es una modificación parcial, usar el método específico
      if (tipoModificacion && cambios) {
        const resultado = await this.pedidoManager.procesarModificacionParcial(
          pedidoId,
          tipoModificacion,
          cambios,
          responsable
        );

        res.json({
          success: true,
          data: resultado.pedido.obtenerVistaDepartamento('comercial'),
          departamentosAfectados: resultado.departamentosAfectados,
          message: 'Modificación parcial procesada exitosamente'
        });
      } else {
        // Modificación completa
        const pedido = await this.pedidoManager.cambiarEstado(
          pedidoId,
          'comercial',
          'modificado',
          responsable,
          'Pedido modificado',
          {
            motivoModificacion: motivoModificacion,
            cambiosRealizados: cambiosRealizados
          }
        );

        res.json({
          success: true,
          data: pedido.obtenerVistaDepartamento('comercial'),
          message: 'Pedido modificado exitosamente'
        });
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Pone un pedido en estado de espera
   */
  async ponerEnEspera(req, res) {
    try {
      const { pedidoId } = req.params;
      const { responsable, motivoEspera, fechaRevision } = req.body;

      const pedido = await this.pedidoManager.cambiarEstado(
        pedidoId,
        'comercial',
        'en_espera',
        responsable,
        'Pedido puesto en espera',
        {
          motivoEspera: motivoEspera,
          fechaRevision: fechaRevision
        }
      );

      res.json({
        success: true,
        data: pedido.obtenerVistaDepartamento('comercial'),
        message: 'Pedido puesto en espera'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Cancela un pedido
   */
  async cancelarPedido(req, res) {
    try {
      const { pedidoId } = req.params;
      const { responsable, motivoCancelacion } = req.body;

      const pedido = await this.pedidoManager.cambiarEstado(
        pedidoId,
        'comercial',
        'cancelado',
        responsable,
        'Pedido cancelado',
        {
          motivoCancelacion: motivoCancelacion
        }
      );

      res.json({
        success: true,
        data: pedido.obtenerVistaDepartamento('comercial'),
        message: 'Pedido cancelado exitosamente'
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene el formulario para un estado específico
   */
  async obtenerFormulario(req, res) {
    try {
      const { estado } = req.params;
      const maquinaEstados = this.pedidoManager.maquinasEstado.comercial;
      const formulario = maquinaEstados.obtenerFormularioParaEstado(estado);

      res.json({
        success: true,
        data: formulario
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Obtiene las transiciones disponibles desde un estado
   */
  async obtenerTransiciones(req, res) {
    try {
      const { estado } = req.params;
      const maquinaEstados = this.pedidoManager.maquinasEstado.comercial;
      const transiciones = maquinaEstados.obtenerTransicionesDisponibles(estado);

      res.json({
        success: true,
        data: {
          estadoActual: estado,
          transicionesDisponibles: transiciones
        }
      });
    } catch (error) {
      res.status(400).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Dashboard específico para comercial
   */
  async obtenerDashboard(req, res) {
    try {
      const pedidos = this.pedidoManager.obtenerPedidosPorDepartamento('comercial');

      const dashboard = {
        resumen: {
          total: pedidos.length,
          propuestos: pedidos.filter(p => p.estadoActual.estado === 'propuesto').length,
          confirmados: pedidos.filter(p => p.estadoActual.estado === 'confirmado').length,
          enEspera: pedidos.filter(p => p.estadoActual.estado === 'en_espera').length,
          modificados: pedidos.filter(p => p.estadoActual.estado === 'modificado').length,
          cancelados: pedidos.filter(p => p.estadoActual.estado === 'cancelado').length
        },
        pedidosRecientes: pedidos
          .sort((a, b) => new Date(b.fechaActualizacion) - new Date(a.fechaActualizacion))
          .slice(0, 10),
        alertas: this.generarAlertasComerciales(pedidos)
      };

      res.json({
        success: true,
        data: dashboard
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Genera alertas específicas para el departamento comercial
   */
  generarAlertasComerciales(pedidos) {
    const alertas = [];

    // Pedidos en espera por mucho tiempo
    const pedidosEnEspera = pedidos.filter(p => p.estadoActual.estado === 'en_espera');
    const fechaLimite = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 días

    pedidosEnEspera.forEach(pedido => {
      if (new Date(pedido.estadoActual.fechaCambio) < fechaLimite) {
        alertas.push({
          tipo: 'warning',
          pedidoId: pedido.id,
          mensaje: `Pedido ${pedido.id} lleva más de 7 días en espera`,
          fechaRevision: pedido.estadoActual.datos.fechaRevision
        });
      }
    });

    // Modificaciones pendientes
    const pedidosModificados = pedidos.filter(p => p.estadoActual.estado === 'modificado');
    pedidosModificados.forEach(pedido => {
      alertas.push({
        tipo: 'info',
        pedidoId: pedido.id,
        mensaje: `Pedido ${pedido.id} requiere revisión de modificaciones`
      });
    });

    return alertas;
  }
}