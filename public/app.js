/**
 * Aplicación principal del Gestor de Pedidos Artifact-Centric
 * Maneja la interfaz de usuario y la comunicación con el API
 */

// Estado global de la aplicación
const app = {
  currentDepartment: 'comercial',
  currentPedido: null,
  dashboardData: {},
  notifications: [],
  charts: {}
};

// API base URL
const API_BASE = window.location.origin + '/api';

/**
 * Inicialización de la aplicación
 */
document.addEventListener('DOMContentLoaded', function() {
  console.log('🚀 Iniciando interfaz Artifact-Centric...');

  initializeNavigation();
  initializeNotifications();
  loadDashboard(app.currentDepartment);

  // Actualizar datos cada 30 segundos
  setInterval(() => {
    if (document.visibilityState === 'visible') {
      loadDashboard(app.currentDepartment);
      updateNotifications();
    }
  }, 30000);

  console.log('✅ Interfaz inicializada');
});

/**
 * Navegación entre departamentos
 */
function initializeNavigation() {
  const navButtons = document.querySelectorAll('.nav-btn');

  navButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const department = btn.dataset.department;
      switchDepartment(department);
    });
  });
}

function switchDepartment(department) {
  // Actualizar botones de navegación
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.classList.remove('active');
  });
  document.querySelector(`[data-department="${department}"]`).classList.add('active');

  // Actualizar vistas
  document.querySelectorAll('.department-view').forEach(view => {
    view.classList.remove('active');
  });
  document.getElementById(`view-${department}`).classList.add('active');

  app.currentDepartment = department;
  loadDashboard(department);
}

/**
 * Carga de datos del dashboard
 */
async function loadDashboard(department) {
  try {
    showLoading(department);

    const response = await fetch(`${API_BASE}/${department}/dashboard`);
    const data = await response.json();

    if (data.success) {
      app.dashboardData[department] = data.data;
      renderDashboard(department, data.data);
    } else {
      showError(`Error cargando dashboard: ${data.error}`);
    }
  } catch (error) {
    console.error('Error loading dashboard:', error);
    showError('Error de conexión con el servidor');
  }
}

function renderDashboard(department, data) {
  switch (department) {
    case 'comercial':
      renderComercialDashboard(data);
      break;
    case 'admin':
      renderAdminDashboard(data);
      break;
    case 'taller':
      renderTallerDashboard(data);
      break;
  }
}

/**
 * Dashboard Comercial
 */
function renderComercialDashboard(data) {
  const { resumen, pedidosRecientes, alertas } = data;

  // Métricas
  const metricsHtml = `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Total Pedidos</span>
        <div class="metric-icon primary">
          <i class="fas fa-clipboard-list"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.total}</div>
      <div class="metric-label">Pedidos activos</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Propuestos</span>
        <div class="metric-icon warning">
          <i class="fas fa-hourglass-half"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.propuestos}</div>
      <div class="metric-label">Esperando confirmación</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Confirmados</span>
        <div class="metric-icon success">
          <i class="fas fa-check-circle"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.confirmados}</div>
      <div class="metric-label">Listos para proceso</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">En Espera</span>
        <div class="metric-icon error">
          <i class="fas fa-pause-circle"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.enEspera}</div>
      <div class="metric-label">Requieren atención</div>
    </div>
  `;

  document.getElementById('comercial-metrics').innerHTML = metricsHtml;

  // Tabla de pedidos
  const tableHtml = pedidosRecientes.map(pedido => `
    <tr onclick="verPedido('${pedido.id}')">
      <td>
        <span class="font-medium">${pedido.id.slice(0, 8)}...</span>
      </td>
      <td>
        <div>
          <div class="font-medium">${pedido.cliente.nombre}</div>
          <div class="text-sm text-secondary">${pedido.cliente.email}</div>
        </div>
      </td>
      <td>
        <span class="status-badge ${pedido.estadoActual.estado}">
          ${formatearEstado(pedido.estadoActual.estado)}
        </span>
      </td>
      <td>
        ${new Date(pedido.fechaActualizacion).toLocaleDateString()}
      </td>
      <td>
        <span class="font-medium">${formatearMoneda(pedido.presupuesto.total)}</span>
      </td>
      <td>
        ${generarBotonesAccion(pedido, 'comercial')}
      </td>
    </tr>
  `).join('');

  document.getElementById('comercial-table-body').innerHTML = tableHtml;

  // Alertas
  renderAlertas('comercial-alerts', alertas);

  // Gráfico
  renderChart('comercial-chart', 'doughnut', {
    labels: ['Propuestos', 'Confirmados', 'En Espera', 'Modificados', 'Cancelados'],
    datasets: [{
      data: [resumen.propuestos, resumen.confirmados, resumen.enEspera, resumen.modificados, resumen.cancelados],
      backgroundColor: ['#f59e0b', '#10b981', '#ef4444', '#8b5cf6', '#6b7280']
    }]
  });
}

/**
 * Dashboard Admin
 */
function renderAdminDashboard(data) {
  const { resumen, facturacion, pendientesCobro, alertas } = data;

  // Métricas administrativas
  const metricsHtml = `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">En Fabricación</span>
        <div class="metric-icon warning">
          <i class="fas fa-cogs"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.enFabricacion || 0}</div>
      <div class="metric-label">Órdenes activas</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Entregados</span>
        <div class="metric-icon success">
          <i class="fas fa-truck"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.entregados || 0}</div>
      <div class="metric-label">Listos para facturar</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Facturados</span>
        <div class="metric-icon primary">
          <i class="fas fa-file-invoice-dollar"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.facturados || 0}</div>
      <div class="metric-label">Pendientes cobro</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Cobrados</span>
        <div class="metric-icon success">
          <i class="fas fa-money-check-alt"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.cobrados || 0}</div>
      <div class="metric-label">Completados</div>
    </div>
  `;

  document.getElementById('admin-metrics').innerHTML = metricsHtml;

  // Panel financiero
  if (facturacion) {
    const financialHtml = `
      <div class="financial-metrics">
        <div class="financial-metric">
          <div class="financial-value">${formatearMoneda(facturacion.totalFacturado || 0)}</div>
          <div class="financial-label">Total Facturado</div>
        </div>
        <div class="financial-metric">
          <div class="financial-value">${formatearMoneda(facturacion.totalCobrado || 0)}</div>
          <div class="financial-label">Total Cobrado</div>
        </div>
        <div class="financial-metric">
          <div class="financial-value">${facturacion.pendienteCobro || 0}</div>
          <div class="financial-label">Pend. Cobro</div>
        </div>
      </div>
    `;

    document.getElementById('admin-financial').innerHTML = financialHtml;
  }

  // Alertas
  renderAlertas('admin-alerts', alertas);

  // Cargar tabla de pedidos
  cargarPedidosAdmin();
}

/**
 * Dashboard Taller
 */
function renderTallerDashboard(data) {
  const { resumen, cargaTrabajo, eficiencia, alertas } = data;

  // Métricas del taller
  const metricsHtml = `
    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">En Fabricación</span>
        <div class="metric-icon warning">
          <i class="fas fa-hammer"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.enFabricacion || 0}</div>
      <div class="metric-label">Trabajos activos</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Pendientes</span>
        <div class="metric-icon primary">
          <i class="fas fa-clock"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.pendienteDoc || 0}</div>
      <div class="metric-label">Esperando inicio</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Entregados</span>
        <div class="metric-icon success">
          <i class="fas fa-check-double"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.entregados || 0}</div>
      <div class="metric-label">Completados</div>
    </div>

    <div class="metric-card">
      <div class="metric-header">
        <span class="metric-title">Incidencias</span>
        <div class="metric-icon error">
          <i class="fas fa-exclamation-triangle"></i>
        </div>
      </div>
      <div class="metric-value">${resumen.incidencias || 0}</div>
      <div class="metric-label">Requieren atención</div>
    </div>
  `;

  document.getElementById('taller-metrics').innerHTML = metricsHtml;

  // Carga de trabajo
  if (cargaTrabajo) {
    const capacityPercent = Math.max(0, Math.min(100, ((10 - (cargaTrabajo.capacidadEstimada || 0)) / 10) * 100));

    const capacityHtml = `
      <div class="capacity-indicators">
        <div class="capacity-label">Capacidad Utilizada: ${capacityPercent.toFixed(0)}%</div>
        <div class="capacity-bar">
          <div class="capacity-fill" style="width: ${capacityPercent}%"></div>
        </div>
        <div class="mt-4">
          <div class="system-stat">
            <span class="stat-label">Trabajos Activos</span>
            <span class="stat-value">${cargaTrabajo.activos || 0}</span>
          </div>
          <div class="system-stat">
            <span class="stat-label">En Cola</span>
            <span class="stat-value">${cargaTrabajo.pendientes || 0}</span>
          </div>
          <div class="system-stat">
            <span class="stat-label">Tiempo Promedio</span>
            <span class="stat-value">${(cargaTrabajo.tiempoPromedioFabricacion || 0).toFixed(1)} días</span>
          </div>
        </div>
      </div>
    `;

    document.getElementById('taller-capacity').innerHTML = capacityHtml;
  }

  // Eficiencia
  if (eficiencia) {
    const efficiencyHtml = `
      <div class="efficiency-metrics">
        <div class="system-stat">
          <span class="stat-label">% Calidad</span>
          <span class="stat-value">${(eficiencia.porcentajeCalidad || 0).toFixed(1)}%</span>
        </div>
        <div class="system-stat">
          <span class="stat-label">% Puntualidad</span>
          <span class="stat-value">${(eficiencia.puntualidad || 0).toFixed(1)}%</span>
        </div>
        <div class="system-stat">
          <span class="stat-label">Completados</span>
          <span class="stat-value">${eficiencia.pedidosCompletados || 0}</span>
        </div>
        <div class="system-stat">
          <span class="stat-label">Tiempo Prom. Entrega</span>
          <span class="stat-value">${(eficiencia.tiempoPromedioEntrega || 0).toFixed(1)} días</span>
        </div>
      </div>
    `;

    document.getElementById('taller-efficiency').innerHTML = efficiencyHtml;
  }

  // Alertas
  renderAlertas('taller-alerts', alertas);

  // Cargar tabla de pedidos
  cargarPedidosTaller();
}


/**
 * Renderizar alertas
 */
function renderAlertas(containerId, alertas) {
  const container = document.getElementById(containerId);

  if (!alertas || alertas.length === 0) {
    container.innerHTML = `
      <div class="no-alerts">
        <i class="fas fa-check-circle"></i>
        <div>No hay alertas activas</div>
      </div>
    `;
    return;
  }

  const alertasHtml = alertas.map(alerta => `
    <div class="alert-item ${alerta.tipo}">
      <div class="font-medium">${alerta.mensaje}</div>
      ${alerta.pedidoId ? `<div class="text-sm mt-2">
        <a href="#" onclick="verPedido('${alerta.pedidoId}')" class="text-primary">Ver pedido</a>
      </div>` : ''}
    </div>
  `).join('');

  container.innerHTML = alertasHtml;
}

/**
 * Gráficos con Chart.js
 */
function renderChart(canvasId, type, data) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;

  // Destruir gráfico existente
  if (app.charts[canvasId]) {
    app.charts[canvasId].destroy();
  }

  const ctx = canvas.getContext('2d');
  app.charts[canvasId] = new Chart(ctx, {
    type: type,
    data: data,
    options: {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          position: 'bottom'
        }
      }
    }
  });
}

/**
 * Generar botones de acción
 */
function generarBotonesAccion(pedido, departamento) {
  const transiciones = pedido.transicionesDisponibles || [];

  let botones = `<button class="action-btn" onclick="verPedido('${pedido.id}')">
    <i class="fas fa-eye"></i> Ver
  </button>`;

  if (transiciones.length > 0) {
    const primeraTransicion = transiciones[0];
    botones += `<button class="action-btn" onclick="cambiarEstado('${pedido.id}', '${primeraTransicion}', '${departamento}')">
      ${formatearEstado(primeraTransicion)}
    </button>`;
  }

  return botones;
}

/**
 * Ver detalles de un pedido
 */
async function verPedido(pedidoId) {
  try {
    const response = await fetch(`${API_BASE}/comercial/pedidos/${pedidoId}`);
    const data = await response.json();

    if (data.success) {
      mostrarModalPedido(data.data);
    } else {
      showError('Error cargando pedido: ' + data.error);
    }
  } catch (error) {
    console.error('Error loading pedido:', error);
    showError('Error de conexión');
  }
}

function mostrarModalPedido(pedido) {
  const modalTitle = document.getElementById('modal-title');
  const modalBody = document.getElementById('modal-body');

  modalTitle.textContent = `Pedido ${pedido.id.slice(0, 8)}`;

  const html = `
    <div class="grid" style="grid-template-columns: 1fr 1fr; gap: 2rem;">
      <div>
        <h4 class="font-medium mb-4">Información del Cliente</h4>
        <div class="space-y-2">
          <div><strong>Nombre:</strong> ${pedido.cliente.nombre}</div>
          <div><strong>Email:</strong> ${pedido.cliente.email}</div>
          <div><strong>Empresa:</strong> ${pedido.cliente.empresa || 'N/A'}</div>
          <div><strong>Teléfono:</strong> ${pedido.cliente.telefono || 'N/A'}</div>
        </div>

        <h4 class="font-medium mb-4 mt-6">Detalles del Pedido</h4>
        <div class="space-y-2">
          <div><strong>Productos:</strong> ${pedido.productos.join(', ')}</div>
          <div><strong>Especificaciones:</strong> ${pedido.especificaciones}</div>
          <div><strong>Presupuesto:</strong> ${formatearMoneda(pedido.presupuesto.total)}</div>
          <div><strong>Prioridad:</strong> ${formatearEstado(pedido.prioridad)}</div>
        </div>
      </div>

      <div>
        <h4 class="font-medium mb-4">Estados por Departamento</h4>
        <div class="space-y-3">
          ${Object.entries(pedido.estados).map(([dept, estado]) => {
            if (!estado.estado) return '';
            return `
              <div class="p-3 bg-gray-50 rounded">
                <div class="flex justify-between items-center mb-2">
                  <strong>${formatearEstado(dept)}</strong>
                  <span class="status-badge ${estado.estado}">${formatearEstado(estado.estado)}</span>
                </div>
                <div class="text-sm text-gray-600">
                  <div>Responsable: ${estado.responsable || 'N/A'}</div>
                  <div>Fecha: ${estado.fechaCambio ? new Date(estado.fechaCambio).toLocaleString() : 'N/A'}</div>
                </div>
              </div>
            `;
          }).join('')}
        </div>

        <h4 class="font-medium mb-4 mt-6">Historial de Cambios</h4>
        <div class="max-h-40 overflow-y-auto space-y-2">
          ${pedido.historial.slice(-5).reverse().map(cambio => `
            <div class="text-sm p-2 bg-gray-50 rounded">
              <div class="font-medium">${formatearEstado(cambio.departamento)}</div>
              <div>${cambio.estadoAnterior || 'Inicio'} → ${cambio.estadoNuevo}</div>
              <div class="text-gray-600">${new Date(cambio.fecha).toLocaleString()}</div>
            </div>
          `).join('')}
        </div>
      </div>
    </div>
  `;

  modalBody.innerHTML = html;
  document.getElementById('pedidoModal').classList.add('active');
}

/**
 * Cambiar estado de un pedido
 */
async function cambiarEstado(pedidoId, nuevoEstado, departamento) {
  try {
    // Obtener formulario para el estado
    const response = await fetch(`${API_BASE}/${departamento}/formularios/${nuevoEstado}`);
    const data = await response.json();

    if (data.success) {
      mostrarModalFormulario(data.data, pedidoId, nuevoEstado, departamento);
    } else {
      showError('Error obteniendo formulario: ' + data.error);
    }
  } catch (error) {
    console.error('Error loading form:', error);
    showError('Error de conexión');
  }
}

function mostrarModalFormulario(formularioConfig, pedidoId, estado, departamento) {
  const modalTitle = document.getElementById('form-modal-title');
  const modalBody = document.getElementById('form-modal-body');

  modalTitle.textContent = formularioConfig.titulo;

  const camposHtml = formularioConfig.campos.map(campo => {
    switch (campo.tipo) {
      case 'text':
      case 'email':
      case 'tel':
      case 'number':
      case 'date':
      case 'datetime-local':
        return `
          <div class="form-group">
            <label class="form-label">
              ${campo.label}
              ${campo.obligatorio ? '<span class="required">*</span>' : ''}
            </label>
            <input type="${campo.tipo}"
                   name="${campo.nombre}"
                   class="form-input"
                   ${campo.obligatorio ? 'required' : ''}>
          </div>
        `;

      case 'textarea':
        return `
          <div class="form-group">
            <label class="form-label">
              ${campo.label}
              ${campo.obligatorio ? '<span class="required">*</span>' : ''}
            </label>
            <textarea name="${campo.nombre}"
                      class="form-textarea"
                      ${campo.obligatorio ? 'required' : ''}></textarea>
          </div>
        `;

      case 'select':
        const opciones = campo.opciones.map(opcion =>
          `<option value="${opcion}">${formatearEstado(opcion)}</option>`
        ).join('');
        return `
          <div class="form-group">
            <label class="form-label">
              ${campo.label}
              ${campo.obligatorio ? '<span class="required">*</span>' : ''}
            </label>
            <select name="${campo.nombre}"
                    class="form-select"
                    ${campo.obligatorio ? 'required' : ''}>
              <option value="">Seleccionar...</option>
              ${opciones}
            </select>
          </div>
        `;

      default:
        return '';
    }
  }).join('');

  modalBody.innerHTML = `
    <form id="estadoForm" data-pedido="${pedidoId}" data-estado="${estado}" data-departamento="${departamento}">
      ${camposHtml}
    </form>
  `;

  document.getElementById('formModal').classList.add('active');
}

/**
 * Enviar formulario
 */
async function enviarFormulario() {
  const form = document.getElementById('estadoForm');
  const formData = new FormData(form);
  const pedidoId = form.dataset.pedido;
  const estado = form.dataset.estado;
  const departamento = form.dataset.departamento;

  // Convertir FormData a objeto
  const datos = {
    responsable: 'usuario_demo', // En un sistema real, esto vendría de la autenticación
    pedidoId: pedidoId
  };

  for (let [key, value] of formData.entries()) {
    // Manejar campos anidados (ej: "cliente.nombre")
    const keys = key.split('.');
    let obj = datos;

    for (let i = 0; i < keys.length - 1; i++) {
      if (!obj[keys[i]]) {
        obj[keys[i]] = {};
      }
      obj = obj[keys[i]];
    }

    obj[keys[keys.length - 1]] = value;
  }

  try {
    const endpoint = determinarEndpoint(departamento, estado);
    const response = await fetch(`${API_BASE}/${departamento}/pedidos/${pedidoId}/${endpoint}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    const result = await response.json();

    if (result.success) {
      showSuccess('Estado actualizado correctamente');
      cerrarModalFormulario();
      loadDashboard(app.currentDepartment);
    } else {
      showError('Error actualizando estado: ' + result.error);
    }
  } catch (error) {
    console.error('Error submitting form:', error);
    showError('Error de conexión');
  }
}

function determinarEndpoint(departamento, estado) {
  const endpoints = {
    'comercial': {
      'confirmado': 'confirmar',
      'modificado': 'modificar',
      'en_espera': 'espera',
      'cancelado': 'cancelar'
    },
    'admin': {
      'confirmado': 'verificar',
      'pendiente_doc': 'documentacion',
      'en_fabricacion': 'fabricacion',
      'entregado': 'entrega',
      'facturado': 'facturar',
      'cobrado': 'cobrar',
      'incidencia': 'incidencia',
      'cancelado': 'cancelar'
    },
    'taller': {
      'en_fabricacion': 'iniciar',
      'entregado': 'finalizar',
      'modificado': 'modificar',
      'incidencia': 'incidencia',
      'cancelado': 'cancelar'
    }
  };

  return endpoints[departamento]?.[estado] || estado;
}

/**
 * Notificaciones
 */
function initializeNotifications() {
  document.getElementById('notificationBtn').addEventListener('click', toggleNotifications);
  updateNotifications();
}

function toggleNotifications() {
  const panel = document.getElementById('notificationPanel');
  panel.classList.toggle('active');
}

function closeNotifications() {
  document.getElementById('notificationPanel').classList.remove('active');
}

async function updateNotifications() {
  try {
    // Notifications functionality removed
    return;
    const data = await response.json();

    if (data.success) {
      app.notifications = data.data;
      renderNotifications();
      updateNotificationCount();
    }
  } catch (error) {
    console.error('Error loading notifications:', error);
  }
}

function renderNotifications() {
  const container = document.getElementById('notificationList');

  if (app.notifications.length === 0) {
    container.innerHTML = `
      <div class="text-center text-secondary">
        <i class="fas fa-bell-slash" style="font-size: 3rem; margin-bottom: 1rem;"></i>
        <div>No hay notificaciones</div>
      </div>
    `;
    return;
  }

  const html = app.notifications.map(notif => `
    <div class="alert-item ${notif.tipo} ${notif.leida ? 'opacity-50' : ''}" onclick="marcarComoLeida('${notif.id}')">
      <div class="font-medium">${notif.mensaje}</div>
      <div class="text-sm mt-2">${new Date(notif.timestamp).toLocaleString()}</div>
    </div>
  `).join('');

  container.innerHTML = html;
}

function updateNotificationCount() {
  const count = app.notifications.filter(n => !n.leida).length;
  const badge = document.querySelector('.notification-count');
  badge.textContent = count;
  badge.style.display = count > 0 ? 'block' : 'none';
}

async function marcarComoLeida(notificationId) {
  try {
    // Notifications functionality removed
    return;
    updateNotifications();
  } catch (error) {
    console.error('Error marking notification as read:', error);
  }
}

/**
 * Acciones rápidas
 */
async function nuevaPropuesta() {
  // Crear formulario modal para nueva propuesta
  const modalHtml = `
    <div class="modal-backdrop" id="nuevaPropuestaModal">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3><i class="fas fa-plus"></i> Nueva Propuesta</h3>
          <button class="modal-close" onclick="cerrarModal('nuevaPropuestaModal')">&times;</button>
        </div>
        <div class="modal-body">
          <form id="nuevaPropuestaForm">
            <h4>Datos del Cliente</h4>
            <div class="form-grid">
              <div class="form-group">
                <label for="clienteNombre">Nombre del Cliente *</label>
                <input type="text" id="clienteNombre" name="clienteNombre" required>
              </div>
              <div class="form-group">
                <label for="clienteEmpresa">Empresa</label>
                <input type="text" id="clienteEmpresa" name="clienteEmpresa">
              </div>
              <div class="form-group">
                <label for="clienteEmail">Email *</label>
                <input type="email" id="clienteEmail" name="clienteEmail" required>
              </div>
              <div class="form-group">
                <label for="clienteTelefono">Teléfono</label>
                <input type="tel" id="clienteTelefono" name="clienteTelefono">
              </div>
            </div>
            <div class="form-group">
              <label for="clienteDireccion">Dirección</label>
              <textarea id="clienteDireccion" name="clienteDireccion" rows="2"></textarea>
            </div>

            <h4>Datos del Pedido</h4>
            <div class="form-group">
              <label for="productos">Productos/Servicios *</label>
              <textarea id="productos" name="productos" required
                placeholder="Ejemplo: Estructura metálica, Acabados especiales"></textarea>
            </div>
            <div class="form-group">
              <label for="especificaciones">Especificaciones Técnicas *</label>
              <textarea id="especificaciones" name="especificaciones" required rows="4"
                placeholder="Descripción detallada de los requerimientos técnicos"></textarea>
            </div>
            <div class="form-grid">
              <div class="form-group">
                <label for="fechaEntregaSolicitada">Fecha de Entrega Solicitada</label>
                <input type="date" id="fechaEntregaSolicitada" name="fechaEntregaSolicitada">
              </div>
              <div class="form-group">
                <label for="prioridad">Prioridad</label>
                <select id="prioridad" name="prioridad">
                  <option value="normal">Normal</option>
                  <option value="alta">Alta</option>
                  <option value="urgente">Urgente</option>
                </select>
              </div>
            </div>
            <div class="form-group">
              <label for="observaciones">Observaciones</label>
              <textarea id="observaciones" name="observaciones" rows="3"
                placeholder="Cualquier información adicional"></textarea>
            </div>
          </form>
        </div>
        <div class="modal-footer">
          <button type="button" class="btn btn-secondary" onclick="cerrarModal('nuevaPropuestaModal')">
            <i class="fas fa-times"></i> Cancelar
          </button>
          <button type="button" class="btn btn-primary" onclick="enviarNuevaPropuesta()">
            <i class="fas fa-plus"></i> Crear Propuesta
          </button>
        </div>
      </div>
    </div>
  `;

  // Agregar modal al DOM
  document.body.insertAdjacentHTML('beforeend', modalHtml);

  // Configurar fecha mínima (hoy)
  const fechaInput = document.getElementById('fechaEntregaSolicitada');
  const today = new Date().toISOString().split('T')[0];
  fechaInput.min = today;
}

async function procesarDocumentacion() {
  try {
    // Obtener pedidos pendientes de documentación
    const response = await fetch(`${API_BASE}/admin/pedidos`);
    const data = await response.json();

    if (!data.success) {
      showError(`Error obteniendo pedidos: ${data.error}`);
      return;
    }

    // Filtrar solo los que están en pendiente_doc
    const pedidosPendientes = data.data.filter(pedido =>
      pedido.estados.admin.estado === 'pendiente_doc'
    );

    if (pedidosPendientes.length === 0) {
      showInfo('No hay pedidos pendientes de documentación');
      return;
    }

    // Crear modal con lista de pedidos pendientes
    const modalHtml = `
      <div class="modal-backdrop" id="procesarDocModal">
        <div class="modal-dialog" style="max-width: 800px;">
          <div class="modal-header">
            <h3><i class="fas fa-file-alt"></i> Procesar Documentación</h3>
            <button class="modal-close" onclick="cerrarModal('procesarDocModal')">&times;</button>
          </div>
          <div class="modal-body">
            <p>Selecciona un pedido para procesar su documentación:</p>
            <div class="pedidos-list">
              ${pedidosPendientes.map(pedido => `
                <div class="pedido-item" onclick="mostrarFormularioDocumentacion('${pedido.id}')">
                  <div class="pedido-header">
                    <strong>ID: ${pedido.id.substring(0, 8)}</strong>
                    <span class="badge warning">Pendiente Documentación</span>
                  </div>
                  <div class="pedido-info">
                    <span><strong>Cliente:</strong> ${pedido.cliente.nombre}</span>
                    <span><strong>Empresa:</strong> ${pedido.cliente.empresa || 'N/A'}</span>
                  </div>
                  <div class="pedido-descripcion">
                    <strong>Productos:</strong> ${pedido.productos.join(', ')}
                  </div>
                  ${pedido.estados.admin.datos.documentosRequeridos ? `
                    <div class="documentos-requeridos">
                      <strong>Documentos requeridos:</strong>
                      <ul>
                        ${pedido.estados.admin.datos.documentosRequeridos.map(doc => `<li>${doc}</li>`).join('')}
                      </ul>
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('procesarDocModal')">
              <i class="fas fa-times"></i> Cancelar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

  } catch (error) {
    console.error('Error procesando documentación:', error);
    showError('Error de conexión al procesar documentación');
  }
}

async function mostrarFormularioDocumentacion(pedidoId) {
  try {
    // Cerrar modal anterior
    cerrarModal('procesarDocModal');

    // Obtener detalles del pedido
    const response = await fetch(`${API_BASE}/admin/pedidos/${pedidoId}`);
    const data = await response.json();

    if (!data.success) {
      showError(`Error obteniendo detalles del pedido: ${data.error}`);
      return;
    }

    const pedido = data.data;

    // Crear formulario de procesamiento de documentación
    const modalHtml = `
      <div class="modal-backdrop" id="docFormModal">
        <div class="modal-dialog" style="max-width: 700px;">
          <div class="modal-header">
            <h3><i class="fas fa-file-check"></i> Procesar Documentación - ID: ${pedido.id.substring(0, 8)}</h3>
            <button class="modal-close" onclick="cerrarModal('docFormModal')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="pedido-resumen">
              <h4>Resumen del Pedido</h4>
              <div class="form-grid">
                <div><strong>Cliente:</strong> ${pedido.cliente.nombre}</div>
                <div><strong>Empresa:</strong> ${pedido.cliente.empresa || 'N/A'}</div>
                <div><strong>Email:</strong> ${pedido.cliente.email}</div>
                <div><strong>Teléfono:</strong> ${pedido.cliente.telefono || 'N/A'}</div>
              </div>
              <p><strong>Productos:</strong> ${pedido.productos.join(', ')}</p>
              <p><strong>Especificaciones:</strong> ${pedido.especificaciones}</p>
            </div>

            <form id="docForm">
              <h4>Procesar Documentación</h4>
              <div class="form-group">
                <label for="accionDoc">Acción a realizar *</label>
                <select id="accionDoc" name="accionDoc" required onchange="mostrarCamposDocumentacion()">
                  <option value="">Selecciona una acción</option>
                  <option value="aprobar">Aprobar y enviar a fabricación</option>
                  <option value="solicitar_mas">Solicitar documentación adicional</option>
                  <option value="rechazar">Rechazar documentación</option>
                </select>
              </div>

              <div id="camposAprobacion" style="display: none;">
                <div class="form-group">
                  <label for="fechaInicioFabricacion">Fecha de inicio de fabricación</label>
                  <input type="date" id="fechaInicioFabricacion" name="fechaInicioFabricacion">
                </div>
                <div class="form-group">
                  <label for="responsableTaller">Responsable del taller</label>
                  <input type="text" id="responsableTaller" name="responsableTaller" placeholder="Nombre del responsable">
                </div>
                <div class="form-group">
                  <label for="fechaEntregaEstimada">Fecha de entrega estimada</label>
                  <input type="date" id="fechaEntregaEstimada" name="fechaEntregaEstimada">
                </div>
              </div>

              <div id="camposSolicitudAdicional" style="display: none;">
                <div class="form-group">
                  <label for="documentosAdicionales">Documentos adicionales requeridos</label>
                  <textarea id="documentosAdicionales" name="documentosAdicionales" rows="3"
                    placeholder="Lista los documentos adicionales que se necesitan"></textarea>
                </div>
                <div class="form-group">
                  <label for="fechaLimiteAdicional">Fecha límite para entregar documentos</label>
                  <input type="date" id="fechaLimiteAdicional" name="fechaLimiteAdicional">
                </div>
              </div>

              <div class="form-group">
                <label for="observacionesDoc">Observaciones</label>
                <textarea id="observacionesDoc" name="observacionesDoc" rows="3"
                  placeholder="Comentarios sobre el procesamiento de la documentación"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('docFormModal')">
              <i class="fas fa-times"></i> Cancelar
            </button>
            <button type="button" class="btn btn-primary" onclick="enviarProcesarDocumentacion('${pedido.id}')">
              <i class="fas fa-check"></i> Procesar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Configurar fechas mínimas
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('fechaInicioFabricacion').min = today;
    document.getElementById('fechaEntregaEstimada').min = today;
    document.getElementById('fechaLimiteAdicional').min = today;

  } catch (error) {
    console.error('Error mostrando formulario documentación:', error);
    showError('Error de conexión al cargar formulario');
  }
}

function mostrarCamposDocumentacion() {
  const accion = document.getElementById('accionDoc').value;
  const camposAprobacion = document.getElementById('camposAprobacion');
  const camposSolicitud = document.getElementById('camposSolicitudAdicional');

  // Ocultar todos los campos primero
  camposAprobacion.style.display = 'none';
  camposSolicitud.style.display = 'none';

  // Mostrar campos según la acción
  if (accion === 'aprobar') {
    camposAprobacion.style.display = 'block';
  } else if (accion === 'solicitar_mas') {
    camposSolicitud.style.display = 'block';
  }
}

async function enviarProcesarDocumentacion(pedidoId) {
  try {
    const form = document.getElementById('docForm');
    const formData = new FormData(form);

    const accion = formData.get('accionDoc');
    if (!accion) {
      showError('Por favor selecciona una acción');
      return;
    }

    let datosEnvio = {
      accion: accion,
      observaciones: formData.get('observacionesDoc')
    };

    // Agregar datos específicos según la acción
    if (accion === 'aprobar') {
      datosEnvio.fechaInicioFabricacion = formData.get('fechaInicioFabricacion');
      datosEnvio.responsableTaller = formData.get('responsableTaller');
      datosEnvio.fechaEntregaEstimada = formData.get('fechaEntregaEstimada');
    } else if (accion === 'solicitar_mas') {
      datosEnvio.documentosAdicionales = formData.get('documentosAdicionales')?.split('\n').filter(d => d.trim());
      datosEnvio.fechaLimiteDocumentacion = formData.get('fechaLimiteAdicional');
    }

    // Enviar petición al API
    const response = await fetch(`${API_BASE}/admin/pedidos/${pedidoId}/documentacion`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datosEnvio)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('Documentación procesada exitosamente');
      cerrarModal('docFormModal');
      // Actualizar dashboard
      loadDashboard('admin');
    } else {
      showError(`Error procesando documentación: ${data.error}`);
    }

  } catch (error) {
    console.error('Error enviando procesamiento:', error);
    showError('Error de conexión al procesar documentación');
  }
}

async function iniciarFabricacion() {
  try {
    // Obtener pedidos listos para fabricación
    const response = await fetch(`${API_BASE}/taller/pedidos`);
    const data = await response.json();

    if (!data.success) {
      showError(`Error obteniendo pedidos: ${data.error}`);
      return;
    }

    // Filtrar solo los que están listos para iniciar fabricación
    const pedidosListos = data.data.filter(pedido =>
      pedido.estados.admin.estado === 'en_fabricacion' &&
      (!pedido.estados.taller.estado || pedido.estados.taller.estado === 'pendiente_doc')
    );

    if (pedidosListos.length === 0) {
      showInfo('No hay pedidos listos para iniciar fabricación');
      return;
    }

    // Crear modal con lista de pedidos listos
    const modalHtml = `
      <div class="modal-backdrop" id="iniciarFabModal">
        <div class="modal-dialog" style="max-width: 800px;">
          <div class="modal-header">
            <h3><i class="fas fa-play"></i> Iniciar Fabricación</h3>
            <button class="modal-close" onclick="cerrarModal('iniciarFabModal')">&times;</button>
          </div>
          <div class="modal-body">
            <p>Selecciona un pedido para iniciar su fabricación:</p>
            <div class="pedidos-list">
              ${pedidosListos.map(pedido => `
                <div class="pedido-item" onclick="mostrarFormularioFabricacion('${pedido.id}')">
                  <div class="pedido-header">
                    <strong>ID: ${pedido.id.substring(0, 8)}</strong>
                    <span class="badge success">Listo para Fabricación</span>
                  </div>
                  <div class="pedido-info">
                    <span><strong>Cliente:</strong> ${pedido.cliente.nombre}</span>
                    <span><strong>Empresa:</strong> ${pedido.cliente.empresa || 'N/A'}</span>
                  </div>
                  <div class="pedido-descripcion">
                    <strong>Productos:</strong> ${pedido.productos.join(', ')}
                  </div>
                  <div class="pedido-descripcion">
                    <strong>Prioridad:</strong> ${pedido.prioridad.toUpperCase()}
                  </div>
                  ${pedido.estados.admin.datos.fechaInicioFabricacion ? `
                    <div class="documentos-requeridos">
                      <strong>Fecha programada:</strong> ${new Date(pedido.estados.admin.datos.fechaInicioFabricacion).toLocaleDateString()}
                      ${pedido.estados.admin.datos.responsableTaller ? `<br><strong>Responsable asignado:</strong> ${pedido.estados.admin.datos.responsableTaller}` : ''}
                    </div>
                  ` : ''}
                </div>
              `).join('')}
            </div>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('iniciarFabModal')">
              <i class="fas fa-times"></i> Cancelar
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

  } catch (error) {
    console.error('Error iniciando fabricación:', error);
    showError('Error de conexión al obtener pedidos');
  }
}

async function mostrarFormularioFabricacion(pedidoId) {
  try {
    // Cerrar modal anterior
    cerrarModal('iniciarFabModal');

    // Obtener detalles del pedido
    const response = await fetch(`${API_BASE}/taller/pedidos/${pedidoId}`);
    const data = await response.json();

    if (!data.success) {
      showError(`Error obteniendo detalles del pedido: ${data.error}`);
      return;
    }

    const pedido = data.data;

    // Crear formulario de inicio de fabricación
    const modalHtml = `
      <div class="modal-backdrop" id="fabFormModal">
        <div class="modal-dialog" style="max-width: 700px;">
          <div class="modal-header">
            <h3><i class="fas fa-hammer"></i> Iniciar Fabricación - ID: ${pedido.id.substring(0, 8)}</h3>
            <button class="modal-close" onclick="cerrarModal('fabFormModal')">&times;</button>
          </div>
          <div class="modal-body">
            <div class="pedido-resumen">
              <h4>Resumen del Pedido</h4>
              <div class="form-grid">
                <div><strong>Cliente:</strong> ${pedido.cliente.nombre}</div>
                <div><strong>Empresa:</strong> ${pedido.cliente.empresa || 'N/A'}</div>
                <div><strong>Prioridad:</strong> ${pedido.prioridad.toUpperCase()}</div>
                <div><strong>Fecha entrega:</strong> ${pedido.fechaEntregaSolicitada ? new Date(pedido.fechaEntregaSolicitada).toLocaleDateString() : 'No especificada'}</div>
              </div>
              <p><strong>Productos:</strong> ${pedido.productos.join(', ')}</p>
              <p><strong>Especificaciones:</strong> ${pedido.especificaciones}</p>
              ${pedido.estados.admin.datos.responsableTaller ? `
                <p><strong>Responsable asignado:</strong> ${pedido.estados.admin.datos.responsableTaller}</p>
              ` : ''}
            </div>

            <form id="fabForm">
              <h4>Iniciar Fabricación</h4>
              <div class="form-group">
                <label for="responsableFab">Responsable de fabricación *</label>
                <input type="text" id="responsableFab" name="responsableFab"
                  value="${pedido.estados.admin.datos.responsableTaller || ''}" required
                  placeholder="Nombre del responsable directo">
              </div>

              <div class="form-grid">
                <div class="form-group">
                  <label for="fechaInicioReal">Fecha de inicio real *</label>
                  <input type="date" id="fechaInicioReal" name="fechaInicioReal" required>
                </div>
                <div class="form-group">
                  <label for="tiempoEstimado">Tiempo estimado (días)</label>
                  <input type="number" id="tiempoEstimado" name="tiempoEstimado" min="1" step="0.5"
                    placeholder="Días de trabajo estimados">
                </div>
              </div>

              <div class="form-group">
                <label for="maquinasAsignadas">Máquinas/Recursos asignados</label>
                <textarea id="maquinasAsignadas" name="maquinasAsignadas" rows="2"
                  placeholder="Lista de máquinas o recursos asignados al trabajo"></textarea>
              </div>

              <div class="form-group">
                <label for="planificacion">Plan de fabricación</label>
                <textarea id="planificacion" name="planificacion" rows="3"
                  placeholder="Descripción del plan de fabricación y etapas principales"></textarea>
              </div>

              <div class="form-group">
                <label for="materialesRequeridos">Materiales requeridos</label>
                <textarea id="materialesRequeridos" name="materialesRequeridos" rows="2"
                  placeholder="Lista de materiales y cantidades necesarias"></textarea>
              </div>

              <div class="form-group">
                <label for="observacionesFab">Observaciones</label>
                <textarea id="observacionesFab" name="observacionesFab" rows="2"
                  placeholder="Notas adicionales sobre el inicio de fabricación"></textarea>
              </div>
            </form>
          </div>
          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" onclick="cerrarModal('fabFormModal')">
              <i class="fas fa-times"></i> Cancelar
            </button>
            <button type="button" class="btn btn-primary" onclick="enviarIniciarFabricacion('${pedido.id}')">
              <i class="fas fa-play"></i> Iniciar Fabricación
            </button>
          </div>
        </div>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Configurar fecha mínima (hoy) y sugerida
    const today = new Date().toISOString().split('T')[0];
    const fechaInicioInput = document.getElementById('fechaInicioReal');
    fechaInicioInput.min = today;
    fechaInicioInput.value = today; // Valor por defecto: hoy

  } catch (error) {
    console.error('Error mostrando formulario fabricación:', error);
    showError('Error de conexión al cargar formulario');
  }
}

async function enviarIniciarFabricacion(pedidoId) {
  try {
    const form = document.getElementById('fabForm');
    const formData = new FormData(form);

    // Validar campos requeridos
    if (!formData.get('responsableFab') || !formData.get('fechaInicioReal')) {
      showError('Por favor completa todos los campos requeridos');
      return;
    }

    // Preparar datos para enviar
    const datosEnvio = {
      responsable: formData.get('responsableFab'),
      fechaInicioReal: formData.get('fechaInicioReal'),
      tiempoEstimadoDias: formData.get('tiempoEstimado') ? Number(formData.get('tiempoEstimado')) : null,
      maquinasAsignadas: formData.get('maquinasAsignadas')?.split('\n').filter(m => m.trim()),
      planFabricacion: formData.get('planificacion'),
      materialesRequeridos: formData.get('materialesRequeridos')?.split('\n').filter(m => m.trim()),
      observaciones: formData.get('observacionesFab')
    };

    // Enviar petición al API
    const response = await fetch(`${API_BASE}/taller/pedidos/${pedidoId}/iniciar`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datosEnvio)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess('Fabricación iniciada exitosamente');
      cerrarModal('fabFormModal');
      // Actualizar dashboard
      loadDashboard('taller');
    } else {
      showError(`Error iniciando fabricación: ${data.error}`);
    }

  } catch (error) {
    console.error('Error enviando inicio fabricación:', error);
    showError('Error de conexión al iniciar fabricación');
  }
}

async function reportarIncidencia() {
  showInfo('Funcionalidad de reporte de incidencias - Por implementar');
}

/**
 * Utilidades
 */
function formatearEstado(estado) {
  return estado
    .split('_')
    .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
    .join(' ');
}

function formatearMoneda(cantidad) {
  return new Intl.NumberFormat('es-ES', {
    style: 'currency',
    currency: 'EUR'
  }).format(cantidad);
}

function actualizarDashboard(department) {
  loadDashboard(department);
}

function filtrarPedidos(department) {
  // Implementar filtrado de pedidos
  console.log(`Filtrando pedidos para ${department}`);
}

function cerrarModal(modalId) {
  if (modalId) {
    // Para modales dinámicos (remove del DOM)
    const modal = document.getElementById(modalId);
    if (modal) {
      // Animación de salida suave
      modal.style.opacity = '0';
      modal.style.transform = 'scale(0.95)';
      setTimeout(() => {
        modal.remove();
      }, 200);
    }
  } else {
    // Para modales estáticos (ocultar con clase)
    const pedidoModal = document.getElementById('pedidoModal');
    if (pedidoModal) {
      pedidoModal.classList.remove('active');
    }
  }
}

function cerrarModalFormulario() {
  const formModal = document.getElementById('formModal');
  if (formModal) {
    formModal.classList.remove('active');
  }
}

// Funciones para notificaciones no intrusivas
function showLoading(department) {
  const container = document.getElementById(`${department}-metrics`);
  if (container) {
    container.innerHTML = '<div class="loading"><i class="fas fa-spinner fa-spin"></i> Cargando...</div>';
  }
}

function showError(message) {
  console.error(message);
  mostrarNotificacion(message, 'error');
}

function showSuccess(message) {
  console.log(message);
  mostrarNotificacion(message, 'success');
}

function showInfo(message) {
  console.info(message);
  mostrarNotificacion(message, 'info');
}

// Sistema de notificaciones tipo toast
function mostrarNotificacion(mensaje, tipo = 'info') {
  // Crear container de notificaciones si no existe
  let container = document.getElementById('notifications-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'notifications-container';
    container.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      z-index: 10000;
      max-width: 400px;
    `;
    document.body.appendChild(container);
  }

  // Crear notificación
  const notification = document.createElement('div');
  notification.style.cssText = `
    padding: 12px 16px;
    margin-bottom: 10px;
    border-radius: 6px;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    transform: translateX(100%);
    transition: all 0.3s ease;
    font-size: 14px;
    line-height: 1.4;
    max-width: 100%;
    word-wrap: break-word;
  `;

  // Estilos por tipo
  const estilos = {
    error: 'background: #fee; color: #c53030; border-left: 4px solid #fc8181;',
    success: 'background: #f0fff4; color: #2f855a; border-left: 4px solid #68d391;',
    info: 'background: #ebf8ff; color: #2b6cb0; border-left: 4px solid #63b3ed;'
  };

  notification.style.cssText += estilos[tipo] || estilos.info;
  notification.textContent = mensaje;

  container.appendChild(notification);

  // Animación de entrada
  setTimeout(() => {
    notification.style.transform = 'translateX(0)';
  }, 10);

  // Auto-eliminar después de 4 segundos
  setTimeout(() => {
    notification.style.transform = 'translateX(100%)';
    setTimeout(() => {
      if (notification.parentNode) {
        notification.remove();
      }
    }, 300);
  }, 4000);
}

async function enviarNuevaPropuesta() {
  try {
    const form = document.getElementById('nuevaPropuestaForm');
    const formData = new FormData(form);

    // Validar campos requeridos
    if (!formData.get('clienteNombre') || !formData.get('clienteEmail') ||
        !formData.get('productos') || !formData.get('especificaciones')) {
      showError('Por favor completa todos los campos requeridos');
      return;
    }

    // Convertir productos de string a array
    const productos = formData.get('productos').split(',').map(p => p.trim()).filter(p => p);

    // Preparar datos del pedido
    const datosPedido = {
      cliente: {
        nombre: formData.get('clienteNombre'),
        empresa: formData.get('clienteEmpresa'),
        email: formData.get('clienteEmail'),
        telefono: formData.get('clienteTelefono'),
        direccion: formData.get('clienteDireccion')
      },
      productos: productos,
      especificaciones: formData.get('especificaciones'),
      fechaEntregaSolicitada: formData.get('fechaEntregaSolicitada') ? new Date(formData.get('fechaEntregaSolicitada')) : null,
      prioridad: formData.get('prioridad') || 'normal',
      observaciones: formData.get('observaciones')
    };

    // Enviar petición al API
    const response = await fetch(`${API_BASE}/comercial/propuestas`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datosPedido)
    });

    const data = await response.json();

    if (data.success) {
      showSuccess(`Propuesta creada exitosamente. ID: ${data.data.id}`);
      cerrarModal('nuevaPropuestaModal');
      // Actualizar dashboard
      loadDashboard('comercial');
    } else {
      showError(`Error creando propuesta: ${data.error}`);
    }

  } catch (error) {
    console.error('Error enviando propuesta:', error);
    showError('Error de conexión al crear la propuesta');
  }
}

/**
 * Cargar y mostrar pedidos en tabla de administración
 */
async function cargarPedidosAdmin() {
  try {
    const response = await fetch(`${API_BASE}/admin/pedidos`);
    const data = await response.json();

    if (data.success && data.data) {
      renderTablaAdmin(data.data);
    }
  } catch (error) {
    console.error('Error cargando pedidos admin:', error);
  }
}

/**
 * Renderizar tabla de administración
 */
function renderTablaAdmin(pedidos) {
  const tbody = document.getElementById('admin-table-body');

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">No hay pedidos pendientes de gestión</td>
      </tr>
    `;
    return;
  }

  const html = pedidos.map(pedido => `
    <tr>
      <td>${pedido.id.slice(0, 8)}</td>
      <td>${pedido.cliente.nombre}</td>
      <td><span class="status-badge ${pedido.estados.admin?.estado || 'pendiente'}">${formatearEstado(pedido.estados.admin?.estado || 'pendiente')}</span></td>
      <td>${formatearMoneda(pedido.presupuesto.total)}</td>
      <td>${pedido.fechaEntrega ? new Date(pedido.fechaEntrega).toLocaleDateString() : 'N/A'}</td>
      <td>
        <button class="btn btn-small btn-primary" onclick="verPedido('${pedido.id}')">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button class="btn btn-small btn-secondary" onclick="cambiarEstado('${pedido.id}', 'admin')">
          <i class="fas fa-edit"></i> Gestionar
        </button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = html;
}

/**
 * Cargar y mostrar pedidos en tabla de taller
 */
async function cargarPedidosTaller() {
  try {
    const response = await fetch(`${API_BASE}/taller/pedidos`);
    const data = await response.json();

    if (data.success && data.data) {
      renderTablaTaller(data.data);
    }
  } catch (error) {
    console.error('Error cargando pedidos taller:', error);
  }
}

/**
 * Renderizar tabla de taller
 */
function renderTablaTaller(pedidos) {
  const tbody = document.getElementById('taller-table-body');

  if (!pedidos || pedidos.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="text-center">No hay órdenes de trabajo pendientes</td>
      </tr>
    `;
    return;
  }

  const html = pedidos.map(pedido => `
    <tr>
      <td>${pedido.id.slice(0, 8)}</td>
      <td>${pedido.productos.join(', ')}</td>
      <td><span class="status-badge ${pedido.estados.taller?.estado || 'pendiente'}">${formatearEstado(pedido.estados.taller?.estado || 'pendiente')}</span></td>
      <td>${pedido.estados.taller?.responsable || 'Sin asignar'}</td>
      <td>${pedido.estados.taller?.fechaCambio ? new Date(pedido.estados.taller.fechaCambio).toLocaleDateString() : 'N/A'}</td>
      <td>
        <button class="btn btn-small btn-primary" onclick="verPedido('${pedido.id}')">
          <i class="fas fa-eye"></i> Ver
        </button>
        <button class="btn btn-small btn-secondary" onclick="cambiarEstado('${pedido.id}', 'taller')">
          <i class="fas fa-edit"></i> Gestionar
        </button>
      </td>
    </tr>
  `).join('');

  tbody.innerHTML = html;
}

// Cerrar modales al hacer clic fuera
document.addEventListener('click', function(e) {
  if (e.target.classList.contains('modal')) {
    e.target.classList.remove('active');
  }
});