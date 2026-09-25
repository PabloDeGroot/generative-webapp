const FONT_HREF = "https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,500;12..96,700;12..96,800&family=DM+Mono:wght@400;500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,700&display=swap";
function loadFonts() {
  if (document.querySelector("link[data-kit-fonts=\"wayfarer\"]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = FONT_HREF; link.dataset.kitFonts = "wayfarer";
  document.head.appendChild(link);
}
const esc = (v) => String(v ?? "").replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));
const json = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const money = (amount, currency) => { try { return new Intl.NumberFormat(undefined, { style: "currency", currency: currency || "EUR", maximumFractionDigits: 0 }).format(amount || 0); } catch { return `${Math.round(amount || 0)} ${currency || ""}`.trim(); } };
const day = (iso, opts) => { const d = new Date(`${iso}T12:00:00Z`); return isNaN(d) ? String(iso ?? "") : d.toLocaleDateString(undefined, { timeZone: "UTC", ...opts }); };
const TOKENS = `:host { display: block; --page: #ffffff; --sky: #e6f2f6; --sea: #0d6f78; --coral: #f0643f; --sun: #f2b53a; --harbour: #13293d; --line: #d5e5ea; --soft: #5b7385;
  --display: "Bricolage Grotesque", "DM Sans", system-ui, sans-serif; --sans: "DM Sans", system-ui, sans-serif; --mono: "DM Mono", ui-monospace, monospace;
  color: var(--harbour); font-family: var(--sans); }
* { box-sizing: border-box; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--sea); outline-offset: 2px; }
.num { font-family: var(--mono); font-variant-numeric: tabular-nums; }`;

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
