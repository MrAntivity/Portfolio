// Original, accessible teaching schematics. Shapes are conceptual, not to scale.
const C = {
  blue: "var(--diagram-blue, #8cddf5)",
  teal: "var(--diagram-teal, #75d9bc)",
  amber: "var(--diagram-amber, #efb76a)",
  muted: "var(--muted, #8c9ba9)",
  red: "var(--diagram-red, #e99e9e)",
};
const esc = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const text = (x, y, s, size = 16, color = "currentColor", anchor = "middle") =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-family="Inter,system-ui,sans-serif">${esc(s)}</text>`;
const line = (x1, y1, x2, y2, color = C.muted, width = 2, dash = "") =>
  `<path d="M${x1} ${y1}L${x2} ${y2}" stroke="${color}" stroke-width="${width}" fill="none" ${dash ? `stroke-dasharray="${dash}"` : ""}/>`;
const arrow = (x1, y1, x2, y2, color = C.blue) => {
  const angle = Math.atan2(y2 - y1, x2 - x1),
    d = 9;
  return (
    line(x1, y1, x2, y2, color, 2.5) +
    `<path d="M${x2 - d * Math.cos(angle - 0.5)} ${y2 - d * Math.sin(angle - 0.5)}L${x2} ${y2}L${x2 - d * Math.cos(angle + 0.5)} ${y2 - d * Math.sin(angle + 0.5)}" stroke="${color}" stroke-width="2.5" fill="none"/>`
  );
};
const wrap = (value, max) => {
  const out = [];
  let row = "";
  for (const word of String(value).split(" ")) {
    if (row && (row + " " + word).length > max) {
      out.push(row);
      row = word;
    } else row += (row ? " " : "") + word;
  }
  if (row) out.push(row);
  return out;
};
const box = (x, y, w, h, label, color = C.blue, sub = "") => {
  const lines = wrap(label, Math.max(10, Math.floor((w - 18) / 8))),
    sublines = wrap(sub, Math.max(12, Math.floor((w - 14) / 6.2)));
  const height =
      lines.length * 19 + (sublines.length ? 7 + sublines.length * 15 : 0),
    start = y + (h - height) / 2 + 15;
  return (
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="10" fill="${color}" fill-opacity=".075" stroke="${color}" stroke-opacity=".55"/>` +
    lines
      .map((s, i) => text(x + w / 2, start + i * 19, s, 16, color))
      .join("") +
    sublines
      .map((s, i) =>
        text(x + w / 2, start + lines.length * 19 + 4 + i * 15, s, 12),
      )
      .join("")
  );
};
const circle = (x, y, r, color = C.blue) =>
  `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" fill-opacity=".14" stroke="${color}" stroke-width="2"/>`;
const pill = (x, y, label, color = C.blue) => box(x, y, 180, 48, label, color);
const label = (s, color = C.blue) => text(330, 282, s, 15, color);
const chain = (nodes, captions = [], color = C.blue) =>
  nodes
    .map((n, i) => {
      const w = nodes.length === 4 ? 132 : 170,
        step = nodes.length === 4 ? 154 : 205,
        x = nodes.length === 4 ? 33 + i * step : 40 + i * step;
      return (
        box(x, 94, w, 80, n, color, captions[i] || "") +
        (i < nodes.length - 1 ? arrow(x + w + 6, 134, x + step - 8, 134) : "")
      );
    })
    .join("");
const axes = (xlabel = "Concentration", ylabel = "Response") =>
  arrow(74, 225, 610, 225, C.muted) +
  arrow(74, 225, 74, 35, C.muted) +
  text(350, 257, xlabel, 14) +
  `<text transform="translate(25 145) rotate(-90)" font-family="Inter,system-ui,sans-serif" text-anchor="middle" fill="currentColor" font-size="14">${esc(ylabel)}</text>`;
const path = (d, color = C.blue, width = 3) =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`;
const curve = (fn, color = C.blue) =>
  path(
    Array.from(
      { length: 61 },
      (_, i) => `${i ? "L" : "M"}${74 + i * 8.7} ${225 - fn(i / 60) * 175}`,
    ).join(" "),
    color,
  );
const matrix = (top, left, cells) =>
  text(250, 48, top[0], 14, C.blue) +
  text(460, 48, top[1], 14, C.amber) +
  text(90, 117, left[0], 13) +
  text(90, 205, left[1], 13) +
  box(150, 70, 195, 74, cells[0], C.blue) +
  box(360, 70, 195, 74, cells[1], C.amber) +
  box(150, 160, 195, 74, cells[2], C.teal) +
  box(360, 160, 195, 74, cells[3], C.red);
const bars = (names, values, colors = [C.blue, C.teal, C.amber]) =>
  names
    .map(
      (n, i) =>
        text(110, 78 + i * 58, n, 14, "currentColor", "end") +
        `<rect x="130" y="${56 + i * 58}" width="${values[i] * 4}" height="30" rx="5" fill="${colors[i % colors.length]}" fill-opacity=".65"/>` +
        text(
          145 + values[i] * 4,
          78 + i * 58,
          values[i],
          14,
          colors[i % colors.length],
          "start",
        ),
    )
    .join("");
const notes = (a, b) =>
  text(330, 34, a, 17, C.blue) + text(330, 268, b, 14, C.muted);
const energy = (caption) =>
  axes("Reaction progress", "Free energy") +
  path(
    "M75 160 C155 160 165 160 195 110 S260 30 310 80 S370 220 440 220 H600",
    C.amber,
  ) +
  path("M75 160 C160 160 190 95 250 130 S360 220 440 220 H600", C.blue) +
  text(470, 70, "Higher barrier", 14, C.amber) +
  text(470, 96, "Lower barrier", 14, C.blue) +
  text(177, 185, "Reactants", 12) +
  text(535, 207, "Products", 12) +
  label(caption);
const doubleStrand = () =>
  Array.from({ length: 8 }, (_, i) => {
    let y = 55 + i * 24,
      a = 250 + 40 * Math.sin(i * 0.7),
      b = 410 - 40 * Math.sin(i * 0.7);
    return (
      circle(a, y, 6) +
      circle(b, y, 6, C.amber) +
      line(a + 7, y, b - 7, y, i % 2 ? C.teal : C.muted, 2)
    );
  }).join("");
const ART = {
  "behavioral-conditioning": {
    title: "Two decisions classify a consequence",
    caption:
      "First ask whether behavior increases or decreases. Then ask whether a stimulus is added or removed.",
    draw: () =>
      matrix(
        ["Add stimulus", "Remove stimulus"],
        ["Behavior ↑", "Behavior ↓"],
        [
          "Positive reinforcement",
          "Negative reinforcement",
          "Positive punishment",
          "Negative punishment",
        ],
      ),
  },
  "behavioral-memory": {
    title: "Follow the direction of interference",
    caption:
      "The name depends on which memory is disrupted, not which memory is stronger.",
    draw: () =>
      box(55, 60, 185, 65, "OLD memory", C.amber) +
      box(420, 60, 185, 65, "NEW memory", C.blue) +
      arrow(250, 80, 410, 80, C.amber) +
      text(330, 60, "Proactive", 14, C.amber) +
      arrow(410, 190, 250, 190, C.blue) +
      box(55, 160, 185, 65, "OLD recall disrupted", C.amber) +
      box(420, 160, 185, 65, "NEW learning", C.blue) +
      text(330, 220, "Retroactive", 14, C.blue),
  },
  "behavioral-sensation": {
    title: "Signal detection: four possible outcomes",
    caption:
      "Sensitivity and response criterion are different. A more liberal criterion can increase both hits and false alarms.",
    draw: () =>
      matrix(
        ["Signal present", "Signal absent"],
        ["Say “yes”", "Say “no”"],
        ["Hit", "False alarm", "Miss", "Correct rejection"],
      ),
  },
  "behavioral-development": {
    title: "Appearance changes; amount does not",
    caption:
      "Conservation means recognizing that the same liquid remains when it is poured into a differently shaped container.",
    draw: () =>
      path("M120 60 V220 H250 V60", C.muted) +
      `<rect x="123" y="147" width="124" height="70" fill="${C.blue}" fill-opacity=".3"/>` +
      arrow(290, 130, 365, 130) +
      path("M410 40 V220 H478 V40", C.muted) +
      `<rect x="413" y="77" width="62" height="140" fill="${C.blue}" fill-opacity=".3"/>` +
      text(185, 245, "Wide container", 15) +
      text(445, 245, "Tall container", 15) +
      text(330, 281, "Same volume • different height", 16, C.blue),
  },
  "behavioral-motivation": {
    title: "The stress-response axis",
    caption:
      "Cortisol feeds back on the hypothalamus and anterior pituitary. This is a simplified HPA-axis model.",
    draw: () =>
      chain(
        ["Hypothalamus", "Pituitary", "Adrenal cortex"],
        ["CRH", "ACTH", "Cortisol"],
      ) +
      path("M570 184 V227 H110 V184", C.amber) +
      text(330, 251, "Cortisol: negative feedback upstream", 15, C.amber),
  },
  "behavioral-identity": {
    title: "The person and the situation",
    caption:
      "The fundamental attribution error overweights disposition when explaining another person’s behavior.",
    draw: () =>
      box(245, 25, 170, 55, "Observed behavior") +
      arrow(310, 90, 170, 135) +
      arrow(350, 90, 490, 135, C.amber) +
      box(
        55,
        145,
        230,
        80,
        "Disposition",
        C.blue,
        "Traits, motives, character",
      ) +
      box(
        375,
        145,
        230,
        80,
        "Situation",
        C.amber,
        "Constraints, roles, context",
      ) +
      label("Consider both before explaining behavior"),
  },
  "behavioral-groups": {
    title: "Why people conform",
    caption:
      "Normative influence is about acceptance. Informational influence is about deciding what is true.",
    draw: () =>
      box(
        45,
        65,
        250,
        145,
        "Normative influence",
        C.blue,
        "“I want to fit in.”",
      ) +
      box(
        365,
        65,
        250,
        145,
        "Informational influence",
        C.amber,
        "“They may know better.”",
      ) +
      Array.from(
        { length: 3 },
        (_, i) =>
          circle(100 + i * 65, 105, 9, C.blue) +
          circle(420 + i * 65, 105, 9, C.amber),
      ).join(""),
  },
  "behavioral-social-structure": {
    title: "Conflict between roles; strain within one",
    caption:
      "Use the number of roles involved to distinguish the two concepts.",
    draw: () =>
      box(30, 50, 175, 65, "Student", C.blue) +
      box(455, 50, 175, 65, "Employee", C.amber) +
      arrow(215, 82, 445, 82, C.red) +
      text(330, 65, "Role conflict", 15, C.red) +
      box(
        155,
        165,
        350,
        85,
        "One student role",
        C.teal,
        "Exam preparation ↔ group assignment",
      ) +
      text(
        330,
        286,
        "Role strain: competing demands inside one role",
        14,
        C.teal,
      ),
  },
  "behavioral-inequality": {
    title: "Two timescales of social mobility",
    caption:
      "Mobility describes a change in social position; the comparison defines the type.",
    draw: () =>
      text(330, 32, "INTRAGENERATIONAL", 13, C.blue) +
      chain(
        ["Earlier adulthood", "Later adulthood"],
        ["One person", "Same person"],
      ) +
      text(330, 210, "INTERGENERATIONAL", 13, C.amber) +
      text(190, 250, "Parent’s position", 17, C.amber) +
      arrow(290, 245, 365, 245, C.amber) +
      text(490, 250, "Child’s position", 17, C.amber),
  },
  "behavioral-research": {
    title: "Sampling and assignment answer different questions",
    caption:
      "Random sampling helps representation. Random assignment helps balance confounders between treatment groups.",
    draw: () =>
      box(30, 95, 160, 80, "Population", C.blue) +
      arrow(200, 135, 260, 135) +
      box(270, 95, 130, 80, "Sample", C.blue) +
      arrow(410, 125, 470, 75) +
      arrow(410, 145, 470, 205, C.amber) +
      box(480, 40, 150, 65, "Treatment", C.blue) +
      box(480, 175, 150, 65, "Control", C.amber) +
      text(225, 202, "Sampling", 13) +
      text(456, 274, "Assignment", 13),
  },
  "biochemistry-amino-acids": {
    title: "pH controls protonation",
    caption:
      "At pH = pKa, protonated and deprotonated forms have equal concentrations. This curve models one ionizable group.",
    draw: () =>
      axes("pH − pKa", "Protonated fraction") +
      curve((x) => 1 / (1 + 10 ** ((x - 0.5) * 8))) +
      line(335, 225, 335, 40, C.muted, 1, "4 5") +
      line(74, 137, 600, 137, C.muted, 1, "4 5") +
      text(335, 35, "pH = pKa", 14, C.amber) +
      text(530, 90, "50% at midpoint", 14, C.blue),
  },
  "biochemistry-protein-structure": {
    title: "Structure builds across four levels",
    caption:
      "Primary is sequence; secondary includes helices and sheets; tertiary is one folded chain; quaternary is a subunit assembly.",
    draw: () =>
      text(95, 50, "Primary", 16, C.blue) +
      text(250, 50, "Secondary", 16, C.blue) +
      text(410, 50, "Tertiary", 16, C.teal) +
      text(565, 50, "Quaternary", 16, C.amber) +
      [0, 1, 2, 3, 4].map((i) => circle(55 + i * 20, 135, 8)).join("") +
      path(
        "M210 90 C300 90 200 120 285 120 S200 150 285 150 S200 180 285 180",
        C.blue,
        5,
      ) +
      path(
        "M365 100 C470 50 460 210 390 200 S440 90 465 140 S360 210 365 100",
        C.teal,
        7,
      ) +
      circle(545, 110, 25, C.amber) +
      circle(585, 145, 25, C.blue) +
      circle(540, 175, 25, C.teal) +
      label("Sequence → local pattern → folded chain → assembly"),
  },
  "biochemistry-enzyme-kinetics": {
    title: "Competitive inhibition shifts the curve right",
    caption:
      "For reversible competitive inhibition, apparent Km increases while Vmax stays the same. Substrate and inhibitor compete for the active site; more substrate can overcome inhibition.",
    draw: () =>
      `<path d="M49 159 C21 117 62 91 93 113 C110 126 106 150 131 151 C158 151 154 121 175 111 C217 91 255 126 238 164 C261 201 226 229 189 214 C168 243 124 237 105 220 C65 233 31 202 49 159Z" fill="${C.blue}" fill-opacity=".2" stroke="${C.blue}" stroke-width="2.5"/>` +
      path(
        "M94 115 C111 128 107 150 131 151 C156 151 155 123 176 113",
        C.teal,
        5,
      ) +
      circle(78, 50, 16, C.teal) +
      circle(200, 50, 14, C.amber) +
      text(58, 24, "Substrate", 13, C.teal) +
      text(215, 24, "Inhibitor", 13, C.amber) +
      arrow(90, 70, 119, 121, C.teal) +
      arrow(190, 70, 150, 121, C.amber) +
      text(140, 188, "Enzyme", 18, C.blue) +
      text(139, 273, "Same active site", 14, C.teal) +
      arrow(315, 230, 625, 230, C.muted) +
      arrow(315, 230, 315, 45, C.muted) +
      path(
        Array.from(
          { length: 61 },
          (_, i) =>
            `${i ? "L" : "M"}${315 + i * 5} ${230 - (i / 60 / (0.08 + i / 60)) * 170}`,
        ).join(" "),
        C.blue,
      ) +
      path(
        Array.from(
          { length: 61 },
          (_, i) =>
            `${i ? "L" : "M"}${315 + i * 5} ${230 - (i / 60 / (0.24 + i / 60)) * 170}`,
        ).join(" "),
        C.amber,
      ) +
      line(315, 60, 625, 60, C.muted, 1, "5 5") +
      text(610, 42, "Vmax", 13) +
      text(465, 269, "Substrate concentration [S]", 13) +
      text(470, 104, "Uninhibited", 13, C.blue) +
      text(490, 166, "+ Competitive inhibitor", 13, C.amber) +
      `<text transform="translate(284 145) rotate(-90)" text-anchor="middle" fill="currentColor" font-family="Inter,system-ui,sans-serif" font-size="13">Reaction velocity</text>`,
  },
  "biochemistry-bioenergetics": {
    title: "Coupled free-energy changes add",
    caption:
      "A positive ΔG step can proceed as part of a coupled process if the sum of the free-energy changes is negative.",
    draw: () =>
      box(45, 65, 230, 115, "Unfavorable step", C.amber, "ΔG = +15 kJ/mol") +
      text(330, 132, "+", 35) +
      box(
        385,
        65,
        230,
        115,
        "Coupled ATP hydrolysis",
        C.blue,
        "ΔG = −30 kJ/mol (example)",
      ) +
      arrow(330, 190, 330, 225) +
      label("Net ΔG = −15 kJ/mol: favorable overall", C.teal),
  },
  "biochemistry-glycolysis": {
    title: "Glycolysis splits one six-carbon sugar",
    caption:
      "The net yield per glucose is 2 ATP, 2 NADH, and 2 pyruvate. Fermentation regenerates NAD+ so glycolysis can continue.",
    draw: () =>
      box(230, 25, 200, 60, "Glucose • 6 carbons") +
      arrow(330, 95, 200, 150) +
      arrow(330, 95, 460, 150) +
      box(90, 160, 220, 65, "Pyruvate • 3 carbons") +
      box(350, 160, 220, 65, "Pyruvate • 3 carbons") +
      text(115, 75, "2 ATP net", 17, C.amber) +
      text(550, 75, "2 NADH", 17, C.teal) +
      label("Lactate formation regenerates NAD+"),
  },
  "biochemistry-citric-acid": {
    title: "One turn per acetyl-CoA",
    caption:
      "Per turn, the cycle produces 3 NADH, 1 FADH₂, 1 GTP (or ATP), and 2 CO₂. Oxaloacetate is regenerated.",
    draw: () =>
      `<ellipse cx="310" cy="145" rx="125" ry="85" fill="none" stroke="${C.blue}" stroke-width="3"/>` +
      arrow(305, 60, 350, 65) +
      text(310, 136, "Citric acid", 21, C.blue) +
      text(310, 164, "cycle", 21, C.blue) +
      text(110, 40, "Acetyl-CoA", 16, C.amber) +
      arrow(145, 52, 225, 90, C.amber) +
      text(510, 77, "3 NADH", 17, C.teal) +
      text(520, 120, "1 FADH₂", 17, C.teal) +
      text(520, 165, "1 GTP", 17, C.teal) +
      text(505, 210, "2 CO₂", 17, C.amber) +
      text(165, 248, "Oxaloacetate regenerated", 14),
  },
  "biochemistry-oxidative-phosphorylation": {
    title: "A proton gradient powers ATP synthesis",
    caption:
      "Electron transport pumps protons into the intermembrane space. Protons return to the matrix through ATP synthase; oxygen accepts electrons at the chain’s end.",
    draw: () =>
      line(25, 125, 635, 125, C.muted, 8) +
      line(25, 155, 635, 155, C.muted, 8) +
      box(90, 98, 260, 85, "Electron transport chain", C.blue) +
      box(440, 98, 150, 85, "ATP synthase", C.teal) +
      arrow(220, 110, 220, 50, C.blue) +
      arrow(515, 45, 515, 105, C.teal) +
      Array.from({ length: 8 }, (_, i) =>
        text(70 + i * 70, 42, "H⁺", 15, C.amber),
      ).join("") +
      text(180, 223, "NADH → electrons → O₂", 15, C.blue) +
      text(510, 225, "ADP + Pi → ATP", 15, C.teal) +
      text(330, 275, "Matrix: lower proton concentration", 14, C.muted),
  },
  "biochemistry-lipids": {
    title: "Beta-oxidation removes two carbons per cycle",
    caption:
      "For an even-chain saturated fatty acid with n carbons: n/2 acetyl-CoA and n/2 − 1 beta-oxidation cycles.",
    draw: () =>
      Array.from(
        { length: 8 },
        (_, i) =>
          circle(100 + i * 65, 90, 19, i > 5 ? C.amber : C.blue) +
          (i < 7 ? line(120 + i * 65, 90, 145 + i * 65, 90) : ""),
      ).join("") +
      line(455, 55, 455, 128, C.amber, 2, "4 4") +
      text(330, 35, "Eight-carbon example", 16, C.blue) +
      arrow(330, 125, 330, 170) +
      box(160, 183, 340, 70, "4 acetyl-CoA • 3 cycles", C.teal) +
      label("Each circle represents one carbon"),
  },
  "biochemistry-nucleic-acids": {
    title: "New DNA grows only 5′ → 3′",
    caption:
      "The template is read 3′ → 5′ while the new complementary strand is synthesized 5′ → 3′.",
    draw: () =>
      text(70, 86, "3′", 19, C.amber) +
      text(590, 86, "5′", 19, C.amber) +
      line(100, 80, 560, 80, C.amber, 4) +
      text(330, 65, "Template strand", 15, C.amber) +
      text(70, 175, "5′", 19, C.blue) +
      text(500, 175, "3′", 19, C.blue) +
      line(100, 170, 475, 170, C.blue, 4) +
      Array.from(
        { length: 7 },
        (_, i) =>
          text(130 + i * 50, 108, "A T G C A T G"[i * 2], 17, C.amber) +
          text(130 + i * 50, 145, "T A C G T A C"[i * 2], 17, C.blue),
      ).join("") +
      arrow(330, 225, 560, 225, C.blue) +
      text(330, 268, "Nucleotides are added to the growing 3′ end", 15, C.blue),
  },
  "biochemistry-lab-methods": {
    title: "A gel separates; an antibody identifies",
    caption:
      "SDS-PAGE chiefly separates denatured proteins by size. Smaller proteins generally travel farther; Western blot detection uses a target-specific antibody.",
    draw: () =>
      box(65, 35, 230, 205, "", C.blue) +
      box(365, 35, 230, 205, "", C.teal) +
      [0, 1, 2]
        .map(
          (i) =>
            `<rect x="${95 + i * 65}" y="50" width="35" height="9" fill="${C.muted}"/>` +
            [90, 125, 170, 205]
              .map(
                (y, j) =>
                  `<rect x="${95 + i * 65}" y="${y + i * 4}" width="35" height="${j === i ? 6 : 3}" fill="${C.blue}" opacity=".8"/>`,
              )
              .join(""),
        )
        .join("") +
      [0, 1, 2]
        .map(
          (i) =>
            `<rect x="${395 + i * 65}" y="${170 + i * 4}" width="35" height="6" fill="${C.teal}"/>`,
        )
        .join("") +
      text(180, 268, "SDS-PAGE: many proteins", 14, C.blue) +
      text(480, 268, "Western: target detected", 14, C.teal) +
      arrow(310, 135, 350, 135),
  },
  "biology-membranes": {
    title: "Water follows nonpenetrating solute",
    caption:
      "This schematic assumes a water-permeable membrane and equal pressure. More nonpenetrating solute outside draws net water out of the cell.",
    draw: () =>
      circle(245, 145, 94, C.blue) +
      [
        [-25, -30],
        [25, 25],
        [-30, 35],
      ]
        .map(([x, y]) => circle(245 + x, 145 + y, 6, C.amber))
        .join("") +
      Array.from({ length: 11 }, (_, i) =>
        circle(440 + (i % 4) * 40, 60 + Math.floor(i / 4) * 65, 6, C.amber),
      ).join("") +
      arrow(300, 145, 420, 145, C.blue) +
      text(245, 260, "Cell", 16, C.blue) +
      text(500, 260, "Higher solute outside", 14, C.amber) +
      text(390, 124, "H₂O", 16, C.blue),
  },
  "biology-cell-cycle": {
    title: "Meiosis separates homologs, then sisters",
    caption:
      "One diploid cell produces four haploid products after one replication and two divisions. Chromosomes are simplified to a single homologous pair.",
    draw: () =>
      circle(90, 145, 46) +
      text(90, 153, "X X", 25, C.blue) +
      arrow(145, 125, 265, 75) +
      arrow(145, 165, 265, 215) +
      circle(310, 75, 36) +
      circle(310, 215, 36) +
      text(310, 83, "X", 27, C.blue) +
      text(310, 223, "X", 27, C.amber) +
      [45, 110, 180, 245]
        .map(
          (y, i) =>
            circle(555, y, 25, i < 2 ? C.blue : C.amber) +
            text(555, y + 7, "I", 24, i < 2 ? C.blue : C.amber),
        )
        .join("") +
      arrow(350, 65, 520, 45) +
      arrow(350, 85, 520, 110) +
      arrow(350, 205, 520, 180, C.amber) +
      arrow(350, 225, 520, 245, C.amber) +
      text(200, 28, "Meiosis I", 15) +
      text(435, 28, "Meiosis II", 15),
  },
  "biology-inheritance": {
    title: "Aa × Aa: track each allele",
    caption:
      "Each cell is one equally likely combination in this simple Mendelian cross. The aa genotype has probability 1/4.",
    draw: () =>
      matrix(["A", "a"], ["A", "a"], ["AA", "Aa", "Aa", "aa"]) +
      label("1 AA : 2 Aa : 1 aa", C.teal),
  },
  "biology-gene-regulation": {
    title: "Protein output has multiple control points",
    caption:
      "Changing transcription, mRNA stability, translation, or protein degradation can change protein abundance.",
    draw: () =>
      chain(
        ["DNA", "mRNA", "Protein"],
        ["Transcription control", "Stability + translation", "Degradation"],
      ) +
      arrow(325, 190, 325, 235, C.amber) +
      text(325, 268, "mRNA degradation", 14, C.amber) +
      arrow(555, 190, 555, 235, C.amber) +
      text(555, 268, "Protein degradation", 14, C.amber),
  },
  "biology-nervous": {
    title: "An action potential is a threshold event",
    caption:
      "Depolarization opens voltage-gated sodium channels; delayed potassium conductance helps repolarize the membrane. Refractory periods limit firing.",
    draw: () =>
      axes("Time", "Membrane potential") +
      path(
        "M75 185 H170 L210 155 L240 55 L275 205 Q310 235 340 185 H600",
        C.blue,
      ) +
      line(74, 155, 610, 155, C.amber, 1, "4 5") +
      text(530, 143, "Threshold", 14, C.amber) +
      text(190, 62, "Na⁺ entry", 14, C.blue) +
      text(370, 97, "K⁺ exit", 14, C.teal) +
      text(430, 213, "Resting potential", 12),
  },
  "biology-endocrine": {
    title: "Negative feedback stabilizes output",
    caption:
      "A downstream hormone can inhibit upstream release. The loop is a general model, not a claim that every endocrine pathway uses identical anatomy.",
    draw: () =>
      chain(
        ["Hypothalamus", "Pituitary", "Target gland"],
        ["Releasing hormone", "Tropic hormone", "Effector hormone"],
      ) +
      path("M560 186 V228 H100 V185", C.amber) +
      line(86, 185, 114, 185, C.amber, 3) +
      text(
        330,
        265,
        "More downstream hormone → less upstream drive",
        15,
        C.amber,
      ),
  },
  "biology-circulation": {
    title: "Two linked circulatory loops",
    caption:
      "Arteries lead away from the heart; veins return to it. Pulmonary arteries carry oxygen-poor blood and pulmonary veins carry oxygen-rich blood.",
    draw: () =>
      box(245, 105, 170, 80, "HEART", C.blue, "Right side / left side") +
      box(245, 15, 170, 55, "Lungs", C.teal) +
      box(245, 225, 170, 55, "Body tissues", C.amber) +
      arrow(245, 128, 150, 128, C.blue) +
      arrow(150, 128, 150, 42, C.blue) +
      arrow(150, 42, 235, 42, C.blue) +
      arrow(425, 42, 520, 42, C.red) +
      arrow(520, 42, 520, 150, C.red) +
      arrow(520, 150, 425, 150, C.red) +
      arrow(390, 195, 390, 217, C.red) +
      arrow(270, 217, 270, 195, C.blue) +
      text(90, 197, "O₂-poor", 14, C.blue) +
      text(565, 197, "O₂-rich", 14, C.red),
  },
  "biology-kidney": {
    title: "Filtration, reabsorption, secretion, excretion",
    caption:
      "Excreted amount = filtered amount − reabsorbed amount + secreted amount. Arrows show the direction of movement between blood and tubule.",
    draw: () =>
      box(35, 60, 590, 50, "Blood / peritubular circulation", C.red) +
      box(35, 190, 590, 50, "Tubule → urine", C.blue) +
      arrow(75, 120, 75, 180, C.blue) +
      arrow(280, 180, 280, 120, C.teal) +
      arrow(480, 120, 480, 180, C.amber) +
      text(155, 153, "Filtration", 14, C.blue) +
      text(365, 153, "Reabsorption", 14, C.teal) +
      text(560, 153, "Secretion", 14, C.amber) +
      label("Excretion = filtration − reabsorption + secretion"),
  },
  "biology-immune": {
    title: "Memory makes a later response faster",
    caption:
      "After a first exposure, memory cells can support a faster, stronger secondary response to the same antigen.",
    draw: () =>
      axes("Time after exposure", "Antibody level") +
      path(
        "M75 225 Q120 225 150 170 Q185 140 220 203 Q245 224 280 225",
        C.amber,
      ) +
      path("M310 225 Q335 225 350 110 Q385 30 440 65 Q490 90 600 150", C.blue) +
      arrow(105, 265, 105, 230, C.amber) +
      arrow(325, 265, 325, 230, C.blue) +
      text(190, 110, "Primary response", 14, C.amber) +
      text(470, 35, "Secondary response", 14, C.blue) +
      text(110, 282, "First exposure", 12) +
      text(345, 282, "Same antigen again", 12),
  },
  "biology-reproduction": {
    title: "The LH surge precedes ovulation",
    caption:
      "A simplified ovarian-cycle timeline. Progesterone rises during the luteal phase; actual cycle timing varies between people and cycles.",
    draw: () =>
      axes("Cycle progression", "Relative hormone level") +
      curve(
        (x) => 0.1 + 0.82 * Math.exp(-(((x - 0.48) / 0.045) ** 2)),
        C.blue,
      ) +
      curve(
        (x) => 0.08 + 0.67 * Math.exp(-(((x - 0.77) / 0.17) ** 2)),
        C.amber,
      ) +
      line(325, 225, 325, 50, C.muted, 1, "4 4") +
      text(280, 40, "LH surge", 14, C.blue) +
      text(510, 87, "Progesterone", 14, C.amber) +
      text(325, 276, "Ovulation → luteal phase", 14, C.teal),
  },
  "general-atomic": {
    title: "Changing electrons changes charge",
    caption:
      "An ion keeps the same proton count. This schematic compares neutral lithium with Li+; the atom is not drawn to scale.",
    draw: () =>
      [190, 470]
        .map(
          (x, i) =>
            circle(x, 145, 85, C.muted) +
            circle(x, 145, 30, C.amber) +
            text(x, 151, "3 p⁺", 17, C.amber) +
            circle(x - 85, 145, 7) +
            circle(x + 85, 145, 7) +
            (i === 0 ? circle(x, 60, 7) : "") +
            text(
              x,
              263,
              i ? "Li⁺: 2 electrons" : "Li: 3 electrons",
              16,
              C.blue,
            ),
        )
        .join("") +
      arrow(300, 145, 360, 145) +
      text(330, 120, "− e⁻", 18, C.amber),
  },
  "general-bonding": {
    title: "Bond dipoles add as vectors",
    caption:
      "CO₂ is linear, so equal opposite bond dipoles cancel. Water is bent, so its bond dipoles do not cancel.",
    draw: () =>
      text(165, 110, "O = C = O", 27, C.blue) +
      arrow(160, 135, 70, 135) +
      arrow(170, 135, 260, 135) +
      text(165, 205, "CO₂: net dipole = 0", 16) +
      text(480, 95, "O", 27, C.amber) +
      text(410, 175, "H", 25, C.blue) +
      text(550, 175, "H", 25, C.blue) +
      line(425, 150, 468, 105) +
      line(535, 150, 492, 105) +
      arrow(415, 210, 475, 120, C.amber) +
      arrow(545, 210, 485, 120, C.amber) +
      text(480, 263, "H₂O: net dipole ≠ 0", 16, C.amber),
  },
  "general-stoichiometry": {
    title: "The limiting reactant sets the ceiling",
    caption:
      "For 2 H₂ + O₂ → 2 H₂O, four H₂ molecules consume two O₂ molecules. Any extra oxygen remains after hydrogen is used up.",
    draw: () =>
      text(330, 35, "2 H₂ + O₂ → 2 H₂O", 23, C.blue) +
      box(
        40,
        80,
        240,
        120,
        "4 H₂ + 3 O₂",
        C.amber,
        "Hydrogen limits the reaction",
      ) +
      arrow(290, 140, 370, 140) +
      box(
        380,
        80,
        240,
        120,
        "4 H₂O + 1 O₂ left",
        C.teal,
        "Theoretical product amount",
      ) +
      label("Compare amounts using the balanced mole ratio"),
  },
  "general-gases": {
    title: "Partial pressures add",
    caption:
      "For an ideal-gas mixture at the same volume and temperature, each gas contributes pressure independently. Ptotal = ΣPi.",
    draw: () =>
      box(35, 55, 180, 155, "Gas A", C.blue, "PA = 2 atm") +
      box(240, 55, 180, 155, "Gas B", C.amber, "PB = 1 atm") +
      box(445, 55, 180, 155, "Mixture", C.teal, "Ptotal = 3 atm") +
      Array.from(
        { length: 6 },
        (_, i) =>
          circle(65 + (i % 3) * 55, 75 + Math.floor(i / 3) * 30, 4, C.blue) +
          circle(475 + (i % 3) * 55, 75 + Math.floor(i / 3) * 30, 4, C.blue),
      ).join("") +
      [0, 1, 2]
        .map(
          (i) =>
            circle(270 + i * 55, 87, 4, C.amber) +
            circle(475 + i * 55, 125, 4, C.amber),
        )
        .join(""),
  },
  "general-thermodynamics": {
    title: "Heat raises temperature between phase changes",
    caption:
      "On a heating curve, added heat changes temperature on sloped sections and drives phase change on plateaus. q = mcΔT applies within one phase.",
    draw: () =>
      axes("Heat added", "Temperature") +
      path("M75 215 L165 175 H255 L365 105 H475 L600 45", C.blue) +
      text(195, 158, "Melting", 14, C.amber) +
      text(420, 87, "Boiling", 14, C.amber) +
      text(320, 185, "Liquid warms", 14, C.blue),
  },
  "general-kinetics": {
    title: "Rate laws define concentration sensitivity",
    caption:
      "At constant other conditions, doubling A multiplies the rate by 2 for first order and by 4 for second order.",
    draw: () =>
      axes("[A] / initial [A]", "Relative rate") +
      curve((x) => x * 0.7, C.blue) +
      curve((x) => x * x, C.amber) +
      text(430, 170, "First order: rate ∝ [A]", 14, C.blue) +
      text(390, 65, "Second order: rate ∝ [A]²", 14, C.amber),
  },
  "general-equilibrium": {
    title: "Compare the current ratio with equilibrium",
    caption:
      "Q describes the current mixture; K describes equilibrium at that temperature. The system changes in the direction that brings Q toward K.",
    draw: () =>
      box(25, 70, 185, 135, "Q < K", C.blue, "Forward favored") +
      box(237, 70, 185, 135, "Q = K", C.teal, "Dynamic equilibrium") +
      box(449, 70, 185, 135, "Q > K", C.amber, "Reverse favored") +
      arrow(80, 175, 160, 175, C.blue) +
      text(330, 185, "⇌", 30, C.teal) +
      arrow(590, 175, 510, 175, C.amber) +
      label("At equilibrium, forward rate = reverse rate"),
  },
  "general-acid-base": {
    title: "pH is a logarithmic scale",
    caption:
      "A one-unit increase in pH means ten times less hydrogen ion. Neutral pH is 7 at 25°C; neutrality is temperature-dependent.",
    draw: () =>
      [0, 1, 2]
        .map((i) =>
          box(
            40 + i * 205,
            55,
            170,
            155,
            `pH ${i + 5}`,
            i === 0 ? C.amber : i === 1 ? C.blue : C.teal,
            `[H⁺] = 10⁻${i + 5} M`,
          ),
        )
        .join("") +
      text(330, 260, "pH 5 has 100× more H⁺ than pH 7", 17, C.blue),
  },
  "general-buffers": {
    title: "The ratio sets buffer pH",
    caption:
      "Henderson–Hasselbalch: pH = pKa + log([A−]/[HA]). The total amount also matters for buffer capacity.",
    draw: () =>
      [0, 1, 2]
        .map((i) =>
          box(
            35 + i * 210,
            70,
            180,
            130,
            ["Mostly HA", "Equal HA and A⁻", "Mostly A⁻"][i],
            [C.amber, C.blue, C.teal][i],
            ["pH < pKa", "pH = pKa", "pH > pKa"][i],
          ),
        )
        .join("") + label("Added acid is consumed by A⁻; added base by HA"),
  },
  "general-electrochemistry": {
    title: "Electrons travel from anode to cathode",
    caption:
      "Oxidation occurs at the anode and reduction at the cathode in both galvanic and electrolytic cells. Ion flow maintains charge balance.",
    draw: () =>
      box(65, 100, 200, 135, "Anode", C.amber, "Oxidation: loses e⁻") +
      box(395, 100, 200, 135, "Cathode", C.blue, "Reduction: gains e⁻") +
      path("M165 100 V50 H495 V100", C.muted) +
      arrow(260, 50, 400, 50, C.blue) +
      text(330, 32, "Electron flow", 15, C.blue) +
      path("M245 140 Q330 75 415 140", C.teal, 7) +
      text(330, 180, "Salt bridge", 14, C.teal),
  },
  "organic-functional-groups": {
    title: "The atoms beside a carbonyl change its behavior",
    caption:
      "These generic structures use R for a carbon-containing substituent. Recognize the connectivity around the carbonyl carbon.",
    draw: () =>
      box(25, 55, 195, 150, "Aldehyde", C.blue, "R–C(=O)–H") +
      box(232, 55, 195, 150, "Ketone", C.teal, "R–C(=O)–R′") +
      box(439, 55, 195, 150, "Ester", C.amber, "R–C(=O)–O–R′") +
      label("Same C=O motif • different neighboring groups"),
  },
  "organic-stereochemistry": {
    title: "Enantiomers are non-superimposable mirror images",
    caption:
      "A tetrahedral carbon with four different substituents can be a stereocenter. Reflection reverses its spatial arrangement.",
    draw: () =>
      line(330, 20, 330, 255, C.muted, 1, "5 5") +
      [180, 480]
        .map((x, i) => {
          const side = i === 0 ? 1 : -1;
          return (
            circle(x, 140, 15, C.blue) +
            line(x, 122, x, 65) +
            line(x - 15 * side, 145, x - 70 * side, 180) +
            `<path d="M${x + 10 * side} 143 L${x + 70 * side} 173 L${x + 65 * side} 185 Z" fill="${C.blue}" opacity=".65"/>` +
            line(x + 5 * side, 125, x + 65 * side, 90, C.muted, 5, "2 5") +
            text(x, 45, "A", 18, C.blue) +
            text(x - 80 * side, 200, "B", 18, C.amber) +
            text(x + 80 * side, 205, "C", 18, C.teal) +
            text(x + 80 * side, 85, "D", 18)
          );
        })
        .join("") +
      label("Mirror plane", C.muted),
  },
  "organic-resonance": {
    title: "Resonance redistributes electrons, not atoms",
    caption:
      "Carboxylate resonance shares negative charge between two oxygen atoms. The actual ion is a resonance hybrid, not an oscillation between structures.",
    draw: () =>
      text(165, 118, "R–C(=O)–O⁻", 25, C.blue) +
      text(495, 118, "R–C(–O⁻)=O", 25, C.amber) +
      text(330, 118, "↔", 35) +
      text(330, 205, "Same atom connectivity", 18, C.teal) +
      text(330, 240, "Different electron placement", 18, C.blue),
  },
  "organic-substitution": {
    title: "SN2: one concerted displacement",
    caption:
      "The nucleophile approaches opposite the leaving group. Bond formation and bond breaking occur together, with inversion at a reacting stereocenter.",
    draw: () =>
      text(80, 135, "Nu⁻", 25, C.blue) +
      text(330, 135, "C", 29) +
      text(550, 135, "LG", 25, C.amber) +
      line(355, 127, 510, 127, C.amber, 3) +
      arrow(120, 127, 295, 127, C.blue) +
      arrow(400, 155, 525, 155, C.amber) +
      line(330, 105, 330, 55) +
      line(312, 145, 260, 200) +
      line(347, 145, 400, 200) +
      text(330, 35, "Backside attack", 17, C.blue) +
      label("Rate = k[substrate][nucleophile]"),
  },
  "organic-elimination": {
    title: "E2 removes a beta hydrogen and a leaving group",
    caption:
      "The C–H and C–leaving-group bonds must align appropriately, commonly anti-periplanar. A double bond forms in the same concerted step.",
    draw: () =>
      text(80, 130, "Base⁻", 22, C.blue) +
      text(230, 130, "H", 23) +
      text(330, 130, "Cβ", 23) +
      text(445, 130, "Cα", 23) +
      text(570, 130, "LG", 23, C.amber) +
      line(250, 122, 305, 122) +
      line(355, 122, 420, 122) +
      line(470, 122, 540, 122) +
      arrow(130, 120, 205, 120) +
      arrow(270, 160, 400, 160, C.teal) +
      arrow(480, 160, 550, 160, C.amber) +
      text(385, 233, "Cβ = Cα", 25, C.teal) +
      label("Carbon skeleton shown schematically"),
  },
  "organic-carbonyl-addition": {
    title: "The carbonyl carbon accepts electron density",
    caption:
      "Nucleophilic addition breaks the carbonyl π bond and forms a tetrahedral alkoxide intermediate before protonation.",
    draw: () =>
      text(145, 145, "Nu⁻", 24, C.blue) +
      arrow(190, 138, 280, 138, C.blue) +
      text(325, 145, "Cδ⁺", 25) +
      text(325, 55, "Oδ⁻", 25, C.amber) +
      line(318, 75, 318, 115) +
      line(332, 75, 332, 115) +
      arrow(365, 110, 365, 68, C.amber) +
      arrow(400, 140, 465, 140) +
      text(550, 110, "O⁻", 23, C.amber) +
      text(550, 170, "C–Nu", 23, C.blue) +
      line(550, 120, 550, 143) +
      label("Trigonal planar → tetrahedral"),
  },
  "organic-acyl-substitution": {
    title: "Addition, then elimination",
    caption:
      "A nucleophile adds to the carbonyl, then the tetrahedral intermediate collapses and expels a leaving group.",
    draw: () =>
      chain(
        ["Acyl derivative", "Tetrahedral intermediate", "New acyl derivative"],
        ["Nu attacks C=O", "C=O temporarily opens", "Leaving group departs"],
      ) + text(330, 245, "The carbonyl is restored in the product", 16, C.teal),
  },
  "organic-oxidation": {
    title: "Follow bonds to oxygen and hydrogen",
    caption:
      "These pathways depend on reagents and conditions. Primary alcohols may stop at aldehydes or continue to acids; secondary alcohols give ketones.",
    draw: () =>
      chain(
        ["Primary alcohol", "Aldehyde", "Carboxylic acid"],
        ["R–CH₂OH", "R–CHO", "R–COOH"],
      ) +
      text(330, 45, "Increasing oxidation", 17, C.amber) +
      text(210, 240, "Secondary alcohol", 17, C.blue) +
      arrow(320, 234, 385, 234, C.amber) +
      text(485, 240, "Ketone", 17, C.teal),
  },
  "organic-spectroscopy": {
    title: "IR bands identify characteristic bond vibrations",
    caption:
      "This illustrative IR spectrum shows a broad O–H region and strong carbonyl band. Exact positions and shapes depend on molecular context.",
    draw: () =>
      axes("Wavenumber (decreases →)", "Transmittance") +
      path(
        "M75 65 L120 65 Q145 200 175 190 Q210 195 230 70 L345 65 L365 190 L382 67 L450 65 L465 120 L485 70 L505 145 L525 65 H600",
        C.blue,
      ) +
      text(170, 230, "O–H broad", 13, C.amber) +
      text(365, 220, "C=O", 13, C.teal) +
      text(150, 40, "~3200–3600 cm⁻¹", 13, C.amber) +
      text(410, 40, "~1700 cm⁻¹", 13, C.teal),
  },
  "organic-separation": {
    title: "TLC compares travel distances",
    caption:
      "Rf = distance traveled by the compound divided by distance traveled by the solvent front, both measured from the baseline.",
    draw: () =>
      box(180, 25, 270, 225, "", C.blue) +
      line(195, 220, 435, 220, C.muted) +
      line(195, 55, 435, 55, C.amber, 2, "5 5") +
      circle(265, 110, 8, C.teal) +
      circle(365, 165, 8, C.blue) +
      arrow(480, 218, 480, 57, C.amber) +
      arrow(130, 218, 130, 110, C.teal) +
      text(555, 145, "Solvent front", 14, C.amber) +
      text(83, 150, "Spot", 14, C.teal) +
      text(330, 280, "Baseline → measure both distances upward", 14),
  },
  "physics-units": {
    title: "Cancel units to reveal the result",
    caption:
      "Conversion factors equal one. Arrange them so unwanted units cancel before calculating.",
    draw: () =>
      text(130, 125, "2.0 mL", 28, C.blue) +
      text(245, 125, "×", 25) +
      text(390, 97, "1 cm³", 25, C.teal) +
      line(310, 115, 470, 115, C.muted) +
      text(390, 150, "1 mL", 25, C.amber) +
      text(330, 235, "= 2.0 cm³", 28, C.teal) +
      label("1 mL = 1 cm³ = 10⁻⁶ m³"),
  },
  "physics-forces": {
    title: "Acceleration follows net force",
    caption:
      "Opposing forces subtract. In this example, 10 N right minus 4 N left gives 6 N right; a 2 kg mass accelerates at 3 m/s².",
    draw: () =>
      line(40, 225, 620, 225, C.muted) +
      box(240, 100, 180, 125, "2 kg", C.blue) +
      arrow(430, 160, 610, 160, C.blue) +
      arrow(230, 160, 100, 160, C.amber) +
      text(525, 135, "10 N", 18, C.blue) +
      text(155, 135, "4 N", 18, C.amber) +
      label("Fnet = 6 N right → a = 3 m/s² right", C.teal),
  },
  "physics-work-energy": {
    title: "Doubling speed quadruples kinetic energy",
    caption:
      "K = ½mv². With mass fixed, kinetic energy depends on the square of speed; power describes the rate of energy transfer.",
    draw: () =>
      bars(["Speed v", "Speed 2v", "Speed 3v"], [10, 40, 90]) +
      text(330, 264, "Relative kinetic energies: 1 : 4 : 9", 17, C.blue),
  },
  "physics-torque": {
    title: "Use the perpendicular lever arm",
    caption:
      "Static equilibrium requires both zero net force and zero net torque. Here, equal opposing torques balance about the pivot.",
    draw: () =>
      line(75, 125, 585, 125, C.blue, 9) +
      `<path d="M330 133L305 185H355Z" fill="${C.muted}"/>` +
      arrow(120, 60, 120, 115, C.amber) +
      arrow(435, 60, 435, 115, C.teal) +
      text(120, 40, "10 N", 18, C.amber) +
      text(435, 40, "20 N", 18, C.teal) +
      line(120, 220, 330, 220, C.amber) +
      line(330, 220, 435, 220, C.teal) +
      text(225, 245, "2 m", 16, C.amber) +
      text(383, 245, "1 m", 16, C.teal) +
      label("10 N × 2 m = 20 N × 1 m"),
  },
  "physics-fluids": {
    title: "A narrower tube increases speed at fixed flow",
    caption:
      "For steady incompressible flow, A₁v₁ = A₂v₂. The schematic assumes no leaks and compares two cross sections of the same stream.",
    draw: () =>
      path("M40 65 H220 L380 110 H620 M40 235 H220 L380 190 H620", C.blue, 4) +
      arrow(65, 150, 190, 150, C.teal) +
      arrow(390, 150, 600, 150, C.amber) +
      text(145, 40, "Large area A₁", 16, C.teal) +
      text(500, 85, "Small area A₂", 16, C.amber) +
      text(145, 270, "Lower speed v₁", 16, C.teal) +
      text(500, 235, "Higher speed v₂", 16, C.amber),
  },
  "physics-electrostatics": {
    title: "Force direction depends on charge sign",
    caption:
      "Electric field points in the direction a positive test charge would accelerate. A negative charge experiences force opposite the field.",
    draw: () =>
      [55, 145, 235].map((y) => arrow(75, y, 590, y, C.muted)).join("") +
      circle(245, 100, 23, C.blue) +
      text(245, 107, "+", 24, C.blue) +
      circle(435, 190, 23, C.amber) +
      text(435, 197, "−", 24, C.amber) +
      arrow(275, 100, 385, 100, C.blue) +
      arrow(405, 190, 295, 190, C.amber) +
      text(330, 280, "F = qE", 23, C.teal),
  },
  "physics-circuits": {
    title: "Series shares current; parallel shares voltage",
    caption:
      "Series resistances add. Parallel branches provide additional current paths, lowering equivalent resistance.",
    draw: () =>
      path(
        "M35 65 H70 M145 65 H175 M250 65 H285 V205 H170 M150 205 H35 V65",
        C.muted,
      ) +
      line(150, 190, 150, 220, C.amber, 3) +
      line(170, 196, 170, 214, C.amber, 3) +
      box(70, 43, 75, 44, "R₁", C.blue) +
      box(175, 43, 75, 44, "R₂", C.amber) +
      text(160, 245, "Series: R₁ + R₂", 15, C.blue) +
      path(
        "M365 65 H450 M530 65 H615 V205 H500 M480 205 H365 V65 M365 135 H450 M530 135 H615",
        C.muted,
      ) +
      line(480, 190, 480, 220, C.amber, 3) +
      line(500, 196, 500, 214, C.amber, 3) +
      box(450, 43, 80, 44, "R₁", C.blue) +
      box(450, 113, 80, 44, "R₂", C.amber) +
      text(490, 245, "Parallel: 1/R₁ + 1/R₂ = 1/Req", 14, C.teal),
  },
  "physics-waves": {
    title: "Frequency and wavelength trade off at fixed speed",
    caption:
      "v = fλ. If wave speed stays fixed, doubling frequency halves wavelength; amplitude is a separate property.",
    draw: () =>
      path(
        Array.from(
          { length: 121 },
          (_, i) =>
            `${i ? "L" : "M"}${40 + i * 4.8} ${90 - 32 * Math.sin((i / 120) * Math.PI * 4)}`,
        ).join(" "),
        C.blue,
      ) +
      path(
        Array.from(
          { length: 121 },
          (_, i) =>
            `${i ? "L" : "M"}${40 + i * 4.8} ${205 - 32 * Math.sin((i / 120) * Math.PI * 8)}`,
        ).join(" "),
        C.amber,
      ) +
      text(330, 30, "Frequency f • wavelength λ", 16, C.blue) +
      text(330, 155, "Frequency 2f • wavelength λ/2", 16, C.amber) +
      label("Same wave speed • same amplitude"),
  },
  "physics-optics": {
    title: "Refraction angles are measured from the normal",
    caption:
      "Light bends toward the normal when entering a higher refractive index at a nonzero incident angle. This schematic uses a flat interface.",
    draw: () =>
      `<rect x="35" y="145" width="590" height="100" fill="${C.blue}" fill-opacity=".08"/>` +
      line(35, 145, 625, 145, C.muted) +
      line(330, 25, 330, 260, C.muted, 1, "5 5") +
      arrow(150, 40, 330, 145, C.amber) +
      arrow(330, 145, 385, 245, C.blue) +
      text(160, 110, "Lower n", 16, C.amber) +
      text(150, 210, "Higher n", 16, C.blue) +
      text(410, 40, "Normal", 14, C.muted) +
      text(520, 275, "n₁ sin θ₁ = n₂ sin θ₂", 16, C.teal),
  },
  "physics-nuclear-statistics": {
    title: "Each half-life halves what remains",
    caption:
      "Radioactive decay is exponential. The same fraction, not the same number of nuclei, decays during each half-life.",
    draw: () =>
      axes("Number of half-lives", "Remaining fraction") +
      curve((x) => 2 ** (-x * 4), C.blue) +
      [0, 1, 2, 3, 4]
        .map(
          (i) =>
            circle(74 + i * 130.5, 225 - 175 * 2 ** -i, 5, C.amber) +
            text(
              85 + i * 128,
              205 - 175 * 2 ** -i,
              ["1", "½", "¼", "⅛", "¹⁄₁₆"][i],
              14,
              C.amber,
            ),
        )
        .join(""),
  },
  "cars-main-idea": {
    title: "Separate the subject from the author’s position",
    caption:
      "A strong main-idea answer captures the central position and its qualifications, not just the topic mentioned repeatedly.",
    draw: () =>
      box(40, 65, 230, 115, "Topic", C.muted, "“Public museums”") +
      arrow(280, 123, 365, 123) +
      box(
        375,
        65,
        245,
        115,
        "Author’s position",
        C.blue,
        "“Access matters, but so does context.”",
      ) +
      label("Topic + stance + qualification = main claim"),
  },
  "cars-tone": {
    title: "Locate the evidence for a tone label",
    caption:
      "A tone is an attitude toward something. Identify the evaluative wording and its target rather than choosing the strongest-sounding adjective.",
    draw: () =>
      box(
        40,
        70,
        580,
        75,
        "“The proposal is promising, though its evidence is limited.”",
        C.blue,
      ) +
      arrow(190, 155, 190, 195, C.teal) +
      arrow(470, 155, 470, 195, C.amber) +
      text(190, 225, "Qualified approval", 18, C.teal) +
      text(470, 225, "Caution about evidence", 18, C.amber) +
      label("Supported tone: cautiously optimistic"),
  },
  "cars-inference": {
    title: "Take the smallest justified step",
    caption:
      "An inference must follow from the passage. Do not turn “some” into “all,” or a possibility into a certainty.",
    draw: () =>
      box(
        40,
        80,
        250,
        105,
        "Passage evidence",
        C.blue,
        "Some visitors prefer guided tours.",
      ) +
      arrow(300, 130, 365, 130) +
      box(
        375,
        80,
        245,
        105,
        "Supported inference",
        C.teal,
        "Not every visitor rejects guidance.",
      ) +
      text(
        330,
        250,
        "Unsupported leap: “All visitors need a guide.”",
        15,
        C.red,
      ),
  },
  "cars-function": {
    title: "Read an example by the job it performs",
    caption:
      "Ask why the author included the example. Nearby claims usually reveal whether it supports, illustrates, qualifies, or challenges an idea.",
    draw: () =>
      chain(
        ["Claim", "Specific example", "Argument role"],
        ["A general position", "A concrete case", "Illustrates or supports"],
      ) +
      text(330, 245, "Describe its function, not just its subject", 17, C.teal),
  },
  "cars-assumptions": {
    title: "Find the bridge the argument needs",
    caption:
      "A necessary assumption connects evidence to conclusion. If negating it breaks the argument, it may be necessary.",
    draw: () =>
      box(25, 90, 180, 95, "Evidence", C.blue, "Attendance increased.") +
      box(
        240,
        70,
        180,
        135,
        "Missing bridge",
        C.amber,
        "Attendance reflects demand.",
      ) +
      box(455, 90, 180, 95, "Conclusion", C.teal, "Demand increased.") +
      arrow(210, 137, 230, 137) +
      arrow(425, 137, 445, 137) +
      label("Negation test: what if attendance does not reflect demand?"),
  },
  "cars-strengthen-weaken": {
    title: "Target the link, not a nearby fact",
    caption:
      "To assess a causal argument, test alternate explanations. New information is relevant only if it changes support for the conclusion.",
    draw: () =>
      box(50, 40, 560, 60, "New tutoring program → scores improve", C.blue) +
      arrow(180, 110, 180, 160, C.teal) +
      arrow(480, 110, 480, 160, C.amber) +
      box(
        35,
        175,
        280,
        75,
        "Strengthens",
        C.teal,
        "Comparable groups; tutoring differs",
      ) +
      box(
        345,
        175,
        280,
        75,
        "Weakens",
        C.amber,
        "Tutored group had prior advantage",
      ),
  },
  "cars-application": {
    title: "Match relationships, not surface details",
    caption:
      "Abstract the principle first, then check whether a new case has the same relevant relationship.",
    draw: () =>
      box(
        90,
        25,
        480,
        60,
        "Principle: incentives can change what people optimize",
        C.blue,
      ) +
      arrow(200, 100, 200, 155) +
      arrow(460, 100, 460, 155, C.amber) +
      box(
        45,
        170,
        280,
        80,
        "Original case",
        C.blue,
        "Reward speed → prioritize speed",
      ) +
      box(
        345,
        170,
        280,
        80,
        "New case",
        C.amber,
        "Reward volume → prioritize volume",
      ),
  },
  "cars-structure": {
    title: "Map the job of each paragraph",
    caption:
      "Paragraph labels make the argumentative progression visible. Track who holds each position and how the author responds.",
    draw: () =>
      chain(
        ["Introduce a view", "Challenge its limit", "Offer a revision"],
        ["Paragraph 1", "Paragraph 2", "Paragraph 3"],
      ) +
      path("M120 190 V235 H535 V190", C.teal) +
      text(
        330,
        270,
        "Overall movement: view → critique → qualified alternative",
        14,
        C.teal,
      ),
  },
  "cars-context": {
    title: "Meaning comes from the surrounding argument",
    caption:
      "For figurative language, translate the relationship the metaphor expresses and test it in the original sentence.",
    draw: () =>
      box(45, 45, 570, 70, "“The archive is a lens, not a window.”", C.blue) +
      arrow(330, 125, 330, 165) +
      box(80, 185, 500, 70, "Records shape how the past is seen.", C.teal) +
      text(
        330,
        285,
        "Context supports interpretation, not literal glass.",
        14,
        C.muted,
      ),
  },
  "cars-scope": {
    title: "Match the claim’s scope and certainty",
    caption:
      "Words such as “some,” “may,” and “often” constrain what the passage supports. Stronger claims need stronger evidence.",
    draw: () =>
      box(35, 70, 180, 120, "Some / may", C.blue, "Limited claim") +
      box(240, 70, 180, 120, "Most / often", C.teal, "Broader claim") +
      box(445, 70, 180, 120, "All / must", C.amber, "Universal claim") +
      arrow(90, 225, 575, 225, C.muted) +
      text(
        330,
        263,
        "Increasing scope and certainty → more evidence needed",
        14,
      ),
  },
};
export const supportedConceptIds = Object.freeze(Object.keys(ART));
export function conceptArt(lesson) {
  const item = ART[lesson?.id];
  if (!item) return "";
  return `<figure class="concept-art concept-figure" data-concept="${esc(lesson.id)}"><div class="concept-art-heading"><span class="step-tag">VISUAL MODEL</span><h3>${esc(item.title)}</h3></div><svg viewBox="0 0 660 305" role="img" aria-label="${esc(`${item.title}. ${item.caption}`)}" style="width:100%;height:auto;display:block;overflow:visible"><title>${esc(item.title)}</title><desc>${esc(item.caption)}</desc>${item.draw()}</svg><figcaption>${esc(item.caption)}</figcaption></figure>`;
}
const SUBJECT_EXAMPLES = {
  behavioral: "behavioral-memory",
  biochemistry: "biochemistry-enzyme-kinetics",
  biology: "biology-membranes",
  general: "general-bonding",
  organic: "organic-carbonyl-addition",
  physics: "physics-waves",
  cars: "cars-assumptions",
};
export function subjectArt(subjectId) {
  const item = ART[SUBJECT_EXAMPLES[subjectId]];
  if (!item) return "";
  return `<svg class="subject-concept-art" viewBox="0 0 660 305" aria-hidden="true" focusable="false">${item.draw()}</svg>`;
}
