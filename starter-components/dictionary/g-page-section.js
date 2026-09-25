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

class GPageSection extends HTMLElement {
  static get observedAttributes() { return ["eyebrow", "heading"]; }
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
    const eyebrow = this.getAttribute("eyebrow");
    const heading = this.getAttribute("heading");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      section { display: grid; gap: 12px; padding: 24px 20px; max-width: 880px; margin: 0 auto; }
      .eyebrow { font: 500 11px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--sepia); }
      h2 { margin: 0; font: 600 28px/1.2 var(--serif); letter-spacing: -0.01em; text-wrap: balance; }
    </style>
    <section>${eyebrow ? `<span class="eyebrow">${esc(eyebrow)}</span>` : ""}${heading ? `<h2>${esc(heading)}</h2>` : ""}<slot></slot></section>`;
  }
}
customElements.define("g-page-section", GPageSection);
