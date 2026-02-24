(() => {
  const canvas = document.querySelector('.bg-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');

  const dpr = Math.min(devicePixelRatio || 1, 2);
  const scale = 0.5;

  function resize() {
    canvas.width = window.innerWidth * dpr * scale;
    canvas.height = window.innerHeight * dpr * scale;
  }

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(resize, 150);
  });
  resize();

  const blobs = [
    { cx: 0.3, cy: 0.25, r: 0.35, sx: 0.0004, sy: 0.0003, ox: 0,    alpha: 0.04  },
    { cx: 0.7, cy: 0.7,  r: 0.3,  sx: 0.0003, sy: 0.0005, ox: 1000, alpha: 0.035 },
    { cx: 0.5, cy: 0.5,  r: 0.4,  sx: 0.0002, sy: 0.0004, ox: 2000, alpha: 0.045 },
  ];

  function draw(t) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    for (const b of blobs) {
      const x = (b.cx + 0.15 * Math.sin((t + b.ox) * b.sx)) * w;
      const y = (b.cy + 0.15 * Math.cos((t + b.ox) * b.sy)) * h;
      const r = b.r * Math.min(w, h);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${b.alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    draw(0);
    return;
  }

  function loop(t) {
    draw(t);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
