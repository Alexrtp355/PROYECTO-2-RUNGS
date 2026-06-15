// ============================================================
// plc.js — PLC Engine: Tags, Timers, Counters, Scan Cycle
// IEC 61131-3 Ladder Logic
// ============================================================
'use strict';

// Element type tokens
const ET = Object.freeze({
  NO:    'NO',
  NC:    'NC',
  P:     'P',
  N:     'N',
  COIL:  'COIL',
  SET:   'SET',
  RST:   'RST',
  NCOIL: 'NCOIL',
  TON:   'TON',
  TOF:   'TOF',
  TP:    'TP',
  CTU:   'CTU',
  CTD:   'CTD',
  CTUD:  'CTUD',
});

const CONTACTS      = new Set([ET.NO, ET.NC, ET.P, ET.N]);
const COILS         = new Set([ET.COIL, ET.SET, ET.RST, ET.NCOIL]);
const TIMERS        = new Set([ET.TON, ET.TOF, ET.TP]);
const COUNTERS      = new Set([ET.CTU, ET.CTD, ET.CTUD]);
const FUNC_BLOCKS   = new Set([...TIMERS, ...COUNTERS]);

function isContact(t)     { return CONTACTS.has(t); }
function isFuncBlock(t)   { return FUNC_BLOCKS.has(t); }
function isOutputElem(t)  { return COILS.has(t) || FUNC_BLOCKS.has(t); }

const ET_LABEL = {
  NO: 'NO Contact', NC: 'NC Contact', P: 'P Contact ↑', N: 'N Contact ↓',
  COIL: 'Coil', SET: 'Set Coil', RST: 'Reset Coil', NCOIL: 'NOT Coil',
  TON: 'TON Timer', TOF: 'TOF Timer', TP: 'TP Pulse',
  CTU: 'CTU Counter', CTD: 'CTD Counter', CTUD: 'CTUD Counter',
};

// ─── Tag ──────────────────────────────────────────────────────
class Tag {
  constructor(name) {
    this.name      = name;
    this.value     = false;
    this.prevValue = false;
    this.forced    = false;
    this.forceVal  = false;
    this.isInt     = false;
    this.intValue  = 0;
  }

  get effectiveValue() {
    if (this.forced) return this.forceVal;
    return this.isInt ? this.intValue : this.value;
  }
  get risingEdge()  { return  this.value && !this.prevValue; }
  get fallingEdge() { return !this.value &&  this.prevValue; }
}

// ─── Timer ────────────────────────────────────────────────────
class TimerInst {
  constructor(type = 'TON', pt = 5000) {
    this.type   = type;
    this.PT     = pt;
    this.IN     = false;
    this.Q      = false;
    this.ET     = 0;
    this._on    = false;
    this._start = 0;
    this._prev  = false;
  }

  evaluate(inVal, nowMs) {
    this.IN = inVal;

    if (this.type === 'TON') {
      if (!this.IN) { this._on = false; this.ET = 0; this.Q = false; }
      else {
        if (!this._on) { this._on = true; this._start = nowMs; }
        this.ET = Math.min(nowMs - this._start, this.PT);
        this.Q  = this.ET >= this.PT;
      }
    }
    else if (this.type === 'TOF') {
      if (this.IN) { this._on = false; this.ET = 0; this.Q = true; }
      else if (this.Q) {
        if (!this._on) { this._on = true; this._start = nowMs; }
        this.ET = Math.min(nowMs - this._start, this.PT);
        if (this.ET >= this.PT) { this.Q = false; this._on = false; }
      }
    }
    else if (this.type === 'TP') {
      const rising = this.IN && !this._prev;
      if (rising && !this._on) { this._on = true; this._start = nowMs; this.Q = true; }
      if (this._on) {
        this.ET = Math.min(nowMs - this._start, this.PT);
        if (this.ET >= this.PT) { this._on = false; this.Q = false; }
      }
    }

    this._prev = this.IN;
    return this.Q;
  }

  get progress() { return this.PT > 0 ? Math.min(this.ET / this.PT, 1) : 0; }
}

// ─── Counter ──────────────────────────────────────────────────
class CounterInst {
  constructor(type = 'CTU', pv = 10) {
    this.type  = type;
    this.PV    = pv;
    this.CV    = 0;
    this.Q     = false;
    this.QD    = false;
    this._pCU  = false;
    this._pCD  = false;
  }

  evaluate(cuIn, resetIn = false, loadIn = false, cdIn = false) {
    if (this.type === 'CTU') {
      if (resetIn) { this.CV = 0; }
      else if (cuIn && !this._pCU) { this.CV++; }
      this.Q = this.CV >= this.PV;
      this._pCU = cuIn;
    }
    else if (this.type === 'CTD') {
      if (loadIn) { this.CV = this.PV; }
      else if (cuIn && !this._pCU && this.CV > 0) { this.CV--; }
      this.Q = this.CV <= 0;
      this._pCU = cuIn;
    }
    else if (this.type === 'CTUD') {
      if (resetIn)      { this.CV = 0; }
      else if (loadIn)  { this.CV = this.PV; }
      else {
        if (cuIn && !this._pCU) this.CV++;
        if (cdIn && !this._pCD && this.CV > 0) this.CV--;
      }
      this.Q  = this.CV >= this.PV;
      this.QD = this.CV <= 0;
      this._pCU = cuIn;
      this._pCD = cdIn;
    }
    return this.Q;
  }

  get progress() { return this.PV > 0 ? Math.min(this.CV / this.PV, 1) : 0; }
}

// ─── Factories ────────────────────────────────────────────────
let _eid = 1;
function makeElement(type, tag = '', preset = 5000, resetTag = '') {
  return { id: _eid++, type, tag, preset, resetTag, energized: false };
}

let _cid = 1;
function makeColumn(el) {
  return { id: _cid++, elements: el ? [el] : [], powerOut: false };
}

let _bid = 1;
function makeBranch() {
  return { id: _bid++, columns: [], powerOut: false };
}

let _rid = 1;
function makeRung(comment = '') {
  return {
    id: _rid++,
    comment,
    branches:  [makeBranch()],
    output:    null,
    powerFlow: false,
    label:     '',
  };
}

// ─── PLC Engine ───────────────────────────────────────────────
class PLCEngine {
  constructor() {
    this.tags      = new Map();
    this.timers    = new Map();
    this.counters  = new Map();
    this.rungs     = [];

    this.running   = false;
    this._timer    = null;
    this.scanMs    = 50;
    this.scanCount = 0;
    this.lastScanDt = 0;

    this.history    = new Map();
    this.histMax    = 400;
    this.startTime  = performance.now();

    this.onScan = null;
  }

  // ── Tags ────────────────────────────────────────────────────
  ensureTag(name) {
    if (!this.tags.has(name)) this.tags.set(name, new Tag(name));
    return this.tags.get(name);
  }
  getTag(name)       { return this.ensureTag(name); }
  getVal(name)       { return this.ensureTag(name).effectiveValue; }
  setVal(name, v)    { this.ensureTag(name).value = v; }

  // ── FB Instances ────────────────────────────────────────────
  _timerKey(el)   { return `${el.tag}__${el.id}`; }
  _cntKey(el)     { return `${el.tag}__${el.id}`; }

  getTimerInst(el) {
    const k = this._timerKey(el);
    if (!this.timers.has(k)) this.timers.set(k, new TimerInst(el.type, el.preset));
    const t = this.timers.get(k);
    t.type = el.type; t.PT = el.preset;
    return t;
  }

  getCntInst(el) {
    const k = this._cntKey(el);
    if (!this.counters.has(k)) this.counters.set(k, new CounterInst(el.type, el.preset));
    const c = this.counters.get(k);
    c.type = el.type; c.PV = el.preset;
    return c;
  }

  // ── Rung API ────────────────────────────────────────────────
  addRung() {
    const r = makeRung();
    this.rungs.push(r);
    return r;
  }

  removeRung(id) {
    const i = this.rungs.findIndex(r => r.id === id);
    if (i >= 0) this.rungs.splice(i, 1);
  }

  getRung(id) { return this.rungs.find(r => r.id === id) || null; }

  // ── Branch API ──────────────────────────────────────────────
  addBranchToRung(rungId) {
    const rung = this.getRung(rungId);
    if (!rung) return null;
    const branch = makeBranch();
    rung.branches.push(branch);
    return branch;
  }

  removeBranch(rungId, branchId) {
    const rung = this.getRung(rungId);
    if (!rung || rung.branches.length <= 1) return;
    const i = rung.branches.findIndex(b => b.id === branchId);
    if (i >= 0) rung.branches.splice(i, 1);
  }

  // ── Column / Element API ────────────────────────────────────
  addColumnToRung(rungId, type, tag, preset, resetTag, branchId) {
    const rung = this.getRung(rungId);
    if (!rung) return null;
    const branch = branchId
      ? rung.branches.find(b => b.id === branchId)
      : rung.branches[0];
    if (!branch) return null;
    const el  = makeElement(type, tag, preset, resetTag);
    const col = makeColumn(el);
    branch.columns.push(col);
    return { col, el };
  }

  addParallelToColumn(rungId, colId, type, tag, preset, resetTag) {
    const rung = this.getRung(rungId);
    if (!rung) return null;
    for (const branch of rung.branches) {
      const col = branch.columns.find(c => c.id === colId);
      if (col) {
        const el = makeElement(type, tag, preset, resetTag);
        col.elements.push(el);
        return el;
      }
    }
    return null;
  }

  insertColumnAfter(rungId, colId, type, tag, preset, resetTag) {
    const rung = this.getRung(rungId);
    if (!rung) return null;
    for (const branch of rung.branches) {
      const idx = branch.columns.findIndex(c => c.id === colId);
      if (idx >= 0) {
        const el  = makeElement(type, tag, preset, resetTag);
        const col = makeColumn(el);
        branch.columns.splice(idx + 1, 0, col);
        return { col, el };
      }
    }
    return null;
  }

  removeElement(rungId, colId, elId) {
    const rung = this.getRung(rungId);
    if (!rung) return;
    for (const branch of rung.branches) {
      const col = branch.columns.find(c => c.id === colId);
      if (!col) continue;
      const i = col.elements.findIndex(e => e.id === elId);
      if (i < 0) continue;
      col.elements.splice(i, 1);
      if (col.elements.length === 0) {
        const ci = branch.columns.findIndex(c => c.id === colId);
        if (ci >= 0) branch.columns.splice(ci, 1);
      }
      if (branch.columns.length === 0 && rung.branches.length > 1) {
        const bi = rung.branches.findIndex(b => b.id === branch.id);
        if (bi >= 0) rung.branches.splice(bi, 1);
      }
      return;
    }
  }

  setOutput(rungId, type, tag, preset, resetTag) {
    const rung = this.getRung(rungId);
    if (!rung) return;
    rung.output = makeElement(type, tag, preset, resetTag);
  }

  removeOutput(rungId) {
    const rung = this.getRung(rungId);
    if (rung) rung.output = null;
  }

  editElement(rungId, colId, elId, newTag, newPreset, newResetTag) {
    const rung = this.getRung(rungId);
    if (!rung) return;
    if (rung.output && rung.output.id === elId) {
      rung.output.tag = newTag; rung.output.preset = newPreset;
      rung.output.resetTag = newResetTag; return;
    }
    for (const branch of rung.branches) {
      for (const col of branch.columns) {
        const el = col.elements.find(e => e.id === elId);
        if (el) { el.tag = newTag; el.preset = newPreset; el.resetTag = newResetTag; return; }
      }
    }
  }

  // ── Scan Cycle ──────────────────────────────────────────────
  start() {
    if (this.running) return;
    this.running   = true;
    this.startTime = performance.now();
    this._timer    = setInterval(() => this.scan(), this.scanMs);
  }

  stop() {
    this.running = false;
    if (this._timer) { clearInterval(this._timer); this._timer = null; }
  }

  scan() {
    const t0  = performance.now();
    const now = t0 - this.startTime;

    for (const tag of this.tags.values()) tag.prevValue = tag.value;
    for (const rung of this.rungs) this._evalRung(rung, t0);
    this._record(now);

    this.scanCount++;
    this.lastScanDt = performance.now() - t0;
    if (this.onScan) this.onScan();
  }

  _evalRung(rung, nowMs) {
    let rungPower = false;

    for (const branch of rung.branches) {
      let power = true;

      if (branch.columns.length === 0) {
        branch.powerOut = true;
      } else {
        for (const col of branch.columns) {
          let colPow = false;
          for (const el of col.elements) {
            const pass = this._evalContact(el, power, nowMs);
            el.energized = power;
            if (pass) colPow = true;
          }
          col.powerOut = power && colPow;
          power = col.powerOut;
        }
        branch.powerOut = power;
      }

      if (branch.powerOut) rungPower = true;
    }

    rung.powerFlow = rungPower;

    if (rung.output) {
      rung.output.energized = rung.powerFlow;
      this._evalOutput(rung.output, rung.powerFlow, nowMs);
    }
  }

  _evalContact(el, powerIn, nowMs) {
    const tag = this.ensureTag(el.tag);
    switch (el.type) {
      case ET.NO: return tag.effectiveValue;
      case ET.NC: return !tag.effectiveValue;
      case ET.P:  return tag.risingEdge;
      case ET.N:  return tag.fallingEdge;
      case ET.TON: case ET.TOF: case ET.TP: {
        const inst = this.getTimerInst(el);
        const q = inst.evaluate(powerIn, nowMs);
        this.ensureTag(el.tag + '.Q').value = q;
        const et = this.ensureTag(el.tag + '.ET');
        et.isInt = true; et.intValue = Math.round(inst.ET);
        return q;
      }
      case ET.CTU: case ET.CTD: case ET.CTUD: {
        const inst = this.getCntInst(el);
        const reset = el.resetTag ? this.getVal(el.resetTag) : false;
        const q = inst.evaluate(powerIn, reset);
        this.ensureTag(el.tag + '.Q').value = q;
        const cv = this.ensureTag(el.tag + '.CV');
        cv.isInt = true; cv.intValue = inst.CV;
        return q;
      }
      default: return false;
    }
  }

  _evalOutput(el, powerIn, nowMs) {
    const tag = this.ensureTag(el.tag);
    switch (el.type) {
      case ET.COIL:  tag.value = powerIn;  break;
      case ET.NCOIL: tag.value = !powerIn; break;
      case ET.SET:   if (powerIn) tag.value = true;  break;
      case ET.RST:   if (powerIn) tag.value = false; break;
      case ET.TON: case ET.TOF: case ET.TP: {
        const inst = this.getTimerInst(el);
        inst.evaluate(powerIn, nowMs);
        this.ensureTag(el.tag + '.Q').value = inst.Q;
        const et = this.ensureTag(el.tag + '.ET');
        et.isInt = true; et.intValue = Math.round(inst.ET);
        break;
      }
      case ET.CTU: case ET.CTD: case ET.CTUD: {
        const inst = this.getCntInst(el);
        const reset = el.resetTag ? this.getVal(el.resetTag) : false;
        inst.evaluate(powerIn, reset);
        this.ensureTag(el.tag + '.Q').value = inst.Q;
        const cv = this.ensureTag(el.tag + '.CV');
        cv.isInt = true; cv.intValue = inst.CV;
        break;
      }
    }
  }

  _record(nowMs) {
    for (const [name, tag] of this.tags) {
      if (!this.history.has(name)) this.history.set(name, []);
      const buf = this.history.get(name);
      buf.push({ t: nowMs, v: tag.isInt ? tag.intValue : (tag.value ? 1 : 0) });
      if (buf.length > this.histMax) buf.shift();
    }
  }

  getUserTags() {
    return [...this.tags.values()].filter(t => !t.name.includes('.'));
  }

  reset() {
    for (const t of this.tags.values()) {
      if (!t.forced) { t.value = false; t.intValue = 0; }
    }
    this.timers.clear();
    this.counters.clear();
    this.history.clear();
    this.scanCount  = 0;
    this.startTime  = performance.now();
  }
}
