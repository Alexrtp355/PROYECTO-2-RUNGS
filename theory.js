// ============================================================
// theory.js — Contextual Theory Panel (Microlearning)
// Changes based on the active tool / exercise context
// ============================================================
'use strict';

// ─── Content Database ─────────────────────────────────────────
// Each entry has: objetivo, elemento, simulacion, consejo
// Written for automation students, not programmers.

const THEORY_DB = {

  _intro: {
    objetivo:   'Explorar el entorno Ladder IEC 61131-3 y entender cómo fluye la corriente.',
    elemento:   'El diagrama Ladder imita un circuito eléctrico. La barra izquierda (L1) siempre tiene tensión. La corriente viaja por los contactos hasta llegar a la bobina (salida) en la derecha (L2).',
    simulacion: 'Las líneas verdes brillantes indican corriente activa. Las oscuras, circuito abierto. Pulsa RUN y usa el Monitor para forzar variables ON/OFF con el botón F.',
    consejo:    'Empieza siempre por la izquierda: primero pon los contactos de condición, luego la bobina de salida al final del rung. Lee cada rung como una frase: "SI [condición] ENTONCES [acción]".',
  },

  NO: {
    objetivo:   'Crear la condición de activación más básica: un contacto que cierra cuando la variable vale 1.',
    elemento:   'Contacto NA (Normalmente Abierto). Conduce corriente solo cuando su variable tag = 1. En cableado equivale a un pulsador de marcha o un sensor activo en alto.',
    simulacion: 'En el Monitor, fuerza el tag a 1 (botón F). El contacto se ilumina en verde y la corriente llega a la bobina. Suelta el forzado: el contacto se abre y la bobina se apaga.',
    consejo:    'El nombre del tag es clave. Si el contacto se llama "PB" y la bobina "LAMP", son variables diferentes. La bobina LAMP = 1 cuando el contacto PB = 1.',
  },

  NC: {
    objetivo:   'Usar un contacto que conduce cuando la variable está inactiva (lógica de seguridad).',
    elemento:   'Contacto NC (Normalmente Cerrado). Conduce cuando su variable = 0. Se usa en paros de emergencia, protecciones térmicas y cualquier señal que deba estar presente para continuar.',
    simulacion: 'Arranca la simulación: el NC ya conduce (variable = 0 por defecto). Fuerza el tag a 1 → el contacto se ABRE y corta la corriente. Es el comportamiento contrario al NO.',
    consejo:    '⚠️ Regla de seguridad: los dispositivos de parada (setas de emergencia, finales de carrera de seguridad) se cablean NC. Si el cable se corta, la máquina para. Esto se llama "fail-safe".',
  },

  P: {
    objetivo:   'Detectar el instante exacto en que una señal cambia de 0 a 1 (un solo ciclo de scan).',
    elemento:   'Contacto de Flanco Positivo (Rising Edge). Conduce durante exactamente UN ciclo de scan cuando la variable sube de 0→1. Independientemente de cuánto dure la señal en 1.',
    simulacion: 'Fuerza el tag a 1. Verás el contacto brillar muy brevemente (≈50 ms a velocidad normal). La bobina de salida solo recibirá ese impulso, no una señal sostenida.',
    consejo:    'El flanco P no mantiene la salida. Para acciones persistentes, conecta el flanco a una bobina SET. Así el pulso activa el latch y la salida queda encendida.',
  },

  N: {
    objetivo:   'Detectar el instante exacto en que una señal cambia de 1 a 0.',
    elemento:   'Contacto de Flanco Negativo (Falling Edge). Conduce durante UN solo ciclo de scan cuando la variable baja de 1→0. Equivale a detectar la "suelta" de un pulsador.',
    simulacion: 'Fuerza el tag a 1, luego libera el forzado (ctrl+click en F). En el momento de la bajada, el flanco N se activa brevemente. El diagrama de tiempo lo muestra como un pulso estrecho.',
    consejo:    'Los flancos se usan para disparar acciones puntuales: registrar eventos, incrementar contadores, cambiar de paso en una secuencia. No los uses donde necesites señal continua.',
  },

  COIL: {
    objetivo:   'Controlar una salida digital (motor, válvula, indicador) desde un rung.',
    elemento:   'Bobina de salida (COIL). Escribe el estado del rung en el tag: si el rung conduce → tag = 1. Si no conduce → tag = 0. Se actualiza en CADA ciclo de scan.',
    simulacion: 'La bobina se ilumina verde cuando su rung tiene corriente. El tag aparece como "ON" en el Monitor. Si la condición desaparece, la bobina se apaga en el siguiente ciclo.',
    consejo:    'No uses el mismo tag en dos bobinas COIL distintas: el segundo rung sobrescribirá al primero. Si necesitas controlar la misma variable desde varios rungs, usa SET/RESET.',
  },

  SET: {
    objetivo:   'Memorizar que una condición ocurrió, aunque esa condición ya no esté activa.',
    elemento:   'Bobina SET (enclavamiento). Cuando el rung conduce, pone tag = 1 y lo MANTIENE aunque el rung deje de conducir. El valor no cambia hasta que un RST lo borre.',
    simulacion: 'Activa la entrada brevemente (un instante) y suéltala. El tag del SET queda en 1 en el Monitor. Prueba a apagar el motor de simulación y volver a arrancar: el tag sigue en 1.',
    consejo:    'SET siempre va en pareja con RST. El SET enciende, el RST apaga. Diseña primero el rung de "MARCHA" (SET) y luego el de "PARO" (RST) con condiciones diferentes.',
  },

  RST: {
    objetivo:   'Apagar una variable que fue activada con SET.',
    elemento:   'Bobina RESET. Cuando el rung conduce, pone tag = 0. Trabaja con SET para crear enclavamiento controlado. Es el equivalente al botón de paro en un circuito de relés.',
    simulacion: 'Si tienes un SET activo (tag = 1 en Monitor), energiza el rung RST. El tag pasa a 0. El SET en su rung no puede reactivarlo hasta que vuelva a conducir.',
    consejo:    '⚠️ Si SET y RST del mismo tag conducen en el MISMO ciclo de scan, el RST gana (se evalúa después). Diseña la lógica para que nunca ocurra a la vez.',
  },

  NCOIL: {
    objetivo:   'Obtener la señal invertida de un rung sin necesidad de contactos adicionales.',
    elemento:   'Bobina Negada (NOT COIL). Escribe el valor contrario del rung: si el rung conduce → tag = 0. Si no conduce → tag = 1. Útil para señales "activas en bajo" (salidas a relé NC).',
    simulacion: 'Cuando el rung no tiene corriente (estado inicial), el tag del NCOIL ya vale 1 en el Monitor. Al activar el rung, el tag pasa a 0. Es el inverso del COIL normal.',
    consejo:    'No confundas NCOIL (salida) con contacto NC (entrada). Son elementos de categorías distintas: NC es condición, NCOIL es acción.',
  },

  TON: {
    objetivo:   'Activar una salida después de que una condición lleva activa un tiempo determinado.',
    elemento:   'TON (Timer On-Delay / Retardo de conexión). IN = rung power. Mientras IN = 1, cuenta milisegundos en ET. Cuando ET ≥ PT (preset), Q = 1. Si IN cae a 0, ET se reinicia.',
    simulacion: 'Activa la entrada del TON. Observa la barra de progreso crecer. Cuando llega al 100% (ET = PT), Q se activa. Ajusta PT en el modal de propiedades para cambiar el tiempo.',
    consejo:    'La salida Q del timer se lee en otros rungs como tag "T1.Q" (contacto NO). El timer vive como SALIDA de un rung; su Q se usa como ENTRADA en otro rung diferente.',
  },

  TOF: {
    objetivo:   'Mantener una salida activa durante un tiempo después de que la condición desaparece.',
    elemento:   'TOF (Timer Off-Delay / Retardo de desconexión). Q = 1 inmediatamente cuando IN = 1. Cuando IN cae a 0, empieza el conteo. Tras PT ms, Q = 0. Útil para ventiladores de enfriamiento.',
    simulacion: 'Activa IN → Q = 1 inmediatamente. Desactiva IN → la barra de progreso empieza a contar. Q permanece en 1 durante PT ms. Al llegar, Q = 0.',
    consejo:    'El TOF es "al revés" del TON: se activa inmediatamente y tarda en apagarse. Si reseteas IN durante el conteo de desconexión, el timer se cancela y Q vuelve a 1.',
  },

  TP: {
    objetivo:   'Generar un pulso de duración exacta a partir de cualquier señal, larga o corta.',
    elemento:   'TP (Timer Pulse). En el flanco de subida de IN, Q = 1 durante exactamente PT ms sin importar cuánto dure IN. Una señal corta produce un pulso limpio de duración fija.',
    simulacion: 'Activa IN brevemente. Q se pone en 1 por PT ms exactos y se apaga solo. Si activas IN de nuevo DURANTE el pulso, se ignora: el TP no es retriggerable.',
    consejo:    'Usa TP para generar señales de activación con duración controlada: timbre de escuela, pulso de apertura de cerradura eléctrica, señal de habilitación breve.',
  },

  CTU: {
    objetivo:   'Contar eventos repetidos (pulsaciones, piezas, ciclos) hasta un valor predefinido.',
    elemento:   'CTU (Counter Up / Contador ascendente). Cada flanco positivo en CU incrementa CV en 1. Cuando CV ≥ PV (preset), Q = 1. El tag de Reset pone CV = 0.',
    simulacion: 'Cada vez que el rung del CTU conduce (flanco), CV sube 1. Verás el número CV en la caja. Al llegar a PV, Q se activa. Usa un RST o el tag de reset para reiniciar.',
    consejo:    'Siempre diseña la condición de reset. Sin reset, el contador llega a PV y Q queda en 1 para siempre. El reseteo puede ser manual (pulsador) o automático (propio Q del contador).',
  },

  CTD: {
    objetivo:   'Controlar un proceso que debe repetirse un número de veces, contando hacia cero.',
    elemento:   'CTD (Counter Down / Contador descendente). Carga CV = PV con la señal LD. Cada flanco en CD decrementa CV. Cuando CV ≤ 0, Q = 1. Útil para gestión de stock o piezas restantes.',
    simulacion: 'Primero energiza el rung de carga (LD) para que CV = PV. Luego activa CD en cada evento. CV baja. Cuando llega a 0, Q se activa indicando que se ha completado el conteo.',
    consejo:    'Si arrancas sin cargar (LD), CV empieza en 0 y Q ya está activo. Siempre inicializa el CTD con un pulso de carga al arrancar el sistema.',
  },

  CTUD: {
    objetivo:   'Gestionar un proceso con entradas y salidas, donde el contador puede crecer y decrecer.',
    elemento:   'CTUD (Counter Up/Down). CU suma, CD resta. Q activo cuando CV ≥ PV ("lleno"). QD activo cuando CV ≤ 0 ("vacío"). Reset = CV 0, Load = CV PV.',
    simulacion: 'Activa CU repetidamente para incrementar. Activa CD para decrementar. Las dos salidas Q y QD te dan las condiciones de lleno y vacío para controlar el proceso automáticamente.',
    consejo:    'No actives CU y CD a la vez: el resultado puede ser impredecible. Diseña la lógica con interlocks (contactos NC del otro) para que sean mutuamente excluyentes.',
  },

  // ── Contextos especiales ──────────────────────────────────────

  _corriendo: {
    objetivo:   'La simulación está activa — observa cómo fluye la corriente en tiempo real.',
    elemento:   'El PLC ejecuta el ciclo de scan cada ~50 ms: lee entradas, evalúa todos los rungs de arriba a abajo, actualiza salidas. El contador de ciclos en la barra superior lo confirma.',
    simulacion: 'Usa los botones F en el Monitor para forzar variables. La lógica responde en el siguiente ciclo. El diagrama de tiempo (parte inferior) registra el histórico de cada variable.',
    consejo:    'Prueba STEP (paso a paso) para ejecutar un solo ciclo de scan y ver los cambios. Reduce la velocidad de scan (slider) para observar a cámara lenta.',
  },

  _vacio: {
    objetivo:   'Crear tu primer rung completo: una condición que controla una salida.',
    elemento:   'Un rung básico tiene: 1) Contacto (condición) a la izquierda y 2) Bobina (acción) a la derecha. Es como programar la frase "SI [pulsador activo] ENTONCES [enciende la lámpara]".',
    simulacion: 'Pulsa "+ RUNG" para añadir el primer escalón. Luego selecciona "NO Contact" en el panel izquierdo, haz click en el rung, nombra el tag (ej: PB) y repite para la bobina (LAMP).',
    consejo:    'Los nombres de tag son tus variables PLC. Usa nombres descriptivos: PB_MARCHA, LAMP_PILOTO, T_RETARDO. Facilita la lectura del programa a cualquier técnico.',
  },
};

// ─── Panel State ──────────────────────────────────────────────
let _theoryCollapsed = false;
let _currentKey      = '_intro';

// ─── DOM refs (populated after DOMContentLoaded) ──────────────
let _elPanel, _elBody, _elToggle, _elLabel;
let _elObj, _elEl, _elSim, _elCon;

function _initTheoryPanel() {
  _elPanel  = document.getElementById('theory-panel');
  _elBody   = document.getElementById('theory-body');
  _elToggle = document.getElementById('btn-theory-toggle');
  _elLabel  = document.getElementById('theory-context-label');
  _elObj    = document.getElementById('tc-obj-text');
  _elEl     = document.getElementById('tc-el-text');
  _elSim    = document.getElementById('tc-sim-text');
  _elCon    = document.getElementById('tc-con-text');

  if (_elToggle) {
    _elToggle.addEventListener('click', () => {
      _theoryCollapsed = !_theoryCollapsed;
      _elBody.style.display     = _theoryCollapsed ? 'none' : 'grid';
      _elToggle.textContent     = _theoryCollapsed ? '▲' : '▼';
      _elPanel.classList.toggle('collapsed', _theoryCollapsed);
    });
  }
}

// ─── Context labels ───────────────────────────────────────────
const _CONTEXT_LABEL = {
  NO:    'Contacto NA — Normalmente Abierto',
  NC:    'Contacto NC — Normalmente Cerrado',
  P:     'Contacto P — Flanco Positivo ↑',
  N:     'Contacto N — Flanco Negativo ↓',
  COIL:  'Bobina de Salida',
  SET:   'Bobina SET — Enclavamiento ON',
  RST:   'Bobina RESET — Enclavamiento OFF',
  NCOIL: 'Bobina Negada (NOT)',
  TON:   'TON — Temporizador Retardo ON',
  TOF:   'TOF — Temporizador Retardo OFF',
  TP:    'TP — Temporizador Pulso',
  CTU:   'CTU — Contador Ascendente',
  CTD:   'CTD — Contador Descendente',
  CTUD:  'CTUD — Contador Bidireccional',
  _intro:     'Introducción al Ladder IEC 61131-3',
  _corriendo: 'Simulación activa',
  _vacio:     'Primeros pasos',
};

// ─── Public API ───────────────────────────────────────────────

/**
 * Update the theory panel for the given context key.
 * key: element type (NO, NC, TON...) or '_intro' / '_corriendo' / '_vacio'
 */
function updateTheory(key) {
  if (!_elObj) return;  // DOM not ready yet

  const entry = THEORY_DB[key] || THEORY_DB['_intro'];
  _currentKey = key;

  _elLabel.textContent = _CONTEXT_LABEL[key] || 'Ayuda contextual';
  _elObj.textContent   = entry.objetivo;
  _elEl.textContent    = entry.elemento;
  _elSim.textContent   = entry.simulacion;
  _elCon.textContent   = entry.consejo;

  // Accent color by category
  const cat = _getCategoryClass(key);
  _elPanel.dataset.cat = cat;
}

function _getCategoryClass(key) {
  if (['NO','NC','P','N'].includes(key))              return 'contact';
  if (['COIL','SET','RST','NCOIL'].includes(key))     return 'coil';
  if (['TON','TOF','TP'].includes(key))               return 'timer';
  if (['CTU','CTD','CTUD'].includes(key))             return 'counter';
  return 'intro';
}

function theoryOnRunStart()  { updateTheory('_corriendo'); }
function theoryOnRunStop()   { updateTheory(_currentKey === '_corriendo' ? '_intro' : _currentKey); }
function theoryOnEmpty()     { updateTheory('_vacio'); }
function theoryOnTool(type)  { updateTheory(type); }

// ─── Init ─────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  _initTheoryPanel();
  updateTheory('_intro');
});
