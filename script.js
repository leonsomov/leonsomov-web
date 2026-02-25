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

  // ── Interaction input (mouse / gyro) ──

  const input = { x: 0, y: 0 };
  const smoothed = { x: 0, y: 0 };
  const lerp = 0.03;

  window.addEventListener('mousemove', (e) => {
    input.x = (e.clientX / window.innerWidth - 0.5) * 2;
    input.y = (e.clientY / window.innerHeight - 0.5) * 2;
  });

  function handleOrientation(e) {
    const gamma = Math.max(-30, Math.min(30, e.gamma || 0));
    const beta = Math.max(-30, Math.min(30, (e.beta || 0) - 45));
    input.x = gamma / 30;
    input.y = beta / 30;
  }

  if (window.DeviceOrientationEvent) {
    if (typeof DeviceOrientationEvent.requestPermission === 'function') {
      // iOS 13+ — don't prompt, just skip
    } else {
      window.addEventListener('deviceorientation', handleOrientation);
    }
  }

  // ── Waveforms ──

  const waveCount = 8;
  const waves = [];

  function randomWave() {
    return {
      yBase: 0.1 + Math.random() * 0.8,
      yTarget: 0.1 + Math.random() * 0.8,
      ySpeed: 0.00002 + Math.random() * 0.00004,
      opacity: 0.02 + Math.random() * 0.04,
      freqs: [
        { freq: 2 + Math.random() * 4, speed: 0.0002 + Math.random() * 0.0004, phase: Math.random() * Math.PI * 2, amp: 0.6 + Math.random() * 0.4 },
        { freq: 4 + Math.random() * 6, speed: 0.0003 + Math.random() * 0.0005, phase: Math.random() * Math.PI * 2, amp: 0.2 + Math.random() * 0.3 },
        { freq: 7 + Math.random() * 8, speed: 0.0001 + Math.random() * 0.0003, phase: Math.random() * Math.PI * 2, amp: 0.1 + Math.random() * 0.15 },
      ],
    };
  }

  for (let i = 0; i < waveCount; i++) {
    waves.push(randomWave());
  }

  function drawWaveform(w, h, t, wave) {
    const dy = wave.yTarget - wave.yBase;
    wave.yBase += dy * wave.ySpeed * 16;
    if (Math.abs(dy) < 0.01) {
      wave.yTarget = 0.1 + Math.random() * 0.8;
    }

    ctx.beginPath();
    const color = `rgba(255,255,255,${wave.opacity})`;
    ctx.strokeStyle = color;
    ctx.lineWidth = 1 * scale;
    ctx.shadowColor = color;
    ctx.shadowBlur = 4 * scale;

    const centerY = h * wave.yBase + smoothed.y * h * 0.03;

    for (let x = 0; x < w; x++) {
      const nx = x / w;
      let y = 0;
      for (const f of wave.freqs) {
        y += Math.sin(nx * f.freq + t * f.speed + f.phase) * f.amp;
      }
      y = centerY + y * h * 0.05;

      if (x === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }

    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // ── Blobs ──

  const blobs = [
    { cx: 0.3, cy: 0.25, r: 0.4, sx: 0.00025, sy: 0.0002, ox: 0, alpha: 0.008, influence: 0.012 },
    { cx: 0.7, cy: 0.7, r: 0.35, sx: 0.0002, sy: 0.00028, ox: 1200, alpha: 0.006, influence: 0.01 },
    { cx: 0.5, cy: 0.45, r: 0.45, sx: 0.00015, sy: 0.00025, ox: 2500, alpha: 0.009, influence: 0.015 },
  ];

  // ── Background draw ──

  function draw(t) {
    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);
    ctx.globalCompositeOperation = 'lighter';

    smoothed.x += (input.x - smoothed.x) * lerp;
    smoothed.y += (input.y - smoothed.y) * lerp;

    for (const b of blobs) {
      const driftX = 0.12 * Math.sin((t + b.ox) * b.sx);
      const driftY = 0.12 * Math.cos((t + b.ox) * b.sy);

      const x = (b.cx + driftX + smoothed.x * b.influence) * w;
      const y = (b.cy + driftY + smoothed.y * b.influence) * h;
      const r = b.r * Math.min(w, h);

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(255,255,255,${b.alpha})`);
      grad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    for (const wave of waves) {
      drawWaveform(w, h, t, wave);
    }
  }

  // ── Monogram particle dissolve ──

  const wrap = document.querySelector('.monogram-wrap');
  const monoSvg = document.querySelector('.monogram-svg');

  let particles = [];
  let dissolving = false;
  let particlesReady = false;
  let monoOffsetX = 0;
  let monoOffsetY = 0;

  function sampleMonogram() {
    if (!monoSvg) return;

    const rect = monoSvg.getBoundingClientRect();
    const sampleW = Math.round(rect.width);
    const sampleH = Math.round(rect.height);
    if (sampleW === 0 || sampleH === 0) return;

    // Store monogram position in bg-canvas coordinate space
    monoOffsetX = rect.left * dpr * scale;
    monoOffsetY = rect.top * dpr * scale;

    const offscreen = document.createElement('canvas');
    offscreen.width = sampleW;
    offscreen.height = sampleH;
    const offCtx = offscreen.getContext('2d');

    const clone = monoSvg.cloneNode(true);
    clone.setAttribute('width', sampleW);
    clone.setAttribute('height', sampleH);
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.querySelectorAll('path').forEach(p => p.setAttribute('fill', '#ffffff'));

    const svgData = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);
    const img = new Image();

    img.onload = () => {
      offCtx.drawImage(img, 0, 0, sampleW, sampleH);
      URL.revokeObjectURL(url);

      const imageData = offCtx.getImageData(0, 0, sampleW, sampleH);
      const data = imageData.data;

      particles = [];
      const step = 2;
      for (let y = 0; y < sampleH; y += step) {
        for (let x = 0; x < sampleW; x += step) {
          const i = (y * sampleW + x) * 4;
          if (data[i + 3] > 128) {
            const angle = Math.random() * Math.PI * 2;
            const speed = 0.5 + Math.random() * 2.0;
            particles.push({
              homeX: monoOffsetX + x * dpr * scale,
              homeY: monoOffsetY + y * dpr * scale,
              x: 0,
              y: 0,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              size: (0.6 + Math.random() * 0.6) * dpr * scale,
              alpha: 0.6 + Math.random() * 0.4,
            });
          }
        }
      }
      particlesReady = true;
    };

    img.src = url;
  }

  setTimeout(sampleMonogram, 300);
  window.addEventListener('resize', () => {
    particlesReady = false;
    setTimeout(sampleMonogram, 200);
  });

  let dissolveProgress = 0;

  if (wrap) {
    wrap.addEventListener('mouseenter', () => {
      if (!particlesReady) return;
      dissolving = true;
      wrap.classList.add('dissolving');
    });

    wrap.addEventListener('mouseleave', () => {
      dissolving = false;
    });
  }

  function drawParticles() {
    if (!particlesReady) return;
    if (dissolveProgress <= 0 && !dissolving) {
      if (wrap) wrap.classList.remove('dissolving');
      return;
    }

    // LFO-slow dissolve and reassembly
    if (dissolving) {
      dissolveProgress = Math.min(1, dissolveProgress + 0.001);
    } else {
      dissolveProgress = Math.max(0, dissolveProgress - 0.0015);
      if (dissolveProgress <= 0) {
        if (wrap) wrap.classList.remove('dissolving');
        return;
      }
    }

    if (wrap && dissolveProgress > 0) {
      wrap.classList.add('dissolving');
    }

    const ease = dissolveProgress * dissolveProgress;
    // Spread scales with canvas size — particles fly across the whole viewport
    const spread = Math.max(canvas.width, canvas.height) * 0.8;

    for (const p of particles) {
      p.x = p.homeX + p.vx * ease * spread;
      p.y = p.homeY + p.vy * ease * spread;

      const alpha = p.alpha * (1 - ease * 0.85);

      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  // ── Main loop ──

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    draw(0);
    return;
  }

  function loop(t) {
    draw(t);
    drawParticles();  // renders on bg-canvas — particles spread across full viewport
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
