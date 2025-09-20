/**
 * Generador de formularios dinámicos basados en el estado actual del pedido
 * Implementa el principio de mostrar exactamente los datos necesarios en cada momento
 */
export class FormularioDinamico {
  constructor() {
    this.validadores = new Map();
    this.configurarValidadores();
  }

  /**
   * Genera un formulario HTML dinámico basado en el estado y departamento
   */
  generarFormulario(departamento, estado, datosActuales = {}) {
    const maquinasEstado = {
      comercial: this.getMaquinaEstadosComercial(),
      admin: this.getMaquinaEstadosAdmin(),
      taller: this.getMaquinaEstadosTaller()
    };

    const maquina = maquinasEstado[departamento];
    if (!maquina) {
      throw new Error(`Departamento ${departamento} no válido`);
    }

    const formularioConfig = maquina.obtenerFormularioParaEstado(estado);
    return this.construirFormularioHTML(formularioConfig, datosActuales, departamento, estado);
  }

  /**
   * Construye el HTML del formulario dinámico
   */
  construirFormularioHTML(config, datosActuales, departamento, estado) {
    const campos = config.campos.map(campo => this.generarCampo(campo, datosActuales)).join('');

    return `
      <div class="formulario-dinamico" data-departamento="${departamento}" data-estado="${estado}">
        <div class="formulario-header">
          <h3>${config.titulo}</h3>
          <div class="estado-badge estado-${estado}">${this.formatearEstado(estado)}</div>
        </div>

        <form class="formulario-campos" data-formulario="${departamento}-${estado}">
          ${campos}

          <div class="formulario-acciones">
            <button type="submit" class="btn btn-primary">
              ${this.obtenerTextoBoton(departamento, estado)}
            </button>
            <button type="button" class="btn btn-secondary" onclick="cancelarFormulario()">
              Cancelar
            </button>
          </div>
        </form>

        <div class="formulario-validacion" id="validacion-${departamento}-${estado}">
          <!-- Mensajes de validación se insertan aquí -->
        </div>
      </div>
    `;
  }

  /**
   * Genera un campo individual del formulario
   */
  generarCampo(campo, datosActuales) {
    const valor = this.obtenerValorAnidado(datosActuales, campo.nombre) || '';
    const id = `campo-${campo.nombre.replace(/\./g, '-')}`;
    const obligatorio = campo.obligatorio ? 'required' : '';
    const claseObligatoria = campo.obligatorio ? 'campo-obligatorio' : '';

    let campoHTML = '';

    switch (campo.tipo) {
      case 'text':
      case 'email':
      case 'tel':
        campoHTML = `
          <input type="${campo.tipo}"
                 id="${id}"
                 name="${campo.nombre}"
                 value="${valor}"
                 ${obligatorio}
                 class="form-control ${claseObligatoria}">
        `;
        break;

      case 'number':
        campoHTML = `
          <input type="number"
                 id="${id}"
                 name="${campo.nombre}"
                 value="${valor}"
                 ${obligatorio}
                 step="0.01"
                 min="0"
                 class="form-control ${claseObligatoria}">
        `;
        break;

      case 'date':
      case 'datetime-local':
        const valorFecha = valor ? new Date(valor).toISOString().slice(0, campo.tipo === 'date' ? 10 : 16) : '';
        campoHTML = `
          <input type="${campo.tipo}"
                 id="${id}"
                 name="${campo.nombre}"
                 value="${valorFecha}"
                 ${obligatorio}
                 class="form-control ${claseObligatoria}">
        `;
        break;

      case 'textarea':
        campoHTML = `
          <textarea id="${id}"
                    name="${campo.nombre}"
                    ${obligatorio}
                    rows="4"
                    class="form-control ${claseObligatoria}">${valor}</textarea>
        `;
        break;

      case 'select':
        const opciones = campo.opciones.map(opcion => {
          const selected = valor === opcion ? 'selected' : '';
          return `<option value="${opcion}" ${selected}>${this.formatearOpcion(opcion)}</option>`;
        }).join('');

        campoHTML = `
          <select id="${id}"
                  name="${campo.nombre}"
                  ${obligatorio}
                  class="form-control ${claseObligatoria}">
            <option value="">Seleccionar...</option>
            ${opciones}
          </select>
        `;
        break;

      case 'checkbox':
        const checked = valor === true || valor === 'true' ? 'checked' : '';
        campoHTML = `
          <div class="form-check">
            <input type="checkbox"
                   id="${id}"
                   name="${campo.nombre}"
                   value="true"
                   ${checked}
                   class="form-check-input ${claseObligatoria}">
            <label class="form-check-label" for="${id}">${campo.label}</label>
          </div>
        `;
        break;

      case 'array':
        const valorArray = Array.isArray(valor) ? valor : [];
        const itemsHTML = valorArray.map((item, index) => `
          <div class="array-item" data-index="${index}">
            <input type="text"
                   name="${campo.nombre}[${index}]"
                   value="${item}"
                   class="form-control">
            <button type="button" class="btn btn-sm btn-danger" onclick="eliminarItem(this)">×</button>
          </div>
        `).join('');

        campoHTML = `
          <div class="array-container" data-field="${campo.nombre}">
            <div class="array-items">
              ${itemsHTML}
            </div>
            <button type="button" class="btn btn-sm btn-secondary" onclick="agregarItem('${campo.nombre}')">
              Agregar ${campo.label}
            </button>
          </div>
        `;
        break;

      default:
        campoHTML = `<input type="text" id="${id}" name="${campo.nombre}" value="${valor}" class="form-control">`;
    }

    // No envolver checkbox en form-group ya que tiene su propio contenedor
    if (campo.tipo === 'checkbox') {
      return `
        <div class="form-group">
          ${campoHTML}
        </div>
      `;
    }

    return `
      <div class="form-group">
        <label for="${id}" class="form-label">
          ${campo.label}
          ${campo.obligatorio ? '<span class="text-danger">*</span>' : ''}
        </label>
        ${campoHTML}
        <div class="field-help" id="help-${id}">
          ${this.obtenerAyudaCampo(campo.nombre)}
        </div>
      </div>
    `;
  }

  /**
   * Obtiene el valor de una propiedad anidada (ej: "cliente.nombre")
   */
  obtenerValorAnidado(objeto, ruta) {
    return ruta.split('.').reduce((obj, prop) => obj && obj[prop], objeto);
  }

  /**
   * Formatea el texto del estado para mostrar
   */
  formatearEstado(estado) {
    return estado
      .split('_')
      .map(palabra => palabra.charAt(0).toUpperCase() + palabra.slice(1))
      .join(' ');
  }

  /**
   * Formatea las opciones de los select
   */
  formatearOpcion(opcion) {
    const formatos = {
      'si': 'Sí',
      'no': 'No',
      'aprobado': 'Aprobado',
      'rechazado': 'Rechazado',
      'condicional': 'Condicional',
      'parcial': 'Parcial',
      'transferencia': 'Transferencia',
      'efectivo': 'Efectivo',
      'cheque': 'Cheque',
      'tarjeta': 'Tarjeta',
      'baja': 'Baja',
      'normal': 'Normal',
      'alta': 'Alta',
      'urgente': 'Urgente'
    };

    return formatos[opcion] || this.formatearEstado(opcion);
  }

  /**
   * Obtiene el texto del botón según el contexto
   */
  obtenerTextoBoton(departamento, estado) {
    const textos = {
      'comercial.propuesto': 'Crear Propuesta',
      'comercial.confirmado': 'Confirmar Pedido',
      'comercial.modificado': 'Registrar Modificación',
      'comercial.en_espera': 'Poner en Espera',
      'comercial.cancelado': 'Cancelar Pedido',

      'admin.confirmado': 'Verificar Confirmación',
      'admin.pendiente_doc': 'Gestionar Documentación',
      'admin.en_fabricacion': 'Enviar a Fabricación',
      'admin.entregado': 'Registrar Entrega',
      'admin.facturado': 'Crear Factura',
      'admin.cobrado': 'Registrar Cobro',
      'admin.incidencia': 'Gestionar Incidencia',

      'taller.en_fabricacion': 'Iniciar Fabricación',
      'taller.entregado': 'Finalizar y Entregar',
      'taller.modificado': 'Gestionar Modificación',
      'taller.incidencia': 'Reportar Incidencia',
      'taller.cancelado': 'Cancelar Fabricación'
    };

    return textos[`${departamento}.${estado}`] || 'Guardar Cambios';
  }

  /**
   * Obtiene texto de ayuda para campos específicos
   */
  obtenerAyudaCampo(nombreCampo) {
    const ayudas = {
      'cliente.email': 'Email válido para comunicaciones',
      'presupuesto.total': 'Importe total incluyendo IVA',
      'fechaEntregaSolicitada': 'Fecha estimada de entrega al cliente',
      'documentosRequeridos': 'Lista de documentos necesarios para proceder',
      'controlCalidad': 'Estado del control de calidad del producto',
      'numeroFactura': 'Número único de factura para el pedido',
      'metodoCobro': 'Forma de pago utilizada por el cliente'
    };

    return ayudas[nombreCampo] || '';
  }

  /**
   * Configura validadores personalizados
   */
  configurarValidadores() {
    this.validadores.set('email', (valor) => {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return regex.test(valor) || 'Email no válido';
    });

    this.validadores.set('presupuesto', (valor) => {
      const numero = parseFloat(valor);
      return (numero > 0) || 'El presupuesto debe ser mayor a 0';
    });

    this.validadores.set('fechaFutura', (valor) => {
      const fecha = new Date(valor);
      const hoy = new Date();
      return (fecha >= hoy) || 'La fecha debe ser futura';
    });
  }

  /**
   * Valida un formulario completo
   */
  validarFormulario(datosFormulario, departamento, estado) {
    const errores = [];
    const maquinasEstado = {
      comercial: this.getMaquinaEstadosComercial(),
      admin: this.getMaquinaEstadosAdmin(),
      taller: this.getMaquinaEstadosTaller()
    };

    const maquina = maquinasEstado[departamento];
    const validacion = maquina.validarDatosParaEstado(estado, datosFormulario);

    if (!validacion.valido) {
      errores.push(...validacion.errores);
    }

    // Validaciones adicionales específicas
    if (datosFormulario.cliente?.email) {
      const validacionEmail = this.validadores.get('email')(datosFormulario.cliente.email);
      if (validacionEmail !== true) {
        errores.push(validacionEmail);
      }
    }

    if (datosFormulario.presupuesto?.total) {
      const validacionPresupuesto = this.validadores.get('presupuesto')(datosFormulario.presupuesto.total);
      if (validacionPresupuesto !== true) {
        errores.push(validacionPresupuesto);
      }
    }

    return {
      valido: errores.length === 0,
      errores: errores
    };
  }

  /**
   * Genera vista de solo lectura de los datos del pedido
   */
  generarVistaLectura(pedido, departamento) {
    const datosCompletos = pedido.obtenerDatosCompletos();

    return `
      <div class="vista-lectura" data-departamento="${departamento}">
        <div class="resumen-pedido">
          <h3>Pedido ${pedido.id}</h3>
          <div class="meta-pedido">
            <span class="fecha">Creado: ${new Date(pedido.fechaCreacion).toLocaleDateString()}</span>
            <span class="actualizacion">Actualizado: ${new Date(pedido.fechaActualizacion).toLocaleDateString()}</span>
          </div>
        </div>

        <div class="datos-cliente">
          <h4>Cliente</h4>
          <div class="info-grid">
            <div><strong>Nombre:</strong> ${datosCompletos.cliente.nombre}</div>
            <div><strong>Email:</strong> ${datosCompletos.cliente.email}</div>
            <div><strong>Teléfono:</strong> ${datosCompletos.cliente.telefono || 'No especificado'}</div>
            <div><strong>Empresa:</strong> ${datosCompletos.cliente.empresa || 'No especificado'}</div>
          </div>
        </div>

        <div class="datos-pedido">
          <h4>Detalles del Pedido</h4>
          <div class="info-grid">
            <div><strong>Productos:</strong> ${this.formatearProductos(datosCompletos.productos)}</div>
            <div><strong>Especificaciones:</strong> ${datosCompletos.especificaciones}</div>
            <div><strong>Prioridad:</strong> ${this.formatearOpcion(datosCompletos.prioridad)}</div>
            <div><strong>Presupuesto:</strong> ${datosCompletos.presupuesto.total}€</div>
          </div>
        </div>

        <div class="estados-departamentos">
          <h4>Estados por Departamento</h4>
          ${this.generarEstadosDepartamentos(datosCompletos.estados)}
        </div>

        <div class="historial-cambios">
          <h4>Historial de Cambios</h4>
          ${this.generarHistorial(datosCompletos.historial)}
        </div>
      </div>
    `;
  }

  /**
   * Formatea la lista de productos
   */
  formatearProductos(productos) {
    if (!productos || productos.length === 0) return 'No especificados';

    return productos.map(producto =>
      typeof producto === 'string' ? producto : JSON.stringify(producto)
    ).join(', ');
  }

  /**
   * Genera la vista de estados por departamento
   */
  generarEstadosDepartamentos(estados) {
    return Object.entries(estados).map(([departamento, estado]) => {
      if (!estado.estado) return '';

      const fechaCambio = estado.fechaCambio ? new Date(estado.fechaCambio).toLocaleString() : 'N/A';

      return `
        <div class="estado-departamento">
          <div class="dept-header">
            <strong>${this.formatearEstado(departamento)}</strong>
            <span class="estado-badge estado-${estado.estado}">${this.formatearEstado(estado.estado)}</span>
          </div>
          <div class="dept-details">
            <small>Responsable: ${estado.responsable || 'No asignado'}</small>
            <small>Fecha: ${fechaCambio}</small>
          </div>
        </div>
      `;
    }).join('');
  }

  /**
   * Genera el historial de cambios
   */
  generarHistorial(historial) {
    return historial.map(cambio => {
      const fecha = new Date(cambio.fecha).toLocaleString();
      const estadoTexto = cambio.estadoNuevo ?
        `${cambio.estadoAnterior || 'Inicio'} → ${cambio.estadoNuevo}` :
        cambio.observaciones;

      return `
        <div class="historial-item">
          <div class="historial-fecha">${fecha}</div>
          <div class="historial-departamento">${this.formatearEstado(cambio.departamento)}</div>
          <div class="historial-cambio">${estadoTexto}</div>
          <div class="historial-responsable">${cambio.responsable}</div>
          ${cambio.observaciones ? `<div class="historial-observaciones">${cambio.observaciones}</div>` : ''}
        </div>
      `;
    }).join('');
  }

  // Métodos auxiliares para obtener las máquinas de estado
  // (En una implementación real, estos se importarían)
  getMaquinaEstadosComercial() {
    // Simulación - en el código real se importaría MaquinaEstadosComercial
    const { MaquinaEstadosComercial } = require('../state-machines/EstadosComercial.js');
    return MaquinaEstadosComercial;
  }

  getMaquinaEstadosAdmin() {
    const { MaquinaEstadosAdmin } = require('../state-machines/EstadosAdmin.js');
    return MaquinaEstadosAdmin;
  }

  getMaquinaEstadosTaller() {
    const { MaquinaEstadosTaller } = require('../state-machines/EstadosTaller.js');
    return MaquinaEstadosTaller;
  }
}

/**
 * Funciones JavaScript para interactividad del formulario
 * Estas se incluirían en el frontend
 */
export const FormularioInteractivo = {

  /**
   * Inicializa la interactividad del formulario
   */
  inicializar() {
    document.addEventListener('DOMContentLoaded', () => {
      this.configurarValidacionTiempoReal();
      this.configurarManejoCamposArray();
      this.configurarEnvioFormulario();
    });
  },

  /**
   * Configura validación en tiempo real
   */
  configurarValidacionTiempoReal() {
    const campos = document.querySelectorAll('.formulario-dinamico input, .formulario-dinamico select, .formulario-dinamico textarea');

    campos.forEach(campo => {
      campo.addEventListener('blur', (e) => {
        this.validarCampo(e.target);
      });
    });
  },

  /**
   * Valida un campo individual
   */
  validarCampo(campo) {
    const valor = campo.value;
    const nombre = campo.name;
    const errores = [];

    // Validación de campos obligatorios
    if (campo.required && !valor.trim()) {
      errores.push('Este campo es obligatorio');
    }

    // Validaciones específicas por tipo
    if (campo.type === 'email' && valor) {
      const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!regex.test(valor)) {
        errores.push('Email no válido');
      }
    }

    if (campo.type === 'number' && valor) {
      const numero = parseFloat(valor);
      if (isNaN(numero) || numero < 0) {
        errores.push('Debe ser un número válido mayor o igual a 0');
      }
    }

    // Mostrar errores
    this.mostrarErroresCampo(campo, errores);
  },

  /**
   * Muestra errores de validación para un campo
   */
  mostrarErroresCampo(campo, errores) {
    // Limpiar errores anteriores
    const errorExistente = campo.parentNode.querySelector('.error-mensaje');
    if (errorExistente) {
      errorExistente.remove();
    }

    // Agregar clase de error
    campo.classList.toggle('is-invalid', errores.length > 0);
    campo.classList.toggle('is-valid', errores.length === 0 && campo.value.trim());

    // Mostrar nuevos errores
    if (errores.length > 0) {
      const divError = document.createElement('div');
      divError.className = 'error-mensaje text-danger small';
      divError.textContent = errores[0]; // Mostrar solo el primer error
      campo.parentNode.appendChild(divError);
    }
  },

  /**
   * Configura el manejo de campos array
   */
  configurarManejoCamposArray() {
    window.agregarItem = (nombreCampo) => {
      const container = document.querySelector(`[data-field="${nombreCampo}"] .array-items`);
      const items = container.children.length;

      const nuevoItem = document.createElement('div');
      nuevoItem.className = 'array-item';
      nuevoItem.dataset.index = items;
      nuevoItem.innerHTML = `
        <input type="text"
               name="${nombreCampo}[${items}]"
               class="form-control">
        <button type="button" class="btn btn-sm btn-danger" onclick="eliminarItem(this)">×</button>
      `;

      container.appendChild(nuevoItem);
    };

    window.eliminarItem = (boton) => {
      boton.parentNode.remove();
    };
  },

  /**
   * Configura el envío del formulario
   */
  configurarEnvioFormulario() {
    document.addEventListener('submit', (e) => {
      if (e.target.matches('.formulario-campos')) {
        e.preventDefault();
        this.procesarEnvioFormulario(e.target);
      }
    });

    window.cancelarFormulario = () => {
      // Limpiar formulario o regresar a vista anterior
      history.back();
    };
  },

  /**
   * Procesa el envío del formulario
   */
  async procesarEnvioFormulario(formulario) {
    // Validar formulario completo
    if (!this.validarFormularioCompleto(formulario)) {
      return;
    }

    const datosFormulario = new FormData(formulario);
    const departamento = formulario.closest('[data-departamento]').dataset.departamento;
    const estado = formulario.closest('[data-estado]').dataset.estado;

    try {
      // Deshabilitar botón de envío
      const botonEnvio = formulario.querySelector('button[type="submit"]');
      botonEnvio.disabled = true;
      botonEnvio.textContent = 'Procesando...';

      // Construir objeto de datos
      const datos = this.construirObjetoDatos(datosFormulario);

      // Enviar al API
      const respuesta = await this.enviarDatos(departamento, estado, datos);

      if (respuesta.success) {
        this.mostrarMensajeExito('Datos guardados correctamente');
        // Redirigir o actualizar vista
        window.location.reload();
      } else {
        this.mostrarMensajeError(respuesta.error);
      }

    } catch (error) {
      this.mostrarMensajeError('Error al procesar la solicitud');
      console.error('Error:', error);
    }
  },

  /**
   * Valida el formulario completo
   */
  validarFormularioCompleto(formulario) {
    const campos = formulario.querySelectorAll('input, select, textarea');
    let valido = true;

    campos.forEach(campo => {
      this.validarCampo(campo);
      if (campo.classList.contains('is-invalid')) {
        valido = false;
      }
    });

    return valido;
  },

  /**
   * Construye objeto de datos desde FormData
   */
  construirObjetoDatos(formData) {
    const datos = {};

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

    return datos;
  },

  /**
   * Envía datos al API
   */
  async enviarDatos(departamento, estado, datos) {
    const url = `/api/${departamento}/pedidos/${datos.pedidoId || 'nuevo'}/${estado}`;

    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(datos)
    });

    return await response.json();
  },

  /**
   * Muestra mensaje de éxito
   */
  mostrarMensajeExito(mensaje) {
    // Implementar notificación de éxito
    alert(mensaje); // Simplificado para este ejemplo
  },

  /**
   * Muestra mensaje de error
   */
  mostrarMensajeError(mensaje) {
    // Implementar notificación de error
    alert('Error: ' + mensaje); // Simplificado para este ejemplo
  }
};