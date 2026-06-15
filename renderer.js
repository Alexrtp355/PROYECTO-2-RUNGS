// ============================================================
// renderer.js — Canvas Renderer (Ladder + Timing Diagram)
// ============================================================
'use strict';

// ── Layout constants ──────────────────────────────────────────
const L = {
  RAIL_X_L:   70,
  RAIL_X_R:   0,
  RUNG_PAD_Y: 20,
  RUNG_GAP:   18,
  RUNG_LABEL_W: 60,
  CELL_W:     130,
  CELL_H:     60,
  FB_W:       140,
  FB_H:       80,
  OUT_W:      140,
  BRANCH_GAP: 6,
  BRANCH_PAD: 10,
  WIRE_Y_OFF: 0,
  MIN_W:      700,
};

// ── Colors ────────────────────────────────────────────────────
const C = {
  BG:         '#080d1a',
  RAIL:       '#1e3a5a',
  RAIL_LIT:   '#00c8f0',
  WIRE_ON:    '#00e870',
  WIRE_OFF:   '#162840',
  WIRE_MID:   '#0a4a20',
  EL_BG:      '#0c1828',
  EL_BORDER:  '#1e3a5a',
  EL_LIT:     '#003828',
  EL_BORDER_LIT: '#00c060',
  FB_BG:      '#0c0820',
  FB_BORDER:  '#3a1870',
  FB_LIT:     '#1a0840',
  FB_BORDER_LIT: '#8040ff',
  TEXT:       '#8aabcc',
  TEXT_BRIGHT:'#d0e8ff',
  TEXT_LIT:   '#00e870',
  CYAN:       '#00c8f0',
  YELLOW:     '#f0c030',
  RED:        '#ff3040',
  ORANGE:     '#ff8820',
  GREEN:      '#00e870',
  PURPLE:     '#a060ff',
  RUNG_NUM:   '#2a4a6a',
  COMMENT:    '#3a6a4a',
  GRID:       '#0c1420',
};

let _animOffset = 0;

// ── Utility draw helpers ──────────────────────────────────────
function setGlow(ctx, color, blur = 12) {
  ctx.shadowColor = color;
  ctx.shadowBlur  = blur;
}
function clearGlow(ctx) {
  ctx.shadowBlur = 0;
}

function drawWire(ctx, x1, y1, x2, y2, on, animate = true) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  if (on) {
    ctx.strokeStyle = C.WIRE_ON;
    ctx.lineWidth   = 2.5;
    if (animate) {
      ctx.setLineDash([9, 5]);
      ctx.lineDashOffset = -_animOffset;
    } else {
      ctx.setLineDash([]);
    }
    setGlow(ctx, C.WIRE_ON, 10);
  } else {
    ctx.strokeStyle = C.WIRE_OFF;
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([]);
    clearGlow(ctx);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  clearGlow(ctx);
}

// ─────────────────────────────────────────────────────────────
// Element drawing functions
// ─────────────────────────────────────────────────────────────

function drawNO(ctx, x, y, w, h, on, tag) {
  const mx = x + w / 2;
  const my = y + h / 2;
  const gap = 14;
  const barH = 16;

  drawWire(ctx, x, my, mx - gap - 2, my, on);
  drawWire(ctx, mx + gap + 2, my, x + w, my, on);

  const bc = on ? C.EL_BORDER_LIT : C.EL_BORDER;
  const lw = on ? 2.5 : 1.5;
  if (on) setGlow(ctx, C.WIRE_ON, 8);
  ctx.strokeStyle = bc;
  ctx.lineWidth   = lw;

  ctx.beginPath();
  ctx.moveTo(mx - gap, my - barH / 2);
  ctx.lineTo(mx - gap, my + barH / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mx + gap, my - barH / 2);
  ctx.lineTo(mx + gap, my + barH / 2);
  ctx.stroke();
  clearGlow(ctx);

  ctx.fillStyle = on ? C.TEXT_LIT : C.TEXT;
  ctx.font = '10px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(tag, mx, my + barH / 2 + 12);
}

function drawNC(ctx, x, y, w, h, on, tag) {
  const mx = x + w / 2;
  const my = y + h / 2;
  const gap = 14;
  const barH = 16;

  drawWire(ctx, x, my, mx - gap - 2, my, on);
  drawWire(ctx, mx + gap + 2, my, x + w, my, on);

  const bc = on ? C.EL_BORDER_LIT : C.EL_BORDER;
  const lw = on ? 2.5 : 1.5;
  if (on) setGlow(ctx, C.WIRE_ON, 8);
  ctx.strokeStyle = bc;
  ctx.lineWidth   = lw;

  ctx.beginPath();
  ctx.moveTo(mx - gap, my - barH / 2);
  ctx.lineTo(mx - gap, my + barH / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mx + gap, my - barH / 2);
  ctx.lineTo(mx + gap, my + barH / 2);
  ctx.stroke();

  ctx.beginPath();
  ctx.moveTo(mx - gap - 4, my + barH / 2 - 4);
  ctx.lineTo(mx + gap + 4, my - barH / 2 + 4);
  ctx.stroke();
  clearGlow(ctx);

  ctx.fillStyle = on ? C.TEXT_LIT : C.TEXT;
  ctx.font = '10px Courier New';
  ctx.textAlign = 'center';
  ctx.fillText(tag, mx, my + barH / 2 + 12);
}

function drawEdgeContact(ctx, x, y, w, h, on, tag, rising) {
  const mx = x + w / 2;
  const my = y + h / 2;
  const gap = 14;
  const barH = 16;
  const letter = rising ? 'P' : 'N';

  drawWire(ctx, x, my, mx - gap - 2, my, on);
  drawWire(ctx, mx + gap + 2, my, x + w, my, on);

  const bc = on ? C.EL_BORDER_LIT : C.EL_BORDER;
  if (on) setGlow(ctx, C.WIRE_ON, 8);
  ctx.strokeStyle = bc;
  ctx.lineWidth   = on ? 2.5 : 1.5;

  ctx.beginPath();
  ctx.moveTo(mx - gap, my - barH / 2);
  ctx.lineTo(mx - gap, my + barH / 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(mx + gap, my - barH / 2);
  ctx.lineTo(mx + gap, my + barH / 2);
  ctx.stroke();
  clearGlow(ctx);

  ctx.fillStyle = on ? C.GREEN : (rising ? '#006040' : '#604000');
  ctx.font = 'bold 11px Courier New';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(letter, mx, my);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = on ? C.TEXT_LIT : C.TEXT;
  ctx.font = '10px Courier New';
  ctx.fillText(tag, mx, my + barH / 2 + 12);
}

function drawCoil(ctx, x, y, w, h, on, tag, letter = '') {
  const mx = x + w / 2;
  const my = y + h / 2;
  const r  = 14;

  drawWire(ctx, x, my, mx - r, my, on);
  drawWire(ctx, mx + r, my, x + w, my, on);

  if (on) setGlow(ctx, C.WIRE_ON, 10);
  ctx.strokeStyle = on ? C.EL_BORDER_LIT : C.EL_BORDER;
  ctx.lineWidth   = on ? 2.5 : 1.5;
  ctx.fillStyle   = on ? C.EL_LIT : C.EL_BG;

  ctx.beginPath();
  ctx.arc(mx, my, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
  clearGlow(ctx);

  ctx.fillStyle  = on ? C.TEXT_LIT : C.TEXT;
  ctx.font       = 'bold 10px Courier New';
  ctx.textAlign  = 'center';
  ctx.textBaseline = 'middle';
  if (letter) ctx.fillText(letter, mx, my);
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = on ? C.TEXT_LIT : C.TEXT;
  ctx.font      = '10px Courier New';
  ctx.fillText(tag, mx, my + r + 12);
}

function rrect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

// ─────────────────────────────────────────────────────────────
// LadderRenderer
// ─────────────────────────────────────────────────────────────
class LadderRenderer {
  constructor(canvas, engine) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.engine  = engine;
    this.hitAreas = [];
    this.selected = null;
  }

  render() {
    _animOffset = (performance.now() / 50) % 14;

    const ctx    = this.ctx;
    const rungs  = this.engine.rungs;
    const layout = this._computeLayout(rungs);
    const totalH = layout.totalH + L.RUNG_PAD_Y + 40;
    const totalW = Math.max(layout.totalW + L.RAIL_X_L + L.OUT_W + 80, L.MIN_W);

    const pw = this.canvas.parentElement.clientWidth  || 800;
    const ph = this.canvas.parentElement.clientHeight || 400;
    const cw = Math.max(totalW, pw);
    const ch = Math.max(totalH, ph);

    if (this.canvas.width !== cw || this.canvas.height !== ch) {
      this.canvas.width  = cw;
      this.canvas.height = ch;
    }

    L.RAIL_X_R = cw - 50;

    ctx.clearRect(0, 0, cw, ch);
    ctx.fillStyle = C.BG;
    ctx.fillRect(0, 0, cw, ch);

    ctx.strokeStyle = C.GRID;
    ctx.lineWidth   = 1;
    for (const ri of layout.rungs) {
      ctx.beginPath();
      ctx.moveTo(0, ri.y - L.RUNG_GAP / 2);
      ctx.lineTo(cw, ri.y - L.RUNG_GAP / 2);
      ctx.stroke();
    }

    this._drawRails(ctx, layout, ch);

    this.hitAreas = [];
    for (let i = 0; i < rungs.length; i++) {
      this._drawRung(ctx, rungs[i], layout.rungs[i], cw);
    }

    document.getElementById('empty-hint').style.display =
      rungs.length === 0 ? 'block' : 'none';
  }

  _computeLayout(rungs) {
    let y   = L.RUNG_PAD_Y;
    let maxW = 0;
    const rungLayouts = [];

    for (const rung of rungs) {
      const branchLayouts = [];
      let rungH = 0;
      let rungW = 0;

      for (const branch of rung.branches) {
        const maxPar = branch.columns.length > 0
          ? Math.max(...branch.columns.map(c => c.elements.length), 1)
          : 1;
        const hasFB = branch.columns.some(c => c.elements.some(e => isFuncBlock(e.type)));
        const branchH = hasFB
          ? Math.max(maxPar * L.CELL_H, L.FB_H + 20)
          : Math.max(maxPar * L.CELL_H, L.CELL_H);

        const branchW = branch.columns.reduce((acc, col) => {
          const w = col.elements.some(e => isFuncBlock(e.type)) ? L.FB_W : L.CELL_W;
          return acc + w;
        }, 0);

        branchLayouts.push({ h: branchH, w: branchW });
        if (branchW > rungW) rungW = branchW;
      }

      // Stack branches vertically
      let by = y;
      for (let i = 0; i < branchLayouts.length; i++) {
        branchLayouts[i].y = by;
        by += branchLayouts[i].h;
        if (i < branchLayouts.length - 1) by += L.BRANCH_GAP;
      }
      rungH = by - y;
      rungH = Math.max(rungH, L.CELL_H);

      rungLayouts.push({ y, h: rungH, w: rungW, branches: branchLayouts });
      if (rungW > maxW) maxW = rungW;
      y += rungH + L.RUNG_GAP;
    }

    return { rungs: rungLayouts, totalH: y, totalW: maxW };
  }

  _drawRails(ctx, layout, ch) {
    const lx = L.RAIL_X_L;
    const rx = L.RAIL_X_R;

    ctx.strokeStyle = C.RAIL_LIT;
    ctx.lineWidth   = 3;
    setGlow(ctx, C.CYAN, 8);
    ctx.beginPath();
    ctx.moveTo(lx, 10);
    ctx.lineTo(lx, ch - 10);
    ctx.stroke();

    ctx.strokeStyle = C.RAIL;
    ctx.lineWidth   = 3;
    clearGlow(ctx);
    ctx.beginPath();
    ctx.moveTo(rx, 10);
    ctx.lineTo(rx, ch - 10);
    ctx.stroke();

    ctx.fillStyle  = C.CYAN;
    ctx.font       = 'bold 11px Courier New';
    ctx.textAlign  = 'center';
    ctx.fillText('L1', lx, 8);
    ctx.fillStyle  = C.TEXT;
    ctx.fillText('L2', rx, 8);
  }

  _drawRung(ctx, rung, ri, canvasW) {
    const lx = L.RAIL_X_L;
    const rx = L.RAIL_X_R;
    const outX = rx - L.OUT_W - 10;
    const rungMidY = ri.y + ri.h / 2;

    // Rung number
    ctx.fillStyle = C.RUNG_NUM;
    ctx.font      = '10px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText(`${String(rung.id).padStart(2,'0')}`, lx - 8, rungMidY + 4);

    if (rung.comment) {
      ctx.fillStyle = C.COMMENT;
      ctx.font      = '10px Courier New';
      ctx.textAlign = 'left';
      ctx.fillText(`// ${rung.comment}`, lx + 10, ri.y - 4);
    }

    // Draw each branch
    for (let bi = 0; bi < rung.branches.length; bi++) {
      const branch = rung.branches[bi];
      const bl     = ri.branches[bi];
      this._drawBranch(ctx, rung, branch, bl, lx, outX);
    }

    // Vertical bus connecting branches
    if (rung.branches.length > 1) {
      const firstBL = ri.branches[0];
      const lastBL  = ri.branches[ri.branches.length - 1];
      const topMid  = firstBL.y + firstBL.h / 2;
      const botMid  = lastBL.y + lastBL.h / 2;

      // Left bus
      drawWire(ctx, lx, topMid, lx, botMid, true, false);

      // Right bus (at outX)
      const anyPower = rung.branches.some(b => b.powerOut);
      drawWire(ctx, outX, topMid, outX, botMid, anyPower, false);

      // Junction dots
      for (let bi = 0; bi < rung.branches.length; bi++) {
        const bl  = ri.branches[bi];
        const bmy = bl.y + bl.h / 2;
        const brPow = rung.branches[bi].powerOut;

        ctx.beginPath(); ctx.arc(lx, bmy, 3, 0, Math.PI * 2);
        ctx.fillStyle = C.WIRE_ON; ctx.fill();

        ctx.beginPath(); ctx.arc(outX, bmy, 3, 0, Math.PI * 2);
        ctx.fillStyle = brPow ? C.WIRE_ON : C.WIRE_OFF; ctx.fill();
      }
    }

    // Output element
    const outOn = rung.powerFlow;

    if (rung.output) {
      this._drawOutput(ctx, rung.output, outX, ri.y, L.OUT_W, ri.h, outOn, rung);
      this.hitAreas.push({
        x: outX, y: ri.y, w: L.OUT_W, h: ri.h,
        rungId: rung.id, branchId: -1, colId: -1, elId: rung.output.id, kind: 'output',
      });
      drawWire(ctx, outX + L.OUT_W, rungMidY, rx, rungMidY, outOn);
    } else {
      this._drawOutputPlaceholder(ctx, outX, ri.y, L.OUT_W, ri.h);
      this.hitAreas.push({
        x: outX, y: ri.y, w: L.OUT_W, h: ri.h,
        rungId: rung.id, branchId: -1, colId: -1, elId: -1, kind: 'output_empty',
      });
      drawWire(ctx, outX, rungMidY, rx, rungMidY, false);
    }

    // "no power" label
    const hasElements = rung.branches.some(b => b.columns.length > 0);
    if (!rung.powerFlow && hasElements && rung.output) {
      ctx.fillStyle  = '#2a3a5a';
      ctx.font       = '9px Courier New';
      ctx.textAlign  = 'center';
      ctx.fillText('rung idle – no power flow', (lx + rx) / 2, ri.y + ri.h + 12);
    }
  }

  _drawBranch(ctx, rung, branch, bl, startX, endX) {
    const y  = bl.y;
    const h  = bl.h;
    const my = y + h / 2;
    let cx = startX;

    if (branch.columns.length === 0) {
      drawWire(ctx, cx, my, endX, my, branch.powerOut);
      this.hitAreas.push({
        x: cx, y, w: Math.max(endX - cx, 30), h,
        rungId: rung.id, branchId: branch.id, colId: -1, elId: -1, kind: 'add_here',
      });
      return;
    }

    for (let ci = 0; ci < branch.columns.length; ci++) {
      const col  = branch.columns[ci];
      const isFB = col.elements.some(e => isFuncBlock(e.type));
      const colW = isFB ? L.FB_W : L.CELL_W;
      const nEls = col.elements.length;
      const elH  = isFB ? Math.max(L.FB_H, h) : h / nEls;

      // Vertical bus for parallel elements within column
      if (nEls > 1) {
        const prevPow = ci === 0 ? true : (branch.columns[ci - 1]?.powerOut ?? false);
        const busOn   = prevPow;
        const topY    = y + elH / 2;
        const botY    = y + h - elH / 2;
        drawWire(ctx, cx, topY, cx, botY, busOn, false);
        drawWire(ctx, cx + colW, topY, cx + colW, botY, col.powerOut, false);
        const jc = busOn ? C.WIRE_ON : C.WIRE_OFF;
        for (let ei = 0; ei < nEls; ei++) {
          const emy = y + ei * elH + elH / 2;
          ctx.beginPath(); ctx.arc(cx, emy, 3, 0, Math.PI * 2);
          ctx.fillStyle = jc; ctx.fill();
          const rOn = col.elements[ei].energized && col.powerOut;
          ctx.beginPath(); ctx.arc(cx + colW, emy, 3, 0, Math.PI * 2);
          ctx.fillStyle = rOn ? C.WIRE_ON : C.WIRE_OFF; ctx.fill();
        }
      }

      for (let ei = 0; ei < nEls; ei++) {
        const el  = col.elements[ei];
        const ely = y + ei * elH;
        const on  = el.energized && col.powerOut;

        this._drawElement(ctx, el, cx, ely, colW, elH, on, rung, col);

        this.hitAreas.push({
          x: cx, y: ely, w: colW, h: elH,
          rungId: rung.id, branchId: branch.id, colId: col.id, elId: el.id, kind: 'element',
        });
      }

      // Selection highlight
      if (this.selected) {
        for (const el of col.elements) {
          if (this.selected.elId === el.id) {
            const ei = col.elements.indexOf(el);
            const ely = y + ei * elH;
            ctx.strokeStyle = C.CYAN;
            ctx.lineWidth   = 2;
            ctx.setLineDash([4, 3]);
            ctx.strokeRect(cx + 2, ely + 2, colW - 4, elH - 4);
            ctx.setLineDash([]);
          }
        }
      }

      cx += colW;
    }

    // Wire from last column to output area
    drawWire(ctx, cx, my, endX, my, branch.powerOut);

    // Add-element hit area
    this.hitAreas.push({
      x: cx, y, w: Math.max(endX - cx, 30), h,
      rungId: rung.id, branchId: branch.id, colId: -1, elId: -1, kind: 'add_here',
    });
  }

  _drawOutputPlaceholder(ctx, x, y, w, h) {
    const mx = x + w / 2;
    const my = y + h / 2;

    ctx.strokeStyle = '#1a2d50';
    ctx.lineWidth   = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.arc(mx, my, 14, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle    = '#2a4a6a';
    ctx.font         = 'bold 16px Courier New';
    ctx.textAlign    = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('+', mx, my);
    ctx.textBaseline = 'alphabetic';

    ctx.fillStyle = '#1a3a5a';
    ctx.font      = '8px Courier New';
    ctx.fillText('SALIDA', mx, my + 22);
  }

  _drawElement(ctx, el, x, y, w, h, on, rung, col) {
    const { type, tag } = el;

    if (isFuncBlock(type)) {
      this._drawFBElement(ctx, el, x, y, w, h, on, rung);
      return;
    }

    switch (type) {
      case ET.NO:    drawNO(ctx, x, y, w, h, on, tag);           break;
      case ET.NC:    drawNC(ctx, x, y, w, h, on, tag);           break;
      case ET.P:     drawEdgeContact(ctx, x, y, w, h, on, tag, true);  break;
      case ET.N:     drawEdgeContact(ctx, x, y, w, h, on, tag, false); break;
      default: {
        ctx.strokeStyle = on ? C.EL_BORDER_LIT : C.EL_BORDER;
        ctx.lineWidth   = 1;
        ctx.strokeRect(x + 10, y + h/2 - 12, w - 20, 24);
        ctx.fillStyle  = on ? C.TEXT_LIT : C.TEXT;
        ctx.font       = '10px Courier New';
        ctx.textAlign  = 'center';
        ctx.fillText(type + ' ' + tag, x + w / 2, y + h / 2 + 4);
      }
    }
  }

  _drawFBElement(ctx, el, x, y, w, h, on, rung) {
    const { type, tag, preset } = el;
    const isTimer = TIMERS.has(type);
    const isCnt   = COUNTERS.has(type);
    const inst    = isTimer ? this.engine.getTimerInst(el)
                  : isCnt   ? this.engine.getCntInst(el) : null;

    const FBW = 120;
    const FBH = Math.max(h - 8, 70);
    const bx  = x + (w - FBW) / 2;
    const by  = y + (h - FBH) / 2;
    const mid = y + h / 2;

    drawWire(ctx, x, mid, bx, mid, on);
    const q = inst ? inst.Q : false;
    drawWire(ctx, bx + FBW, mid, x + w, mid, q);

    const litBd = on ? C.FB_BORDER_LIT : C.FB_BORDER;
    if (on) setGlow(ctx, C.PURPLE, 10);
    ctx.fillStyle   = on ? C.FB_LIT : C.FB_BG;
    ctx.strokeStyle = litBd;
    ctx.lineWidth   = on ? 2 : 1;
    rrect(ctx, bx, by, FBW, FBH, 4);
    ctx.fill(); ctx.stroke();
    clearGlow(ctx);

    ctx.fillStyle = on ? '#2a1060' : '#180840';
    ctx.beginPath();
    ctx.rect(bx + 1, by + 1, FBW - 2, 16);
    ctx.fill();
    ctx.fillStyle = on ? C.PURPLE : '#6040b0';
    ctx.font      = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(type, bx + FBW / 2, by + 12);

    ctx.fillStyle = on ? '#c080ff' : '#5030a0';
    ctx.font      = '9px Courier New';
    ctx.fillText(tag, bx + FBW / 2, by + 22);

    const leftPins  = isTimer
      ? [`IN`, `PT:${preset}ms`]
      : [type === 'CTD' ? 'CD' : 'CU', `R:${el.resetTag||'0'}`, `PV:${preset}`];
    const rightPins = isTimer
      ? [`Q`, `ET:${inst ? Math.round(inst.ET) : 0}ms`]
      : [`Q`, `CV:${inst ? inst.CV : 0}`];

    const innerH = FBH - 26;
    const pinPad = innerH / (Math.max(leftPins.length, rightPins.length) + 1);

    leftPins.forEach((lbl, i) => {
      const py = by + 26 + pinPad * (i + 1) - pinPad / 2;
      const lit = i === 0 && on;
      ctx.fillStyle  = lit ? C.GREEN : C.TEXT;
      ctx.font       = '8px Courier New';
      ctx.textAlign  = 'left';
      ctx.fillText(lbl, bx + 5, py + 3);
      ctx.beginPath(); ctx.arc(bx, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = lit ? C.WIRE_ON : C.EL_BORDER;
      ctx.fill();
    });

    rightPins.forEach((lbl, i) => {
      const py = by + 26 + pinPad * (i + 1) - pinPad / 2;
      const lit = i === 0 && q;
      ctx.fillStyle  = lit ? C.GREEN : C.TEXT;
      ctx.font       = '8px Courier New';
      ctx.textAlign  = 'right';
      ctx.fillText(lbl, bx + FBW - 5, py + 3);
      ctx.beginPath(); ctx.arc(bx + FBW, py, 2.5, 0, Math.PI * 2);
      ctx.fillStyle = lit ? C.WIRE_ON : C.EL_BORDER;
      ctx.fill();
    });

    if (inst && inst.progress >= 0) {
      const bpx = bx + 6, bpw = FBW - 12, bph = 5, bpy = by + FBH - 9;
      ctx.fillStyle = '#080414'; ctx.fillRect(bpx, bpy, bpw, bph);
      ctx.fillStyle = on ? '#6030c0' : '#301060';
      ctx.fillRect(bpx, bpy, bpw * inst.progress, bph);
      ctx.strokeStyle = litBd; ctx.lineWidth = 1;
      ctx.strokeRect(bpx, bpy, bpw, bph);
    }
  }

  _drawOutput(ctx, el, x, y, w, h, on, rung) {
    const { type, tag } = el;

    if (isFuncBlock(type)) {
      this._drawFBElement(ctx, el, x, y, w, h, on, rung);
      return;
    }

    switch (type) {
      case ET.COIL:  drawCoil(ctx, x, y, w, h, on, tag, '');  break;
      case ET.SET:   drawCoil(ctx, x, y, w, h, on, tag, 'S'); break;
      case ET.RST:   drawCoil(ctx, x, y, w, h, on, tag, 'R'); break;
      case ET.NCOIL: drawCoil(ctx, x, y, w, h, on, tag, '/'); break;
      default:       drawCoil(ctx, x, y, w, h, on, tag, '');  break;
    }
  }

  getHitAt(px, py) {
    for (let i = this.hitAreas.length - 1; i >= 0; i--) {
      const a = this.hitAreas[i];
      if (px >= a.x && px <= a.x + a.w && py >= a.y && py <= a.y + a.h) {
        return a;
      }
    }
    return null;
  }

  setSelected(sel) { this.selected = sel; }
}

// ─────────────────────────────────────────────────────────────
// TimingRenderer
// ─────────────────────────────────────────────────────────────
class TimingRenderer {
  constructor(canvas, engine) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.engine  = engine;
    this.watches = [];
  }

  setWatches(names) { this.watches = names; }

  render() {
    const ctx    = this.ctx;
    const engine = this.engine;
    const w      = this.canvas.clientWidth  || 600;
    const h      = this.canvas.clientHeight || 130;

    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width  = w;
      this.canvas.height = h;
    }

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#0a0f1e';
    ctx.fillRect(0, 0, w, h);

    const tags = this.watches.length > 0
      ? this.watches
      : engine.getUserTags().slice(0, 6).map(t => t.name);

    if (tags.length === 0) {
      ctx.fillStyle = '#2a3a5a';
      ctx.font      = '11px Courier New';
      ctx.textAlign = 'center';
      ctx.fillText('Sin variables — agrega elementos al ladder', w / 2, h / 2 + 4);
      return;
    }

    const labelW = 70;
    const plotW  = w - labelW - 10;
    const rowH   = Math.min(30, (h - 10) / tags.length);
    const sigH   = rowH * 0.55;

    const COLORS = ['#00e870','#00c8f0','#f0c030','#ff8820','#a060ff','#ff3040'];

    tags.forEach((name, i) => {
      const buf  = engine.history.get(name) || [];
      const cy   = 8 + i * rowH + rowH / 2;
      const col  = COLORS[i % COLORS.length];
      const tag  = engine.tags.get(name);
      const isInt = tag && tag.isInt;

      ctx.fillStyle = col;
      ctx.font      = '9px Courier New';
      ctx.textAlign = 'right';
      ctx.fillText(name, labelW - 4, cy + 4);

      if (tag) {
        const val = tag.isInt ? tag.intValue : (tag.value ? 'ON' : 'OFF');
        ctx.fillStyle = tag.value || tag.intValue ? col : '#2a3a5a';
        ctx.font      = '8px Courier New';
        ctx.fillText(String(val), labelW - 4, cy + 14);
      }

      if (buf.length < 2) return;

      const tMin = buf[0].t;
      const tMax = buf[buf.length - 1].t;
      const tSpan = Math.max(tMax - tMin, 1);

      if (isInt) {
        const maxV = Math.max(...buf.map(p => p.v), 1);
        ctx.beginPath();
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.5;
        buf.forEach((pt, j) => {
          const px = labelW + ((pt.t - tMin) / tSpan) * plotW;
          const py = cy + sigH / 2 - (pt.v / maxV) * sigH;
          j === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
        });
        ctx.stroke();
      } else {
        ctx.strokeStyle = col;
        ctx.lineWidth   = 1.5;
        setGlow(ctx, col, 4);
        ctx.beginPath();

        let prev = buf[0];
        const startX = labelW + 0;
        const highY  = cy - sigH / 2;
        const lowY   = cy + sigH / 2;
        ctx.moveTo(startX, prev.v ? highY : lowY);

        for (let j = 1; j < buf.length; j++) {
          const px = labelW + ((buf[j].t - tMin) / tSpan) * plotW;
          const py = buf[j].v ? highY : lowY;
          if (buf[j].v !== prev.v) {
            const ppx = labelW + ((buf[j - 1].t - tMin) / tSpan) * plotW;
            ctx.lineTo(ppx, prev.v ? highY : lowY);
            ctx.lineTo(ppx, py);
          }
          ctx.lineTo(px, py);
          prev = buf[j];
        }
        ctx.stroke();
        clearGlow(ctx);
      }

      ctx.strokeStyle = '#1a2d50';
      ctx.lineWidth   = 1;
      ctx.setLineDash([2, 4]);
      ctx.beginPath();
      ctx.moveTo(labelW, cy + sigH / 2 + 2);
      ctx.lineTo(w - 8, cy + sigH / 2 + 2);
      ctx.stroke();
      ctx.setLineDash([]);
    });

    ctx.fillStyle = '#2a3a5a';
    ctx.font      = '8px Courier New';
    ctx.textAlign = 'right';
    ctx.fillText('TIEMPO →', w - 4, h - 2);
  }
}
