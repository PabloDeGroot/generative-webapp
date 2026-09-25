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

const LINKS = [["today", "Today", "/today"], ["random", "Random", "/random"], ["search", "Search", "/search"], ["favorites", "Favorites", "/favorites"]];

class GSiteHeader extends HTMLElement {
  static get observedAttributes() { return ["site-name", "current"]; }
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
    const name = this.getAttribute("site-name") || "Lexicon";
    const current = (this.getAttribute("current") || "").toLowerCase();
    const cut = Math.min(3, name.length);
    const links = LINKS.map(([key, label, href]) => `<a href="${href}" class="${key === current ? "on" : ""}">${label}</a>`).join("");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      header { display: flex; align-items: center; gap: 20px; flex-wrap: wrap; padding: 14px 20px; background: var(--paper); border-bottom: 1px solid var(--rule); }
      .logo { font: 600 26px/1 var(--serif); letter-spacing: -0.01em; text-decoration: none; }
      .logo em { font-style: italic; font-weight: 400; color: var(--sepia); }
      nav { display: flex; gap: 18px; flex-wrap: wrap; margin-left: auto; font-size: 14px; }
      nav a, ::slotted(a) { text-decoration: none; opacity: .8; padding-bottom: 2px; border-bottom: 2px solid transparent; }
      nav a:hover { opacity: 1; }
      nav a.on { opacity: 1; border-bottom-color: var(--gilt); }
    </style>
    <header><a class="logo" href="/">${esc(name.slice(0, cut))}<em>${esc(name.slice(cut))}</em></a>
      <nav><slot name="nav">${links}</slot></nav></header>`;
  }
}
customElements.define("g-site-header", GSiteHeader);
