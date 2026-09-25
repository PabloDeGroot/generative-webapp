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

class GWordCard extends HTMLElement {
  static get observedAttributes() { return ["word", "part-of-speech", "gloss"]; }
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
    const word = this.getAttribute("word") || "";
    const pos = this.getAttribute("part-of-speech");
    const gloss = this.getAttribute("gloss");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      :host { display: block; height: 100%; }
      a { display: grid; gap: 4px; align-content: start; height: 100%; text-decoration: none; background: var(--vellum); border-top: 3px solid var(--gilt); padding: 12px 14px; }
      a:hover { background: #e5d6b6; }
      b { font: 600 20px var(--serif); overflow-wrap: anywhere; }
      i { font: italic 14px var(--serif); color: var(--sepia); }
      span { font-size: 13px; line-height: 1.45; }
    </style>
    <a href="/word/${encodeURIComponent(word)}"><b>${esc(word)}</b>${pos ? `<i>${esc(pos)}</i>` : ""}${gloss ? `<span>${esc(gloss)}</span>` : ""}</a>`;
  }
}
customElements.define("g-word-card", GWordCard);
