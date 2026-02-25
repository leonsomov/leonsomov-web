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
  let mouseOverrideKnob = {}; // tracks which knobs are being dragged (overrides mouse mapping)

  window.addEventListener('mousemove', (e) => {
    input.x = (e.clientX / window.innerWidth - 0.5) * 2;
    input.y = (e.clientY / window.innerHeight - 0.5) * 2;
    // Clear knob overrides when mouse moves (user is moving mouse again)
    mouseOverrideKnob = {};
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

  // ── Knob System ──

  const knobDefs = [
    { id: 'cutoff',   label: 'CUTOFF',   min: 200,  max: 3500, value: 1200, exp: true },
    { id: 'reverb',   label: 'REVERB',   min: 0.15, max: 0.75, value: 0.4,  exp: false },
    { id: 'delay',    label: 'DELAY',    min: 0.3,  max: 1.2,  value: 0.5,  exp: false },
    { id: 'volume',   label: 'VOLUME',   min: 0,    max: 1,    value: 0.8,  exp: false },
    { id: 'attack',   label: 'ATTACK',   min: 0.3,  max: 5,    value: 1.5,  exp: false },
    { id: 'release',  label: 'RELEASE',  min: 1,    max: 8,    value: 3,    exp: false },
    { id: 'detune',   label: 'DETUNE',   min: 0,    max: 25,   value: 3,    exp: false },
    { id: 'feedback', label: 'FEEDBACK', min: 0,    max: 0.85, value: 0.4,  exp: false },
    { id: 'tempo',    label: 'TEMPO',    min: 0.5,  max: 12,   value: 2,    exp: false },
  ];

  const knobState = {};
  const knobElements = {};
  const synthPanel = document.querySelector('.synth-panel');

  // SVG arc helper
  function polarToCartesian(cx, cy, r, angleDeg) {
    const rad = (angleDeg - 90) * Math.PI / 180;
    return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
  }

  function describeArc(cx, cy, r, startAngle, endAngle) {
    const start = polarToCartesian(cx, cy, r, endAngle);
    const end = polarToCartesian(cx, cy, r, startAngle);
    const largeArc = endAngle - startAngle <= 180 ? '0' : '1';
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
  }

  // Arc spans 270° from -135° to +135° (7 o'clock to 5 o'clock)
  const ARC_START = -135;
  const ARC_END = 135;
  const ARC_RANGE = ARC_END - ARC_START; // 270

  function createKnobs() {
    if (!synthPanel) return;

    for (let ki = 0; ki < knobDefs.length; ki++) {
      const def = knobDefs[ki];
      knobState[def.id] = def.value;

      const size = 48;
      const cx = size / 2;
      const cy = size / 2;
      const r = 18;

      const container = document.createElement('div');
      container.className = 'knob';
      container.dataset.knobId = def.id;

      const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
      svg.setAttribute('width', size);
      svg.setAttribute('height', size);
      svg.setAttribute('viewBox', `0 0 ${size} ${size}`);

      // Background arc (full 270°)
      const bgArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      bgArc.setAttribute('d', describeArc(cx, cy, r, ARC_START, ARC_END));
      bgArc.setAttribute('fill', 'none');
      bgArc.setAttribute('stroke', 'rgba(255,255,255,0.15)');
      bgArc.setAttribute('stroke-width', '2');
      bgArc.setAttribute('stroke-linecap', 'round');

      // Value arc
      const valArc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      valArc.setAttribute('fill', 'none');
      valArc.setAttribute('stroke', 'var(--fg)');
      valArc.setAttribute('stroke-width', '2');
      valArc.setAttribute('stroke-linecap', 'round');

      // Dot indicator
      const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      dot.setAttribute('r', '3');
      dot.setAttribute('fill', 'var(--fg)');

      svg.appendChild(bgArc);
      svg.appendChild(valArc);
      svg.appendChild(dot);

      const label = document.createElement('div');
      label.className = 'knob-label';
      label.textContent = def.label;

      container.appendChild(svg);
      container.appendChild(label);
      synthPanel.appendChild(container);

      knobElements[def.id] = { svg, valArc, dot, container, def, cx, cy, r };

      updateKnobVisual(def.id);
    }
  }

  function getNorm(id) {
    const def = knobDefs.find(d => d.id === id);
    if (!def) return 0;
    if (def.exp) {
      // Exponential: value = min * (max/min)^norm
      return Math.log(knobState[id] / def.min) / Math.log(def.max / def.min);
    }
    return (knobState[id] - def.min) / (def.max - def.min);
  }

  function setFromNorm(id, norm) {
    norm = Math.max(0, Math.min(1, norm));
    const def = knobDefs.find(d => d.id === id);
    if (!def) return;
    if (def.exp) {
      knobState[id] = def.min * Math.pow(def.max / def.min, norm);
    } else {
      knobState[id] = def.min + norm * (def.max - def.min);
    }
  }

  function updateKnobVisual(id) {
    const el = knobElements[id];
    if (!el) return;

    const norm = getNorm(id);
    const angle = ARC_START + norm * ARC_RANGE;

    // Value arc: from ARC_START to current angle
    if (norm > 0.005) {
      el.valArc.setAttribute('d', describeArc(el.cx, el.cy, el.r, ARC_START, angle));
      el.valArc.style.display = '';
    } else {
      el.valArc.style.display = 'none';
    }

    // Dot position
    const dotPos = polarToCartesian(el.cx, el.cy, el.r, angle);
    el.dot.setAttribute('cx', dotPos.x);
    el.dot.setAttribute('cy', dotPos.y);
  }

  // ── Knob Drag Interaction ──

  let activeKnob = null;
  let dragStartY = 0;
  let dragStartNorm = 0;

  function onDragStart(e) {
    const knobEl = e.target.closest('.knob');
    if (!knobEl) return;
    const id = knobEl.dataset.knobId;
    if (!id) return;

    activeKnob = id;
    mouseOverrideKnob[id] = true;
    dragStartY = e.clientY ?? e.touches[0].clientY;
    dragStartNorm = getNorm(id);

    e.preventDefault();
  }

  function onDragMove(e) {
    if (!activeKnob) return;
    const clientY = e.clientY ?? (e.touches && e.touches[0] ? e.touches[0].clientY : null);
    if (clientY === null) return;

    const dy = dragStartY - clientY; // up = increase
    const sensitivity = 200; // pixels for full range
    const newNorm = dragStartNorm + dy / sensitivity;
    setFromNorm(activeKnob, newNorm);
    updateKnobVisual(activeKnob);
    syncKnobToAudio(activeKnob, knobState[activeKnob]);
  }

  function onDragEnd() {
    activeKnob = null;
  }

  if (synthPanel) {
    synthPanel.addEventListener('mousedown', onDragStart);
    synthPanel.addEventListener('touchstart', onDragStart, { passive: false });
  }
  window.addEventListener('mousemove', onDragMove);
  window.addEventListener('touchmove', onDragMove, { passive: false });
  window.addEventListener('mouseup', onDragEnd);
  window.addEventListener('touchend', onDragEnd);

  // ── Sync knobs ↔ audio ──

  function syncKnobToAudio(id, value) {
    if (!audioCtx || !audioActive) return;
    const now = audioCtx.currentTime;

    switch (id) {
      case 'cutoff':
        filter.frequency.setTargetAtTime(value, now, 0.1);
        break;
      case 'reverb':
        reverb.wetGain.gain.setTargetAtTime(value, now, 0.1);
        reverb.dryGain.gain.setTargetAtTime(1 - value, now, 0.1);
        break;
      case 'delay':
        delay.delayTime.setTargetAtTime(value, now, 0.1);
        break;
      case 'volume':
        masterGain.gain.setTargetAtTime(value, now, 0.1);
        break;
      case 'detune':
        // Applied on next note, no live param to set
        break;
      case 'feedback':
        delayFeedback.gain.setTargetAtTime(value, now, 0.1);
        break;
      // attack, release, tempo — affect note scheduling, not live params
    }
  }

  // Update knob visuals from mouse/scroll-driven audio params (per-frame)
  function syncAudioToKnobs() {
    if (!audioActive || !audioCtx) return;

    // Mouse → cutoff + reverb (unless knob is being dragged)
    if (!mouseOverrideKnob.cutoff && !activeKnob) {
      const normX = (smoothed.x + 1) / 2;
      knobState.cutoff = 200 * Math.pow(3500 / 200, normX);
      updateKnobVisual('cutoff');
    }

    if (!mouseOverrideKnob.reverb && !activeKnob) {
      const normY = (smoothed.y + 1) / 2;
      knobState.reverb = 0.15 + normY * 0.6;
      updateKnobVisual('reverb');
    }

    // Scroll → delay
    if (!mouseOverrideKnob.delay && activeKnob !== 'delay') {
      knobState.delay = 0.3 + scrollParam * 0.9;
      updateKnobVisual('delay');
    }
  }

  createKnobs();

  // ── Generative Ambient Synth ──

  const breatheBtn = document.querySelector('.breathe-btn');
  let audioCtx = null;
  let audioActive = false;
  let masterGain = null;
  let filter = null;
  let delay = null;
  let delayFeedback = null;
  let reverb = null;
  let voices = [];
  let sequenceTimer = null;
  let scrollParam = 0.3; // 0–1 maps to delay time 0.3–1.2s

  // D major pentatonic across 3 octaves with frequencies
  const notes = [
    146.83, // D3
    164.81, // E3
    185.00, // F#3
    220.00, // A3
    246.94, // B3
    293.66, // D4
    329.63, // E4
    369.99, // F#4
    440.00, // A4
    493.88, // B4
    587.33, // D5
    659.25, // E5
  ];

  // Weighted random — favor middle octave (indices 5–9)
  const weights = [1, 1, 1, 1, 1, 3, 3, 3, 3, 3, 1, 1];
  const weightSum = weights.reduce((a, b) => a + b, 0);

  function pickNote() {
    let r = Math.random() * weightSum;
    for (let i = 0; i < notes.length; i++) {
      r -= weights[i];
      if (r <= 0) return notes[i];
    }
    return notes[5];
  }

  function buildReverb(ac) {
    const input = ac.createGain();
    const output = ac.createGain();
    const wetGain = ac.createGain();
    const dryGain = ac.createGain();

    wetGain.gain.value = 0.4;
    dryGain.gain.value = 0.6;

    // Dry path
    input.connect(dryGain).connect(output);

    // 4 parallel comb filters
    const combTimes = [0.0297, 0.0371, 0.0411, 0.0437];
    const combMerge = ac.createGain();
    combMerge.gain.value = 0.25;

    for (const t of combTimes) {
      const combDelay = ac.createDelay(0.1);
      combDelay.delayTime.value = t;
      const combFb = ac.createGain();
      combFb.gain.value = 0.84;

      input.connect(combDelay);
      combDelay.connect(combFb);
      combFb.connect(combDelay); // feedback loop
      combDelay.connect(combMerge);
    }

    // 2 series allpass filters
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
    ap1Fb.connect(ap1Delay); // feedback
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
    ap2Fb.connect(ap2Delay); // feedback
    ap2Delay.connect(ap2Merge);
    ap2Ff.connect(ap2Merge);

    ap2Merge.connect(wetGain).connect(output);

    return { input, output, wetGain, dryGain };
  }

  function playNote(freq) {
    if (!audioCtx || !audioActive) return;

    // Spike audio energy for reactive waveforms
    audioEnergy = 1;

    const now = audioCtx.currentTime;
    const attackMin = knobState.attack;
    const releaseMin = knobState.release;
    const attack = attackMin + Math.random() * (attackMin * 0.5);
    const release = releaseMin + Math.random() * (releaseMin * 0.4);
    const detuneVal = knobState.detune;

    // Per-voice envelope
    const env = audioCtx.createGain();
    env.gain.setValueAtTime(0, now);
    env.gain.linearRampToValueAtTime(0.12, now + attack);
    env.gain.setValueAtTime(0.12, now + attack);
    env.gain.linearRampToValueAtTime(0, now + attack + release);

    // Sine oscillator
    const osc1 = audioCtx.createOscillator();
    osc1.type = 'sine';
    osc1.frequency.value = freq;
    osc1.detune.value = detuneVal;

    // Triangle oscillator
    const osc2 = audioCtx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq;
    osc2.detune.value = -detuneVal;

    osc1.connect(env);
    osc2.connect(env);
    env.connect(filter);

    const stopTime = now + attack + release + 0.1;
    osc1.start(now);
    osc2.start(now);
    osc1.stop(stopTime);
    osc2.stop(stopTime);

    const voice = { osc1, osc2, env, stopTime };
    voices.push(voice);

    // Steal oldest if > 5 voices
    while (voices.length > 5) {
      const old = voices.shift();
      try {
        old.env.gain.cancelScheduledValues(audioCtx.currentTime);
        old.env.gain.setValueAtTime(old.env.gain.value, audioCtx.currentTime);
        old.env.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.5);
        old.osc1.stop(audioCtx.currentTime + 0.6);
        old.osc2.stop(audioCtx.currentTime + 0.6);
      } catch (e) { /* already stopped */ }
    }

    // Clean up finished voices
    osc1.onended = () => {
      const idx = voices.indexOf(voice);
      if (idx !== -1) voices.splice(idx, 1);
    };
  }

  function scheduleNext() {
    if (!audioActive) return;
    playNote(pickNote());
    const tempoMin = knobState.tempo * 1000;
    const nextDelay = tempoMin + Math.random() * tempoMin * 2.5;
    sequenceTimer = setTimeout(scheduleNext, nextDelay);
  }

  function initAudio() {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();

    // Master gain
    masterGain = audioCtx.createGain();
    masterGain.gain.value = knobState.volume;
    masterGain.connect(audioCtx.destination);

    // Reverb
    reverb = buildReverb(audioCtx);
    reverb.output.connect(masterGain);

    // Set reverb from knob
    reverb.wetGain.gain.value = knobState.reverb;
    reverb.dryGain.gain.value = 1 - knobState.reverb;

    // Delay
    delay = audioCtx.createDelay(2.0);
    delay.delayTime.value = knobState.delay;
    delayFeedback = audioCtx.createGain();
    delayFeedback.gain.value = knobState.feedback;

    delay.connect(delayFeedback);
    delayFeedback.connect(delay);
    delay.connect(reverb.input);

    // Filter
    filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = knobState.cutoff;
    filter.Q.value = 1;

    filter.connect(reverb.input); // dry signal to reverb
    filter.connect(delay); // wet signal through delay

    audioActive = true;
    scheduleNext();
  }

  function updateAudioParams() {
    if (!audioActive || !audioCtx) return;

    const now = audioCtx.currentTime;

    // Mouse/gyro → cutoff + reverb (only if not overridden by knob drag)
    if (!mouseOverrideKnob.cutoff) {
      const normX = (smoothed.x + 1) / 2;
      const cutoff = 200 * Math.pow(3500 / 200, normX);
      filter.frequency.setTargetAtTime(cutoff, now, 0.1);
    }

    if (!mouseOverrideKnob.reverb) {
      const normY = (smoothed.y + 1) / 2;
      const wet = 0.15 + normY * 0.6;
      reverb.wetGain.gain.setTargetAtTime(wet, now, 0.1);
      reverb.dryGain.gain.setTargetAtTime(1 - wet, now, 0.1);
    }

    // Scroll → delay time
    if (!mouseOverrideKnob.delay) {
      const delayTime = 0.3 + scrollParam * 0.9;
      delay.delayTime.setTargetAtTime(delayTime, now, 0.1);
    }

    // Sync knob visuals from audio state
    syncAudioToKnobs();
  }

  // Scroll handler for delay time
  window.addEventListener('wheel', (e) => {
    if (!audioActive) return;
    scrollParam = Math.max(0, Math.min(1, scrollParam + e.deltaY * 0.001));
  }, { passive: true });

  function stopAudio() {
    audioActive = false;
    audioEnergy = 0;
    if (sequenceTimer) {
      clearTimeout(sequenceTimer);
      sequenceTimer = null;
    }
    if (masterGain && audioCtx) {
      const now = audioCtx.currentTime;
      masterGain.gain.setTargetAtTime(0, now, 0.5);
      setTimeout(() => {
        if (audioCtx) {
          audioCtx.suspend();
        }
      }, 2000);
    }
  }

  // ── Patch Randomizer (monogram click) ──

  function randomizePatch() {
    if (!audioActive || !audioCtx) return;

    const now = audioCtx.currentTime;
    const rampTime = 0.3; // setTargetAtTime time constant → ~1s to reach new value

    for (const def of knobDefs) {
      const newNorm = Math.random();
      setFromNorm(def.id, newNorm);
      updateKnobVisual(def.id);

      // Ramp audio params smoothly
      const val = knobState[def.id];
      switch (def.id) {
        case 'cutoff':
          filter.frequency.setTargetAtTime(val, now, rampTime);
          break;
        case 'reverb':
          reverb.wetGain.gain.setTargetAtTime(val, now, rampTime);
          reverb.dryGain.gain.setTargetAtTime(1 - val, now, rampTime);
          break;
        case 'delay':
          delay.delayTime.setTargetAtTime(val, now, rampTime);
          break;
        case 'volume':
          masterGain.gain.setTargetAtTime(val, now, rampTime);
          break;
        case 'feedback':
          delayFeedback.gain.setTargetAtTime(val, now, rampTime);
          break;
      }
    }

    // Update scrollParam to match new delay knob
    scrollParam = (knobState.delay - 0.3) / 0.9;

    // Flash monogram
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
      if (audioActive) {
        randomizePatch();
      }
    });
  }

  // ── Breathe button toggle ──

  if (breatheBtn) {
    breatheBtn.addEventListener('click', () => {
      if (!audioActive) {
        if (audioCtx && audioCtx.state === 'suspended') {
          audioCtx.resume();
          masterGain.gain.setTargetAtTime(knobState.volume, audioCtx.currentTime, 0.5);
          audioActive = true;
          scheduleNext();
        } else {
          initAudio();
        }
        breatheBtn.classList.add('active');
        breatheBtn.textContent = 'exhale';

        // Show synth panel
        if (synthPanel) synthPanel.classList.add('visible');

        // iOS gyro permission on user gesture
        if (typeof DeviceOrientationEvent !== 'undefined' &&
            typeof DeviceOrientationEvent.requestPermission === 'function') {
          DeviceOrientationEvent.requestPermission().then((state) => {
            if (state === 'granted') {
              window.addEventListener('deviceorientation', handleOrientation);
            }
          }).catch(() => {});
        }
      } else {
        stopAudio();
        breatheBtn.classList.remove('active');
        breatheBtn.textContent = 'breathe';

        // Hide synth panel
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
