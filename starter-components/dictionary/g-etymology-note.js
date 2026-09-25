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

class GEtymologyNote extends HTMLElement {
  static get observedAttributes() { return ["stages", "text"]; }
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
    const stages = json(this.getAttribute("stages"), []).filter((s) => s && s.form);
    const text = this.getAttribute("text");
    const chain = stages.map((s) => `<span class="stage"><span class="form">${esc(s.form)}</span>${s.note ? `<small>${esc(s.note)}</small>` : ""}</span>`).join(`<span class="arrow" aria-hidden="true">→</span>`);
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 10px; padding: 16px 20px; }
      .eyebrow { font: 500 11px var(--mono); letter-spacing: .12em; text-transform: uppercase; color: var(--sepia); }
      .chain { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .stage { display: grid; gap: 2px; background: var(--vellum); border: 1px solid var(--rule); border-radius: 4px; padding: 6px 10px; }
      .form { font: 16px var(--serif); }
      small { font: 11px var(--mono); color: var(--sepia); }
      .arrow { color: var(--gilt); }
      p { margin: 0; font: 17px/1.55 var(--serif); max-width: 70ch; }
    </style>
    <div class="wrap"><span class="eyebrow">Origin</span>${stages.length ? `<div class="chain">${chain}</div>` : ""}${!stages.length && text ? `<p>${esc(text)}</p>` : ""}</div>`;
  }
}
customElements.define("g-etymology-note", GEtymologyNote);
