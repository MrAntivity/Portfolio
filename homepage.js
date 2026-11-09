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
  themeButton.addEventListener('click', () => {
    const next = body.dataset.theme === 'light' ? 'dark' : 'light';
    setTheme(next); storage.set(next);
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
  function drawOrbit(time) {
    if (!ctx || !orbitWidth) return;
    ctx.clearRect(0, 0, orbitWidth, orbitHeight);
    const t = motion.matches ? .5 : time * .000065;
    const radius = Math.min(orbitWidth * .42, orbitHeight * .39);
    const cx = orbitWidth * .51, cy = orbitHeight * .48;
    const light = body.dataset.theme === 'light';
    for (let ring = 0; ring < 7; ring++) {
      const tilt = ring * .43 + .3;
      ctx.beginPath();
      for (let i = 0; i <= 120; i++) {
        const angle = i / 120 * Math.PI * 2 + t;
        const x = Math.cos(angle) * radius;
        const z = Math.sin(angle) * radius;
        const px = cx + x * Math.cos(tilt) - z * .32 * Math.sin(tilt);
        const py = cy + x * Math.sin(tilt) + z * .32 * Math.cos(tilt);
        if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        if (i % 15 === 0) {
          ctx.fillStyle = light ? 'rgba(50,80,120,.45)' : 'rgba(177,207,250,.6)';
          ctx.fillRect(px - 1, py - 1, 2, 2);
        }
      }
      ctx.strokeStyle = light ? 'rgba(50,80,120,.16)' : 'rgba(151,190,245,.19)';
      ctx.lineWidth = .65; ctx.stroke();
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
})();
