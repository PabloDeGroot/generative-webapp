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

class GSearchBox extends HTMLElement {
  static get observedAttributes() { return ["value", "placeholder"]; }
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
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      form { display: flex; flex-wrap: wrap; gap: 8px; padding: 16px 20px; }
      input { flex: 1 1 220px; min-width: 0; font: 18px var(--serif); color: var(--ink); background: #fbf6ea; border: 1px solid var(--sepia); border-radius: 4px; padding: 10px 14px; }
      button { font: 600 14px var(--sans); color: var(--paper); background: var(--ink); border: 0; border-radius: 4px; padding: 10px 18px; cursor: pointer; }
    </style>
    <form role="search"><input name="q" aria-label="Search words" autocomplete="off" value="${esc(this.getAttribute("value"))}" placeholder="${esc(this.getAttribute("placeholder") || "Search words")}"><button type="submit">Search</button></form>`;
    this.shadowRoot.querySelector("form").addEventListener("submit", (e) => {
      e.preventDefault();
      const q = this.shadowRoot.querySelector("input").value.trim();
      if (q) location.href = `/search/${encodeURIComponent(q)}`;
    });
  }
}
customElements.define("g-search-box", GSearchBox);
