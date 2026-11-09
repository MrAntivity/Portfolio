/* Original, schematic teaching diagrams. Never use the answer or choices to build a hint. */
const esc = (value) =>
  String(value ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const blue = "var(--diagram-blue, #77cee8)",
  teal = "var(--diagram-teal, #76cbb7)",
  amber = "var(--diagram-amber, #e7b66a)";
const text = (
  x,
  y,
  label,
  size = 14,
  color = "currentColor",
  anchor = "middle",
) =>
  `<text x="${x}" y="${y}" font-size="${size}" fill="${color}" text-anchor="${anchor}" font-family="Inter,system-ui,sans-serif">${esc(label)}</text>`;
const line = (x1, y1, x2, y2, color = blue, dash = "") =>
  `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${color}" stroke-width="2" ${dash ? 'stroke-dasharray="' + dash + '"' : ""}/>`;
const path = (d, color = blue, width = 2, fill = "none") =>
  `<path d="${d}" stroke="${color}" stroke-width="${width}" fill="${fill}" stroke-linecap="round" stroke-linejoin="round"/>`;
const circle = (x, y, r, color = blue, fill = "none") =>
  `<circle cx="${x}" cy="${y}" r="${r}" stroke="${color}" fill="${fill}" stroke-width="2"/>`;
const box = (x, y, w, h, label, color = blue) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="9" fill="${color}" fill-opacity=".08" stroke="${color}" stroke-width="1.5"/>${label ? text(x + w / 2, y + h / 2 + 5, label, 14, color) : ""}`;
const arrow = (x1, y1, x2, y2, color = blue) => {
  const a = Math.atan2(y2 - y1, x2 - x1),
    l = 9;
  return (
    line(x1, y1, x2, y2, color) +
    path(
      `M${x2 - l * Math.cos(a - 0.5)} ${y2 - l * Math.sin(a - 0.5)}L${x2} ${y2}L${x2 - l * Math.cos(a + 0.5)} ${y2 - l * Math.sin(a + 0.5)}`,
      color,
    )
  );
};
const dots = (x, y, n, color = blue, cols = 5, step = 18) =>
  Array.from({ length: n }, (_, i) =>
    circle(
      x + (i % cols) * step,
      y + Math.floor(i / cols) * step,
      3,
      color,
      color,
    ),
  ).join("");
function cart(mode) {
  const labels = {
    force: ["Mass", "Acceleration →", "Net force?"],
    work: ["Cart", "Displacement →", "Applied force →"],
    kinetic: ["Moving object", "Velocity →", "Energy of motion"],
    momentum: ["Moving object", "Velocity →", "Mass and motion"],
  };
  const l = labels[mode];
  return (
    line(55, 178, 590, 178, "currentColor") +
    box(155, 94, 120, 60, l[0]) +
    circle(180, 165, 12) +
    circle(250, 165, 12) +
    arrow(290, 122, 455, 122) +
    text(375, 100, l[1]) +
    line(92, 111, 130, 111, blue, "4 5") +
    line(75, 134, 130, 134, blue, "4 5") +
    text(320, 215, l[2], 14, amber)
  );
}
function vessel(kind) {
  let d =
    path("M160 50V183H390V50") +
    path("M160 91H390", blue, 2) +
    `<path d="M161 93H389V182H161Z" fill="${blue}" opacity=".10"/>`;
  if (kind === "pressure")
    return (
      d +
      line(425, 91, 425, 162, amber) +
      line(416, 91, 434, 91, amber) +
      line(416, 162, 434, 162, amber) +
      text(465, 133, "Depth", 14, amber) +
      circle(310, 162, 5, amber, amber) +
      text(285, 66, "Liquid surface") +
      text(275, 215, "Pressure at the marked depth")
    );
  if (kind === "molarity")
    return (
      d +
      dots(195, 120, 12) +
      text(475, 112, "Solute amount") +
      text(475, 145, "Final volume") +
      text(275, 215, "One uniform solution")
    );
  return (
    d +
    dots(195, 120, 8) +
    text(475, 115, "Solute particles") +
    text(475, 145, "Solution volume") +
    text(275, 215, "Count independently moving particles")
  );
}
function circuit(kind) {
  return (
    path("M120 123V80H265M365 80H515V178H120V135") +
    path("M265 80l10 -13 15 26 15 -26 15 26 15 -26 15 26 15 -13") +
    line(105, 123, 135, 123, amber) +
    line(112, 135, 128, 135, amber) +
    arrow(420, 58, 480, 58) +
    text(450, 38, "Current", 13) +
    text(320, 123, "Resistor") +
    text(
      320,
      215,
      kind === "ohm"
        ? "Potential difference across the resistor"
        : kind === "power"
          ? "Electrical energy becomes thermal energy"
          : "Current flows for a measured time",
      14,
      amber,
    )
  );
}
function wave() {
  return (
    line(55, 125, 585, 125, "currentColor", "4 5") +
    path(
      "M60 125C90 35 130 35 160 125S230 215 260 125S330 35 360 125S430 215 460 125S530 35 560 125",
      blue,
      3,
    ) +
    line(110, 40, 310, 40, amber) +
    line(110, 34, 110, 47, amber) +
    line(310, 34, 310, 47, amber) +
    text(210, 27, "One wavelength", 13, amber) +
    arrow(440, 45, 540, 45) +
    text(490, 25, "Propagation", 12) +
    text(320, 225, "Frequency describes cycles per second")
  );
}
function lens() {
  return (
    line(45, 140, 595, 140, "currentColor") +
    path(
      "M320 35Q285 140 320 218Q355 140 320 35",
      blue,
      2,
      "var(--soft,transparent)",
    ) +
    arrow(115, 140, 115, 67, teal) +
    text(115, 45, "Object", 13, teal) +
    circle(225, 140, 3, amber, amber) +
    circle(415, 140, 3, amber, amber) +
    text(225, 166, "F", 13, amber) +
    text(415, 166, "F", 13, amber) +
    text(470, 92, "Image location?", 14) +
    text(320, 235, "Thin converging lens · schematic, not to scale", 12)
  );
}
function heat(kind) {
  return (
    box(210, 75, 170, 100, "Sample") +
    text(295, 112, "", 14) +
    arrow(100, 120, 185, 120, amber) +
    text(120, 93, "Heat", 14, amber) +
    path(
      "M425 170V75Q425 60 437 60Q449 60 449 75V170A22 22 0 1 1 425 170",
      teal,
    ) +
    line(437, 176, 437, 110, amber) +
    text(500, 120, "ΔT", 17, amber) +
    text(
      300,
      215,
      kind === "calorimetry"
        ? "Reaction and solution exchange energy"
        : "Temperature changes without a phase change",
    )
  );
}
function spring() {
  return (
    path(
      "M100 65V175M100 120H130l12 -25 18 50 18 -50 18 50 18 -50 18 50 18 -25H300",
    ) +
    box(300, 88, 78, 64, "Mass") +
    line(100, 179, 520, 179, "currentColor") +
    arrow(390, 120, 510, 120, amber) +
    line(245, 195, 378, 195, teal) +
    text(310, 221, "Extension from equilibrium", 14, teal)
  );
}
function balance() {
  return (
    path("M320 75V177M270 177H370M170 80H470") +
    circle(320, 75, 7) +
    path("M170 80l-55 75h110Z") +
    path("M470 80l-55 75h110Z", amber) +
    text(170, 184, "Mass", 14) +
    text(470, 184, "Molar mass", 14, amber) +
    text(320, 222, "Convert the sample into an amount of substance")
  );
}
function dilution() {
  return (
    box(70, 65, 150, 120, "") +
    dots(99, 95, 10) +
    arrow(245, 125, 365, 125, teal) +
    text(305, 99, "Add solvent", 13, teal) +
    box(395, 40, 180, 145, "") +
    dots(425, 90, 10) +
    text(145, 212, "Stock solution") +
    text(485, 212, "Diluted solution") +
    text(320, 235, "Same solute amount · greater final volume", 12)
  );
}
function gas() {
  return (
    box(85, 55, 180, 135, "") +
    path("M85 65H265", amber, 7) +
    dots(115, 95, 12) +
    arrow(295, 120, 355, 120, amber) +
    box(385, 55, 180, 135, "") +
    path("M385 110H565", amber, 7) +
    dots(415, 137, 12) +
    arrow(475, 35, 475, 92, amber) +
    text(175, 220, "Initial state") +
    text(475, 220, "Higher external pressure") +
    text(320, 22, "Fixed temperature and amount", 12)
  );
}
function reaction(kind) {
  const yieldMode = kind === "yield";
  return (
    box(65, 82, 180, 70, yieldMode ? "Expected product" : "Reactant A") +
    arrow(270, 117, 365, 117) +
    box(395, 82, 180, 70, yieldMode ? "Isolated product" : "Product B", teal) +
    text(
      320,
      55,
      yieldMode ? "Prediction → collection" : "Use the balanced reaction",
      16,
    ) +
    text(
      320,
      205,
      yieldMode
        ? "Actual collection can be below the theoretical amount"
        : "Coefficients relate amounts of reactants and products",
      13,
    )
  );
}
function halfLife() {
  return (
    line(90, 185, 550, 185, "currentColor") +
    line(90, 185, 90, 40, "currentColor") +
    path("M95 45C180 99 255 153 550 178", blue, 3) +
    text(320, 222, "Elapsed half-lives") +
    text(90, 24, "Amount remaining", 13) +
    [0, 1, 2, 3, 4]
      .map((i) => line(95 + i * 110, 180, 95 + i * 110, 190, "currentColor"))
      .join("") +
    text(460, 77, "Qualitative decay", 13, amber)
  );
}
function equilibrium() {
  return (
    box(95, 72, 145, 90, "A") +
    box(400, 72, 145, 90, "B", teal) +
    arrow(260, 99, 380, 99) +
    arrow(380, 135, 260, 135, teal) +
    text(320, 205, "Both directions continue at equilibrium")
  );
}
function buffer() {
  return (
    circle(170, 115, 38, blue) +
    text(170, 120, "HA", 20, blue) +
    circle(465, 115, 38, teal) +
    text(465, 120, "A⁻", 20, teal) +
    arrow(230, 102, 403, 102) +
    arrow(403, 132, 230, 132, teal) +
    text(320, 67, "Conjugate acid–base pair", 15) +
    text(320, 205, "Compare pH with pKa to reason about the balance", 13)
  );
}
function enzyme(kind) {
  const shape = path(
    "M90 160C40 110 85 55 140 63C165 25 210 48 225 73L206 101L235 127L263 105C310 145 280 202 220 190C170 225 120 205 90 160",
    blue,
    2,
    "var(--scene,transparent)",
  );
  if (kind === "competitive")
    return (
      shape +
      circle(265, 55, 15, teal, teal) +
      box(330, 40, 27, 27, "", amber) +
      arrow(280, 70, 257, 94, teal) +
      arrow(330, 77, 265, 102, amber) +
      text(410, 105, "Substrate / inhibitor", 14) +
      text(420, 136, "Same active site", 14, amber) +
      text(
        320,
        230,
        "A schematic of competition, not a concentration scale",
        12,
      )
    );
  if (kind === "turnover")
    return (
      shape +
      circle(265, 55, 15, teal, teal) +
      arrow(270, 75, 256, 97, teal) +
      arrow(305, 140, 395, 140) +
      circle(435, 122, 12, teal) +
      circle(458, 155, 12, teal) +
      text(433, 192, "Products", 14, teal) +
      text(320, 230, "Saturating substrate · active sites cycle repeatedly", 12)
    );
  return (
    line(350, 190, 590, 190, "currentColor") +
    line(350, 190, 350, 43, "currentColor") +
    path("M352 187C373 85 420 65 582 57", blue, 3) +
    line(350, 51, 590, 51, amber, "5 6") +
    text(470, 218, "Substrate", 13) +
    text(430, 30, "Reaction rate", 13) +
    shape +
    text(150, 230, "Enzyme", 13)
  );
}
function beer() {
  return (
    arrow(70, 120, 225, 120, amber) +
    box(250, 60, 110, 125, "Sample") +
    arrow(385, 120, 525, 120, amber) +
    text(140, 85, "Incident light", 13) +
    text(465, 85, "Transmitted light", 13) +
    line(250, 205, 360, 205, teal) +
    text(305, 229, "Path length", 12, teal) +
    path("M540 85V155M540 85Q590 120 540 155", teal)
  );
}
function chain() {
  return (
    [0, 1, 2, 3, 4, 5]
      .map(
        (_, i) =>
          circle(100 + i * 85, 115, 25, i % 2 ? teal : blue) +
          text(100 + i * 85, 120, "AA", 13) +
          (i
            ? line(100 + (i - 1) * 85 + 25, 115, 100 + i * 85 - 25, 115, amber)
            : ""),
      )
      .join("") +
    text(320, 55, "One linear peptide", 16) +
    text(320, 200, "Residues are nodes · peptide bonds are links", 14)
  );
}
function purification() {
  return (
    box(90, 70, 150, 115, "") +
    dots(112, 95, 18, blue, 6) +
    dots(122, 105, 7, amber, 6) +
    arrow(265, 125, 365, 125) +
    box(400, 70, 150, 115, "") +
    dots(425, 100, 7, amber, 4) +
    text(165, 216, "Total protein mixture", 13) +
    text(475, 216, "Enzyme fraction", 13) +
    text(320, 32, "Activity relative to total protein", 16)
  );
}
function glycolysis() {
  return (
    box(55, 85, 140, 70, "Glucose") +
    arrow(215, 120, 275, 120) +
    box(290, 85, 120, 70, "Glycolysis", teal) +
    arrow(430, 120, 490, 120) +
    text(545, 125, "Pyruvate", 16) +
    arrow(350, 45, 350, 75, amber) +
    text(350, 28, "ATP invested", 13, amber) +
    arrow(350, 165, 350, 200, teal) +
    text(350, 226, "ATP produced", 13, teal)
  );
}
function binding() {
  return (
    [0, 1, 2, 3]
      .map(
        (i) =>
          path(
            `M${70 + i * 145} 155v-55h30v22h28v-22h30v55Z`,
            blue,
            2,
            "var(--scene,transparent)",
          ) + (i >= 2 ? circle(114 + i * 145, 108, 10, amber, amber) : ""),
      )
      .join("") +
    text(320, 55, "Independent binding sites", 16) +
    text(170, 205, "Unoccupied") +
    text(470, 205, "Occupied", 14, amber) +
    text(
      320,
      235,
      "Diagram is illustrative; site counts are not question data",
      12,
    )
  );
}
function dna() {
  return (
    path("M180 45V195", blue, 3) +
    path("M460 45V195", teal, 3) +
    [75, 120, 165]
      .map(
        (y, i) =>
          line(180, y, 240, y, blue) +
          text(255, y + 5, i === 1 ? "G" : "A", 15) +
          line(278, y, 362, y, amber, "3 5") +
          text(385, y + 5, i === 1 ? "C" : "T", 15) +
          line(400, y, 460, y, teal),
      )
      .join("") +
    text(320, 222, "Complementary bases pair across the two strands", 13)
  );
}
function hardy() {
  return (
    box(210, 57, 230, 150, "") +
    line(325, 57, 325, 207) +
    line(210, 132, 440, 132) +
    text(268, 38, "p", 17) +
    text(382, 38, "q", 17, amber) +
    text(185, 100, "p", 17) +
    text(185, 175, "q", 17, amber) +
    text(267, 102, "AA", 16) +
    text(382, 102, "Aa", 16) +
    text(267, 178, "Aa", 16) +
    text(382, 178, "aa", 16, amber) +
    text(320, 234, "Allele frequencies describe the gamete pool", 12)
  );
}
function heart() {
  return (
    path(
      "M295 170C180 105 222 35 275 63L295 85L315 63C368 35 410 105 295 170",
      blue,
      2,
      "var(--scene,transparent)",
    ) +
    arrow(385, 110, 530, 110, teal) +
    text(460, 86, "Blood per beat", 13, teal) +
    path("M75 200H140l12 -14 12 28 15 -50 17 36H275", amber, 2) +
    text(150, 235, "Beats per minute", 12, amber) +
    text(435, 202, "Volume pumped over time", 14)
  );
}
function lungs() {
  return (
    path("M320 35V100M320 100L265 130M320 100L375 130", blue, 6) +
    path(
      "M288 95C205 88 170 150 205 192C245 224 295 203 295 158V112Z",
      blue,
      2,
      "var(--scene,transparent)",
    ) +
    path(
      "M352 95C435 88 470 150 435 192C395 224 345 203 345 158V112Z",
      teal,
      2,
      "var(--scene,transparent)",
    ) +
    text(455, 54, "Conducting airways", 13, amber) +
    line(385, 59, 329, 70, amber) +
    [
      [-8, -5],
      [3, -9],
      [11, 2],
      [0, 10],
      [-10, 7],
    ]
      .map(([dx, dy]) => circle(237 + dx, 168 + dy, 7, teal))
      .join("") +
    text(110, 155, "Alveoli", 13) +
    line(145, 150, 220, 166) +
    text(
      320,
      235,
      "Not every part of an inhaled breath reaches gas exchange",
      12,
    )
  );
}
function kidney() {
  return (
    box(65, 85, 145, 65, "Plasma") +
    arrow(230, 117, 290, 117) +
    path(
      "M365 55C285 35 270 195 365 182Q405 172 378 135Q355 125 378 105Q405 66 365 55",
      blue,
      2,
      "var(--scene,transparent)",
    ) +
    arrow(400, 140, 455, 140, amber) +
    box(470, 108, 120, 65, "Urine", amber) +
    text(135, 190, "Concentration", 13) +
    text(525, 202, "Concentration + flow", 12, amber) +
    text(320, 28, "Removal from plasma", 16)
  );
}
function cells() {
  return (
    circle(100, 120, 24) +
    arrow(140, 120, 235, 120) +
    circle(280, 85, 20, teal) +
    circle(280, 155, 20, teal) +
    arrow(325, 120, 420, 120) +
    [70, 103, 137, 170].map((y) => circle(480, y, 13, blue)).join("") +
    text(100, 205, "Start") +
    text(280, 205, "Division") +
    text(480, 205, "Next generation") +
    text(320, 31, "Each surviving cell divides once per generation", 14)
  );
}
function enantiomers() {
  const molecule = (cx, mirror, color) =>
    circle(cx, 115, 9, color) +
    text(cx, 120, "C", 12, color) +
    line(cx, 106, cx, 55, color) +
    text(cx, 41, "A", 15, color) +
    line(cx + 9 * mirror, 115, cx + 66 * mirror, 115, color) +
    text(cx + 83 * mirror, 120, "B", 15, color) +
    path(
      `M${cx - 6 * mirror} 122L${cx - 67 * mirror} 158L${cx - 52 * mirror} 174Z`,
      color,
      1,
      color,
    ) +
    text(cx - 76 * mirror, 184, "D", 15, color) +
    path(`M${cx + 5 * mirror} 124L${cx + 42 * mirror} 183`, color, 2) +
    [0, 1, 2, 3]
      .map((i) =>
        line(
          cx + (12 + i * 8) * mirror - 4,
          136 + i * 12,
          cx + (12 + i * 8) * mirror + 4,
          136 + i * 12,
          "var(--bg, #101319)",
        ),
      )
      .join("") +
    text(cx + 55 * mirror, 204, "E", 15, color);
  return (
    line(320, 40, 320, 205, "currentColor", "5 6") +
    molecule(170, 1, blue) +
    molecule(470, -1, teal) +
    text(170, 24, "Enantiomer 1", 14) +
    text(470, 24, "Enantiomer 2", 14) +
    text(320, 240, "Opposite arrangements about a tetrahedral center", 12)
  );
}
function tlc() {
  return (
    box(210, 30, 180, 180, "") +
    line(210, 177, 390, 177, "currentColor") +
    line(210, 57, 390, 57, teal, "5 5") +
    circle(300, 122, 10, blue, blue) +
    text(460, 61, "Solvent front", 13, teal) +
    text(465, 126, "Compound spot", 13) +
    text(460, 181, "Baseline", 13) +
    line(180, 177, 180, 122, blue) +
    line(150, 177, 150, 57, teal) +
    text(300, 235, "Compare distances measured from the same baseline", 12)
  );
}
function partition() {
  return (
    path("M230 35H410V120L342 180V213H298V180L230 120Z") +
    line(230, 95, 410, 95, amber) +
    `<path d="M231 96H409V120L341 180H299L231 120Z" fill="${blue}" opacity=".12"/>` +
    dots(258, 57, 8, amber, 4) +
    dots(286, 120, 4, blue, 4) +
    text(475, 73, "Phase 1", 14, amber) +
    text(475, 135, "Phase 2", 14) +
    text(320, 237, "Which layer is organic depends on solvent density", 12)
  );
}
function sn2() {
  return (
    circle(100, 115, 22, teal) +
    text(100, 120, "Nu", 14, teal) +
    arrow(140, 115, 264, 115, teal) +
    circle(320, 115, 22) +
    text(320, 121, "C", 18) +
    line(342, 115, 440, 115) +
    circle(465, 115, 22, amber) +
    text(465, 120, "LG", 14, amber) +
    path("M320 93L290 58M320 137L290 173M337 101L370 62") +
    text(282, 48, "H", 14) +
    text(282, 191, "H", 14) +
    text(378, 52, "H", 14) +
    text(320, 213, "Nucleophile + substrate · a bimolecular encounter", 13) +
    text(520, 76, "Leaving group", 12, amber)
  );
}
function nmr() {
  return (
    line(70, 185, 580, 185, "currentColor") +
    path(
      "M80 184H140l5 -50 5 50H235l5 -100 5 100H395l5 -65 5 65H570",
      blue,
      2,
    ) +
    path("M100 165H140V145H235V100H395V70H540", amber, 2) +
    text(320, 220, "Chemical shift", 13) +
    text(320, 30, "Signal integral tracks proton amount", 16) +
    text(490, 97, "Integral trace", 12, amber)
  );
}
function optical() {
  return (
    arrow(50, 125, 130, 125, blue) +
    box(150, 75, 55, 100, "") +
    line(177, 88, 177, 160, blue) +
    arrow(225, 125, 280, 125) +
    box(300, 80, 140, 90, "Sample") +
    arrow(460, 125, 510, 125) +
    circle(555, 125, 40, amber) +
    line(530, 150, 580, 100, amber) +
    text(177, 208, "Polarizer", 13) +
    text(370, 208, "Known path length", 13) +
    text(555, 208, "Rotation", 13, amber)
  );
}
function risks(kind) {
  return (
    box(100, 62, 165, 125, "") +
    dots(130, 92, 15, blue) +
    box(375, 62, 165, 125, "") +
    dots(405, 92, 15, teal) +
    text(182, 216, kind === "absolute-risk" ? "Control group" : "Group A", 13) +
    text(
      457,
      216,
      kind === "absolute-risk" ? "Intervention group" : "Group B",
      13,
    ) +
    text(
      320,
      30,
      kind === "absolute-risk"
        ? "Compare outcome proportions"
        : "Compare risk between groups",
      16,
    ) +
    text(
      320,
      239,
      "Schematic cohorts; dot counts do not encode the reported risks",
      11,
    )
  );
}
function mean() {
  return (
    line(90, 175, 550, 175, "currentColor") +
    [130, 240, 350, 460]
      .map(
        (x, i) =>
          circle(x, 105 - i * 12, 10, i % 2 ? teal : blue) +
          line(x, 125 - i * 12, x, 175, i % 2 ? teal : blue) +
          text(x, 205, ["Score 1", "Score 2", "Score 3", "Score 4"][i], 12),
      )
      .join("") +
    text(320, 38, "Summarize four observations", 16) +
    text(
      320,
      237,
      "Positions are illustrative; use the values in the question",
      11,
    )
  );
}
function zScore() {
  return (
    line(80, 150, 565, 150, "currentColor") +
    Array.from({ length: 7 }, (_, i) =>
      line(110 + i * 70, 142, 110 + i * 70, 158, blue),
    ).join("") +
    text(320, 185, "Mean", 13) +
    text(180, 185, "−2 SD", 13) +
    text(460, 185, "+2 SD", 13) +
    arrow(320, 105, 460, 105, amber) +
    text(390, 83, "Distance in SD units", 13, amber) +
    text(
      320,
      230,
      "A standardized score does not require a normal distribution",
      12,
    )
  );
}
function attrition() {
  return (
    box(50, 90, 165, 65, "Enrolled cohort") +
    arrow(235, 122, 300, 122) +
    box(345, 45, 230, 60, "Retained at follow-up", teal) +
    box(345, 145, 230, 60, "Lost to follow-up", amber) +
    path("M300 122V75H335", teal) +
    path("M300 122V175H335", amber) +
    text(320, 235, "Track outcomes against the original enrollment", 12)
  );
}
function sensitivity() {
  return (
    box(75, 45, 490, 160, "") +
    box(105, 86, 220, 77, "Detected by screen", teal) +
    box(345, 86, 190, 77, "Missed by screen", amber) +
    text(320, 28, "Participants who truly have the condition", 16) +
    text(320, 228, "Separate detection from the underlying condition", 13)
  );
}
function cars(index) {
  const labels = [
    ["AUTHOR", "Critic", "Author’s response"],
    ["ARGUMENT", "Observation", "Interpretation"],
    ["TRANSFER", "Passage idea", "New situation"],
    ["REASONING", "Textual choice", "Author’s concern"],
  ][index - 1];
  return (
    text(320, 31, labels[0], 12, teal) +
    box(70, 70, 200, 105, labels[1]) +
    arrow(290, 122, 350, 122) +
    box(370, 70, 200, 105, labels[2], teal) +
    text(
      320,
      216,
      "Return to the passage before judging the answer choices",
      13,
    )
  );
}
const DEFINITIONS = {
  force: [
    () => cart("force"),
    "Represent the mass and acceleration before calculating.",
    "Fnet = ma",
  ],
  work: [
    () => cart("work"),
    "Track force direction and displacement.",
    "W = Fd cos θ",
  ],
  kinetic: [
    () => cart("kinetic"),
    "Motion carries kinetic energy; use the stated mass and speed.",
    "K = ½mv²",
  ],
  momentum: [
    () => cart("momentum"),
    "Treat momentum as a property of mass in motion.",
    "p = mv",
  ],
  pressure: [
    () => vessel("pressure"),
    "The marked point is below the liquid surface.",
    "Gauge pressure = ρgh",
  ],
  flow: [
    () =>
      path("M65 65H245L395 100H575M65 190H245L395 155H575") +
      arrow(100, 125, 210, 125) +
      arrow(420, 125, 540, 125) +
      line(175, 65, 175, 190, amber, "4 4") +
      text(175, 220, "Cross-sectional area", 13, amber) +
      text(475, 195, "Flow direction", 13),
    "Imagine a slice of fluid crossing the marked area each second.",
    "Volume flow Q = Av",
  ],
  ohm: [
    () => circuit("ohm"),
    "A simple resistor circuit; values come from the question.",
    "V = IR",
  ],
  power: [
    () => circuit("power"),
    "A resistor converts electrical energy to thermal energy.",
    "P = IV = I²R",
  ],
  wave: [
    wave,
    "A repeating spatial pattern travels through the medium.",
    "Wave speed = frequency × wavelength",
  ],
  lens: [
    lens,
    "Identify the lens, object, and focal points. Distances are not to scale.",
    "1/f = 1/do + 1/di",
  ],
  heat: [
    () => heat("heat"),
    "Follow the energy entering the sample.",
    "Q = mcΔT",
  ],
  spring: [
    spring,
    "Measure extension relative to the relaxed spring.",
    "Uspring = ½kx²",
  ],
  moles: [
    balance,
    "Molar mass connects a sample’s mass to its amount.",
    "n = mass / molar mass",
  ],
  molarity: [
    () => vessel("molarity"),
    "The relevant volume is the final solution volume.",
    "M = n / V",
  ],
  dilution: [
    dilution,
    "Adding solvent spreads the same solute through a larger volume.",
    "C₁V₁ = C₂V₂",
  ],
  gas: [
    gas,
    "Compression at fixed temperature and fixed gas amount.",
    "P₁V₁ = P₂V₂",
  ],
  stoich: [
    () => reaction("stoich"),
    "Read coefficients from the reaction in the question.",
    "Mole ratios follow balanced coefficients",
  ],
  yield: [
    () => reaction("yield"),
    "Distinguish predicted product from the collected product.",
    "Actual yield = theoretical yield × fractional yield",
  ],
  calorimetry: [
    () => heat("calorimetry"),
    "In the stated ideal model, heat moves between reaction and solution.",
    "qsolution = mcΔT; qreaction = −qsolution",
  ],
  "half-life": [
    halfLife,
    "The curve shows qualitative first-order decay, not numerical data.",
    "Remaining fraction = (½)ⁿ after n half-lives",
  ],
  osmolar: [
    () => vessel("osmolar"),
    "Count independently moving particles after ideal dissociation.",
    "Ideal osmolar concentration = i × molarity",
  ],
  equilibrium: [
    equilibrium,
    "Equilibrium is dynamic: both directions still occur.",
    "For A ⇌ B: Kc = [B] / [A]",
  ],
  "buffer-ratio": [
    buffer,
    "A buffer contains a weak acid and its conjugate base.",
    "pH = pKa + log₁₀([A⁻]/[HA])",
  ],
  "electrical-charge": [
    () => circuit("charge"),
    "Track current over the time interval.",
    "Q = It",
  ],
  michaelis: [
    () => enzyme("michaelis"),
    "Qualitative saturation curve; use the supplied Vmax and Km.",
    "v = Vmax[S] / (Km + [S])",
  ],
  turnover: [
    () => enzyme("turnover"),
    "Active sites repeatedly convert substrate into product.",
    "Vmax = kcat × amount of active sites",
  ],
  beer: [
    beer,
    "Light passes through a sample of known path length.",
    "Absorbance A = εlc",
  ],
  "peptide-bonds": [
    chain,
    "A linear peptide has a backbone with linked amino-acid residues.",
    "A linear chain of n residues has n − 1 peptide bonds",
  ],
  "specific-activity": [
    purification,
    "Compare enzyme activity with total protein in the fraction.",
    "Specific activity = activity units / total protein mass",
  ],
  glycolysis: [
    glycolysis,
    "Separate ATP investment from ATP production.",
    "Glycolysis nets 2 ATP per glucose converted to pyruvate",
  ],
  competitive: [
    () => enzyme("competitive"),
    "Substrate and competitive inhibitor compete for the active site.",
    "Apparent Km = αKm; Vmax is unchanged",
  ],
  binding: [
    binding,
    "Occupied and unoccupied sites coexist. This is not a quantitative count.",
    "Fraction occupied = [L] / (Kd + [L])",
  ],
  "dna-bonds": [
    dna,
    "Two complementary strands are connected by paired bases.",
    "A–T has 2 and G–C has 3 hydrogen bonds",
  ],
  hardy: [
    hardy,
    "Use allele frequencies to reason about expected genotypes.",
    "Expected aa count = q² × population size",
  ],
  "cardiac-output": [
    heart,
    "Each heartbeat ejects a stroke volume.",
    "Cardiac output = stroke volume × heart rate",
  ],
  ventilation: [
    lungs,
    "Distinguish conducting airways from gas-exchange regions.",
    "Alveolar ventilation = (tidal volume − dead space) × rate",
  ],
  clearance: [
    kidney,
    "Relate the plasma, urine, and urine flow measurements.",
    "Clearance = (urine concentration × urine flow) / plasma concentration",
  ],
  "cell-growth": [
    cells,
    "A branching model of successive cell divisions.",
    "After g divisions: N = N₀ × 2ᵍ",
  ],
  "enantiomeric-excess": [
    enantiomers,
    "A conceptual mirror-pair schematic, not a complete molecular structure.",
    "Enantiomeric excess = |%R − %S|",
  ],
  rf: [
    tlc,
    "Both travel distances begin at the baseline. Diagram is not to scale.",
    "Rf = compound distance / solvent-front distance",
  ],
  partition: [
    partition,
    "Solute distributes between two immiscible phases.",
    "K = concentrationorganic / concentrationaqueous",
  ],
  sn2: [
    sn2,
    "An SN2 encounter involves both nucleophile and substrate.",
    "Rate factors multiply when both concentrations change",
  ],
  "nmr-integral": [
    nmr,
    "Compare integrated signal areas rather than peak height.",
    "Proton counts are proportional to integrated signal areas",
  ],
  optical: [
    optical,
    "A chiral sample rotates the plane of polarized light.",
    "Observed rotation α = [α]lc",
  ],
  risk: [
    () => risks("risk"),
    "Compare the probabilities reported for the two groups.",
    "Relative risk = risk A / risk B",
  ],
  "absolute-risk": [
    () => risks("absolute-risk"),
    "Compare adverse-outcome proportions between groups.",
    "Absolute risk reduction = control risk − intervention risk",
  ],
  mean: [
    mean,
    "Each observation contributes to the arithmetic mean.",
    "Mean = sum of observations / number of observations",
  ],
  "z-score": [
    zScore,
    "Locate the observation relative to the mean in SD units.",
    "z = (score − mean) / SD",
  ],
  attrition: [
    attrition,
    "Distinguish participants retained from those lost to follow-up.",
    "Attrition = lost / originally enrolled × 100%",
  ],
  sensitivity: [
    sensitivity,
    "Consider only people who truly have the condition.",
    "Sensitivity = true positives / all actually positive",
  ],
  "cars-1": [
    () => cars(1),
    "Map the viewpoints without adding assumptions from outside the passage.",
    "",
  ],
  "cars-2": [
    () => cars(2),
    "Separate what is observed from how it is interpreted.",
    "",
  ],
  "cars-3": [
    () => cars(3),
    "Test whether the relationship, not just the subject, transfers.",
    "",
  ],
  "cars-4": [
    () => cars(4),
    "Track the purpose and consequences of a textual choice.",
    "",
  ],
};
export const PRACTICE_ART_FAMILIES = Object.freeze(Object.keys(DEFINITIONS));
export function practiceArt(question, { revealed = false } = {}) {
  const entry = DEFINITIONS[question?.family];
  if (!entry) return "";
  const [draw, caption, formula] = entry;
  return `<figure class="practice-art concept-figure" data-art-family="${esc(question.family)}"><svg viewBox="0 0 640 250" role="img" aria-label="${esc(question.topic || question.family)} — conceptual setup" xmlns="http://www.w3.org/2000/svg">${draw()}</svg><figcaption>${esc(caption)}</figcaption>${revealed && formula ? `<div class="visual-takeaway">${esc(formula)}</div>` : ""}</figure>`;
}
