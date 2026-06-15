// ── Ladder Logic Engine ──────────────────────────────────────────────────────
// Implements: PB → ONS (one-shot) → PULSE coil
//             PULSE + SET → LAMP (latched)
//             PULSE(falling) + LAMP → RESET LAMP (HOLD rung)

const State = {
  // physical inputs
  PB: false,
  PB_prev: false,

  // internal bits
  PULSE: false,
  LAMP: false,

  // one-shot internal latch
  ONS_armed: true,   // true = ready to fire on next rising edge

  // edge detection for falling-edge rung
  PULSE_prev: false,
};

// One scan of the ladder
function scan() {
  const pb = State.PB;
  const pb_prev = State.PB_prev;

  // ── Rung 1: PB ──[ ]── ONS ──[P]── ( PULSE ) ──────────────────────────────
  // ONS fires on rising edge of PB, produces one-scan PULSE
  const rising_PB = pb && !pb_prev;

  let pulse_coil = false;
  if (rising_PB && State.ONS_armed) {
    pulse_coil = true;
    State.ONS_armed = false;   // disarm until PB released
  }
  if (!pb) {
    State.ONS_armed = true;    // re-arm when PB goes low
  }

  // ── Rung 2: PULSE ──[ ]── SET ──/LAMP/─ ( LAMP ) ──────────────────────────
  // SET: if PULSE fires, latch LAMP on
  // The rung has PULSE contact + SET coil → LAMP stays SET
  if (pulse_coil) {
    State.LAMP = true;
  }

  // ── Rung 3: PULSE(↓) ──[ ]── LAMP ──[ ]── (RESET LAMP) ───────────────────
  // Falling edge of PULSE (but PULSE is only 1 scan, so use falling edge of PB
  // mapped to: when PB releases AND LAMP is on → reset LAMP after hold
  const falling_PB = !pb && pb_prev;
  if (falling_PB && State.LAMP) {
    State.LAMP = false;
  }

  // Commit
  State.PULSE = pulse_coil;
  State.PB_prev = pb;
}

// Power-flow queries for renderer (which rung segments are energised)
function powerFlow() {
  const pb   = State.PB;
  const ons  = State.PULSE;    // ONS contact closed when PULSE is on
  const pulse = State.PULSE;
  const lamp  = State.LAMP;

  return {
    // Rung 1
    r1_after_pb:  pb,
    r1_after_ons: pulse,
    r1_coil_on:   pulse,

    // Rung 2 (SET branch)
    r2_after_pulse: pulse,
    r2_coil_on:     lamp,

    // Rung 3 (HOLD / RESET branch)
    r3_lamp_contact: lamp,   // LAMP NC or NO depending on design — used for HOLD
    r3_coil_on:      false,  // just visual HOLD label

    // output side symbols
    out_pb:   pb,
    out_lamp: lamp,
  };
}
