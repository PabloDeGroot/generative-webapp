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
const PREFERRED = ["Understand", "Get in", "Get around", "See", "Do", "Eat", "Drink", "Sleep", "Stay safe"];
const GUIDE_FORMAT = { title: "string", section: "string", text: "string", availableSections: ["string"], url: "string" };

class GGuideExcerpt extends HTMLElement {
  static get observedAttributes() { return ["place", "section"]; }
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
    const section = this.getAttribute("section");
    if (!place || !section) return;
    this._state = { status: "loading" }; this.render();
    try {
      const slug = section.toLowerCase().replace(/\s+/g, "-");
      const res = await readAction(`/guide/${encodeURIComponent(place)}/${encodeURIComponent(slug)}`, { intent: "get a travel guide section", place, section, outputFormat: GUIDE_FORMAT });
      this._state = { status: "ready", text: field(res, "text") || "", sections: field(res, "availableSections") || [], url: field(res, "url") || "" };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  render() {
    const place = this.getAttribute("place") || "";
    const section = this.getAttribute("section") || "";
    const { status, text = "", sections = [], url, message } = this._state;
    const tabs = (sections.length ? PREFERRED.filter((s) => sections.includes(s)) : PREFERRED).slice(0, 8);
    const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const slug = (s) => encodeURIComponent(s.toLowerCase().replace(/\s+/g, "-"));
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 14px; padding: 16px; }
      nav { display: flex; gap: 6px; flex-wrap: wrap; }
      nav a { text-decoration: none; font-size: 13px; font-weight: 500; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); }
      nav a:hover { border-color: var(--sea); }
      nav a.on { background: var(--sea); border-color: var(--sea); color: #fff; }
      .text { display: grid; gap: 10px; }
      p { margin: 0; font-size: 15px; line-height: 1.65; max-width: 64ch; }
      .note { color: var(--soft); }
      .src { color: var(--sea); font-weight: 700; font-size: 13px; text-decoration: none; }
    </style>
    <div class="wrap" aria-busy="${status === "loading"}"><nav aria-label="Guide sections">${tabs.map((s) => `<a href="/guide/${encodeURIComponent(place.toLowerCase())}/${slug(s)}" class="${s.toLowerCase() === section.toLowerCase() ? "on" : ""}">${esc(s)}</a>`).join("")}</nav>
      <div class="text">${status === "loading" ? `<p class="note">Opening the guide…</p>` : status === "error" ? `<p class="note">${esc(message)}</p>`
        : paragraphs.map((p) => `<p>${esc(p)}</p>`).join("") || `<p class="note">This guide has no ${esc(section)} section yet.</p>`}</div>
      ${url ? `<a class="src" href="${esc(url)}" target="_blank" rel="noopener">Read the full guide on Wikivoyage →</a>` : ""}</div>`;
  }
}
customElements.define("g-guide-excerpt", GGuideExcerpt);
