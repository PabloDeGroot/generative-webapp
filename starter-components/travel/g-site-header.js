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

const LINKS = [["destinations", "Destinations", "/"], ["trips", "My trips", "/trips"]];

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
    const current = (this.getAttribute("current") || "").toLowerCase();
    const links = LINKS.map(([key, label, href]) => `<a href="${href}" class="${key === current ? "on" : ""}">${label}</a>`).join("");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      header { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 12px 20px; background: var(--page); border-bottom: 1px solid var(--line); }
      .logo { display: inline-flex; align-items: center; gap: 7px; font: 800 22px var(--display); letter-spacing: -0.02em; text-decoration: none; }
      .logo i { width: 12px; height: 12px; border-radius: 50%; background: var(--coral); }
      nav { display: flex; gap: 6px; flex-wrap: wrap; }
      nav a, ::slotted(a) { text-decoration: none; font-size: 14px; font-weight: 500; padding: 6px 12px; border-radius: 999px; }
      nav a:hover { background: var(--sky); }
      nav a.on { background: var(--sky); color: var(--sea); }
      .account { margin-left: auto; display: flex; align-items: center; }
    </style>
    <header><a class="logo" href="/"><i></i>${esc(this.getAttribute("site-name") || "Wayfarer")}</a>
      <nav><slot name="nav">${links}</slot></nav><div class="account"><slot name="account"></slot></div></header>`;
  }
}
customElements.define("g-site-header", GSiteHeader);
