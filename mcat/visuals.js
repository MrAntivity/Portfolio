import { safeText as h } from "./model.mjs?v=quest-1";
export function flowVisual(v) {
  return `<figure class="visual"><div class="flow">${(v?.nodes || []).map((x, i) => (i ? '<span class="flow-arrow" aria-hidden="true">→</span>' : "") + `<div class="flow-node">${h(typeof x === "object" ? x.label || JSON.stringify(x) : x)}</div>`).join("")}</div><figcaption>${h(v?.caption || "Follow the relationship from left to right.")}</figcaption></figure>`;
}
export function labHTML(subject) {
  const configs = {
    biochemistry: [
      "Enzyme kinetics",
      "Substrate concentration [S] / Kₘ",
      1,
      20,
      4,
    ],
    general: ["Acid–base explorer", "pH", 0, 14, 7],
    physics: ["Force & acceleration", "Net force (N)", 0, 100, 20],
    biology: [
      "Membrane transport",
      "Outside solute concentration (relative units)",
      1,
      10,
      3,
    ],
    behavioral: [
      "Correlation is not causation",
      "Trend direction and slope",
      -10,
      10,
      6,
    ],
    organic: ["Reaction energy", "Activation barrier (kJ/mol)", 20, 100, 60],
    cars: [
      "Argument strength",
      "How strongly does the evidence support the claim?",
      0,
      3,
      1,
    ],
  };
  const c = configs[subject] || configs.biochemistry;
  return `<section class="visual lab" data-subject="${h(subject)}"><span class="step-tag">INTERACTIVE CONCEPT LAB · ${h(c[0])}</span><p class="report-note">A subject-level model to explore alongside this lesson.</p><label>${h(c[1])}<input type="range" id="lab-range" min="${c[2]}" max="${c[3]}" value="${c[4]}"></label><div id="lab-display" aria-live="polite"></div></section>`;
}
export function bindLab() {
  const input = document.querySelector("#lab-range");
  if (!input) return;
  const subject = input.closest(".lab").dataset.subject;
  const update = () => {
    const n = +input.value,
      el = document.querySelector("#lab-display");
    let graphic = "",
      result = "",
      text = "";
    if (subject === "biochemistry") {
      const y = n / (1 + n);
      graphic = plot(
        Array.from({ length: 41 }, (_, i) => [i / 2, i / 2 / (1 + i / 2)]),
        n,
        y,
        "[S] / Kₘ",
        "v / Vmax",
        20,
        1,
      );
      result = `v = ${Math.round(y * 100)}% of Vmax`;
      text =
        "Michaelis–Menten model: v = Vmax[S] / (Kₘ + [S]). At [S] = Kₘ, velocity is half of Vmax. Adding substrate has diminishing returns as active sites become occupied.";
    } else if (subject === "general") {
      graphic = `<div style="height:22px;border-radius:7px;background:linear-gradient(90deg,#dc7a6b,#dfdf9c,#6b98bd);position:relative;margin:24px 0"><span style="position:absolute;left:${(n / 14) * 96}%;top:-8px;color:var(--ink)">▼</span></div>`;
      result = `pH ${n} · [H⁺] = 10⁻${n} M`;
      text = `At 25°C, pOH = ${14 - n}. Each increase of one pH unit means ten times less H⁺. Neutral water has pH 7 at 25°C; the neutral pH changes with temperature.`;
    } else if (subject === "physics") {
      graphic = `<svg viewBox="0 0 420 100" role="img" aria-label="A force arrow acts on a two kilogram block"><path d="M20 85H400" stroke="currentColor"/><rect x="130" y="25" width="70" height="60" rx="7" fill="#bdd3a5"/><text x="165" y="62" text-anchor="middle" fill="#25352d">2 kg</text><path d="M200 50h${n * 1.7 + 10}l-10 -6m10 6l-10 6" stroke="#56845c" fill="none" stroke-width="3"/></svg>`;
      result = `a = ${n} N ÷ 2 kg = ${n / 2} m/s²`;
      text =
        "Newton’s second law uses net force, after all forces have been combined. Doubling the net force doubles acceleration when mass is fixed. Zero net force means constant velocity, not necessarily rest.";
    } else if (subject === "biology") {
      graphic = `<div class="flow"><div class="flow-node">Inside<br>5 solute units</div><span class="flow-arrow">${n < 5 ? "←" : n > 5 ? "→" : "⇄"}</span><div class="flow-node">Outside<br>${n} solute units</div></div>`;
      result =
        n === 5
          ? "No net water flow"
          : n > 5
            ? "Water leaves the cell"
            : "Water enters the cell";
      text =
        "Assume equal pressure and a membrane permeable to water but not the solute. Water moves toward the higher effective solute concentration. Real tonicity depends on nonpenetrating solutes.";
    } else if (subject === "behavioral") {
      graphic = plot(
        Array.from({ length: 12 }, (_, i) => [
          i,
          (n / 10) * (i - 5.5) + 6 + (i % 2 ? 0.5 : -0.5),
        ]),
        0,
        0,
        "Variable X",
        "Variable Y",
        12,
        12,
        true,
      );
      result =
        n === 0
          ? "No systematic trend"
          : n > 0
            ? "Positive association"
            : "Negative association";
      text =
        "A scatterplot can show direction and strength of association, but does not establish causation. A third variable, reverse causality, or selection bias may explain the relationship. Ask whether assignment was randomized.";
    } else if (subject === "organic") {
      graphic = plot(
        [
          [0, 0.2],
          [2, 0.2],
          [4, n / 100],
          [6, 0.1],
          [10, 0.1],
        ],
        4,
        n / 100,
        "Reaction coordinate",
        "Relative energy",
        10,
        1,
      );
      result = `Activation barrier setting: ${n} kJ/mol`;
      text =
        "This qualitative energy profile has products lower in energy than reactants. A catalyst lowers the activation barrier and accelerates both directions; it does not change ΔG or the equilibrium constant. The slider changes the barrier, not product energy.";
    } else {
      const claims = [
        "No evidence",
        "A few selected examples",
        "A representative comparison",
        "A controlled test of this specific claim",
      ];
      graphic = `<div class="flow"><div class="flow-node">Evidence</div><span class="flow-arrow">→</span><div class="flow-node">Inference</div><span class="flow-arrow">→</span><div class="flow-node">Claim</div></div>`;
      result = claims[n];
      text =
        "Example claim: “Reading groups improve reading scores.” Ask what the evidence can support, who was studied, and what alternatives remain. Even a controlled study does not justify “always” or “for everyone.” In CARS, judge the author’s argument using passage evidence.";
    }
    el.innerHTML =
      graphic +
      `<div class="interactive-output">${result}</div><p style="font-size:12px">${text}</p>`;
  };
  input.addEventListener("input", update);
  update();
}
function plot(points, x, y, xlabel, ylabel, xmax, ymax, dots = false) {
  const px = (x) => 45 + (x / xmax) * 330,
    py = (y) => 190 - (y / ymax) * 155;
  return `<svg viewBox="0 0 420 230" role="img" aria-label="${h(ylabel)} versus ${h(xlabel)}"><path d="M45 20V190H390" fill="none" stroke="currentColor" stroke-width="1"/>${dots ? points.map(([a, b]) => `<circle cx="${px(a)}" cy="${py(b)}" r="4" fill="#56845c"/>`).join("") : `<path d="${points.map(([a, b], i) => `${i ? "L" : "M"}${px(a)},${py(b)}`).join(" ")}" fill="none" stroke="#56845c" stroke-width="3"/><circle cx="${px(x)}" cy="${py(y)}" r="6" fill="#a0b650"/>`}<text x="215" y="220" text-anchor="middle" fill="currentColor" font-size="11">${h(xlabel)}</text><text x="12" y="110" transform="rotate(-90,12,110)" text-anchor="middle" fill="currentColor" font-size="11">${h(ylabel)}</text></svg>`;
}
export const heroArt = `<svg viewBox="0 0 420 250" fill="none" aria-hidden="true"><ellipse cx="215" cy="125" rx="130" ry="43" transform="rotate(-32 215 125)" stroke="#7c9d70"/><ellipse cx="215" cy="125" rx="130" ry="43" transform="rotate(32 215 125)" stroke="#7c9d70"/><ellipse cx="215" cy="125" rx="130" ry="43" transform="rotate(90 215 125)" stroke="#7c9d70"/><circle cx="215" cy="125" r="36" fill="#f2f5e6" stroke="#8ca77b"/><circle cx="215" cy="125" r="16" fill="#a8c27d"/><circle cx="110" cy="75" r="8" fill="#46674a"/><circle cx="238" cy="211" r="7" fill="#46674a"/><circle cx="311" cy="67" r="7" fill="#b3c98e"/><path d="M72 184h40M92 164v40M321 160h22M332 149v22" stroke="#8ca77b"/><text x="49" y="47" fill="#6a8460" font-size="10" font-family="monospace">CONNECT THE CONCEPTS.</text></svg>`;
