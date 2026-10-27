/* Savia — prototipo de la nueva home. GSAP 3.12.5 + ScrollTrigger + Lenis (locales). */
(function () {
  'use strict';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var hasGsap = typeof window.gsap !== 'undefined' && typeof window.ScrollTrigger !== 'undefined';
  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var lenis = null;

  /* ---------- Smooth scroll (Lenis) ---------- */
  if (!reduce && typeof window.Lenis !== 'undefined') {
    lenis = new window.Lenis({ lerp: 0.1, duration: 1.1, smoothWheel: true });
    if (hasGsap) {
      lenis.on('scroll', ScrollTrigger.update);
      gsap.ticker.add(function (t) { lenis.raf(t * 1000); });
      gsap.ticker.lagSmoothing(0);
    } else {
      var raf = function (t) { lenis.raf(t); requestAnimationFrame(raf); };
      requestAnimationFrame(raf);
    }
  }
  function scrollToTarget(el) {
    var off = -60;
    if (lenis) lenis.scrollTo(el, { offset: off, duration: 1.1 });
    else window.scrollTo({ top: el.getBoundingClientRect().top + window.pageYOffset + off, behavior: reduce ? 'auto' : 'smooth' });
  }

  /* ---------- Nav: glass, shrink, dark inversion, mobile menu, anchors ---------- */
  var nav = $('#nav');
  var darkSections = $$('[data-theme="dark"]');
  var navLinks = $$('.nav-links .navlink');
  var sectionsForNav = navLinks.map(function (a) { return $(a.getAttribute('href')); });
  function onScroll() {
    var y = window.pageYOffset || document.documentElement.scrollTop;
    nav.classList.toggle('is-scrolled', y > 40);
    var probe = nav.offsetHeight / 2, dark = false;
    for (var i = 0; i < darkSections.length; i++) {
      var r = darkSections[i].getBoundingClientRect();
      if (r.top <= probe && r.bottom >= probe) { dark = true; break; }
    }
    nav.classList.toggle('is-dark', dark && y > 40);
    var mid = window.innerHeight * 0.4, active = -1;
    sectionsForNav.forEach(function (s, i) { if (s) { var r = s.getBoundingClientRect(); if (r.top <= mid && r.bottom > mid) active = i; } });
    navLinks.forEach(function (a, i) { a.classList.toggle('is-active', i === active); });
  }
  if (lenis) lenis.on('scroll', onScroll);
  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  var menuBtn = $('#menuBtn');
  function setMenu(open) {
    document.body.classList.toggle('menu-open', open);
    menuBtn.setAttribute('aria-expanded', String(open));
    menuBtn.setAttribute('aria-label', open ? 'Cerrar menú' : 'Abrir menú');
    if (lenis) { open ? lenis.stop() : lenis.start(); }
  }
  menuBtn.addEventListener('click', function () { setMenu(!document.body.classList.contains('menu-open')); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape') setMenu(false); });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('a[href^="#"]');
    if (!a) return;
    var id = a.getAttribute('href');
    if (id === '#') { e.preventDefault(); return; }
    var el = $(id);
    if (!el) return;
    e.preventDefault();
    setMenu(false);
    if (id === '#top') { lenis ? lenis.scrollTo(0) : window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' }); return; }
    scrollToTarget(el);
    if (id === '#calc') el.open = true;
  });

  /* ---------- Reveal on enter (stagger via --i, max 5) ---------- */
  var revealEls = $$('.reveal, .mask');
  if (reduce || !('IntersectionObserver' in window)) {
    revealEls.forEach(function (el) { el.classList.add('in'); });
  } else {
    // clip-path hides .mask from IntersectionObserver, so masks are observed through their parent
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (!en.isIntersecting) return;
        var list = en.target.__reveal || [en.target];
        list.forEach(function (el) { el.classList.add('in'); });
        io.unobserve(en.target);
      });
    }, { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
    revealEls.forEach(function (el) {
      if (el.classList.contains('mask')) {
        var host = el.parentElement; (host.__reveal = host.__reveal || []).push(el); io.observe(host);
      } else io.observe(el);
    });
  }

  /* ---------- Abstract point mesh (decorative) ---------- */
  function buildMesh(svg, seed) {
    if (!svg) return null;
    var NS = 'http://www.w3.org/2000/svg', pts = [], rings = [[0, 1], [22, 8], [44, 12], [66, 16], [86, 20]];
    var cx = 100, cy = 118;
    rings.forEach(function (r, ri) {
      for (var k = 0; k < r[1]; k++) {
        var a = (k / r[1]) * Math.PI * 2 + ri * 0.35;
        var j = Math.sin((k + 1) * 12.9898 * (ri + seed)) * 2.5;
        pts.push({ x: cx + Math.cos(a) * (r[0] + j) * 0.86, y: cy + Math.sin(a) * (r[0] + j) * 1.18, ring: ri, k: k, n: r[1] });
      }
    });
    var lines = [], gL = document.createElementNS(NS, 'g'), gP = document.createElementNS(NS, 'g');
    function idx(ri, k) { var s = 0; for (var i = 0; i < ri; i++) s += rings[i][1]; return s + ((k % rings[ri][1]) + rings[ri][1]) % rings[ri][1]; }
    pts.forEach(function (p, i) {
      if (p.ring > 0) {
        lines.push([i, idx(p.ring, p.k + 1)]);
        var inner = p.ring - 1, kk = Math.round(p.k * rings[inner][1] / p.n);
        lines.push([i, idx(inner, kk)]);
      }
    });
    lines.forEach(function (l) {
      var a = pts[l[0]], b = pts[l[1]], ln = document.createElementNS(NS, 'line');
      ln.setAttribute('x1', a.x); ln.setAttribute('y1', a.y); ln.setAttribute('x2', b.x); ln.setAttribute('y2', b.y);
      var len = Math.hypot(b.x - a.x, b.y - a.y);
      ln.style.strokeDasharray = len; ln.style.strokeDashoffset = len;
      gL.appendChild(ln);
    });
    pts.forEach(function (p) {
      var c = document.createElementNS(NS, 'circle');
      c.setAttribute('cx', p.x); c.setAttribute('cy', p.y); c.setAttribute('r', p.ring === 0 ? 1.8 : 1.3);
      c.style.opacity = 0; gP.appendChild(c);
    });
    svg.appendChild(gL); svg.appendChild(gP);
    return { dots: $$('circle', svg), lines: $$('line', svg) };
  }
  function meshFinal(m) { if (!m) return; m.dots.forEach(function (d) { d.style.opacity = 1; }); m.lines.forEach(function (l) { l.style.strokeDashoffset = 0; }); }
  function meshTween(m, tl, at, dur) {
    // dots appear and join: 1.6s ease-out (scaled into timelines when scrubbed)
    tl.to(m.dots, { opacity: 1, duration: dur * 0.5, stagger: { each: dur * 0.5 / m.dots.length, from: 'center' }, ease: 'power2.out' }, at);
    tl.to(m.lines, { strokeDashoffset: 0, duration: dur * 0.6, stagger: { each: dur * 0.4 / m.lines.length }, ease: 'power2.out' }, at + dur * 0.2);
  }
  var heroMesh = buildMesh($('#heroMesh'), 1);
  var appMesh = buildMesh($('#appMesh'), 2);

  if (appMesh) {
    if (reduce || !hasGsap) meshFinal(appMesh);
    else {
      var appTl = gsap.timeline({ paused: true });
      meshTween(appMesh, appTl, 0, 1.6);
      ScrollTrigger.create({ trigger: '#paciente .app-phone', start: 'top 75%', once: true, onEnter: function () { appTl.play(); } });
    }
  }

  /* ---------- HERO: pinned 4-step scrub storyboard ---------- */
  var desktopHero = window.matchMedia('(min-width: 1024px)');
  var heroTl = null, heroST = null;
  function buildHero() {
    if (!hasGsap) return;
    var stage = $('#stage'), stepsLis = $$('#heroSteps li');
    var shot = function (k) { return $('.stage .shot[data-shot="' + k + '"]'); };
    var pshot = function (k) { return $('.stage .pshot[data-pshot="' + k + '"]'); };
    var lns = ['#ln1', '#ln2', '#ln3'].map(function (s) { return $(s); });
    lns.forEach(function (p) { gsap.set(p, { strokeDasharray: 1, strokeDashoffset: 1, opacity: 1 }); });
    gsap.set('.stage .shot', { opacity: 0 }); gsap.set(shot('hoy'), { opacity: 1 });
    gsap.set('.stage .pshot', { opacity: 0, transition: 'none' }); gsap.set(pshot('inicio'), { opacity: 1 });
    gsap.set('#heroEnd', { autoAlpha: 0, y: 24 });
    gsap.set(heroMesh.dots, { opacity: 0 }); heroMesh.lines.forEach(function (l) { gsap.set(l, { strokeDashoffset: l.style.strokeDasharray }); });

    var tl = gsap.timeline({ defaults: { ease: 'none' } });
    var X = function () { return -(stage.getBoundingClientRect().left + stage.offsetWidth / 2 - window.innerWidth / 2) / 1.0; };
    // step 2 (0.20–0.45)
    tl.to('#heroText', { y: -40, autoAlpha: 0, duration: 0.10, ease: 'power1.in' }, 0.20)
      .to(stage, { x: X, scale: 1.28, duration: 0.14, ease: 'power2.inOut' }, 0.20)
      .to(shot('hoy'), { opacity: 0, duration: 0.05 }, 0.25)
      .to(shot('tratamientos'), { opacity: 1, duration: 0.05 }, 0.25)
      .fromTo('.stage .shot[data-shot="tratamientos"] .shot-in', { scale: 1, transformOrigin: '100% 25%' }, { scale: 1.5, duration: 0.10, ease: 'power2.inOut' }, 0.27)
      .to('#hl-trat', { opacity: 1, duration: 0.03 }, 0.34)
      .fromTo('#chip-activo', { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.03 }, 0.35)
      .to(pshot('inicio'), { opacity: 0, duration: 0.05 }, 0.27)
      .to(pshot('citas'), { opacity: 1, duration: 0.05 }, 0.27)
      .to(lns[0], { strokeDashoffset: 0, duration: 0.07, ease: 'power1.inOut' }, 0.36)
      .to('#hl-hist', { opacity: 1, duration: 0.03 }, 0.42)
    // step 3 (0.45–0.75)
      .to([lns[0], '#hl-trat', '#chip-activo', '#hl-hist'], { opacity: 0, duration: 0.03 }, 0.46)
      .to(pshot('citas'), { opacity: 0, duration: 0.05 }, 0.48)
      .to(pshot('progreso'), { opacity: 1, duration: 0.05 }, 0.48)
      .to('#heroMesh', { opacity: 0.9, duration: 0.04 }, 0.49)
      .to('#hl-tabs', { opacity: 1, duration: 0.03 }, 0.56)
      .to(shot('tratamientos'), { opacity: 0, duration: 0.05 }, 0.55)
      .to(shot('progreso'), { opacity: 1, duration: 0.05 }, 0.55)
      .fromTo('.stage .shot[data-shot="progreso"] .shot-in', { scale: 1, transformOrigin: '88% 50%' }, { scale: 1.6, duration: 0.10, ease: 'power2.inOut' }, 0.57)
      .to(lns[1], { strokeDashoffset: 0, duration: 0.08, ease: 'power1.inOut' }, 0.62)
      .to('#hl-prog', { opacity: 1, duration: 0.03 }, 0.68)
      .fromTo('#chip-ad', { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.03 }, 0.69)
    // step 4 (0.75–1)
      .to([lns[1], '#hl-prog', '#chip-ad', '#hl-tabs'], { opacity: 0, duration: 0.03 }, 0.75)
      .to('#heroMesh', { opacity: 0.35, duration: 0.04 }, 0.75)
      .to(pshot('progreso'), { opacity: 0, duration: 0.04 }, 0.76)
      .to(pshot('inicio'), { opacity: 1, duration: 0.04 }, 0.76)
      .fromTo('#ripple', { opacity: 0.9, scale: 0.4 }, { opacity: 0, scale: 1.6, duration: 0.05, ease: 'power2.out' }, 0.80)
      .to(shot('progreso'), { opacity: 0, duration: 0.04 }, 0.80)
      .to(shot('inventario'), { opacity: 1, duration: 0.04 }, 0.80)
      .fromTo('.stage .shot[data-shot="inventario"] .shot-in', { scale: 1, transformOrigin: '90% 10%' }, { scale: 1.15, duration: 0.06, ease: 'power2.inOut' }, 0.80)
      .to(lns[2], { strokeDashoffset: 0, duration: 0.05, ease: 'power1.inOut' }, 0.82)
      .fromTo('#hl-row', { opacity: 0, x: -12 }, { opacity: 1, x: 0, duration: 0.03 }, 0.86)
      .fromTo('#chip-nuevo', { opacity: 0 }, { opacity: 1, duration: 0.02 }, 0.87)
      .to('.stage .hl.kpi', { opacity: 1, duration: 0.02, stagger: 0.02 }, 0.88)
      .to(stage, { x: 0, scale: 1, duration: 0.08, ease: 'power2.inOut' }, 0.88)
      .to('#heroEnd', { autoAlpha: 1, y: 0, duration: 0.06, ease: 'power2.out' }, 0.92)
      .to({}, { duration: 0.02 }, 0.98);
    meshTween(heroMesh, tl, 0.49, 0.16);
    var bounds = [0, 0.2, 0.45, 0.75, 1];
    function paintSteps(p) {
      stepsLis.forEach(function (li, i) {
        var a = bounds[i], b = bounds[i + 1];
        var f = Math.max(0, Math.min(1, (p - a) / (b - a)));
        li.style.setProperty('--p', (f * 100).toFixed(1) + '%');
        li.classList.toggle('on', p >= a && (p < b || (i === 3 && p >= a)));
      });
      $('#heroEnd').setAttribute('aria-hidden', p > 0.9 ? 'false' : 'true');
    }
    heroTl = tl;
    if (reduce) { tl.progress(1); paintSteps(1); return; }
    heroST = ScrollTrigger.create({
      trigger: '#heroPin', start: 'top top', end: '+=180%', pin: true, scrub: 0.6, animation: tl,
      invalidateOnRefresh: true, anticipatePin: 1,
      onUpdate: function (self) { paintSteps(self.progress); }
    });
    paintSteps(0);
  }
  function killHero() {
    if (heroST) { heroST.kill(true); heroST = null; }
    if (heroTl) { heroTl.progress(0).kill(); heroTl = null; }
    if (hasGsap) gsap.set(['#stage', '#heroText', '#heroEnd'], { clearProps: 'all' });
  }
  // load entrance (0.9s)
  if (hasGsap && !reduce) {
    gsap.from('.hl-in', { y: 16, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.08, delay: 0.1 });
    gsap.from('.stage .console, .stage .phone', { y: 24, opacity: 0, duration: 0.9, ease: 'power3.out', stagger: 0.12, delay: 0.25 });
  }
  if (desktopHero.matches) buildHero();
  var mqHandler = function (e) { killHero(); if (e.matches) buildHero(); if (hasGsap) ScrollTrigger.refresh(); };
  if (desktopHero.addEventListener) desktopHero.addEventListener('change', mqHandler); else desktopHero.addListener(mqHandler);

  /* ---------- Generic tabs with keyboard support ---------- */
  function tabs(list, onSelect) {
    var btns = $$('[role="tab"]', list);
    function select(b, focus) {
      btns.forEach(function (x) { var on = x === b; x.setAttribute('aria-selected', String(on)); x.tabIndex = on ? 0 : -1; });
      if (focus) b.focus();
      onSelect(b);
    }
    btns.forEach(function (b, i) {
      b.addEventListener('click', function () { select(b); });
      b.addEventListener('keydown', function (e) {
        var vertical = list.classList.contains('app-tabs');
        var next = (vertical ? e.key === 'ArrowDown' : e.key === 'ArrowRight'), prev = (vertical ? e.key === 'ArrowUp' : e.key === 'ArrowLeft');
        if (next || prev) { e.preventDefault(); select(btns[(i + (next ? 1 : -1) + btns.length) % btns.length], true); }
      });
    });
  }

  /* ---------- Cómo se conectan: journeys ---------- */
  var jLine = $('#jLine'), jSvg = $('#jSvg'), jLen = 0;
  function layoutJLine() {
    if (!jSvg) return;
    var w = jSvg.clientWidth || jSvg.getBoundingClientRect().width, h = jSvg.clientHeight || jSvg.getBoundingClientRect().height;
    if (!w || !h) return;
    jSvg.setAttribute('viewBox', '0 0 ' + w + ' ' + h);
    jLine.setAttribute('d', 'M0 ' + (h * 0.42) + ' C' + (w / 2) + ' ' + (h * 0.42) + ' ' + (w / 2) + ' ' + (h * 0.58) + ' ' + w + ' ' + (h * 0.58));
    jLen = jLine.getTotalLength();
    jLine.style.strokeDasharray = jLen;
  }
  function drawJLine() {
    if (!jLine) return;
    layoutJLine();
    if (reduce || !hasGsap) { jLine.style.strokeDashoffset = 0; return; }
    gsap.fromTo(jLine, { strokeDashoffset: jLen }, { strokeDashoffset: 0, duration: 1.2, ease: 'power1.inOut' });
  }
  window.addEventListener('resize', function () { layoutJLine(); if (jLine) jLine.style.strokeDashoffset = 0; });
  var tabList = $('#como [role="tablist"]');
  if (tabList) tabs(tabList, function (b) {
    var k = b.dataset.j;
    $$('#journey .shot').forEach(function (s) { s.classList.toggle('on', s.dataset.j === k); });
    $$('#journey .pshot').forEach(function (s) { s.classList.toggle('on', s.dataset.j === k); });
    $$('#journey .jpanel').forEach(function (p) { p.classList.toggle('on', p.id === 'jp-' + k); });
    drawJLine();
  });
  if (jLine) {
    layoutJLine(); jLine.style.strokeDashoffset = jLen || 9999;
    if (reduce || !hasGsap) drawJLine();
    else ScrollTrigger.create({ trigger: '#journey', start: 'top 70%', once: true, onEnter: drawJLine });
  }

  /* ---------- Consola: hover/focus/click areas ---------- */
  var items = $$('.consola-item');
  function setArea(btn) {
    items.forEach(function (b) { var on = b === btn; b.classList.toggle('on', on); b.setAttribute('aria-pressed', String(on)); });
    $$('.consola-view .shot').forEach(function (s) { s.classList.toggle('on', s.dataset.area === btn.dataset.area); });
  }
  items.forEach(function (b) {
    b.addEventListener('click', function () { setArea(b); });
    b.addEventListener('focus', function () { setArea(b); });
    b.addEventListener('mouseenter', function () { if (window.matchMedia('(hover: hover)').matches) setArea(b); });
  });

  /* ---------- App del paciente: screen tabs (0.4s crossfade) ---------- */
  var eList = $('.app-tabs');
  if (eList) tabs(eList, function (b) {
    $$('#app-phone-screen .pshot').forEach(function (s) { s.classList.toggle('on', s.dataset.pshot === b.dataset.e); });
  });

  /* ---------- Voice wave: only while visible ---------- */
  var wave = $('#wave');
  if (wave && !reduce && 'IntersectionObserver' in window) {
    new IntersectionObserver(function (en) { wave.classList.toggle('play', en[0].isIntersecting); }, { threshold: 0.2 }).observe(wave);
  }

  /* ---------- FAQ accordion: one open at a time, smooth height ---------- */
  $$('#faqList details').forEach(function (d) {
    var sum = $('summary', d), ans = $('.ans', d);
    sum.addEventListener('click', function (e) {
      e.preventDefault();
      var opening = !d.open;
      $$('#faqList details[open]').forEach(function (o) { if (o !== d) close(o); });
      opening ? open(d) : close(d);
    });
    function open(el) {
      el.open = true; var a = $('.ans', el);
      if (reduce || !hasGsap) return;
      gsap.fromTo(a, { height: 0, opacity: 0 }, { height: 'auto', opacity: 1, duration: 0.4, ease: 'power2.out', onComplete: refresh });
    }
    function close(el) {
      var a = $('.ans', el);
      if (reduce || !hasGsap) { el.open = false; return; }
      gsap.to(a, { height: 0, opacity: 0, duration: 0.3, ease: 'power2.in', onComplete: function () { el.open = false; gsap.set(a, { clearProps: 'height,opacity' }); refresh(); } });
    }
  });
  function refresh() { if (hasGsap) ScrollTrigger.refresh(); if (lenis && lenis.resize) lenis.resize(); }
  $$('details.fold').forEach(function (d) { d.addEventListener('toggle', refresh); });

  /* ---------- Calculadora (precios de referencia del sitio actual) ---------- */
  var PLANS = {
    Starter: { price: 500, min: 500, img: 'Básica', pac: 100, mods: false },
    Growth: { price: 1500, min: 2000, img: 5000, pac: 300, mods: 'opt' },
    Scale: { price: 2200, min: 4000, img: 12000, pac: 800, mods: 'opt' },
    Diamond: { price: 3400, min: 8000, img: Infinity, pac: Infinity, mods: 'incl' }
  };
  var cur = 'Scale', sel = $('#planSel');
  var fmt = function (n) { return n.toLocaleString('en-US'); };
  if (sel) {
    Object.keys(PLANS).forEach(function (k) {
      var b = document.createElement('button'); b.type = 'button'; b.textContent = k + ' · $' + fmt(PLANS[k].price);
      b.setAttribute('aria-pressed', String(k === cur)); b.dataset.p = k;
      b.addEventListener('click', function () { cur = k; $$('button', sel).forEach(function (x) { x.setAttribute('aria-pressed', String(x.dataset.p === k)); }); calc(); });
      sel.appendChild(b);
    });
    ['#rMin', '#rImg', '#rPac', '#mNut', '#mFit'].forEach(function (s) { $(s).addEventListener('input', calc); });
    calc();
  }
  function calc() {
    var p = PLANS[cur], rMin = $('#rMin'), rImg = $('#rImg'), rPac = $('#rPac'), mN = $('#mNut'), mF = $('#mFit');
    var imgUnl = p.img === Infinity, pacUnl = p.pac === Infinity;
    rImg.disabled = imgUnl; rPac.disabled = pacUnl; if (imgUnl) rImg.value = 0; if (pacUnl) rPac.value = 0;
    var modsOff = p.mods === false, modsIncl = p.mods === 'incl';
    [mN, mF].forEach(function (m) { m.disabled = modsOff || modsIncl; if (modsOff) m.checked = false; if (modsIncl) m.checked = true; });
    var addMin = +rMin.value * 500, addImg = +rImg.value * 1000, addPac = +rPac.value * 50;
    $('#oMin').textContent = '+' + fmt(addMin) + ' min';
    $('#oImg').textContent = imgUnl ? 'Ilimitadas' : '+' + fmt(addImg);
    $('#oPac').textContent = pacUnl ? 'Ilimitados' : '+' + fmt(addPac);
    $('#hMin').textContent = 'Incluye ' + fmt(p.min) + ' min/mes. +$75 USD por cada 500 min extra.';
    $('#hImg').textContent = imgUnl ? 'Este plan incluye imágenes ilimitadas.' : (typeof p.img === 'number' ? 'Incluye ' + fmt(p.img) + ' imágenes/mes. ' : 'Fotos de antes y después: básica. ') + '+$40 USD por cada 1,000 extra.';
    $('#hPac').textContent = pacUnl ? 'Este plan incluye pacientes ilimitados.' : 'Incluye hasta ' + fmt(p.pac) + ' pacientes activos. +$60 USD por cada 50 extra.';
    $('#hMods').textContent = modsOff ? 'Los módulos Nutrición y Fitness están disponibles desde Growth.' : modsIncl ? 'Diamond incluye los módulos Nutrición y Fitness.' : '';
    var total = p.price + (+rMin.value) * 75 + (+rImg.value) * 40 + (+rPac.value) * 60 + (modsIncl ? 0 : ((mN.checked ? 350 : 0) + (mF.checked ? 350 : 0)));
    $('#calcTotal').innerHTML = '$' + fmt(total) + '<small>USD / mes</small>';
    $('#calcBase').textContent = 'Plan base ' + cur + ' · $' + fmt(p.price) + ' USD/mes. Estimado de referencia.';
  }

  window.addEventListener('load', function () { if (hasGsap) ScrollTrigger.refresh(); });
})();
