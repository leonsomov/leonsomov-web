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
      energy: 0, // per-wave reactive energy
    };
  }

  for (let i = 0; i < waveCount; i++) {
    waves.push(randomWave());
    waveDecayRates.push(0.978 + Math.random() * 0.014); // staggered: 0.978–0.992
  }

  function drawWaveform(w, h, t, wave, waveIdx) {
    const dy = wave.yTarget - wave.yBase;
    wave.yBase += dy * wave.ySpeed * 16;
    if (Math.abs(dy) < 0.01) {
      wave.yTarget = 0.1 + Math.random() * 0.8;
    }

    // Update per-wave energy with staggered decay
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

      // Fade out toward edges
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

    // Decay global audio energy each frame
    audioEnergy *= 0.985;

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

  // 0 = calm (bottom), 1 = active (top)
  function getMacroY() {
    return knobState.y ?? 0.58;
  }

  function getAtmosphere() {
    const x = getMacroX();
    const y = getMacroY();
    return clamp(0.06 + x * 0.84 + y * 0.1, 0, 1);
  }

  function getMood() {
    const x = getMacroX();
    const y = getMacroY();
    return clamp(0.08 + x * 0.82 + (1 - y) * 0.14, 0, 1);
  }

  function getIntensity() {
    const x = getMacroX();
    const y = getMacroY();
    return clamp(0.04 + y * 0.9 + (1 - x) * 0.05, 0, 1);
  }

  function getWarmth() {
    const x = getMacroX();
    const y = getMacroY();
    return clamp(0.1 + (1 - x) * 0.74 + (1 - y) * 0.2, 0, 1);
  }

  function getCrackleAmount() {
    const y = getMacroY();
    const warmth = getWarmth();
    return clamp(0.02 + warmth * 0.78 + y * 0.12, 0, 1);
  }

  function getWorldIndex() {
    const x = getMacroX();
    const y = getMacroY();
    if (x < 0.5 && y < 0.5) return 0; // warm earth
    if (x >= 0.5 && y < 0.5) return 1; // clear air
    if (x < 0.5 && y >= 0.5) return 2; // rain field
    return 3; // shimmer sky
  }

  function getControlDescriptor() {
    const world = getWorldIndex();
    if (world === 0) return 'EARTH GARDEN';
    if (world === 1) return 'CRYSTAL HALL';
    if (world === 2) return 'RAIN FIELD';
    return 'STAR CANOPY';
  }

  function updateControlVisual() {
    const el = controlElements.xy;
    if (!el) return;

    const x = getMacroX();
    const y = getMacroY();
    el.dot.style.left = `${Math.round(x * 100)}%`;
    el.dot.style.top = `${Math.round((1 - y) * 100)}%`;
    el.pad.setAttribute('aria-valuetext', getControlDescriptor());
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
    pad.setAttribute('aria-label', 'Ambient XY control');
    pad.setAttribute('aria-valuemin', '0');
    pad.setAttribute('aria-valuemax', '100');

    const dot = document.createElement('div');
    dot.className = 'xy-dot';

    pad.appendChild(dot);
    container.appendChild(pad);
    synthPanel.appendChild(container);

    controlElements.xy = { container, pad, dot };
    updateControlVisual();
  }

  // ── XY Drag Interaction ──

  let xyActive = false;

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
    updateControlVisual();
    syncKnobToAudio('xy');
  }

  function onControlStart(e) {
    if (!e.target.closest('.xy-pad')) return;
    xyActive = true;
    applyXYFromEvent(e);
    if (e.cancelable) e.preventDefault();
  }

  function onControlMove(e) {
    if (!xyActive) return;
    applyXYFromEvent(e);
    if (e.cancelable) e.preventDefault();
  }

  function onControlEnd() {
    xyActive = false;
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
      updateControlVisual();
      syncKnobToAudio('xy');
      e.preventDefault();
      return;
    }

    if (e.key === 'End') {
      setFromNorm('x', 0.82);
      setFromNorm('y', 0.82);
      updateControlVisual();
      syncKnobToAudio('xy');
      e.preventDefault();
      return;
    }

    if (dx !== 0 || dy !== 0) {
      setFromNorm('x', getNorm('x') + dx);
      setFromNorm('y', getNorm('y') + dy);
      updateControlVisual();
      syncKnobToAudio('xy');
      e.preventDefault();
    }
  }

  if (synthPanel) {
    synthPanel.addEventListener('mousedown', onControlStart);
    synthPanel.addEventListener('touchstart', onControlStart, { passive: false });
    synthPanel.addEventListener('keydown', onControlKeyDown);
  }
  window.addEventListener('mousemove', onControlMove);
  window.addEventListener('touchmove', onControlMove, { passive: false });
  window.addEventListener('mouseup', onControlEnd);
  window.addEventListener('touchend', onControlEnd);
  window.addEventListener('touchcancel', onControlEnd);

  createControls();

  // ── Generative Ambient Synth ──

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
  let reverb = null;
  let warmthShelf = null;
  let warmthLowpass = null;
  let analogDriveIn = null;
  let analogDrive = null;
  let analogPost = null;
  let drone = null;
  let crackle = null;
  let crackleNoise = null;
  let crackleDustNoise = null;
  let motifVoices = [];
  let padVoices = [];
  let dropVoices = [];
  let sequenceTimer = null;
  let harmonyTimer = null;
  let crackleTimer = null;

  const worldRoots = [60, 67, 62, 69]; // C4, G4, D4, A4
  const worldProfiles = [
    // EARTH GARDEN
    [
      { intervals: [0, 2, 4, 7, 9], progression: [[0, 4, 7, 12], [5, 9, 12, 17], [7, 11, 14, 19], [0, 4, 9, 14], [5, 9, 14, 17]] },
      { intervals: [0, 2, 4, 5, 7, 9], progression: [[0, 4, 7, 14], [2, 5, 9, 14], [5, 9, 12, 17], [7, 12, 14, 19], [0, 5, 9, 14]] },
      { intervals: [0, 2, 4, 7, 9, 12], progression: [[0, 4, 9, 14], [5, 9, 12, 17], [7, 11, 14, 19], [2, 7, 11, 16], [0, 4, 7, 14]] },
    ],
    // CRYSTAL HALL
    [
      { intervals: [0, 2, 4, 6, 7, 9], progression: [[0, 4, 7, 14], [2, 6, 9, 16], [4, 7, 11, 18], [6, 9, 12, 19], [7, 11, 14, 21]] },
      { intervals: [0, 2, 4, 6, 7, 9, 12], progression: [[0, 7, 14, 16], [2, 6, 11, 16], [4, 9, 12, 18], [6, 11, 14, 21], [7, 12, 16, 21]] },
      { intervals: [0, 2, 4, 6, 7, 9, 14], progression: [[0, 4, 9, 16], [2, 6, 11, 18], [4, 7, 12, 19], [6, 9, 14, 21], [7, 11, 16, 23]] },
    ],
    // RAIN FIELD
    [
      { intervals: [0, 2, 4, 7, 9], progression: [[0, 7, 9, 14], [2, 7, 11, 16], [4, 9, 12, 18], [7, 9, 14, 19], [9, 12, 16, 21]] },
      { intervals: [0, 2, 4, 5, 7, 9], progression: [[0, 4, 9, 14], [2, 5, 9, 16], [5, 9, 12, 17], [7, 11, 14, 19], [0, 7, 12, 16]] },
      { intervals: [0, 2, 4, 7, 9, 12], progression: [[0, 4, 7, 14], [2, 7, 9, 16], [4, 9, 12, 18], [7, 11, 14, 19], [0, 4, 9, 16]] },
    ],
    // STAR CANOPY
    [
      { intervals: [0, 2, 4, 7, 9, 11, 14], progression: [[0, 4, 7, 14, 19], [5, 9, 12, 19, 24], [7, 11, 14, 21, 26], [2, 7, 11, 18, 23], [9, 14, 16, 21, 26]] },
      { intervals: [0, 2, 4, 6, 7, 9, 11, 14], progression: [[0, 4, 9, 16, 21], [2, 6, 11, 18, 23], [5, 9, 14, 19, 24], [7, 11, 16, 21, 26], [0, 7, 11, 19, 24]] },
      { intervals: [0, 2, 4, 6, 7, 9, 11, 14, 16], progression: [[0, 4, 7, 14, 21], [2, 6, 9, 16, 23], [4, 7, 11, 18, 25], [7, 11, 14, 21, 28], [9, 14, 16, 23, 30]] },
    ],
  ];
  let currentRootMidi = worldRoots[0];
  let moodSlot = -1;
  let worldSlot = -1;
  let scaleNotes = [];
  let chordProgression = [];
  let chordIndex = 0;
  let currentChordFreqs = [];
  let melodyIndex = 0;
  let melodyDirection = 1;
  let harmonyDirection = 1;
  let motifCell = [];
  let motifStep = 0;

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

  function moodIndexFromValue(mood) {
    if (mood < 0.34) return 0;
    if (mood < 0.68) return 1;
    return 2;
  }

  function buildScale(profile) {
    const notes = [];
    const octaves = [0, 12, 24];
    for (const oct of octaves) {
      for (const interval of profile.intervals) {
        notes.push(midiToFreq(currentRootMidi + oct + interval));
      }
    }
    return notes;
  }

  function buildChordFrequencies(intervals) {
    if (!intervals || intervals.length === 0) return [];

    const world = getWorldIndex();
    const rootLift = [14, 21, 16, 24][world];
    const upperLift = [24, 33, 28, 36][world];

    const freqs = intervals.map((semi, idx) => {
      const baseMidi = currentRootMidi + semi;
      const targetMidi = baseMidi + (idx === 0 ? rootLift : upperLift) + (idx >= 3 ? 12 : 0);
      return midiToFreq(targetMidi);
    });

    return freqs.sort((a, b) => a - b);
  }

  function nearestScaleIndex(freq) {
    if (!scaleNotes.length) return 0;
    let idx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < scaleNotes.length; i++) {
      const dist = Math.abs(scaleNotes[i] - freq);
      if (dist < bestDist) {
        bestDist = dist;
        idx = i;
      }
    }
    return idx;
  }

  function refreshMotifCell() {
    if (!scaleNotes.length) {
      motifCell = [];
      motifStep = 0;
      return;
    }

    const mood = getMood();
    const world = getWorldIndex();
    const length = 6 + Math.floor(mood * 4) + (world === 3 ? 1 : 0);
    const base = currentChordFreqs.length ? currentChordFreqs[0] : scaleNotes[Math.floor(scaleNotes.length * 0.35)];
    const baseIdx = nearestScaleIndex(base);

    const stepsByWorld = [
      [0, 1, 2, 1, -1, 2, -1],
      [0, 2, 1, 3, -1, 2, 4],
      [0, 1, -1, 2, 1, 0, 3],
      [0, 2, 4, 1, 3, -1, 2, 5],
    ];
    const steps = stepsByWorld[world];
    const cell = [];
    let cursor = baseIdx;
    for (let i = 0; i < length; i++) {
      if (i > 0 && i % (world === 1 ? 4 : 3) === 0) {
        const homeOffset = world === 3 ? 2 : 1;
        cursor = clamp(baseIdx + (Math.random() < 0.65 ? homeOffset : 0), 2, scaleNotes.length - 2);
      } else {
        const move = steps[Math.floor(Math.random() * steps.length)];
        cursor = clamp(cursor + move, 2, scaleNotes.length - 2);
      }
      cell.push(scaleNotes[cursor]);
    }

    // Force cadence by returning home or fifth.
    cell[length - 1] = scaleNotes[clamp(baseIdx + (Math.random() < 0.45 ? 0 : 2), 1, scaleNotes.length - 1)];
    motifCell = cell;
    motifStep = 0;
  }

  function nextMotifNote() {
    if (!motifCell.length) refreshMotifCell();
    if (!motifCell.length) return pickNote();
    const note = motifCell[motifStep % motifCell.length];
    motifStep = (motifStep + 1) % motifCell.length;
    return note;
  }

  function updateMoodScale(force = false) {
    const world = getWorldIndex();
    const idx = moodIndexFromValue(getMood());
    if (!force && idx === moodSlot && world === worldSlot && scaleNotes.length) return false;

    worldSlot = world;
    moodSlot = idx;
    currentRootMidi = worldRoots[world];
    const worldBank = worldProfiles[world] || worldProfiles[0];
    const profile = worldBank[idx] || worldBank[0];
    scaleNotes = buildScale(profile);
    chordProgression = profile.progression.slice();
    chordIndex = 0;
    harmonyDirection = Math.random() < 0.5 ? 1 : -1;
    currentChordFreqs = buildChordFrequencies(chordProgression[chordIndex]);
    melodyIndex = Math.floor(scaleNotes.length * 0.5);
    melodyDirection = Math.random() < 0.5 ? 1 : -1;
    refreshMotifCell();

    if (drone && audioCtx) {
      const now = audioCtx.currentTime;
      const rootFreq = currentChordFreqs.length ? currentChordFreqs[0] * 0.95 : scaleNotes[0] * 0.95;
      drone.oscA.frequency.setTargetAtTime(rootFreq, now, 0.8);
      drone.oscB.frequency.setTargetAtTime(rootFreq * 1.5, now, 0.8);
    }

    return true;
  }

  function pickNote() {
    if (!scaleNotes.length) return 293.66;

    const world = getWorldIndex();
    const mood = getMood();
    const intensity = getIntensity();

    const anchorFreq = currentChordFreqs.length
      ? currentChordFreqs[Math.floor(Math.random() * currentChordFreqs.length)]
      : scaleNotes[Math.floor(scaleNotes.length * 0.5)];

    let anchorIdx = nearestScaleIndex(anchorFreq);
    const upwardBias = [0.66, 0.8, 0.72, 0.76][world];
    if (Math.random() < 0.2 + intensity * 0.2) {
      anchorIdx += Math.random() < upwardBias ? 1 : -1;
    }

    if (Math.random() < 0.06 + intensity * 0.16) {
      melodyDirection *= -1;
    }

    const worldStep = [1.3, 2.1, 1.7, 2.4][world];
    const maxStep = 1 + Math.floor(intensity * worldStep + mood * (0.45 + worldStep * 0.22));
    const step = 1 + Math.floor(Math.random() * maxStep);
    melodyIndex = anchorIdx + step * melodyDirection;

    const lowRatio = [0.28, 0.42, 0.36, 0.48][world];
    const highRatio = [0.82, 0.98, 0.94, 0.99][world];
    const lowBound = Math.max(2, Math.floor(scaleNotes.length * lowRatio));
    const highBound = Math.max(lowBound + 2, Math.floor(scaleNotes.length * highRatio));
    if (melodyIndex < lowBound) {
      melodyIndex = lowBound;
      melodyDirection = 1;
    } else if (melodyIndex > highBound) {
      melodyIndex = highBound;
      melodyDirection = -1;
    }

    melodyIndex = clamp(melodyIndex, lowBound, highBound);
    const chordBias = [0.42, 0.24, 0.2, 0.22][world];
    if (Math.random() < chordBias && currentChordFreqs.length) {
      const chordTone = currentChordFreqs[Math.floor(Math.random() * currentChordFreqs.length)];
      const ratioPools = [
        [1, 1.5, 2],
        [1.5, 2, 2.5],
        [1, 1.5, 2],
        [1.5, 2, 3],
      ];
      const pool = ratioPools[world];
      const ratio = pool[Math.floor(Math.random() * pool.length)];
      return chordTone * ratio;
    }
    return scaleNotes[melodyIndex];
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

    const bloomDelay = ac.createDelay(1.6);
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

  function buildDrone(ac) {
    const output = ac.createGain();
    output.gain.value = 0.016;

    const tone = ac.createBiquadFilter();
    tone.type = 'bandpass';
    tone.frequency.value = 900;
    tone.Q.value = 0.45;

    const blend = ac.createGain();
    blend.gain.value = 0.02;

    const oscA = ac.createOscillator();
    oscA.type = 'sine';
    oscA.frequency.value = 196;
    oscA.detune.value = -2;

    const oscB = ac.createOscillator();
    oscB.type = 'sine';
    oscB.frequency.value = 294;
    oscB.detune.value = 2;

    const lfo = ac.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.value = 0.04;
    const lfoDepth = ac.createGain();
    lfoDepth.gain.value = 0.008;

    lfo.connect(lfoDepth).connect(blend.gain);
    oscA.connect(blend);
    oscB.connect(blend);
    blend.connect(tone);
    tone.connect(output);

    oscA.start();
    oscB.start();
    lfo.start();

    return { output, tone, oscA, oscB, lfo, lfoDepth };
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

  function buildCrackle(ac, dustBuffer) {
    const output = ac.createGain();
    output.gain.value = 0.36;

    const popBus = ac.createGain();
    const popHP = ac.createBiquadFilter();
    popHP.type = 'highpass';
    popHP.frequency.value = 820;
    const popLP = ac.createBiquadFilter();
    popLP.type = 'lowpass';
    popLP.frequency.value = 9200;

    const color = ac.createBiquadFilter();
    color.type = 'peaking';
    color.frequency.value = 2200;
    color.Q.value = 0.9;
    color.gain.value = 1.4;

    popBus.connect(popHP);
    popHP.connect(popLP);
    popLP.connect(color);

    const dustSource = ac.createBufferSource();
    dustSource.buffer = dustBuffer;
    dustSource.loop = true;

    const dustHP = ac.createBiquadFilter();
    dustHP.type = 'highpass';
    dustHP.frequency.value = 1400;
    dustHP.Q.value = 0.3;

    const dustLP = ac.createBiquadFilter();
    dustLP.type = 'lowpass';
    dustLP.frequency.value = 9800;
    dustLP.Q.value = 0.2;

    const dustGain = ac.createGain();
    dustGain.gain.value = 0.00001;

    dustSource.connect(dustHP);
    dustHP.connect(dustLP);
    dustLP.connect(dustGain);
    dustGain.connect(color);
    color.connect(output);
    dustSource.start();

    return { output, popBus, popHP, popLP, color, dustSource, dustHP, dustLP, dustGain };
  }

  function triggerCrackleBurst() {
    if (!audioCtx || !audioActive || !crackle || !crackleNoise) return;

    const warmth = getWarmth();
    const crackleAmt = getCrackleAmount();
    if (crackleAmt < 0.03) return;

    const clickCount = 1 + Math.floor(Math.random() * (3 + crackleAmt * 9 + warmth * 2));
    const now = audioCtx.currentTime;

    for (let i = 0; i < clickCount; i++) {
      if (Math.random() > 0.45 + crackleAmt * 0.35 + warmth * 0.12) continue;

      const src = audioCtx.createBufferSource();
      src.buffer = crackleNoise;

      const hp = audioCtx.createBiquadFilter();
      hp.type = 'highpass';
      hp.frequency.value = 700 + Math.random() * 3600;

      const lp = audioCtx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 3200 + Math.random() * 5000;

      const amp = audioCtx.createGain();

      const start = now + Math.random() * 0.08;
      const dur = 0.003 + Math.random() * (0.01 + crackleAmt * 0.02 + warmth * 0.01);
      const peak = (0.0016 + crackleAmt * 0.013 + warmth * 0.0044) * (0.85 + Math.random() * 1.5);

      amp.gain.setValueAtTime(0.00001, start);
      amp.gain.exponentialRampToValueAtTime(peak, start + 0.0009);
      amp.gain.exponentialRampToValueAtTime(0.00001, start + dur);

      src.connect(hp);
      hp.connect(lp);
      lp.connect(amp);
      amp.connect(crackle.popBus);

      const offset = Math.random() * Math.max(0, crackleNoise.duration - 0.12);
      src.start(start, offset);
      src.stop(start + dur + 0.03);

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

    triggerCrackleBurst();

    const world = getWorldIndex();
    const warmth = getWarmth();
    const crackleAmt = getCrackleAmount();
    const worldRate = world === 0 ? 1.0 : (world === 1 ? 1.08 : (world === 2 ? 0.9 : 1.14));
    const base = (980 - crackleAmt * 520 - warmth * 140) * worldRate;
    const jitter = (760 - crackleAmt * 360) * worldRate;
    const next = Math.max(90, base + Math.random() * Math.max(180, jitter));

    crackleTimer = setTimeout(scheduleCrackle, next);
  }

  function applyAmbientSettings(now, ramp = 0.2) {
    if (!audioCtx || !masterGain || !filter || !delay || !delayFeedback || !reverb) return;

    const atmosphere = getAtmosphere();
    const intensity = getIntensity();
    const mood = getMood();
    const warmth = getWarmth();
    const world = getWorldIndex();

    let worldTone = {
      cutoff: 1,
      wet: 1,
      delay: 1,
      feedback: 1,
      level: 1,
      drone: 1,
      shimmer: 1,
      crackle: 1,
    };

    if (world === 0) {
      worldTone = { cutoff: 0.92, wet: 0.58, delay: 0.62, feedback: 0.46, level: 1.03, drone: 0.18, shimmer: 0.28, crackle: 1.06 };
    } else if (world === 1) {
      worldTone = { cutoff: 1.2, wet: 0.74, delay: 0.78, feedback: 0.44, level: 0.99, drone: 0.08, shimmer: 0.9, crackle: 0.86 };
    } else if (world === 2) {
      worldTone = { cutoff: 1.1, wet: 0.86, delay: 0.9, feedback: 0.48, level: 0.98, drone: 0.05, shimmer: 0.72, crackle: 1.12 };
    } else {
      worldTone = { cutoff: 1.3, wet: 0.92, delay: 1.0, feedback: 0.5, level: 0.95, drone: 0.1, shimmer: 1.0, crackle: 0.72 };
    }

    const cutoff = mapExp(atmosphere, 540, 9800) * (1 - warmth * 0.08) * worldTone.cutoff;
    const wet = clamp((0.12 + atmosphere * 0.3 + intensity * 0.08) * worldTone.wet, 0.08, 0.84);
    const delayTime = (0.13 + atmosphere * 0.46 + intensity * 0.06) * worldTone.delay;
    const feedback = clamp((0.05 + atmosphere * 0.1 + intensity * 0.07 - warmth * 0.03) * worldTone.feedback, 0.04, 0.38);
    const level = (0.38 + intensity * 0.14 - atmosphere * 0.015) * worldTone.level;

    filter.frequency.setTargetAtTime(cutoff, now, ramp);
    filter.Q.setTargetAtTime(0.3 + intensity * 0.18 + warmth * 0.04, now, ramp);
    reverb.wetGain.gain.setTargetAtTime(wet, now, ramp);
    reverb.dryGain.gain.setTargetAtTime(1 - wet, now, ramp);
    delay.delayTime.setTargetAtTime(delayTime, now, ramp);
    delayFeedback.gain.setTargetAtTime(feedback, now, ramp);
    masterGain.gain.setTargetAtTime(level, now, ramp);

    if (padFilter) {
      padFilter.frequency.setTargetAtTime(240 + cutoff * 0.65, now, ramp);
      padFilter.Q.setTargetAtTime(0.42 + atmosphere * 0.55 + warmth * 0.2, now, ramp);
    }

    if (moodFilter) {
      const moodCenter = mapExp(clamp(0.09 + mood * 0.83 + intensity * 0.08, 0, 1), 280, 4200);
      moodFilter.frequency.setTargetAtTime(moodCenter, now, ramp);
      moodFilter.Q.setTargetAtTime(0.28 + atmosphere * 0.2 + intensity * 0.12, now, ramp);
      moodFilter.gain.setTargetAtTime(-0.2 + mood * 1.2 - warmth * 0.15, now, ramp);
    }

    if (drone) {
      drone.output.gain.setTargetAtTime((0.004 + atmosphere * 0.018 + (1 - intensity) * 0.004) * worldTone.drone, now, ramp * 1.3);
      drone.tone.frequency.setTargetAtTime(540 + cutoff * 0.18 + warmth * 70, now, ramp);
      drone.lfo.frequency.setTargetAtTime(0.02 + intensity * 0.03, now, ramp);
      drone.lfoDepth.gain.setTargetAtTime(0.0007 + atmosphere * 0.002 + warmth * 0.0016, now, ramp);
    }

    if (warmthShelf && warmthLowpass) {
      warmthShelf.gain.setTargetAtTime(warmth * 8, now, ramp);
      warmthLowpass.frequency.setTargetAtTime(14000 - warmth * 7000 + atmosphere * 1800, now, ramp);
    }

    if (analogDriveIn && analogPost) {
      // Keep this stage clean; no intentional saturation.
      analogDriveIn.gain.setTargetAtTime(1, now, ramp * 1.2);
      analogPost.gain.setTargetAtTime(0.98, now, ramp);
    }

    if (reverb.preDelay && reverb.wetTone && reverb.shimmerShelf && reverb.spaceMix && reverb.spaceDepth) {
      const spaceLift = [0.88, 0.96, 1.08, 1.34][world];
      reverb.preDelay.delayTime.setTargetAtTime((0.01 + atmosphere * 0.035 + intensity * 0.01) * spaceLift, now, ramp);
      reverb.wetTone.frequency.setTargetAtTime(2400 + atmosphere * 4700 + mood * 900, now, ramp);
      if (reverb.wetHighpass) {
        reverb.wetHighpass.frequency.setTargetAtTime(220 + warmth * 120 + (1 - atmosphere) * 110, now, ramp);
      }
      reverb.shimmerShelf.gain.setTargetAtTime((-0.2 + atmosphere * 2.5 + mood * 0.45) * worldTone.shimmer, now, ramp);
      reverb.spaceMix.gain.setTargetAtTime(clamp((0.08 + atmosphere * 0.2 + intensity * 0.1) * worldTone.shimmer, 0.04, 0.5), now, ramp);
      reverb.spaceDepth.gain.setTargetAtTime((0.0007 + atmosphere * 0.002 + intensity * 0.001) * worldTone.shimmer, now, ramp);
      if (reverb.bloomDelay && reverb.bloomFeedback && reverb.bloomMix) {
        reverb.bloomDelay.delayTime.setTargetAtTime(0.44 + atmosphere * 0.5 + (world === 3 ? 0.16 : 0), now, ramp);
        reverb.bloomFeedback.gain.setTargetAtTime(clamp(0.11 + atmosphere * 0.13 + (world === 3 ? 0.08 : 0), 0.07, 0.32), now, ramp);
        reverb.bloomMix.gain.setTargetAtTime(clamp((0.04 + atmosphere * 0.1 + intensity * 0.05) * worldTone.shimmer, 0.03, 0.24), now, ramp);
      }
    }

    if (crystalSend && crystalDelay && crystalFeedback && crystalHP && crystalLP && crystalMix) {
      const crystalWorld = [0.12, 0.78, 0.42, 0.92][world];
      const crystalBase = [0.42, 0.24, 0.62, 0.9][world];
      crystalSend.gain.setTargetAtTime((0.015 + atmosphere * 0.045 + intensity * 0.025) * crystalWorld, now, ramp);
      crystalDelay.delayTime.setTargetAtTime(crystalBase + atmosphere * 0.56 + (world === 3 ? 0.2 : 0), now, ramp);
      crystalFeedback.gain.setTargetAtTime(clamp(0.14 + atmosphere * 0.18 + intensity * 0.08 + (world === 3 ? 0.05 : 0), 0.1, 0.46), now, ramp);
      crystalHP.frequency.setTargetAtTime(1100 + atmosphere * 1400 + world * 300, now, ramp);
      crystalLP.frequency.setTargetAtTime(4800 + atmosphere * 4000 + mood * 1200, now, ramp);
      crystalMix.gain.setTargetAtTime(clamp((0.04 + atmosphere * 0.12 + intensity * 0.06) * crystalWorld, 0.025, 0.28), now, ramp);
    }

    if (prismSend && prismDelayA && prismDelayB && prismFeedback && prismHP && prismLP && prismMix && prismDepthA && prismDepthB) {
      const prismWorld = [0.05, 0.68, 0.3, 0.98][world];
      prismSend.gain.setTargetAtTime((0.008 + atmosphere * 0.024 + intensity * 0.012) * prismWorld, now, ramp);
      prismDelayA.delayTime.setTargetAtTime(0.14 + atmosphere * 0.31 + (world === 1 ? 0.08 : 0) + (world === 3 ? 0.12 : 0), now, ramp);
      prismDelayB.delayTime.setTargetAtTime(0.26 + atmosphere * 0.42 + (world === 1 ? 0.11 : 0) + (world === 3 ? 0.18 : 0), now, ramp);
      prismFeedback.gain.setTargetAtTime(clamp(0.14 + atmosphere * 0.12 + intensity * 0.06 + (world === 3 ? 0.06 : 0), 0.09, 0.42), now, ramp);
      prismHP.frequency.setTargetAtTime(840 + atmosphere * 1850 + world * 280, now, ramp);
      prismLP.frequency.setTargetAtTime(4000 + atmosphere * 4500 + mood * 1500, now, ramp);
      prismMix.gain.setTargetAtTime(clamp((0.02 + atmosphere * 0.08 + intensity * 0.04) * prismWorld, 0.01, 0.22), now, ramp);
      prismDepthA.gain.setTargetAtTime(0.001 + atmosphere * 0.0022 + (world === 3 ? 0.0016 : 0), now, ramp);
      prismDepthB.gain.setTargetAtTime(0.0016 + atmosphere * 0.003 + (world === 1 ? 0.0012 : 0), now, ramp);
    }

    if (crackle) {
      const crackleAmt = getCrackleAmount();
      crackle.output.gain.setTargetAtTime((0.08 + crackleAmt * 0.82) * worldTone.crackle, now, ramp * 1.2);
      crackle.popHP.frequency.setTargetAtTime(640 + crackleAmt * 1000, now, ramp);
      crackle.popLP.frequency.setTargetAtTime(3600 + warmth * 4200 + atmosphere * 1200, now, ramp);
      crackle.color.gain.setTargetAtTime(0.6 + warmth * 1.4 + crackleAmt * 0.9, now, ramp);
      crackle.dustGain.gain.setTargetAtTime((0.0003 + crackleAmt * 0.012) * (0.75 + warmth * 0.7), now, ramp);
      crackle.dustHP.frequency.setTargetAtTime(900 + crackleAmt * 900, now, ramp);
      crackle.dustLP.frequency.setTargetAtTime(4200 + warmth * 3600 + atmosphere * 1100, now, ramp);
    }

    updateMoodScale();
  }

  function syncKnobToAudio(id) {
    if (!audioCtx || !audioActive) return;
    const now = audioCtx.currentTime;

    switch (id) {
      case 'xy':
      case 'x':
      case 'y': {
        const changed = updateMoodScale();
        applyAmbientSettings(now, 0.2);
        if (changed) {
          if (harmonyTimer) {
            clearTimeout(harmonyTimer);
            harmonyTimer = null;
          }
          scheduleHarmony();
        }
        break;
      }
      default:
        applyAmbientSettings(now, 0.2);
        break;
    }
  }

  function playMotifNote(freq, level = 1) {
    if (!audioCtx || !audioActive) return;

    audioEnergy = Math.max(audioEnergy, 0.85 * level);

    const now = audioCtx.currentTime;
    const atmosphere = getAtmosphere();
    const intensity = getIntensity();
    const mood = getMood();
    const warmth = getWarmth();
    const world = getWorldIndex();

    const attack = (0.04 + (1 - intensity) * 0.12) * [1.35, 0.5, 0.22, 0.9][world];
    const release = (0.68 + atmosphere * 1.18 + (1 - intensity) * 0.96) * [1.05, 0.66, 0.52, 0.86][world];
    const detuneVal = (0.2 + mood * 0.52 + warmth * 0.22) * [0.3, 0.8, 0.34, 0.74][world];
    const basePeak = 0.034 + intensity * 0.022 + atmosphere * 0.01;
    const peak = basePeak * level;

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + attack);
    env.gain.exponentialRampToValueAtTime(0.00001, now + attack + release);

    const pan = audioCtx.createStereoPanner();
    const panWidth = [0.26, 0.46, 0.34, 0.74][world];
    pan.pan.value = (Math.random() * 2 - 1) * panWidth;

    const crystalTap = audioCtx.createGain();
    crystalTap.gain.value = [0.04, 0.24, 0.12, 0.28][world];

    const tone = audioCtx.createBiquadFilter();
    const toneTypes = ['lowpass', 'bandpass', 'highpass', 'lowpass'];
    tone.type = toneTypes[world];
    tone.frequency.value = [
      1500 + atmosphere * 1500,
      1900 + atmosphere * 2100,
      1300 + atmosphere * 2600,
      2200 + atmosphere * 3000,
    ][world];
    tone.Q.value = [0.4, 0.9, 0.7, 0.42][world];

    const body = audioCtx.createOscillator();
    const bodyTypes = ['triangle', 'triangle', 'sine', 'triangle'];
    body.type = bodyTypes[world];
    body.frequency.value = freq;
    body.detune.value = detuneVal;

    const companion = audioCtx.createOscillator();
    companion.type = ['sine', 'sawtooth', 'triangle', 'sawtooth'][world];
    const companionRatio = [1.25, 2.0, 1.5, 2.5][world];
    companion.frequency.value = freq * (mood > 0.5 ? companionRatio : 1);
    companion.detune.value = -detuneVal;

    const shimmerGain = audioCtx.createGain();
    shimmerGain.gain.value = Math.max(0, atmosphere - 0.44) * [0.06, 0.18, 0.08, 0.22][world];
    const shimmer = audioCtx.createOscillator();
    shimmer.type = world === 1 ? 'triangle' : 'sine';
    shimmer.frequency.value = Math.min(freq * 2, 2200);
    shimmer.detune.value = (Math.random() * 2 - 1) * 2;

    const driftLfo = audioCtx.createOscillator();
    driftLfo.type = 'sine';
    driftLfo.frequency.value = 0.06 + Math.random() * 0.12 + intensity * [0.03, 0.05, 0.04, 0.06][world];
    const driftDepth = audioCtx.createGain();
    driftDepth.gain.value = (0.2 + warmth * 0.52 + atmosphere * 0.32) * [0.4, 0.66, 0.46, 0.78][world];
    driftLfo.connect(driftDepth);
    driftDepth.connect(body.detune);
    driftDepth.connect(companion.detune);

    body.connect(env);
    companion.connect(env);
    shimmer.connect(shimmerGain).connect(env);
    env.connect(tone);
    tone.connect(pan).connect(filter);
    env.connect(crystalTap);
    if (crystalSend) crystalTap.connect(crystalSend);
    if (prismSend) crystalTap.connect(prismSend);

    const stopTime = now + attack + release + 0.08;
    driftLfo.start(now);
    body.start(now);
    companion.start(now);
    shimmer.start(now);
    driftLfo.stop(stopTime + 0.02);
    body.stop(stopTime);
    companion.stop(stopTime);
    shimmer.stop(stopTime);

    const voice = { env, nodes: [body, companion, shimmer, driftLfo], pan, tone, shimmerGain, driftDepth, crystalTap };
    motifVoices.push(voice);

    const maxVoices = 6 + Math.round(intensity * 4);
    while (motifVoices.length > maxVoices) {
      const old = motifVoices.shift();
      try {
        old.env.gain.cancelScheduledValues(audioCtx.currentTime);
        old.env.gain.setValueAtTime(old.env.gain.value, audioCtx.currentTime);
        old.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.35);
        for (const node of old.nodes) {
          node.stop(audioCtx.currentTime + 0.4);
        }
        if (old.driftDepth) old.driftDepth.disconnect();
        if (old.crystalTap) old.crystalTap.disconnect();
        if (old.tone) old.tone.disconnect();
        old.pan.disconnect();
        old.env.disconnect();
      } catch (e) { /* already stopped */ }
    }

    body.onended = () => {
      const idx = motifVoices.indexOf(voice);
      if (idx !== -1) motifVoices.splice(idx, 1);
      try {
        shimmerGain.disconnect();
        driftDepth.disconnect();
        crystalTap.disconnect();
        tone.disconnect();
        pan.disconnect();
        env.disconnect();
      } catch (e) { /* noop */ }
    };
  }

  function playRaindrop(freq, level = 1) {
    if (!audioCtx || !audioActive || !reverb || !filter) return;

    audioEnergy = Math.max(audioEnergy, 0.65 * level);

    const now = audioCtx.currentTime;
    const atmosphere = getAtmosphere();
    const intensity = getIntensity();
    const warmth = getWarmth();
    const world = getWorldIndex();

    const worldFreqMul = [1.24, 1.82, 1.52, 2.02][world];
    const freqSpread = 0.7 + intensity * [0.55, 0.8, 1.0, 0.9][world];
    const dropFreq = clamp(freq * (worldFreqMul + Math.random() * freqSpread), 380, world === 3 ? 7200 : 6200);
    const attack = 0.002 + Math.random() * 0.006;
    const release = (0.26 + atmosphere * 0.88 + (1 - intensity) * 0.22) * [0.86, 0.72, 0.98, 1.06][world];
    const peak = (0.011 + intensity * 0.011 + atmosphere * 0.004) * level * [0.86, 0.92, 0.98, 0.94][world];

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + attack);
    env.gain.exponentialRampToValueAtTime(0.00001, now + attack + release);

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * [0.24, 0.52, 0.68, 0.84][world];

    const tone = audioCtx.createBiquadFilter();
    tone.type = 'bandpass';
    tone.frequency.value = dropFreq * (0.92 + Math.random() * 0.18);
    tone.Q.value = (0.7 + intensity * 0.64) * [0.68, 0.92, 0.8, 1.02][world];

    const dry = audioCtx.createGain();
    dry.gain.value = (0.13 + intensity * 0.09) * [1.06, 0.94, 0.84, 0.78][world];

    const wetSend = audioCtx.createGain();
    wetSend.gain.value = (0.28 + atmosphere * 0.3) * [0.66, 1.04, 1.12, 1.2][world];
    const crystalTap = audioCtx.createGain();
    crystalTap.gain.value = [0.1, 0.32, 0.36, 0.46][world];

    const ping = audioCtx.createOscillator();
    ping.type = ['triangle', 'sine', 'triangle', 'sine'][world];
    ping.frequency.setValueAtTime(dropFreq, now);
    ping.frequency.exponentialRampToValueAtTime(
      Math.max(260, dropFreq * (0.66 + Math.random() * 0.12)),
      now + release * 0.9
    );
    ping.detune.value = (Math.random() * 2 - 1) * (2.4 + warmth * 2.4) * [0.48, 0.86, 0.6, 1.04][world];

    const overtone = audioCtx.createOscillator();
    overtone.type = world === 1 ? 'triangle' : 'sine';
    overtone.frequency.value = Math.min(dropFreq * 1.98, 7200);
    overtone.detune.value = (Math.random() * 2 - 1) * (3 + intensity * 2.2);
    const overtoneGain = audioCtx.createGain();
    overtoneGain.gain.value = (0.12 + atmosphere * 0.12) * [0.84, 1.04, 0.88, 1.08][world];

    const driftLfo = audioCtx.createOscillator();
    driftLfo.type = 'triangle';
    driftLfo.frequency.value = 0.16 + Math.random() * 0.28 + world * 0.02;
    const driftDepth = audioCtx.createGain();
    driftDepth.gain.value = (0.16 + warmth * 0.3) * [0.54, 0.84, 0.62, 0.9][world];
    driftLfo.connect(driftDepth).connect(ping.detune);
    driftDepth.connect(overtone.detune);

    ping.connect(env);
    overtone.connect(overtoneGain).connect(env);
    env.connect(tone);
    tone.connect(pan);
    pan.connect(dry).connect(filter);
    pan.connect(wetSend).connect(reverb.input);
    pan.connect(crystalTap);
    if (crystalSend) crystalTap.connect(crystalSend);
    if (prismSend) crystalTap.connect(prismSend);

    let dust = null;
    let dustFilter = null;
    let dustGain = null;
    if ((crackleDustNoise || crackleNoise) && Math.random() < 0.45 + intensity * 0.22) {
      dust = audioCtx.createBufferSource();
      dust.buffer = crackleDustNoise || crackleNoise;

      dustFilter = audioCtx.createBiquadFilter();
      dustFilter.type = 'highpass';
      dustFilter.frequency.value = 1100 + Math.random() * 2600;

      dustGain = audioCtx.createGain();
      const dustPeak = peak * (0.14 + atmosphere * 0.2);
      dustGain.gain.setValueAtTime(0.00001, now);
      dustGain.gain.exponentialRampToValueAtTime(dustPeak, now + 0.004);
      dustGain.gain.exponentialRampToValueAtTime(0.00001, now + 0.06 + Math.random() * 0.08);

      dust.connect(dustFilter).connect(dustGain).connect(reverb.input);
      const offset = Math.random() * Math.max(0, dust.buffer.duration - 0.24);
      dust.start(now, offset);
      dust.stop(now + 0.16);
    }

    const stopTime = now + attack + release + 0.08;
    driftLfo.start(now);
    ping.start(now);
    overtone.start(now);
    driftLfo.stop(stopTime + 0.02);
    ping.stop(stopTime);
    overtone.stop(stopTime);

    const voice = { env, nodes: [ping, overtone, driftLfo], pan, tone, driftDepth, overtoneGain, crystalTap };
    dropVoices.push(voice);

    const maxDrops = 10 + Math.round(intensity * 8);
    while (dropVoices.length > maxDrops) {
      const old = dropVoices.shift();
      try {
        old.env.gain.cancelScheduledValues(audioCtx.currentTime);
        old.env.gain.setValueAtTime(old.env.gain.value, audioCtx.currentTime);
        old.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.22);
        for (const node of old.nodes) node.stop(audioCtx.currentTime + 0.26);
        if (old.driftDepth) old.driftDepth.disconnect();
        if (old.overtoneGain) old.overtoneGain.disconnect();
        if (old.crystalTap) old.crystalTap.disconnect();
        old.tone.disconnect();
        old.pan.disconnect();
        old.env.disconnect();
      } catch (e) { /* already stopped */ }
    }

    ping.onended = () => {
      const idx = dropVoices.indexOf(voice);
      if (idx !== -1) dropVoices.splice(idx, 1);
      try {
        driftDepth.disconnect();
        overtoneGain.disconnect();
        crystalTap.disconnect();
        tone.disconnect();
        pan.disconnect();
        env.disconnect();
      } catch (e) { /* noop */ }
    };

    if (dust) {
      dust.onended = () => {
        try {
          dust.disconnect();
          dustFilter.disconnect();
          dustGain.disconnect();
        } catch (e) { /* noop */ }
      };
    }
  }

  function playPadChord() {
    if (!audioCtx || !audioActive || !padFilter || !currentChordFreqs.length) return;

    const now = audioCtx.currentTime;
    const atmosphere = getAtmosphere();
    const intensity = getIntensity();
    const warmth = getWarmth();
    const mood = getMood();
    const world = getWorldIndex();

    const attackBase = [0.28, 0.18, 0.14, 0.24][world];
    const holdBase = [0.52, 0.34, 0.26, 0.42][world];
    const releaseBase = [1.8, 1.3, 1.1, 1.7][world];

    const attack = attackBase + (1 - intensity) * 0.35;
    const hold = holdBase + atmosphere * 0.5;
    const release = releaseBase + atmosphere * 1.4 + (1 - intensity) * 0.8;
    const peak = (0.007 + atmosphere * 0.006 + (1 - intensity) * 0.0026) * (world === 0 ? 1.02 : (world === 2 ? 0.9 : 0.96));

    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0.00001, now);
    env.gain.exponentialRampToValueAtTime(peak, now + attack);
    env.gain.exponentialRampToValueAtTime(peak * 0.72, now + attack + hold);
    env.gain.exponentialRampToValueAtTime(0.00001, now + attack + hold + release);

    const pan = audioCtx.createStereoPanner();
    pan.pan.value = (Math.random() * 2 - 1) * (world === 3 ? 0.34 : 0.14);

    const crystalTap = audioCtx.createGain();
    crystalTap.gain.value = [0.02, 0.12, 0.08, 0.2][world];

    const padHighpass = audioCtx.createBiquadFilter();
    padHighpass.type = 'highpass';
    padHighpass.frequency.value = 150 + warmth * 90 + world * 40;
    padHighpass.Q.value = 0.35;

    env.connect(pan);
    pan.connect(padHighpass).connect(padFilter);
    pan.connect(crystalTap);
    if (crystalSend) crystalTap.connect(crystalSend);
    if (prismSend) crystalTap.connect(prismSend);

    const driftLfo = audioCtx.createOscillator();
    driftLfo.type = 'sine';
    driftLfo.frequency.value = 0.05 + Math.random() * 0.05 + intensity * 0.025;
    const driftDepth = audioCtx.createGain();
    driftDepth.gain.value = 0.1 + warmth * 0.22 + atmosphere * 0.15 + (world === 3 ? 0.06 : 0);
    driftLfo.connect(driftDepth);

    const nodes = [];
    for (let i = 0; i < currentChordFreqs.length; i++) {
      const freq = currentChordFreqs[i];
      const osc = audioCtx.createOscillator();
      const padTypes = [
        ['triangle', 'sine'],
        ['triangle', 'sawtooth'],
        ['triangle', 'sine'],
        ['triangle', 'triangle', 'sawtooth'],
      ];
      const typeBank = padTypes[world];
      osc.type = typeBank[i % typeBank.length];
      osc.frequency.value = freq;
      osc.detune.value = (Math.random() * 2 - 1) * (0.14 + atmosphere * 0.18 + mood * 0.12 + (world === 3 ? 0.16 : 0));
      driftDepth.connect(osc.detune);
      osc.connect(env);
      osc.start(now);
      nodes.push(osc);
    }

    let sheen = null;
    let sheenGain = null;
    if (atmosphere > (world === 0 ? 0.55 : 0.38)) {
      sheen = audioCtx.createOscillator();
      sheen.type = 'triangle';
      sheen.frequency.value = Math.min(currentChordFreqs[currentChordFreqs.length - 1] * (world === 3 ? 2.35 : 2.05), 2800);
      sheen.detune.value = (Math.random() * 2 - 1) * 0.5;
      driftDepth.connect(sheen.detune);
      sheenGain = audioCtx.createGain();
      sheenGain.gain.value = peak * (0.04 + atmosphere * (world === 3 ? 0.13 : 0.08));
      sheen.connect(sheenGain).connect(env);
      sheen.start(now);
      nodes.push(sheen);
    }

    const stopTime = now + attack + hold + release + 0.12;
    driftLfo.start(now);
    driftLfo.stop(stopTime + 0.02);
    for (const node of nodes) node.stop(stopTime);
    nodes.push(driftLfo);

    const chordVoice = { env, pan, padHighpass, nodes, driftDepth, sheenGain, crystalTap };
    padVoices.push(chordVoice);

    while (padVoices.length > 1) {
      const old = padVoices.shift();
      try {
        old.env.gain.cancelScheduledValues(audioCtx.currentTime);
        old.env.gain.setValueAtTime(old.env.gain.value, audioCtx.currentTime);
        old.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.45);
        for (const node of old.nodes) {
          node.stop(audioCtx.currentTime + 0.5);
        }
        if (old.driftDepth) old.driftDepth.disconnect();
        if (old.sheenGain) old.sheenGain.disconnect();
        if (old.crystalTap) old.crystalTap.disconnect();
        if (old.padHighpass) old.padHighpass.disconnect();
        old.pan.disconnect();
        old.env.disconnect();
      } catch (e) { /* already stopped */ }
    }
  }

  function scheduleHarmony() {
    if (!audioActive) return;
    if (!chordProgression.length) return;

    const world = getWorldIndex();
    const progressionLength = chordProgression.length;
    const intervals = chordProgression[chordIndex % progressionLength];
    currentChordFreqs = buildChordFrequencies(intervals);
    refreshMotifCell();
    if (world === 0) {
      const tones = currentChordFreqs.slice(0, Math.min(4, currentChordFreqs.length));
      tones.forEach((tone, i) => {
        setTimeout(() => {
          if (!audioActive) return;
          playMotifNote(Math.min(tone * (1.2 + i * 0.18), 2200), 0.28);
        }, i * 170);
      });
      if (Math.random() < 0.32) playPadChord();
    } else if (world === 1) {
      const tones = currentChordFreqs.slice(0, Math.min(5, currentChordFreqs.length));
      tones.forEach((tone, i) => {
        setTimeout(() => {
          if (!audioActive) return;
          playMotifNote(Math.min(tone * (1.7 + i * 0.22), 3400), 0.34);
          if (Math.random() < 0.6) {
            playRaindrop(Math.min(tone * (2 + i * 0.16), 4200), 0.26);
          }
        }, i * 95);
      });
    } else if (world === 2) {
      const tones = currentChordFreqs.slice(0, Math.min(4, currentChordFreqs.length));
      tones.forEach((tone, i) => {
        setTimeout(() => {
          if (!audioActive) return;
          playRaindrop(Math.min(tone * (1.36 + i * 0.16), 3400), 0.3);
          if (Math.random() < 0.24) playMotifNote(Math.min(tone * 1.5, 2400), 0.2);
        }, i * 125);
      });
    } else {
      const tones = currentChordFreqs.slice(0, Math.min(5, currentChordFreqs.length));
      tones.forEach((tone, i) => {
        setTimeout(() => {
          if (!audioActive) return;
          playMotifNote(Math.min(tone * (1.9 + i * 0.18), 4200), 0.28);
          if (Math.random() < 0.52) playRaindrop(Math.min(tone * (2.1 + i * 0.2), 5200), 0.24);
        }, i * 110);
      });
      if (Math.random() < 0.22) playPadChord();
    }

    if (progressionLength > 1) {
      if (world === 0) {
        chordIndex = (chordIndex + 1) % progressionLength;
      } else if (world === 1) {
        chordIndex = (chordIndex + (Math.random() < 0.62 ? 2 : 1)) % progressionLength;
      } else if (world === 2) {
        chordIndex = (chordIndex + 1 + (Math.random() < 0.22 ? 1 : 0)) % progressionLength;
      } else {
        if (Math.random() < 0.34) harmonyDirection *= -1;
        chordIndex = (chordIndex + harmonyDirection + progressionLength) % progressionLength;
      }
    }

    const atmosphere = getAtmosphere();
    const intensity = getIntensity();
    const mood = getMood();

    const worldBase = [6200, 4300, 3900, 5600][world];
    const worldDrift = [2400, 1700, 1300, 2600][world];
    const base = worldBase + (1 - intensity) * 3200 + (1 - atmosphere) * 1200;
    const drift = worldDrift + mood * 1400 + (1 - intensity) * 900;
    harmonyTimer = setTimeout(scheduleHarmony, base + Math.random() * drift);
  }

  function scheduleNext() {
    if (!audioActive) return;

    const atmosphere = getAtmosphere();
    const intensity = getIntensity();
    const mood = getMood();
    const world = getWorldIndex();

    let eventChance = 0.34;
    let baseDelay = 4200;
    let jitter = 1800;
    let minDelay = 1400;

    if (world === 0) {
      eventChance = 0.26 + intensity * 0.2;
      const root = nextMotifNote();
      if (Math.random() < eventChance) {
        playMotifNote(root, 0.82);
        if (Math.random() < 0.32 + mood * 0.2) {
          playMotifNote(Math.min(root * 1.5, 1900), 0.34 + intensity * 0.1);
        }
        if (Math.random() < 0.28 + atmosphere * 0.24) {
          playRaindrop(Math.min(root * 2, 3000), 0.24 + intensity * 0.1);
        }
      }
      baseDelay = 4800 - intensity * 1800;
      jitter = 2100 + (1 - intensity) * 1500;
    } else if (world === 1) {
      eventChance = 0.38 + intensity * 0.3;
      if (Math.random() < eventChance) {
        const root = nextMotifNote();
        const high = Math.min(root * (1.7 + Math.random() * 0.45), 3200);
        playMotifNote(high, 0.66 + intensity * 0.16);
        if (Math.random() < 0.66) {
          playMotifNote(Math.min(high * 1.34, 4200), 0.3 + atmosphere * 0.12);
        }
        if (Math.random() < 0.52 + intensity * 0.18) {
          playRaindrop(high, 0.32 + intensity * 0.18);
        }
        if (Math.random() < 0.4) {
          setTimeout(() => {
            if (!audioActive) return;
            playRaindrop(Math.min(high * 1.22, 5200), 0.24 + atmosphere * 0.1);
          }, 120 + Math.random() * 120);
        }
      }
      baseDelay = 2900 - intensity * 900;
      jitter = 1000 + (1 - intensity) * 900;
      minDelay = 760;
    } else if (world === 2) {
      eventChance = 0.5 + intensity * 0.32;
      if (Math.random() < eventChance) {
        const root = nextMotifNote();
        playRaindrop(root, 0.62 + atmosphere * 0.18);
        if (Math.random() < 0.62) {
          playRaindrop(Math.min(root * (1.45 + Math.random() * 0.45), 3400), 0.34 + intensity * 0.18);
        }
        if (Math.random() < 0.24 + mood * 0.2) {
          playMotifNote(Math.min(root * 2, 2800), 0.24);
        }
      }
      if (Math.random() < 0.18 + intensity * 0.34) {
        const count = 1 + Math.floor(Math.random() * (2 + intensity * 4));
        for (let i = 0; i < count; i++) {
          const t = 70 + i * (80 + Math.random() * 90);
          setTimeout(() => {
            if (!audioActive) return;
            playRaindrop(nextMotifNote(), 0.28 + intensity * 0.22);
          }, t);
        }
      }
      baseDelay = 2300 - intensity * 650;
      jitter = 760 + (1 - intensity) * 680;
      minDelay = 560;
    } else {
      eventChance = 0.28 + intensity * 0.2;
      if (Math.random() < eventChance) {
        const root = nextMotifNote();
        playMotifNote(root, 0.72);
        if (Math.random() < 0.62) {
          playRaindrop(Math.min(root * 2, 4200), 0.32 + atmosphere * 0.14);
        }
        if (Math.random() < 0.16) {
          playPadChord();
        }
      }
      baseDelay = 5200 - intensity * 1500;
      jitter = 2200 + (1 - intensity) * 1700;
    }

    sequenceTimer = setTimeout(scheduleNext, Math.max(minDelay, baseDelay + Math.random() * jitter));
  }

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

    drone = buildDrone(audioCtx);
    drone.output.connect(moodFilter);

    crackleNoise = createNoiseBuffer(audioCtx, 2.2);
    crackleDustNoise = createDustBuffer(audioCtx, 5);
    crackle = buildCrackle(audioCtx, crackleDustNoise);
    crackle.output.connect(analogDriveIn);

    audioActive = true;
    updateMoodScale(true);
    applyAmbientSettings(audioCtx.currentTime, 0.05);
    if (harmonyTimer) clearTimeout(harmonyTimer);
    scheduleHarmony();
    scheduleNext();
    if (crackleTimer) clearTimeout(crackleTimer);
    scheduleCrackle();
  }

  function updateAudioParams() {
    if (!audioActive || !audioCtx) return;

    const now = audioCtx.currentTime;
    if (drone) {
      const mood = getMood();
      const intensity = getIntensity();
      const drift = Math.sin(now * (0.06 + intensity * 0.08)) * (2 + mood * 4);
      drone.oscA.detune.setTargetAtTime(-4 + drift, now, 0.5);
      drone.oscB.detune.setTargetAtTime(4 - drift, now, 0.5);
    }

    applyAmbientSettings(now, 0.12);
  }

  function stopAudio() {
    audioActive = false;
    audioEnergy = 0;
    if (sequenceTimer) {
      clearTimeout(sequenceTimer);
      sequenceTimer = null;
    }
    if (harmonyTimer) {
      clearTimeout(harmonyTimer);
      harmonyTimer = null;
    }
    if (crackleTimer) {
      clearTimeout(crackleTimer);
      crackleTimer = null;
    }

    for (const voice of motifVoices) {
      try {
        voice.env.gain.cancelScheduledValues(audioCtx.currentTime);
        voice.env.gain.setValueAtTime(voice.env.gain.value, audioCtx.currentTime);
        voice.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.35);
        for (const node of voice.nodes) node.stop(audioCtx.currentTime + 0.4);
        if (voice.driftDepth) voice.driftDepth.disconnect();
        if (voice.crystalTap) voice.crystalTap.disconnect();
        voice.pan.disconnect();
        voice.env.disconnect();
      } catch (e) { /* noop */ }
    }
    motifVoices = [];

    for (const voice of padVoices) {
      try {
        voice.env.gain.cancelScheduledValues(audioCtx.currentTime);
        voice.env.gain.setValueAtTime(voice.env.gain.value, audioCtx.currentTime);
        voice.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.35);
        for (const node of voice.nodes) node.stop(audioCtx.currentTime + 0.45);
        if (voice.driftDepth) voice.driftDepth.disconnect();
        if (voice.sheenGain) voice.sheenGain.disconnect();
        if (voice.crystalTap) voice.crystalTap.disconnect();
        if (voice.padHighpass) voice.padHighpass.disconnect();
        voice.pan.disconnect();
        voice.env.disconnect();
      } catch (e) { /* noop */ }
    }
    padVoices = [];

    for (const voice of dropVoices) {
      try {
        voice.env.gain.cancelScheduledValues(audioCtx.currentTime);
        voice.env.gain.setValueAtTime(voice.env.gain.value, audioCtx.currentTime);
        voice.env.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.2);
        for (const node of voice.nodes) node.stop(audioCtx.currentTime + 0.24);
        if (voice.driftDepth) voice.driftDepth.disconnect();
        if (voice.overtoneGain) voice.overtoneGain.disconnect();
        if (voice.crystalTap) voice.crystalTap.disconnect();
        voice.tone.disconnect();
        voice.pan.disconnect();
        voice.env.disconnect();
      } catch (e) { /* noop */ }
    }
    dropVoices = [];

    if (masterGain && audioCtx) {
      const now = audioCtx.currentTime;
      masterGain.gain.setTargetAtTime(0, now, 0.5);
      setTimeout(() => {
        if (audioCtx) audioCtx.suspend();
      }, 2000);
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
    updateControlVisual();

    updateMoodScale(true);
    applyAmbientSettings(now, 0.35);
    if (harmonyTimer) {
      clearTimeout(harmonyTimer);
      harmonyTimer = null;
    }
    scheduleHarmony();

    if (monoSvg) {
      monoSvg.style.transition = 'opacity 0.1s';
      monoSvg.style.opacity = '1';
      setTimeout(() => {
        monoSvg.style.transition = 'opacity 0.6s';
        monoSvg.style.opacity = '';
      }, 100);
    }
  }

  if (wrap) {
    wrap.addEventListener('click', () => {
      if (audioActive) randomizePatch();
    });
  }

  // ── Breathe button toggle ──

  if (breatheBtn) {
    breatheBtn.addEventListener('click', () => {
      if (!audioActive) {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
          audioActive = true;
          updateMoodScale(true);
          applyAmbientSettings(audioCtx.currentTime, 0.4);
          if (harmonyTimer) clearTimeout(harmonyTimer);
          scheduleHarmony();
          scheduleNext();
          if (crackleTimer) clearTimeout(crackleTimer);
          scheduleCrackle();
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
    drawParticles();  // renders on bg-canvas — particles spread across full viewport
    updateAudioParams();
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
})();
