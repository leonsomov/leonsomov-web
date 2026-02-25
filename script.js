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

  // ── Audio-reactive energy ──

  let audioEnergy = 0;
  const waveDecayRates = []; // per-wave staggered decay

  // Per-voice-type energy for pad visuals
  let droneEnergy = 0;
  let motifEnergy = 0;
  let textureEnergy = 0;

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
      energy: 0,
    };
  }

  for (let i = 0; i < waveCount; i++) {
    waves.push(randomWave());
    waveDecayRates.push(0.978 + Math.random() * 0.014);
  }

  function drawWaveform(w, h, t, wave, waveIdx) {
    const dy = wave.yTarget - wave.yBase;
    wave.yBase += dy * wave.ySpeed * 16;
    if (Math.abs(dy) < 0.01) {
      wave.yTarget = 0.1 + Math.random() * 0.8;
    }

    wave.energy = wave.energy * waveDecayRates[waveIdx];
    if (audioEnergy > wave.energy) wave.energy = audioEnergy;

    const e = wave.energy;
    const opacityBoost = 1 + e * 3;
    const ampBoost = 1 + e * 1.5;
    const dotBoost = 1 + e * 0.5;

    const centerY = h * wave.yBase + smoothed.y * h * 0.03;
    const dotSpacing = 6 * scale;
    const dotSize = 1.2 * scale * dotBoost;

    for (let x = 0; x < w; x += dotSpacing) {
      const nx = x / w;
      let y = 0;
      for (const f of wave.freqs) {
        y += Math.sin(nx * f.freq + t * f.speed + f.phase) * f.amp;
      }
      y = centerY + y * h * 0.05 * ampBoost;

      const edgeFade = Math.sin(nx * Math.PI);
      const alpha = wave.opacity * edgeFade * opacityBoost;

      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(x, y, dotSize, dotSize);
    }
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

    audioEnergy *= 0.985;
    droneEnergy *= 0.992;
    motifEnergy *= 0.975;
    textureEnergy *= 0.988;

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

    for (let i = 0; i < waves.length; i++) {
      drawWaveform(w, h, t, waves[i], i);
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

  // ── Particle state machine (pointerdown + decay) ──
  // Replaces mouseenter/mouseleave — works on mobile and desktop.

  let particleEnergy = 0; // 0 = assembled, 1 = fully scattered

  // Decay rate per frame depends on active quadrant
  function getParticleDecayRate() {
    const q = getDominantQuadrant(getMacroX(), getMacroY());
    // Tibetan = very slow ~5-8s, Eno = slow ~5s, Glass = medium ~3s, Hainbach = fast ~2s
    // At 60fps, decay per frame: rate^60 ≈ target after N seconds
    if (q === 'tibetan') return 0.9955;  // ~7s
    if (q === 'eno') return 0.993;       // ~5s
    if (q === 'glass') return 0.985;     // ~3s
    if (q === 'hainbach') return 0.975;  // ~2s
    return 0.99;
  }

  if (wrap) {
    wrap.addEventListener('pointerdown', (e) => {
      if (!particlesReady) return;
      particleEnergy = 1.0;
      dissolving = true;
      wrap.classList.add('dissolving');
      if (audioActive) randomizePatch();
    });
  }

  let dissolveProgress = 0;

  function drawParticles() {
    if (!particlesReady) return;

    // Decay particle energy each frame
    if (particleEnergy > 0) {
      particleEnergy *= getParticleDecayRate();
      if (particleEnergy < 0.002) {
        particleEnergy = 0;
        dissolving = false;
      }
    }

    // Smooth dissolve progress — slower scatter, very slow reassembly
    const targetProgress = particleEnergy;
    if (targetProgress > dissolveProgress) {
      dissolveProgress += (targetProgress - dissolveProgress) * 0.04;
    } else {
      dissolveProgress += (targetProgress - dissolveProgress) * 0.008;
    }

    // Snap to zero with wide threshold to avoid glitching
    if (dissolveProgress < 0.01 && particleEnergy <= 0) {
      dissolveProgress = 0;
      if (wrap) wrap.classList.remove('dissolving');
      return;
    }

    // Only add dissolving class above a visible threshold
    if (wrap) {
      if (dissolveProgress > 0.02) {
        wrap.classList.add('dissolving');
      } else {
        wrap.classList.remove('dissolving');
      }
    }

    const ease = dissolveProgress * dissolveProgress;
    const spread = Math.max(canvas.width, canvas.height) * 0.6;

    for (const p of particles) {
      p.x = p.homeX + p.vx * ease * spread;
      p.y = p.homeY + p.vy * ease * spread;

      const alpha = p.alpha * (1 - ease * 0.85);

      ctx.fillStyle = `rgba(255,255,255,${alpha})`;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  // ── Flux Control System ──

  const knobDefs = [
    { id: 'x', min: 0, max: 1, value: 0.42, exp: false, randomMinNorm: 0.08, randomMaxNorm: 0.92 },
    { id: 'y', min: 0, max: 1, value: 0.58, exp: false, randomMinNorm: 0.08, randomMaxNorm: 0.92 },
  ];

  const knobState = {};
  const controlElements = {};
  const synthPanel = document.querySelector('.synth-panel');

  function clamp(v, min, max) {
    return Math.max(min, Math.min(max, v));
  }

  function getNorm(id) {
    const def = knobDefs.find(d => d.id === id);
    if (!def) return 0;
    return (knobState[id] - def.min) / (def.max - def.min);
  }

  function setFromNorm(id, norm) {
    norm = clamp(norm, 0, 1);
    const def = knobDefs.find(d => d.id === id);
    if (!def) return;
    knobState[id] = def.min + norm * (def.max - def.min);
  }

  function getMacroX() {
    return knobState.x ?? 0.42;
  }

  function getMacroY() {
    return knobState.y ?? 0.58;
  }

  // ── Quadrant System ──
  // Layout:
  //   Y=1 (top): Glass (left) | Tibetan (right)
  //   Y=0 (bottom): Eno (left) | Hainbach (right)

  function getQuadrantWeights(x, y) {
    return {
      eno: (1 - x) * (1 - y),
      glass: (1 - x) * y,
      tibetan: x * y,
      hainbach: x * (1 - y),
    };
  }

  function getDominantQuadrant(x, y) {
    const w = getQuadrantWeights(x, y);
    let best = 'eno';
    let bestVal = w.eno;
    if (w.glass > bestVal) { best = 'glass'; bestVal = w.glass; }
    if (w.tibetan > bestVal) { best = 'tibetan'; bestVal = w.tibetan; }
    if (w.hainbach > bestVal) { best = 'hainbach'; }
    return best;
  }

  function getControlDescriptor() {
    const q = getDominantQuadrant(getMacroX(), getMacroY());
    if (q === 'eno') return 'ENO — Space & Silence';
    if (q === 'glass') return 'GLASS — Repetition & Pulse';
    if (q === 'tibetan') return 'TIBETAN — Drones & Overtones';
    return 'HAINBACH — Texture & Degradation';
  }

  function updateControlVisual() {
    const el = controlElements.xy;
    if (!el) return;

    const x = getMacroX();
    const y = getMacroY();
    if (el.dot) {
      el.dot.style.left = `${Math.round(x * 100)}%`;
      el.dot.style.top = `${Math.round((1 - y) * 100)}%`;
    }
    el.pad.setAttribute('aria-valuetext', getControlDescriptor());
  }

  // Smoothed energy for dot reactivity (avoids jitter)
  let dotEnergy = 0;

  function updateDotReactivity() {
    const el = controlElements.xy;
    if (!el || !el.dot) return;

    // Slow smooth toward audio energy
    const target = Math.max(audioEnergy, droneEnergy * 0.6, motifEnergy * 0.8, textureEnergy * 0.5);
    dotEnergy += (target - dotEnergy) * 0.04;

    const e = dotEnergy;
    const size = 10 + e * 14; // 10px base, up to 24px
    const glowSpread = 3 + e * 12;
    const glowAlpha = 0.1 + e * 0.25;

    el.dot.style.width = `${size}px`;
    el.dot.style.height = `${size}px`;
    el.dot.style.boxShadow = `0 0 ${10 + e * 16}px ${glowSpread}px rgba(255,255,255,${glowAlpha})`;
  }

  // ── Pad Canvas Aura ──

  let padCanvas = null;
  let padCtx = null;
  let auraTime = 0;

  function drawPadAura() {
    if (!padCanvas || !padCtx) return;

    const w = padCanvas.width;
    const h = padCanvas.height;
    if (w === 0 || h === 0) return;
    padCtx.clearRect(0, 0, w, h);

    const x = getMacroX();
    const y = getMacroY();
    const cx = w * 0.5;
    const cy = h * 0.5;
    const posX = x * w;
    const posY = (1 - y) * h;
    const radius = Math.min(w, h) * 0.5;

    auraTime += 0.016;

    // Clip to circle
    padCtx.save();
    padCtx.beginPath();
    padCtx.arc(cx, cy, radius, 0, Math.PI * 2);
    padCtx.clip();

    // ── Soft ambient base — always breathing ──
    const baseBreathe = Math.sin(auraTime * 0.002 * Math.PI * 2) * 0.5 + 0.5;
    const baseAlpha = 0.006 + baseBreathe * 0.004;
    const baseGrad = padCtx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    baseGrad.addColorStop(0, `rgba(255,255,255,${baseAlpha})`);
    baseGrad.addColorStop(0.7, `rgba(255,255,255,${baseAlpha * 0.3})`);
    baseGrad.addColorStop(1, 'rgba(255,255,255,0)');
    padCtx.fillStyle = baseGrad;
    padCtx.fillRect(0, 0, w, h);

    if (!audioActive) {
      padCtx.restore();
      return;
    }

    // ── Position glow — soft colored light that follows the dot ──
    const weights = getQuadrantWeights(x, y);
    const posColor = [
      Math.round(weights.eno * 170 + weights.glass * 255 + weights.tibetan * 200 + weights.hainbach * 255),
      Math.round(weights.eno * 195 + weights.glass * 235 + weights.tibetan * 175 + weights.hainbach * 200),
      Math.round(weights.eno * 255 + weights.glass * 205 + weights.tibetan * 255 + weights.hainbach * 175),
    ];

    const breathe = Math.sin(auraTime * 0.003 * Math.PI * 2) * 0.5 + 0.5;
    const energy = Math.max(droneEnergy * 0.7, motifEnergy, textureEnergy * 0.6);

    // Wide soft glow around position
    const glowR = radius * (0.35 + energy * 0.3 + breathe * 0.1);
    const glowAlpha = 0.025 + energy * 0.045 + breathe * 0.01;
    const g1 = padCtx.createRadialGradient(posX, posY, 0, posX, posY, glowR);
    g1.addColorStop(0, `rgba(${posColor[0]},${posColor[1]},${posColor[2]},${clamp(glowAlpha, 0, 0.1)})`);
    g1.addColorStop(0.4, `rgba(${posColor[0]},${posColor[1]},${posColor[2]},${clamp(glowAlpha * 0.35, 0, 0.04)})`);
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    padCtx.fillStyle = g1;
    padCtx.fillRect(0, 0, w, h);

    // Drifting haze — two slow-moving layers
    for (let i = 0; i < 2; i++) {
      const driftX = Math.sin(auraTime * (0.0006 + i * 0.0003) * Math.PI * 2 + i * 2.5) * (radius * 0.08);
      const driftY = Math.cos(auraTime * (0.0008 + i * 0.0002) * Math.PI * 2 + i * 1.8) * (radius * 0.08);
      const hazeR = glowR * (1.4 + i * 0.5);
      const hazeAlpha = (0.01 + energy * 0.018) / (i + 1);

      const g2 = padCtx.createRadialGradient(posX + driftX, posY + driftY, 0, posX + driftX, posY + driftY, hazeR);
      g2.addColorStop(0, `rgba(${posColor[0]},${posColor[1]},${posColor[2]},${clamp(hazeAlpha, 0, 0.05)})`);
      g2.addColorStop(1, 'rgba(0,0,0,0)');
      padCtx.fillStyle = g2;
      padCtx.fillRect(0, 0, w, h);
    }

    padCtx.restore();
  }

  function createControls() {
    if (!synthPanel) return;
    synthPanel.textContent = '';

    for (const def of knobDefs) knobState[def.id] = def.value;

    const container = document.createElement('div');
    container.className = 'flux-control xy-control';

    const pad = document.createElement('div');
    pad.className = 'xy-pad';
    pad.tabIndex = 0;
    pad.setAttribute('role', 'slider');
    pad.setAttribute('aria-label', 'Ambient XY control — drag to explore sonic worlds');
    pad.setAttribute('aria-valuemin', '0');
    pad.setAttribute('aria-valuemax', '100');

    // Pad canvas for organic aura
    padCanvas = document.createElement('canvas');
    padCanvas.className = 'xy-pad-canvas';
    padCanvas.setAttribute('aria-hidden', 'true');

    // Position dot
    const dot = document.createElement('div');
    dot.className = 'xy-dot';

    pad.appendChild(padCanvas);
    pad.appendChild(dot);
    container.appendChild(pad);
    synthPanel.appendChild(container);

    controlElements.xy = { container, pad, dot };
    updateControlVisual();

    // Size pad canvas to match pad
    const ro = new ResizeObserver(() => {
      const rect = pad.getBoundingClientRect();
      padCanvas.width = Math.round(rect.width);
      padCanvas.height = Math.round(rect.height);
      padCtx = padCanvas.getContext('2d');
    });
    ro.observe(pad);
  }

  // ── XY Drag Interaction ──

  let xyActive = false;
  let xyPointerId = null;
  const xyLatch = { x: 0.42, y: 0.58 };

  function latchCurrentXY() {
    xyLatch.x = getMacroX();
    xyLatch.y = getMacroY();
  }

  function reapplyLatchedXY() {
    setFromNorm('x', xyLatch.x);
    setFromNorm('y', xyLatch.y);
    updateControlVisual();
    syncKnobToAudio('xy');
  }

  function getXYFromEvent(pad, e) {
    const touch = (e.touches && e.touches[0]) || (e.changedTouches && e.changedTouches[0]) || null;
    const clientX = e.clientX ?? (touch ? touch.clientX : null);
    const clientY = e.clientY ?? (touch ? touch.clientY : null);
    if (clientX === null || clientY === null) return null;

    const rect = pad.getBoundingClientRect();
    const x = clamp((clientX - rect.left) / rect.width, 0, 1);
    const y = clamp(1 - (clientY - rect.top) / rect.height, 0, 1);
    return { x, y };
  }

  function applyXYFromEvent(e) {
    const el = controlElements.xy;
    if (!el) return;
    const pos = getXYFromEvent(el.pad, e);
    if (!pos) return;

    setFromNorm('x', pos.x);
    setFromNorm('y', pos.y);
    latchCurrentXY();
    updateControlVisual();
    syncKnobToAudio('xy');
  }

  function onControlPointerDown(e) {
    if (!e.target.closest('.xy-pad')) return;

    const pad = controlElements.xy ? controlElements.xy.pad : null;
    xyActive = true;
    xyPointerId = e.pointerId;
    if (pad && typeof pad.setPointerCapture === 'function') {
      try {
        pad.setPointerCapture(e.pointerId);
      } catch (_) {}
    }

    applyXYFromEvent(e);
    if (e.cancelable) e.preventDefault();
  }

  function onControlPointerMove(e) {
    if (!xyActive || e.pointerId !== xyPointerId) return;
    applyXYFromEvent(e);
    if (e.cancelable) e.preventDefault();
  }

  function onControlPointerEnd(e) {
    if (!xyActive && xyPointerId === null) return;
    if (xyPointerId !== null && e.pointerId !== xyPointerId) return;

    const pad = controlElements.xy ? controlElements.xy.pad : null;
    if (pad && typeof pad.releasePointerCapture === 'function' && xyPointerId !== null) {
      try {
        pad.releasePointerCapture(xyPointerId);
      } catch (_) {}
    }

    xyActive = false;
    xyPointerId = null;
    reapplyLatchedXY();
  }

  function onControlKeyDown(e) {
    const pad = e.target.closest('.xy-pad');
    if (!pad) return;

    let dx = 0;
    let dy = 0;
    const step = e.shiftKey ? 0.07 : 0.03;

    if (e.key === 'ArrowLeft') dx = -step;
    if (e.key === 'ArrowRight') dx = step;
    if (e.key === 'ArrowDown') dy = -step;
    if (e.key === 'ArrowUp') dy = step;

    if (e.key === 'Home') {
      setFromNorm('x', 0.2);
      setFromNorm('y', 0.2);
      latchCurrentXY();
      updateControlVisual();
      syncKnobToAudio('xy');
      e.preventDefault();
      return;
    }

    if (e.key === 'End') {
      setFromNorm('x', 0.82);
      setFromNorm('y', 0.82);
      latchCurrentXY();
      updateControlVisual();
      syncKnobToAudio('xy');
      e.preventDefault();
      return;
    }

    if (dx !== 0 || dy !== 0) {
      setFromNorm('x', getNorm('x') + dx);
      setFromNorm('y', getNorm('y') + dy);
      latchCurrentXY();
      updateControlVisual();
      syncKnobToAudio('xy');
      e.preventDefault();
    }
  }

  if (synthPanel) {
    synthPanel.addEventListener('pointerdown', onControlPointerDown);
    synthPanel.addEventListener('pointermove', onControlPointerMove);
    synthPanel.addEventListener('pointerup', onControlPointerEnd);
    synthPanel.addEventListener('pointercancel', onControlPointerEnd);
    synthPanel.addEventListener('keydown', onControlKeyDown);
  }
  window.addEventListener('pointerup', onControlPointerEnd);
  window.addEventListener('pointercancel', onControlPointerEnd);

  createControls();
  latchCurrentXY();

  // ── Generative Ambient Synth — 4 Sonic Worlds ──

  const breatheBtn = document.querySelector('.breathe-btn');
  let audioCtx = null;
  let audioActive = false;
  let masterGain = null;
  let limiter = null;
  let filter = null;
  let padFilter = null;
  let moodFilter = null;
  let delay = null;
  let delayFeedback = null;
  let reverb = null;

  // Long-tail character layers
  let crystalSend = null;
  let crystalDelay = null;
  let crystalFeedback = null;
  let crystalHP = null;
  let crystalLP = null;
  let crystalMix = null;
  let prismSend = null;
  let prismDelayA = null;
  let prismDelayB = null;
  let prismFeedback = null;
  let prismHP = null;
  let prismLP = null;
  let prismMix = null;
  let prismDepthA = null;
  let prismDepthB = null;

  // Final color/master chain
  let warmthShelf = null;
  let warmthLowpass = null;
  let analogDriveIn = null;
  let analogDrive = null;
  let analogPost = null;

  // Texture generators
  let tapeBed = null;
  let crackleNode = null;
  let crackleNoise = null;
  let crackleDustNoise = null;

  // Voice arrays
  let enoVoices = [];
  let glassVoices = [];
  let tibetanDrones = null; // persistent drone bank
  let tibetanBowlTimer = null;
  let tibetanSweepOsc = null;
  let hainbachTexture = null; // persistent noise texture
  let hainbachPopTimer = null;
  let hainbachToneTimer = null;

  // Schedulers
  let activeQuadrant = null;
  let quadrantScheduler = null;
  let crackleTimer = null;
  let transitionTimeout = null;

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  function mapExp(norm, min, max) {
    return min * Math.pow(max / min, norm);
  }

  function makeSoftClipCurve(amount = 24) {
    const n = 2048;
    const curve = new Float32Array(n);
    const k = amount;
    for (let i = 0; i < n; i++) {
      const x = i * 2 / (n - 1) - 1;
      curve[i] = ((1 + k) * x) / (1 + k * Math.abs(x));
    }
    return curve;
  }

  // Pythagorean tuning ratios (pure 5ths)
  function pythagoreanFreq(rootHz, interval) {
    // interval: 0=unison, 7=5th, 12=octave, 19=12th, 24=double-octave
    const ratios = { 0: 1, 7: 3/2, 12: 2, 19: 3, 24: 4 };
    return rootHz * (ratios[interval] || Math.pow(2, interval / 12));
  }

  function buildReverb(ac) {
    const input = ac.createGain();
    const output = ac.createGain();
    const wetGain = ac.createGain();
    const dryGain = ac.createGain();

    wetGain.gain.value = 0.46;
    dryGain.gain.value = 0.54;

    input.connect(dryGain).connect(output);

    const preDelay = ac.createDelay(0.2);
    preDelay.delayTime.value = 0.028;
    input.connect(preDelay);

    const combTimes = [0.031, 0.037, 0.041, 0.047, 0.053];
    const combMerge = ac.createGain();
    combMerge.gain.value = 0.16;

    for (let i = 0; i < combTimes.length; i++) {
      const t = combTimes[i];
      const combDelay = ac.createDelay(0.1);
      combDelay.delayTime.value = t;
      const combDamp = ac.createBiquadFilter();
      combDamp.type = 'lowpass';
      combDamp.frequency.value = 4300 - i * 280;
      const combFb = ac.createGain();
      combFb.gain.value = 0.58 - i * 0.02;

      const combLfo = ac.createOscillator();
      combLfo.type = 'sine';
      combLfo.frequency.value = 0.034 + i * 0.013;
      const combDepth = ac.createGain();
      combDepth.gain.value = 0.00018 + i * 0.00006;
      combLfo.connect(combDepth).connect(combDelay.delayTime);
      combLfo.start();

      preDelay.connect(combDelay);
      combDelay.connect(combDamp);
      combDamp.connect(combFb);
      combFb.connect(combDelay);
      combDelay.connect(combMerge);
    }

    const ap1Delay = ac.createDelay(0.1);
    ap1Delay.delayTime.value = 0.005;
    const ap1Fb = ac.createGain();
    ap1Fb.gain.value = 0.5;
    const ap1Ff = ac.createGain();
    ap1Ff.gain.value = -0.5;
    const ap1Merge = ac.createGain();

    combMerge.connect(ap1Delay);
    combMerge.connect(ap1Ff);
    ap1Delay.connect(ap1Fb);
    ap1Fb.connect(ap1Delay);
    ap1Delay.connect(ap1Merge);
    ap1Ff.connect(ap1Merge);

    const ap2Delay = ac.createDelay(0.1);
    ap2Delay.delayTime.value = 0.0017;
    const ap2Fb = ac.createGain();
    ap2Fb.gain.value = 0.5;
    const ap2Ff = ac.createGain();
    ap2Ff.gain.value = -0.5;
    const ap2Merge = ac.createGain();

    ap1Merge.connect(ap2Delay);
    ap1Merge.connect(ap2Ff);
    ap2Delay.connect(ap2Fb);
    ap2Fb.connect(ap2Delay);
    ap2Delay.connect(ap2Merge);
    ap2Ff.connect(ap2Merge);

    const wetTone = ac.createBiquadFilter();
    wetTone.type = 'lowpass';
    wetTone.frequency.value = 6200;
    wetTone.Q.value = 0.35;

    const wetHighpass = ac.createBiquadFilter();
    wetHighpass.type = 'highpass';
    wetHighpass.frequency.value = 220;
    wetHighpass.Q.value = 0.3;

    const shimmerShelf = ac.createBiquadFilter();
    shimmerShelf.type = 'highshelf';
    shimmerShelf.frequency.value = 2500;
    shimmerShelf.gain.value = 0.55;

    const spaceDelay = ac.createDelay(0.2);
    spaceDelay.delayTime.value = 0.019;
    const spaceMix = ac.createGain();
    spaceMix.gain.value = 0.13;
    const spaceLfo = ac.createOscillator();
    spaceLfo.type = 'sine';
    spaceLfo.frequency.value = 0.06;
    const spaceDepth = ac.createGain();
    spaceDepth.gain.value = 0.0013;
    spaceLfo.connect(spaceDepth).connect(spaceDelay.delayTime);
    spaceLfo.start();

    const bloomDelay = ac.createDelay(2.5);
    bloomDelay.delayTime.value = 0.62;
    const bloomFeedback = ac.createGain();
    bloomFeedback.gain.value = 0.16;
    const bloomLP = ac.createBiquadFilter();
    bloomLP.type = 'lowpass';
    bloomLP.frequency.value = 4600;
    const bloomMix = ac.createGain();
    bloomMix.gain.value = 0.07;

    ap2Merge.connect(wetTone);
    wetTone.connect(wetHighpass);
    wetHighpass.connect(shimmerShelf);
    shimmerShelf.connect(wetGain).connect(output);

    shimmerShelf.connect(spaceDelay);
    spaceDelay.connect(spaceMix).connect(wetGain);

    shimmerShelf.connect(bloomDelay);
    bloomDelay.connect(bloomLP);
    bloomLP.connect(bloomFeedback).connect(bloomDelay);
    bloomDelay.connect(bloomMix).connect(wetGain);

    return {
      input,
      output,
      wetGain,
      dryGain,
      preDelay,
      wetTone,
      wetHighpass,
      shimmerShelf,
      spaceMix,
      spaceDepth,
      bloomDelay,
      bloomFeedback,
      bloomMix,
    };
  }

  function createNoiseBuffer(ac, duration = 2) {
    const length = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function createDustBuffer(ac, duration = 4) {
    const length = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      last = last * 0.985 + white * 0.05;
      data[i] = last;
    }
    return buffer;
  }

  function buildTapeBed(ac) {
    const output = ac.createGain();
    output.gain.value = 0.00001;

    const source = ac.createBufferSource();
    source.buffer = createDustBuffer(ac, 8);
    source.loop = true;

    const hp = ac.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 160;
    hp.Q.value = 0.25;

    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 4600;
    lp.Q.value = 0.4;

    const tone = ac.createBiquadFilter();
    tone.type = 'peaking';
    tone.frequency.value = 1200;
    tone.Q.value = 0.9;
    tone.gain.value = 0.6;

    source.connect(hp);
    hp.connect(lp);
    lp.connect(tone);
    tone.connect(output);
    source.start();

    return { source, hp, lp, tone, output };
  }

  function buildCrackle(ac, dustBuffer) {
    const output = ac.createGain();
    output.gain.value = 0.34;

    const popBus = ac.createGain();
    const popHP = ac.createBiquadFilter();
    popHP.type = 'highpass';
    popHP.frequency.value = 420;
    const popLP = ac.createBiquadFilter();
    popLP.type = 'lowpass';
    popLP.frequency.value = 6800;

    const color = ac.createBiquadFilter();
    color.type = 'peaking';
    color.frequency.value = 1450;
    color.Q.value = 0.8;
    color.gain.value = 1.8;

    const warmthTilt = ac.createBiquadFilter();
    warmthTilt.type = 'lowshelf';
    warmthTilt.frequency.value = 380;
    warmthTilt.gain.value = 2.4;

    const hissTrim = ac.createBiquadFilter();
    hissTrim.type = 'highshelf';
    hissTrim.frequency.value = 4200;
    hissTrim.gain.value = -1.8;

    popBus.connect(popHP);
    popHP.connect(popLP);
    popLP.connect(color);
    color.connect(warmthTilt);
    warmthTilt.connect(hissTrim);

    const dustSource = ac.createBufferSource();
    dustSource.buffer = dustBuffer;
    dustSource.loop = true;

    const dustHP = ac.createBiquadFilter();
    dustHP.type = 'highpass';
    dustHP.frequency.value = 520;
    dustHP.Q.value = 0.3;

    const dustLP = ac.createBiquadFilter();
    dustLP.type = 'lowpass';
    dustLP.frequency.value = 6200;
    dustLP.Q.value = 0.2;

    const dustGain = ac.createGain();
    dustGain.gain.value = 0.00001;

    dustSource.connect(dustHP);
    dustHP.connect(dustLP);
    dustLP.connect(dustGain);
    dustGain.connect(color);
    hissTrim.connect(output);
    dustSource.start();

    return {
      output, popBus, popHP, popLP, color, warmthTilt, hissTrim,
      dustSource, dustHP, dustLP, dustGain,
    };
  }

  function triggerCrackleBurst() {
    if (!audioCtx || !audioActive || !crackleNode || !crackleNoise) return;

    const weights = getQuadrantWeights(getMacroX(), getMacroY());
    const crackleAmt = weights.hainbach * 0.9 + weights.eno * 0.4 + weights.glass * 0.1 + weights.tibetan * 0.05;
    if (crackleAmt < 0.03) return;

    const clickCount = 1 + Math.floor(Math.random() * (2 + crackleAmt * 8));
    const now = audioCtx.currentTime;

    for (let i = 0; i < clickCount; i++) {
      if (Math.random() > 0.3 + crackleAmt * 0.6) continue;

      const src = audioCtx.createBufferSource();
      src.buffer = crackleNoise;

      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 260 + Math.random() * 2000;

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 1700 + crackleAmt * 3000 + Math.random() * 2500;

      const amp = audioCtx.createGain();

      const start = now + Math.random() * 0.14;
      const dur = 0.006 + Math.random() * (0.024 + crackleAmt * 0.03);
      const peak = (0.0008 + crackleAmt * 0.01) * (0.8 + Math.random() * 1.8);

      amp.gain.setValueAtTime(0.00001, start);
      amp.gain.exponentialRampToValueAtTime(peak, start + 0.0012);
      amp.gain.exponentialRampToValueAtTime(0.00001, start + dur);

      src.connect(hp);
      hp.connect(lp);
      lp.connect(amp);
      amp.connect(crackleNode.popBus);

      const offset = Math.random() * Math.max(0, crackleNoise.duration - 0.18);
      src.start(start, offset);
      src.stop(start + dur + 0.05);

      src.onended = () => {
        src.disconnect();
        hp.disconnect();
        lp.disconnect();
        amp.disconnect();
      };
    }
  }

  function scheduleCrackle() {
    if (!audioActive) return;

    const weights = getQuadrantWeights(getMacroX(), getMacroY());
    const crackleAmt = weights.hainbach * 0.9 + weights.eno * 0.4 + weights.glass * 0.1 + weights.tibetan * 0.05;

    if (Math.random() < 0.3 + crackleAmt * 0.5) {
      triggerCrackleBurst();
    }

    const base = 1200 - crackleAmt * 700;
    const jitter = 900 + Math.random() * 500;
    crackleTimer = setTimeout(scheduleCrackle, Math.max(80, base + Math.random() * jitter));
  }

  // ═══════════════════════════════════════════════════
  // ── ENO QUADRANT — Space & Silence (Bottom-Left) ──
  // ═══════════════════════════════════════════════════

  // Root D3 (MIDI 50, ~146.83 Hz) — warm, not too low
  const ENO_ROOT = 146.83;
  // D major pentatonic across octaves: D E F# A B — all consonant, open, positive
  // Frequencies pre-computed as ratios from root (just-intonation leaning)
  const ENO_SCALE = [
    1,        // D3
    9/8,      // E3
    5/4,      // F#3 (just major 3rd)
    3/2,      // A3
    5/3,      // B3 (just major 6th)
    2,        // D4
    9/4,      // E4
    5/2,      // F#4
    3,        // A4
    10/3,     // B4
    4,        // D5
  ];
  // Each tape loop has a melodic phrase — stepwise motion, always resolving home
  const ENO_PHRASES = [
    [0, 2, 4, 3, 1, 0],          // ascending 3rd, gentle fall home
    [5, 4, 3, 4, 5],             // high octave, rocking motion
    [0, 3, 5, 3, 0],             // root-5th-octave arch
    [2, 4, 6, 5, 3, 2],          // middle register melody
  ];
  let enoPhaseSteps = [0, 0, 0, 0];

  // Coprime-ish tape loop lengths (seconds)
  const ENO_LOOP_TIMES = [17.3, 23.7, 31.1, 41.9];
  let enoLoopTimers = [];

  function playTapeTone(freq, loopIdx) {
    if (!audioCtx || !audioActive || !reverb || !filter) return;

    // 20-40% silence probability
    if (Math.random() < 0.3) return;

    droneEnergy = Math.max(droneEnergy, 0.4);
    audioEnergy = Math.max(audioEnergy, 0.3);

    const now = audioCtx.currentTime;
    const weights = getQuadrantWeights(getMacroX(), getMacroY());
    const enoWeight = weights.eno;

    // Long attack 2-6s, sustain 8-20s, release 4-10s
    const attack = 2 + Math.random() * 4;
    const sustain = 8 + Math.random() * 12;
    const release = 4 + Math.random() * 6;
    const peak = (0.018 + Math.random() * 0.012) * enoWeight;

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + attack);
    env.gain.setValueAtTime(peak, now + attack + sustain);
    env.gain.exponentialRampToValueAtTime(0.00001, now + attack + sustain + release);

    // Main sine tone
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Pitch drift (tape wow) 3-8 cents
    const driftLfo = audioCtx.createOscillator();
    driftLfo.type = 'sine';
    driftLfo.frequency.value = 0.02 + Math.random() * 0.04; // 0.02-0.06 Hz
    const driftDepth = audioCtx.createGain();
    driftDepth.gain.value = 3 + Math.random() * 5; // 3-8 cents
    driftLfo.connect(driftDepth).connect(osc.detune);

    // Amplitude LFO (gentle breathing)
    const ampLfo = audioCtx.createOscillator();
    ampLfo.type = 'sine';
    ampLfo.frequency.value = 0.02 + Math.random() * 0.04;
    const ampDepth = audioCtx.createGain();
    ampDepth.gain.value = peak * 0.3;
    ampLfo.connect(ampDepth).connect(env.gain);

    // Octave harmonic at 8% gain
    const harmonic = audioCtx.createOscillator();
    harmonic.type = 'sine';
    harmonic.frequency.value = freq * 2;
    const harmonicGain = audioCtx.createGain();
    harmonicGain.gain.value = 0.08;
    driftDepth.connect(harmonic.detune);

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.5;

    // Reverb send (60-80% wet for Eno)
    const dry = audioCtx.createGain();
    dry.gain.value = 0.25;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.7;

    osc.connect(env);
    harmonic.connect(harmonicGain).connect(env);
    env.connect(pan);
    pan.connect(dry).connect(filter);
    pan.connect(wet).connect(reverb.input);

    if (crystalSend) {
      const tap = audioCtx.createGain();
      tap.gain.value = 0.03;
      pan.connect(tap).connect(crystalSend);
    }

    const stopTime = now + attack + sustain + release + 0.1;
    osc.start(now);
    harmonic.start(now);
    driftLfo.start(now);
    ampLfo.start(now);
    osc.stop(stopTime);
    harmonic.stop(stopTime);
    driftLfo.stop(stopTime + 0.02);
    ampLfo.stop(stopTime + 0.02);

    const voice = { env, nodes: [osc, harmonic, driftLfo, ampLfo], pan, dry, wet, harmonicGain, driftDepth, ampDepth };
    enoVoices.push(voice);

    while (enoVoices.length > 8) {
      const old = enoVoices.shift();
      try {
        old.env.gain.cancelScheduledValues(audioCtx.currentTime);
        old.env.gain.setValueAtTime(old.env.gain.value, audioCtx.currentTime);
        old.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 2);
        for (const node of old.nodes) node.stop(audioCtx.currentTime + 2.1);
      } catch (e) { /* noop */ }
    }

    osc.onended = () => {
      const idx = enoVoices.indexOf(voice);
      if (idx !== -1) enoVoices.splice(idx, 1);
      try {
        harmonicGain.disconnect();
        driftDepth.disconnect();
        ampDepth.disconnect();
        dry.disconnect();
        wet.disconnect();
        pan.disconnect();
        env.disconnect();
      } catch (e) { /* noop */ }
    };
  }

  function scheduleEnoLoop(loopIdx) {
    if (!audioActive) return;
    if (getDominantQuadrant(getMacroX(), getMacroY()) !== 'eno') return;

    // Walk through this loop's melodic phrase
    const phrase = ENO_PHRASES[loopIdx % ENO_PHRASES.length];
    const step = enoPhaseSteps[loopIdx] % phrase.length;
    const scaleIdx = phrase[step];
    const ratio = ENO_SCALE[clamp(scaleIdx, 0, ENO_SCALE.length - 1)];
    const freq = ENO_ROOT * ratio;

    playTapeTone(freq, loopIdx);

    // Occasionally play a consonant pair (5th or octave above)
    if (Math.random() < 0.25) {
      const pairIdx = clamp(scaleIdx + 3, 0, ENO_SCALE.length - 1); // roughly a 5th up
      const pairFreq = ENO_ROOT * ENO_SCALE[pairIdx];
      setTimeout(() => {
        if (!audioActive) return;
        playTapeTone(pairFreq, loopIdx);
      }, 2000 + Math.random() * 2000);
    }

    enoPhaseSteps[loopIdx]++;

    enoLoopTimers[loopIdx] = setTimeout(() => scheduleEnoLoop(loopIdx), ENO_LOOP_TIMES[loopIdx] * 1000);
  }

  function startEnoScheduler() {
    stopEnoScheduler();
    for (let i = 0; i < ENO_LOOP_TIMES.length; i++) {
      // Stagger starts
      const startDelay = Math.random() * ENO_LOOP_TIMES[i] * 500;
      enoLoopTimers[i] = setTimeout(() => scheduleEnoLoop(i), startDelay);
    }
  }

  function stopEnoScheduler() {
    for (let i = 0; i < enoLoopTimers.length; i++) {
      if (enoLoopTimers[i]) clearTimeout(enoLoopTimers[i]);
    }
    enoLoopTimers = [];
    // Voices complete naturally via their envelopes
  }

  // ═══════════════════════════════════════════════════════
  // ── GLASS QUADRANT — Repetition & Pulse (Top-Left) ──
  // ═══════════════════════════════════════════════════════

  // Root C4 (MIDI 60, 261.63 Hz) — C Lydian: C D E F# G A B — bright, uplifting
  const GLASS_ROOT = 261.63;
  // Lydian scale in semitones — every note is consonant and positive
  const GLASS_SCALE = [0, 2, 4, 6, 7, 9, 11, 12, 14, 16, 19, 23, 24];

  // Pre-composed arpeggio patterns (indices into GLASS_SCALE) — all melodic, all in-key
  const GLASS_PATTERNS = [
    [0, 2, 4, 6, 4, 2],             // ascending Cmaj7 arpeggio
    [0, 4, 7, 4, 2, 4],             // C-G-C' rocking
    [7, 6, 4, 2, 0, 2, 4],          // descending from octave
    [0, 2, 4, 7, 9, 7, 4, 2],       // wide arch up to D5
    [4, 2, 0, 2, 4, 6, 7],          // Glass-style additive climb
    [0, 4, 2, 6, 4, 7],             // interlocking 3rds
    [7, 4, 6, 2, 4, 0],             // descending interlocking
    [0, 2, 7, 4, 9, 7, 4, 2],       // wide leaps, always in-key
  ];

  let glassPattern = [];
  let glassStepIdx = 0;
  let glassStepCount = 0;
  let glassMutationCount = 0;
  let glassTimer = null;
  let glassStepMs = 400;

  function buildGlassPattern() {
    // Pick a pre-composed melodic pattern
    return GLASS_PATTERNS[Math.floor(Math.random() * GLASS_PATTERNS.length)].slice();
  }

  function mutateGlassPattern() {
    if (!glassPattern.length) return;
    const r = Math.random();
    if (r < 0.4) {
      // Reverse — always stays in key
      glassPattern.reverse();
    } else if (r < 0.7) {
      // Rotate start point
      const rot = 1 + Math.floor(Math.random() * (glassPattern.length - 1));
      glassPattern = [...glassPattern.slice(rot), ...glassPattern.slice(0, rot)];
    } else {
      // Shift all indices up by 2 (move up a 3rd in the scale) — stays in key
      glassPattern = glassPattern.map(n => Math.min(n + 2, GLASS_SCALE.length - 1));
    }
  }

  function playPulseNote(freq) {
    if (!audioCtx || !audioActive || !filter || !reverb) return;

    motifEnergy = Math.max(motifEnergy, 0.6);
    audioEnergy = Math.max(audioEnergy, 0.5);

    const now = audioCtx.currentTime;
    const weights = getQuadrantWeights(getMacroX(), getMacroY());
    const glassWeight = weights.glass;

    // Fast attack (10-30ms), short sustain (100-300ms), medium release (400-800ms)
    const attack = 0.01 + Math.random() * 0.02;
    const sustain = 0.1 + Math.random() * 0.2;
    const release = 0.4 + Math.random() * 0.4;
    const peak = (0.025 + Math.random() * 0.015) * glassWeight;

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + attack);
    env.gain.setValueAtTime(peak, now + attack + sustain);
    env.gain.exponentialRampToValueAtTime(0.00001, now + attack + sustain + release);

    // Triangle + detuned sine (2 cents)
    const tri = audioCtx.createOscillator();
    tri.type = 'triangle';
    tri.frequency.value = freq;

    const sine = audioCtx.createOscillator();
    sine.type = 'sine';
    sine.frequency.value = freq;
    sine.detune.value = 2;

    // Octave-up shade voice at 30% gain, 50% probability
    let shade = null;
    let shadeGain = null;
    if (Math.random() < 0.5) {
      shade = audioCtx.createOscillator();
      shade.type = 'sine';
      shade.frequency.value = freq * 2;
      shade.detune.value = -1;
      shadeGain = audioCtx.createGain();
      shadeGain.gain.value = 0.3;
    }

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.35;

    // Reverb 30-45% wet, synced delay
    const dry = audioCtx.createGain();
    dry.gain.value = 0.62;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.38;

    tri.connect(env);
    sine.connect(env);
    if (shade && shadeGain) {
      shade.connect(shadeGain).connect(env);
    }
    env.connect(pan);
    pan.connect(dry).connect(filter);
    pan.connect(wet).connect(reverb.input);

    if (crystalSend) {
      const tap = audioCtx.createGain();
      tap.gain.value = 0.08;
      pan.connect(tap).connect(crystalSend);
    }

    const stopTime = now + attack + sustain + release + 0.08;
    const nodes = [tri, sine];
    tri.start(now);
    sine.start(now);
    tri.stop(stopTime);
    sine.stop(stopTime);
    if (shade) {
      shade.start(now);
      shade.stop(stopTime);
      nodes.push(shade);
    }

    const voice = { env, nodes, pan, dry, wet };
    glassVoices.push(voice);

    while (glassVoices.length > 12) {
      const old = glassVoices.shift();
      try {
        old.env.gain.cancelScheduledValues(audioCtx.currentTime);
        old.env.gain.setValueAtTime(old.env.gain.value, audioCtx.currentTime);
        old.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
        for (const node of old.nodes) node.stop(audioCtx.currentTime + 0.25);
      } catch (e) { /* noop */ }
    }

    tri.onended = () => {
      const idx = glassVoices.indexOf(voice);
      if (idx !== -1) glassVoices.splice(idx, 1);
      try {
        if (shadeGain) shadeGain.disconnect();
        dry.disconnect();
        wet.disconnect();
        pan.disconnect();
        env.disconnect();
      } catch (e) { /* noop */ }
    };
  }

  function scheduleGlassStep() {
    if (!audioActive) return;
    if (getDominantQuadrant(getMacroX(), getMacroY()) !== 'glass') return;

    if (!glassPattern.length) {
      glassPattern = buildGlassPattern();
      glassStepIdx = 0;
      glassStepCount = 0;
      glassMutationCount = 0;
    }

    const scaleIdx = glassPattern[glassStepIdx % glassPattern.length];
    const semi = GLASS_SCALE[clamp(scaleIdx, 0, GLASS_SCALE.length - 1)];
    const freq = GLASS_ROOT * Math.pow(2, semi / 12);
    playPulseNote(freq);

    glassStepIdx++;
    glassStepCount++;

    // Pattern mutates every 16-32 steps
    const mutateThreshold = 16 + Math.floor(Math.random() * 17);
    if (glassStepCount >= mutateThreshold) {
      glassMutationCount++;
      if (glassMutationCount > 3) {
        // Build entirely new pattern after a few mutations
        glassPattern = buildGlassPattern();
        glassStepIdx = 0;
        glassMutationCount = 0;
      } else {
        mutateGlassPattern();
      }
      glassStepCount = 0;
    }

    // Step timing: 300-600ms
    glassStepMs = 300 + Math.random() * 300;
    glassTimer = setTimeout(scheduleGlassStep, glassStepMs);
  }

  function startGlassScheduler() {
    stopGlassScheduler();
    glassPattern = buildGlassPattern();
    glassStepIdx = 0;
    glassStepCount = 0;
    glassMutationCount = 0;
    scheduleGlassStep();
  }

  function stopGlassScheduler() {
    if (glassTimer) clearTimeout(glassTimer);
    glassTimer = null;
  }

  // ═══════════════════════════════════════════════════════════
  // ── TIBETAN QUADRANT — Drones & Overtones (Top-Right) ──
  // ═══════════════════════════════════════════════════════════

  // Root C2 (MIDI 36, ~65.41 Hz), Pythagorean tuning
  const TIBETAN_ROOT = 65.41;

  function buildTibetanDrones(ac) {
    // 5 persistent sine oscillators: root, 5th, octave, 12th, double-octave
    // Intentional detuning for beating
    const intervals = [1, 3/2, 2, 3, 4]; // Pythagorean ratios
    const detunes = [5, -3, 8, -6, 4]; // cents

    const output = ac.createGain();
    output.gain.value = 0.00001; // start silent, ramp up

    const oscs = [];
    const gains = [];

    for (let i = 0; i < intervals.length; i++) {
      const freq = TIBETAN_ROOT * intervals[i];
      const osc = ac.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = freq;
      osc.detune.value = detunes[i];

      const gain = ac.createGain();
      // Higher partials quieter
      gain.gain.value = i === 0 ? 0.4 : (i === 1 ? 0.25 : (i === 2 ? 0.2 : (i === 3 ? 0.1 : 0.06)));

      osc.connect(gain).connect(output);
      osc.start();
      oscs.push(osc);
      gains.push(gain);
    }

    // Slow overtone sweep filter (0.005 Hz)
    const sweepFilter = ac.createBiquadFilter();
    sweepFilter.type = 'peaking';
    sweepFilter.frequency.value = 400;
    sweepFilter.Q.value = 3;
    sweepFilter.gain.value = 8;

    const sweepLfo = ac.createOscillator();
    sweepLfo.type = 'sine';
    sweepLfo.frequency.value = 0.005;
    const sweepDepth = ac.createGain();
    sweepDepth.gain.value = 600;
    sweepLfo.connect(sweepDepth).connect(sweepFilter.frequency);
    sweepLfo.start();

    // Reconnect output through sweep
    output.connect(sweepFilter);

    // HF rolloff (-3dB above 6kHz)
    const hfRolloff = ac.createBiquadFilter();
    hfRolloff.type = 'lowshelf';
    hfRolloff.frequency.value = 6000;
    hfRolloff.gain.value = -3;

    sweepFilter.connect(hfRolloff);

    return { oscs, gains, output, sweepFilter, sweepLfo, sweepDepth, hfRolloff };
  }

  function playBowlStrike() {
    if (!audioCtx || !audioActive || !reverb || !filter) return;

    droneEnergy = Math.max(droneEnergy, 0.7);
    audioEnergy = Math.max(audioEnergy, 0.6);

    const now = audioCtx.currentTime;
    const weights = getQuadrantWeights(getMacroX(), getMacroY());
    const tibWeight = weights.tibetan;

    // Short noise burst through bank of high-Q bandpass filters
    const noise = audioCtx.createBufferSource();
    noise.buffer = crackleNoise;

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(0.04 * tibWeight, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.00001, now + 0.04);

    noise.connect(env);

    // Harmonic-leaning overtone ratios — warm, singing bowl character
    // Mix of natural harmonics with gentle inharmonicity for shimmer
    const bowlRatios = [1, 2, 3, 4, 5.04, 6, 7.07, 8];
    const bowlBaseFreq = TIBETAN_ROOT * 2 * (1 + Math.random() * 0.5); // 130-196 Hz range

    const bowlOutput = audioCtx.createGain();
    bowlOutput.gain.value = 1;

    // 6-8 parallel bandpass filters
    const filterCount = 6 + Math.floor(Math.random() * 3);
    const filters = [];
    for (let i = 0; i < filterCount; i++) {
      const bp = audioCtx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = bowlBaseFreq * bowlRatios[i % bowlRatios.length];
      bp.Q.value = 30 + Math.random() * 30; // Q=30-60

      const bpGain = audioCtx.createGain();
      bpGain.gain.value = 0.15 / (i + 1);

      // Bowl resonance envelope (long decay)
      const resEnv = audioCtx.createGain();
      resEnv.gain.setValueAtTime(0.8, now);
      resEnv.gain.exponentialRampToValueAtTime(0.00001, now + 4 + Math.random() * 4);

      env.connect(bp);
      bp.connect(bpGain).connect(resEnv).connect(bowlOutput);
      filters.push({ bp, bpGain, resEnv });
    }

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.3;

    // Heavy reverb for bowl
    const dry = audioCtx.createGain();
    dry.gain.value = 0.15;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.85;

    bowlOutput.connect(pan);
    pan.connect(dry).connect(filter);
    pan.connect(wet).connect(reverb.input);

    const offset = Math.random() * Math.max(0, crackleNoise.duration - 0.1);
    noise.start(now, offset);
    noise.stop(now + 0.06);

    noise.onended = () => {
      // Let resonance ring, then clean up after 10s
      setTimeout(() => {
        try {
          bowlOutput.disconnect();
          pan.disconnect();
          dry.disconnect();
          wet.disconnect();
          env.disconnect();
          for (const f of filters) {
            f.bp.disconnect();
            f.bpGain.disconnect();
            f.resEnv.disconnect();
          }
        } catch (e) { /* noop */ }
      }, 10000);
    };
  }

  function scheduleTibetanBowl() {
    if (!audioActive) return;
    if (getDominantQuadrant(getMacroX(), getMacroY()) !== 'tibetan') return;

    playBowlStrike();

    // Bowl strikes every 15-45s
    const next = 15000 + Math.random() * 30000;
    tibetanBowlTimer = setTimeout(scheduleTibetanBowl, next);
  }

  function startTibetanScheduler() {
    stopTibetanScheduler();

    if (!audioCtx) return;

    tibetanDrones = buildTibetanDrones(audioCtx);
    // Route through filter → reverb
    const dry = audioCtx.createGain();
    dry.gain.value = 0.15;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.85;
    tibetanDrones.hfRolloff.connect(dry).connect(filter);
    tibetanDrones.hfRolloff.connect(wet).connect(reverb.input);
    tibetanDrones._dry = dry;
    tibetanDrones._wet = wet;

    // Fade in over 10-15s
    const now = audioCtx.currentTime;
    tibetanDrones.output.gain.setTargetAtTime(0.035, now, 4);

    // Start bowl strikes after initial delay
    tibetanBowlTimer = setTimeout(scheduleTibetanBowl, 5000 + Math.random() * 10000);
  }

  function stopTibetanScheduler() {
    if (tibetanBowlTimer) clearTimeout(tibetanBowlTimer);
    tibetanBowlTimer = null;

    if (tibetanDrones && audioCtx) {
      const now = audioCtx.currentTime;
      tibetanDrones.output.gain.setTargetAtTime(0.00001, now, 3);
      const drones = tibetanDrones;
      setTimeout(() => {
        try {
          for (const osc of drones.oscs) osc.stop();
          drones.sweepLfo.stop();
          drones.output.disconnect();
          drones.sweepFilter.disconnect();
          drones.sweepDepth.disconnect();
          drones.hfRolloff.disconnect();
          if (drones._dry) drones._dry.disconnect();
          if (drones._wet) drones._wet.disconnect();
        } catch (e) { /* noop */ }
      }, 8000);
      tibetanDrones = null;
    }
  }

  // ═══════════════════════════════════════════════════════════════
  // ── HAINBACH QUADRANT — Texture & Degradation (Bottom-Right) ──
  // ═══════════════════════════════════════════════════════════════

  // F#2 (~92.5 Hz) anchor — pentatonic harmonics for warm tonal moments
  const HAINBACH_ANCHOR = 92.5;
  // F# major pentatonic ratios: F# G# A# C# D# — all warm, consonant
  const HAINBACH_RATIOS = [1, 9/8, 5/4, 3/2, 5/3, 2, 3, 4];

  function buildHainbachTexture(ac) {
    // Continuous filtered noise through 4 wandering bandpass filters + waveshaper
    const output = ac.createGain();
    output.gain.value = 0.00001;

    const noise = ac.createBufferSource();
    noise.buffer = createNoiseBuffer(ac, 4);
    noise.loop = true;

    const noiseGain = ac.createGain();
    noiseGain.gain.value = 0.3;

    // 4 wandering bandpass filters
    const bpFilters = [];
    const bpLfos = [];
    const bpDepths = [];
    const bpGains = [];

    for (let i = 0; i < 4; i++) {
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = HAINBACH_ANCHOR * HAINBACH_RATIOS[Math.floor(Math.random() * HAINBACH_RATIOS.length)] * (0.8 + Math.random() * 0.4);
      bp.Q.value = 4 + Math.random() * 6;

      const lfo = ac.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.01 + Math.random() * 0.04; // 0.01-0.05 Hz
      const depth = ac.createGain();
      depth.gain.value = 300 + Math.random() * 500;
      lfo.connect(depth).connect(bp.frequency);
      lfo.start();

      const bpGain = ac.createGain();
      bpGain.gain.value = 0.25;

      noiseGain.connect(bp);
      bp.connect(bpGain).connect(output);

      bpFilters.push(bp);
      bpLfos.push(lfo);
      bpDepths.push(depth);
      bpGains.push(bpGain);
    }

    noise.connect(noiseGain);

    // Waveshaper for texture
    const shaper = ac.createWaveShaper();
    shaper.curve = makeSoftClipCurve(35);
    shaper.oversample = '2x';

    // Lowpass at 4-6kHz
    const lp = ac.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 5000;
    lp.Q.value = 0.6;

    output.connect(shaper);
    shaper.connect(lp);
    noise.start();

    return { noise, noiseGain, bpFilters, bpLfos, bpDepths, bpGains, output, shaper, lp };
  }

  function playResonantPop() {
    if (!audioCtx || !audioActive || !filter || !reverb) return;

    textureEnergy = Math.max(textureEnergy, 0.5);
    audioEnergy = Math.max(audioEnergy, 0.4);

    const now = audioCtx.currentTime;
    const weights = getQuadrantWeights(getMacroX(), getMacroY());
    const hbWeight = weights.hainbach;

    const noise = audioCtx.createBufferSource();
    noise.buffer = crackleNoise;

    // High-Q bandpass tuned to harmonic frequencies for musical resonance
    const popRatio = HAINBACH_RATIOS[Math.floor(Math.random() * HAINBACH_RATIOS.length)];
    const bp = audioCtx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = HAINBACH_ANCHOR * popRatio * (1 + Math.random() * 0.5);
    bp.Q.value = 20 + Math.random() * 20; // Q=20-40

    const env = audioCtx.createGain();
    const peak = (0.015 + Math.random() * 0.02) * hbWeight;
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.002);
    env.gain.exponentialRampToValueAtTime(0.00001, now + 0.04 + Math.random() * 0.06);

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.6;

    const dry = audioCtx.createGain();
    dry.gain.value = 0.5;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.5;

    noise.connect(bp).connect(env).connect(pan);
    pan.connect(dry).connect(filter);
    pan.connect(wet).connect(reverb.input);

    const offset = Math.random() * Math.max(0, crackleNoise.duration - 0.15);
    noise.start(now, offset);
    noise.stop(now + 0.15);

    noise.onended = () => {
      try {
        bp.disconnect();
        env.disconnect();
        pan.disconnect();
        dry.disconnect();
        wet.disconnect();
      } catch (e) { /* noop */ }
    };
  }

  function playDegradedTone() {
    if (!audioCtx || !audioActive || !filter || !reverb) return;

    textureEnergy = Math.max(textureEnergy, 0.4);

    const now = audioCtx.currentTime;
    const weights = getQuadrantWeights(getMacroX(), getMacroY());
    const hbWeight = weights.hainbach;

    // Sine through aggressive waveshaper, 50-200ms — tuned to pentatonic
    const toneRatio = HAINBACH_RATIOS[Math.floor(Math.random() * HAINBACH_RATIOS.length)];
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = HAINBACH_ANCHOR * toneRatio;

    const shaper = audioCtx.createWaveShaper();
    shaper.curve = makeSoftClipCurve(40 + Math.random() * 30);
    shaper.oversample = '2x';

    const dur = 0.05 + Math.random() * 0.15;
    const peak = (0.012 + Math.random() * 0.01) * hbWeight;

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + 0.005);
    env.gain.exponentialRampToValueAtTime(0.00001, now + dur);

    const lp = audioCtx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2000 + Math.random() * 2000;

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * 0.4;

    osc.connect(shaper).connect(env).connect(lp).connect(pan);
    pan.connect(filter);
    const wet = audioCtx.createGain();
    wet.gain.value = 0.45;
    pan.connect(wet).connect(reverb.input);

    osc.start(now);
    osc.stop(now + dur + 0.05);

    osc.onended = () => {
      try {
        shaper.disconnect();
        env.disconnect();
        lp.disconnect();
        pan.disconnect();
        wet.disconnect();
      } catch (e) { /* noop */ }
    };
  }

  function scheduleHainbachPops() {
    if (!audioActive) return;
    if (getDominantQuadrant(getMacroX(), getMacroY()) !== 'hainbach') return;

    // Clusters of pops (80-200ms repeats) with gaps (1.5-4s)
    const clusterSize = 2 + Math.floor(Math.random() * 5);
    for (let i = 0; i < clusterSize; i++) {
      setTimeout(() => {
        if (!audioActive) return;
        playResonantPop();
      }, i * (80 + Math.random() * 120));
    }

    const gap = 1500 + Math.random() * 2500;
    hainbachPopTimer = setTimeout(scheduleHainbachPops, gap);
  }

  function scheduleHainbachTones() {
    if (!audioActive) return;
    if (getDominantQuadrant(getMacroX(), getMacroY()) !== 'hainbach') return;

    playDegradedTone();

    // Every 10-30s
    const next = 10000 + Math.random() * 20000;
    hainbachToneTimer = setTimeout(scheduleHainbachTones, next);
  }

  function startHainbachScheduler() {
    stopHainbachScheduler();

    if (!audioCtx) return;

    hainbachTexture = buildHainbachTexture(audioCtx);
    // Route through filter → reverb with drive
    const dry = audioCtx.createGain();
    dry.gain.value = 0.55;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.45;
    hainbachTexture.lp.connect(dry).connect(filter);
    hainbachTexture.lp.connect(wet).connect(reverb.input);
    hainbachTexture._dry = dry;
    hainbachTexture._wet = wet;

    // Fade in
    const now = audioCtx.currentTime;
    hainbachTexture.output.gain.setTargetAtTime(0.025, now, 2);

    scheduleHainbachPops();
    hainbachToneTimer = setTimeout(scheduleHainbachTones, 5000 + Math.random() * 10000);
  }

  function stopHainbachScheduler() {
    if (hainbachPopTimer) clearTimeout(hainbachPopTimer);
    if (hainbachToneTimer) clearTimeout(hainbachToneTimer);
    hainbachPopTimer = null;
    hainbachToneTimer = null;

    if (hainbachTexture && audioCtx) {
      const now = audioCtx.currentTime;
      hainbachTexture.output.gain.setTargetAtTime(0.00001, now, 2);
      const tex = hainbachTexture;
      setTimeout(() => {
        try {
          tex.noise.stop();
          for (const lfo of tex.bpLfos) lfo.stop();
          tex.output.disconnect();
          tex.shaper.disconnect();
          tex.lp.disconnect();
          if (tex._dry) tex._dry.disconnect();
          if (tex._wet) tex._wet.disconnect();
        } catch (e) { /* noop */ }
      }, 6000);
      hainbachTexture = null;
    }
  }

  // ═════════════════════════════════════════════
  // ── QUADRANT TRANSITION SYSTEM ──
  // ═════════════════════════════════════════════

  function startQuadrantScheduler(quadrant) {
    if (quadrant === 'eno') startEnoScheduler();
    else if (quadrant === 'glass') startGlassScheduler();
    else if (quadrant === 'tibetan') startTibetanScheduler();
    else if (quadrant === 'hainbach') startHainbachScheduler();
  }

  function stopQuadrantScheduler(quadrant) {
    if (quadrant === 'eno') stopEnoScheduler();
    else if (quadrant === 'glass') stopGlassScheduler();
    else if (quadrant === 'tibetan') stopTibetanScheduler();
    else if (quadrant === 'hainbach') stopHainbachScheduler();
  }

  function checkQuadrantTransition() {
    if (!audioActive) return;

    const newQuadrant = getDominantQuadrant(getMacroX(), getMacroY());
    if (newQuadrant === activeQuadrant) return;

    const oldQuadrant = activeQuadrant;
    activeQuadrant = newQuadrant;

    // Start new scheduler immediately — old voices complete naturally via envelopes
    if (transitionTimeout) clearTimeout(transitionTimeout);
    transitionTimeout = null;

    // Stop old scheduler spawning (existing voices ring out)
    if (oldQuadrant) {
      stopQuadrantScheduler(oldQuadrant);
    }

    // Start new one right away so there's no dead silence
    startQuadrantScheduler(newQuadrant);
  }

  // ── Continuous parameter morphing ──

  function applyAmbientSettings(now, ramp = 0.2) {
    if (!audioCtx || !masterGain || !filter || !delay || !delayFeedback || !reverb) return;

    const x = getMacroX();
    const y = getMacroY();
    const weights = getQuadrantWeights(x, y);
    const dominant = getDominantQuadrant(x, y);

    // Blended parameters based on quadrant weights
    // Reverb wet: Eno 70%, Glass 38%, Tibetan 80%, Hainbach 48%
    const reverbWet = clamp(
      weights.eno * 0.70 + weights.glass * 0.38 + weights.tibetan * 0.80 + weights.hainbach * 0.48,
      0.1, 0.9
    );

    // Filter cutoff
    const cutoff = clamp(
      weights.eno * 3000 + weights.glass * 6000 + weights.tibetan * 2500 + weights.hainbach * 4000,
      800, 8000
    );

    // Delay time
    const delayTime = clamp(
      weights.eno * 0.5 + weights.glass * 0.35 + weights.tibetan * 0.3 + weights.hainbach * 0.2,
      0.1, 0.8
    );

    // Delay feedback
    const feedback = clamp(
      weights.eno * 0.25 + weights.glass * 0.2 + weights.tibetan * 0.3 + weights.hainbach * 0.15,
      0.05, 0.35
    );

    // Master level
    const level = clamp(
      weights.eno * 0.4 + weights.glass * 0.42 + weights.tibetan * 0.38 + weights.hainbach * 0.36,
      0.25, 0.5
    );

    filter.frequency.setTargetAtTime(cutoff, now, ramp);
    filter.Q.setTargetAtTime(0.4, now, ramp);
    reverb.wetGain.gain.setTargetAtTime(reverbWet, now, ramp);
    reverb.dryGain.gain.setTargetAtTime(1 - reverbWet, now, ramp);
    delay.delayTime.setTargetAtTime(delayTime, now, ramp);
    delayFeedback.gain.setTargetAtTime(feedback, now, ramp);
    masterGain.gain.setTargetAtTime(level, now, ramp);

    if (padFilter) {
      padFilter.frequency.setTargetAtTime(400 + cutoff * 0.5, now, ramp);
    }

    if (moodFilter) {
      const moodCenter = cutoff * 0.6;
      moodFilter.frequency.setTargetAtTime(moodCenter, now, ramp);
    }

    // Warmth/color based on quadrant
    const warmth = weights.eno * 0.6 + weights.hainbach * 0.8 + weights.glass * 0.2 + weights.tibetan * 0.4;
    if (warmthShelf && warmthLowpass) {
      warmthShelf.gain.setTargetAtTime(warmth * 6, now, ramp);
      warmthLowpass.frequency.setTargetAtTime(14000 - warmth * 6000, now, ramp);
    }

    if (analogDriveIn && analogPost) {
      const drive = weights.hainbach * 0.4 + weights.eno * 0.05 + weights.glass * 0.02 + weights.tibetan * 0.01;
      analogDriveIn.gain.setTargetAtTime(1 + drive, now, ramp);
      analogPost.gain.setTargetAtTime(0.95 - drive * 0.1, now, ramp);
    }

    if (tapeBed) {
      // Hainbach: 3-5x normal tape bed, Eno: moderate, others: minimal
      const tapeAmt = clamp(
        weights.hainbach * 0.003 + weights.eno * 0.0006 + weights.glass * 0.0001 + weights.tibetan * 0.0002,
        0.00008, 0.004
      );
      tapeBed.output.gain.setTargetAtTime(tapeAmt, now, ramp);
    }

    // Reverb character per quadrant
    if (reverb.preDelay && reverb.wetTone && reverb.shimmerShelf) {
      reverb.preDelay.delayTime.setTargetAtTime(
        weights.eno * 0.04 + weights.glass * 0.02 + weights.tibetan * 0.05 + weights.hainbach * 0.015,
        now, ramp
      );
      reverb.wetTone.frequency.setTargetAtTime(
        weights.eno * 5000 + weights.glass * 7000 + weights.tibetan * 4500 + weights.hainbach * 3500,
        now, ramp
      );
      if (reverb.wetHighpass) {
        reverb.wetHighpass.frequency.setTargetAtTime(
          weights.eno * 180 + weights.glass * 250 + weights.tibetan * 160 + weights.hainbach * 300,
          now, ramp
        );
      }
      reverb.shimmerShelf.gain.setTargetAtTime(
        weights.eno * 0.3 + weights.glass * 1.5 + weights.tibetan * 0.2 + weights.hainbach * -0.5,
        now, ramp
      );
    }

    if (reverb.bloomDelay && reverb.bloomFeedback && reverb.bloomMix) {
      reverb.bloomDelay.delayTime.setTargetAtTime(
        weights.eno * 0.8 + weights.glass * 0.45 + weights.tibetan * 1.6 + weights.hainbach * 0.3,
        now, ramp
      );
      reverb.bloomFeedback.gain.setTargetAtTime(
        clamp(weights.eno * 0.25 + weights.glass * 0.15 + weights.tibetan * 0.30 + weights.hainbach * 0.1, 0.07, 0.35),
        now, ramp
      );
      reverb.bloomMix.gain.setTargetAtTime(
        clamp(weights.eno * 0.12 + weights.glass * 0.05 + weights.tibetan * 0.15 + weights.hainbach * 0.04, 0.02, 0.2),
        now, ramp
      );
    }

    if (crystalSend && crystalDelay && crystalFeedback && crystalHP && crystalLP && crystalMix) {
      // Crystal: minimal for Eno/Tibetan, more for Glass/Hainbach
      const crystalAmt = weights.eno * 0.1 + weights.glass * 0.6 + weights.tibetan * 0.15 + weights.hainbach * 0.4;
      crystalSend.gain.setTargetAtTime(0.01 + crystalAmt * 0.04, now, ramp);
      crystalMix.gain.setTargetAtTime(clamp(crystalAmt * 0.15, 0.02, 0.25), now, ramp);
    }

    if (prismSend && prismMix) {
      const prismAmt = weights.eno * 0.05 + weights.glass * 0.4 + weights.tibetan * 0.1 + weights.hainbach * 0.3;
      prismSend.gain.setTargetAtTime(0.005 + prismAmt * 0.02, now, ramp);
      prismMix.gain.setTargetAtTime(clamp(prismAmt * 0.1, 0.01, 0.2), now, ramp);
    }

    // Crackle: heavy for Hainbach, moderate for Eno, minimal for others
    if (crackleNode) {
      const crackleAmt = weights.hainbach * 0.8 + weights.eno * 0.3 + weights.glass * 0.05 + weights.tibetan * 0.03;
      crackleNode.output.gain.setTargetAtTime(
        clamp(0.05 + crackleAmt * 0.6, 0.02, 0.7),
        now, ramp
      );
      crackleNode.dustGain.gain.setTargetAtTime(
        clamp(0.0002 + crackleAmt * 0.01, 0.0001, 0.012),
        now, ramp
      );
    }

    // Check for quadrant transition
    checkQuadrantTransition();
  }

  function syncKnobToAudio(id) {
    if (!audioCtx || !audioActive) return;
    const now = audioCtx.currentTime;
    applyAmbientSettings(now, 0.2);
  }

  // ── Audio init ──

  function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    masterGain = audioCtx.createGain();
    masterGain.gain.value = 0;

    limiter = audioCtx.createDynamicsCompressor();
    limiter.threshold.value = -22;
    limiter.knee.value = 22;
    limiter.ratio.value = 6;
    limiter.attack.value = 0.004;
    limiter.release.value = 0.35;

    limiter.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    reverb = buildReverb(audioCtx);
    warmthShelf = audioCtx.createBiquadFilter();
    warmthShelf.type = 'lowshelf';
    warmthShelf.frequency.value = 220;
    warmthShelf.gain.value = 0;

    warmthLowpass = audioCtx.createBiquadFilter();
    warmthLowpass.type = 'lowpass';
    warmthLowpass.frequency.value = 16000;
    warmthLowpass.Q.value = 0.6;

    analogDriveIn = audioCtx.createGain();
    analogDriveIn.gain.value = 1;
    analogDrive = audioCtx.createWaveShaper();
    analogDrive.curve = makeSoftClipCurve(12);
    analogDrive.oversample = '2x';
    analogPost = audioCtx.createGain();
    analogPost.gain.value = 0.9;

    reverb.output.connect(warmthShelf);
    warmthShelf.connect(warmthLowpass);
    warmthLowpass.connect(analogDriveIn);
    analogDriveIn.connect(analogPost);
    analogPost.connect(limiter);

    delay = audioCtx.createDelay(2.0);
    delayFeedback = audioCtx.createGain();
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(reverb.input);

    crystalSend = audioCtx.createGain();
    crystalSend.gain.value = 0.00001;
    crystalDelay = audioCtx.createDelay(2.8);
    crystalDelay.delayTime.value = 0.68;
    crystalFeedback = audioCtx.createGain();
    crystalFeedback.gain.value = 0.28;
    crystalHP = audioCtx.createBiquadFilter();
    crystalHP.type = 'highpass';
    crystalHP.frequency.value = 1300;
    crystalLP = audioCtx.createBiquadFilter();
    crystalLP.type = 'lowpass';
    crystalLP.frequency.value = 7400;
    crystalMix = audioCtx.createGain();
    crystalMix.gain.value = 0.14;

    crystalSend.connect(crystalDelay);
    crystalDelay.connect(crystalHP);
    crystalHP.connect(crystalLP);
    crystalLP.connect(crystalFeedback).connect(crystalDelay);
    crystalLP.connect(crystalMix).connect(reverb.input);

    prismSend = audioCtx.createGain();
    prismSend.gain.value = 0.00001;
    prismDelayA = audioCtx.createDelay(2.2);
    prismDelayA.delayTime.value = 0.31;
    prismDelayB = audioCtx.createDelay(2.2);
    prismDelayB.delayTime.value = 0.53;
    prismFeedback = audioCtx.createGain();
    prismFeedback.gain.value = 0.24;
    prismHP = audioCtx.createBiquadFilter();
    prismHP.type = 'highpass';
    prismHP.frequency.value = 900;
    prismLP = audioCtx.createBiquadFilter();
    prismLP.type = 'lowpass';
    prismLP.frequency.value = 7600;
    prismMix = audioCtx.createGain();
    prismMix.gain.value = 0.08;

    const prismLfoA = audioCtx.createOscillator();
    prismLfoA.type = 'triangle';
    prismLfoA.frequency.value = 0.11;
    prismDepthA = audioCtx.createGain();
    prismDepthA.gain.value = 0.004;
    prismLfoA.connect(prismDepthA).connect(prismDelayA.delayTime);
    prismLfoA.start();

    const prismLfoB = audioCtx.createOscillator();
    prismLfoB.type = 'sine';
    prismLfoB.frequency.value = 0.07;
    prismDepthB = audioCtx.createGain();
    prismDepthB.gain.value = 0.006;
    prismLfoB.connect(prismDepthB).connect(prismDelayB.delayTime);
    prismLfoB.start();

    prismSend.connect(prismDelayA);
    prismDelayA.connect(prismDelayB);
    prismDelayB.connect(prismHP);
    prismHP.connect(prismLP);
    prismLP.connect(prismFeedback).connect(prismDelayA);
    prismLP.connect(prismMix).connect(reverb.input);

    moodFilter = audioCtx.createBiquadFilter();
    moodFilter.type = 'peaking';
    moodFilter.frequency.value = 1200;
    moodFilter.Q.value = 1;
    moodFilter.gain.value = 0;
    moodFilter.connect(reverb.input);
    moodFilter.connect(delay);

    filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    filter.Q.value = 0.8;
    filter.connect(moodFilter);

    padFilter = audioCtx.createBiquadFilter();
    padFilter.type = 'lowpass';
    padFilter.frequency.value = 1800;
    padFilter.Q.value = 0.5;
    padFilter.connect(moodFilter);

    tapeBed = buildTapeBed(audioCtx);
    tapeBed.output.connect(analogDriveIn);

    crackleNoise = createNoiseBuffer(audioCtx, 2.2);
    crackleDustNoise = createDustBuffer(audioCtx, 5);
    crackleNode = buildCrackle(audioCtx, crackleDustNoise);
    crackleNode.output.connect(analogDriveIn);

    audioActive = true;
    applyAmbientSettings(audioCtx.currentTime, 0.05);

    if (crackleTimer) clearTimeout(crackleTimer);
    scheduleCrackle();

    // Start the dominant quadrant's scheduler
    activeQuadrant = getDominantQuadrant(getMacroX(), getMacroY());
    startQuadrantScheduler(activeQuadrant);
  }

  function updateAudioParams() {
    if (!audioActive || !audioCtx) return;
    const now = audioCtx.currentTime;
    applyAmbientSettings(now, 0.12);
  }

  function stopAllQuadrants() {
    stopEnoScheduler();
    stopGlassScheduler();
    stopTibetanScheduler();
    stopHainbachScheduler();
    if (transitionTimeout) clearTimeout(transitionTimeout);
    transitionTimeout = null;
    activeQuadrant = null;
  }

  function stopAudio() {
    audioActive = false;
    audioEnergy = 0;
    droneEnergy = 0;
    motifEnergy = 0;
    textureEnergy = 0;

    if (crackleTimer) {
      clearTimeout(crackleTimer);
      crackleTimer = null;
    }

    stopAllQuadrants();

    // Fade out remaining voices
    for (const voice of enoVoices) {
      try {
        voice.env.gain.cancelScheduledValues(audioCtx.currentTime);
        voice.env.gain.setValueAtTime(voice.env.gain.value, audioCtx.currentTime);
        voice.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 2);
        for (const node of voice.nodes) node.stop(audioCtx.currentTime + 2.1);
      } catch (e) { /* noop */ }
    }
    enoVoices = [];

    for (const voice of glassVoices) {
      try {
        voice.env.gain.cancelScheduledValues(audioCtx.currentTime);
        voice.env.gain.setValueAtTime(voice.env.gain.value, audioCtx.currentTime);
        voice.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.3);
        for (const node of voice.nodes) node.stop(audioCtx.currentTime + 0.35);
      } catch (e) { /* noop */ }
    }
    glassVoices = [];

    if (masterGain && audioCtx) {
      const now = audioCtx.currentTime;
      if (tapeBed) {
        tapeBed.output.gain.setTargetAtTime(0.00001, now, 0.35);
      }
      masterGain.gain.setTargetAtTime(0, now, 0.5);
      setTimeout(() => {
        if (audioCtx) audioCtx.suspend();
      }, 3000);
    }
  }

  // ── Patch Randomizer (monogram click) ──

  function randomizePatch() {
    if (!audioActive || !audioCtx) return;

    const now = audioCtx.currentTime;
    for (const def of knobDefs) {
      const minNorm = def.randomMinNorm ?? 0;
      const maxNorm = def.randomMaxNorm ?? 1;
      const newNorm = minNorm + Math.random() * (maxNorm - minNorm);
      setFromNorm(def.id, newNorm);
    }
    latchCurrentXY();
    updateControlVisual();

    applyAmbientSettings(now, 0.35);
  }

  // ── Breathe button toggle ──

  if (breatheBtn) {
    breatheBtn.addEventListener('click', () => {
      if (!audioActive) {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
          audioActive = true;
          applyAmbientSettings(audioCtx.currentTime, 0.4);
          if (crackleTimer) clearTimeout(crackleTimer);
          scheduleCrackle();
          activeQuadrant = getDominantQuadrant(getMacroX(), getMacroY());
          startQuadrantScheduler(activeQuadrant);
        } else {
          initAudio();
        }
        breatheBtn.classList.add('active');
        breatheBtn.textContent = 'exhale';

        if (synthPanel) synthPanel.classList.add('visible');

      } else {
        stopAudio();
        breatheBtn.classList.remove('active');
        breatheBtn.textContent = 'breathe';
        if (synthPanel) synthPanel.classList.remove('visible');
      }
    });
  }

  // ── Main loop ──

  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

  if (reducedMotion) {
    draw(0);
    return;
  }

  function loop(t) {
    draw(t);
    drawParticles();
    drawPadAura();
    updateDotReactivity();
    updateAudioParams();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
