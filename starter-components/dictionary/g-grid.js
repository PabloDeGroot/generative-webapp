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

const GAPS = { tight: "8px", normal: "14px", loose: "22px" };

class GGrid extends HTMLElement {
  static get observedAttributes() { return ["min-width", "gap"]; }
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
    const min = Math.min(Math.max(Number(this.getAttribute("min-width")) || 220, 120), 600);
    const gap = GAPS[this.getAttribute("gap")] || GAPS.normal;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(${min}px, 100%), 1fr)); gap: ${gap}; padding: 12px 20px; align-items: stretch; }
      ::slotted(*) { min-width: 0; }
    </style><div class="grid"><slot></slot></div>`;
  }
}
customElements.define("g-grid", GGrid);
