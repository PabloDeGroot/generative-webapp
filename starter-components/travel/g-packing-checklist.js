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

class GPackingChecklist extends HTMLElement {
  static get observedAttributes() { return ["items", "trip-id"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  storeKey() { return `wayfarer-packing:${this.getAttribute("trip-id") || location.pathname}`; }
  loadTicks() { try { return new Set(JSON.parse(localStorage.getItem(this.storeKey()) || "[]")); } catch { return new Set(); } }
  saveTicks(ticks) { try { localStorage.setItem(this.storeKey(), JSON.stringify([...ticks])); } catch { /* storage unavailable */ } }
  render() {
    const raw = json(this.getAttribute("items"), []);
    const items = Array.isArray(raw) ? raw : Array.isArray(raw.items) ? raw.items : [];
    const groups = new Map();
    items.forEach((it) => { const c = it.category || "Other"; if (!groups.has(c)) groups.set(c, []); groups.get(c).push(it); });
    const ticks = this.loadTicks();
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(210px, 1fr)); gap: 16px; padding: 16px; }
      h3 { margin: 0 0 6px; font: 700 13px var(--sans); letter-spacing: .06em; text-transform: uppercase; color: var(--sea); }
      label { display: grid; grid-template-columns: 18px 1fr; gap: 8px; font-size: 14px; padding: 4px 0; cursor: pointer; }
      input { accent-color: var(--sea); margin: 3px 0 0; }
      small { grid-column: 2; color: var(--soft); font-size: 12px; margin-top: -2px; }
      input:checked + span { color: var(--soft); text-decoration: line-through; }
    </style>
    <div class="grid">${[...groups].map(([cat, list]) => `<section><h3>${esc(cat)}</h3>${list.map((it) => {
      const key = it.item;
      return `<label><input type="checkbox" data-key="${esc(key)}" ${ticks.has(key) ? "checked" : ""}><span>${esc(it.item)}${it.quantity ? ` × ${esc(it.quantity)}` : ""}</span>${it.reason ? `<small>${esc(it.reason)}</small>` : ""}</label>`;
    }).join("")}</section>`).join("") || "<p>No packing list yet.</p>"}</div>`;
    this.shadowRoot.querySelectorAll("input[type=checkbox]").forEach((box) => box.addEventListener("change", () => {
      const current = this.loadTicks();
      if (box.checked) current.add(box.dataset.key); else current.delete(box.dataset.key);
      this.saveTicks(current);
    }));
  }
}
customElements.define("g-packing-checklist", GPackingChecklist);
