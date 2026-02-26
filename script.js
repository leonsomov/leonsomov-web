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
  let droneEnergy = 0;
  let padEnergy = 0;
  let arpEnergy = 0;
  let textureEnergy = 0;

  // ── Fog Blobs (replacing dot-grid waveforms) ──

  const fogBlobs = [
    { cx: 0.3, cy: 0.25, r: 0.45, sx: 0.000105, sy: 0.000085, ox: 0, color: [200, 180, 160], alpha: 0.008 },
    { cx: 0.7, cy: 0.7, r: 0.4, sx: 0.000085, sy: 0.00011, ox: 1200, color: [160, 170, 200], alpha: 0.006 },
    { cx: 0.5, cy: 0.45, r: 0.5, sx: 0.00007, sy: 0.000095, ox: 2500, color: [180, 175, 170], alpha: 0.007 },
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
    padEnergy *= 0.988;
    arpEnergy *= 0.975;
    textureEnergy *= 0.988;

    // Draw warm fog blobs — slow drifting, audio-reactive brightness
    const totalEnergy = Math.max(audioEnergy, droneEnergy * 0.7, padEnergy * 0.8, textureEnergy * 0.5);

    for (const b of fogBlobs) {
      // Very slow drift: 40-60 second cycles
      const driftX = 0.12 * Math.sin((t + b.ox) * b.sx);
      const driftY = 0.12 * Math.cos((t + b.ox) * b.sy);

      const x = (b.cx + driftX + smoothed.x * 0.012) * w;
      const y = (b.cy + driftY + smoothed.y * 0.012) * h;
      const r = b.r * Math.min(w, h);

      // Audio-reactive: 5-10% brighter with energy
      const brightnessBoost = 1 + totalEnergy * 0.1;
      const alpha = b.alpha * brightnessBoost;

      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${alpha})`);
      grad.addColorStop(0.5, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},${alpha * 0.4})`);
      grad.addColorStop(1, `rgba(${b.color[0]},${b.color[1]},${b.color[2]},0)`);

      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
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
            // Reduced speed for slower scatter
            const speed = 0.2 + Math.random() * 0.8;
            particles.push({
              homeX: monoOffsetX + x * dpr * scale,
              homeY: monoOffsetY + y * dpr * scale,
              x: 0,
              y: 0,
              vx: Math.cos(angle) * speed,
              vy: Math.sin(angle) * speed,
              // Brownian drift offsets
              bx: 0,
              by: 0,
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

  // ── Particle state machine ──

  let particleEnergy = 0;
  // Uniform decay rate ~0.994 (~6s to reassemble)
  const PARTICLE_DECAY = 0.994;

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
      particleEnergy *= PARTICLE_DECAY;
      if (particleEnergy < 0.002) {
        particleEnergy = 0;
        dissolving = false;
      }
    }

    // Smooth dissolve: scatter over 3-4s, reassemble over 8-10s
    const targetProgress = particleEnergy;
    if (targetProgress > dissolveProgress) {
      dissolveProgress += (targetProgress - dissolveProgress) * 0.018; // ~3-4s scatter
    } else {
      dissolveProgress += (targetProgress - dissolveProgress) * 0.005; // ~8-10s reassemble
    }

    if (dissolveProgress < 0.005 && particleEnergy <= 0) {
      dissolveProgress = 0;
      if (wrap) wrap.classList.remove('dissolving');
      return;
    }

    if (wrap) {
      if (dissolveProgress > 0.02) {
        wrap.classList.add('dissolving');
      } else {
        wrap.classList.remove('dissolving');
      }
    }

    const ease = dissolveProgress * dissolveProgress;
    // Reduced spread radius by 50%
    const spread = Math.max(canvas.width, canvas.height) * 0.3;

    for (const p of particles) {
      // Slow brownian drift for scattered particles
      if (ease > 0.05) {
        p.bx += (Math.random() - 0.5) * 0.3;
        p.by += (Math.random() - 0.5) * 0.3;
        p.bx *= 0.98;
        p.by *= 0.98;
      } else {
        p.bx *= 0.95;
        p.by *= 0.95;
      }

      p.x = p.homeX + (p.vx * spread + p.bx) * ease;
      p.y = p.homeY + (p.vy * spread + p.by) * ease;

      const alpha = p.alpha * (1 - ease * 0.85);

      // Warm off-white particles
      ctx.fillStyle = `rgba(232,228,222,${alpha})`;
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

  function updateControlVisual() {
    const el = controlElements.xy;
    if (!el) return;
    el.pad.setAttribute('aria-valuetext', `X: ${Math.round(getMacroX() * 100)}%, Y: ${Math.round(getMacroY() * 100)}%`);
  }

  // ── Pad Canvas — Soft Warm Light ──

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

    if (!audioActive) {
      padCtx.restore();
      return;
    }

    // Color shifts with position: warm amber at bottom, cool at top
    const warmR = Math.round(200 + y * -30 + x * 30);
    const warmG = Math.round(180 + y * -10 + x * -10);
    const warmB = Math.round(160 + y * 40 + x * -20);

    const energy = Math.max(droneEnergy * 0.7, padEnergy * 0.8, arpEnergy, textureEnergy * 0.6);
    const breathe = Math.sin(auraTime * 0.003 * Math.PI * 2) * 0.5 + 0.5;

    // Soft warm radial gradient following touch (alpha 0.02-0.06)
    const glowAlpha = 0.02 + energy * 0.03 + breathe * 0.01;
    const glowR = radius * (0.4 + energy * 0.25);
    const g1 = padCtx.createRadialGradient(posX, posY, 0, posX, posY, glowR);
    g1.addColorStop(0, `rgba(${warmR},${warmG},${warmB},${clamp(glowAlpha, 0, 0.06)})`);
    g1.addColorStop(0.5, `rgba(${warmR},${warmG},${warmB},${clamp(glowAlpha * 0.3, 0, 0.02)})`);
    g1.addColorStop(1, 'rgba(0,0,0,0)');
    padCtx.fillStyle = g1;
    padCtx.fillRect(0, 0, w, h);

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
    pad.setAttribute('aria-label', 'Ambient XY control — drag to morph layers');
    pad.setAttribute('aria-valuemin', '0');
    pad.setAttribute('aria-valuemax', '100');

    padCanvas = document.createElement('canvas');
    padCanvas.className = 'xy-pad-canvas';
    padCanvas.setAttribute('aria-hidden', 'true');

    // No dot element — invisible instrument
    pad.appendChild(padCanvas);
    container.appendChild(pad);
    synthPanel.appendChild(container);

    controlElements.xy = { container, pad };
    updateControlVisual();

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

  // ═══════════════════════════════════════════════════════
  // ── AUDIO ENGINE — 4 Simultaneous Layers ──
  // ═══════════════════════════════════════════════════════

  const breatheBtn = document.querySelector('.breathe-btn');
  let audioCtx = null;
  let audioActive = false;
  let masterGain = null;
  let limiter = null;
  let globalLP = null;

  // Reverb
  let reverb = null;

  // Delay
  let delay = null;
  let delayFeedback = null;

  // Crystal/prism delays
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

  // Final color chain
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

  // Layer references
  let padLayer = null;
  let arpLayer = null;
  let droneLayer = null;
  let textureLayer = null;

  // Chord system
  let currentChordIdx = 0;
  let chordRotationTimer = null;
  let chordTransitioning = false;

  // Crackle
  let crackleTimer = null;

  // Tape wow/flutter LFO
  let tapeWowLfo = null;
  let tapeWowDepth = null;

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

  // ── Chord Palette ──
  // Key: D major / B minor family (D E F# G A B C#)
  // All frequencies in Hz

  const CHORDS = [
    { name: 'Dmaj7',  notes: [73.42, 110.00, 146.83, 185.00, 220.00, 277.18], root: 73.42 },   // D2 A2 D3 F#3 A3 C#4
    { name: 'Bm7',    notes: [61.74, 92.50, 123.47, 146.83, 220.00], root: 61.74 },              // B1 F#2 B2 D3 A3
    { name: 'Gmaj9',  notes: [98.00, 123.47, 146.83, 185.00, 220.00], root: 98.00 },             // G2 B2 D3 F#3 A3
    { name: 'Em7',    notes: [82.41, 123.47, 164.81, 196.00, 293.66], root: 82.41 },              // E2 B2 E3 G3 D4
    { name: 'Asus4',  notes: [55.00, 82.41, 110.00, 146.83, 164.81], root: 55.00 },              // A1 E2 A2 D3 E3
    { name: 'F#m7',   notes: [92.50, 138.59, 164.81, 220.00], root: 92.50 },                      // F#2 C#3 E3 A3
  ];

  function getCurrentChord() {
    return CHORDS[currentChordIdx % CHORDS.length];
  }

  // ── Reverb (FDN) ──

  function buildReverb(ac) {
    const input = ac.createGain();
    const output = ac.createGain();
    const wetGain = ac.createGain();
    const dryGain = ac.createGain();

    wetGain.gain.value = 0.6;
    dryGain.gain.value = 0.4;

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
      input, output, wetGain, dryGain, preDelay, wetTone, wetHighpass,
      shimmerShelf, spaceMix, spaceDepth, bloomDelay, bloomFeedback, bloomMix,
    };
  }

  // ── Noise Buffers ──

  function createNoiseBuffer(ac, duration = 2) {
    const length = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i++) {
      data[i] = Math.random() * 2 - 1;
    }
    return buffer;
  }

  function createBrownNoiseBuffer(ac, duration = 4) {
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

  function createPinkNoiseBuffer(ac, duration = 4) {
    const length = Math.floor(ac.sampleRate * duration);
    const buffer = ac.createBuffer(1, length, ac.sampleRate);
    const data = buffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < length; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
    return buffer;
  }

  // ── Tape Bed ──

  function buildTapeBed(ac) {
    const output = ac.createGain();
    output.gain.value = 0.00001;

    const source = ac.createBufferSource();
    source.buffer = createBrownNoiseBuffer(ac, 8);
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

  // ── Crackle System ──

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

    const x = getMacroX();
    const crackleAmt = 0.1 + x * 0.8; // X controls crackle density
    if (crackleAmt < 0.05) return;

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

    const x = getMacroX();
    const crackleAmt = 0.1 + x * 0.8;

    if (Math.random() < 0.3 + crackleAmt * 0.5) {
      triggerCrackleBurst();
    }

    const base = 1200 - crackleAmt * 700;
    const jitter = 900 + Math.random() * 500;
    crackleTimer = setTimeout(scheduleCrackle, Math.max(80, base + Math.random() * jitter));
  }

  // ═══════════════════════════════════════════════
  // ── PAD LAYER — Thick Detuned Sawtooth Chords ──
  // ═══════════════════════════════════════════════

  // Per chord note: 3 sawtooth oscs detuned (0, +7, -5 cents)
  // Shared LP filter, Juno chorus, slow LFO on cutoff

  function buildPadLayer(ac) {
    const output = ac.createGain();
    output.gain.value = 0.00001;

    // Shared LP filter for all pad voices
    const lpFilter = ac.createBiquadFilter();
    lpFilter.type = 'lowpass';
    lpFilter.frequency.value = 1500;
    lpFilter.Q.value = 2;

    // Slow LFO on cutoff (0.05 Hz, +-200Hz)
    const filterLfo = ac.createOscillator();
    filterLfo.type = 'sine';
    filterLfo.frequency.value = 0.05;
    const filterDepth = ac.createGain();
    filterDepth.gain.value = 200;
    filterLfo.connect(filterDepth).connect(lpFilter.frequency);
    filterLfo.start();

    // Juno chorus: short delay with triangle LFO
    const chorusDelay = ac.createDelay(0.02);
    chorusDelay.delayTime.value = 0.003;
    const chorusLfo = ac.createOscillator();
    chorusLfo.type = 'triangle';
    chorusLfo.frequency.value = 0.5;
    const chorusDepth = ac.createGain();
    chorusDepth.gain.value = 0.002; // 1-2ms depth
    chorusLfo.connect(chorusDepth).connect(chorusDelay.delayTime);
    chorusLfo.start();

    const chorusMix = ac.createGain();
    chorusMix.gain.value = 0.5;
    const directMix = ac.createGain();
    directMix.gain.value = 0.5;

    // Routing: voices → lpFilter → [direct + chorus] → output
    lpFilter.connect(directMix).connect(output);
    lpFilter.connect(chorusDelay);
    chorusDelay.connect(chorusMix).connect(output);

    // Voice management
    const voices = [];

    function setChord(chord, fadeTime = 5) {
      const now = ac.currentTime;

      // Fade out old voices
      for (const v of voices) {
        v.env.gain.setTargetAtTime(0.00001, now, fadeTime * 0.3);
        const oscs = v.oscs;
        setTimeout(() => {
          try {
            for (const o of oscs) o.stop();
            v.env.disconnect();
          } catch (e) { /* noop */ }
        }, fadeTime * 1000 + 2000);
      }
      voices.length = 0;

      // Create new voices for each chord note
      for (const freq of chord.notes) {
        const env = ac.createGain();
        env.gain.setValueAtTime(0.00001, now);
        // Attack 1.5-3s
        const attack = 1.5 + Math.random() * 1.5;
        const peakGain = 0.04 / chord.notes.length; // distribute gain
        env.gain.setTargetAtTime(peakGain, now, attack * 0.3);

        const oscs = [];

        // 3 detuned sawtooth oscillators per note
        const detunes = [0, 7, -5];
        for (const detune of detunes) {
          const osc = ac.createOscillator();
          osc.type = 'sawtooth';
          osc.frequency.value = freq;
          osc.detune.value = detune;

          // Connect tape wow/flutter if available
          if (tapeWowDepth) {
            tapeWowDepth.connect(osc.detune);
          }

          const oscGain = ac.createGain();
          oscGain.gain.value = 0.33; // equal mix of 3 saws
          osc.connect(oscGain).connect(env);
          osc.start(now);
          oscs.push(osc);
        }

        env.connect(lpFilter);
        voices.push({ env, oscs, freq });
      }
    }

    function stop(fadeTime = 6) {
      const now = ac.currentTime;
      for (const v of voices) {
        v.env.gain.setTargetAtTime(0.00001, now, fadeTime * 0.3);
        const oscs = v.oscs;
        setTimeout(() => {
          try {
            for (const o of oscs) o.stop();
            v.env.disconnect();
          } catch (e) { /* noop */ }
        }, fadeTime * 1000 + 2000);
      }
      voices.length = 0;
      try {
        filterLfo.stop();
        chorusLfo.stop();
      } catch (e) { /* noop */ }
    }

    return { output, lpFilter, filterLfo, filterDepth, voices, setChord, stop };
  }

  // ═══════════════════════════════════════════
  // ── ARPEGGIO LAYER — Glass-style Patterns ──
  // ═══════════════════════════════════════════

  const ARP_PATTERNS = [
    [0, 1, 2, 3, 2, 1],           // arch ascending
    [0, 2, 4, 2, 0],              // wide arch
    [0, 1, 3, 1, 2, 0],           // interlocking 3rds
    [0, 2, 1, 3, 2, 4, 3],        // ascending interlocking
    [3, 2, 1, 0, 1, 2],           // descending arch
    [0, 3, 1, 4, 2],              // leaping
    [0, 1, 2, 3, 4, 3, 2, 1],     // full arch
    [0, 2, 4, 3, 1, 0],           // descending skip
  ];

  function buildArpLayer(ac) {
    const output = ac.createGain();
    output.gain.value = 0.00001;

    let pattern = ARP_PATTERNS[Math.floor(Math.random() * ARP_PATTERNS.length)].slice();
    let stepIdx = 0;
    let stepCount = 0;
    let mutationCount = 0;
    let timer = null;
    let running = false;
    let currentNotes = []; // note frequencies from current chord
    let arpVoices = [];

    function setNotes(chord) {
      currentNotes = chord.notes.slice();
    }

    function mutatePattern() {
      const r = Math.random();
      if (r < 0.4) {
        pattern.reverse();
      } else if (r < 0.7) {
        const rot = 1 + Math.floor(Math.random() * (pattern.length - 1));
        pattern = [...pattern.slice(rot), ...pattern.slice(0, rot)];
      } else {
        pattern = pattern.map(n => Math.min(n + 1, currentNotes.length - 1));
      }
    }

    function playNote(freq) {
      if (!ac || !audioActive) return;

      arpEnergy = Math.max(arpEnergy, 0.6);
      audioEnergy = Math.max(audioEnergy, 0.4);

      const now = ac.currentTime;

      // Triangle + detuned sine
      const tri = ac.createOscillator();
      tri.type = 'triangle';
      tri.frequency.value = freq;

      const sine = ac.createOscillator();
      sine.type = 'sine';
      sine.frequency.value = freq;
      sine.detune.value = 2;

      // Tape wow
      if (tapeWowDepth) {
        tapeWowDepth.connect(tri.detune);
        tapeWowDepth.connect(sine.detune);
      }

      // Octave-up sine at 25% volume, 40% probability
      let shade = null;
      let shadeGain = null;
      if (Math.random() < 0.4) {
        shade = ac.createOscillator();
        shade.type = 'sine';
        shade.frequency.value = freq * 2;
        shade.detune.value = -1;
        shadeGain = ac.createGain();
        shadeGain.gain.value = 0.25;
      }

      // Fast attack 10ms, sustain 200ms, release 600ms
      const attack = 0.01;
      const sustain = 0.2;
      const release = 0.6;
      const peak = 0.035;

      const env = ac.createGain();
      env.gain.setValueAtTime(0.00001, now);
      env.gain.exponentialRampToValueAtTime(peak, now + attack);
      env.gain.setValueAtTime(peak, now + attack + sustain);
      env.gain.exponentialRampToValueAtTime(0.00001, now + attack + sustain + release);

      const pan = ac.createStereoPanner();
      pan.pan.value = (Math.random() * 2 - 1) * 0.35;

      tri.connect(env);
      sine.connect(env);
      if (shade && shadeGain) {
        shade.connect(shadeGain).connect(env);
      }
      env.connect(pan).connect(output);

      // Send to crystal delay
      if (crystalSend) {
        const tap = ac.createGain();
        tap.gain.value = 0.06;
        pan.connect(tap).connect(crystalSend);
      }

      const stopTime = now + attack + sustain + release + 0.08;
      tri.start(now);
      sine.start(now);
      tri.stop(stopTime);
      sine.stop(stopTime);
      if (shade) {
        shade.start(now);
        shade.stop(stopTime);
      }

      const voice = { env, nodes: [tri, sine, shade].filter(Boolean) };
      arpVoices.push(voice);

      // Limit voice count
      while (arpVoices.length > 10) {
        const old = arpVoices.shift();
        try {
          for (const n of old.nodes) n.stop(ac.currentTime + 0.05);
        } catch (e) { /* noop */ }
      }

      tri.onended = () => {
        const idx = arpVoices.indexOf(voice);
        if (idx !== -1) arpVoices.splice(idx, 1);
        try {
          if (shadeGain) shadeGain.disconnect();
          pan.disconnect();
          env.disconnect();
        } catch (e) { /* noop */ }
      };
    }

    function step() {
      if (!running || !audioActive) return;
      if (currentNotes.length === 0) {
        timer = setTimeout(step, 400);
        return;
      }

      const noteIdx = pattern[stepIdx % pattern.length] % currentNotes.length;
      const freq = currentNotes[noteIdx];
      playNote(freq);

      stepIdx++;
      stepCount++;

      // Mutate every 16-32 steps
      const mutateThreshold = 16 + Math.floor(Math.random() * 17);
      if (stepCount >= mutateThreshold) {
        mutationCount++;
        if (mutationCount > 3) {
          pattern = ARP_PATTERNS[Math.floor(Math.random() * ARP_PATTERNS.length)].slice();
          stepIdx = 0;
          mutationCount = 0;
        } else {
          mutatePattern();
        }
        stepCount = 0;
      }

      // Step rate: Y controls speed (200-500ms)
      const y = getMacroY();
      const stepMs = 500 - y * 300; // Y=0→500ms, Y=1→200ms
      timer = setTimeout(step, stepMs);
    }

    function start() {
      running = true;
      step();
    }

    function stop() {
      running = false;
      if (timer) clearTimeout(timer);
      timer = null;
    }

    return { output, setNotes, start, stop };
  }

  // ═══════════════════════════════════════════
  // ── DRONE LAYER — Tibetan Singing Bowls ──
  // ═══════════════════════════════════════════

  function buildDroneLayer(ac) {
    const output = ac.createGain();
    output.gain.value = 0.00001;

    const oscs = [];
    const gains = [];
    let bowlTimer = null;
    let currentRoot = 73.42; // D2

    // Overtone sweep filter
    const sweepFilter = ac.createBiquadFilter();
    sweepFilter.type = 'peaking';
    sweepFilter.frequency.value = 400;
    sweepFilter.Q.value = 3;
    sweepFilter.gain.value = 6;

    const sweepLfo = ac.createOscillator();
    sweepLfo.type = 'sine';
    sweepLfo.frequency.value = 0.005;
    const sweepDepth = ac.createGain();
    sweepDepth.gain.value = 500; // 200-1200Hz range
    sweepLfo.connect(sweepDepth).connect(sweepFilter.frequency);
    sweepLfo.start();

    const preOutput = ac.createGain();
    preOutput.gain.value = 1;
    preOutput.connect(sweepFilter);
    sweepFilter.connect(output);

    function setRoot(rootFreq, fadeTime = 5) {
      const now = ac.currentTime;
      currentRoot = rootFreq;

      // Fade out old oscillators
      for (const g of gains) {
        g.gain.setTargetAtTime(0.00001, now, fadeTime * 0.3);
      }
      const oldOscs = oscs.slice();
      setTimeout(() => {
        for (const o of oldOscs) {
          try { o.stop(); } catch (e) { /* noop */ }
        }
      }, fadeTime * 1000 + 2000);
      oscs.length = 0;
      gains.length = 0;

      // 3 sines: fundamental, +5th, +octave — each doubled with detuning
      const intervals = [1, 1.5, 2];
      const volumes = [0.4, 0.25, 0.2];
      const detunePairs = [[0, 3], [0, -2], [0, 4]]; // cents

      for (let i = 0; i < intervals.length; i++) {
        for (const detune of detunePairs[i]) {
          const osc = ac.createOscillator();
          osc.type = 'sine';
          osc.frequency.value = rootFreq * intervals[i];
          osc.detune.value = detune;

          if (tapeWowDepth) {
            tapeWowDepth.connect(osc.detune);
          }

          const gain = ac.createGain();
          gain.gain.setValueAtTime(0.00001, now);
          gain.gain.setTargetAtTime(volumes[i] * 0.5, now, fadeTime * 0.3);

          osc.connect(gain).connect(preOutput);
          osc.start(now);
          oscs.push(osc);
          gains.push(gain);
        }
      }
    }

    function playBowlStrike() {
      if (!ac || !audioActive || !crackleNoise) return;

      const x = getMacroX();
      // Bowl strikes only when X < 0.6
      if (x > 0.6) return;

      droneEnergy = Math.max(droneEnergy, 0.7);
      audioEnergy = Math.max(audioEnergy, 0.5);

      const now = ac.currentTime;

      const noise = ac.createBufferSource();
      noise.buffer = crackleNoise;

      const env = ac.createGain();
      env.gain.setValueAtTime(0.00001, now);
      env.gain.exponentialRampToValueAtTime(0.04, now + 0.005);
      env.gain.exponentialRampToValueAtTime(0.00001, now + 0.04);

      noise.connect(env);

      // Bowl harmonic ratios — slightly inharmonic for shimmer
      const bowlRatios = [1, 2.71, 5.2];
      const bowlBaseFreq = currentRoot * 2;

      const bowlOutput = ac.createGain();
      bowlOutput.gain.value = 1;

      // Each ratio doubled for beating
      for (let i = 0; i < bowlRatios.length; i++) {
        for (const detune of [0, 3]) {
          const bp = ac.createBiquadFilter();
          bp.type = 'bandpass';
          bp.frequency.value = bowlBaseFreq * bowlRatios[i];
          bp.Q.value = 30 + Math.random() * 30;

          const bpGain = ac.createGain();
          bpGain.gain.value = 0.12 / (i + 1);

          const resEnv = ac.createGain();
          // 8-20s decay
          const decayTime = 8 + Math.random() * 12;
          resEnv.gain.setValueAtTime(0.8, now);
          resEnv.gain.exponentialRampToValueAtTime(0.00001, now + decayTime);

          env.connect(bp);
          bp.connect(bpGain).connect(resEnv).connect(bowlOutput);
        }
      }

      bowlOutput.connect(output);

      const offset = Math.random() * Math.max(0, crackleNoise.duration - 0.1);
      noise.start(now, offset);
      noise.stop(now + 0.06);

      noise.onended = () => {
        setTimeout(() => {
          try { bowlOutput.disconnect(); } catch (e) { /* noop */ }
        }, 22000);
      };
    }

    function scheduleBowl() {
      if (!audioActive) return;
      playBowlStrike();
      // Every 20-50s
      const next = 20000 + Math.random() * 30000;
      bowlTimer = setTimeout(scheduleBowl, next);
    }

    function start() {
      // Start bowl strikes after delay
      bowlTimer = setTimeout(scheduleBowl, 5000 + Math.random() * 10000);
    }

    function stop() {
      if (bowlTimer) clearTimeout(bowlTimer);
      bowlTimer = null;
      const now = ac.currentTime;
      for (const g of gains) {
        g.gain.setTargetAtTime(0.00001, now, 2);
      }
      setTimeout(() => {
        for (const o of oscs) {
          try { o.stop(); } catch (e) { /* noop */ }
        }
        try {
          sweepLfo.stop();
        } catch (e) { /* noop */ }
      }, 8000);
    }

    return { output, setRoot, start, stop };
  }

  // ═════════════════════════════════════════════════
  // ── TEXTURE LAYER — Filtered Noise + Tape Hiss ──
  // ═════════════════════════════════════════════════

  function buildTextureLayer(ac) {
    const output = ac.createGain();
    output.gain.value = 0.00001;

    // Brown noise through 3 wandering bandpass filters
    const brownNoise = ac.createBufferSource();
    brownNoise.buffer = createBrownNoiseBuffer(ac, 6);
    brownNoise.loop = true;

    const noiseGain = ac.createGain();
    noiseGain.gain.value = 0.3;
    brownNoise.connect(noiseGain);

    const bpFilters = [];
    const bpLfos = [];

    for (let i = 0; i < 3; i++) {
      const bp = ac.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 200 + Math.random() * 800;
      bp.Q.value = 4 + Math.random() * 4;

      const lfo = ac.createOscillator();
      lfo.type = 'sine';
      lfo.frequency.value = 0.02;
      const depth = ac.createGain();
      depth.gain.value = 400;
      lfo.connect(depth).connect(bp.frequency);
      lfo.start();

      const bpGain = ac.createGain();
      bpGain.gain.value = 0.3;

      noiseGain.connect(bp);
      bp.connect(bpGain).connect(output);

      bpFilters.push(bp);
      bpLfos.push(lfo);
    }

    brownNoise.start();

    // Tape hiss: quiet continuous pink noise, LP 6kHz
    const pinkNoise = ac.createBufferSource();
    pinkNoise.buffer = createPinkNoiseBuffer(ac, 4);
    pinkNoise.loop = true;

    const hissLP = ac.createBiquadFilter();
    hissLP.type = 'lowpass';
    hissLP.frequency.value = 6000;

    const hissGain = ac.createGain();
    hissGain.gain.value = 0.008;

    pinkNoise.connect(hissLP).connect(hissGain).connect(output);
    pinkNoise.start();

    function tuneToChord(chord) {
      // Tune bandpass centers to chord harmonics
      for (let i = 0; i < bpFilters.length && i < chord.notes.length; i++) {
        const now = ac.currentTime;
        bpFilters[i].frequency.setTargetAtTime(chord.notes[i] * (1 + i), now, 3);
      }
    }

    function stop() {
      try {
        brownNoise.stop();
        pinkNoise.stop();
        for (const lfo of bpLfos) lfo.stop();
      } catch (e) { /* noop */ }
    }

    return { output, tuneToChord, stop };
  }

  // ═══════════════════════════════════
  // ── CHORD ROTATION ──
  // ═══════════════════════════════════

  function rotateChord() {
    if (!audioActive) return;

    currentChordIdx = (currentChordIdx + 1) % CHORDS.length;
    const chord = getCurrentChord();

    // Crossfade: 4-6s
    if (padLayer) padLayer.setChord(chord, 5);
    if (arpLayer) arpLayer.setNotes(chord);
    if (droneLayer) droneLayer.setRoot(chord.root, 5);
    if (textureLayer) textureLayer.tuneToChord(chord);

    // Next rotation: 20-40s
    const next = 20000 + Math.random() * 20000;
    chordRotationTimer = setTimeout(rotateChord, next);
  }

  // ═══════════════════════════════════
  // ── XY PARAMETER MAPPING ──
  // ═══════════════════════════════════

  function applyAmbientSettings(now, ramp = 0.2) {
    if (!audioCtx || !masterGain) return;

    const x = getMacroX();
    const y = getMacroY();

    // ── Layer volumes ──
    // Pad: Y=0 → 70%, Y=1 → 20%
    if (padLayer) {
      const padVol = 0.7 - y * 0.5;
      padLayer.output.gain.setTargetAtTime(padVol * 0.06, now, ramp);
    }

    // Arpeggio: Y=0 → 0%, Y>0.2 fades in, Y=1 → 80%
    if (arpLayer) {
      const arpVol = y > 0.2 ? ((y - 0.2) / 0.8) * 0.8 : 0;
      arpLayer.output.gain.setTargetAtTime(arpVol * 0.045, now, ramp);
    }

    // Drone: fairly constant 25-35%, slight boost at low Y
    if (droneLayer) {
      const droneVol = 0.35 - y * 0.1;
      droneLayer.output.gain.setTargetAtTime(droneVol * 0.04, now, ramp);
    }

    // Texture: X=0 → 5%, X=1 → 60%
    if (textureLayer) {
      const texVol = 0.05 + x * 0.55;
      textureLayer.output.gain.setTargetAtTime(texVol * 0.03, now, ramp);
    }

    // ── Pad filter cutoff: X controls (left=dark 800Hz, right=bright 3000Hz) ──
    if (padLayer) {
      const padCutoff = 800 + x * 2200;
      padLayer.lpFilter.frequency.setTargetAtTime(padCutoff, now, ramp);
    }

    // ── Global LP (SAW warmth): 6-10kHz ──
    if (globalLP) {
      const glpFreq = 6000 + x * 4000;
      globalLP.frequency.setTargetAtTime(glpFreq, now, ramp);
    }

    // ── Reverb wet: Y=0(still) → 80%, Y=1(rhythmic) → 50% ──
    if (reverb) {
      const reverbWet = 0.8 - y * 0.3;
      reverb.wetGain.gain.setTargetAtTime(reverbWet, now, ramp);
      reverb.dryGain.gain.setTargetAtTime(1 - reverbWet, now, ramp);
    }

    // ── Delay ──
    if (delay && delayFeedback) {
      delay.delayTime.setTargetAtTime(0.4 + y * 0.2, now, ramp);
      delayFeedback.gain.setTargetAtTime(0.15 + (1 - y) * 0.15, now, ramp);
    }

    // ── Crystal/prism: mainly at Y > 0.5 ──
    if (crystalSend && crystalMix) {
      const crystalAmt = y > 0.5 ? (y - 0.5) * 2 : 0;
      crystalSend.gain.setTargetAtTime(0.01 + crystalAmt * 0.04, now, ramp);
      crystalMix.gain.setTargetAtTime(0.02 + crystalAmt * 0.15, now, ramp);
    }

    if (prismSend && prismMix) {
      const prismAmt = y > 0.5 ? (y - 0.5) * 2 : 0;
      prismSend.gain.setTargetAtTime(0.005 + prismAmt * 0.02, now, ramp);
      prismMix.gain.setTargetAtTime(0.01 + prismAmt * 0.12, now, ramp);
    }

    // ── Warmth/color ──
    if (warmthShelf && warmthLowpass) {
      const warmth = 0.3 + x * 0.5;
      warmthShelf.gain.setTargetAtTime(warmth * 4, now, ramp);
      warmthLowpass.frequency.setTargetAtTime(14000 - warmth * 6000, now, ramp);
    }

    // ── Drive: more at right (X=1) ──
    if (analogDriveIn && analogPost) {
      const drive = x * 0.3;
      analogDriveIn.gain.setTargetAtTime(1 + drive, now, ramp);
      analogPost.gain.setTargetAtTime(0.95 - drive * 0.1, now, ramp);
    }

    // ── Tape bed ──
    if (tapeBed) {
      const tapeAmt = 0.0002 + x * 0.003;
      tapeBed.output.gain.setTargetAtTime(tapeAmt, now, ramp);
    }

    // ── Crackle ──
    if (crackleNode) {
      const crackleAmt = 0.1 + x * 0.8;
      crackleNode.output.gain.setTargetAtTime(
        clamp(0.05 + crackleAmt * 0.5, 0.02, 0.6),
        now, ramp
      );
      crackleNode.dustGain.gain.setTargetAtTime(
        clamp(0.0002 + crackleAmt * 0.008, 0.0001, 0.01),
        now, ramp
      );
    }

    // ── Reverb character ──
    if (reverb.preDelay && reverb.wetTone && reverb.shimmerShelf) {
      reverb.preDelay.delayTime.setTargetAtTime(0.02 + (1 - y) * 0.03, now, ramp);
      reverb.wetTone.frequency.setTargetAtTime(4500 + y * 2500, now, ramp);
      if (reverb.wetHighpass) {
        reverb.wetHighpass.frequency.setTargetAtTime(180 + y * 80, now, ramp);
      }
      reverb.shimmerShelf.gain.setTargetAtTime(-0.2 + y * 1.5, now, ramp);
    }

    // ── Bloom ──
    if (reverb.bloomDelay && reverb.bloomFeedback && reverb.bloomMix) {
      reverb.bloomDelay.delayTime.setTargetAtTime(0.5 + (1 - y) * 1.3, now, ramp);
      reverb.bloomFeedback.gain.setTargetAtTime(
        clamp(0.15 + (1 - y) * 0.15, 0.15, 0.30),
        now, ramp
      );
      reverb.bloomMix.gain.setTargetAtTime(
        clamp(0.04 + (1 - y) * 0.1, 0.04, 0.15),
        now, ramp
      );
    }

    // ── Master level ──
    masterGain.gain.setTargetAtTime(0.4, now, ramp);
  }

  function syncKnobToAudio() {
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

    // Global LP filter for SAW warmth
    globalLP = audioCtx.createBiquadFilter();
    globalLP.type = 'lowpass';
    globalLP.frequency.value = 8000;
    globalLP.Q.value = 0.5;

    limiter.connect(globalLP);
    globalLP.connect(masterGain);
    masterGain.connect(audioCtx.destination);

    // Reverb
    reverb = buildReverb(audioCtx);

    // Warmth chain
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
    analogDriveIn.connect(analogDrive);
    analogDrive.connect(analogPost);
    analogPost.connect(limiter);

    // Delay
    delay = audioCtx.createDelay(2.0);
    delayFeedback = audioCtx.createGain();
    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(reverb.input);

    // Crystal delay
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

    // Prism delay
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

    // Tape wow/flutter: global pitch LFO 0.3Hz, 3-5 cents
    tapeWowLfo = audioCtx.createOscillator();
    tapeWowLfo.type = 'sine';
    tapeWowLfo.frequency.value = 0.3;
    tapeWowDepth = audioCtx.createGain();
    tapeWowDepth.gain.value = 4; // ~4 cents
    tapeWowLfo.connect(tapeWowDepth);
    tapeWowLfo.start();

    // Noise buffers
    crackleNoise = createNoiseBuffer(audioCtx, 2.2);
    crackleDustNoise = createBrownNoiseBuffer(audioCtx, 5);

    // Tape bed
    tapeBed = buildTapeBed(audioCtx);
    tapeBed.output.connect(analogDriveIn);

    // Crackle
    crackleNode = buildCrackle(audioCtx, crackleDustNoise);
    crackleNode.output.connect(analogDriveIn);

    // ── Build 4 layers ──
    const chord = getCurrentChord();

    // Pad layer
    padLayer = buildPadLayer(audioCtx);
    padLayer.output.connect(reverb.input);
    padLayer.output.connect(delay);
    padLayer.setChord(chord, 3);

    // Arpeggio layer
    arpLayer = buildArpLayer(audioCtx);
    arpLayer.output.connect(reverb.input);
    arpLayer.setNotes(chord);
    arpLayer.start();

    // Drone layer
    droneLayer = buildDroneLayer(audioCtx);
    droneLayer.output.connect(reverb.input);
    droneLayer.setRoot(chord.root, 3);
    droneLayer.start();

    // Texture layer
    textureLayer = buildTextureLayer(audioCtx);
    textureLayer.output.connect(reverb.input);
    textureLayer.tuneToChord(chord);

    // ── Activate ──
    audioActive = true;
    applyAmbientSettings(audioCtx.currentTime, 0.05);

    // Start crackle
    if (crackleTimer) clearTimeout(crackleTimer);
    scheduleCrackle();

    // Start chord rotation (first after 20-40s)
    chordRotationTimer = setTimeout(rotateChord, 20000 + Math.random() * 20000);
  }

  function updateAudioParams() {
    if (!audioActive || !audioCtx) return;
    const now = audioCtx.currentTime;
    applyAmbientSettings(now, 0.12);
  }

  function stopAudio() {
    audioActive = false;
    audioEnergy = 0;
    droneEnergy = 0;
    padEnergy = 0;
    arpEnergy = 0;
    textureEnergy = 0;

    if (crackleTimer) {
      clearTimeout(crackleTimer);
      crackleTimer = null;
    }

    if (chordRotationTimer) {
      clearTimeout(chordRotationTimer);
      chordRotationTimer = null;
    }

    if (padLayer) { padLayer.stop(); padLayer = null; }
    if (arpLayer) { arpLayer.stop(); arpLayer = null; }
    if (droneLayer) { droneLayer.stop(); droneLayer = null; }
    if (textureLayer) { textureLayer.stop(); textureLayer = null; }

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

          // Rebuild layers if they were stopped
          const chord = getCurrentChord();
          if (!padLayer) {
            padLayer = buildPadLayer(audioCtx);
            padLayer.output.connect(reverb.input);
            padLayer.output.connect(delay);
            padLayer.setChord(chord, 3);
          }
          if (!arpLayer) {
            arpLayer = buildArpLayer(audioCtx);
            arpLayer.output.connect(reverb.input);
            arpLayer.setNotes(chord);
            arpLayer.start();
          }
          if (!droneLayer) {
            droneLayer = buildDroneLayer(audioCtx);
            droneLayer.output.connect(reverb.input);
            droneLayer.setRoot(chord.root, 3);
            droneLayer.start();
          }
          if (!textureLayer) {
            textureLayer = buildTextureLayer(audioCtx);
            textureLayer.output.connect(reverb.input);
            textureLayer.tuneToChord(chord);
          }

          applyAmbientSettings(audioCtx.currentTime, 0.4);
          if (crackleTimer) clearTimeout(crackleTimer);
          scheduleCrackle();
          chordRotationTimer = setTimeout(rotateChord, 20000 + Math.random() * 20000);
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
    updateAudioParams();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
