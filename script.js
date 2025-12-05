// ------------------------
//  DIMENSIONS
// ------------------------

const DIMENSIONS = [
  "Energy",
  "Focus",
  "Money",
  "Relationships",
  "Creative_Output",
  "Skill_Growth",
  "Health",
  "Environment",
  "Social_Presence",
  "Opportunities",
  "Chaos_Load",
  "Long_term_Trajectory"
];

let stateHistory = [];          // All samples {t, x}
let currentParams = {};         // {D, lambda, mu, coherence, tension}


// ------------------------
//  LOAD / SAVE HISTORY
// ------------------------

function loadHistory() {
  const raw = localStorage.getItem("stateVectorHistory");
  if (!raw) return;
  try {
    stateHistory = JSON.parse(raw);
  } catch {
    stateHistory = [];
  }
}

function saveHistory() {
  localStorage.setItem("stateVectorHistory", JSON.stringify(stateHistory));
}

loadHistory();


// ------------------------
//  BUILD THE UI (sliders)
// ------------------------

function makeBoard() {
  const board = document.getElementById("board");

  DIMENSIONS.forEach(id => {
    const box = document.createElement("div");
    box.className = "slider-box";

    box.innerHTML = `
      <h3>${id.replace(/_/g, " ")}</h3>
      <input id="${id}" class="slider" type="range" min="0" max="5" step="1" value="3"/>
    `;

    board.appendChild(box);
  });

  // Add listeners
  DIMENSIONS.forEach(id => {
    document.getElementById(id).addEventListener("input", logCurrentState);
  });
}

makeBoard();


// ------------------------
//  READ & LOG STATE VECTOR
// ------------------------

function readStateVector() {
  return DIMENSIONS.map(id => Number(document.getElementById(id).value));
}

function logCurrentState() {
  const t = Date.now();
  const x = readStateVector();

  stateHistory.push({ t, x });
  saveHistory();

  updateDynamicParameters();
  renderStateVector();
}


// ------------------------
//  PARAMETER CALCULATION
// ------------------------

function updateDynamicParameters() {
  if (stateHistory.length === 0) return;

  const now = Date.now();
  const windowMs = 24 * 60 * 60 * 1000; // 24 hours

  const recent = stateHistory.filter(p => now - p.t <= windowMs);
  if (recent.length === 0) return;

  const { x: xNow } = recent[recent.length - 1];
  const maxVal = 5;

  // Coherence = average slider value / max
  const avg = xNow.reduce((a, b) => a + b, 0) / xNow.length;
  const coherence = avg / maxVal;

  // Chaos load = Chaos_Load dimension index 10
  const chaos = xNow[10] / maxVal;

  // Jitter = |Δx| per Δt
  let jitterSum = 0;
  let dtCount = 0;

  for (let i = 1; i < recent.length; i++) {
    const prev = recent[i - 1];
    const cur = recent[i];
    const dt = (cur.t - prev.t) / 1000;
    if (dt <= 0) continue;

    const dx = cur.x.reduce((acc, v, k) => acc + Math.abs(v - prev.x[k]), 0) / cur.x.length;
    jitterSum += dx / dt;
    dtCount++;
  }

  const jitter = dtCount ? jitterSum / dtCount : 0;

  // Map into D, λ, μ
  const D = 0.1 + 0.9 * (jitter / 5);
  const lambda = 0.2 + 0.8 * (1 - chaos);
  const mu = 0.1 + 0.9 * (1 - coherence);

  currentParams = { D, lambda, mu, coherence, tension: chaos };

  renderFeedback();
  renderEquationLive();
}


// ------------------------
//  RENDERING
// ------------------------

function renderStateVector() {
  const el = document.getElementById("state-vector-display");

  if (stateHistory.length === 0) return;
  const { x } = stateHistory[stateHistory.length - 1];

  el.textContent = `State Vector: [${x.map((v, i) => `${DIMENSIONS[i]}=${v}`).join(", ")}]`;
}

function renderFeedback() {
  const el = document.getElementById("field-feedback");
  const { D, lambda, mu, coherence, tension } = currentParams;

  el.textContent =
    `Coherence: ${(coherence * 100).toFixed(1)}% | ` +
    `Chaos: ${(tension * 100).toFixed(1)}% | ` +
    `D = ${D.toFixed(3)} | λ = ${lambda.toFixed(3)} | μ = ${mu.toFixed(3)}`;
}

function renderEquationLive() {
  const el = document.getElementById("equation-live");
  const { D, lambda, mu } = currentParams;

  el.textContent =
    `i ∂ψ/∂t (t,z) = - ${D.toFixed(3)} ∇ᵗ_z ∇_z ψ(t,z) + ` +
    `(${lambda.toFixed(3)} / |z|²) ψ(t,z) + ` +
 function makeBoard() {
  const board = document.getElementById("board");

  DIMENSIONS.forEach(id => {
    const box = document.createElement("div");
    box.className = "slider-box";

    box.innerHTML = `
      <h3>${id.replace(/_/g, " ")}</h3>
      <div class="slider-wrapper">
        <div class="ticks">
          <span>5</span>
          <span>4</span>
          <span>3</span>
          <span>2</span>
          <span>1</span>
          <span>0</span>
        </div>
        <input id="${id}" class="slider" type="range" min="0" max="5" step="1" value="3" />
      </div>
    `;

    board.appendChild(box);
  });

  // listeners
  DIMENSIONS.forEach(id => {
    document.getElementById(id).addEventListener("input", logCurrentState);
  });
}
