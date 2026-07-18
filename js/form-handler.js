/**
 * =============================================
 * KARU OVERLAND — Manejador de Formulario
 * Validación, guardado de borrador, envío y analytics
 * Vanilla ES6+ — Sin dependencias
 * =============================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // =============================================
  // 1. DATOS — Códigos de país
  // =============================================
  const COUNTRY_CODES = [
    { code: '+51',  country: 'PE', flag: '🇵🇪', name: 'Perú' },
    { code: '+1',   country: 'US', flag: '🇺🇸', name: 'Estados Unidos' },
    { code: '+44',  country: 'GB', flag: '🇬🇧', name: 'Reino Unido' },
    { code: '+34',  country: 'ES', flag: '🇪🇸', name: 'España' },
    { code: '+33',  country: 'FR', flag: '🇫🇷', name: 'Francia' },
    { code: '+49',  country: 'DE', flag: '🇩🇪', name: 'Alemania' },
    { code: '+55',  country: 'BR', flag: '🇧🇷', name: 'Brasil' },
    { code: '+54',  country: 'AR', flag: '🇦🇷', name: 'Argentina' },
    { code: '+56',  country: 'CL', flag: '🇨🇱', name: 'Chile' },
    { code: '+57',  country: 'CO', flag: '🇨🇴', name: 'Colombia' },
    { code: '+52',  country: 'MX', flag: '🇲🇽', name: 'México' },
    { code: '+81',  country: 'JP', flag: '🇯🇵', name: 'Japón' },
    { code: '+61',  country: 'AU', flag: '🇦🇺', name: 'Australia' },
    { code: '+86',  country: 'CN', flag: '🇨🇳', name: 'China' },
    { code: '+82',  country: 'KR', flag: '🇰🇷', name: 'Corea del Sur' },
  ];

  // =============================================
  // 2. DATOS — Opciones de presupuesto por moneda
  // =============================================
  const BUDGET_OPTIONS = {
    PEN: [
      { value: '100-300',  label: 'S/ 100 — S/ 300' },
      { value: '300-600',  label: 'S/ 300 — S/ 600' },
      { value: '600-1000', label: 'S/ 600 — S/ 1,000' },
      { value: '1000+',    label: 'S/ 1,000+' },
    ],
    USD: [
      { value: '30-80',   label: '$30 — $80' },
      { value: '80-170',  label: '$80 — $170' },
      { value: '170-280', label: '$170 — $280' },
      { value: '280+',    label: '$280+' },
    ],
  };

  // =============================================
  // REFERENCIAS AL DOM
  // =============================================
  const form = document.getElementById('enquiry-form');
  const countryCodeSelect = document.getElementById('country-code');
  const budgetSelect = document.getElementById('budget');
  const destinationSelect = document.getElementById('destination');
  const currencyToggles = document.querySelectorAll('.currency-toggle__btn');
  const honeypotField = form?.querySelector('input[name="website"]');

  // Estado del formulario
  let currentCurrency = 'PEN';
  let formInteracted = false;
  let draftSaveTimer = null;
  const DRAFT_KEY = 'karu_enquiry_draft';
  const DRAFT_SAVE_DEBOUNCE = 1000;

  // =============================================
  // 3. SELECTOR DE CÓDIGO DE PAÍS
  // =============================================
  /**
   * Llena el select de código de país con banderas y códigos.
   * Selecciona Perú (+51) por defecto.
   */
  const initCountryCodeSelector = () => {
    if (!countryCodeSelect) return;

    // Limpiar opciones existentes
    countryCodeSelect.innerHTML = '';

    COUNTRY_CODES.forEach(({ code, flag, name }) => {
      const option = document.createElement('option');
      option.value = code;
      option.textContent = `${flag} ${code} ${name}`;

      // Perú como valor por defecto
      if (code === '+51') option.selected = true;

      countryCodeSelect.appendChild(option);
    });

    // Actualizar indicador visual al cambiar
    countryCodeSelect.addEventListener('change', () => {
      const selected = COUNTRY_CODES.find(c => c.code === countryCodeSelect.value);
      if (selected) {
        // Disparar evento personalizado si hay un indicador visual externo
        countryCodeSelect.dispatchEvent(new CustomEvent('countrychange', {
          detail: selected,
        }));
      }
    });
  };

  // =============================================
  // 4. TOGGLE DE MONEDA (PEN / USD)
  // =============================================
  /**
   * Alterna entre Soles y Dólares.
   * Repuebla el select de presupuesto con los rangos correctos.
   */
  const initCurrencyToggle = () => {
    if (!currencyToggles.length || !budgetSelect) return;

    /** Actualiza las opciones del select de presupuesto */
    const updateBudgetOptions = (currency) => {
      const options = BUDGET_OPTIONS[currency];
      if (!options) return;

      // Guardar selección actual si existe
      const currentValue = budgetSelect.value;

      budgetSelect.innerHTML = '<option value="" disabled selected>Selecciona tu presupuesto</option>';

      options.forEach(({ value, label }) => {
        const option = document.createElement('option');
        option.value = value;
        option.textContent = label;
        budgetSelect.appendChild(option);
      });

      // Intentar restaurar selección (puede no coincidir al cambiar moneda)
      if (currentValue) {
        const matchingOption = Array.from(budgetSelect.options).find(opt => opt.value === currentValue);
        if (matchingOption) matchingOption.selected = true;
      }
    };

    currencyToggles.forEach(btn => {
      btn.addEventListener('click', () => {
        const currency = btn.dataset.currency;
        if (!currency || currency === currentCurrency) return;

        // Actualizar estado activo
        currencyToggles.forEach(b => b.classList.remove('currency-toggle__btn--active'));
        btn.classList.add('currency-toggle__btn--active');

        // Actualizar moneda y opciones
        currentCurrency = currency;
        updateBudgetOptions(currency);
      });
    });

    // Inicializar con PEN
    updateBudgetOptions('PEN');
  };

  // =============================================
  // 5. VALIDACIÓN DE FORMULARIO
  // =============================================

  /** Expresión regular para email válido */
  const EMAIL_REGEX = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

  /** Expresión regular: solo letras, espacios, tildes y ñ */
  const NAME_REGEX = /^[a-zA-ZáéíóúÁÉÍÓÚñÑüÜ\s]+$/;

  /** Expresión regular: solo dígitos */
  const PHONE_REGEX = /^\d{6,15}$/;

  /**
   * Muestra un error en un campo del formulario.
   * @param {HTMLElement} field - Campo con error
   * @param {string} message - Mensaje de error
   */
  const showFieldError = (field, message) => {
    const group = field.closest('.form-group');
    if (!group) return;

    group.classList.add('form-group--error');
    const errorEl = group.querySelector('.form-group__error');
    if (errorEl) {
      errorEl.textContent = message;
      errorEl.style.display = 'block';
    }
  };

  /**
   * Limpia el error de un campo del formulario.
   * @param {HTMLElement} field - Campo a limpiar
   */
  const clearFieldError = (field) => {
    const group = field.closest('.form-group');
    if (!group) return;

    group.classList.remove('form-group--error');
    const errorEl = group.querySelector('.form-group__error');
    if (errorEl) {
      errorEl.textContent = '';
      errorEl.style.display = 'none';
    }
  };

  /**
   * Valida un campo individual.
   * @param {string} fieldId - ID del campo a validar
   * @returns {boolean} - true si es válido
   */
  const validateField = (fieldId) => {
    const field = document.getElementById(fieldId);
    if (!field) return true;

    const value = field.value.trim();
    let isValid = true;
    let errorMessage = '';

    switch (fieldId) {
      case 'name':
        if (!value) {
          isValid = false;
          errorMessage = 'El nombre es obligatorio.';
        } else if (value.length < 2) {
          isValid = false;
          errorMessage = 'El nombre debe tener al menos 2 caracteres.';
        } else if (!NAME_REGEX.test(value)) {
          isValid = false;
          errorMessage = 'Solo se permiten letras y espacios.';
        }
        break;

      case 'email':
        if (!value) {
          isValid = false;
          errorMessage = 'El correo electrónico es obligatorio.';
        } else if (!EMAIL_REGEX.test(value)) {
          isValid = false;
          errorMessage = 'Ingresa un correo electrónico válido.';
        }
        break;

      case 'email-confirm':
        if (!value) {
          isValid = false;
          errorMessage = 'Confirma tu correo electrónico.';
        } else {
          const emailField = document.getElementById('email');
          if (emailField && value !== emailField.value.trim()) {
            isValid = false;
            errorMessage = 'Los correos electrónicos no coinciden.';
          }
        }
        break;

      case 'phone':
        if (!value) {
          isValid = false;
          errorMessage = 'El teléfono es obligatorio.';
        } else if (!PHONE_REGEX.test(value)) {
          isValid = false;
          errorMessage = 'Ingresa un número válido (mínimo 6 dígitos, solo números).';
        }
        break;

      case 'destination':
        // Para select múltiple o simple
        if (field.multiple) {
          const selected = Array.from(field.selectedOptions);
          if (selected.length === 0) {
            isValid = false;
            errorMessage = 'Selecciona al menos un destino.';
          }
        } else {
          if (!value) {
            isValid = false;
            errorMessage = 'Selecciona un destino.';
          }
        }
        break;

      case 'travelers':
        if (!value) {
          isValid = false;
          errorMessage = 'Indica el número de viajeros.';
        }
        break;

      case 'budget':
        if (!value) {
          isValid = false;
          errorMessage = 'Selecciona un rango de presupuesto.';
        }
        break;

      default:
        break;
    }

    if (isValid) {
      clearFieldError(field);
    } else {
      showFieldError(field, errorMessage);
    }

    return isValid;
  };

  /**
   * Valida todos los campos del formulario.
   * @returns {boolean} - true si todos son válidos
   */
  const validateAll = () => {
    const fieldsToValidate = ['name', 'email', 'email-confirm', 'phone', 'destination', 'travelers', 'budget'];
    let allValid = true;

    fieldsToValidate.forEach(fieldId => {
      const isValid = validateField(fieldId);
      if (!isValid) allValid = false;
    });

    return allValid;
  };

  /**
   * Configura validación en tiempo real (al perder foco).
   */
  const initRealTimeValidation = () => {
    if (!form) return;

    const fieldsToValidate = ['name', 'email', 'email-confirm', 'phone', 'destination', 'travelers', 'budget'];

    fieldsToValidate.forEach(fieldId => {
      const field = document.getElementById(fieldId);
      if (!field) return;

      field.addEventListener('blur', () => validateField(fieldId));

      // Para selects, también validar al cambiar
      if (field.tagName === 'SELECT') {
        field.addEventListener('change', () => validateField(fieldId));
      }
    });
  };

  // =============================================
  // 6. HONEYPOT — Protección anti-spam
  // =============================================
  /**
   * Verifica si el campo trampa fue llenado (bot detectado).
   * @returns {boolean} - true si es un bot
   */
  const isBot = () => {
    return honeypotField && honeypotField.value.length > 0;
  };

  // =============================================
  // 7. AUTO-GUARDADO DE BORRADOR
  // =============================================
  /**
   * Guarda automáticamente los valores del formulario
   * en localStorage con un debounce de 1000ms.
   */
  const initDraftAutoSave = () => {
    if (!form) return;

    /** Guarda el borrador en localStorage */
    const saveDraft = () => {
      const formData = {};
      const elements = form.elements;

      for (let i = 0; i < elements.length; i++) {
        const el = elements[i];
        if (!el.name || el.name === 'website' || el.type === 'submit') continue;

        if (el.type === 'select-multiple') {
          formData[el.name] = Array.from(el.selectedOptions).map(opt => opt.value);
        } else if (el.type === 'checkbox') {
          formData[el.name] = el.checked;
        } else if (el.type === 'radio') {
          if (el.checked) formData[el.name] = el.value;
        } else {
          formData[el.name] = el.value;
        }
      }

      // Guardar moneda actual
      formData.__currency = currentCurrency;

      try {
        localStorage.setItem(DRAFT_KEY, JSON.stringify(formData));
        showDraftIndicator();
      } catch (e) {
        // localStorage lleno o no disponible — ignorar silenciosamente
      }
    };

    /** Muestra indicador visual "Borrador guardado" brevemente */
    const showDraftIndicator = () => {
      let indicator = document.querySelector('.draft-indicator');

      if (!indicator) {
        indicator = document.createElement('div');
        indicator.className = 'draft-indicator';
        indicator.textContent = '✓ Borrador guardado';
        indicator.style.cssText = `
          position: fixed;
          bottom: 20px;
          left: 20px;
          background: rgba(16, 185, 129, 0.9);
          color: #fff;
          padding: 8px 16px;
          border-radius: 8px;
          font-size: 0.85rem;
          font-weight: 500;
          z-index: 9999;
          opacity: 0;
          transform: translateY(10px);
          transition: opacity 0.3s ease, transform 0.3s ease;
          backdrop-filter: blur(8px);
          pointer-events: none;
        `;
        document.body.appendChild(indicator);
      }

      // Mostrar
      requestAnimationFrame(() => {
        indicator.style.opacity = '1';
        indicator.style.transform = 'translateY(0)';
      });

      // Ocultar después de 2 segundos
      setTimeout(() => {
        indicator.style.opacity = '0';
        indicator.style.transform = 'translateY(10px)';
      }, 2000);
    };

    /** Restaura el borrador desde localStorage */
    const loadDraft = () => {
      try {
        const draft = localStorage.getItem(DRAFT_KEY);
        if (!draft) return;

        const formData = JSON.parse(draft);

        // Restaurar moneda primero (afecta opciones de presupuesto)
        if (formData.__currency && formData.__currency !== currentCurrency) {
          const currencyBtn = document.querySelector(`.currency-toggle__btn[data-currency="${formData.__currency}"]`);
          if (currencyBtn) currencyBtn.click();
        }

        const elements = form.elements;

        for (let i = 0; i < elements.length; i++) {
          const el = elements[i];
          if (!el.name || el.name === 'website' || el.type === 'submit') continue;
          if (!(el.name in formData)) continue;

          if (el.type === 'select-multiple') {
            const values = formData[el.name];
            if (Array.isArray(values)) {
              Array.from(el.options).forEach(opt => {
                opt.selected = values.includes(opt.value);
              });
            }
          } else if (el.type === 'checkbox') {
            el.checked = formData[el.name];
          } else if (el.type === 'radio') {
            el.checked = el.value === formData[el.name];
          } else {
            el.value = formData[el.name];
          }
        }

        // Actualizar tags de destinos si aplica
        if (destinationSelect?.multiple) {
          updateDestinationTags();
        }
      } catch (e) {
        // Borrador corrupto — limpiar
        localStorage.removeItem(DRAFT_KEY);
      }
    };

    /** Limpia el borrador */
    const clearDraft = () => {
      localStorage.removeItem(DRAFT_KEY);
    };

    // Escuchar cambios en el formulario (debounced)
    form.addEventListener('input', () => {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = setTimeout(saveDraft, DRAFT_SAVE_DEBOUNCE);
    });

    form.addEventListener('change', () => {
      clearTimeout(draftSaveTimer);
      draftSaveTimer = setTimeout(saveDraft, DRAFT_SAVE_DEBOUNCE);
    });

    // Botón "Borrar borrador"
    const clearDraftLink = document.querySelector('.clear-draft');
    if (clearDraftLink) {
      clearDraftLink.addEventListener('click', (e) => {
        e.preventDefault();
        clearDraft();
        form.reset();

        // Reiniciar moneda a PEN
        currentCurrency = 'PEN';
        currencyToggles.forEach(btn => {
          btn.classList.toggle('currency-toggle__btn--active', btn.dataset.currency === 'PEN');
        });
        initCurrencyToggle();

        // Limpiar tags de destinos
        const tagsContainer = document.querySelector('.destination-tags');
        if (tagsContainer) tagsContainer.innerHTML = '';

        // Limpiar todos los errores
        form.querySelectorAll('.form-group--error').forEach(group => {
          group.classList.remove('form-group--error');
          const errorEl = group.querySelector('.form-group__error');
          if (errorEl) {
            errorEl.textContent = '';
            errorEl.style.display = 'none';
          }
        });

        // Mostrar indicador de borrador borrado
        let indicator = document.querySelector('.draft-indicator');
        if (indicator) {
          indicator.textContent = '🗑️ Borrador eliminado';
          indicator.style.background = 'rgba(239, 68, 68, 0.9)';
          indicator.style.opacity = '1';
          indicator.style.transform = 'translateY(0)';
          setTimeout(() => {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translateY(10px)';
            setTimeout(() => {
              indicator.style.background = 'rgba(16, 185, 129, 0.9)';
              indicator.textContent = '✓ Borrador guardado';
            }, 300);
          }, 2000);
        }
      });
    }

    // Exponer clearDraft para uso externo
    window.__karuClearDraft = clearDraft;

    // Cargar borrador al iniciar
    loadDraft();
  };

  // =============================================
  // 8. ENVÍO DEL FORMULARIO
  // =============================================
  const initFormSubmission = () => {
    if (!form) return;

    form.addEventListener('submit', (e) => {
      e.preventDefault();

      // --- Paso 1: Verificar honeypot ---
      if (isBot()) {
        // Mostrar éxito falso para no alertar al bot
        showSubmitMessage('success', '¡Gracias por tu interés! 🎉 Un experto de Karu Overland te contactará en las próximas 24 horas.');
        form.reset();
        return;
      }

      // --- Paso 2: Validar todos los campos ---
      const isValid = validateAll();

      if (!isValid) {
        // Scroll al primer campo con error
        const firstError = form.querySelector('.form-group--error');
        if (firstError) {
          const offset = 100;
          const targetPos = firstError.getBoundingClientRect().top + window.scrollY - offset;
          window.scrollTo({ top: targetPos, behavior: 'smooth' });
        }
        return;
      }

      // --- Paso 3: Preparar envío ---
      const submitBtn = form.querySelector('[type="submit"]');
      const originalBtnText = submitBtn ? submitBtn.textContent : '';

      // Deshabilitar botón y mostrar spinner
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `
          <span class="spinner" style="
            display: inline-block;
            width: 16px;
            height: 16px;
            border: 2px solid rgba(255,255,255,0.3);
            border-top-color: #fff;
            border-radius: 50%;
            animation: spin 0.6s linear infinite;
            margin-right: 8px;
            vertical-align: middle;
          "></span>
          Enviando...
        `;

        // Inyectar keyframes si no existen
        if (!document.getElementById('spinner-keyframes')) {
          const style = document.createElement('style');
          style.id = 'spinner-keyframes';
          style.textContent = '@keyframes spin { to { transform: rotate(360deg); } }';
          document.head.appendChild(style);
        }
      }

      // --- Paso 4: Recopilar datos ---
      const formData = collectFormData();

      // --- Paso 5: Enviar datos con Fetch API ---
      fetch('send_mail.php', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone,
          country: formData.country,
          package: formData.destination,
          date: `${formData.travel_month}/${formData.travel_year}`,
          passengers: formData.travelers,
          pets: formData.pet_friendly,
          budget: formData.budget,
          message: formData.comments,
          source: formData.source
        })
      })
      .then(response => {
        if (!response.ok) throw new Error('Error en el servidor');
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // Mostrar mensaje de éxito
          showSubmitMessage('success', data.message);

          // Resetear formulario
          form.reset();

          // Limpiar tags de destinos
          const tagsContainer = document.querySelector('.destination-tags');
          if (tagsContainer) tagsContainer.innerHTML = '';

          // Limpiar borrador
          if (window.__karuClearDraft) window.__karuClearDraft();

          // Limpiar errores visuales
          form.querySelectorAll('.form-group--error').forEach(group => {
            group.classList.remove('form-group--error');
            const errorEl = group.querySelector('.form-group__error');
            if (errorEl) {
              errorEl.textContent = '';
              errorEl.style.display = 'none';
            }
          });

          // Analytics: envío exitoso
          pushDataLayer({
            event: 'form_submit',
            form_name: 'enquiry',
            destination: formData.destination,
          });

          // Re-habilitar botón después de 3 segundos
          setTimeout(() => {
            if (submitBtn) {
              submitBtn.disabled = false;
              submitBtn.textContent = originalBtnText;
            }
          }, 3000);
        } else {
          throw new Error(data.message || 'Error desconocido');
        }
      })
      .catch(error => {
        console.error('Error al enviar formulario:', error);
        // Mostrar mensaje de error
        showSubmitMessage('error', 'Hubo un error al enviar tu consulta. Por favor, intenta de nuevo o contáctanos por WhatsApp.');

        // Re-habilitar botón inmediatamente
        if (submitBtn) {
          submitBtn.disabled = false;
          submitBtn.textContent = originalBtnText;
        }
      });
    });
  };

  /**
   * Recopila todos los datos del formulario en un objeto.
   * @returns {Object} - Datos del formulario
   */
  const collectFormData = () => {
    const data = {};
    const elements = form.elements;

    for (let i = 0; i < elements.length; i++) {
      const el = elements[i];
      if (!el.name || el.name === 'website' || el.type === 'submit') continue;

      if (el.type === 'select-multiple') {
        data[el.name] = Array.from(el.selectedOptions).map(opt => opt.value);
      } else if (el.type === 'checkbox') {
        data[el.name] = el.checked;
      } else if (el.type === 'radio') {
        if (el.checked) data[el.name] = el.value;
      } else {
        data[el.name] = el.value;
      }
    }

    // Añadir metadatos
    data.__currency = currentCurrency;
    data.__countryCode = countryCodeSelect?.value || '+51';
    data.__timestamp = new Date().toISOString();

    return data;
  };

  /**
   * Muestra un mensaje de éxito o error después del envío.
   * @param {string} type - 'success' o 'error'
   * @param {string} message - Texto del mensaje
   */
  const showSubmitMessage = (type, message) => {
    // Eliminar mensaje previo si existe
    const existingMsg = form.parentElement.querySelector('.submit-message');
    if (existingMsg) existingMsg.remove();

    const msgEl = document.createElement('div');
    msgEl.className = `submit-message submit-message--${type}`;
    msgEl.style.cssText = `
      padding: 16px 20px;
      border-radius: 12px;
      margin-top: 16px;
      font-size: 0.95rem;
      line-height: 1.5;
      font-weight: 500;
      opacity: 0;
      max-height: 0;
      overflow: hidden;
      transition: opacity 0.4s ease, max-height 0.4s ease, padding 0.4s ease, margin 0.4s ease;
      ${type === 'success'
        ? 'background: linear-gradient(135deg, rgba(16,185,129,0.15), rgba(5,150,105,0.1)); color: #065f46; border: 1px solid rgba(16,185,129,0.3);'
        : 'background: linear-gradient(135deg, rgba(239,68,68,0.15), rgba(220,38,38,0.1)); color: #991b1b; border: 1px solid rgba(239,68,68,0.3);'
      }
    `;
    msgEl.textContent = message;

    // Insertar después del formulario
    form.parentElement.insertBefore(msgEl, form.nextSibling);

    // Animar entrada (slide down)
    requestAnimationFrame(() => {
      msgEl.style.opacity = '1';
      msgEl.style.maxHeight = '200px';
    });

    // Auto-ocultar después de 8 segundos
    setTimeout(() => {
      msgEl.style.opacity = '0';
      msgEl.style.maxHeight = '0';
      msgEl.style.padding = '0 20px';
      msgEl.style.margin = '0';
      setTimeout(() => msgEl.remove(), 400);
    }, 8000);
  };

  // =============================================
  // 9. EVENTOS DE ANALYTICS
  // =============================================
  /**
   * Envía eventos al dataLayer de Google Tag Manager.
   * Crea el array si no existe.
   */
  const pushDataLayer = (data) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  };

  const initAnalytics = () => {
    if (!form) return;

    // Primera interacción con el formulario
    form.addEventListener('focusin', () => {
      if (!formInteracted) {
        formInteracted = true;
        pushDataLayer({ event: 'form_start' });
      }
    }, { once: true });

    // Clic en WhatsApp (delegado)
    document.addEventListener('click', (e) => {
      if (e.target.closest('.whatsapp-float')) {
        pushDataLayer({ event: 'whatsapp_click' });
      }
    });

    // Clic en teléfono (delegado)
    document.addEventListener('click', (e) => {
      if (e.target.closest('a[href^="tel:"]')) {
        pushDataLayer({ event: 'phone_click' });
      }
    });
  };

  // =============================================
  // 10. MULTI-SELECT DE DESTINOS — Mejora visual
  // =============================================
  /**
   * Si #destination es un <select multiple>, se mejora
   * mostrando las selecciones como tags/badges removibles.
   */
  const initDestinationMultiSelect = () => {
    if (!destinationSelect || !destinationSelect.multiple) return;

    // Crear contenedor de tags si no existe
    let tagsContainer = destinationSelect.parentElement.querySelector('.destination-tags');
    if (!tagsContainer) {
      tagsContainer = document.createElement('div');
      tagsContainer.className = 'destination-tags';
      tagsContainer.style.cssText = `
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 8px;
      `;
      destinationSelect.parentElement.appendChild(tagsContainer);
    }

    /** Actualiza los tags visibles según opciones seleccionadas */
    const updateDestinationTags = () => {
      tagsContainer.innerHTML = '';

      Array.from(destinationSelect.selectedOptions).forEach(option => {
        const tag = document.createElement('span');
        tag.className = 'destination-tag';
        tag.style.cssText = `
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 4px 12px;
          background: var(--color-primary, #0ea5e9);
          color: #fff;
          border-radius: 20px;
          font-size: 0.8rem;
          font-weight: 500;
          cursor: default;
          animation: tagIn 0.2s ease;
        `;

        const text = document.createTextNode(option.textContent);
        tag.appendChild(text);

        // Botón de eliminar (×)
        const removeBtn = document.createElement('button');
        removeBtn.type = 'button';
        removeBtn.className = 'destination-tag__remove';
        removeBtn.textContent = '×';
        removeBtn.setAttribute('aria-label', `Eliminar ${option.textContent}`);
        removeBtn.style.cssText = `
          background: none;
          border: none;
          color: rgba(255,255,255,0.8);
          font-size: 1rem;
          cursor: pointer;
          padding: 0;
          line-height: 1;
          font-weight: 700;
          transition: color 0.2s ease;
        `;

        removeBtn.addEventListener('mouseenter', () => {
          removeBtn.style.color = '#fff';
        });

        removeBtn.addEventListener('mouseleave', () => {
          removeBtn.style.color = 'rgba(255,255,255,0.8)';
        });

        removeBtn.addEventListener('click', () => {
          option.selected = false;
          updateDestinationTags();
          // Disparar evento change para validación y guardado
          destinationSelect.dispatchEvent(new Event('change', { bubbles: true }));
        });

        tag.appendChild(removeBtn);
        tagsContainer.appendChild(tag);
      });
    };

    // Inyectar animación de tags si no existe
    if (!document.getElementById('tag-keyframes')) {
      const style = document.createElement('style');
      style.id = 'tag-keyframes';
      style.textContent = `
        @keyframes tagIn {
          from { opacity: 0; transform: scale(0.8); }
          to { opacity: 1; transform: scale(1); }
        }
      `;
      document.head.appendChild(style);
    }

    // Escuchar cambios en el select
    destinationSelect.addEventListener('change', updateDestinationTags);

    // Exponer para uso externo (restaurar borrador)
    window.updateDestinationTags = updateDestinationTags;

    // Inicializar tags actuales
    updateDestinationTags();
  };

  // =============================================
  // INICIALIZACIÓN GENERAL
  // =============================================
  initCountryCodeSelector();
  initCurrencyToggle();
  initRealTimeValidation();
  initDraftAutoSave();
  initFormSubmission();
  initAnalytics();
  initDestinationMultiSelect();

}); // Fin DOMContentLoaded
