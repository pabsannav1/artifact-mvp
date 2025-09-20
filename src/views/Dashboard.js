/**
 * Generador de dashboards específicos por departamento
 * Cada departamento ve métricas y datos relevantes para su contexto
 */
export class DashboardGenerator {
  constructor() {
    this.componentesComunes = new ComponentesComunes();
  }

  /**
   * Genera dashboard para el departamento comercial
   */
  generarDashboardComercial(dataDashboard) {
    const { resumen, pedidosRecientes, alertas } = dataDashboard;

    return `
      <div class="dashboard comercial-dashboard">
        <div class="dashboard-header">
          <h2>Dashboard Comercial</h2>
          <div class="fecha-actualizacion">
            Última actualización: ${new Date().toLocaleString()}
          </div>
        </div>

        <div class="metricas-resumen">
          ${this.generarTarjetasResumen([
            { titulo: 'Total Pedidos', valor: resumen.total, color: 'azul', icono: '📋' },
            { titulo: 'Propuestos', valor: resumen.propuestos, color: 'amarillo', icono: '📝' },
            { titulo: 'Confirmados', valor: resumen.confirmados, color: 'verde', icono: '✅' },
            { titulo: 'En Espera', valor: resumen.enEspera, color: 'naranja', icono: '⏳' },
            { titulo: 'Modificados', valor: resumen.modificados, color: 'morado', icono: '🔄' },
            { titulo: 'Cancelados', valor: resumen.cancelados, color: 'rojo', icono: '❌' }
          ])}
        </div>

        <div class="dashboard-content">
          <div class="columna-principal">
            ${this.generarGraficoEstados(resumen, 'comercial')}
            ${this.generarTablaPedidosRecientes(pedidosRecientes, 'comercial')}
          </div>

          <div class="columna-lateral">
            ${this.generarPanelAlertas(alertas)}
            ${this.generarAccionesRapidas('comercial')}
            ${this.generarMetricasComerciales(resumen)}
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Genera dashboard para el departamento de administración
   */
  generarDashboardAdmin(dataDashboard) {
    const { resumen, facturacion, pendientesCobro, alertas } = dataDashboard;

    return `
      <div class="dashboard admin-dashboard">
        <div class="dashboard-header">
          <h2>Dashboard Administración</h2>
          <div class="controles-periodo">
            <select id="periodo-admin" onchange="actualizarPeriodo('admin', this.value)">
              <option value="30">Últimos 30 días</option>
              <option value="90">Últimos 3 meses</option>
              <option value="365">Último año</option>
            </select>
          </div>
        </div>

        <div class="metricas-resumen">
          ${this.generarTarjetasResumen([
            { titulo: 'Total Pedidos', valor: resumen.total, color: 'azul', icono: '📋' },
            { titulo: 'En Fabricación', valor: resumen.enFabricacion, color: 'naranja', icono: '🏭' },
            { titulo: 'Entregados', valor: resumen.entregados, color: 'verde', icono: '📦' },
            { titulo: 'Facturados', valor: resumen.facturados, color: 'morado', icono: '💰' },
            { titulo: 'Cobrados', valor: resumen.cobrados, color: 'verde-oscuro', icono: '✅' },
            { titulo: 'Incidencias', valor: resumen.incidencias, color: 'rojo', icono: '⚠️' }
          ])}
        </div>

        <div class="dashboard-content">
          <div class="fila-superior">
            ${this.generarPanelFacturacion(facturacion)}
            ${this.generarGraficoEstados(resumen, 'admin')}
          </div>

          <div class="fila-inferior">
            <div class="columna-principal">
              ${this.generarTablaPendientesCobro(pendientesCobro)}
              ${this.generarAnalisisFinanciero(facturacion)}
            </div>

            <div class="columna-lateral">
              ${this.generarPanelAlertas(alertas)}
              ${this.generarAccionesRapidas('admin')}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Genera dashboard para el departamento de taller
   */
  generarDashboardTaller(dataDashboard) {
    const { resumen, cargaTrabajo, eficiencia, alertas, metricas } = dataDashboard;

    return `
      <div class="dashboard taller-dashboard">
        <div class="dashboard-header">
          <h2>Dashboard Taller</h2>
          <div class="indicadores-tiempo-real">
            <div class="indicador capacidad ${this.obtenerColorCapacidad(cargaTrabajo.capacidadEstimada)}">
              Capacidad: ${cargaTrabajo.capacidadEstimada}/10
            </div>
            <div class="indicador calidad">
              Calidad: ${eficiencia.porcentajeCalidad.toFixed(1)}%
            </div>
          </div>
        </div>

        <div class="metricas-resumen">
          ${this.generarTarjetasResumen([
            { titulo: 'Total Pedidos', valor: resumen.total, color: 'azul', icono: '📋' },
            { titulo: 'Pendientes', valor: resumen.pendienteDoc, color: 'gris', icono: '📄' },
            { titulo: 'En Fabricación', valor: resumen.enFabricacion, color: 'naranja', icono: '🔧' },
            { titulo: 'Entregados', valor: resumen.entregados, color: 'verde', icono: '✅' },
            { titulo: 'Modificados', valor: resumen.modificados, color: 'morado', icono: '🔄' },
            { titulo: 'Incidencias', valor: resumen.incidencias, color: 'rojo', icono: '⚠️' }
          ])}
        </div>

        <div class="dashboard-content">
          <div class="fila-superior">
            ${this.generarPanelCargaTrabajo(cargaTrabajo)}
            ${this.generarPanelEficiencia(eficiencia)}
            ${this.generarPanelProductividad(metricas.productividad)}
          </div>

          <div class="fila-inferior">
            <div class="columna-principal">
              ${this.generarGraficoEstados(resumen, 'taller')}
              ${this.generarAnalisisCalidad(metricas.calidad)}
            </div>

            <div class="columna-lateral">
              ${this.generarPanelAlertas(alertas)}
              ${this.generarAccionesRapidas('taller')}
              ${this.generarMetricasTiempo(metricas.tiempos)}
            </div>
          </div>
        </div>
      </div>
    `;
  }

  /**
   * Genera tarjetas de resumen de métricas
   */
  generarTarjetasResumen(metricas) {
    return metricas.map(metrica => `
      <div class="tarjeta-metrica color-${metrica.color}">
        <div class="metrica-icono">${metrica.icono}</div>
        <div class="metrica-contenido">
          <div class="metrica-valor">${metrica.valor}</div>
          <div class="metrica-titulo">${metrica.titulo}</div>
        </div>
      </div>
    `).join('');
  }

  /**
   * Genera gráfico de distribución de estados
   */
  generarGraficoEstados(resumen, departamento) {
    const estados = Object.entries(resumen).filter(([key, value]) => key !== 'total');

    return `
      <div class="panel grafico-estados">
        <h3>Distribución de Estados</h3>
        <div class="grafico-container">
          <canvas id="grafico-estados-${departamento}" width="400" height="300"></canvas>
        </div>
        <div class="leyenda-estados">
          ${estados.map(([estado, cantidad]) => `
            <div class="leyenda-item">
              <span class="color-indicator estado-${estado}"></span>
              <span class="estado-nombre">${this.formatearEstado(estado)}</span>
              <span class="estado-cantidad">${cantidad}</span>
            </div>
          `).join('')}
        </div>
        <script>
          generarGraficoDonut('grafico-estados-${departamento}', ${JSON.stringify(estados)});
        </script>
      </div>
    `;
  }

  /**
   * Genera tabla de pedidos recientes
   */
  generarTablaPedidosRecientes(pedidos, departamento) {
    return `
      <div class="panel tabla-pedidos">
        <h3>Pedidos Recientes</h3>
        <div class="tabla-responsive">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Estado</th>
                <th>Fecha</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${pedidos.slice(0, 10).map(pedido => `
                <tr>
                  <td><a href="/pedido/${pedido.id}" class="link-pedido">${pedido.id.slice(0, 8)}</a></td>
                  <td>${pedido.cliente.nombre}</td>
                  <td><span class="estado-badge estado-${pedido.estadoActual.estado}">${this.formatearEstado(pedido.estadoActual.estado)}</span></td>
                  <td>${new Date(pedido.fechaActualizacion).toLocaleDateString()}</td>
                  <td>
                    <button class="btn btn-sm btn-primary" onclick="abrirPedido('${pedido.id}')">Ver</button>
                    ${this.generarBotonesAccion(pedido, departamento)}
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Genera panel de alertas
   */
  generarPanelAlertas(alertas) {
    if (!alertas || alertas.length === 0) {
      return `
        <div class="panel alertas-panel">
          <h3>Alertas</h3>
          <div class="sin-alertas">
            <div class="icono-ok">✅</div>
            <p>No hay alertas activas</p>
          </div>
        </div>
      `;
    }

    return `
      <div class="panel alertas-panel">
        <h3>Alertas <span class="contador-alertas">${alertas.length}</span></h3>
        <div class="lista-alertas">
          ${alertas.map(alerta => `
            <div class="alerta alerta-${alerta.tipo}">
              <div class="alerta-icono">${this.obtenerIconoAlerta(alerta.tipo)}</div>
              <div class="alerta-contenido">
                <div class="alerta-mensaje">${alerta.mensaje}</div>
                <div class="alerta-pedido">
                  <a href="/pedido/${alerta.pedidoId}">Ver pedido</a>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Genera acciones rápidas por departamento
   */
  generarAccionesRapidas(departamento) {
    const acciones = {
      comercial: [
        { titulo: 'Nueva Propuesta', accion: 'nuevaPropuesta()', icono: '➕', color: 'verde' },
        { titulo: 'Revisar En Espera', accion: 'revisarEnEspera()', icono: '⏳', color: 'naranja' },
        { titulo: 'Generar Reporte', accion: 'generarReporte("comercial")', icono: '📊', color: 'azul' }
      ],
      admin: [
        { titulo: 'Procesar Documentación', accion: 'procesarDocumentacion()', icono: '📄', color: 'azul' },
        { titulo: 'Crear Facturas', accion: 'crearFacturas()', icono: '💰', color: 'verde' },
        { titulo: 'Revisar Cobros', accion: 'revisarCobros()', icono: '💳', color: 'morado' },
        { titulo: 'Métricas Financieras', accion: 'verMetricasFinancieras()', icono: '📈', color: 'azul' }
      ],
      taller: [
        { titulo: 'Iniciar Fabricación', accion: 'iniciarFabricacion()', icono: '🔧', color: 'naranja' },
        { titulo: 'Control Calidad', accion: 'controlCalidad()', icono: '🔍', color: 'azul' },
        { titulo: 'Reportar Incidencia', accion: 'reportarIncidencia()', icono: '⚠️', color: 'rojo' },
        { titulo: 'Ver Productividad', accion: 'verProductividad()', icono: '📊', color: 'verde' }
      ]
    };

    return `
      <div class="panel acciones-rapidas">
        <h3>Acciones Rápidas</h3>
        <div class="grid-acciones">
          ${acciones[departamento].map(accion => `
            <button class="accion-rapida color-${accion.color}" onclick="${accion.accion}">
              <div class="accion-icono">${accion.icono}</div>
              <div class="accion-titulo">${accion.titulo}</div>
            </button>
          `).join('')}
        </div>
      </div>
    `;
  }

  /**
   * Genera panel de facturación (específico admin)
   */
  generarPanelFacturacion(facturacion) {
    return `
      <div class="panel panel-facturacion">
        <h3>Resumen Financiero</h3>
        <div class="metricas-financieras">
          <div class="metrica-financiera">
            <div class="metrica-valor">${this.formatearMoneda(facturacion.totalFacturado)}</div>
            <div class="metrica-label">Total Facturado</div>
          </div>
          <div class="metrica-financiera">
            <div class="metrica-valor">${this.formatearMoneda(facturacion.totalCobrado)}</div>
            <div class="metrica-label">Total Cobrado</div>
          </div>
          <div class="metrica-financiera">
            <div class="metrica-valor">${facturacion.pendienteCobro}</div>
            <div class="metrica-label">Pend. Cobro</div>
          </div>
        </div>
        <div class="indicador-eficiencia">
          <div class="barra-progreso">
            <div class="progreso" style="width: ${this.calcularPorcentajeCobro(facturacion)}%"></div>
          </div>
          <div class="progreso-label">Eficiencia de Cobro: ${this.calcularPorcentajeCobro(facturacion).toFixed(1)}%</div>
        </div>
      </div>
    `;
  }

  /**
   * Genera tabla de pendientes de cobro
   */
  generarTablaPendientesCobro(pendientes) {
    return `
      <div class="panel tabla-pendientes-cobro">
        <h3>Pendientes de Cobro</h3>
        <div class="tabla-responsive">
          <table class="tabla-datos">
            <thead>
              <tr>
                <th>Cliente</th>
                <th>Importe</th>
                <th>Días Pend.</th>
                <th>Fecha Factura</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${pendientes.slice(0, 10).map(pendiente => `
                <tr class="${pendiente.diasPendiente > 30 ? 'fila-urgente' : ''}">
                  <td>${pendiente.cliente}</td>
                  <td>${this.formatearMoneda(pendiente.importe)}</td>
                  <td>
                    <span class="dias-pendiente ${this.obtenerClaseDias(pendiente.diasPendiente)}">
                      ${pendiente.diasPendiente}
                    </span>
                  </td>
                  <td>${new Date(pendiente.fechaFactura).toLocaleDateString()}</td>
                  <td>
                    <button class="btn btn-sm btn-primary" onclick="gestionarCobro('${pendiente.id}')">
                      Gestionar
                    </button>
                  </td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  /**
   * Genera panel de carga de trabajo (específico taller)
   */
  generarPanelCargaTrabajo(cargaTrabajo) {
    const porcentajeCapacidad = ((10 - cargaTrabajo.capacidadEstimada) / 10) * 100;

    return `
      <div class="panel panel-carga-trabajo">
        <h3>Carga de Trabajo</h3>
        <div class="metricas-trabajo">
          <div class="metrica-trabajo">
            <div class="valor-grande">${cargaTrabajo.activos}</div>
            <div class="label">Activos</div>
          </div>
          <div class="metrica-trabajo">
            <div class="valor-grande">${cargaTrabajo.pendientes}</div>
            <div class="label">Pendientes</div>
          </div>
        </div>
        <div class="capacidad-visual">
          <div class="titulo-capacidad">Capacidad Utilizada</div>
          <div class="barra-capacidad">
            <div class="capacidad-usada" style="width: ${porcentajeCapacidad}%"></div>
          </div>
          <div class="capacidad-texto">${porcentajeCapacidad.toFixed(0)}% de capacidad utilizada</div>
        </div>
        <div class="tiempo-promedio">
          <strong>Tiempo Promedio:</strong> ${cargaTrabajo.tiempoPromedioFabricacion.toFixed(1)} días
        </div>
      </div>
    `;
  }

  /**
   * Genera panel de eficiencia (específico taller)
   */
  generarPanelEficiencia(eficiencia) {
    return `
      <div class="panel panel-eficiencia">
        <h3>Eficiencia</h3>
        <div class="metricas-eficiencia">
          <div class="metrica-circular">
            <div class="circulo-progreso" data-porcentaje="${eficiencia.porcentajeCalidad}">
              <div class="porcentaje">${eficiencia.porcentajeCalidad.toFixed(1)}%</div>
              <div class="label">Calidad</div>
            </div>
          </div>
          <div class="metrica-circular">
            <div class="circulo-progreso" data-porcentaje="${eficiencia.puntualidad}">
              <div class="porcentaje">${eficiencia.puntualidad.toFixed(1)}%</div>
              <div class="label">Puntualidad</div>
            </div>
          </div>
        </div>
        <div class="detalles-eficiencia">
          <div><strong>Completados:</strong> ${eficiencia.pedidosCompletados}</div>
          <div><strong>Tiempo Prom. Entrega:</strong> ${eficiencia.tiempoPromedioEntrega.toFixed(1)} días</div>
        </div>
      </div>
    `;
  }

  // Métodos auxiliares

  formatearEstado(estado) {
    return estado
      .split('_')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  formatearMoneda(cantidad) {
    return new Intl.NumberFormat('es-ES', {
      style: 'currency',
      currency: 'EUR'
    }).format(cantidad);
  }

  obtenerIconoAlerta(tipo) {
    const iconos = {
      error: '🚨',
      warning: '⚠️',
      info: 'ℹ️'
    };
    return iconos[tipo] || 'ℹ️';
  }

  obtenerColorCapacidad(capacidad) {
    if (capacidad >= 7) return 'verde';
    if (capacidad >= 4) return 'amarillo';
    return 'rojo';
  }

  obtenerClaseDias(dias) {
    if (dias > 60) return 'muy-urgente';
    if (dias > 30) return 'urgente';
    if (dias > 15) return 'atencion';
    return 'normal';
  }

  calcularPorcentajeCobro(facturacion) {
    if (facturacion.totalFacturado === 0) return 100;
    return (facturacion.totalCobrado / facturacion.totalFacturado) * 100;
  }

  generarBotonesAccion(pedido, departamento) {
    const transiciones = pedido.transicionesDisponibles || [];

    return transiciones.slice(0, 2).map(transicion => `
      <button class="btn btn-xs btn-outline" onclick="cambiarEstado('${pedido.id}', '${transicion}')">
        ${this.formatearEstado(transicion)}
      </button>
    `).join(' ');
  }
}

/**
 * Componentes comunes para los dashboards
 */
class ComponentesComunes {
  generarFiltros(departamento) {
    return `
      <div class="filtros-dashboard">
        <select id="filtro-estado-${departamento}" onchange="filtrarPorEstado('${departamento}', this.value)">
          <option value="">Todos los estados</option>
          <!-- Opciones dinámicas según departamento -->
        </select>

        <select id="filtro-responsable-${departamento}" onchange="filtrarPorResponsable('${departamento}', this.value)">
          <option value="">Todos los responsables</option>
          <!-- Opciones dinámicas -->
        </select>

        <input type="date" id="filtro-fecha-${departamento}" onchange="filtrarPorFecha('${departamento}', this.value)">
      </div>
    `;
  }

  generarPanelExportacion(departamento) {
    return `
      <div class="panel panel-exportacion">
        <h4>Exportar Datos</h4>
        <div class="botones-exportar">
          <button class="btn btn-sm" onclick="exportarCSV('${departamento}')">CSV</button>
          <button class="btn btn-sm" onclick="exportarPDF('${departamento}')">PDF</button>
          <button class="btn btn-sm" onclick="exportarExcel('${departamento}')">Excel</button>
        </div>
      </div>
    `;
  }
}

/**
 * JavaScript para interactividad de los dashboards
 */
export const DashboardInteractivo = {

  inicializar() {
    this.configurarActualizacionAutomatica();
    this.configurarFiltros();
    this.configurarGraficos();
  },

  configurarActualizacionAutomatica() {
    // Actualizar dashboard cada 5 minutos
    setInterval(() => {
      this.actualizarDashboard();
    }, 5 * 60 * 1000);
  },

  async actualizarDashboard() {
    const departamento = document.body.dataset.departamento;
    if (!departamento) return;

    try {
      const response = await fetch(`/api/${departamento}/dashboard`);
      const data = await response.json();

      if (data.success) {
        // Actualizar solo las métricas numéricas sin recargar toda la página
        this.actualizarMetricas(data.data);
      }
    } catch (error) {
      console.error('Error actualizando dashboard:', error);
    }
  },

  actualizarMetricas(data) {
    // Actualizar tarjetas de métricas
    const tarjetas = document.querySelectorAll('.tarjeta-metrica');
    tarjetas.forEach(tarjeta => {
      const valor = tarjeta.querySelector('.metrica-valor');
      const titulo = tarjeta.querySelector('.metrica-titulo').textContent.toLowerCase();

      if (data.resumen && data.resumen[titulo]) {
        valor.textContent = data.resumen[titulo];
      }
    });

    // Actualizar timestamp
    const timestamp = document.querySelector('.fecha-actualizacion');
    if (timestamp) {
      timestamp.textContent = `Última actualización: ${new Date().toLocaleString()}`;
    }
  },

  configurarFiltros() {
    document.querySelectorAll('[id^="filtro-"]').forEach(filtro => {
      filtro.addEventListener('change', () => {
        this.aplicarFiltros();
      });
    });
  },

  aplicarFiltros() {
    // Implementar lógica de filtrado
    console.log('Aplicando filtros...');
  },

  configurarGraficos() {
    // Configurar gráficos Chart.js si están disponibles
    if (typeof Chart !== 'undefined') {
      this.inicializarGraficos();
    }
  },

  inicializarGraficos() {
    document.querySelectorAll('[id^="grafico-"]').forEach(canvas => {
      // Configurar gráficos específicos
    });
  }
};

// Funciones globales para interactividad
window.abrirPedido = (pedidoId) => {
  window.location.href = `/pedido/${pedidoId}`;
};

window.cambiarEstado = async (pedidoId, nuevoEstado) => {
  // Implementar cambio de estado
  console.log(`Cambiar pedido ${pedidoId} a estado ${nuevoEstado}`);
};

window.generarReporte = (departamento) => {
  window.open(`/api/${departamento}/reportes`, '_blank');
};

window.exportarCSV = async (departamento) => {
  const response = await fetch(`/api/${departamento}/export/csv`);
  const blob = await response.blob();

  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${departamento}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};