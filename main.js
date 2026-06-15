// ============================================================
// main.js — Application Controller
// ============================================================
'use strict';

// ── Globals ───────────────────────────────────────────────────
const engine   = new PLCEngine();
const ladderR  = new LadderRenderer(document.getElementById('ladderCanvas'), engine);
const timingR  = new TimingRenderer(document.getElementById('timingCanvas'), engine);

// UI state
let activeTool = null;   // { type: ET.xxx }
let editMode   = 'add';  // 'add' | 'delete' | 'parallel' | 'branch'
let ctxTarget  = null;   // hit area for context menu
let lastClickedRungId = null;

// ── DOM References ────────────────────────────────────────────
const elBtnRun    = document.getElementById('btn-run');
const elBtnStop   = document.getElementById('btn-stop');
const elBtnStep   = document.getElementById('btn-step');
const elBtnAddRung= document.getElementById('btn-add-rung');
const elBtnClear  = document.getElementById('btn-clear');
const elScanSpeed = document.getElementById('scan-speed');
const elScanMs    = document.getElementById('scan-ms');
const elCycleCount= document.getElementById('cycle-count');
const elTagTbody  = document.getElementById('tag-tbody');
const elMonHint   = document.querySelector('.monitor-hint');
const elSelDisplay= document.getElementById('sel-type-display');
const elModal     = document.getElementById('modal-overlay');
const elModalTitle= document.getElementById('modal-title');
const elModalTag  = document.getElementById('modal-tag');
const elModalPreset=document.getElementById('modal-preset');
const elModalPUnit= document.getElementById('modal-preset-unit');
const elModalPRow = document.getElementById('modal-preset-row');
const elModalRRow = document.getElementById('modal-reset-row');
const elModalRTag = document.getElementById('modal-reset-tag');
const elModalOk   = document.getElementById('modal-ok');
const elModalCancel=document.getElementById('modal-cancel');
const elCtxMenu   = document.getElementById('ctx-menu');
const elLadderWrap= document.getElementById('ladder-wrap');

// ── Palette & Mode Buttons ────────────────────────────────────
document.querySelectorAll('.pal-btn[data-type]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pal-btn[data-type]').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    activeTool = btn.dataset.type;
    elSelDisplay.textContent = ET_LABEL[activeTool] || activeTool;
    if (typeof theoryOnTool === 'function') theoryOnTool(activeTool);
  });
});

document.querySelectorAll('.pal-btn[data-mode]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.pal-btn[data-mode]').forEach(b => {
      b.classList.remove('active-mode');
    });
    btn.classList.add('active-mode');
    editMode = btn.dataset.mode;
  });
});

// ── Toolbar Buttons ───────────────────────────────────────────
elBtnRun.addEventListener('click', () => {
  engine.start();
  elBtnRun.disabled  = true;
  elBtnStop.disabled = false;
  elBtnStep.disabled = true;
  if (typeof theoryOnRunStart === 'function') theoryOnRunStart();
});

elBtnStop.addEventListener('click', () => {
  engine.stop();
  elBtnRun.disabled  = false;
  elBtnStop.disabled = true;
  elBtnStep.disabled = false;
  if (typeof theoryOnRunStop === 'function') theoryOnRunStop();
});

elBtnStep.addEventListener('click', () => {
  engine.scan();
  updateMonitor();
});

elBtnAddRung.addEventListener('click', () => {
  engine.addRung();
});

// Add Branch button
document.getElementById('btn-add-branch').addEventListener('click', () => {
  if (lastClickedRungId) {
    engine.addBranchToRung(lastClickedRungId);
  } else if (engine.rungs.length > 0) {
    engine.addBranchToRung(engine.rungs[engine.rungs.length - 1].id);
  } else {
    alert('Primero agrega un rung.');
  }
});

elBtnClear.addEventListener('click', () => {
  if (!confirm('¿Borrar todos los rungs y variables?')) return;
  engine.stop();
  engine.rungs = [];
  engine.tags.clear();
  engine.timers.clear();
  engine.counters.clear();
  engine.history.clear();
  engine.scanCount = 0;
  elBtnRun.disabled  = false;
  elBtnStop.disabled = true;
  updateMonitor();
  if (typeof theoryOnEmpty === 'function') theoryOnEmpty();
});

elScanSpeed.addEventListener('input', () => {
  const ms = parseInt(elScanSpeed.value);
  engine.scanMs = ms;
  elScanMs.textContent = ms;
  if (engine.running) { engine.stop(); engine.start(); }
});

document.getElementById('btn-clear-history').addEventListener('click', () => {
  engine.history.clear();
});

// ── Canvas Click ──────────────────────────────────────────────
document.getElementById('ladderCanvas').addEventListener('click', e => {
  hideCtxMenu();
  const rect = e.currentTarget.getBoundingClientRect();
  const px   = e.clientX - rect.left;
  const py   = e.clientY - rect.top;
  const hit  = ladderR.getHitAt(px, py);

  if (hit) lastClickedRungId = hit.rungId;

  if (!activeTool && editMode === 'add') return;

  if (editMode === 'delete') {
    if (hit && hit.kind === 'element') {
      engine.removeElement(hit.rungId, hit.colId, hit.elId);
      ladderR.setSelected(null);
    } else if (hit && hit.kind === 'output') {
      engine.removeOutput(hit.rungId);
    }
    return;
  }

  if (!activeTool) return;

  if (hit) {
    if (hit.kind === 'element' && editMode === 'parallel') {
      openModal('Agregar en Paralelo', activeTool, (tag, preset, resetTag) => {
        engine.addParallelToColumn(hit.rungId, hit.colId, activeTool, tag, preset, resetTag);
      });
    } else if (hit.kind === 'element' && editMode === 'branch') {
      openModal('Agregar en Rama Nueva', activeTool, (tag, preset, resetTag) => {
        const branch = engine.addBranchToRung(hit.rungId);
        if (branch) {
          engine.addColumnToRung(hit.rungId, activeTool, tag, preset, resetTag, branch.id);
        }
      });
    } else if (hit.kind === 'element' && editMode === 'add') {
      openModal('Insertar Elemento', activeTool, (tag, preset, resetTag) => {
        engine.insertColumnAfter(hit.rungId, hit.colId, activeTool, tag, preset, resetTag);
      });
    } else if (hit.kind === 'output' && isOutputElem(activeTool)) {
      openModal('Cambiar Salida', activeTool, (tag, preset, resetTag) => {
        engine.setOutput(hit.rungId, activeTool, tag, preset, resetTag);
      });
    } else if (hit.kind === 'output_empty' && isOutputElem(activeTool)) {
      openModal('Asignar Salida', activeTool, (tag, preset, resetTag) => {
        engine.setOutput(hit.rungId, activeTool, tag, preset, resetTag);
      });
    } else if (hit.kind === 'add_here') {
      if (isOutputElem(activeTool) && !engine.getRung(hit.rungId)?.output) {
        openModal('Asignar Salida', activeTool, (tag, preset, resetTag) => {
          engine.setOutput(hit.rungId, activeTool, tag, preset, resetTag);
        });
      } else {
        openModal('Agregar Elemento', activeTool, (tag, preset, resetTag) => {
          engine.addColumnToRung(hit.rungId, activeTool, tag, preset, resetTag, hit.branchId > 0 ? hit.branchId : undefined);
        });
      }
    }
  }
});

// ── Canvas Right-Click (context menu) ────────────────────────
document.getElementById('ladderCanvas').addEventListener('contextmenu', e => {
  e.preventDefault();
  const rect = e.currentTarget.getBoundingClientRect();
  const px   = e.clientX - rect.left;
  const py   = e.clientY - rect.top;
  const hit  = ladderR.getHitAt(px, py);

  if (!hit) return;
  ctxTarget = hit;
  lastClickedRungId = hit.rungId;
  ladderR.setSelected({ elId: hit.elId });

  const isElem   = hit.kind === 'element';
  const isOutput = hit.kind === 'output';
  const isEmpty  = hit.kind === 'add_here' || hit.kind === 'output_empty';

  document.getElementById('ctx-edit').style.display =
    (isElem || isOutput) ? 'block' : 'none';
  document.getElementById('ctx-add-parallel').style.display =
    isElem ? 'block' : 'none';
  document.getElementById('ctx-add-after').style.display =
    isElem ? 'block' : 'none';
  document.getElementById('ctx-delete').style.display =
    (isElem || isOutput) ? 'block' : 'none';
  document.getElementById('ctx-add-branch').style.display = 'block';
  document.getElementById('ctx-del-rung').style.display = 'block';
  document.getElementById('ctx-del-branch').style.display =
    (hit.branchId > 0 && engine.getRung(hit.rungId)?.branches.length > 1) ? 'block' : 'none';

  const menu = elCtxMenu;
  menu.style.left = `${e.clientX}px`;
  menu.style.top  = `${e.clientY}px`;
  menu.classList.remove('hidden');
});

// ── Context Menu Actions ──────────────────────────────────────
document.getElementById('ctx-edit').addEventListener('click', () => {
  hideCtxMenu();
  if (!ctxTarget) return;
  const rung = engine.getRung(ctxTarget.rungId);
  if (!rung) return;

  let el = null;
  if (ctxTarget.kind === 'output') el = rung.output;
  else {
    for (const branch of rung.branches) {
      for (const col of branch.columns) {
        for (const e of col.elements) {
          if (e.id === ctxTarget.elId) el = e;
        }
      }
    }
  }

  if (!el) return;

  openModalEdit('Editar Elemento', el, (tag, preset, resetTag) => {
    engine.editElement(ctxTarget.rungId, ctxTarget.colId, ctxTarget.elId, tag, preset, resetTag);
  });
});

document.getElementById('ctx-add-parallel').addEventListener('click', () => {
  hideCtxMenu();
  if (!ctxTarget || !activeTool) {
    alert('Selecciona una herramienta del panel izquierdo primero.');
    return;
  }
  openModal('Agregar en Paralelo', activeTool, (tag, preset, resetTag) => {
    engine.addParallelToColumn(ctxTarget.rungId, ctxTarget.colId, activeTool, tag, preset, resetTag);
  });
});

document.getElementById('ctx-add-after').addEventListener('click', () => {
  hideCtxMenu();
  if (!ctxTarget || !activeTool) {
    alert('Selecciona una herramienta del panel izquierdo primero.');
    return;
  }
  openModal('Insertar después', activeTool, (tag, preset, resetTag) => {
    engine.insertColumnAfter(ctxTarget.rungId, ctxTarget.colId, activeTool, tag, preset, resetTag);
  });
});

document.getElementById('ctx-add-branch').addEventListener('click', () => {
  hideCtxMenu();
  if (!ctxTarget) return;
  const branch = engine.addBranchToRung(ctxTarget.rungId);
  if (branch && activeTool) {
    openModal('Primer elemento de la rama', activeTool, (tag, preset, resetTag) => {
      engine.addColumnToRung(ctxTarget.rungId, activeTool, tag, preset, resetTag, branch.id);
    });
  }
});

document.getElementById('ctx-delete').addEventListener('click', () => {
  hideCtxMenu();
  if (!ctxTarget) return;
  if (ctxTarget.kind === 'output') {
    engine.removeOutput(ctxTarget.rungId);
  } else {
    engine.removeElement(ctxTarget.rungId, ctxTarget.colId, ctxTarget.elId);
  }
  ladderR.setSelected(null);
});

document.getElementById('ctx-del-branch').addEventListener('click', () => {
  hideCtxMenu();
  if (!ctxTarget) return;
  if (ctxTarget.branchId > 0) {
    engine.removeBranch(ctxTarget.rungId, ctxTarget.branchId);
    ladderR.setSelected(null);
  }
});

document.getElementById('ctx-del-rung').addEventListener('click', () => {
  hideCtxMenu();
  if (!ctxTarget) return;
  if (confirm('¿Eliminar este rung completo?')) {
    engine.removeRung(ctxTarget.rungId);
    ladderR.setSelected(null);
  }
});

// ── Modal ─────────────────────────────────────────────────────
let _modalCallback = null;

function openModal(title, type, cb) {
  _modalCallback = cb;
  elModalTitle.textContent = title + ` [${ET_LABEL[type] || type}]`;
  elModalTag.value = suggestTagName(type);

  const needsPreset = isFuncBlock(type);
  const needsReset  = COUNTERS.has(type);

  elModalPRow.classList.toggle('hidden', !needsPreset);
  elModalRRow.classList.toggle('hidden', !needsReset);

  if (TIMERS.has(type)) {
    elModalPreset.value = 5000;
    elModalPUnit.textContent = 'ms';
    elModalPreset.min = 1;
  } else if (COUNTERS.has(type)) {
    elModalPreset.value = 10;
    elModalPUnit.textContent = '(PV - valor preset)';
    elModalPreset.min = 1;
  }

  elModal.classList.remove('hidden');
  setTimeout(() => elModalTag.focus(), 50);
}

function openModalEdit(title, el, cb) {
  _modalCallback = cb;
  elModalTitle.textContent = title + ` [${ET_LABEL[el.type] || el.type}]`;
  elModalTag.value    = el.tag;
  elModalPreset.value = el.preset;
  elModalRTag.value   = el.resetTag || '';

  const needsPreset = isFuncBlock(el.type);
  const needsReset  = COUNTERS.has(el.type);
  elModalPRow.classList.toggle('hidden', !needsPreset);
  elModalRRow.classList.toggle('hidden', !needsReset);

  elModal.classList.remove('hidden');
  setTimeout(() => elModalTag.focus(), 50);
}

function confirmModal() {
  const tag      = elModalTag.value.trim().toUpperCase().replace(/\s+/g, '_');
  const preset   = parseInt(elModalPreset.value) || 5000;
  const resetTag = elModalRTag.value.trim().toUpperCase().replace(/\s+/g, '_');
  if (!tag) { elModalTag.focus(); return; }
  elModal.classList.add('hidden');
  if (_modalCallback) _modalCallback(tag, preset, resetTag);
  _modalCallback = null;
}

elModalOk.addEventListener('click', confirmModal);
elModalTag.addEventListener('keydown', e => { if (e.key === 'Enter') confirmModal(); });
elModalCancel.addEventListener('click', () => {
  elModal.classList.add('hidden');
  _modalCallback = null;
});

const _tagCounters = {};
function suggestTagName(type) {
  const prefix = {
    NO:'I', NC:'I', P:'I', N:'I',
    COIL:'Q', SET:'Q', RST:'Q', NCOIL:'Q',
    TON:'T', TOF:'T', TP:'T',
    CTU:'C', CTD:'C', CTUD:'C',
  }[type] || 'X';
  _tagCounters[prefix] = (_tagCounters[prefix] || 0) + 1;
  return `${prefix}${_tagCounters[prefix]}`;
}

// ── Context Menu Hide ─────────────────────────────────────────
function hideCtxMenu() { elCtxMenu.classList.add('hidden'); }
document.addEventListener('click', hideCtxMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCtxMenu(); });

// ── Variable Monitor ──────────────────────────────────────────
function updateMonitor() {
  const tags = engine.getUserTags();
  elMonHint.style.display = tags.length === 0 ? 'block' : 'none';

  elTagTbody.innerHTML = '';
  tags.forEach(tag => {
    const tr = document.createElement('tr');

    const tdName = document.createElement('td');
    tdName.className = 'tag-name';
    tdName.textContent = tag.name;

    const tdVal = document.createElement('td');
    const span  = document.createElement('span');
    span.className = 'tag-value ' + (tag.isInt ? 'num' : (tag.value ? 'on' : 'off'));
    span.textContent = tag.isInt ? tag.intValue : (tag.value ? 'ON' : 'OFF');
    tdVal.appendChild(span);

    const tdForce = document.createElement('td');
    const fbtn    = document.createElement('button');
    fbtn.className = 'force-btn' + (tag.forced ? (tag.forceVal ? ' forced-on' : ' forced-off') : '');
    fbtn.textContent = tag.forced ? (tag.forceVal ? 'F:1' : 'F:0') : 'F';
    fbtn.title = 'Ciclo forzado: click para ON, shift+click para OFF, ctrl+click para liberar';
    fbtn.addEventListener('click', ev => {
      if (ev.ctrlKey || ev.metaKey) {
        tag.forced = false;
      } else if (ev.shiftKey) {
        tag.forced   = true;
        tag.forceVal = false;
      } else {
        tag.forced   = true;
        tag.forceVal = !tag.forceVal;
      }
      updateMonitor();
    });
    tdForce.appendChild(fbtn);

    tr.append(tdName, tdVal, tdForce);
    elTagTbody.appendChild(tr);
  });

  timingR.setWatches(tags.slice(0, 6).map(t => t.name));
}

// ── Cycle counter display ─────────────────────────────────────
engine.onScan = () => {
  elCycleCount.textContent = engine.scanCount;
};

// ── Main RAF Loop ─────────────────────────────────────────────
let _lastMonUpdate = 0;

function loop(ts) {
  ladderR.render();
  timingR.render();

  if (ts - _lastMonUpdate > 200) {
    updateMonitor();
    _lastMonUpdate = ts;
  }

  requestAnimationFrame(loop);
}

// ── Demo Rung on load ─────────────────────────────────────────
function loadDemo() {
  const r1 = engine.addRung();
  r1.comment = 'Encender lámpara con retardo';
  engine.addColumnToRung(r1.id, ET.NO, 'PB', 5000, '');
  engine.setOutput(r1.id, ET.TON, 'T1', 5000, '');

  const r2 = engine.addRung();
  r2.comment = 'Salida de lámpara';
  engine.addColumnToRung(r2.id, ET.NO, 'T1.Q', 5000, '');
  engine.setOutput(r2.id, ET.COIL, 'LAMP1', 5000, '');
}

// ── Init ──────────────────────────────────────────────────────
loadDemo();
document.addEventListener('DOMContentLoaded', () => {
  if (typeof updateTheory === 'function') updateTheory('TON');
});
requestAnimationFrame(loop);
