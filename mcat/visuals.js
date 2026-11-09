import { safeText as h } from "./model.mjs?v=visual-2";
export function flowVisual(v) {
  return `<figure class="visual"><div class="flow">${(v?.nodes || []).map((x, i) => (i ? '<span class="flow-arrow" aria-hidden="true">→</span>' : "") + `<div class="flow-node">${h(typeof x === "object" ? x.label || JSON.stringify(x) : x)}</div>`).join("")}</div><figcaption>${h(v?.caption || "Follow the relationship from left to right.")}</figcaption></figure>`;
}
const cyan = "var(--accent, #8cddf4)",
  amber = "var(--diagram-amber, #e9ac64)";
const slider = (key, label, min, max, value, step = 1) => ({
  key,
  label,
  min,
  max,
  value,
  step,
});
const select = (key, label, options, value = 0) => ({
  key,
  label,
  options,
  value,
});
const configs = {
  "biochemistry-enzyme-kinetics": {
    title: "Compete for the active site",
    predict: "Predict: can enough substrate overcome competitive inhibition?",
    controls: [
      slider("substrate", "Substrate concentration (mM)", 0, 20, 4, 0.5),
      slider("inhibitor", "Inhibitor concentration / Ki", 0, 5, 1, 0.5),
    ],
  },
  "biochemistry-bioenergetics": {
    title: "Couple two reactions",
    predict: "Predict the sign of the combined free-energy change.",
    controls: [
      slider("uphill", "Energy needed by reaction 1 (kJ/mol)", 0, 50, 20),
      slider("downhill", "Energy released by reaction 2 (kJ/mol)", 0, 60, 35),
    ],
  },
  "biology-membranes": {
    title: "Follow the water",
    predict:
      "Predict which way water moves before changing the outside solution.",
    controls: [
      slider(
        "outside",
        "Outside nonpenetrating solute (relative units)",
        1,
        10,
        3,
      ),
    ],
  },
  "biology-inheritance": {
    title: "Build a Punnett square",
    predict:
      "Predict the chance of an aa child. Each birth is an independent event.",
    controls: [
      select("parent1", "Parent 1 genotype", ["AA", "Aa", "aa"], 1),
      select("parent2", "Parent 2 genotype", ["AA", "Aa", "aa"], 1),
    ],
  },
  "general-acid-base": {
    title: "A logarithmic scale",
    predict: "Predict how much [H⁺] changes when pH rises by one.",
    controls: [slider("ph", "pH at 25°C", 0, 14, 7)],
  },
  "general-buffers": {
    title: "Shift the buffer ratio",
    predict: "Predict whether more conjugate base raises or lowers pH.",
    controls: [slider("ratio", "log₁₀([A⁻] / [HA])", -2, 2, 0, 0.1)],
  },
  "general-gases": {
    title: "Compress an ideal gas",
    predict: "Predict pressure when volume is halved, with temperature fixed.",
    controls: [slider("volume", "Volume (L)", 1, 10, 5, 0.5)],
  },
  "physics-forces": {
    title: "Force becomes acceleration",
    predict: "Predict what happens to acceleration when mass doubles.",
    controls: [
      slider("force", "Net force (N)", 0, 50, 20),
      slider("mass", "Mass (kg)", 1, 10, 2),
    ],
  },
  "physics-circuits": {
    title: "One resistor, one circuit",
    predict: "Predict current if resistance doubles at a fixed voltage.",
    controls: [
      slider("voltage", "Battery voltage (V)", 0, 12, 6),
      slider("resistance", "Resistance (Ω)", 1, 12, 3),
    ],
  },
  "physics-waves": {
    title: "Frequency and wavelength",
    predict: "Predict what happens to wavelength when frequency increases.",
    controls: [slider("frequency", "Frequency (Hz)", 1, 6, 2, 0.5)],
  },
  "organic-separation": {
    title: "Partition between two layers",
    predict: "Predict which layer collects more of a neutral solute.",
    controls: [
      slider(
        "partition",
        "Partition coefficient K = Corganic / Cwater",
        0.5,
        10,
        3,
        0.5,
      ),
      slider("volume", "Organic solvent volume (mL)", 10, 100, 50, 10),
    ],
  },
  "organic-stereochemistry": {
    title: "Mix two enantiomers",
    predict: "Predict the rotation of a 50:50 mixture.",
    controls: [
      slider("positive", "Amount of (+) enantiomer (%)", 0, 100, 75, 5),
    ],
  },
  "behavioral-conditioning": {
    title: "Name the consequence",
    predict:
      "Positive and negative describe adding or removing—not good or bad.",
    controls: [
      select("change", "What happens to the stimulus?", [
        "Add a stimulus",
        "Remove a stimulus",
      ]),
      select("behavior", "What happens to the behavior?", [
        "Becomes more frequent",
        "Becomes less frequent",
      ]),
    ],
  },
  "behavioral-research": {
    title: "Track a possible confounder",
    predict: "Does an association prove the treatment caused the outcome?",
    controls: [
      select("design", "Study design", [
        "People choose their own treatment",
        "Treatment is randomly assigned",
      ]),
    ],
  },
  "cars-strengthen-weaken": {
    title: "Test the missing link",
    predict:
      "Claim: longer museum hours increased attendance. What does each detail do?",
    controls: [
      select("evidence", "New passage evidence", [
        "Attendance rose after hours expanded",
        "A free-entry policy began on the same day",
        "Most new visits occurred during the added hours",
      ]),
    ],
  },
};
export const supportedLabIds = Object.freeze(Object.keys(configs));
export function labHTML(lessonId) {
  const config = configs[lessonId];
  if (!config) return "";
  return `<section class="concept-lab" data-lab="${h(lessonId)}"><div class="lab-heading"><span class="step-tag">CHANGE IT. SEE WHY.</span><h3>${h(config.title)}</h3><p>${h(config.predict)}</p></div><div class="lab-controls">${config.controls.map((c) => `<label for="lab-${c.key}">${h(c.label)}${c.options ? `<select id="lab-${c.key}" data-control="${c.key}">${c.options.map((o, i) => `<option value="${i}" ${i === c.value ? "selected" : ""}>${h(o)}</option>`).join("")}</select>` : `<span class="lab-control-value" data-value="${c.key}">${c.value}</span><input id="lab-${c.key}" data-control="${c.key}" type="range" min="${c.min}" max="${c.max}" value="${c.value}" step="${c.step}">`}</label>`).join("")}</div><div class="lab-display"></div></section>`;
}
export function bindLab() {
  document.querySelectorAll(".concept-lab").forEach((lab) => {
    const inputs = [...lab.querySelectorAll("[data-control]")];
    const update = () => {
      const values = Object.fromEntries(
        inputs.map((i) => [i.dataset.control, Number(i.value)]),
      );
      const model = labModel(lab.dataset.lab, values);
      for (const input of inputs) {
        const value = lab.querySelector(
          `[data-value="${input.dataset.control}"]`,
        );
        if (value) value.textContent = input.value;
      }
      lab.querySelector(".lab-display").innerHTML =
        `${model.graphic}<div class="lab-result" aria-live="polite"><strong>${h(model.result)}</strong></div><p class="lab-explanation">${h(model.explanation)}</p>`;
    };
    inputs.forEach((input) => input.addEventListener("input", update));
    update();
  });
}
function svg(label, body, height = 260) {
  return `<svg viewBox="0 0 600 ${height}" role="img" aria-label="${h(label)}" style="width:100%;height:auto;display:block;color:var(--ink)"><g font-family="Inter,system-ui,sans-serif" font-size="15" fill="currentColor">${body}</g></svg>`;
}
function text(x, y, s, anchor = "middle", color = "currentColor") {
  return `<text x="${x}" y="${y}" text-anchor="${anchor}" fill="${color}">${h(s)}</text>`;
}
function rect(x, y, w, height, color = cyan) {
  return `<rect x="${x}" y="${y}" width="${w}" height="${height}" rx="8" fill="${color}" fill-opacity=".12" stroke="${color}"/>`;
}
function line(x1, y1, x2, y2, color = cyan, width = 2) {
  return `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="${width}" fill="none"/>`;
}
function arrow(x1, y1, x2, y2, color = cyan) {
  const a = Math.atan2(y2 - y1, x2 - x1),
    r = 9;
  return (
    line(x1, y1, x2, y2, color) +
    `<path d="M${x2 - r * Math.cos(a - 0.5)} ${y2 - r * Math.sin(a - 0.5)}L${x2} ${y2}L${x2 - r * Math.cos(a + 0.5)} ${y2 - r * Math.sin(a + 0.5)}" stroke="${color}" stroke-width="2" fill="none"/>`
  );
}
function curve(points, color = cyan) {
  return `<path d="${points.map(([x, y], i) => `${i ? "L" : "M"}${x.toFixed(2)} ${y.toFixed(2)}`).join(" ")}" fill="none" stroke="${color}" stroke-width="3"/>`;
}
function number(n) {
  return Number(n.toPrecision(3)).toString();
}
function defaultValues(id, values) {
  return Object.fromEntries(
    configs[id].controls.map((c) => [
      c.key,
      Number.isFinite(values[c.key])
        ? Math.max(
            c.options ? 0 : c.min,
            Math.min(c.options ? c.options.length - 1 : c.max, values[c.key]),
          )
        : c.value,
    ]),
  );
}
export function labModel(id, values = {}) {
  if (!configs[id]) return null;
  const v = defaultValues(id, values);
  let graphic = "",
    result = "",
    explanation = "",
    data = {};
  if (id === "biochemistry-enzyme-kinetics") {
    const km = 2,
      apparentKm = km * (1 + v.inhibitor),
      vmax = 100,
      rate = (vmax * v.substrate) / (apparentKm + v.substrate),
      uninhibited = (vmax * v.substrate) / (km + v.substrate);
    const points = (k) =>
      Array.from({ length: 101 }, (_, i) => {
        const s = i * 0.2;
        return [65 + s * 23, 210 - (160 * s) / (k + s)];
      });
    graphic = svg(
      "Competitive inhibition increases apparent Km. Both curves approach the same Vmax.",
      `${line(65, 35, 65, 210, "currentColor")}${line(65, 210, 540, 210, "currentColor")}<path d="M65 50H530" stroke="currentColor" opacity=".4" stroke-dasharray="5 5"/>${text(75, 40, "Vmax = 100", "start")}${curve(points(km))}${curve(points(apparentKm), amber)}<circle cx="${65 + v.substrate * 23}" cy="${210 - rate * 1.6}" r="5" fill="${amber}"/>${text(300, 246, "Substrate [S], mM")}${text(225, 24, "No inhibitor", "start", cyan)}${text(380, 24, "With inhibitor", "start", amber)}${text(65, 230, "0")}${text(525, 230, "20")}<text x="20" y="145" transform="rotate(-90 20 145)" text-anchor="middle">Rate (units/min)</text>`,
    );
    result = `Rate ${number(rate)} units/min · apparent Km ${number(apparentKm)} mM`;
    explanation =
      "Reversible competitive inhibition: v = Vmax[S] / (Km(1 + [I]/Ki) + [S]). Vmax remains 100 units/min and uninhibited Km is 2 mM. The curves share an asymptote; a finite substrate concentration does not exactly reach it.";
    data = { rate, uninhibited, apparentKm, vmax };
  } else if (id === "biochemistry-bioenergetics") {
    const net = v.uphill - v.downhill;
    graphic = svg(
      "Energy changes add when reactions are chemically coupled.",
      `${rect(35, 45, 160, 100)}${text(115, 82, "Reaction 1")}${text(115, 117, `+${v.uphill} kJ/mol`)}${text(220, 103, "+")} ${rect(245, 45, 160, 100, amber)}${text(325, 82, "Reaction 2")}${text(325, 117, `−${v.downhill} kJ/mol`)}${text(430, 103, "=")}${text(510, 98, `${net > 0 ? "+" : ""}${net}`)}${text(510, 125, "kJ/mol")}${text(300, 195, net < 0 ? "Net downhill under these conditions" : net > 0 ? "Net uphill under these conditions" : "No net thermodynamic driving force")}`,
      225,
    );
    result = `Combined ΔG = ${net > 0 ? "+" : ""}${net} kJ/mol`;
    explanation =
      "Free-energy changes add for a coupled process under the stated conditions. A favorable sum does not guarantee a fast reaction. The two reactions must be mechanistically coupled; merely putting them nearby is not enough.";
    data = { net };
  } else if (id === "biology-membranes") {
    const outside = v.outside,
      direction = outside === 5 ? "balanced" : outside > 5 ? "out" : "in";
    const dots = (n, x) =>
      Array.from(
        { length: n },
        (_, i) =>
          `<circle cx="${x + (i % 4) * 25}" cy="${90 + Math.floor(i / 4) * 27}" r="5" fill="${cyan}"/>`,
      ).join("");
    graphic = svg(
      "Water direction across a membrane impermeable to solute.",
      `${rect(40, 40, 210, 170)}${rect(350, 40, 210, 170)}${text(145, 68, "Inside: 5 units")}${text(455, 68, `Outside: ${outside} units`)}${dots(5, 105)}${dots(outside, 410)}${line(300, 35, 300, 220, "currentColor")}${direction === "in" ? arrow(340, 145, 260, 145) : direction === "out" ? arrow(260, 145, 340, 145) : arrow(260, 135, 340, 135) + arrow(340, 155, 260, 155)}${text(300, 245, "Water can cross; solute cannot.")}`,
    );
    result =
      direction === "balanced"
        ? "No net water movement"
        : direction === "out"
          ? "Net water movement out of the cell"
          : "Net water movement into the cell";
    explanation =
      "Initial direction only: equal hydrostatic pressure, nonpenetrating solutes, and a membrane permeable to water. Water moves toward higher effective solute concentration. This diagram does not model final cell volume or membrane rupture.";
    data = { direction };
  } else if (id === "biology-inheritance") {
    const genotypes = ["AA", "Aa", "aa"],
      p1 = genotypes[Math.round(v.parent1)],
      p2 = genotypes[Math.round(v.parent2)],
      offspring = [...p1].flatMap((a) =>
        [...p2].map((b) => [a, b].sort().join("")),
      ),
      chance = offspring.filter((g) => g === "aa").length / 4;
    graphic = svg(
      "Punnett square for a single autosomal locus.",
      `${text(250, 35, p2[0])}${text(390, 35, p2[1])}${text(140, 95, p1[0])}${text(140, 175, p1[1])}${offspring.map((g, i) => `${rect(185 + (i % 2) * 140, 55 + Math.floor(i / 2) * 80, 130, 70, g === "aa" ? amber : cyan)}${text(250 + (i % 2) * 140, 98 + Math.floor(i / 2) * 80, g)}`).join("")}${text(320, 245, "Each box is equally likely (25%).")}`,
    );
    result = `${p1} × ${p2}: P(aa) = ${chance * 100}%`;
    explanation =
      "One autosomal gene with equal allele segregation and random fertilization. Genotype probabilities are per child; outcomes for earlier children do not change the next child’s probability.";
    data = { offspring, chance };
  } else if (id === "general-acid-base") {
    const ph = v.ph,
      hplus = 10 ** -ph,
      poh = 14 - ph;
    graphic = svg(
      "The pH scale at 25 degrees Celsius.",
      `${Array.from({ length: 15 }, (_, i) => rect(37 + i * 35, 80, 30, 40, i < 7 ? amber : cyan)).join("")}${[0, 3, 7, 11, 14].map((i) => text(52 + i * 35, 150, String(i))).join("")}${arrow(52 + ph * 35, 35, 52 + ph * 35, 70)}${text(140, 195, "Acidic")}${text(297, 195, "Neutral")}${text(460, 195, "Basic")}`,
      225,
    );
    result = `pH ${ph} · [H⁺] = 10⁻${ph} M · pOH ${poh}`;
    explanation =
      "Ideal dilute-solution approximation at 25°C: pH = −log₁₀[H⁺] and pH + pOH = 14. One pH unit means a tenfold concentration difference. Neutral pH depends on temperature.";
    data = { hplus, poh };
  } else if (id === "general-buffers") {
    const ratio = 10 ** v.ratio,
      ph = 4.8 + v.ratio,
      fraction = ratio / (1 + ratio);
    graphic = svg(
      "Relative amounts of weak acid and conjugate base.",
      `${rect(40, 65, 520, 70, amber)}<rect x="40" y="65" width="${520 * fraction}" height="70" rx="8" fill="${cyan}" fill-opacity=".7"/>${text(140, 40, "Conjugate base A⁻", "middle", cyan)}${text(450, 40, "Weak acid HA", "middle", amber)}${text(300, 175, `[A⁻] / [HA] = ${number(ratio)}`)}${text(300, 215, "pH = pKa + log₁₀([A⁻] / [HA])")}`,
      245,
    );
    result = `pH ${ph.toFixed(1)} for a model buffer with pKa 4.8`;
    explanation =
      "Henderson–Hasselbalch approximation for a weak acid/conjugate base pair. Equal amounts give pH = pKa. Useful buffering is strongest near pKa; extreme ratios buffer poorly. Total concentration and activities are not modeled.";
    data = { ratio, ph };
  } else if (id === "general-gases") {
    const pressure = 10 / v.volume;
    graphic = svg(
      "A movable piston reduces ideal gas volume at constant temperature.",
      `${rect(50, 45, 470, 155)}<rect x="${65 + v.volume * 43}" y="45" width="12" height="155" fill="${cyan}"/>${Array.from({ length: 15 }, (_, i) => `<circle cx="${70 + (i % 5) * v.volume * 7.5}" cy="${75 + Math.floor(i / 5) * 45}" r="4" fill="${amber}"/>`).join("")}${text(285, 230, `V = ${v.volume} L · P = ${number(pressure)} atm`)}`,
    );
    result = `Pressure ${number(pressure)} atm · PV = 10 L·atm`;
    explanation =
      "Boyle’s law model with constant gas amount and temperature. Ideal particles are drawn schematically; spacing is not a molecular-scale simulation. Pressure is inversely proportional to volume.";
    data = { pressure };
  } else if (id === "physics-forces") {
    const a = v.force / v.mass;
    graphic = svg(
      "A net horizontal force accelerates a block.",
      `${line(40, 200, 560, 200, "currentColor")}${rect(120, 95, 115, 105)}${text(177, 155, `${v.mass} kg`)}${v.force ? arrow(235, 140, 250 + v.force * 5, 140) : ""}${text(380, 110, `Net force: ${v.force} N`)}${text(300, 240, "Vertical forces balance.")}`,
    );
    result = `Acceleration = ${number(a)} m/s²`;
    explanation =
      "Newton’s second law: a = Fnet/m. The horizontal force shown is already the net force; weight and normal force balance vertically. Zero net force means constant velocity, not necessarily rest.";
    data = { a };
  } else if (id === "physics-circuits") {
    const current = v.voltage / v.resistance,
      power = v.voltage * current;
    graphic = svg(
      "Ideal battery and a single resistor in a closed circuit.",
      `${line(100, 65, 280, 65)}${line(390, 65, 500, 65)}${line(500, 65, 500, 205)}${line(500, 205, 100, 205)}${line(100, 205, 100, 140)}${line(100, 65, 100, 115)}${line(73, 115, 127, 115, "currentColor", 3)}${line(85, 140, 115, 140, "currentColor", 3)}${rect(280, 45, 110, 40)}${text(335, 34, `${v.resistance} Ω`)}${text(45, 155, `${v.voltage} V`)}${arrow(420, 180, 350, 180)}${text(300, 242, "Conventional current: + to − outside the battery")}`,
    );
    result = `I = ${number(current)} A · P = ${number(power)} W`;
    explanation =
      "Ideal voltage source, one ohmic resistor, and negligible wire resistance. Ohm’s law gives I = V/R; dissipated power is P = VI. The arrow indicates conventional current, opposite electron drift.";
    data = { current, power };
  } else if (id === "physics-waves") {
    const wavelength = 12 / v.frequency;
    const points = Array.from({ length: 241 }, (_, i) => [
      40 + (i * 520) / 240,
      130 - 55 * Math.sin(2 * Math.PI * (i / 240) * v.frequency),
    ]);
    graphic = svg(
      "A snapshot of a transverse wave with fixed propagation speed.",
      `${line(40, 130, 560, 130, "currentColor")}${curve(points)}${text(300, 35, "Wave speed = 12 m/s (fixed)")}${text(40, 225, "0 m")}${text(560, 225, "12 m")}${text(300, 250, "Position along the medium")}`,
    );
    result = `Wavelength λ = ${number(wavelength)} m`;
    explanation =
      "v = fλ. This is a spatial snapshot, not a time trace. At fixed wave speed, raising frequency shortens wavelength. Amplitude remains fixed in this model.";
    data = { wavelength };
  } else if (id === "organic-separation") {
    const waterVolume = 50,
      fraction =
        (v.partition * v.volume) / (waterVolume + v.partition * v.volume);
    graphic = svg(
      "Neutral solute partitions into two immiscible liquid phases.",
      `${rect(175, 40, 250, 160)}<rect x="176" y="41" width="248" height="78" fill="${cyan}" fill-opacity=".2"/><rect x="176" y="120" width="248" height="79" fill="${amber}" fill-opacity=".2"/>${line(175, 120, 425, 120, "currentColor")}${text(300, 75, `Organic: ${v.volume} mL`)}${text(300, 103, `${Math.round(fraction * 100)}% of solute`)}${text(300, 151, "Water: 50 mL")}${text(300, 180, `${Math.round((1 - fraction) * 100)}% of solute`)}${text(300, 240, "Schematic layers; not drawn to volume scale.")}`,
    );
    result = `One extraction transfers ${number(fraction * 100)}% into organic solvent`;
    explanation =
      "Neutral solute, equilibrium partitioning, and immiscible phases: fraction extracted = K·Vorganic / (Vwater + K·Vorganic). The organic layer is shown above for illustration; actual layer order depends on density. Ionization and solvent loss are omitted.";
    data = { fraction };
  } else if (id === "organic-stereochemistry") {
    const ee = 2 * v.positive - 100,
      rotation = (40 * ee) / 100;
    graphic = svg(
      "Opposite enantiomer rotations cancel in a racemic mixture.",
      `${rect(50, 65, 500, 55, amber)}<rect x="50" y="65" width="${5 * v.positive}" height="55" rx="8" fill="${cyan}" fill-opacity=".7"/>${text(160, 40, `(+) ${v.positive}%`, "middle", cyan)}${text(440, 40, `(−) ${100 - v.positive}%`, "middle", amber)}${text(300, 170, ee === 0 ? "Racemic mixture" : `${Math.abs(ee)}% enantiomeric excess of ${ee > 0 ? "(+)" : "(−)"}`)}${text(300, 215, "R/S does not determine +/− rotation.")}`,
      240,
    );
    result = `Observed rotation ${rotation > 0 ? "+" : ""}${number(rotation)}°`;
    explanation =
      "Assume pure (+) and (−) enantiomers rotate +40° and −40° under identical path length, concentration, solvent, temperature, and wavelength. Rotation scales with enantiomeric excess for this ideal mixture. Absolute configuration does not predict rotation sign.";
    data = { ee, rotation };
  } else if (id === "behavioral-conditioning") {
    const positive = Math.round(v.change) === 0,
      reinforce = Math.round(v.behavior) === 0,
      name = `${positive ? "Positive" : "Negative"} ${reinforce ? "reinforcement" : "punishment"}`;
    graphic = svg(
      "Classify operant conditioning by stimulus change and behavior frequency.",
      `${rect(35, 65, 170, 85)}${text(120, 97, positive ? "ADD stimulus" : "REMOVE stimulus")}${text(120, 127, positive ? "Positive" : "Negative")}${arrow(220, 110, 275, 110)}${rect(290, 65, 270, 85, amber)}${text(425, 97, reinforce ? "Behavior increases" : "Behavior decreases")}${text(425, 127, reinforce ? "Reinforcement" : "Punishment")}${text(300, 210, name)}`,
      245,
    );
    result = name;
    explanation =
      "Classify the consequence by its observed effect on future behavior. Removing an unpleasant stimulus can reinforce behavior. Intent alone is insufficient: a consequence is reinforcement only if the behavior increases.";
    data = { name };
  } else if (id === "behavioral-research") {
    const randomized = Math.round(v.design) === 1;
    graphic = svg(
      "A possible third variable influences both treatment choice and outcome.",
      `${rect(205, 20, 190, 60, amber)}${text(300, 57, "Prior motivation")}${rect(40, 160, 210, 60)}${text(145, 197, "Treatment group")}${rect(355, 160, 210, 60)}${text(460, 197, "Outcome")}${randomized ? `${line(235, 80, 145, 150, amber)}${line(172, 114, 202, 137, "currentColor", 3)}${line(199, 111, 176, 140, "currentColor", 3)}` : arrow(235, 80, 145, 150, amber)}${arrow(365, 80, 460, 150, amber)}${arrow(255, 190, 345, 190)}${text(300, 250, randomized ? "Random assignment reduces systematic selection bias." : "Self-selection can create a misleading association.")}`,
      275,
    );
    result = randomized
      ? "Random assignment strengthens causal inference"
      : "A confounder remains plausible";
    explanation = randomized
      ? "Random assignment balances measured and unmeasured confounders on average, not perfectly in every sample. Attrition, noncompliance, measurement, and chance still matter. Random assignment differs from random sampling."
      : "Motivated people may choose treatment and also do better independently of treatment. The observed group difference alone cannot isolate a treatment effect.";
    data = { randomized };
  } else {
    const index = Math.round(v.evidence),
      effects = [
        "Consistent, but not decisive",
        "Weakens the causal attribution",
        "Strengthens the proposed explanation",
      ];
    graphic = svg(
      "Evaluate a detail against the link between museum hours and attendance.",
      `${rect(40, 45, 220, 75)}${text(150, 76, "Longer museum hours")}${text(150, 102, "Proposed cause")}${arrow(275, 84, 325, 84)}${rect(340, 45, 220, 75)}${text(450, 76, "Higher attendance")}${text(450, 102, "Observed outcome")}${rect(95, 160, 410, 60, index === 1 ? amber : cyan)}${text(300, 197, effects[index])}`,
      250,
    );
    result = effects[index];
    explanation = [
      "A sequence in time is compatible with causation, but does not exclude competing explanations. Ask what else changed.",
      "A simultaneous free-entry policy offers an alternative explanation. This weakens the claim that longer hours alone caused the increase; it does not prove the hours had no effect.",
      "New visits during the extra hours fit the proposed mechanism. This supports the claim without proving it: some visitors might have shifted their existing visits.",
    ][index];
    data = { effect: index };
  }
  return { graphic, result, explanation, data };
}
export const heroArt = `<svg viewBox="0 0 420 250" fill="none" aria-hidden="true"><ellipse cx="215" cy="125" rx="130" ry="43" transform="rotate(-32 215 125)" stroke="#7c9d70"/><ellipse cx="215" cy="125" rx="130" ry="43" transform="rotate(32 215 125)" stroke="#7c9d70"/><ellipse cx="215" cy="125" rx="130" ry="43" transform="rotate(90 215 125)" stroke="#7c9d70"/><circle cx="215" cy="125" r="36" fill="#f2f5e6" stroke="#8ca77b"/><circle cx="215" cy="125" r="16" fill="#a8c27d"/><circle cx="110" cy="75" r="8" fill="#46674a"/><circle cx="238" cy="211" r="7" fill="#46674a"/><circle cx="311" cy="67" r="7" fill="#b3c98e"/><path d="M72 184h40M92 164v40M321 160h22M332 149v22" stroke="#8ca77b"/><text x="49" y="47" fill="#6a8460" font-size="10" font-family="monospace">CONNECT THE CONCEPTS.</text></svg>`;
