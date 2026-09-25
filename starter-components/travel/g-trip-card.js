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

const BANDS = ["linear-gradient(135deg, #0d6f78, #58a9b3)", "linear-gradient(135deg, #f0643f, #f2b53a)", "linear-gradient(135deg, #13293d, #0d6f78)"];

class GTripCard extends HTMLElement {
  static get observedAttributes() { return ["trip-id", "title", "destination", "start-date", "end-date", "item-count", "spent", "budget", "currency"]; }
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
    const id = this.getAttribute("trip-id") || "";
    const start = this.getAttribute("start-date");
    const end = this.getAttribute("end-date");
    const nights = start && end ? Math.round((Date.parse(end) - Date.parse(start)) / 86400000) : null;
    const count = this.getAttribute("item-count");
    const currency = this.getAttribute("currency") || "EUR";
    const spent = this.getAttribute("spent");
    const budget = this.getAttribute("budget");
    const band = BANDS[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % BANDS.length];
    const destination = this.getAttribute("destination");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      :host { height: 100%; }
      a { display: grid; grid-template-rows: auto 1fr; height: 100%; text-decoration: none; border: 1px solid var(--line); border-radius: 12px; overflow: hidden; background: var(--page); }
      a:hover { border-color: var(--sea); }
      .band { height: 64px; background: ${band}; }
      .body { display: grid; gap: 4px; align-content: start; padding: 10px 12px 12px; }
      b { font: 700 17px/1.25 var(--display); }
      small { color: var(--soft); font-size: 13px; }
      .foot { display: flex; justify-content: space-between; gap: 8px; font-size: 12px; margin-top: 6px; }
    </style>
    <a href="/trips/${encodeURIComponent(id)}"><div class="band"></div><div class="body">
      <b>${esc(this.getAttribute("title"))}</b>
      <small>${destination ? `${esc(destination)} · ` : ""}${esc(day(start, { day: "numeric", month: "short" }))} – ${esc(day(end, { day: "numeric", month: "short" }))}${nights !== null ? ` · ${nights} night${nights === 1 ? "" : "s"}` : ""}</small>
      <div class="foot"><span>${count !== null ? `${esc(count)} plan${count === "1" ? "" : "s"}` : ""}</span><span class="num">${spent !== null ? esc(money(Number(spent), currency)) : ""}${budget !== null ? ` / ${esc(money(Number(budget), currency))}` : ""}</span></div>
    </div></a>`;
  }
}
customElements.define("g-trip-card", GTripCard);
