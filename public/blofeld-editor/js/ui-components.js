// Reusable UI components — knobs, sliders, dropdowns, toggles
// SVG-based knobs with drag interaction

// ── SVG Knob ─────────────────────────────────────────────────────────

const KNOB_RADIUS = 18;
const KNOB_CENTER = 24;
const ARC_START = 135;    // degrees from top
const ARC_END = 405;      // degrees from top (= 135 + 270)
const ARC_RANGE = 270;    // total sweep

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg - 90) * Math.PI / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, endAngle);
  const end = polarToCartesian(cx, cy, r, startAngle);
  const largeArc = endAngle - startAngle > 180 ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

export function createKnob(param, value, onChange) {
  const el = document.createElement('div');
  el.className = 'control';
  el.dataset.paramIndex = param.index;

  const label = document.createElement('div');
  label.className = 'control-label';
  label.textContent = param.name;

  const container = document.createElement('div');
  container.className = 'knob-container';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 48 48');

  // Background track
  const track = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  track.setAttribute('class', 'knob-track');
  track.setAttribute('d', describeArc(KNOB_CENTER, KNOB_CENTER, KNOB_RADIUS, ARC_START, ARC_END));

  // Knob body
  const body = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  body.setAttribute('class', 'knob-body');
  body.setAttribute('cx', KNOB_CENTER);
  body.setAttribute('cy', KNOB_CENTER);
  body.setAttribute('r', 14);

  // Value arc
  const arc = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  arc.setAttribute('class', 'knob-arc');

  // Indicator dot
  const dot = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  dot.setAttribute('class', 'knob-dot');
  dot.setAttribute('r', 2);

  svg.append(track, arc, dot);
  container.appendChild(svg);

  const valueDisplay = document.createElement('div');
  valueDisplay.className = 'control-value';

  el.append(label, container, valueDisplay);

  // State
  let currentValue = value;

  function updateVisual(val) {
    currentValue = val;
    const range = param.max - param.min;
    const norm = range > 0 ? (val - param.min) / range : 0;
    const angle = ARC_START + norm * ARC_RANGE;

    // Update arc
    if (norm > 0.001) {
      arc.setAttribute('d', describeArc(KNOB_CENTER, KNOB_CENTER, KNOB_RADIUS, ARC_START, angle));
    } else {
      arc.setAttribute('d', '');
    }

    // Update dot position
    const pos = polarToCartesian(KNOB_CENTER, KNOB_CENTER, 10, angle);
    dot.setAttribute('cx', pos.x);
    dot.setAttribute('cy', pos.y);

    // Update value display
    const displayVal = param.fmt ? param.fmt(val) : val;
    valueDisplay.textContent = displayVal;
  }

  updateVisual(value);

  // Drag interaction
  let dragging = false;
  let startY, startValue;

  container.addEventListener('mousedown', (e) => {
    dragging = true;
    startY = e.clientY;
    startValue = currentValue;
    document.body.style.cursor = 'ns-resize';
    e.preventDefault();
  });

  document.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const dy = startY - e.clientY;
    const sensitivity = e.shiftKey ? 0.2 : 1;
    const range = param.max - param.min;
    const step = param.step || 1;
    let newVal = startValue + Math.round(dy * sensitivity * range / 200 / step) * step;
    newVal = Math.max(param.min, Math.min(param.max, newVal));
    if (newVal !== currentValue) {
      updateVisual(newVal);
      onChange(param.index, newVal);
    }
  });

  document.addEventListener('mouseup', () => {
    if (dragging) {
      dragging = false;
      document.body.style.cursor = '';
    }
  });

  // Double-click to reset
  container.addEventListener('dblclick', () => {
    const defaultVal = param.step ? param.min + Math.round((param.max - param.min) / 2 / param.step) * param.step : Math.round((param.min + param.max) / 2);
    updateVisual(defaultVal);
    onChange(param.index, defaultVal);
  });

  // Scroll wheel
  container.addEventListener('wheel', (e) => {
    e.preventDefault();
    const step = param.step || 1;
    const dir = e.deltaY < 0 ? step : -step;
    const newVal = Math.max(param.min, Math.min(param.max, currentValue + dir));
    if (newVal !== currentValue) {
      updateVisual(newVal);
      onChange(param.index, newVal);
    }
  }, { passive: false });

  el.setValue = updateVisual;
  el.getValue = () => currentValue;
  return el;
}

// ── Dropdown ─────────────────────────────────────────────────────────

export function createDropdown(param, value, onChange) {
  const el = document.createElement('div');
  el.className = 'control control-dropdown';
  el.dataset.paramIndex = param.index;

  const label = document.createElement('div');
  label.className = 'control-label';
  label.textContent = param.name;

  const select = document.createElement('select');
  const values = param.values || [];
  for (let i = 0; i <= param.max - param.min; i++) {
    const opt = document.createElement('option');
    opt.value = param.min + i;
    opt.textContent = values[i] || (param.min + i);
    select.appendChild(opt);
  }
  select.value = value;

  select.addEventListener('change', () => {
    onChange(param.index, parseInt(select.value));
  });

  el.append(label, select);

  el.setValue = (val) => { select.value = val; };
  el.getValue = () => parseInt(select.value);
  return el;
}

// ── Toggle ───────────────────────────────────────────────────────────

export function createToggle(param, value, onChange) {
  const el = document.createElement('div');
  el.className = 'control';
  el.dataset.paramIndex = param.index;

  const label = document.createElement('div');
  label.className = 'control-label';
  label.textContent = param.name;

  const btn = document.createElement('div');
  btn.className = 'toggle-btn' + (value ? ' on' : '');
  let currentValue = value;

  btn.addEventListener('click', () => {
    currentValue = currentValue ? 0 : 1;
    btn.classList.toggle('on', !!currentValue);
    onChange(param.index, currentValue);
  });

  el.append(label, btn);

  el.setValue = (val) => {
    currentValue = val;
    btn.classList.toggle('on', !!val);
  };
  el.getValue = () => currentValue;
  return el;
}

// ── Envelope Display ─────────────────────────────────────────────────

export function createEnvelopeDisplay(envData) {
  // envData: { attack, attackLevel, decay, sustain, decay2, sustain2, release }
  const el = document.createElement('div');
  el.className = 'env-display';

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('viewBox', '0 0 300 100');
  svg.setAttribute('preserveAspectRatio', 'none');

  const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  path.setAttribute('class', 'env-line');

  const fillPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  fillPath.setAttribute('class', 'env-fill');

  svg.append(fillPath, path);
  el.appendChild(svg);

  function update(data) {
    const w = 300, h = 100;
    const pad = 5;
    const usableW = w - pad * 2;
    const usableH = h - pad * 2;

    // Normalize values (0-127 -> 0-1)
    const a = (data.attack || 0) / 127;
    const al = (data.attackLevel ?? 127) / 127;
    const d = (data.decay || 0) / 127;
    const s = (data.sustain || 0) / 127;
    const d2 = (data.decay2 || 0) / 127;
    const s2 = (data.sustain2 || 0) / 127;
    const r = (data.release || 0) / 127;

    // Calculate x positions (proportional)
    const totalTime = a + d + d2 + r + 0.3; // 0.3 for sustain hold
    const scale = usableW / totalTime;

    const x0 = pad;
    const x1 = x0 + a * scale;        // end of attack
    const x2 = x1 + d * scale;        // end of decay 1
    const x3 = x2 + 0.3 * scale;      // sustain hold
    const x4 = x3 + d2 * scale;       // end of decay 2 (if ADS1DS2R)
    const x5 = x4 + r * scale;        // end of release

    const y0 = pad + usableH;          // bottom
    const y1 = pad + usableH * (1 - al); // attack level
    const y2 = pad + usableH * (1 - s);  // sustain 1
    const y3 = pad + usableH * (1 - s2); // sustain 2
    const y4 = y0;                       // zero

    const d_str = `M ${x0} ${y0} L ${x1} ${y1} L ${x2} ${y2} L ${x3} ${y2} L ${x4} ${y3} L ${x5} ${y4}`;
    path.setAttribute('d', d_str);
    fillPath.setAttribute('d', d_str + ` L ${x5} ${y0} Z`);
  }

  update(envData);
  el.update = update;
  return el;
}

// ── Create control from param definition ─────────────────────────────

export function createControl(param, value, onChange) {
  switch (param.type) {
    case 'knob':     return createKnob(param, value, onChange);
    case 'dropdown': return createDropdown(param, value, onChange);
    case 'toggle':   return createToggle(param, value, onChange);
    default:         return createKnob(param, value, onChange);
  }
}

// ── Toast Notification ───────────────────────────────────────────────

let toastContainer;

export function toast(message, type = 'info', duration = 3000) {
  if (!toastContainer) {
    toastContainer = document.createElement('div');
    toastContainer.className = 'toast-container';
    document.body.appendChild(toastContainer);
  }

  const el = document.createElement('div');
  el.className = `toast ${type}`;
  el.textContent = message;
  toastContainer.appendChild(el);

  setTimeout(() => {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s';
    setTimeout(() => el.remove(), 300);
  }, duration);
}
