// Librarian — Import/export .syx files, tagging, search, library management
import { parseSyxFile, buildSyxFile, decodePatchName } from './sysex.js';
import { CATEGORIES } from './blofeld-params.js';

export class Librarian {
  constructor() {
    this.presets = [];  // { id, name, bank, program, category, tags, data, source }
    this.nextId = 1;
    this._loadFromStorage();
  }

  // ── Storage ────────────────────────────────────────────────────────

  _loadFromStorage() {
    try {
      const stored = localStorage.getItem('blofeld-library');
      if (stored) {
        const parsed = JSON.parse(stored);
        this.presets = parsed.presets.map(p => ({
          ...p,
          data: new Uint8Array(p.data),
        }));
        this.nextId = parsed.nextId || this.presets.length + 1;
      }
    } catch (e) {
      console.warn('Failed to load library from storage:', e);
    }
  }

  _saveToStorage() {
    try {
      const toStore = {
        nextId: this.nextId,
        presets: this.presets.map(p => ({
          ...p,
          data: Array.from(p.data),
        })),
      };
      localStorage.setItem('blofeld-library', JSON.stringify(toStore));
    } catch (e) {
      console.warn('Failed to save library to storage:', e);
    }
  }

  // ── CRUD ───────────────────────────────────────────────────────────

  add(sdata, meta = {}) {
    const name = decodePatchName(sdata);
    const category = sdata[379];
    const preset = {
      id: this.nextId++,
      name,
      bank: meta.bank ?? 0,
      program: meta.program ?? 0,
      category,
      categoryName: CATEGORIES[category] || 'Init',
      tags: meta.tags || [],
      data: new Uint8Array(sdata),
      source: meta.source || 'user',
      addedAt: Date.now(),
    };
    this.presets.push(preset);
    this._saveToStorage();
    return preset;
  }

  remove(id) {
    this.presets = this.presets.filter(p => p.id !== id);
    this._saveToStorage();
  }

  update(id, updates) {
    const preset = this.presets.find(p => p.id === id);
    if (!preset) return null;
    Object.assign(preset, updates);
    if (updates.data) {
      preset.name = decodePatchName(updates.data);
      preset.category = updates.data[379];
      preset.categoryName = CATEGORIES[updates.data[379]] || 'Init';
    }
    this._saveToStorage();
    return preset;
  }

  get(id) {
    return this.presets.find(p => p.id === id) || null;
  }

  getAll() {
    return [...this.presets];
  }

  // ── Search & Filter ────────────────────────────────────────────────

  search(query) {
    const q = query.toLowerCase();
    return this.presets.filter(p =>
      p.name.toLowerCase().includes(q) ||
      p.categoryName.toLowerCase().includes(q) ||
      p.tags.some(t => t.toLowerCase().includes(q))
    );
  }

  filterByCategory(categoryIndex) {
    if (categoryIndex < 0) return this.getAll();
    return this.presets.filter(p => p.category === categoryIndex);
  }

  filterByTag(tag) {
    return this.presets.filter(p => p.tags.includes(tag));
  }

  getAllTags() {
    const tags = new Set();
    for (const p of this.presets) {
      for (const t of p.tags) tags.add(t);
    }
    return Array.from(tags).sort();
  }

  // ── Tagging ────────────────────────────────────────────────────────

  addTag(id, tag) {
    const preset = this.get(id);
    if (!preset) return;
    if (!preset.tags.includes(tag)) {
      preset.tags.push(tag);
      this._saveToStorage();
    }
  }

  removeTag(id, tag) {
    const preset = this.get(id);
    if (!preset) return;
    preset.tags = preset.tags.filter(t => t !== tag);
    this._saveToStorage();
  }

  // ── Import .syx ────────────────────────────────────────────────────

  importSyxFile(buffer, filename = 'import') {
    const sounds = parseSyxFile(buffer);
    const added = [];
    for (const sound of sounds) {
      const preset = this.add(sound.data, {
        bank: sound.bank,
        program: sound.program,
        source: filename,
      });
      added.push(preset);
    }
    return added;
  }

  async importFromFileInput(fileInput) {
    const files = fileInput.files;
    let totalAdded = 0;
    for (const file of files) {
      const buffer = await file.arrayBuffer();
      const added = this.importSyxFile(buffer, file.name);
      totalAdded += added.length;
    }
    return totalAdded;
  }

  // ── Export .syx ────────────────────────────────────────────────────

  exportPreset(id) {
    const preset = this.get(id);
    if (!preset) return null;
    return buildSyxFile([{
      deviceId: 0x00,
      bank: preset.bank,
      program: preset.program,
      data: preset.data,
    }]);
  }

  exportAll() {
    return buildSyxFile(this.presets.map((p, i) => ({
      deviceId: 0x00,
      bank: Math.floor(i / 128),
      program: i % 128,
      data: p.data,
    })));
  }

  exportSelection(ids) {
    const presets = ids.map(id => this.get(id)).filter(Boolean);
    return buildSyxFile(presets.map((p, i) => ({
      deviceId: 0x00,
      bank: p.bank,
      program: p.program,
      data: p.data,
    })));
  }

  // ── Download Helper ────────────────────────────────────────────────

  download(data, filename) {
    const blob = new Blob([data], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Library Stats ──────────────────────────────────────────────────

  getStats() {
    const byCat = {};
    for (const p of this.presets) {
      const cat = p.categoryName;
      byCat[cat] = (byCat[cat] || 0) + 1;
    }
    return {
      total: this.presets.length,
      byCategory: byCat,
      tags: this.getAllTags().length,
    };
  }

  // ── Clear ──────────────────────────────────────────────────────────

  clear() {
    this.presets = [];
    this.nextId = 1;
    this._saveToStorage();
  }
}
