/* =========================================================
   clabel — interacciones, animaciones e idiomas
   ========================================================= */
(() => {
  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
  const hasGSAP = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';

  $('#year').textContent = new Date().getFullYear();

  /* ---------------- Idioma / Language ---------------- */
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (e) {} }
  };
  const dict = window.I18N || {};
  let lang = store.get('clabel-lang') ||
    ((navigator.language || 'es').toLowerCase().startsWith('es') ? 'es' : 'en');
  const t = (key) => (dict[lang] && dict[lang][key]) ?? (dict.es && dict.es[key]) ?? '';

  const langCallbacks = [];
  function applyLang(next, animate) {
    lang = next;
    store.set('clabel-lang', lang);
    root.lang = lang;
    $$('[data-i18n]').forEach(el => {
      const v = t(el.dataset.i18n);
      if (typeof v === 'string' && v) el.textContent = v;
    });
    $$('.lang__btn').forEach(b => {
      const on = b.dataset.lang === lang;
      b.classList.toggle('is-active', on);
      b.setAttribute('aria-pressed', on);
    });
    $('.lang').dataset.active = lang;
    langCallbacks.forEach(fn => fn(animate));
  }
  $$('.lang__btn').forEach(b => b.addEventListener('click', () => {
    if (b.dataset.lang === lang) return;
    if (hasGSAP && !reduce) {
      gsap.to('main, .footer', { opacity: 0, duration: .25, onComplete() {
        applyLang(b.dataset.lang, true);
        gsap.to('main, .footer', { opacity: 1, duration: .45 });
      }});
    } else applyLang(b.dataset.lang, true);
  }));

  /* ---------------- Menú móvil ---------------- */
  const burger = $('.burger');
  const setMenu = (open) => {
    document.body.classList.toggle('menu-open', open);
    burger.setAttribute('aria-expanded', open);
    $('.menu').setAttribute('aria-hidden', !open);
    $('.nav__logo img').src = open ? 'assets/logo-pink.png' : 'assets/logo-green.png';
    if (lenis) open ? lenis.stop() : lenis.start();
  };
  burger.addEventListener('click', () => setMenu(!document.body.classList.contains('menu-open')));
  $$('.menu a').forEach(a => a.addEventListener('click', () => setMenu(false)));

  /* ---------------- Formulario ---------------- */
  $('#contactForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const f = e.target, note = $('.form__note', f);
    const name = f.name.value.trim(), email = f.email.value.trim(), msg = f.message.value.trim();
    const needs = $$('input[name="need"]:checked', f).map(i => i.value).join(', ');
    if (!name || !/^\S+@\S+\.\S+$/.test(email) || !msg) { note.textContent = t('ct.error'); return; }
    const body = `${msg}\n\n— ${name} (${email})${needs ? `\n${lang === 'es' ? 'Servicios' : 'Services'}: ${needs}` : ''}`;
    window.location.href = `mailto:hola@clabel.agency?subject=${encodeURIComponent((lang === 'es' ? 'Nuevo proyecto — ' : 'New project — ') + name)}&body=${encodeURIComponent(body)}`;
    note.textContent = t('ct.ok');
  });

  /* ---------------- Sin GSAP: mostrar todo ---------------- */
  let lenis = null;
  if (!hasGSAP) {
    root.classList.remove('js');
    $('.loader').remove();
    applyLang(lang, false);
    return;
  }

  gsap.registerPlugin(ScrollTrigger);

  /* ---------------- Smooth scroll (Lenis) ---------------- */
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new Lenis({ duration: 1.15, easing: t => Math.min(1, 1.001 - Math.pow(2, -10 * t)) });
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add(time => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
    $$('a[href^="#"]').forEach(a => a.addEventListener('click', e => {
      const id = a.getAttribute('href');
      const target = id === '#top' ? 0 : $(id);
      if (target === null) return;
      e.preventDefault();
      lenis.start();
      lenis.scrollTo(target, { offset: id === '#top' ? 0 : -70 });
    }));
  }

  /* ---------------- Nav: esconder al bajar ---------------- */
  const nav = $('.nav');
  let lastY = 0;
  ScrollTrigger.create({
    start: 0, end: 'max',
    onUpdate(self) {
      const y = self.scroll();
      nav.classList.toggle('is-scrolled', y > 40);
      if (!document.body.classList.contains('menu-open'))
        nav.classList.toggle('is-hidden', y > lastY && y > 300);
      lastY = y;
    }
  });

  /* ---------------- Rotador de palabras del hero ---------------- */
  const rotator = $('#rotator');
  let rotIndex = 0, rotTimer = null;
  function startRotator() {
    clearInterval(rotTimer);
    const words = t('hero.rotate');
    rotIndex = 0;
    rotator.innerHTML = `<span class="rotator__word">${words[0]}</span>`;
    if (reduce) return;
    rotTimer = setInterval(() => {
      const cur = $('.rotator__word', rotator);
      rotIndex = (rotIndex + 1) % words.length;
      const next = document.createElement('span');
      next.className = 'rotator__word';
      next.textContent = words[rotIndex];
      gsap.to(cur, { yPercent: -110, duration: .55, ease: 'power3.in', onComplete() {
        cur.remove();
        rotator.appendChild(next);
        gsap.fromTo(next, { yPercent: 110 }, { yPercent: 0, duration: .7, ease: 'power3.out' });
      }});
    }, 3200);
  }
  langCallbacks.push(startRotator);

  /* ---------------- Marquesinas infinitas ---------------- */
  const marquees = [];
  function buildMarquees() {
    marquees.forEach(m => m.tween && m.tween.kill());
    marquees.length = 0;
    $$('.marquee__track').forEach(track => {
      // dejar solo el grupo original y clonar hasta cubrir 2x el ancho de pantalla
      const groups = $$('.marquee__group', track);
      groups.slice(1).forEach(g => g.remove());
      const group = groups[0];
      const w = group.getBoundingClientRect().width || 1;
      const copies = Math.max(2, Math.ceil((window.innerWidth * 2) / w) + 1);
      for (let i = 1; i < copies; i++) track.appendChild(group.cloneNode(true));
      const dir = parseFloat(track.dataset.speed || 1) >= 0 ? -1 : 1;
      const speed = Math.abs(parseFloat(track.dataset.speed || 1));
      gsap.set(track, { x: dir < 0 ? 0 : -w });
      const tween = gsap.to(track, {
        x: dir < 0 ? -w : 0, duration: (w / 90) / speed, ease: 'none', repeat: -1
      });
      if (reduce) tween.pause();
      marquees.push({ tween });
    });
  }
  // acelerar marquesinas con la velocidad del scroll
  let velTimeout;
  ScrollTrigger.create({
    onUpdate(self) {
      const v = Math.min(Math.abs(self.getVelocity()) / 400, 5);
      marquees.forEach(m => gsap.to(m.tween, { timeScale: 1 + v, duration: .2, overwrite: true }));
      clearTimeout(velTimeout);
      velTimeout = setTimeout(() => marquees.forEach(m => gsap.to(m.tween, { timeScale: 1, duration: .8, overwrite: true })), 120);
    }
  });
  langCallbacks.push(() => requestAnimationFrame(buildMarquees));

  /* ---------------- Manifiesto: palabras que se encienden ---------------- */
  let manifestoST = null;
  function buildManifesto() {
    const el = $('[data-split]');
    const words = el.textContent.trim().split(/\s+/);
    el.innerHTML = words.map(w => `<span class="w">${w}</span>`).join(' ');
    if (manifestoST) manifestoST.kill();
    const tween = gsap.to($$('.w', el), {
      opacity: 1, stagger: .1, ease: 'none',
      scrollTrigger: { trigger: el, start: 'top 80%', end: 'bottom 45%', scrub: true }
    });
    manifestoST = tween.scrollTrigger;
  }
  langCallbacks.push(buildManifesto);

  /* ---------------- Aplicar idioma inicial ---------------- */
  applyLang(lang, false);
  langCallbacks.push(() => ScrollTrigger.refresh());

  /* ---------------- Preloader + intro del hero ---------------- */
  gsap.set('.hero__title .line__inner', { yPercent: 110 });
  gsap.set(['.hero__eyebrow', '.hero__lead', '.hero__actions > *', '.scroll-hint'], { opacity: 0, y: 30 });
  gsap.set('.blob', { scale: 0 });

  const counter = { v: 0 };
  const intro = gsap.timeline({ paused: true });
  intro
    .to('.hero__title .line__inner', { yPercent: 0, duration: 1.2, stagger: .12, ease: 'expo.out' })
    .to('.blob', { scale: 1, duration: 1.4, stagger: .12, ease: 'elastic.out(1, .6)' }, '<.1')
    .to(['.hero__eyebrow', '.hero__lead', '.hero__actions > *', '.scroll-hint'], { opacity: 1, y: 0, duration: .9, stagger: .08, ease: 'power3.out' }, '<.2')
    .add(startRotator, '-=.4');

  if (reduce) {
    $('.loader').remove();
    intro.progress(1);
  } else {
    if (lenis) lenis.stop();
    const tl = gsap.timeline();
    tl.to('.loader__logo img', { y: 0, duration: 1, ease: 'expo.out' })
      .to(counter, {
        v: 100, duration: 1.6, ease: 'power2.inOut',
        onUpdate: () => { $('#loaderCount').textContent = Math.round(counter.v); }
      }, 0)
      .to('.loader__logo img', { yPercent: -110, duration: .7, ease: 'expo.in' }, '+=.1')
      .to('.loader__count', { opacity: 0, duration: .3 }, '<')
      .to('.loader', { clipPath: 'inset(0 0 100% 0)', duration: 1, ease: 'expo.inOut' }, '-=.15')
      .add(() => intro.play(), '-=.5')
      .add(() => { $('.loader').remove(); if (lenis) lenis.start(); });
  }

  /* ---------------- Parallax de blobs con el mouse ---------------- */
  if (finePointer && !reduce) {
    const hero = $('.hero');
    hero.addEventListener('mousemove', e => {
      const x = (e.clientX / window.innerWidth - .5), y = (e.clientY / window.innerHeight - .5);
      $$('.blob', hero).forEach((b, i) => gsap.to(b, { x: x * (40 + i * 30), y: y * (40 + i * 30), duration: 1.2, ease: 'power3.out' }));
    });
  }
  // hero se achica al hacer scroll
  gsap.to('.hero__title', { yPercent: 18, opacity: .35, ease: 'none',
    scrollTrigger: { trigger: '.hero', start: 'top top', end: 'bottom top', scrub: true } });

  /* ---------------- Revelados genéricos ---------------- */
  ScrollTrigger.batch('.reveal-up', {
    start: 'top 88%',
    onEnter: els => gsap.to(els, { opacity: 1, y: 0, duration: 1, stagger: .1, ease: 'power3.out' })
  });

  $$('.contact__title .reveal-line').forEach((el, i) => {
    gsap.from(el, { yPercent: 110, duration: 1.1, delay: i * .12, ease: 'expo.out',
      scrollTrigger: { trigger: '.contact__title', start: 'top 85%' } });
  });

  gsap.from('.footer__logo img', { yPercent: 60, opacity: 0, duration: 1.4, ease: 'expo.out',
    scrollTrigger: { trigger: '.footer__logo', start: 'top 95%' } });

  /* ---------------- Tarjetas apiladas de servicios ---------------- */
  const cards = $$('.card');
  cards.forEach((card, i) => {
    gsap.from(card, { y: 80, opacity: 0, duration: 1, ease: 'power3.out',
      scrollTrigger: { trigger: card, start: 'top 92%' } });
    if (i === cards.length - 1 || reduce) return;
    gsap.fromTo(card, { scale: 1, filter: 'brightness(1)' }, {
      scale: .9 + i * .015, filter: 'brightness(.9)', ease: 'none', immediateRender: false,
      scrollTrigger: { trigger: cards[i + 1], start: 'top bottom', end: 'top 30%', scrub: true }
    });
  });

  /* ---------------- Proceso: scroll horizontal en desktop ---------------- */
  const mm = gsap.matchMedia();
  mm.add('(min-width: 861px) and (prefers-reduced-motion: no-preference)', () => {
    const track = $('.process__track');
    const dist = () => Math.max(0, track.scrollWidth - window.innerWidth);
    const tw = gsap.to(track, {
      x: () => -dist(), ease: 'none',
      scrollTrigger: {
        trigger: '.process', start: 'top top', end: () => '+=' + dist(),
        pin: '.process', scrub: 1, invalidateOnRefresh: true, anticipatePin: 1
      }
    });
    gsap.to('.process__bar span', { scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: '.process', start: 'top top', end: () => '+=' + dist(), scrub: true } });
    return () => tw.kill();
  });
  mm.add('(max-width: 860px)', () => {
    $$('.step').forEach(s => gsap.from(s, { y: 50, opacity: 0, duration: .9, ease: 'power3.out',
      scrollTrigger: { trigger: s, start: 'top 90%' } }));
  });

  /* ---------------- Trabajos: parallax suave ---------------- */
  $$('.project').forEach((p, i) => {
    gsap.from(p, { y: 100, opacity: 0, duration: 1.2, ease: 'expo.out',
      scrollTrigger: { trigger: p, start: 'top 90%' } });
    gsap.to($('.pm-word', p), { yPercent: i % 2 ? -25 : 25, ease: 'none',
      scrollTrigger: { trigger: p, start: 'top bottom', end: 'bottom top', scrub: true } });
  });

  /* ---------------- Contadores ---------------- */
  $$('.stat__num').forEach(el => {
    const end = +el.dataset.count, suffix = el.dataset.suffix || '';
    const o = { v: 0 };
    ScrollTrigger.create({
      trigger: el, start: 'top 90%', once: true,
      onEnter: () => gsap.to(o, { v: end, duration: 1.8, ease: 'power3.out',
        onUpdate: () => { el.textContent = Math.round(o.v) + suffix; } })
    });
  });

  /* ---------------- Cursor personalizado + botones magnéticos ---------------- */
  if (finePointer && !reduce) {
    const cursor = $('.cursor');
    const xTo = gsap.quickTo(cursor, 'x', { duration: .45, ease: 'power3' });
    const yTo = gsap.quickTo(cursor, 'y', { duration: .45, ease: 'power3' });
    window.addEventListener('mousemove', e => { xTo(e.clientX); yTo(e.clientY); cursor.style.opacity = 1; });
    document.addEventListener('mouseleave', () => { cursor.style.opacity = 0; });

    $$('a, button, label').forEach(el => {
      el.addEventListener('mouseenter', () => cursor.classList.add(el.matches('[data-cursor]') ? 'is-view' : 'is-hover'));
      el.addEventListener('mouseleave', () => cursor.classList.remove('is-hover', 'is-view'));
    });

    $$('.magnetic').forEach(el => {
      const strength = el.classList.contains('btn--lg') ? .35 : .3;
      el.addEventListener('mousemove', e => {
        const r = el.getBoundingClientRect();
        gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * strength, y: (e.clientY - r.top - r.height / 2) * strength, duration: .5, ease: 'power3.out' });
      });
      el.addEventListener('mouseleave', () => gsap.to(el, { x: 0, y: 0, duration: .9, ease: 'elastic.out(1, .4)' }));
    });
  }

  /* ---------------- Recalcular al cambiar tamaño ---------------- */
  let rT;
  window.addEventListener('resize', () => {
    clearTimeout(rT);
    rT = setTimeout(() => { buildMarquees(); ScrollTrigger.refresh(); }, 250);
  });
  window.addEventListener('load', () => { buildMarquees(); ScrollTrigger.refresh(); });
  if (document.fonts) document.fonts.ready.then(() => { buildMarquees(); ScrollTrigger.refresh(); });
})();
