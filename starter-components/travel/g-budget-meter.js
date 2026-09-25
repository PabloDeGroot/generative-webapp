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

// Data too large or structured for attributes is fetched by the component itself through the site's
// action runner (POST with an intent). Identical reads on one page share a single request, and the
// server caches read results, so repeat visits don't run the LLM again.
const componentReads = (window.__gComponentReads ??= new Map());
async function postJson(route, body) {
  const res = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error(res.status === 401 ? "Sign in to see this." : (data && (data.message || data.error)) || "Couldn\x27t load this.");
  }
  return data;
}
function readAction(route, body) {
  const key = `${route} ${JSON.stringify(body)}`;
  if (!componentReads.has(key)) componentReads.set(key, postJson(route, body).catch((err) => { componentReads.delete(key); throw err; }));
  return componentReads.get(key);
}
// Responses follow the requested outputFormat; when the runner couldn't shape them, the raw tool
// result arrives under data.
const field = (res, key) => (res && typeof res === "object" ? (res[key] ?? res.data?.[key]) : undefined);
const TRIP_FORMAT = { trip: { id: "string", title: "string", startDate: "string", endDate: "string", homeCurrency: "string", budget: "number", destination: { name: "string", currency: "string" } }, days: [{ date: "string", weather: { summary: "string", tempMaxC: "number", tempMinC: "number" }, holidays: ["string"], items: [{ id: "string", time: "string", title: "string", kind: "string", location: "string", cost: "number", currency: "string" }] }], budget: { currency: "string", total: "number", byKind: { kindName: "number" }, budget: "number", remaining: "number" }, packingList: { items: [{ item: "string", quantity: "number", reason: "string", category: "string" }] } };
const tripRequest = (tripId) => readAction(`/trips/${encodeURIComponent(tripId)}`, { intent: "get the trip overview", tripId, outputFormat: TRIP_FORMAT });
const COLORS = { food: "#f0643f", sight: "#0d6f78", activity: "#58a9b3", transport: "#13293d", stay: "#f2b53a", note: "#9fb3c1" };

class GBudgetMeter extends HTMLElement {
  static get observedAttributes() { return ["trip-id"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
  }
  connectedCallback() {
    loadFonts();
    this.load();
  }
  attributeChangedCallback() { if (this.isConnected) this.load(); }
  async load() {
    const tripId = this.getAttribute("trip-id");
    if (!tripId) return;
    this._state = { status: "loading" }; this.render();
    try {
      const res = await tripRequest(tripId);
      this._state = { status: "ready", b: field(res, "budget") || {} };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  render() {
    const { status, b = {}, message } = this._state;
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
      .note { margin: 0; color: var(--soft); font-size: 14px; }
    </style>
    <div class="wrap" aria-busy="${status === "loading"}">${status === "loading" ? `<p class="note">Adding up the budget…</p><div class="bar"></div>` : status === "error" ? `<p class="note">${esc(message)}</p>` : `
      <div class="big"><b>${esc(money(total, cur))}</b>
        <span>${limit !== null ? `of ${esc(money(limit, cur))} budget · <span class="${over ? "over" : ""}">${over ? `${esc(money(total - limit, cur))} over` : `${esc(money(limit - total, cur))} left`}</span>` : "spent so far"}</span></div>
      <div class="bar" role="img" aria-label="${esc(kinds.map(([k, v]) => `${k} ${money(v, cur)}`).join(", ") || "Nothing spent yet")}">${kinds.map(([k, v]) => `<i style="width:${(v / scale) * 100}%;background:${COLORS[k] || "#9fb3c1"}"></i>`).join("")}</div>
      <ul>${kinds.map(([k, v]) => `<li><i style="background:${COLORS[k] || "#9fb3c1"}"></i>${esc(k)} <span class="num">${esc(money(v, cur))}</span></li>`).join("")}</ul>`}</div>`;
  }
}
customElements.define("g-budget-meter", GBudgetMeter);
