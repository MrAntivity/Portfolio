(() => {
  'use strict';
  const body = document.body;
  const root = document.documentElement;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const themeButton = document.querySelector('.theme-toggle');
  const header = document.querySelector('.site-header');
  const hero = document.querySelector('.hero');
  const story = document.querySelector('.keyboard-story');
  const stage = document.querySelector('.keyboard-sticky');
  const steps = [...document.querySelectorAll('.story-step')];
  const logo = document.querySelector('.aurex-art');
  const clamp = (n, min = 0, max = 1) => Math.min(max, Math.max(min, n));
  const storage = {
    get() { try { return localStorage.getItem('aidenyue-theme-preference'); } catch { return null; } },
    set(value) { try { localStorage.setItem('aidenyue-theme-preference', value); } catch {} }
  };
  function setTheme(theme) {
    body.dataset.theme = theme;
    themeButton.setAttribute('aria-label', 'Switch to ' + (theme === 'dark' ? 'light' : 'dark') + ' theme');
    themeButton.setAttribute('aria-pressed', String(theme === 'light'));
    document.querySelector('meta[name="theme-color"]').content = theme === 'light' ? '#f5f6f8' : '#080a0e';
    drawOrbit(performance.now());
  }
  themeButton.addEventListener('click', async () => {
    const next = body.dataset.theme === 'light' ? 'dark' : 'light';
    const applyTheme = () => { setTheme(next); storage.set(next); };
    if (motion.matches || typeof document.startViewTransition !== 'function') {
      applyTheme();
      return;
    }
    const rect = themeButton.getBoundingClientRect();
    const x = rect.left + rect.width / 2;
    const y = rect.top + rect.height / 2;
    const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
    themeButton.disabled = true;
    themeButton.classList.add('switching');
    try {
      const transition = document.startViewTransition(applyTheme);
      await transition.ready;
      const reveal = root.animate(
        { clipPath: ['circle(0px at ' + x + 'px ' + y + 'px)', 'circle(' + radius + 'px at ' + x + 'px ' + y + 'px)'] },
        { duration: 850, easing: 'cubic-bezier(.22,1,.36,1)', pseudoElement: '::view-transition-new(root)', fill: 'both' }
      );
      await reveal.finished;
      await transition.finished;
    } catch {
      applyTheme();
    } finally {
      themeButton.disabled = false;
      themeButton.classList.remove('switching');
    }
  });
  document.getElementById('year').textContent = new Date().getFullYear();
  let revealObserver;
  let scrollFrame = 0;
  const links = [...document.querySelectorAll('.site-nav a')];
  const sections = links.map(link => document.querySelector(link.hash));
  function renderScroll() {
    scrollFrame = 0;
    const y = scrollY, height = innerHeight;
    root.style.setProperty('--reading-progress', clamp(y / Math.max(1, root.scrollHeight - height)));
    header.classList.toggle('scrolled', y > 40);
    let active = -1;
    sections.forEach((el, i) => { if (el.getBoundingClientRect().top <= height * .4) active = i; });
    links.forEach((link, i) => { if (i === active) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
    if (motion.matches) return;
    if (y < hero.offsetHeight) hero.style.setProperty('--portrait-y', clamp(y / hero.offsetHeight) * 75 + 'px');
    const r = logo.getBoundingClientRect();
    if (r.top < height && r.bottom > 0) {
      const p = clamp((height - r.top) / (height + r.height));
      logo.style.setProperty('--logo-y', (p - .5) * -35 + 'px');
      logo.style.setProperty('--logo-rotate', (p - .5) * 8 + 'deg');
    }
    const bounds = story.getBoundingClientRect();
    if (bounds.top < height && bounds.bottom > 0 && innerWidth > 760 && !body.classList.contains('keyboard-static')) {
      const progress = clamp((70 - bounds.top) / Math.max(1, story.offsetHeight - stage.offsetHeight));
      story.style.setProperty('--key-x', (progress - .5) * 24 + 'px');
      story.style.setProperty('--key-y', Math.sin(progress * Math.PI) * -10 + 'px');
      story.style.setProperty('--key-rotate', -4 + progress * 8 + 'deg');
      story.style.setProperty('--key-scale', .93 + Math.sin(progress * Math.PI) * .07);
      story.style.setProperty('--key-progress', Math.max(.03, progress));
      const activeStep = Math.min(2, Math.floor(progress * 3));
      steps.forEach((step, i) => {
        step.classList.toggle('active', i === activeStep);
        step.setAttribute('aria-hidden', String(i !== activeStep));
      });
    }
  }
  function queueScroll() { if (!scrollFrame) scrollFrame = requestAnimationFrame(renderScroll); }
  // The orbital field is decorative; limit pixel density and pause it offscreen.
  const canvas = document.getElementById('orbit-canvas');
  const ctx = canvas.getContext('2d');
  let orbitWidth = 0, orbitHeight = 0, orbitFrame = 0, heroVisible = true, lastFrame = 0;
  function resizeOrbit() {
    const rect = canvas.getBoundingClientRect();
    const ratio = Math.min(devicePixelRatio || 1, 1.5);
    orbitWidth = rect.width; orbitHeight = rect.height;
    canvas.width = Math.round(rect.width * ratio); canvas.height = Math.round(rect.height * ratio);
    if (ctx) ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    drawOrbit(performance.now());
  }
  const orbitPointer = { x: 0, y: 0, inside: false, strength: 0, tiltX: 0, tiltY: 0 };
  hero.addEventListener('pointermove', event => {
    if (event.pointerType !== 'mouse' || motion.matches) return;
    orbitPointer.x = event.clientX; orbitPointer.y = event.clientY;
    orbitPointer.inside = true;
  }, { passive: true });
  function releaseOrbit() { orbitPointer.inside = false; }
  hero.addEventListener('pointerleave', releaseOrbit);
  window.addEventListener('blur', releaseOrbit);
  motion.addEventListener('change', () => {
    releaseOrbit();
    orbitPointer.strength = 0;
    orbitPointer.tiltX = 0; orbitPointer.tiltY = 0;
  });
  function drawOrbit(time) {
    if (!ctx || !orbitWidth) return;
    ctx.clearRect(0, 0, orbitWidth, orbitHeight);
    const t = motion.matches ? .5 : time * .000065;
    const radius = Math.min(orbitWidth * .42, orbitHeight * .39);
    const baseX = orbitWidth * .51, baseY = orbitHeight * .48;
    const bounds = canvas.getBoundingClientRect();
    const mx = orbitPointer.x - bounds.left, my = orbitPointer.y - bounds.top;
    const distance = Math.hypot(mx - baseX, my - baseY);
    const target = orbitPointer.inside && !motion.matches ? clamp((radius + 170 - distance) / 150) : 0;
    orbitPointer.strength += (target - orbitPointer.strength) * .1;
    orbitPointer.tiltX += (clamp((mx - baseX) / Math.max(radius, 1), -1, 1) * target - orbitPointer.tiltX) * .075;
    orbitPointer.tiltY += (clamp((my - baseY) / Math.max(radius, 1), -1, 1) * target - orbitPointer.tiltY) * .075;
    const energy = motion.matches ? 0 : orbitPointer.strength;
    const cx = baseX + orbitPointer.tiltX * 13, cy = baseY + orbitPointer.tiltY * 10;
    const light = body.dataset.theme === 'light';
    const color = light ? '50,80,120' : '177,207,250';
    const reach = Math.min(180, radius * .7);
    if (energy > .01) {
      const glow = ctx.createRadialGradient(mx, my, 0, mx, my, reach);
      glow.addColorStop(0, 'rgba(' + color + ',' + energy * .12 + ')');
      glow.addColorStop(1, 'rgba(' + color + ',0)');
      ctx.fillStyle = glow; ctx.fillRect(mx - reach, my - reach, reach * 2, reach * 2);
    }
    for (let ring = 0; ring < 7; ring++) {
      const tilt = ring * .43 + .3 + orbitPointer.tiltX * .16;
      const depth = .32 + orbitPointer.tiltY * .07;
      const points = [];
      for (let i = 0; i <= 120; i++) {
        const angle = i / 120 * Math.PI * 2 + t;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        let px = cx + x * Math.cos(tilt) - z * depth * Math.sin(tilt);
        let py = cy + x * Math.sin(tilt) + z * depth * Math.cos(tilt);
        const dx = px - mx, dy = py - my;
        const d = Math.hypot(dx, dy);
        const heat = Math.pow(clamp(1 - d / Math.max(reach, 1)), 2) * energy;
        const force = heat * 42;
        px += dx / Math.max(d, 1) * force;
        py += dy / Math.max(d, 1) * force;
        points.push({ x: px, y: py, heat });
      }
      ctx.beginPath();
      points.forEach((point, i) => {
        if (i === 0) ctx.moveTo(point.x, point.y); else ctx.lineTo(point.x, point.y);
      });
      ctx.strokeStyle = 'rgba(' + color + ',' + ((light ? .16 : .19) + energy * .1) + ')';
      ctx.lineWidth = .65 + energy * .2; ctx.stroke();
      for (let i = 1; i < points.length; i++) {
        const point = points[i], previous = points[i - 1];
        if (point.heat > .025) {
          ctx.beginPath(); ctx.moveTo(previous.x, previous.y); ctx.lineTo(point.x, point.y);
          ctx.strokeStyle = 'rgba(' + color + ',' + point.heat * .85 + ')';
          ctx.lineWidth = 1.4; ctx.stroke();
        }
        if (i % 15 === 0) {
          ctx.beginPath(); ctx.arc(point.x, point.y, 1 + point.heat * 2.5, 0, Math.PI * 2);
          ctx.fillStyle = 'rgba(' + color + ',' + Math.min(1, .6 + point.heat) + ')';
          ctx.fill();
        }
      }
    }
  }
  function animateOrbit(time) {
    orbitFrame = 0;
    if (motion.matches || document.hidden || !heroVisible) return;
    if (time - lastFrame > 32) { drawOrbit(time); lastFrame = time; }
    orbitFrame = requestAnimationFrame(animateOrbit);
  }
  function startOrbit() {
    if (!orbitFrame && !motion.matches && !document.hidden && heroVisible) orbitFrame = requestAnimationFrame(animateOrbit);
  }
  function configureMotion() {
    body.classList.toggle('motion-ready', !motion.matches);
    const staticStory = innerHeight < 680 || innerWidth <= 760 || motion.matches;
    body.classList.toggle('keyboard-static', staticStory);
    steps.forEach(step => {
      if (staticStory) step.removeAttribute('aria-hidden');
      else step.setAttribute('aria-hidden', String(!step.classList.contains('active')));
    });
    revealObserver?.disconnect();
    body.classList.remove('reveal-ready');
    if (!motion.matches && 'IntersectionObserver' in window) {
      revealObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) { entry.target.classList.add('visible'); revealObserver.unobserve(entry.target); }
        });
      }, { threshold: .06 });
      document.querySelectorAll('[data-reveal]').forEach(el => revealObserver.observe(el));
      body.classList.add('reveal-ready');
    }
    cancelAnimationFrame(orbitFrame); orbitFrame = 0;
    resizeOrbit(); startOrbit(); queueScroll();
  }
  if ('IntersectionObserver' in window) new IntersectionObserver(entries => {
    heroVisible = entries[0].isIntersecting;
    if (heroVisible) startOrbit();
  }).observe(hero);
  document.addEventListener('visibilitychange', startOrbit);
  window.addEventListener('scroll', queueScroll, { passive: true });
  window.addEventListener('resize', configureMotion, { passive: true });
  motion.addEventListener('change', configureMotion);
  setTheme(storage.get() === 'light' ? 'light' : 'dark');
  configureMotion();

  // Only replace the pointer after a real mouse event on a suitable device.
  const finePointer = matchMedia('(hover: hover) and (pointer: fine)');
  const cursorDot = document.createElement('div');
  const cursorRing = document.createElement('div');
  cursorDot.className = 'cursor-dot'; cursorRing.className = 'cursor-ring';
  cursorDot.setAttribute('aria-hidden', 'true'); cursorRing.setAttribute('aria-hidden', 'true');
  body.append(cursorDot, cursorRing);
  let cursorX = 0, cursorY = 0, ringX = 0, ringY = 0, cursorFrame = 0;
  function placeCursor(element, x, y) {
    element.style.transform = 'translate3d(' + x + 'px,' + y + 'px,0) translate(-50%,-50%)';
  }
  function drawCursor() {
    cursorFrame = 0;
    ringX += (cursorX - ringX) * .2;
    ringY += (cursorY - ringY) * .2;
    placeCursor(cursorRing, ringX, ringY);
    if (Math.abs(cursorX - ringX) + Math.abs(cursorY - ringY) > .15)
      cursorFrame = requestAnimationFrame(drawCursor);
  }
  function hideCursor() {
    body.classList.remove('cursor-ready', 'cursor-hover', 'cursor-down');
    cancelAnimationFrame(cursorFrame); cursorFrame = 0;
  }
  window.addEventListener('pointermove', event => {
    if (!finePointer.matches || motion.matches || event.pointerType !== 'mouse') { hideCursor(); return; }
    cursorX = event.clientX; cursorY = event.clientY;
    if (!body.classList.contains('cursor-ready')) {
      ringX = cursorX; ringY = cursorY;
      placeCursor(cursorRing, ringX, ringY);
    }
    placeCursor(cursorDot, cursorX, cursorY);
    body.classList.add('cursor-ready');
    body.classList.toggle('cursor-hover', !!event.target.closest('a,button,summary,[role="button"]'));
    if (!cursorFrame) cursorFrame = requestAnimationFrame(drawCursor);
  }, { passive: true });
  window.addEventListener('pointerdown', event => {
    if (event.pointerType === 'mouse' && body.classList.contains('cursor-ready')) body.classList.add('cursor-down');
  }, { passive: true });
  window.addEventListener('pointerup', () => body.classList.remove('cursor-down'), { passive: true });
  root.addEventListener('pointerleave', hideCursor);
  window.addEventListener('blur', hideCursor);
  document.addEventListener('visibilitychange', () => { if (document.hidden) hideCursor(); });
  finePointer.addEventListener('change', hideCursor);
  motion.addEventListener('change', hideCursor);
})();
