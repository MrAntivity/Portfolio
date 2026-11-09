// Describe the actual displayed model to the text-only tutor, including legend colors.
export function diagramContext(root) {
  const figure = root.querySelector(
    ".lesson-stage .concept-figure, .practice-stage .practice-art",
  );
  const labels = figure
    ? [...figure.querySelectorAll("svg text")]
        .map((el) => {
          const fill = el.getAttribute("fill") || "";
          const color = /diagram-blue|--accent|8cddf5|77cee8/i.test(fill)
            ? "blue / cyan"
            : /diagram-amber|efb76a|e7b66a/i.test(fill)
              ? "orange / amber"
              : /diagram-teal|75d9bc|76cbb7/i.test(fill)
                ? "teal"
                : "neutral";
          return { label: el.textContent.trim(), color };
        })
        .filter((x) => x.label)
    : [];
  const lab = root.querySelector(".concept-lab");
  return {
    caption: figure?.querySelector("figcaption")?.textContent.trim() || "",
    diagramLabels: labels,
    ...(lab
      ? {
          interactiveModel: lab.querySelector("h3")?.textContent,
          controls: [...lab.querySelectorAll("[data-control]")].map(
            (input) => ({
              label: input.closest("label")?.textContent.trim(),
              value:
                input.tagName === "SELECT"
                  ? input.selectedOptions[0]?.textContent
                  : input.value,
            }),
          ),
          currentResult: lab.querySelector(".lab-result")?.textContent.trim(),
        }
      : {}),
  };
}
export function withDiagramContext(context, visual) {
  if (!visual.diagramLabels.length && !visual.interactiveModel) return context;
  if (context.question && typeof context.question === "object")
    return {
      ...context,
      question: { ...context.question, displayedVisual: visual },
    };
  return {
    ...context,
    lesson:
      (context.lesson || "") +
      "\nDisplayed visual (use these exact labels and color assignments, not an assumed convention):\n" +
      JSON.stringify(visual),
  };
}
