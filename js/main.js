/**
 * =============================================
 * KARU OVERLAND — Script Principal
 * Turismo premium desde Huaraz, Áncash, Perú
 * Vanilla ES6+ — Sin dependencias
 * =============================================
 */

document.addEventListener('DOMContentLoaded', () => {
  'use strict';

  // =============================================
  // 1. REFERENCIAS AL DOM (cacheadas)
  // =============================================
  const navbar = document.querySelector('.navbar');
  const navbarToggle = document.querySelector('.navbar__toggle');
  const navbarMenu = document.querySelector('.navbar__menu');
  const heroVideo = document.getElementById('hero-video');
  const lightboxEl = document.querySelector('.lightbox');
  const scrollProgress = document.querySelector('.scroll-progress');
  const currentYearEl = document.getElementById('current-year');

  // =============================================
  // 2. NAVBAR — Comportamiento al hacer scroll
  // =============================================
  /**
   * Añade clase .navbar--scrolled cuando el usuario
   * desplaza más de 80px. Usa requestAnimationFrame
   * para throttlear y un listener pasivo.
   */
  (() => {
    if (!navbar) return;

    const SCROLL_THRESHOLD = 80;
    let ticking = false;

    const updateNavbar = () => {
      const scrollY = window.scrollY || window.pageYOffset;

      if (scrollY > SCROLL_THRESHOLD) {
        navbar.classList.add('navbar--scrolled');
      } else {
        navbar.classList.remove('navbar--scrolled');
      }

      ticking = false;
    };

    window.addEventListener('scroll', () => {
      if (!ticking) {
        requestAnimationFrame(updateNavbar);
        ticking = true;
      }
    }, { passive: true });
  })();

  // =============================================
  // 3. MENÚ MÓVIL — Toggle y cierre
  // =============================================
  /**
   * Abre/cierra el menú móvil con la clase .navbar--open.
   * Cierra al hacer clic en un enlace del menú o fuera de él.
   * Bloquea el scroll del body cuando está abierto.
   */
  (() => {
    if (!navbar || !navbarToggle) return;

    const menuLinks = navbar.querySelectorAll('.navbar__menu a');

    /** Alterna el estado del menú móvil */
    const toggleMenu = (forceClose = false) => {
      if (forceClose) {
        navbar.classList.remove('navbar--open');
      } else {
        navbar.classList.toggle('navbar--open');
      }

      // Bloquear/desbloquear scroll del body
      const isOpen = navbar.classList.contains('navbar--open');
      document.body.style.overflow = isOpen ? 'hidden' : '';
    };

    // Botón hamburguesa
    navbarToggle.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleMenu();
    });

    // Cerrar al hacer clic en cualquier enlace del menú
    menuLinks.forEach(link => {
      link.addEventListener('click', () => toggleMenu(true));
    });

    // Cerrar al hacer clic fuera del menú
    document.addEventListener('click', (e) => {
      if (!navbar.classList.contains('navbar--open')) return;
      if (!navbarMenu?.contains(e.target) && !navbarToggle.contains(e.target)) {
        toggleMenu(true);
      }
    });
  })();

  // =============================================
  // 4. ANIMACIONES AL SCROLL (IntersectionObserver)
  // =============================================
  /**
   * Observa elementos con .animate-on-scroll y les
   * añade .is-visible cuando entran al viewport.
   * Solo se anima una vez (unobserve después).
   */
  (() => {
    const animatedElements = document.querySelectorAll('.animate-on-scroll');
    if (!animatedElements.length) return;

    const observerOptions = {
      threshold: 0.15,
      rootMargin: '0px 0px -50px 0px',
    };

    const animationObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // Solo animar una vez
        }
      });
    }, observerOptions);

    animatedElements.forEach(el => animationObserver.observe(el));
  })();

  // =============================================
  // 5. SMOOTH SCROLL — Desplazamiento suave
  // =============================================
  /**
   * Todos los enlaces ancla (#) hacen scroll suave
   * hasta su destino, compensando la altura del navbar (80px).
   * Cierra el menú móvil si está abierto.
   */
  (() => {
    const NAVBAR_OFFSET = 80;
    const anchorLinks = document.querySelectorAll('a[href^="#"]');

    anchorLinks.forEach(link => {
      link.addEventListener('click', (e) => {
        const href = link.getAttribute('href');
        if (href === '#' || href.length <= 1) return;

        const target = document.querySelector(href);
        if (!target) return;

        e.preventDefault();

        // Cerrar menú móvil si está abierto
        if (navbar?.classList.contains('navbar--open')) {
          navbar.classList.remove('navbar--open');
          document.body.style.overflow = '';
        }

        // Calcular posición destino con offset
        const targetPosition = target.getBoundingClientRect().top + window.scrollY - NAVBAR_OFFSET;

        window.scrollTo({
          top: targetPosition,
          behavior: 'smooth',
        });
      });
    });
  })();

  // =============================================
  // 6. HERO VIDEO — Control de reproducción
  // =============================================
  /**
   * Controla el video del hero:
   * - Intenta reproducir al cargar
   * - Pausa cuando el hero no es visible (IntersectionObserver)
   * - En móvil (<768px), muestra solo el poster para ahorrar datos
   */
  (() => {
    if (!heroVideo) return;

    // Video optimizado (2.3MB) - reproducir en todos los dispositivos

        heroVideo.muted = true;

    // Intentar reproducir al cargar
    const playPromise = heroVideo.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Autoplay bloqueado por el navegador — silenciar y reintentar
        heroVideo.muted = true;
        heroVideo.play().catch(() => {});
      });
    }

    // Pausar/reproducir según visibilidad del hero
    const heroSection = heroVideo.closest('.hero') || heroVideo.parentElement;

    const videoObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          heroVideo.play().catch(() => {});
        } else {
          heroVideo.pause();
        }
      });
    }, { threshold: 0.25 });

    videoObserver.observe(heroSection);
  })();

  // =============================================
  // 7. GALERÍA LIGHTBOX — Premium con panel de descripción
  // =============================================
  /**
   * Lightbox premium con:
   * - Panel inferior con nombre, descripción, meta e iconos
   * - Apertura al clic en [data-lightbox] con datos en data-*
   * - Navegación con flechas, teclado y swipe táctil
   * - Cierre con botón X, backdrop o Escape
   * - Transiciones suaves entre imágenes
   */
  (() => {
    if (!lightboxEl) return;

    const lightboxImage = lightboxEl.querySelector('#lightbox-image');
    const lightboxClose = lightboxEl.querySelector('#lightbox-close');
    const lightboxPrev = lightboxEl.querySelector('#lightbox-prev');
    const lightboxNext = lightboxEl.querySelector('#lightbox-next');
    const lightboxBackdrop = lightboxEl.querySelector('#lightbox-backdrop');
    const lightboxTitle = lightboxEl.querySelector('#lightbox-title');
    const lightboxDesc = lightboxEl.querySelector('#lightbox-desc');
    const lightboxMeta = lightboxEl.querySelector('#lightbox-meta');
    const lightboxCounter = lightboxEl.querySelector('#lightbox-counter');
    const lightboxBadge = lightboxEl.querySelector('#lightbox-badge');

    if (!lightboxImage) return;

    let lightboxItems = []; // Array de { src, title, desc, difficulty, duration, badge }
    let currentIndex = 0;
    let touchStartX = 0;
    let touchStartY = 0;
    let touchEndX = 0;
    const SWIPE_THRESHOLD = 45;

    /** Recopila todas las imágenes y su metadata del lightbox */
    const collectItems = () => {
      const triggers = document.querySelectorAll('[data-lightbox]');
      lightboxItems = Array.from(triggers).map(el => {
        const imgEl = el.tagName === 'IMG' ? el : el.querySelector('img');
        const src = el.dataset.lightbox && el.dataset.lightbox !== 'true'
          ? el.dataset.lightbox
          : (imgEl?.src || '');
        return {
          src,
          title: el.dataset.title || imgEl?.alt || 'Karu Overland',
          desc: el.dataset.desc || '',
          difficulty: el.dataset.difficulty || '',
          duration: el.dataset.duration || '',
          badge: el.dataset.badge || 'Karu Overland',
        };
      }).filter(item => item.src);
    };

    /** Actualiza el panel de información */
    const updateInfoPanel = (item, index) => {
      if (lightboxTitle) lightboxTitle.textContent = item.title;
      if (lightboxDesc) {
        lightboxDesc.textContent = item.desc;
        lightboxDesc.style.display = item.desc ? 'block' : 'none';
      }
      if (lightboxBadge) lightboxBadge.textContent = item.badge;
      if (lightboxCounter && lightboxItems.length > 1) {
        lightboxCounter.textContent = `${index + 1} / ${lightboxItems.length}`;
      }
      if (lightboxMeta) {
        const metas = [];
        if (item.difficulty) metas.push(`<span><i class="fas fa-signal"></i>${item.difficulty}</span>`);
        if (item.duration) metas.push(`<span><i class="fas fa-clock"></i>${item.duration}</span>`);
        lightboxMeta.innerHTML = metas.join('');
      }
    };

    /** Muestra el item en el índice especificado con transición */
    const showItem = (index) => {
      if (index < 0 || index >= lightboxItems.length) return;
      currentIndex = index;
      const item = lightboxItems[currentIndex];

      lightboxImage.classList.add('is-loading');

      setTimeout(() => {
        lightboxImage.src = item.src;
        lightboxImage.alt = item.title;
        updateInfoPanel(item, currentIndex);
      }, 180);

      lightboxImage.onload = () => {
        lightboxImage.classList.remove('is-loading');
      };

      pushDataLayer({ event: 'gallery_view', image: item.src, title: item.title });
    };

    /** Abre el lightbox mostrando el item clicado */
    const openLightbox = (trigger) => {
      collectItems();

      const imgEl = trigger.tagName === 'IMG' ? trigger : trigger.querySelector('img');
      const srcToMatch = trigger.dataset.lightbox && trigger.dataset.lightbox !== 'true'
        ? trigger.dataset.lightbox
        : (imgEl?.src || '');

      currentIndex = lightboxItems.findIndex(item => item.src === srcToMatch);
      if (currentIndex === -1) currentIndex = 0;

      const item = lightboxItems[currentIndex];
      lightboxImage.src = item.src;
      lightboxImage.alt = item.title;
      updateInfoPanel(item, currentIndex);

      lightboxEl.classList.add('lightbox--open');
      document.body.style.overflow = 'hidden';

      pushDataLayer({ event: 'gallery_open', image: item.src });
    };

    /** Cierra el lightbox */
    const closeLightbox = () => {
      lightboxEl.classList.remove('lightbox--open');
      document.body.style.overflow = '';
      setTimeout(() => { lightboxImage.src = ''; }, 350);
    };

    const prevItem = () => showItem(currentIndex > 0 ? currentIndex - 1 : lightboxItems.length - 1);
    const nextItem = () => showItem(currentIndex < lightboxItems.length - 1 ? currentIndex + 1 : 0);

    // --- Event Listeners ---

    // Abrir al clic en [data-lightbox]
    document.addEventListener('click', (e) => {
      const trigger = e.target.closest('[data-lightbox]');
      if (!trigger) return;
      e.preventDefault();
      openLightbox(trigger);
    });

    // Cerrar: botón X
    lightboxClose?.addEventListener('click', closeLightbox);

    // Cerrar: clic en backdrop
    lightboxBackdrop?.addEventListener('click', closeLightbox);

    // Navegación: botones prev/next
    lightboxPrev?.addEventListener('click', (e) => { e.stopPropagation(); prevItem(); });
    lightboxNext?.addEventListener('click', (e) => { e.stopPropagation(); nextItem(); });

    // Navegación: teclado
    document.addEventListener('keydown', (e) => {
      if (!lightboxEl.classList.contains('lightbox--open')) return;
      if (e.key === 'Escape') closeLightbox();
      if (e.key === 'ArrowLeft') prevItem();
      if (e.key === 'ArrowRight') nextItem();
    });

    // Swipe táctil
    lightboxEl.addEventListener('touchstart', (e) => {
      touchStartX = e.changedTouches[0].screenX;
      touchStartY = e.changedTouches[0].screenY;
    }, { passive: true });

    lightboxEl.addEventListener('touchend', (e) => {
      touchEndX = e.changedTouches[0].screenX;
      const diffX = touchStartX - touchEndX;
      const diffY = Math.abs(touchStartY - e.changedTouches[0].screenY);

      // Solo horizontal swipes (ignorar scroll vertical)
      if (diffY > Math.abs(diffX) || Math.abs(diffX) < SWIPE_THRESHOLD) return;
      if (diffX > 0) nextItem(); else prevItem();
    }, { passive: true });
  })();


  // =============================================
  // 8. CARRUSEL DE TESTIMONIOS
  // =============================================
  /**
   * Carrusel con rotación automática cada 5s.
   * Dots de navegación, pausa al hover.
   * Si solo hay 1 testimonio, se ocultan los dots.
   */
  (() => {
    const container = document.querySelector('.testimonials');
    if (!container) return;

    const items = container.querySelectorAll('.testimonials__item');
    const dots = container.querySelectorAll('.testimonials__dot');

    // Si solo hay 1 testimonio, no rotar
    if (items.length <= 1) {
      dots.forEach(dot => dot.style.display = 'none');
      if (items.length === 1) items[0].classList.add('testimonials__item--active');
      return;
    }

    let currentSlide = 0;
    let autoRotateInterval = null;
    const ROTATE_DELAY = 5000;

    /** Muestra el testimonio en el índice indicado */
    const showSlide = (index) => {
      // Normalizar índice
      currentSlide = ((index % items.length) + items.length) % items.length;

      // Actualizar items
      items.forEach((item, i) => {
        item.classList.toggle('testimonials__item--active', i === currentSlide);
      });

      // Actualizar dots
      dots.forEach((dot, i) => {
        dot.classList.toggle('testimonials__dot--active', i === currentSlide);
      });
    };

    /** Inicia la rotación automática */
    const startAutoRotate = () => {
      stopAutoRotate();
      autoRotateInterval = setInterval(() => {
        showSlide(currentSlide + 1);
      }, ROTATE_DELAY);
    };

    /** Detiene la rotación automática */
    const stopAutoRotate = () => {
      if (autoRotateInterval) {
        clearInterval(autoRotateInterval);
        autoRotateInterval = null;
      }
    };

    // Clic en dots
    dots.forEach((dot, i) => {
      dot.addEventListener('click', () => {
        showSlide(i);
        startAutoRotate(); // Reiniciar temporizador
      });
    });

    // Pausar al hover, reanudar al salir
    container.addEventListener('mouseenter', stopAutoRotate);
    container.addEventListener('mouseleave', startAutoRotate);

    // Inicializar
    showSlide(0);
    startAutoRotate();
  })();

  // =============================================
  // 9. ANIMACIÓN DE CONTADORES
  // =============================================
  /**
   * Anima números de 0 al valor en [data-count].
   * Duración: 2000ms con requestAnimationFrame.
   * Sufijo '+' opcional con data-suffix='+'.
   * Se activa una sola vez al entrar en viewport.
   */
  (() => {
    const counters = document.querySelectorAll('[data-count]');
    if (!counters.length) return;

    const DURATION = 2000; // milisegundos

    /** Anima un contador individual */
    const animateCounter = (element) => {
      const target = parseInt(element.dataset.count, 10);
      const suffix = element.dataset.suffix || '';
      const startTime = performance.now();

      const updateCount = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / DURATION, 1);

        // Easing: ease-out cubic
        const easedProgress = 1 - Math.pow(1 - progress, 3);
        const currentValue = Math.floor(easedProgress * target);

        element.textContent = currentValue.toLocaleString('es-PE') + suffix;

        if (progress < 1) {
          requestAnimationFrame(updateCount);
        } else {
          // Asegurar valor final exacto
          element.textContent = target.toLocaleString('es-PE') + suffix;
        }
      };

      requestAnimationFrame(updateCount);
    };

    const counterObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          animateCounter(entry.target);
          observer.unobserve(entry.target); // Solo una vez
        }
      });
    }, { threshold: 0.5 });

    counters.forEach(counter => counterObserver.observe(counter));
  })();

  // =============================================
  // 10. LAZY LOADING — Mejora progresiva
  // =============================================
  /**
   * Fallback para navegadores sin soporte nativo de loading='lazy'.
   * Usa IntersectionObserver para intercambiar data-src → src.
   * Añade .loaded al completar la carga.
   */
  (() => {
    // Si el navegador soporta lazy loading nativo, solo añadir clase .loaded
    if ('loading' in HTMLImageElement.prototype) {
      document.querySelectorAll('img[loading="lazy"]').forEach(img => {
        if (img.complete) {
          img.classList.add('loaded');
        } else {
          img.addEventListener('load', () => img.classList.add('loaded'), { once: true });
        }
      });
      return;
    }

    // Fallback: IntersectionObserver para imágenes con data-src
    const lazyImages = document.querySelectorAll('img[data-src]');
    if (!lazyImages.length) return;

    const lazyObserver = new IntersectionObserver((entries, observer) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;

        const img = entry.target;
        img.src = img.dataset.src;

        // También intercambiar srcset si existe
        if (img.dataset.srcset) {
          img.srcset = img.dataset.srcset;
        }

        img.addEventListener('load', () => {
          img.classList.add('loaded');
          img.removeAttribute('data-src');
          img.removeAttribute('data-srcset');
        }, { once: true });

        observer.unobserve(img);
      });
    }, {
      rootMargin: '200px 0px', // Cargar un poco antes de entrar al viewport
    });

    lazyImages.forEach(img => lazyObserver.observe(img));
  })();

  // =============================================
  // 11. AÑO ACTUAL — Footer
  // =============================================
  if (currentYearEl) {
    currentYearEl.textContent = new Date().getFullYear();
  }

  // =============================================
  // 12. INDICADOR DE PROGRESO DE SCROLL
  // =============================================
  /**
   * Barra de progreso visual que muestra cuánto
   * ha scrolleado el usuario. Usa scaleX para rendimiento.
   */
  (() => {
    if (!scrollProgress) return;

    // Configurar estilos iniciales
    scrollProgress.style.transformOrigin = 'left';
    scrollProgress.style.transform = 'scaleX(0)';
    scrollProgress.style.willChange = 'transform';

    let progressTicking = false;

    const updateProgress = () => {
      const scrollTop = window.scrollY || window.pageYOffset;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;

      if (docHeight > 0) {
        const scrollPercent = Math.min(scrollTop / docHeight, 1);
        scrollProgress.style.transform = `scaleX(${scrollPercent})`;
      }

      progressTicking = false;
    };

    window.addEventListener('scroll', () => {
      if (!progressTicking) {
        requestAnimationFrame(updateProgress);
        progressTicking = true;
      }
    }, { passive: true });
  })();

  // =============================================
  // UTILIDADES GLOBALES
  // =============================================

  /**
   * Empuja eventos al dataLayer de Google Tag Manager.
   * Crea el array si no existe.
   * @param {Object} data - Objeto de datos del evento
   */
  window.pushDataLayer = (data) => {
    window.dataLayer = window.dataLayer || [];
    window.dataLayer.push(data);
  };

  // --- Eventos de analytics delegados ---

  // Clic en botón de WhatsApp
  document.addEventListener('click', (e) => {
    if (e.target.closest('.whatsapp-float')) {
      pushDataLayer({ event: 'whatsapp_click' });
    }
  });

  // Clic en enlace de teléfono
  document.addEventListener('click', (e) => {
    const phoneLink = e.target.closest('a[href^="tel:"]');
    if (phoneLink) {
      pushDataLayer({ event: 'phone_click' });
    }
  });
  // =============================================
  // 12. PACKAGE MODALS DATA & LOGIC
  // =============================================
  const isEnglish = window.location.pathname.includes('/en/');

  const packagesData = {
    'pkg-1': {
      gallery: ['pkg1/KOB04050.webp', 'pkg1/KOB04053.webp'],
      title: isEnglish ? 'Sunrise at Lake Radián' : 'Amanecer en Laguna Radián',
      subtitle: isEnglish ? 'First light in the Andes' : 'Primera luz en los Andes',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d125916.12458428178!2d-77.58434698889163!3d-9.52928509311681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a8e52c80cde5d3%3A0x539fc4f191b7027b!2sLaguna%20Radi%C3%A1n!3m2!1d-9.4795325!2d-77.491325!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: '3:30 a. m.', desc: 'Pickup and departure from Huaraz in private transport.' },
        { time: '4:15 a. m.', desc: 'Arrival at Recrish. Headlamp delivery, safety instructions.' },
        { time: '4:30 a. m.', desc: 'Start of night hike with guide.' },
        { time: '6:15 – 6:45 a. m.', desc: 'Arrival at Lake Radián. Locate a safe spot for sunrise.' },
        { time: '6:30 – 7:15 a. m.', desc: 'Sunrise observation over the Cordillera Blanca, photos.' },
        { time: '7:15 – 8:00 a. m.', desc: 'Hot/cold box lunch breakfast by the lake.' },
        { time: '8:00 – 9:15 a. m.', desc: 'Guided walk around the surroundings, flora interpretation.' },
        { time: '9:15 – 10:00 a. m.', desc: 'Visit to a natural viewpoint and group photo session.' },
        { time: '10:00 a. m.', desc: 'Start descent to Recrish.' },
        { time: '1:30 – 2:00 p. m.', desc: 'Approximate return to Huaraz.' }
      ] : [
        { time: '3:30 a. m.', desc: 'Recojo y salida desde Huaraz en transporte turístico privado.' },
        { time: '4:15 a. m.', desc: 'Llegada aproximada a Recrish. Entrega de linterna frontal, indicaciones de seguridad.' },
        { time: '4:30 a. m.', desc: 'Inicio de caminata nocturna acompañada por guía.' },
        { time: '6:15 – 6:45 a. m.', desc: 'Llegada aproximada a Laguna Radián. Ubicación en punto seguro para observar el amanecer.' },
        { time: '6:30 – 7:15 a. m.', desc: 'Observación del amanecer sobre la Cordillera Blanca, fotografías.' },
        { time: '7:15 – 8:00 a. m.', desc: 'Desayuno tipo box lunch caliente/frío frente a la laguna.' },
        { time: '8:00 – 9:15 a. m.', desc: 'Paseo guiado por alrededores, interpretación de flora y vistas.' },
        { time: '9:15 – 10:00 a. m.', desc: 'Visita al mirador natural cercano y sesión de fotos.' },
        { time: '10:00 a. m.', desc: 'Inicio del descenso hacia Recrish.' },
        { time: '1:30 – 2:00 p. m.', desc: 'Retorno aproximado a Huaraz.' }
      ],
      includes: isEnglish ? ['Private transport', 'Pickup at hotel/plaza', 'Local guide', 'Box lunch', 'Headlamp', 'First aid kit', 'Trekking poles', 'Basic photo session'] : ['Transporte Huaraz – Recrish – Huaraz', 'Recojo en hospedaje o Plaza', 'Guía local especializado', 'Desayuno box lunch', 'Linterna frontal', 'Botiquín de primeros auxilios', 'Bastones de trekking', 'Sesión de fotos básica'],
      excludes: isEnglish ? ['Entrance fees', 'Travel insurance', 'Personal expenses'] : ['Entrada o aporte comunal', 'Seguro de viaje', 'Gastos personales']
    },
    'pkg-2': {
      gallery: ['pkg2/KOB04050.webp', 'pkg2/KOB04053.webp'],
      title: isEnglish ? 'Night in Domes – Lake Radián' : 'Noche en Domos – Laguna Radián',
      subtitle: isEnglish ? 'Sunset, stars, and sunrise' : 'Atardecer, estrellas y amanecer',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d125916.12458428178!2d-77.58434698889163!3d-9.52928509311681!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a8e52c80cde5d3%3A0x539fc4f191b7027b!2sLaguna%20Radi%C3%A1n!3m2!1d-9.4795325!2d-77.491325!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: 'Day 1 - 1:30 p. m.', desc: 'Pickup and departure from Huaraz.' },
        { time: '2:15 p. m.', desc: 'Arrival at Recrish. Safety talk and prep.' },
        { time: '2:30 p. m.', desc: 'Start hike to Lake Radián.' },
        { time: '4:30 p. m.', desc: 'Arrival at lake and reception at domes.' },
        { time: '6:15 p. m.', desc: 'Sunset observation from viewpoint.' },
        { time: '7:30 p. m.', desc: 'Hot dinner at dome area.' },
        { time: '8:30 p. m.', desc: 'Guided bonfire, stargazing.' },
        { time: 'Day 2 - 5:45 a. m.', desc: 'Wake up for sunrise observation.' },
        { time: '7:00 a. m.', desc: 'Breakfast in domes or by the lake.' },
        { time: '10:30 a. m.', desc: 'Arrival in Huaraz.' }
      ] : [
        { time: 'Día 1 - 1:30 p. m.', desc: 'Recojo y salida desde Huaraz.' },
        { time: '2:15 p. m.', desc: 'Llegada a Recrish. Charla de seguridad.' },
        { time: '2:30 p. m.', desc: 'Inicio de caminata hacia Laguna Radián.' },
        { time: '4:30 p. m.', desc: 'Llegada a la laguna y recepción en los domos.' },
        { time: '6:15 p. m.', desc: 'Observación del atardecer desde el mirador.' },
        { time: '7:30 p. m.', desc: 'Cena caliente en la zona de domos.' },
        { time: '8:30 p. m.', desc: 'Fogata guiada, bebidas calientes, cielo nocturno.' },
        { time: 'Día 2 - 5:45 a. m.', desc: 'Despertar para observar el amanecer.' },
        { time: '7:00 a. m.', desc: 'Desayuno en los domos o junto a la laguna.' },
        { time: '10:30 a. m.', desc: 'Retorno y llegada a Huaraz.' }
      ],
      includes: isEnglish ? ['Private transport', '1 night dome accommodation', 'Dinner (Day 1) & Breakfast (Day 2)', 'Local guide', 'Bonfire'] : ['Transporte privado', 'Alojamiento 1 noche en domos', 'Cena (Día 1) y Desayuno (Día 2)', 'Guía local', 'Fogata y bebida caliente', 'Visita guiada', 'Sesión de fotos'],
      excludes: isEnglish ? ['Lunches', 'Entrance fees', 'Insurance'] : ['Almuerzos (Día 1 y 2)', 'Entrada o aporte comunal', 'Seguro de viaje']
    },
    'pkg-3': {
      gallery: ['pkg3/DJI_0813.webp', 'pkg3/DJI_0814.webp', 'pkg3/DJI_0820.webp', 'pkg3/DJI_0831.webp', 'pkg3/DJI_0834.webp', 'pkg3/KOB04063.webp', 'pkg3/KOB04075.webp', 'pkg3/KOB04076.webp', 'pkg3/KOB04107.webp', 'pkg3/KOB04111.webp', 'pkg3/KOB04128.webp', 'pkg3/KOB04144.webp'],
      title: isEnglish ? 'Sunrise in Wilcacocha' : 'Amanecer en Wilcacocha',
      subtitle: isEnglish ? 'Waking up among mountains and Andean songs' : 'Despertar entre montañas y cantos andinos',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d31481.56580668225!2d-77.56846174999999!3d-9.5441589!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a90c50058e70a3%3A0xc4870de067ed7f5a!2sLaguna%20Wilcacocha!3m2!1d-9.5583693!2d-77.5452296!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: '5:00 a. m.', desc: 'Pickup and departure to Santa Cruz / Chiwipampa.' },
        { time: '5:45 a. m.', desc: 'Start hike. Listening to bird songs.' },
        { time: '6:30 a. m.', desc: 'Birdwatching stop with binoculars.' },
        { time: '7:15 a. m.', desc: 'Arrival at Wilcacocha. Sunrise view.' },
        { time: '7:45 a. m.', desc: 'Box lunch breakfast.' },
        { time: '8:30 a. m.', desc: 'Slow walk around the lake.' },
        { time: '12:15 p. m.', desc: 'Return to Huaraz.' }
      ] : [
        { time: '5:00 a. m.', desc: 'Recojo. Salida hacia el sector de Santa Cruz / Chiwipampa.' },
        { time: '5:45 a. m.', desc: 'Inicio de caminata al amanecer. Escucha de aves.' },
        { time: '6:30 a. m.', desc: 'Parada de avistamiento. Uso de binoculares.' },
        { time: '7:15 a. m.', desc: 'Llegada a Laguna Wilcacocha. Observación del amanecer.' },
        { time: '7:45 a. m.', desc: 'Desayuno tipo box lunch.' },
        { time: '8:30 a. m.', desc: 'Recorrido pausado alrededor de la laguna.' },
        { time: '12:15 p. m.', desc: 'Retorno a Huaraz.' }
      ],
      includes: isEnglish ? ['Transport', 'Local guide', 'Box lunch', 'Shared binoculars', 'Headlamp'] : ['Transporte ida y retorno', 'Guía local / Interpretación', 'Desayuno box lunch', 'Binoculares compartidos', 'Linterna frontal'],
      excludes: isEnglish ? ['Entrance fees', 'Insurance'] : ['Entrada o aporte', 'Seguro de viaje']
    },
    'pkg-4': {
      gallery: ['pkg4/KOB0414141.webp', 'pkg4/KOB04150.webp'],
      title: isEnglish ? 'Lake Parón Full Day' : 'Laguna Parón Full Day',
      subtitle: isEnglish ? 'Turquoise among ice giants' : 'Turquesa entre gigantes de hielo',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d251978.89865181752!2d-77.81057416395353!3d-9.26620586022881!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a9a8be2a40b82f%3A0xbcf4c3dbceae12c8!2sLaguna%20Paron!3m2!1d-8.9959146!2d-77.68112269999999!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: '5:30 a. m.', desc: 'Pickup and departure from Huaraz.' },
        { time: '6:30 a. m.', desc: 'Panoramic drive through Callejón de Huaylas.' },
        { time: '10:30 a. m.', desc: 'Arrival at Lake Parón.' },
        { time: '11:00 a. m.', desc: 'Guided walk along the shore.' },
        { time: '12:00 p. m.', desc: 'Box lunch picnic.' },
        { time: '1:00 p. m.', desc: 'Hike to viewpoint or relaxing kayak time.' },
        { time: '3:30 p. m.', desc: 'Departure from Lake Parón.' },
        { time: '6:30 p. m.', desc: 'Arrival in Huaraz.' }
      ] : [
        { time: '5:30 a. m.', desc: 'Recojo e inicio del viaje por el Callejón de Huaylas.' },
        { time: '6:30 a. m.', desc: 'Recorrido panorámico (Anta, Carhuaz, Yungay, Caraz).' },
        { time: '10:30 a. m.', desc: 'Llegada a Laguna Parón. Charla y fotos.' },
        { time: '11:00 a. m.', desc: 'Paseo guiado por la orilla.' },
        { time: '12:00 p. m.', desc: 'Almuerzo tipo box lunch o picnic.' },
        { time: '1:00 p. m.', desc: 'Caminata al Mirador panorámico o paseo en bote.' },
        { time: '3:30 p. m.', desc: 'Salida hacia Caraz y Huaraz.' },
        { time: '6:30 p. m.', desc: 'Llegada aproximada a Huaraz.' }
      ],
      includes: isEnglish ? ['Transport', 'Local guide', 'Box lunch', 'Trekking poles', 'First aid / Oxygen'] : ['Transporte turístico', 'Guía local especializado', 'Box lunch o picnic ligero', 'Bastones de trekking', 'Botiquín / Oxígeno'],
      excludes: isEnglish ? ['Huascarán NP Entrance', 'Kayak/Boat', 'Restaurant lunch'] : ['Entrada al Parque Nacional Huascarán', 'Almuerzo en restaurante', 'Kayak o paseo en bote']
    },
    'pkg-5': {
      gallery: ['pkg5/DJI_0873.webp', 'pkg5/KOB04158.webp', 'pkg5/KOB04163.webp', 'pkg5/KOB04172.webp', 'pkg5/KOB04180.webp', 'pkg5/KOB04186.webp'],
      title: isEnglish ? 'Llanganuco Lakes Full Day' : 'Lagunas de Llanganuco Full Day',
      subtitle: isEnglish ? 'Between mountains, forests, and emerald waters' : 'Entre montañas, bosques y aguas esmeralda',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d252119.16723225883!2d-77.74797086882676!3d-9.2132717830635!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a84f3cc4074211%3A0xf6a847596ffebdc3!2sLagunas%20de%20Llanganuco!3m2!1d-9.0666667!2d-77.6333333!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: '5:30 a. m.', desc: 'Pickup and departure.' },
        { time: '7:30 a. m.', desc: 'Arrival at Yungay. Visit to Campo Santo.' },
        { time: '8:15 a. m.', desc: 'Ascent to Llanganuco gorge. Zipline stop.' },
        { time: '9:30 a. m.', desc: 'Arrival at Chinancocha (first lake).' },
        { time: '11:00 a. m.', desc: 'Free time for photos or boat ride.' },
        { time: '12:00 p. m.', desc: 'Visit to Orconcocha (second lake).' },
        { time: '1:45 p. m.', desc: 'Lunch in a local restaurant.' },
        { time: '5:30 p. m.', desc: 'Return to Huaraz.' }
      ] : [
        { time: '5:30 a. m.', desc: 'Recojo e inicio del recorrido.' },
        { time: '7:30 a. m.', desc: 'Visita panorámica al Campo Santo de Yungay.' },
        { time: '8:15 a. m.', desc: 'Ascenso a la quebrada, parada en tirolesa y mirador.' },
        { time: '9:30 a. m.', desc: 'Llegada a Chinancocha. Charla y fotos.' },
        { time: '10:00 a. m.', desc: 'Paseo guiado por la orilla.' },
        { time: '12:00 p. m.', desc: 'Visita panorámica a Orconcocha.' },
        { time: '1:45 p. m.', desc: 'Almuerzo en restaurante local.' },
        { time: '5:30 p. m.', desc: 'Retorno a Huaraz.' }
      ],
      includes: isEnglish ? ['Transport', 'Local guide', 'Guided visits', 'First aid / Oxygen'] : ['Transporte turístico', 'Guía local especializado', 'Visitas guiadas', 'Interpretación histórica', 'Botiquín / Oxígeno'],
      excludes: isEnglish ? ['Huascarán NP Entrance', 'Breakfast & Lunch', 'Boat ride'] : ['Entrada al Parque Nacional Huascarán', 'Desayuno y almuerzo', 'Paseo en bote']
    },
    'pkg-6': {
      gallery: ['pkg6/KOB04194.webp', 'pkg6/KOB04261.webp', 'pkg6/KOB04262.webp', 'pkg6/KOB04266.webp', 'pkg6/KOB04267.webp', 'pkg6/KOB04270.webp', 'pkg6/KOB04293.webp'],
      title: isEnglish ? 'Chacas & Punta Olímpica' : 'Asunción – Chacas y Punta Olímpica',
      subtitle: isEnglish ? 'From the Cordillera Blanca to the artisan heart' : 'De la Cordillera Blanca al corazón artesanal',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d125974.45347209121!2d-77.58572111559868!3d-9.336496492348547!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a85b9b71f981dd%3A0x5a230588147d3455!2sChacas!3m2!1d-9.163333!2d-77.36972199999999!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: '6:00 a. m.', desc: 'Pickup and departure.' },
        { time: '8:30 a. m.', desc: 'Entry to Quebrada Ulta. Panoramic views.' },
        { time: '9:30 a. m.', desc: 'Arrival at Punta Olímpica.' },
        { time: '9:50 a. m.', desc: 'Crossing the Punta Olímpica Tunnel.' },
        { time: '12:00 p. m.', desc: 'Arrival in Chacas. Town tour.' },
        { time: '12:30 p. m.', desc: 'Visit to Mama Ashu Sanctuary.' },
        { time: '1:00 p. m.', desc: 'Lunch and visit to Don Bosco artisan workshops.' },
        { time: '6:30 p. m.', desc: 'Arrival in Huaraz.' }
      ] : [
        { time: '6:00 a. m.', desc: 'Recojo e inicio del recorrido hacia el norte.' },
        { time: '8:30 a. m.', desc: 'Ingreso a la Quebrada Ulta. Vistas panorámicas.' },
        { time: '9:30 a. m.', desc: 'Llegada a Punta Olímpica y cruce del túnel.' },
        { time: '10:15 a. m.', desc: 'Caminata corta hacia lagunas altoandinas.' },
        { time: '12:00 p. m.', desc: 'Llegada a Chacas. Recorrido guiado.' },
        { time: '12:30 p. m.', desc: 'Visita al Santuario de Mama Ashu.' },
        { time: '2:15 p. m.', desc: 'Visita a talleres artesanales Don Bosco.' },
        { time: '6:30 p. m.', desc: 'Retorno a Huaraz.' }
      ],
      includes: isEnglish ? ['Transport', 'Local guide', 'Guided tours to Chacas & Workshops', 'First aid'] : ['Transporte turístico', 'Guía local especializado', 'Visita guiada a Chacas, Mama Ashu y Don Bosco', 'Botiquín y Oxígeno'],
      excludes: isEnglish ? ['Entrance fees', 'Meals', 'Shopping'] : ['Entradas o aportes', 'Desayuno y almuerzo', 'Compras de artesanías']
    },
    'pkg-7': {
      gallery: ['pkg7/DJI_0914.webp'],
      title: isEnglish ? 'City Tour Huaraz + Palestra' : 'City Tour Huaraz + José Olaya + Palestra',
      subtitle: isEnglish ? 'City, community, and vertical adventure' : 'Ciudad, comunidad y aventura vertical',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d31484.587823528224!2d-77.55106584999999!3d-9.530335899999999!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a90d79d6b23a9d%3A0xd689dc339c0d5db6!2sJos%C3%A9%20Olaya%2C%20Huaraz!3m2!1d-9.5262315!2d-77.5190989!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: '8:30 a. m.', desc: 'Pickup and start of City Tour.' },
        { time: '9:20 a. m.', desc: 'Visit to Áncash Archaeological Museum.' },
        { time: '10:20 a. m.', desc: 'Guided tour of traditional José Olaya neighborhood.' },
        { time: '11:20 a. m.', desc: 'Arrival at climbing wall. Safety talk.' },
        { time: '11:40 a. m.', desc: 'Rock climbing practice with instructor.' },
        { time: '1:25 p. m.', desc: 'Healthy snack and drinks.' },
        { time: '2:15 p. m.', desc: 'Return to center of Huaraz.' }
      ] : [
        { time: '8:30 a. m.', desc: 'Recojo e inicio del city tour por Huaraz.' },
        { time: '9:20 a. m.', desc: 'Visita cultural al Museo Arqueológico de Áncash.' },
        { time: '10:20 a. m.', desc: 'Recorrido guiado por el tradicional barrio José Olaya.' },
        { time: '11:20 a. m.', desc: 'Llegada a la zona de palestra. Charla de seguridad.' },
        { time: '11:40 a. m.', desc: 'Experiencia de escalada en palestra con instructor.' },
        { time: '1:25 p. m.', desc: 'Snack saludable, fotos y descanso.' },
        { time: '2:15 p. m.', desc: 'Llegada aproximada al centro de Huaraz.' }
      ],
      includes: isEnglish ? ['Transport', 'City Tour Guide', 'Climbing instructor & Gear', 'Snacks'] : ['Transporte turístico', 'Guía local', 'Instructor de escalada', 'Arnés, casco y equipo básico', 'Snack y bebida'],
      excludes: isEnglish ? ['Museum entrance', 'Lunch'] : ['Entrada al Museo', 'Almuerzo completo', 'Ropa deportiva']
    },
    'pkg-8': {
      gallery: ['pkg8/KOB03812.webp', 'pkg8/KOB03843.webp'],
      title: isEnglish ? 'City Tour + ATVs' : 'City Tour + Rataquenua + Pukaventana en Cuatrimoto',
      subtitle: isEnglish ? 'City, altitude, and adventure' : 'Ciudad, altura y aventura',
      mapUrl: 'https://www.google.com/maps/embed?pb=!1m28!1m12!1m3!1d15743.082987158309!2d-77.5381898!3d-9.52848985!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!4m13!3e0!4m5!1s0x91a90d0dbe43c481%3A0x19e605d5acc755b8!2sHuaraz!3m2!1d-9.5299496!2d-77.5287661!4m5!1s0x91a90d9ce0624bd7%3A0x95cf745037d00f72!2sMirador%20De%20Rataquenua!3m2!1d-9.537554!2d-77.51868499999999!5e0!3m2!1ses-419!2spe!4v1700000000000',
      itinerary: isEnglish ? [
        { time: '8:30 a. m.', desc: 'Pickup and start of City Tour.' },
        { time: '9:15 a. m.', desc: 'Visit to Áncash Archaeological Museum.' },
        { time: '10:30 a. m.', desc: 'Arrival at Rataquenua viewpoint. Photos.' },
        { time: '11:40 a. m.', desc: 'Arrival at Pukaventana. Safety talk for ATVs.' },
        { time: '12:00 p. m.', desc: 'ATV ride through authorized route.' },
        { time: '1:00 p. m.', desc: 'Free time for photos and snacks.' },
        { time: '2:00 p. m.', desc: 'Return to center of Huaraz.' }
      ] : [
        { time: '8:30 a. m.', desc: 'Recojo e inicio del city tour por Huaraz.' },
        { time: '9:15 a. m.', desc: 'Visita cultural al Museo Arqueológico de Áncash.' },
        { time: '10:30 a. m.', desc: 'Llegada al Mirador de Rataquenua. Observación panorámica.' },
        { time: '11:40 a. m.', desc: 'Llegada a Pukaventana. Charla y uso del casco.' },
        { time: '12:00 p. m.', desc: 'Paseo en cuatrimotos por Pukaventana (Ruta autorizada).' },
        { time: '1:00 p. m.', desc: 'Tiempo libre, fotos y snack.' },
        { time: '2:00 p. m.', desc: 'Llegada aproximada a Huaraz.' }
      ],
      includes: isEnglish ? ['Transport', 'City Tour Guide', 'ATV & Helmet', 'Snack'] : ['Transporte turístico', 'Guía local para city tour', 'Visita al Mirador Rataquenua', 'Paseo en cuatrimoto en Pukaventana', 'Casco de seguridad', 'Snack y bebida'],
      excludes: isEnglish ? ['Museum entrance', 'Lunch', 'Damage to ATV'] : ['Entrada al Museo', 'Almuerzo completo', 'Daños ocasionados a la cuatrimoto']
    }
  };

  // =============================================
  // 12B. INJECT IMAGE CAROUSELS INTO CARDS
  // =============================================
  (() => {
    const basePath = isEnglish ? '../assets/img/gallery/carousels/' : 'assets/img/gallery/carousels/';
    
    Object.keys(packagesData).forEach(pkgId => {
      const pkg = packagesData[pkgId];
      if (!pkg.gallery || pkg.gallery.length <= 1) return; // Un solo ítem o sin fotos, no requiere carrusel
      
      const btns = document.querySelectorAll(`button[data-package-id="${pkgId}"]`);
      btns.forEach(btn => {
        const card = btn.closest('.experiences__card');
        if (!card) return;
        const imgContainer = card.querySelector('.experiences__image');
        if (!imgContainer) return;

        let trackHtml = '';
        let dotsHtml = '';
        pkg.gallery.forEach((img, i) => {
          trackHtml += `<img src="${basePath}${img}" alt="${pkg.title} - Foto ${i+1}" loading="${i === 0 ? 'eager' : 'lazy'}">`;
          dotsHtml += `<span class="carousel__dot ${i === 0 ? 'active' : ''}" data-index="${i}"></span>`;
        });

        imgContainer.innerHTML = `
          <div class="carousel__container">
            <div class="carousel__track">
              ${trackHtml}
            </div>
            <button class="carousel__btn prev" aria-label="Anterior">❮</button>
            <button class="carousel__btn next" aria-label="Siguiente">❯</button>
            <div class="carousel__dots">
              ${dotsHtml}
            </div>
          </div>
        `;

        const track = imgContainer.querySelector('.carousel__track');
        const prevBtn = imgContainer.querySelector('.prev');
        const nextBtn = imgContainer.querySelector('.next');
        const dots = imgContainer.querySelectorAll('.carousel__dot');

        const updateDots = () => {
          const scrollAmount = track.clientWidth;
          if (scrollAmount <= 0) return;
          const index = Math.round(track.scrollLeft / scrollAmount);
          dots.forEach((dot, i) => dot.classList.toggle('active', i === index));
        };

        track.addEventListener('scroll', () => requestAnimationFrame(updateDots), { passive: true });

        prevBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          track.scrollBy({ left: -track.clientWidth, behavior: 'smooth' });
        });

        nextBtn.addEventListener('click', (e) => {
          e.stopPropagation();
          track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
        });

        dots.forEach(dot => {
          dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const index = parseInt(dot.dataset.index);
            track.scrollTo({ left: index * track.clientWidth, behavior: 'smooth' });
          });
        });

        // Auto-play (Optimized with IntersectionObserver)
        let interval;
        const autoPlay = () => {
          const maxScroll = track.scrollWidth - track.clientWidth;
          if (track.scrollLeft >= maxScroll - 10) {
            track.scrollTo({ left: 0, behavior: 'smooth' });
          } else {
            track.scrollBy({ left: track.clientWidth, behavior: 'smooth' });
          }
        };
        
        const startAutoPlay = () => {
          if (!interval) interval = setInterval(autoPlay, 3500);
        };
        
        const stopAutoPlay = () => {
          if (interval) {
            clearInterval(interval);
            interval = null;
          }
        };

        const observer = new IntersectionObserver((entries) => {
          entries.forEach(entry => {
            if (entry.isIntersecting) {
              startAutoPlay();
            } else {
              stopAutoPlay();
            }
          });
        }, { threshold: 0.3 });
        
        observer.observe(imgContainer);

        imgContainer.addEventListener('mouseenter', stopAutoPlay);
        imgContainer.addEventListener('mouseleave', startAutoPlay);
      });
    });
  })();

  window.openPackageModal = (pkgId) => {
    const modal = document.getElementById('package-modal');
    const modalBody = document.getElementById('modal-body');
    if (!modal || !modalBody || !packagesData[pkgId]) return;

    const pkg = packagesData[pkgId];
    
    const itineraryHtml = pkg.itinerary.map(item => `
      <div class="itinerary__item">
        <div class="itinerary__time">${item.time}</div>
        <div class="itinerary__desc">${item.desc}</div>
      </div>
    `).join('');

    const includesHtml = pkg.includes.map(inc => `<li>${inc}</li>`).join('');
    const excludesHtml = pkg.excludes.map(exc => `<li>${exc}</li>`).join('');

    const includesTitle = isEnglish ? 'Includes' : 'Incluye';
    const excludesTitle = isEnglish ? 'Not Included' : 'No incluye';

    modalBody.innerHTML = `
      <div class="modal__header">
        <h3 class="modal__title">${pkg.title}</h3>
        <p class="modal__subtitle">${pkg.subtitle}</p>
      </div>
      
      <div class="modal__section">
        <h4>📍 ${isEnglish ? 'Itinerary' : 'Itinerario'}</h4>
        <div class="modal__itinerary">
          ${itineraryHtml}
        </div>
      </div>
      
      <div class="modal__section">
        <h4>📋 ${isEnglish ? 'Details' : 'Detalles'}</h4>
        <div class="modal__lists">
          <div class="list--include">
            <strong>${includesTitle}</strong>
            <ul style="margin-top: 1rem;">${includesHtml}</ul>
          </div>
          <div class="list--exclude">
            <strong>${excludesTitle}</strong>
            <ul style="margin-top: 1rem;">${excludesHtml}</ul>
          </div>
        </div>
      </div>
      
      <div class="modal__section">
        <h4>🗺️ ${isEnglish ? 'Route Map' : 'Mapa de Ruta'}</h4>
        <div class="modal__map">
          <iframe src="${pkg.mapUrl}" allowfullscreen="" loading="lazy" referrerpolicy="no-referrer-when-downgrade"></iframe>
        </div>
      </div>
    `;

    modal.classList.add('active');
    document.body.style.overflow = 'hidden';
  };

  window.closePackageModal = () => {
    const modal = document.getElementById('package-modal');
    if (modal) {
      modal.classList.remove('active');
      document.body.style.overflow = '';
      
      // Stop iframe loading/playing when closed to save memory
      const modalBody = document.getElementById('modal-body');
      if (modalBody) {
        modalBody.innerHTML = '';
      }
    }
  };

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closePackageModal();
    }
  });

}); // Fin DOMContentLoaded


