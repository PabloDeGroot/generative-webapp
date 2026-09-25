const FONT_HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap";
function loadFonts() {
  if (document.querySelector("link[data-kit-fonts=\"lexicon\"]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = FONT_HREF; link.dataset.kitFonts = "lexicon";
  document.head.appendChild(link);
}
const esc = (v) => String(v ?? "").replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));
const json = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const TOKENS = `:host { display: block; --paper: #f3ead7; --vellum: #ebdfc5; --ink: #3b2a1e; --sepia: #8a5a3b; --gilt: #a0721a; --rule: #d6c3a0;
  --serif: "Newsreader", Georgia, "Times New Roman", serif; --sans: "IBM Plex Sans", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
  color: var(--ink); font-family: var(--sans); }
* { box-sizing: border-box; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--gilt); outline-offset: 2px; }`;

class GDefinitionList extends HTMLElement {
  static get observedAttributes() { return ["definitions"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  render() {
    const defs = json(this.getAttribute("definitions"), []).map((d) => (typeof d === "string" ? { text: d } : d || {}));
    const items = defs.map((d, i) => `<li><span class="n">${i + 1}</span><p>${esc(d.text || d.definition)}</p>${d.example ? `<p class="ex">“${esc(d.example)}”</p>` : ""}</li>`).join("");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      ol { list-style: none; margin: 0; padding: 16px 20px; display: grid; gap: 16px; max-width: 72ch; }
      li { display: grid; grid-template-columns: 30px 1fr; gap: 4px 10px; }
      .n { font: 600 20px/1.35 var(--serif); color: var(--gilt); }
      p { margin: 0; font: 18px/1.5 var(--serif); }
      .ex { grid-column: 2; font: italic 16px/1.5 var(--serif); color: var(--sepia); }
      .empty { font: italic 16px var(--serif); color: var(--sepia); }
    </style>${defs.length ? `<ol>${items}</ol>` : `<ol><li class="empty">No definitions found.</li></ol>`}`;
  }
}
customElements.define("g-definition-list", GDefinitionList);
