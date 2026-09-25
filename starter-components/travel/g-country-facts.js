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
const COUNTRY_FORMAT = { name: "string", capital: ["string"], currencies: [{ code: "string", symbol: "string" }], languages: ["string"], callingCodes: ["string"], areaKm2: "number", borders: [{ name: "string" }], region: "string" };

class GCountryFacts extends HTMLElement {
  static get observedAttributes() { return ["country"]; }
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
    const country = this.getAttribute("country");
    if (!country) return;
    this._state = { status: "loading" }; this.render();
    try {
      const res = await readAction(`/country/${encodeURIComponent(country)}`, { intent: "get country facts", country, outputFormat: COUNTRY_FORMAT });
      const c = res && typeof res === "object" ? (res.name ? res : res.data || {}) : {};
      this._state = { status: "ready", c };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  render() {
    const { status, c = {}, message } = this._state;
    const list = (v) => (Array.isArray(v) ? v : v ? [v] : []);
    const facts = [
      ["Capital", list(c.capital).join(", ")],
      ["Currency", list(c.currencies).map((x) => `${x.code}${x.symbol ? ` ${x.symbol}` : ""}`).join(", "), true],
      ["Language", list(c.languages).join(", ")],
      ["Calling code", list(c.callingCodes).slice(0, 2).join(", "), true],
      ["Area", typeof c.areaKm2 === "number" ? `${c.areaKm2.toLocaleString()} km²` : "", true],
      ["Borders", list(c.borders).map((b) => b.name || b).slice(0, 4).join(", ") || (status === "ready" && c.region ? `None (${c.region})` : "")]
    ].filter(([, v]) => v);
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; padding: 16px; }
      .fact { display: grid; gap: 2px; padding: 10px 12px; border-left: 3px solid var(--sun); background: #fffaf0; min-height: 56px; }
      small { font-size: 11px; font-weight: 700; letter-spacing: .08em; text-transform: uppercase; color: var(--soft); }
      span { font-size: 16px; font-weight: 500; }
      p { margin: 0; padding: 16px; color: var(--soft); }
    </style>
    ${status === "error" ? `<p>${esc(message)}</p>` : `<div class="grid" aria-busy="${status === "loading"}" aria-label="${esc(c.name || this.getAttribute("country"))} facts">${status === "loading"
      ? Array.from({ length: 6 }, () => `<div class="fact"></div>`).join("")
      : facts.map(([k, v, isNum]) => `<div class="fact"><small>${k}</small><span class="${isNum ? "num" : ""}">${esc(v)}</span></div>`).join("")}</div>`}`;
  }
}
customElements.define("g-country-facts", GCountryFacts);
