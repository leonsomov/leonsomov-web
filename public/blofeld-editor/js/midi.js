// Web MIDI API wrapper for Waldorf Blofeld
// Handles device discovery, connection, SysEx communication, and throttling

const WALDORF_ID = 0x3E;
const BLOFELD_ID = 0x13;

export class BlofeldMidi {
  constructor() {
    this.midiAccess = null;
    this.input = null;
    this.output = null;
    this.deviceId = 0x00;
    this.listeners = new Map();
    this._sysexBuffer = [];
    this._onMidiMessage = this._onMidiMessage.bind(this);

    // Throttling: queue outgoing param changes to avoid flooding MIDI bus
    this._sendQueue = [];
    this._sendTimer = null;
    this._sendInterval = 25; // ms between outgoing SysEx (safe for Blofeld)
    this._lastParamSent = {};  // paramIndex -> scheduled value (coalesce rapid changes)
  }

  // ── Connection ───────────────────────────────────────────────────

  async init() {
    if (!navigator.requestMIDIAccess) {
      throw new Error('Web MIDI API not supported. Use Chrome or Brave.');
    }
    this.midiAccess = await navigator.requestMIDIAccess({ sysex: true });
    this.midiAccess.onstatechange = () => this.emit('portsChanged');
    return this;
  }

  getInputs() {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.inputs.values()).map(p => ({
      id: p.id, name: p.name, manufacturer: p.manufacturer
    }));
  }

  getOutputs() {
    if (!this.midiAccess) return [];
    return Array.from(this.midiAccess.outputs.values()).map(p => ({
      id: p.id, name: p.name, manufacturer: p.manufacturer
    }));
  }

  connectInput(portId) {
    if (this.input) {
      this.input.removeEventListener('midimessage', this._onMidiMessage);
    }
    this.input = this.midiAccess.inputs.get(portId);
    if (this.input) {
      this.input.addEventListener('midimessage', this._onMidiMessage);
      this.emit('connected', { port: 'input', name: this.input.name });
    }
  }

  connectOutput(portId) {
    this.output = this.midiAccess.outputs.get(portId);
    if (this.output) {
      this.emit('connected', { port: 'output', name: this.output.name });
    }
  }

  autoDetect() {
    const inputs = this.getInputs();
    const outputs = this.getOutputs();

    // Look for ports with "Blofeld" in the name
    const bIn = inputs.find(p => /blofeld/i.test(p.name));
    const bOut = outputs.find(p => /blofeld/i.test(p.name));

    if (bIn) this.connectInput(bIn.id);
    if (bOut) this.connectOutput(bOut.id);

    return { input: bIn?.name || null, output: bOut?.name || null };
  }

  disconnect() {
    if (this.input) {
      this.input.removeEventListener('midimessage', this._onMidiMessage);
      this.input = null;
    }
    this.output = null;
    this._stopSendQueue();
    this.emit('disconnected');
  }

  get isConnected() {
    return this.input !== null && this.output !== null;
  }

  // ── Send (raw, immediate) ──────────────────────────────────────

  send(data) {
    if (!this.output) throw new Error('No MIDI output connected');
    this.output.send(data);
    this.emit('midiOut');
  }

  // ── Throttled Send for Parameter Changes ───────────────────────
  // Coalesces rapid changes to the same param (e.g. knob drag) and
  // spaces them out so the Blofeld MIDI bus doesn't overflow.

  sendThrottled(data, paramIndex) {
    if (paramIndex !== undefined) {
      // Coalesce: if we already have a queued change for this param, replace it
      this._lastParamSent[paramIndex] = data;
      // Check if already in queue
      const existing = this._sendQueue.findIndex(q => q.paramIndex === paramIndex);
      if (existing >= 0) {
        this._sendQueue[existing].data = data;
        return;
      }
    }
    this._sendQueue.push({ data, paramIndex });
    this._startSendQueue();
  }

  _startSendQueue() {
    if (this._sendTimer) return;
    this._processSendQueue();
  }

  _processSendQueue() {
    if (this._sendQueue.length === 0) {
      this._sendTimer = null;
      return;
    }
    const item = this._sendQueue.shift();
    // If coalesced, use the latest value
    const data = item.paramIndex !== undefined
      ? (this._lastParamSent[item.paramIndex] || item.data)
      : item.data;
    delete this._lastParamSent[item.paramIndex];

    try { this.send(data); } catch (e) { /* disconnected */ }
    this._sendTimer = setTimeout(() => this._processSendQueue(), this._sendInterval);
  }

  _stopSendQueue() {
    if (this._sendTimer) {
      clearTimeout(this._sendTimer);
      this._sendTimer = null;
    }
    this._sendQueue = [];
    this._lastParamSent = {};
  }

  // ── Send with delay (for multi-message operations) ─────────────

  sendWithDelay(messages, delayMs = 50) {
    messages.forEach((msg, i) => {
      setTimeout(() => this.send(msg), i * delayMs);
    });
  }

  // ── Receive ──────────────────────────────────────────────────────

  _onMidiMessage(event) {
    const data = event.data;
    this.emit('midiIn');

    // SysEx message
    if (data[0] === 0xF0) {
      if (data[data.length - 1] === 0xF7) {
        this._handleSysEx(new Uint8Array(data));
      } else {
        this._sysexBuffer = Array.from(data);
      }
      return;
    }

    // Continuation of multi-part SysEx
    if (this._sysexBuffer.length > 0) {
      this._sysexBuffer.push(...data);
      if (data[data.length - 1] === 0xF7) {
        this._handleSysEx(new Uint8Array(this._sysexBuffer));
        this._sysexBuffer = [];
      }
      return;
    }

    // Regular MIDI messages (CC, etc.)
    this.emit('midi', { data: new Uint8Array(data) });
  }

  _handleSysEx(data) {
    if (data[1] === WALDORF_ID && data[2] === BLOFELD_ID) {
      const idm = data[4];
      switch (idm) {
        case 0x10: // Sound Dump
          this.emit('soundDump', data);
          break;
        case 0x20: // Parameter Change
          this.emit('paramChange', {
            location: data[5],
            paramIndex: (data[6] << 7) | data[7],
            value: data[8],
          });
          break;
        case 0x14: // Global Dump
          this.emit('globalDump', data);
          break;
        case 0x11: // Multi Dump
          this.emit('multiDump', data);
          break;
      }
    }
    this.emit('sysex', data);
  }

  // ── Simple Event Emitter ─────────────────────────────────────────

  on(event, fn) {
    if (!this.listeners.has(event)) this.listeners.set(event, []);
    this.listeners.get(event).push(fn);
    return () => this.off(event, fn);
  }

  off(event, fn) {
    const list = this.listeners.get(event);
    if (list) {
      const idx = list.indexOf(fn);
      if (idx >= 0) list.splice(idx, 1);
    }
  }

  emit(event, data) {
    const list = this.listeners.get(event);
    if (list) list.forEach(fn => fn(data));
  }

  // ── Request + wait for response ──────────────────────────────────

  requestSound(bank, program, timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Sound dump request timed out'));
      }, timeoutMs);

      const cleanup = this.on('soundDump', (data) => {
        clearTimeout(timer);
        cleanup();
        resolve(data);
      });

      const { soundRequest } = this._loadSysex();
      this.send(soundRequest(this.deviceId, bank, program));
    });
  }

  requestEditBuffer(timeoutMs = 3000) {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        cleanup();
        reject(new Error('Edit buffer request timed out'));
      }, timeoutMs);

      const cleanup = this.on('soundDump', (data) => {
        clearTimeout(timer);
        cleanup();
        resolve(data);
      });

      const { editBufferRequest } = this._loadSysex();
      this.send(editBufferRequest(this.deviceId));
    });
  }

  _loadSysex() {
    if (!this._sysexModule) {
      throw new Error('SysEx module not linked. Call midi.linkSysex(sysexModule)');
    }
    return this._sysexModule;
  }

  linkSysex(module) {
    this._sysexModule = module;
  }
}
