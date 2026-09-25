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

class GDestinationHero extends HTMLElement {
  static get observedAttributes() { return ["image-url", "place", "country", "flag", "timezone", "region"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._timer = null;
  }
  connectedCallback() {
    loadFonts();
    this.render();
    this._timer = setInterval(() => this.updateClock(), 30000);
  }
  disconnectedCallback() {
    clearInterval(this._timer);
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  localTime() {
    const tz = this.getAttribute("timezone");
    if (!tz) return "";
    try { return new Date().toLocaleTimeString(undefined, { timeZone: tz, hour: "2-digit", minute: "2-digit" }); } catch { return ""; }
  }
  updateClock() {
    const el = this.shadowRoot.querySelector(".clock");
    if (el) el.textContent = `${this.localTime()} local`;
  }
  render() {
    const img = this.getAttribute("image-url");
    const country = this.getAttribute("country");
    const flag = this.getAttribute("flag");
    const region = this.getAttribute("region");
    const time = this.localTime();
    const photo = img ? `, url("${encodeURI(img)}") center / cover no-repeat` : `, linear-gradient(180deg, #8fc7dd 0%, #cfe6ee 45%, #3d6f86 80%, #2b5770 100%)`;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .hero { position: relative; min-height: 280px; display: grid; align-content: end; gap: 10px; padding: 28px 24px; color: #fff; border-radius: 12px; overflow: hidden;
              background: linear-gradient(180deg, rgba(19,41,61,0) 30%, rgba(19,41,61,.8) 100%)${photo}; }
      h1 { margin: 0; font: 800 clamp(44px, 9vw, 72px)/0.95 var(--display); letter-spacing: -0.03em; overflow-wrap: anywhere; }
      .row { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; font-size: 15px; }
      .chip { background: rgba(255,255,255,.18); padding: 3px 11px; border-radius: 999px; backdrop-filter: blur(2px); }
    </style>
    <div class="hero" role="img" aria-label="${esc(this.getAttribute("place"))}">
      <h1>${esc(this.getAttribute("place"))}</h1>
      <div class="row">${country ? `<span>${esc(flag ? `${flag} ` : "")}${esc(country)}</span>` : ""}${time ? `<span class="chip num clock">${esc(time)} local</span>` : ""}${region ? `<span class="chip">${esc(region)}</span>` : ""}</div>
    </div>`;
  }
}
customElements.define("g-destination-hero", GDestinationHero);
