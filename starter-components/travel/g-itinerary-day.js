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
const KINDS = ["activity", "sight", "food", "transport", "stay", "note"];

class GItineraryDay extends HTMLElement {
  static get observedAttributes() { return ["trip-id", "date"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
    this._busy = false;
    this._error = "";
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
      this._state = { status: "ready", days: field(res, "days") || [], currency: field(res, "trip")?.destination?.currency || field(res, "trip")?.homeCurrency || "EUR" };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  async send(body) {
    const tripId = this.getAttribute("trip-id");
    this._busy = true; this._error = ""; this.render();
    try {
      await postJson(`/trips/${encodeURIComponent(tripId)}`, { tripId, ...body });
      location.reload();
    } catch (err) {
      this._busy = false; this._error = err.message; this.render();
    }
  }
  dayHtml(d, currency) {
    const w = d.weather;
    const items = Array.isArray(d.items) ? d.items : [];
    const temp = (t) => (typeof t === "number" ? `${Math.round(t)}°` : "–");
    const rows = items.map((it) => `<li class="${esc(it.kind)}"><span class="time num">${esc(it.time || "")}</span>
        <span>${esc(it.title)}${it.location ? `<small>${esc(it.location)}</small>` : ""}</span>
        <span class="cost num">${typeof it.cost === "number" ? esc(money(it.cost, it.currency || currency)) : ""}</span>
        <button type="button" class="rm" data-id="${esc(it.id)}" aria-label="Remove ${esc(it.title)}" ${this._busy ? "disabled" : ""}>×</button></li>`).join("");
    return `<section data-date="${esc(d.date)}"><header><b>${esc(day(d.date, { weekday: "short", day: "numeric", month: "short" }))}</b>
        ${w ? `<span class="chip">${esc(w.summary)} · <span class="num">${temp(w.tempMaxC)} / ${temp(w.tempMinC)}</span></span>` : ""}
        ${(d.holidays || []).map((h) => `<span class="chip holiday">${esc(h)} · some places closed</span>`).join("")}</header>
      ${rows ? `<ol>${rows}</ol>` : `<p class="empty">Nothing planned yet.</p>`}
      <details><summary>+ Add a plan</summary>
        <form data-date="${esc(d.date)}"><input class="wide" name="title" required maxlength="200" placeholder="What? e.g. Livraria Lello" aria-label="Plan">
          <input name="time" type="time" aria-label="Time">
          <select name="kind" aria-label="Kind">${KINDS.map((k) => `<option value="${k}">${k}</option>`).join("")}</select>
          <input name="cost" type="number" min="0" step="0.01" placeholder="Cost" aria-label="Cost">
          <input name="location" placeholder="Where (optional)" aria-label="Location">
          <button class="add" type="submit" ${this._busy ? "disabled" : ""}>${this._busy ? "Saving…" : "Add plan"}</button></form></details></section>`;
  }
  render() {
    const { status, days = [], currency = "EUR", message } = this._state;
    const only = this.getAttribute("date");
    const shown = only ? days.filter((d) => d.date === only) : days;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 6px; }
      section { display: grid; gap: 12px; padding: 16px; }
      section + section { border-top: 1px solid var(--line); }
      header { display: flex; flex-wrap: wrap; gap: 8px 10px; align-items: baseline; }
      header b { font: 700 19px var(--display); }
      .chip { font-size: 12px; padding: 2px 9px; border-radius: 999px; background: var(--sky); color: var(--sea); font-weight: 500; }
      .holiday { background: #fde6df; color: #b33d1f; }
      ol { list-style: none; margin: 0 0 0 6px; padding: 0; border-left: 2px solid var(--line); }
      li { position: relative; display: grid; grid-template-columns: 52px 1fr auto 24px; gap: 10px; align-items: baseline; padding: 8px 0 8px 14px; font-size: 14px; }
      li::before { content: ""; position: absolute; left: -6px; top: 13px; width: 10px; height: 10px; border-radius: 50%; background: var(--sea); }
      li.food::before { background: var(--coral); }
      li.transport::before { background: var(--harbour); }
      li.stay::before { background: var(--sun); }
      .time { font-size: 13px; color: var(--soft); }
      small { display: block; color: var(--soft); font-size: 12px; }
      .cost { font-size: 13px; }
      .rm { border: 0; background: none; color: var(--soft); font-size: 18px; line-height: 1; cursor: pointer; padding: 0; }
      .rm:hover { color: var(--coral); }
      .empty, .note { color: var(--soft); font-size: 14px; margin: 0; padding: 8px 0 8px 14px; }
      details summary { cursor: pointer; color: var(--sea); font-weight: 700; font-size: 14px; }
      form { display: grid; grid-template-columns: repeat(auto-fill, minmax(120px, 1fr)); gap: 8px; margin-top: 10px; }
      form .wide { grid-column: 1 / -1; }
      input, select { font: 14px var(--sans); color: var(--harbour); border: 1px solid var(--line); border-radius: 8px; padding: 8px 10px; background: #fff; min-width: 0; }
      button.add { font: 700 14px var(--sans); color: #fff; background: var(--coral); border: 0; border-radius: 8px; padding: 9px 14px; cursor: pointer; }
      .error { color: #b33d1f; font-size: 13px; margin: 0 16px 12px; }
    </style>
    <div class="wrap" aria-busy="${status === "loading"}">${status === "loading" ? `<p class="note">Loading the plan…</p>` : status === "error" ? `<p class="note">${esc(message)}</p>`
      : shown.map((d) => this.dayHtml(d, currency)).join("") || `<p class="note">No days to show.</p>`}
      ${this._error ? `<p class="error" role="alert">${esc(this._error)}</p>` : ""}</div>`;
    this.shadowRoot.querySelectorAll(".rm").forEach((b) => b.addEventListener("click", () =>
      this.send({ intent: "remove an itinerary item", itemId: b.dataset.id, outputFormat: { ok: "boolean" } })));
    this.shadowRoot.querySelectorAll("form").forEach((form) => form.addEventListener("submit", (e) => {
      e.preventDefault();
      const f = new FormData(form);
      const cost = f.get("cost");
      this.send({
        intent: "add an itinerary item", date: form.dataset.date, title: f.get("title"), kind: f.get("kind"),
        time: f.get("time") || undefined, location: f.get("location") || undefined,
        cost: cost ? Number(cost) : undefined, currency: cost ? currency : undefined,
        outputFormat: { ok: "boolean", id: "string" }
      });
    }));
  }
}
customElements.define("g-itinerary-day", GItineraryDay);
