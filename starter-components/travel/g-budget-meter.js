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

const COLORS = { food: "#f0643f", sight: "#0d6f78", activity: "#58a9b3", transport: "#13293d", stay: "#f2b53a", note: "#9fb3c1" };

class GBudgetMeter extends HTMLElement {
  static get observedAttributes() { return ["budget"]; }
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
    const b = json(this.getAttribute("budget"), {}) || {};
    const cur = b.currency || "EUR";
    const total = Number(b.total) || 0;
    const limit = typeof b.budget === "number" ? b.budget : null;
    const scale = Math.max(limit || 0, total) || 1;
    const kinds = Object.entries(b.byKind || {}).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
    const over = limit !== null && total > limit;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 10px; padding: 16px; }
      .big { display: flex; gap: 10px; align-items: baseline; flex-wrap: wrap; }
      .big b { font: 500 30px var(--mono); }
      .over { color: #b33d1f; font-weight: 700; }
      .bar { display: flex; height: 12px; border-radius: 999px; overflow: hidden; background: var(--sky); }
      .bar i { display: block; height: 100%; }
      ul { list-style: none; display: flex; flex-wrap: wrap; gap: 12px; margin: 0; padding: 0; font-size: 12px; }
      li { display: inline-flex; align-items: center; gap: 6px; text-transform: capitalize; }
      li i { width: 10px; height: 10px; border-radius: 2px; }
    </style>
    <div class="wrap"><div class="big"><b>${esc(money(total, cur))}</b>
        <span>${limit !== null ? `of ${esc(money(limit, cur))} budget · <span class="${over ? "over" : ""}">${over ? `${esc(money(total - limit, cur))} over` : `${esc(money(limit - total, cur))} left`}</span>` : "spent so far"}</span></div>
      <div class="bar" role="img" aria-label="${esc(kinds.map(([k, v]) => `${k} ${money(v, cur)}`).join(", ") || "Nothing spent yet")}">${kinds.map(([k, v]) => `<i style="width:${(v / scale) * 100}%;background:${COLORS[k] || "#9fb3c1"}"></i>`).join("")}</div>
      <ul>${kinds.map(([k, v]) => `<li><i style="background:${COLORS[k] || "#9fb3c1"}"></i>${esc(k)} <span class="num">${esc(money(v, cur))}</span></li>`).join("")}</ul></div>`;
  }
}
customElements.define("g-budget-meter", GBudgetMeter);
