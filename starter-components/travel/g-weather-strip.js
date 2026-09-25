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
const ICONS = [[0, "☀️"], [2, "🌤️"], [3, "☁️"], [48, "🌫️"], [57, "🌦️"], [67, "🌧️"], [77, "🌨️"], [82, "🌧️"], [86, "🌨️"], [99, "⛈️"]];
const icon = (code) => (code === null || code === undefined ? "·" : (ICONS.find(([max]) => code <= max) || ICONS[ICONS.length - 1])[1]);
const WEATHER_FORMAT = { note: "string", days: [{ date: "string", summary: "string", weatherCode: "number", tempMaxC: "number", tempMinC: "number", precipitationChance: "number" }] };

class GWeatherStrip extends HTMLElement {
  static get observedAttributes() { return ["place", "start-date", "end-date"]; }
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
    const place = this.getAttribute("place");
    if (!place) return;
    this._state = { status: "loading" }; this.render();
    const startDate = this.getAttribute("start-date") || undefined;
    const endDate = this.getAttribute("end-date") || undefined;
    try {
      const res = await readAction(`/weather/${encodeURIComponent(place)}`, { intent: "get the daily weather", place, startDate, endDate, outputFormat: WEATHER_FORMAT });
      this._state = { status: "ready", days: field(res, "days") || [], note: field(res, "note") || "" };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  render() {
    const { status, days = [], note, message } = this._state;
    const today = new Date().toISOString().slice(0, 10);
    const round = (t) => (typeof t === "number" ? `${Math.round(t)}°` : "–");
    const tiles = status === "loading" ? Array.from({ length: 7 }, () => `<div class="day ghost"></div>`).join("")
      : days.map((d) => {
        const isToday = d.date === today;
        return `<div class="day ${isToday ? "today" : ""}" title="${esc(d.summary)}">
          <b>${isToday ? "Today" : esc(day(d.date, { weekday: "short", day: "numeric" }))}</b>
          <span class="ic" role="img" aria-label="${esc(d.summary)}">${icon(d.weatherCode)}</span>
          <span class="t num">${round(d.tempMaxC)} <span>${round(d.tempMinC)}</span></span>
          <span class="rain num">${typeof d.precipitationChance === "number" ? `${d.precipitationChance}%` : ""}</span></div>`;
      }).join("");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 8px; padding: 16px; }
      .strip { display: grid; grid-auto-flow: column; grid-auto-columns: minmax(76px, 1fr); gap: 8px; overflow-x: auto; padding-bottom: 2px; }
      .day { background: var(--sky); border-radius: 10px; padding: 10px 8px; display: grid; gap: 4px; justify-items: center; text-align: center; font-size: 12px; min-height: 104px; }
      .ghost { opacity: .5; }
      .day b { font-size: 13px; white-space: nowrap; }
      .ic { font-size: 24px; line-height: 1; }
      .t { font-size: 15px; font-weight: 500; }
      .t span { color: var(--soft); }
      .rain { color: var(--sea); font-size: 11px; min-height: 1em; }
      .today { background: var(--harbour); color: #fff; }
      .today .t span, .today .rain { color: #b9d6e2; }
      p { margin: 0; font-size: 12px; color: var(--soft); }
    </style>
    <div class="wrap" aria-busy="${status === "loading"}">${status === "error" ? `<p>${esc(message)}</p>` : `<div class="strip">${tiles || `<p>No weather for these dates.</p>`}</div>`}${note ? `<p>${esc(note)}</p>` : ""}</div>`;
  }
}
customElements.define("g-weather-strip", GWeatherStrip);
