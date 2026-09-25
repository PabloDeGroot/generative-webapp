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

const PREFERRED = ["Understand", "Get in", "Get around", "See", "Do", "Eat", "Drink", "Sleep", "Stay safe"];

class GGuideExcerpt extends HTMLElement {
  static get observedAttributes() { return ["place", "section", "text", "sections", "source-url"]; }
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
    const place = this.getAttribute("place") || "";
    const section = this.getAttribute("section") || "";
    const available = json(this.getAttribute("sections"), []);
    const tabs = (available.length ? PREFERRED.filter((s) => available.includes(s)) : PREFERRED).slice(0, 8);
    const paragraphs = (this.getAttribute("text") || "").split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
    const source = this.getAttribute("source-url");
    const slug = (s) => encodeURIComponent(s.toLowerCase().replace(/\s+/g, "-"));
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 14px; padding: 16px; }
      nav { display: flex; gap: 6px; flex-wrap: wrap; }
      nav a { text-decoration: none; font-size: 13px; font-weight: 500; padding: 5px 12px; border-radius: 999px; border: 1px solid var(--line); }
      nav a:hover { border-color: var(--sea); }
      nav a.on { background: var(--sea); border-color: var(--sea); color: #fff; }
      .text { display: grid; gap: 10px; }
      p { margin: 0; font-size: 15px; line-height: 1.65; max-width: 64ch; }
      .src { color: var(--sea); font-weight: 700; font-size: 13px; text-decoration: none; }
    </style>
    <div class="wrap"><nav aria-label="Guide sections">${tabs.map((s) => `<a href="/guide/${encodeURIComponent(place.toLowerCase())}/${slug(s)}" class="${s.toLowerCase() === section.toLowerCase() ? "on" : ""}">${esc(s)}</a>`).join("")}</nav>
      <div class="text">${paragraphs.map((p) => `<p>${esc(p)}</p>`).join("") || "<p>No guide text for this section.</p>"}</div>
      ${source ? `<a class="src" href="${esc(source)}" target="_blank" rel="noopener">Read the full guide on Wikivoyage →</a>` : ""}</div>`;
  }
}
customElements.define("g-guide-excerpt", GGuideExcerpt);
