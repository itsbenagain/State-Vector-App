// -----------------------------------------------------------------------------
//  DIMENSIONS
// -----------------------------------------------------------------------------

const dimensions = [
  { id: "energy", label: "Energy" },
  { id: "focus", label: "Focus" },
  { id: "money", label: "Money" },
  { id: "relationships", label: "Relationships" },
  { id: "creativeOutput", label: "Creative Output" },
  { id: "skillGrowth", label: "Skill Growth" },
  { id: "health", label: "Health" },
  { id: "environment", label: "Environment" },
  { id: "socialPresence", label: "Social Presence" },
  { id: "opportunities", label: "Opportunities" },
  { id: "chaosLoad", label: "Chaos Load" },
  { id: "longTermTrajectory", label: "Long-term Trajectory" }
];

const STORAGE_HISTORY_KEY = "fieldBoardHistory_v1";
const STORAGE_LAST_STATE_KEY = "fieldBoardLastState_v1";
const STORAGE_LAST_TIME_KEY = "fieldBoardLastTime_v1";

let stateHistory = []; // [{ t, state }]

// DOM refs
let boardEl;
let stateGridEl;
let paramsEl;
let coherenceEl;
let tensionEl;
let dValEl;
let lambdaValEl;
let muValEl;
let timestampEl;
let aiAnalysisEl;

// non-linear shaping helpers
const norm = (v) => v / 5;
const expo = (x, p) => Math.pow(Math.min(Math.max(x, 0), 1), p);

// -----------------------------------------------------------------------------
//  MAIN BOOTSTRAP (runs once, no DOMContentLoaded)
// -----------------------------------------------------------------------------

(function main() {
  // grab DOM
  boardEl = document.getElementById("board");
  stateGridEl = document.getElementById("stateGrid");
  paramsEl = document.getElementById("parameters");
  coherenceEl = document.getElementById("coherenceVal");
  tensionEl = document.getElementById("tensionVal");
  dValEl = document.getElementById("dVal");
  lambdaValEl = document.getElementById("lambdaVal");
  muValEl = document.getElementById("muVal");
  timestampEl = document.getElementById("timestamp");
  aiAnalysisEl = document.getElementById("ai-analysis");

  if (!boardEl || !stateGridEl) {
    console.error("Field board: required DOM nodes missing.");
    return;
  }

  buildSliderCards();
  buildStatePills();
  loadFromStorageOrDefaults();
  attachListeners();
})();

// -----------------------------------------------------------------------------
//  BUILD UI
// -----------------------------------------------------------------------------

function buildSliderCards() {
  dimensions.forEach((dim) => {
    const card = document.createElement("div");
    card.className = "card";

    const title = document.createElement("h3");
    title.textContent = dim.label;
    card.appendChild(title);

    const wrapper = document.createElement("div");
    wrapper.className = "slider-wrapper";

    // ticks 5..0
    const ticks = document.createElement("div");
    ticks.className = "ticks";
    for (let i = 5; i >= 0; i--) {
      const s = document.createElement("span");
      s.textContent = String(i);
      ticks.appendChild(s);
    }

    const slider = document.createElement("input");
    slider.type = "range";
    slider.min = "0";
    slider.max = "5";
    slider.step = "1";
    slider.value = "3";
    slider.id = dim.id;
    slider.className = "slider-vertical";

    const buttons = document.createElement("div");
    buttons.className = "slider-buttons";

    const plusBtn = document.createElement("button");
    plusBtn.type = "button";
    plusBtn.className = "slider-btn plus";
    plusBtn.dataset.id = dim.id;
    plusBtn.textContent = "+";

    const minusBtn = document.createElement("button");
    minusBtn.type = "button";
    minusBtn.className = "slider-btn minus";
    minusBtn.dataset.id = dim.id;
    minusBtn.textContent = "−";

    buttons.appendChild(plusBtn);
    buttons.appendChild(minusBtn);

    wrapper.appendChild(ticks);
    wrapper.appendChild(slider);
    wrapper.appendChild(buttons);

    const valLabel = document.createElement("div");
    valLabel.className = "value-label";
    valLabel.id = dim.id + "-value";
    valLabel.textContent = "3";

    card.appendChild(wrapper);
    card.appendChild(valLabel);
    boardEl.appendChild(card);
  });
}

function buildStatePills() {
  dimensions.forEach((dim) => {
    const pill = document.createElement("div");
    pill.className = "state-pill";

    const nameSpan = document.createElement("span");
    nameSpan.className = "label";
    nameSpan.textContent = dim.label.toUpperCase();

    const valueSpan = document.createElement("span");
    valueSpan.className = "value";
    valueSpan.id = dim.id + "-pill";
    valueSpan.textContent = "3";

    pill.appendChild(nameSpan);
    pill.appendChild(valueSpan);
    stateGridEl.appendChild(pill);
  });
}

// -----------------------------------------------------------------------------
//  STORAGE
// -----------------------------------------------------------------------------

function loadFromStorageOrDefaults() {
  // history
  try {
    const raw = localStorage.getItem(STORAGE_HISTORY_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) stateHistory = parsed;
    }
  } catch {
    stateHistory = [];
  }

  // last state
  let lastState = null;
  let lastTime = Date.now();

  try {
    const rawState = localStorage.getItem(STORAGE_LAST_STATE_KEY);
    if (rawState) {
      const parsed = JSON.parse(rawState);
      if (parsed && typeof parsed === "object") lastState = parsed;
    }
    const rawTime = localStorage.getItem(STORAGE_LAST_TIME_KEY);
    if (rawTime) {
      const t = Number(rawTime);
      if (!Number.isNaN(t)) lastTime = t;
    }
  } catch {
    lastState = null;
  }

  if (lastState) {
    applyStateToSliders(lastState);
    updateUI(lastState, lastTime, { persist: false });
  } else {
    const state = getStateVector();
    const now = Date.now();
    updateUI(state, now, { persist: true });
  }
}

function saveToStorage(state, timestampMs) {
  stateHistory.push({ t: timestampMs, state });
  if (stateHistory.length > 500) stateHistory.shift();

  try {
    localStorage.setItem(STORAGE_HISTORY_KEY, JSON.stringify(stateHistory));
    localStorage.setItem(STORAGE_LAST_STATE_KEY, JSON.stringify(state));
    localStorage.setItem(STORAGE_LAST_TIME_KEY, String(timestampMs));
  } catch {
    // ignore
  }
}

// -----------------------------------------------------------------------------
//  LISTENERS
// -----------------------------------------------------------------------------

function attachListeners() {
  // sliders
  dimensions.forEach((dim) => {
    const slider = document.getElementById(dim.id);
    if (!slider) return;
    slider.addEventListener("input", handleSliderChange);
  });

  // +/- buttons
  const btns = boardEl.querySelectorAll(".slider-btn");
  btns.forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.id;
      if (!id) return;
      const slider = document.getElementById(id);
      if (!slider) return;
      let value = Number(slider.value);
      if (btn.classList.contains("plus")) value += 1;
      if (btn.classList.contains("minus")) value -= 1;
      if (value < 0) value = 0;
      if (value > 5) value = 5;
      slider.value = String(value);
      handleSliderChange();
    });
  });
}

function handleSliderChange() {
  const state = getStateVector();
  const now = Date.now();
  updateUI(state, now, { persist: true });
}

// -----------------------------------------------------------------------------
//  STATE / PARAMETERS
// -----------------------------------------------------------------------------

function getStateVector() {
  const state = {};
  dimensions.forEach((d) => {
    const el = document.getElementById(d.id);
    const v = el ? parseInt(el.value, 10) : 0;
    state[d.id] = Number.isNaN(v) ? 0 : v;
  });
  return state;
}

function applyStateToSliders(state) {
  dimensions.forEach((d) => {
    const slider = document.getElementById(d.id);
    if (!slider) return;
    const v = state[d.id];
    if (typeof v === "number" && v >= 0 && v <= 5) {
      slider.value = String(v);
    }
  });
}

function computeParameters(state) {
  const {
    energy,
    focus,
    money,
    relationships,
    creativeOutput,
    skillGrowth,
    health,
    environment,
    socialPresence,
    opportunities,
    chaosLoad,
    longTermTrajectory
  } = state;

  const ne = expo(norm(energy), 1.1);
  const nf = expo(norm(focus), 1.2);
  const nm = expo(norm(money), 1.1);
  const nr = expo(norm(relationships), 1.15);
  const nco = expo(norm(creativeOutput), 1.25);
  const nsg = expo(norm(skillGrowth), 1.2);
  const nh = expo(norm(health), 1.1);
  const nen = expo(norm(environment), 1.2);
  const nsp = expo(norm(socialPresence), 1.1);
  const nop = expo(norm(opportunities), 1.15);
  const ncl = expo(norm(chaosLoad), 1.1);
  const nlt = expo(norm(longTermTrajectory), 1.2);

  // D (diffusion / instability)
  let D =
    0.45 * (1 - nf) +
    0.35 * (1 - nsg) +
    0.35 * (1 - nen) +
    0.7 * ncl;

  // λ (attractor strength)
  let lambda =
    0.25 * ne +
    0.18 * nm +
    0.18 * nr +
    0.12 * nop +
    0.10 * nsp +
    0.09 * nh +
    0.08 * nlt;

  // μ (aliasing / inversion coupling)
  let mu =
    0.45 * nco +
    0.30 * ncl +
    0.25 * nlt;

  // Clamp ranges
  D = Math.max(0, Math.min(1.8, D));
  lambda = Math.max(0, Math.min(1.5, lambda));
  mu = Math.max(0, Math.min(1.5, mu));

  // Coherence
  const constructiveAvg =
    (ne +
      nf +
      nm +
      nr +
      nco +
      nsg +
      nh +
      nen +
      nsp +
      nop +
      nlt) /
    11;

  let coherence =
    0.6 * constructiveAvg +
    0.2 * nlt +
    0.15 * (lambda / 1.5) -
    0.35 * ncl -
    0.25 * (D / 1.8);

  coherence = Math.max(0, Math.min(1, coherence));
  const coherencePercent = Math.round(coherence * 100);

  // Trajectory tension
  const Dterm = 1 - D / 1.8;

  let tension =
    0.55 * (lambda / 1.5) +
    0.35 * (mu / 1.5) +
    0.10 * Dterm;

  tension = Math.max(0, Math.min(1.4, tension));
  const tensionScale = Math.round((tension / 1.4) * 100);

  return { D, lambda, mu, coherencePercent, tensionScale };
}

// -----------------------------------------------------------------------------
//  UI UPDATE
// -----------------------------------------------------------------------------

function updateUI(state, timestampMs, { persist }) {
  // Labels & pills
  dimensions.forEach((d) => {
    const v = state[d.id];
    const labelEl = document.getElementById(d.id + "-value");
    const pillEl = document.getElementById(d.id + "-pill");
    if (labelEl) labelEl.textContent = String(v);
    if (pillEl) pillEl.textContent = String(v);
  });

  const { D, lambda, mu, coherencePercent, tensionScale } =
    computeParameters(state);

  const Df = D.toFixed(3);
  const lf = lambda.toFixed(3);
  const muf = mu.toFixed(3);

  if (paramsEl) {
    paramsEl.textContent =
      `i ∂ψ/∂t (t, z) = − ${Df} ∇†_z ∇_z ψ(t, z)` +
      ` + (${lf} / |z|²) ψ(t, z)` +
      ` + ${muf} ψ*(t, 1/z)`;
  }

  if (coherenceEl) coherenceEl.textContent = coherencePercent + " %";
  if (tensionEl) tensionEl.textContent = tensionScale + " %";
  if (dValEl) dValEl.textContent = Df;
  if (lambdaValEl) lambdaValEl.textContent = lf;
  if (muValEl) muValEl.textContent = muf;

  if (timestampEl) {
    const date = new Date(timestampMs);
    timestampEl.textContent =
      "Last change: " +
      date.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit"
      });
  }

  if (persist) {
    saveToStorage(state, timestampMs);
  }

  updateAIAnalysis(state, { D, lambda, mu, coherencePercent, tensionScale });
}

// -----------------------------------------------------------------------------
//  "AI" ANALYSIS (LOCAL)
// -----------------------------------------------------------------------------

function updateAIAnalysis(state, params) {
  if (!aiAnalysisEl) return;

  const { D, lambda, mu, coherencePercent } = params;
  const chaosLevel = normalizeChaos(state.chaosLoad);

  let coherenceText;
  if (coherencePercent >= 80) {
    coherenceText = "highly coherent and phase-aligned.";
  } else if (coherencePercent >= 55) {
    coherenceText = "moderately coherent with room to sharpen alignment.";
  } else if (coherencePercent >= 35) {
    coherenceText = "fragmented, with multiple sub-trajectories competing.";
  } else {
    coherenceText = "near decoherence — priorities are pulling in many directions at once.";
  }

  let chaosText;
  if (chaosLevel <= 0.2) {
    chaosText = "Chaos load is very low; system is calm and under-driven.";
  } else if (chaosLevel <= 0.45) {
    chaosText = "Chaos load is in a healthy stimulation band.";
  } else if (chaosLevel <= 0.7) {
    chaosText = "Chaos is elevated; bandwidth is being eaten by overhead.";
  } else {
    chaosText = "Chaos dominates — diffusion is likely to override intention unless simplified.";
  }

  let Dtext;
  if (D < 0.4) {
    Dtext = "Diffusion D is low: trajectories are tight and stable.";
  } else if (D < 0.9) {
    Dtext = "Diffusion D is moderate: exploration and drift are both active.";
  } else {
    Dtext = "Diffusion D is high: the field is in an exploratory / noisy regime.";
  }

  let lambdaText;
  if (lambda > 1.1) {
    lambdaText = "λ is strong, so attractors are well-defined and can pull you back onto track.";
  } else if (lambda > 0.5) {
    lambdaText = "λ is moderate; attractors exist but can be overridden by chaos or drift.";
  } else {
    lambdaText = "λ is weak; no clear attractor, so the system will feel more open-ended and ambiguous.";
  }

  let muText;
  if (mu > 1.0) {
    muText =
      "μ is high: inversion / re-interpretation is strong — expect reframing, aliasing of identity, and non-linear jumps.";
  } else if (mu > 0.5) {
    muText =
      "μ is moderate: some inversion and aliasing, but not enough to fully flip the narrative.";
  } else {
    muText =
      "μ is low: the field is reading mostly in a direct, literal mode with minimal aliasing.";
  }

  aiAnalysisEl.textContent =
    `Current field read: the configuration is ${coherenceText} ` +
    `${chaosText} ${Dtext} ${lambdaText} ${muText}`;
}

function normalizeChaos(chaosVal) {
  const v = Number(chaosVal) || 0;
  const n = v / 5;
  if (n < 0) return 0;
  if (n > 1) return 1;
  return n;
}
