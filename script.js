/* Yeider Lebron — Fondo flotante y navegación realmente suave. */
'use strict';
document.addEventListener('DOMContentLoaded', () => {
  const root = document.documentElement;
  const themeToggle = document.getElementById('themeToggle');
  const themeIcon = document.getElementById('themeIcon');
  const motionToggle = document.getElementById('motionToggle');
  const motionIcon = document.getElementById('motionIcon');
  const menu = document.getElementById('menu');
  const menuButton = document.querySelector('.navbar-toggler');
  const navbar = document.querySelector('.navbar');
  const progress = document.getElementById('scrollProgress');

  // Tema. El código inicial de <head> lo configura incluso antes de cargar el CSS.
  function updateTheme() {
    const isDark = root.dataset.theme !== 'light';
    root.dataset.theme = isDark ? 'dark' : 'light';
    document.body.classList.toggle('dark', isDark);
    if (themeIcon) themeIcon.textContent = isDark ? '☀' : '☾';
    if (themeToggle) themeToggle.setAttribute('aria-label', isDark ? 'Activar modo claro' : 'Activar modo oscuro');
  }
  updateTheme();
  themeToggle?.addEventListener('click', () => {
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('yeider-fondo-tema', root.dataset.theme); } catch (_) {}
    updateTheme();
  });

  // Objetos en movimiento constante. El botón permite detenerlos y reanudarlos.
  let motionOn = true;
  const syncMotion = () => {
    root.classList.toggle('motion-paused', !motionOn);
    if (motionIcon) motionIcon.textContent = motionOn ? 'Ⅱ' : '▶';
    const caption = document.querySelector('.motion-label');
    if (caption) caption.textContent = motionOn ? 'Fondo en movimiento' : 'Fondo pausado';
    if (motionToggle) {
      motionToggle.setAttribute('aria-label', motionOn ? 'Pausar las animaciones del fondo' : 'Reanudar las animaciones del fondo');
      motionToggle.setAttribute('aria-pressed', String(motionOn));
      motionToggle.title = motionOn ? 'Pausar fondo animado' : 'Reanudar fondo animado';
    }
  };
  syncMotion();
  motionToggle?.addEventListener('click', () => { motionOn = !motionOn; syncMotion(); });

  // Menú móvil sin depender de Bootstrap JS; sin conflictos con clases externas.
  const closeMenu = () => {
    menu?.classList.remove('show');
    menuButton?.setAttribute('aria-expanded', 'false');
  };
  menuButton?.addEventListener('click', () => {
    const open = !menu.classList.contains('show');
    menu.classList.toggle('show', open);
    menuButton.setAttribute('aria-expanded', String(open));
  });
  window.addEventListener('keydown', e => { if (e.key === 'Escape') closeMenu(); });
  window.addEventListener('resize', () => { if (innerWidth >= 992) closeMenu(); }, { passive: true });

  // Desplazamiento controlado fotograma a fotograma, visible al pulsar Inicio / Sobre mí / etc.
  // Se usa scroll-behavior:auto para evitar que CSS interfiera con la interpolación.
  let scrollingFrame = 0;
  const stopSmoothScroll = () => {
    if (scrollingFrame) cancelAnimationFrame(scrollingFrame);
    scrollingFrame = 0;
  };
  const easeInOut = t => t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  function smoothlyScrollTo(section, hash) {
    stopSmoothScroll();
    const navHeight = navbar?.getBoundingClientRect().height || 76;
    const start = window.scrollY;
    const rawTarget = section.id === 'inicio'
      ? 0
      : section.getBoundingClientRect().top + window.scrollY - navHeight - 14;
    const maxScroll = Math.max(0, document.documentElement.scrollHeight - innerHeight);
    const end = Math.min(maxScroll, Math.max(0, Math.round(rawTarget)));
    const distance = end - start;
    if (Math.abs(distance) < 2) return;
    // 900 a 1.65 s: suficientemente lento para VER recorrer el contenido.
    const duration = Math.min(1650, Math.max(900, 780 + Math.abs(distance) * .30));
    let beginning = null;
    function frame(time) {
      if (beginning === null) beginning = time;
      const t = Math.min(1, (time - beginning) / duration);
      const y = start + distance * easeInOut(t);
      window.scrollTo({ top: y, left: 0, behavior: 'instant' });
      if (t < 1) scrollingFrame = requestAnimationFrame(frame);
      else { scrollingFrame = 0; window.scrollTo(0, end); }
    }
    scrollingFrame = requestAnimationFrame(frame);
    if (hash) history.replaceState(null, '', hash);
  }
  // Escucha delegada: todos los enlaces internos, también botones y 'Volver arriba'.
  document.addEventListener('click', event => {
    const link = event.target.closest?.('a[href^="#"]');
    if (!link) return;
    const hash = link.getAttribute('href');
    if (!hash || hash === '#') return;
    const section = document.getElementById(hash.slice(1));
    if (!section) return;
    event.preventDefault();
    closeMenu();
    smoothlyScrollTo(section, hash);
  });
  // Un gesto del usuario interrumpe el desplazamiento automatizado.
  addEventListener('wheel', stopSmoothScroll, { passive: true });
  addEventListener('touchstart', stopSmoothScroll, { passive: true });
  addEventListener('keydown', event => {
    if (['PageUp', 'PageDown', 'ArrowDown', 'ArrowUp', 'Home', 'End', ' '].includes(event.key)) stopSmoothScroll();
  });

  // Barra de progreso y resaltado sencillo de la sección actual.
  const sections = [...document.querySelectorAll('main > section[id]')];
  const menuLinks = [...document.querySelectorAll('.navbar .nav-link[href^="#"]')];
  let scrollQueued = false;
  function updateNav() {
    scrollQueued = false;
    const maxScroll = Math.max(1, document.documentElement.scrollHeight - innerHeight);
    if (progress) progress.style.transform = `scaleX(${Math.min(1, Math.max(0, scrollY / maxScroll))})`;
    navbar?.classList.toggle('is-scrolled', scrollY > 30);
    const marker = scrollY + (navbar?.offsetHeight || 70) + innerHeight * .20;
    let activeId = 'inicio';
    for (const section of sections) if (section.offsetTop <= marker) activeId = section.id;
    menuLinks.forEach(link => {
      const isActive = link.getAttribute('href') === '#' + activeId;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }
  addEventListener('scroll', () => {
    if (!scrollQueued) { scrollQueued = true; requestAnimationFrame(updateNav); }
  }, { passive: true });
  updateNav();

  // Aparición discreta de contenido al entrar en la pantalla.
  if ('IntersectionObserver' in window) {
    const reveal = document.querySelectorAll('.reveal');
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (entry.isIntersecting) { entry.target.classList.add('is-visible'); observer.unobserve(entry.target); }
      }
    }, { threshold: .07, rootMargin: '0px 0px -18px 0px' });
    reveal.forEach(el => observer.observe(el));
    document.body.classList.add('animations-ready');
  }

  // Muestra la foto solo cuando el archivo exista; si falta, aparecen las iniciales.
  const portraitPhoto = document.querySelector('.portrait-photo');
  if (portraitPhoto) {
    const portraitMedia = portraitPhoto.closest('.portrait-media');
    const syncPortrait = () => {
      const loaded = portraitPhoto.complete && portraitPhoto.naturalWidth > 0;
      portraitMedia?.classList.toggle('has-photo', loaded);
      const fallback = portraitMedia?.querySelector('.portrait-fallback');
      if (fallback) fallback.setAttribute('aria-hidden', String(loaded));
    };
    portraitPhoto.addEventListener('load', syncPortrait);
    portraitPhoto.addEventListener('error', syncPortrait);
    syncPortrait();
  }

  const year = document.getElementById('year');
  if (year) year.textContent = String(new Date().getFullYear());
  document.getElementById('contactForm')?.addEventListener('submit', event => {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    document.getElementById('formStatus').textContent = 'Formulario de demostración: no se envió ningún correo real.';
    form.reset();
  });
});
