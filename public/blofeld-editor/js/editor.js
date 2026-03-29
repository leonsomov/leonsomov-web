// Blofeld Editor — State management + panel rendering
import { PARAMS, FX_PARAM_NAMES, MOD_SOURCES, MOD_DESTINATIONS,
         createInitSound, decodePatchName, encodePatchName, decodeArpStep, ARP_STEP_TYPES } from './blofeld-params.js';
import { createControl, createEnvelopeDisplay, createKnob, toast } from './ui-components.js';
import { encodeSoundToEditBuffer, parameterChange } from './sysex.js';

export class Editor {
  constructor(midi) {
    this.midi = midi;
    this.sdata = createInitSound();
    this.controls = {};        // paramIndex -> control element
    this.envDisplays = {};     // envKey -> envelope display element
    this.currentTab = 'osc';
    this.dirty = false;
    this.undoStack = [];
    this.redoStack = [];
  }

  // ── State ──────────────────────────────────────────────────────────

  getValue(index) {
    return this.sdata[index];
  }

  setValue(index, value, sendMidi = true) {
    const old = this.sdata[index];
    if (old === value) return;

    this.undoStack.push({ index, oldValue: old, newValue: value });
    this.redoStack = [];
    this.sdata[index] = value;
    this.dirty = true;

    // Update UI
    const ctrl = this.controls[index];
    if (ctrl) ctrl.setValue(value);

    // Update envelope displays if this param belongs to an envelope
    this._updateEnvDisplay(index);

    // Update FX param names if FX type changed
    if (index === 128) this._updateFxParamNames('fx1', value);
    if (index === 144) this._updateFxParamNames('fx2', value);

    // Send to hardware (throttled to avoid MIDI bus overflow)
    if (sendMidi && this.midi?.isConnected) {
      const msg = parameterChange(this.midi.deviceId, 0x00, index, value);
      this.midi.sendThrottled(msg, index);
    }
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const action = this.undoStack.pop();
    this.redoStack.push(action);
    this.sdata[action.index] = action.oldValue;
    const ctrl = this.controls[action.index];
    if (ctrl) ctrl.setValue(action.oldValue);
    this._updateEnvDisplay(action.index);
    if (this.midi?.isConnected) {
      this.midi.send(parameterChange(this.midi.deviceId, 0x00, action.index, action.oldValue));
    }
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const action = this.redoStack.pop();
    this.undoStack.push(action);
    this.sdata[action.index] = action.newValue;
    const ctrl = this.controls[action.index];
    if (ctrl) ctrl.setValue(action.newValue);
    this._updateEnvDisplay(action.index);
    if (this.midi?.isConnected) {
      this.midi.send(parameterChange(this.midi.deviceId, 0x00, action.index, action.newValue));
    }
  }

  loadSound(sdata) {
    this.sdata = new Uint8Array(sdata);
    this.dirty = false;
    this.undoStack = [];
    this.redoStack = [];
    // Update all controls
    for (const [idx, ctrl] of Object.entries(this.controls)) {
      ctrl.setValue(this.sdata[idx]);
    }
    // Update envelope displays
    for (const key of Object.keys(this.envDisplays)) {
      this._updateEnvDisplayByKey(key);
    }
    // Update patch name input
    const nameInput = document.getElementById('patch-name');
    if (nameInput) nameInput.value = decodePatchName(this.sdata);
    // Update FX param names
    this._updateFxParamNames('fx1', this.sdata[128]);
    this._updateFxParamNames('fx2', this.sdata[144]);
  }

  sendToEditBuffer() {
    if (!this.midi?.isConnected) {
      toast('NOT CONNECTED — sound not sent to Blofeld', 'error', 3000);
      return;
    }
    const msg = encodeSoundToEditBuffer(this.midi.deviceId, this.sdata);
    this.midi.send(msg);
    toast(`Sent ${msg.length} bytes — Poly:${this.sdata[58]===0?'YES':'NO'} KT:${this.sdata[5]}`, 'success', 2000);
  }

  // ── Rendering ──────────────────────────────────────────────────────

  render(container) {
    container.innerHTML = '';
    this.controls = {};
    this.envDisplays = {};

    // Tab bar
    const tabBar = document.createElement('div');
    tabBar.id = 'tab-bar';
    const tabs = [
      { id: 'osc',    label: 'Oscillators' },
      { id: 'filter', label: 'Filters' },
      { id: 'amp',    label: 'Amp' },
      { id: 'env',    label: 'Envelopes' },
      { id: 'lfo',    label: 'LFOs' },
      { id: 'mod',    label: 'Mod Matrix' },
      { id: 'fx',     label: 'Effects' },
      { id: 'arp',    label: 'Arpeggiator' },
      { id: 'wt',     label: 'Wavetables' },
      { id: 'gen',    label: 'Generator' },
      { id: 'lib',    label: 'Library' },
    ];
    for (const tab of tabs) {
      const t = document.createElement('div');
      t.className = 'tab' + (tab.id === this.currentTab ? ' active' : '');
      t.textContent = tab.label;
      t.addEventListener('click', () => this.switchTab(tab.id));
      tabBar.appendChild(t);
    }
    container.appendChild(tabBar);

    // Editor area
    const editor = document.createElement('div');
    editor.id = 'editor';
    container.appendChild(editor);

    // Build all panels
    this._renderOscPanel(editor);
    this._renderFilterPanel(editor);
    this._renderAmpPanel(editor);
    this._renderEnvPanel(editor);
    this._renderLfoPanel(editor);
    this._renderModPanel(editor);
    this._renderFxPanel(editor);
    this._renderArpPanel(editor);

    this.switchTab(this.currentTab);
  }

  switchTab(tabId) {
    this.currentTab = tabId;
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));

    const activeTab = document.querySelector(`.tab:nth-child(${
      ['osc', 'filter', 'amp', 'env', 'lfo', 'mod', 'fx', 'arp', 'wt', 'gen', 'lib'].indexOf(tabId) + 1
    })`);
    if (activeTab) activeTab.classList.add('active');

    const panel = document.getElementById(`panel-${tabId}`);
    if (panel) panel.classList.add('active');
  }

  _createSection(title, sectionKey) {
    const section = document.createElement('div');
    section.className = 'section';

    const titleEl = document.createElement('div');
    titleEl.className = 'section-title';
    titleEl.textContent = title;

    const body = document.createElement('div');
    body.className = 'section-body';

    const paramDef = PARAMS[sectionKey];
    if (paramDef && paramDef.params) {
      for (const param of paramDef.params) {
        if (param.type === 'bitfield') continue; // handle separately
        const ctrl = createControl(param, this.sdata[param.index], (idx, val) => this.setValue(idx, val));
        this.controls[param.index] = ctrl;
        body.appendChild(ctrl);
      }
    }

    section.append(titleEl, body);
    return section;
  }

  // ── Oscillators Panel ──────────────────────────────────────────────

  _renderOscPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-osc';
    panel.className = 'panel';

    const cols = document.createElement('div');
    cols.className = 'columns-3';

    cols.appendChild(this._createSection('Oscillator 1', 'osc1'));
    cols.appendChild(this._createSection('Oscillator 2', 'osc2'));
    cols.appendChild(this._createSection('Oscillator 3', 'osc3'));
    panel.appendChild(cols);

    const cols2 = document.createElement('div');
    cols2.className = 'columns-2';
    cols2.appendChild(this._createSection('Osc Common', 'oscCommon'));
    cols2.appendChild(this._createSection('Mixer', 'mixer'));
    panel.appendChild(cols2);

    parent.appendChild(panel);
  }

  // ── Filters Panel ─────────────────────────────────────────────────

  _renderFilterPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-filter';
    panel.className = 'panel';

    const cols = document.createElement('div');
    cols.className = 'columns-2';
    cols.appendChild(this._createSection('Filter 1', 'filter1'));
    cols.appendChild(this._createSection('Filter 2', 'filter2'));
    panel.appendChild(cols);

    panel.appendChild(this._createSection('Filter Routing', 'filterRouting'));
    parent.appendChild(panel);
  }

  // ── Amplifier Panel ───────────────────────────────────────────────

  _renderAmpPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-amp';
    panel.className = 'panel';
    panel.appendChild(this._createSection('Amplifier', 'amplifier'));
    parent.appendChild(panel);
  }

  // ── Envelopes Panel ───────────────────────────────────────────────

  _renderEnvPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-env';
    panel.className = 'panel';

    const envSections = [
      { key: 'envFilter', label: 'Filter Envelope', aIdx: 199 },
      { key: 'envAmp',    label: 'Amp Envelope',    aIdx: 211 },
      { key: 'env3',      label: 'Envelope 3',      aIdx: 223 },
      { key: 'env4',      label: 'Envelope 4',      aIdx: 235 },
    ];

    const cols = document.createElement('div');
    cols.className = 'columns-2';

    for (const env of envSections) {
      const section = document.createElement('div');
      section.className = 'section';

      const title = document.createElement('div');
      title.className = 'section-title';
      title.textContent = env.label;

      // Envelope display
      const display = createEnvelopeDisplay(this._getEnvData(env.aIdx));
      this.envDisplays[env.key] = { display, baseIndex: env.aIdx };

      const body = document.createElement('div');
      body.className = 'section-body';

      const paramDef = PARAMS[env.key];
      for (const param of paramDef.params) {
        const ctrl = createControl(param, this.sdata[param.index], (idx, val) => this.setValue(idx, val));
        this.controls[param.index] = ctrl;
        body.appendChild(ctrl);
      }

      section.append(title, display, body);
      cols.appendChild(section);
    }

    panel.appendChild(cols);
    parent.appendChild(panel);
  }

  _getEnvData(baseIdx) {
    return {
      attack: this.sdata[baseIdx],
      attackLevel: this.sdata[baseIdx + 1],
      decay: this.sdata[baseIdx + 2],
      sustain: this.sdata[baseIdx + 3],
      decay2: this.sdata[baseIdx + 4],
      sustain2: this.sdata[baseIdx + 5],
      release: this.sdata[baseIdx + 6],
    };
  }

  _updateEnvDisplay(index) {
    for (const [key, { display, baseIndex }] of Object.entries(this.envDisplays)) {
      if (index >= baseIndex && index < baseIndex + 7) {
        display.update(this._getEnvData(baseIndex));
      }
    }
  }

  _updateEnvDisplayByKey(key) {
    const info = this.envDisplays[key];
    if (info) info.display.update(this._getEnvData(info.baseIndex));
  }

  // ── LFOs Panel ────────────────────────────────────────────────────

  _renderLfoPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-lfo';
    panel.className = 'panel';

    const cols = document.createElement('div');
    cols.className = 'columns-3';
    cols.appendChild(this._createSection('LFO 1', 'lfo1'));
    cols.appendChild(this._createSection('LFO 2', 'lfo2'));
    cols.appendChild(this._createSection('LFO 3', 'lfo3'));
    panel.appendChild(cols);

    parent.appendChild(panel);
  }

  // ── Mod Matrix Panel ──────────────────────────────────────────────

  _renderModPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-mod';
    panel.className = 'panel';

    // Modifiers section
    panel.appendChild(this._createSection('Modifiers', 'modifiers'));

    // Mod Matrix
    const section = document.createElement('div');
    section.className = 'section';

    const title = document.createElement('div');
    title.className = 'section-title';
    title.textContent = 'Modulation Matrix';

    const grid = document.createElement('div');
    grid.className = 'mod-matrix-grid';

    // Header
    for (const h of ['#', 'Source', 'Destination', 'Amount']) {
      const hd = document.createElement('div');
      hd.style.fontSize = '10px';
      hd.style.color = 'var(--text-dim)';
      hd.style.textTransform = 'uppercase';
      hd.textContent = h;
      grid.appendChild(hd);
    }

    for (let i = 0; i < 16; i++) {
      const baseIdx = 261 + i * 3;

      // Slot number
      const num = document.createElement('div');
      num.className = 'slot-num';
      num.textContent = i + 1;
      grid.appendChild(num);

      // Source dropdown
      const srcSelect = document.createElement('select');
      for (let j = 0; j < MOD_SOURCES.length; j++) {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = MOD_SOURCES[j];
        srcSelect.appendChild(opt);
      }
      srcSelect.value = this.sdata[baseIdx];
      srcSelect.addEventListener('change', () => this.setValue(baseIdx, parseInt(srcSelect.value)));
      this.controls[baseIdx] = { setValue: v => srcSelect.value = v, getValue: () => parseInt(srcSelect.value) };
      grid.appendChild(srcSelect);

      // Destination dropdown
      const dstSelect = document.createElement('select');
      for (let j = 0; j < MOD_DESTINATIONS.length; j++) {
        const opt = document.createElement('option');
        opt.value = j;
        opt.textContent = MOD_DESTINATIONS[j];
        dstSelect.appendChild(opt);
      }
      dstSelect.value = this.sdata[baseIdx + 1];
      dstSelect.addEventListener('change', () => this.setValue(baseIdx + 1, parseInt(dstSelect.value)));
      this.controls[baseIdx + 1] = { setValue: v => dstSelect.value = v, getValue: () => parseInt(dstSelect.value) };
      grid.appendChild(dstSelect);

      // Amount knob (small inline)
      const amtContainer = document.createElement('div');
      amtContainer.className = 'amount-container';
      const amtParam = { index: baseIdx + 2, name: '', min: 0, max: 127, type: 'knob', fmt: v => v - 64 };
      const amtCtrl = createKnob(amtParam, this.sdata[baseIdx + 2], (idx, val) => this.setValue(idx, val));
      this.controls[baseIdx + 2] = amtCtrl;
      amtContainer.appendChild(amtCtrl);
      grid.appendChild(amtContainer);
    }

    section.append(title, grid);
    panel.appendChild(section);
    parent.appendChild(panel);
  }

  // ── Effects Panel ─────────────────────────────────────────────────

  _renderFxPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-fx';
    panel.className = 'panel';

    const cols = document.createElement('div');
    cols.className = 'columns-2';
    cols.appendChild(this._createFxSection('Effect 1', 'fx1'));
    cols.appendChild(this._createFxSection('Effect 2', 'fx2'));
    panel.appendChild(cols);

    parent.appendChild(panel);
  }

  _createFxSection(title, sectionKey) {
    const section = this._createSection(title, sectionKey);
    // Apply FX-specific param names
    const typeIdx = sectionKey === 'fx1' ? 128 : 144;
    this._updateFxParamNames(sectionKey, this.sdata[typeIdx]);
    return section;
  }

  _updateFxParamNames(sectionKey, fxType) {
    const baseIdx = sectionKey === 'fx1' ? 130 : 146;
    const names = FX_PARAM_NAMES[fxType] || {};

    for (let i = 0; i < 14; i++) {
      const ctrl = this.controls[baseIdx + i];
      if (ctrl) {
        const label = ctrl.querySelector?.('.control-label');
        if (label) {
          const paramName = names[i];
          label.textContent = paramName || `Param ${i + 1}`;
          ctrl.style.display = paramName || i < 2 ? '' : 'none';
        }
      }
    }
  }

  // ── Arpeggiator Panel ─────────────────────────────────────────────

  _renderArpPanel(parent) {
    const panel = document.createElement('div');
    panel.id = 'panel-arp';
    panel.className = 'panel';

    panel.appendChild(this._createSection('Arpeggiator', 'arpeggiator'));

    // Step pattern display
    const stepSection = document.createElement('div');
    stepSection.className = 'section';

    const stepTitle = document.createElement('div');
    stepTitle.className = 'section-title';
    stepTitle.textContent = 'Pattern Steps';

    const stepsContainer = document.createElement('div');
    stepsContainer.className = 'arp-steps';

    for (let i = 0; i < 16; i++) {
      const stepByte = this.sdata[327 + i];
      const decoded = decodeArpStep(stepByte);

      const stepEl = document.createElement('div');
      stepEl.className = 'arp-step';

      const num = document.createElement('div');
      num.className = 'step-num';
      num.textContent = i + 1;

      const bar = document.createElement('div');
      bar.className = 'arp-step-bar' + (decoded.glide ? ' glide' : '') + (decoded.stepType === 1 ? ' pause' : '');

      const fill = document.createElement('div');
      fill.className = 'fill';
      fill.style.height = `${(decoded.accent / 7) * 100}%`;
      bar.appendChild(fill);

      const typeLabel = document.createElement('div');
      typeLabel.className = 'step-num';
      typeLabel.textContent = ARP_STEP_TYPES[decoded.stepType]?.substring(0, 4) || '';

      stepEl.append(num, bar, typeLabel);
      stepsContainer.appendChild(stepEl);
    }

    stepSection.append(stepTitle, stepsContainer);
    panel.appendChild(stepSection);

    parent.appendChild(panel);
  }

  // ── Patch Name ────────────────────────────────────────────────────

  getPatchName() {
    return decodePatchName(this.sdata);
  }

  setPatchName(name) {
    encodePatchName(this.sdata, name);
    this.dirty = true;
  }

  // ── Compare ───────────────────────────────────────────────────────

  getParamSummary() {
    const summary = {};
    for (const [key, section] of Object.entries(PARAMS)) {
      if (section.params) {
        for (const param of (Array.isArray(section.params) ? section.params : [])) {
          if (param.index !== undefined) {
            summary[param.name] = this.sdata[param.index];
          }
        }
      }
    }
    return summary;
  }
}
