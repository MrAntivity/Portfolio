import { Marked } from "./vendor/marked.mjs";
import DOMPurify from "./vendor/purify.mjs";
import katex from "./vendor/katex/katex.mjs";
const escape = (s) =>
  String(s ?? "").replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const markdown = new Marked({
  gfm: true,
  breaks: false,
  renderer: {
    html: (token) => escape(token.text),
    image: (token) => escape(token.text || ""),
  },
});
markdown.use({
  extensions: [
    {
      name: "studyMath",
      level: "inline",
      start(src) {
        const n = src.search(/\\[\[(]|\$/);
        return n < 0 ? undefined : n;
      },
      tokenizer(src) {
        const patterns = [
          [/^\\\[([\s\S]*?)\\\]/, true],
          [/^\$\$([\s\S]*?)\$\$/, true],
          [/^\\\(([\s\S]*?)\\\)/, false],
          [/^\$([^$\n]+?)\$(?!\d)/, false],
        ];
        for (const [pattern, display] of patterns) {
          const match = pattern.exec(src);
          if (match)
            return {
              type: "studyMath",
              raw: match[0],
              math: match[1],
              display,
            };
        }
      },
      renderer(token) {
        try {
          return `<span class="${token.display ? "equation" : "inline-equation"}">${katex.renderToString(token.math, { displayMode: token.display, throwOnError: true, trust: false, strict: "ignore", maxSize: 20, maxExpand: 500, output: "htmlAndMathml" })}</span>`;
        } catch {
          return `<code class="math-fallback">${escape(token.math)}</code>`;
        }
      },
    },
  ],
});
export function renderAI(text) {
  // Markdown and math are untrusted model output; sanitize the combined result.
  const html = markdown.parse(String(text ?? "").slice(0, 60000));
  return DOMPurify.sanitize(html, {
    FORBID_TAGS: [
      "img",
      "iframe",
      "object",
      "embed",
      "form",
      "input",
      "button",
      "textarea",
      "video",
      "audio",
    ],
    FORBID_ATTR: ["id", "name"],
    ALLOW_DATA_ATTR: false,
  });
}
