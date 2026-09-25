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

class GSplit extends HTMLElement {
  static get observedAttributes() { return ["aside-width", "aside-side", "sticky"]; }
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
    const width = this.getAttribute("aside-width") === "wide" ? 360 : 280;
    const left = this.getAttribute("aside-side") === "left";
    const sticky = this.hasAttribute("sticky");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .split { display: grid; grid-template-columns: minmax(0, 1fr); gap: 24px; padding: 16px 20px; max-width: 1180px; margin: 0 auto; }
      main, aside { display: grid; gap: 16px; align-content: start; min-width: 0; }
      @media (min-width: 860px) {
        .split { grid-template-columns: ${left ? `${width}px minmax(0, 1fr)` : `minmax(0, 1fr) ${width}px`}; }
        aside { ${left ? "order: -1;" : ""} ${sticky ? "position: sticky; top: 16px; align-self: start;" : ""} }
      }
    </style><div class="split"><main><slot></slot></main><aside><slot name="aside"></slot></aside></div>`;
  }
}
customElements.define("g-split", GSplit);
