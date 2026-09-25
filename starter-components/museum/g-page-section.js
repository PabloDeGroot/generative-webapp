const FONT_HREF = "https://fonts.googleapis.com/css2?family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=Instrument+Sans:wght@400;500;600&display=swap";
function loadFonts() {
  if (document.querySelector("link[data-kit-fonts=\"vitrine\"]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = FONT_HREF; link.dataset.kitFonts = "vitrine";
  document.head.appendChild(link);
}
// Exhibition text is stored HTML-escaped and may arrive decoded or not: decode once, then always escape.
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "\x27" };
const esc = (v) => String(v ?? "").replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]).replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));
// Real images only: an <img> src must be a same-origin /__art/ URL from the museum tools. Anything else
// (generated /images/*.png, external hosts, made-up paths) is dropped and the typographic placeholder shows.
const artSrc = (u) => (typeof u === "string" && u.startsWith("/__art/") && !u.includes("..") ? u : "");
const isArtworkId = (id) => /^(aic|met)-\d+$/.test(String(id || ""));
// Canonical site routes (singular /collection/ and /exhibition/ are aliases served by the same pages).
const artworkHref = (id) => `/artwork/${encodeURIComponent(id)}`;
const artistHref = (name) => (!name || /^unknown artist$/i.test(name) ? "" : `/artist/${encodeURIComponent(name)}`);
const collectionHref = (id) => `/collections/${encodeURIComponent(id)}`;
const exhibitionHref = (id) => `/exhibitions/${encodeURIComponent(id)}`;
const paras = (text) => String(text ?? "").split(/\n\s*\n|\r?\n/).map((p) => p.trim()).filter(Boolean);
const years = (born, died) => (born && died ? `${born}–${died}` : born ? `born ${born}` : died ? `died ${died}` : "");
function ago(iso) {
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days < 1) return "today";
  if (days < 2) return "yesterday";
  if (days < 30) return `${days} days ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
const placeholder = (title) => `<div class="ph" role="img" aria-label="${esc(title ? `${title} (image unavailable)` : "Image unavailable")}"><i>${esc(title)}</i><span>Image unavailable</span></div>`;
// An artwork <img> for inside a .mat frame. opts: { large (843px URL for srcset), sizes, eager }.
function artImg(src, alt, title, opts = {}) {
  const url = artSrc(src);
  if (!url) return placeholder(title);
  const large = artSrc(opts.large);
  const srcset = large && large !== url ? ` srcset="${esc(url)} 400w, ${esc(large)} 843w" sizes="${esc(opts.sizes || "(min-width: 900px) 25vw, 50vw")}"` : "";
  const loading = opts.eager ? `loading="eager" fetchpriority="high"` : `loading="lazy"`;
  return `<img src="${esc(url)}"${srcset} alt="${esc(alt || title || "")}" data-title="${esc(title)}" ${loading} decoding="async">`;
}
// Call after every render: fades images in on load and swaps failed ones for the placeholder.
function wireImages(root) {
  root.querySelectorAll("img[data-title]").forEach((img) => {
    const show = () => img.classList.add("in");
    const fail = () => { const box = document.createElement("div"); box.innerHTML = placeholder(img.dataset.title); img.replaceWith(box.firstElementChild); };
    if (img.complete) { if (img.naturalWidth) show(); else fail(); return; }
    img.addEventListener("load", show, { once: true });
    img.addEventListener("error", fail, { once: true });
  });
}
const TOKENS = `:host { display: block; --wall: #f6f3ee; --paper: #fffdf9; --mat: #ebe6dc; --rule: #e0d9cd; --ink: #1d1b18; --soft: #6b645a;
  --oxblood: #7d2a26; --oxblood-deep: #5f1f1c; --oxblood-tint: #f3e4e1; --gilt: #a8844a; --gilt-ink: #7a5c2a; --night: #15130f; --night-ink: #efe9df; --error: #a3321f; --ok: #2f6b45;
  --serif: "Newsreader", Georgia, serif; --sans: "Instrument Sans", system-ui, sans-serif;
  color: var(--ink); font-family: var(--sans); font-size: 15px; line-height: 1.55; }
:host([hidden]) { display: none; }
* { box-sizing: border-box; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--oxblood); outline-offset: 2px; }
.t { font-family: var(--serif); font-style: italic; font-weight: 500; }
.kicker { font: 600 11px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--oxblood); }
.label { font: 600 11px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--soft); }
.num { font-variant-numeric: tabular-nums; }
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
.mat { position: relative; display: grid; grid-template: 100% / 100%; place-items: center; background: var(--mat); overflow: hidden; box-shadow: inset 0 0 0 1px rgba(29,27,24,.06); }
.mat img { display: block; width: 100%; height: 100%; object-fit: contain; padding: 7%; filter: drop-shadow(0 6px 12px rgba(29,27,24,.16)); opacity: 0; transition: opacity .25s ease; }
.mat img.in { opacity: 1; }
.ph { position: absolute; inset: 0; display: grid; place-content: center; gap: 6px; padding: 12%; text-align: center; background: var(--mat); color: var(--soft); }
.ph i { font: italic 500 17px/1.25 var(--serif); color: var(--ink); overflow-wrap: anywhere; }
.ph span { font: 600 10px/1 var(--sans); letter-spacing: .12em; text-transform: uppercase; }
.sk { background: var(--mat); border-radius: 2px; animation: sk 1.6s ease-in-out infinite; }
@keyframes sk { 50% { opacity: .5; } }
.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 18px; border: 1px solid var(--oxblood); border-radius: 2px; background: var(--oxblood); color: #fff; font: 600 14px/1 var(--sans); text-decoration: none; cursor: pointer; }
.btn:hover { background: var(--oxblood-deep); border-color: var(--oxblood-deep); }
.btn.ghost { background: transparent; color: var(--oxblood); }
.btn.ghost:hover { background: var(--oxblood-tint); }
.btn[disabled] { opacity: .55; cursor: default; }
.link { color: var(--oxblood); font-weight: 600; text-decoration: none; }
.link:hover { text-decoration: underline; text-underline-offset: 3px; }
.error { color: var(--error); font-size: 14px; margin: 0; }
@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation: none !important; transition: none !important; scroll-behavior: auto !important; } .mat img { opacity: 1; } }`;
// Twind adopts a stylesheet (Tailwind preflight + utilities) into every shadow root, and adopted sheets
// cascade after <style> elements, so preflight's bare-element resets (h1 { font-size: inherit },
// p { margin: 0 }, button { background: transparent }…) would beat this kit's rules of equal specificity.
// Every render that writes a <style> calls adoptKitStyle(root) right after: the <style> text moves into one
// constructed sheet per shadow root, kept LAST in adoptedStyleSheets, also when Twind adopts its sheet
// again later (it reassigns the array on every connect). Without constructable sheets the <style> stays.
const ADOPTED = (() => {
  for (let p = typeof ShadowRoot === "function" ? ShadowRoot.prototype : null; p; p = Object.getPrototypeOf(p)) {
    const d = Object.getOwnPropertyDescriptor(p, "adoptedStyleSheets");
    if (d) return d.get && d.set && typeof CSSStyleSheet === "function" && "replaceSync" in CSSStyleSheet.prototype ? d : null;
  }
  return null;
})();
const kitSheets = new WeakMap();
function adoptKitStyle(root) {
  const styles = Array.from(root.children).filter((el) => el.localName === "style");
  if (!styles.length || !ADOPTED) return;
  try {
    let kit = kitSheets.get(root);
    if (!kit) {
      const sheet = new CSSStyleSheet();
      kit = { sheet, css: null };
      const last = (list) => Array.from(list).filter((s) => s !== sheet).concat(sheet);
      Object.defineProperty(root, "adoptedStyleSheets", { configurable: true,
        get: () => ADOPTED.get.call(root), set: (list) => ADOPTED.set.call(root, last(list)) });
      kitSheets.set(root, kit);
    }
    const css = styles.map((el) => el.textContent).join("\n");
    if (kit.css !== css) { kit.sheet.replaceSync(css); kit.css = css; }
    root.adoptedStyleSheets = root.adoptedStyleSheets;
    styles.forEach((el) => el.remove());
  } catch { /* keep the <style> elements */ }
}


// Links written by the page designer: site paths, in-page anchors and http(s) only (never javascript: etc.).
const safeHref = (href) => {
  const h = String(href ?? "").trim();
  return /^(\/(?!\/)|#|https?:\/\/)/i.test(h) ? h : "";
};
const attr = (el, name) => (el.getAttribute(name) ?? "").trim();
let sectionSeq = 0;

class GPageSection extends HTMLElement {
  static get observedAttributes() { return ["kicker", "heading", "intro", "link-href", "link-text", "button-href", "button-text", "level", "tone"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._uid = `gps-${++sectionSeq}`;
    this._onSlot = () => this.syncBody();
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.shadowRoot.firstChild) return;
    // tone only changes the band colour, which :host([tone]) handles in CSS.
    if (name === "tone") return;
    this.render();
  }
  syncBody() {
    const slot = this.shadowRoot.querySelector("slot");
    const body = this.shadowRoot.querySelector(".body");
    if (!slot || !body) return;
    const has = slot.assignedNodes({ flatten: true }).some((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim()));
    body.classList.toggle("empty", !has);
  }
  render() {
    const kicker = attr(this, "kicker");
    const heading = attr(this, "heading");
    const intro = attr(this, "intro");
    const linkHref = safeHref(this.getAttribute("link-href"));
    const linkText = attr(this, "link-text") || "See all";
    const buttonHref = safeHref(this.getAttribute("button-href"));
    // No label, no button: a generic "Continue" would be a meaningless link name.
    const buttonText = attr(this, "button-text");
    const level = attr(this, "level");
    const tag = level === "1" ? "h1" : level === "3" ? "h3" : "h2";
    const headId = `${this._uid}-h`;
    const hasHead = Boolean(kicker || heading || intro);
    const showButton = Boolean(buttonHref && buttonText);
    const head = hasHead || linkHref || showButton ? `<header>
        ${kicker ? `<p class="kicker">${esc(kicker)}</p>` : ""}
        ${heading || linkHref ? `<div class="row">
          ${heading ? `<${tag} id="${headId}" class="${tag}">${esc(heading)}</${tag}>` : `<span></span>`}
          ${linkHref ? `<a class="more" href="${esc(linkHref)}"${heading ? ` aria-describedby="${headId}"` : ""}>${esc(linkText)}<span aria-hidden="true">→</span></a>` : ""}
        </div>` : ""}
        ${intro ? `<p class="intro">${esc(intro)}</p>` : ""}
        ${showButton ? `<p class="cta"><a class="btn" href="${esc(buttonHref)}">${esc(buttonText)}</a></p>` : ""}
      </header>` : "";
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      :host { background: var(--wall); }
      :host([tone="paper"]) { background: var(--paper); box-shadow: inset 0 1px 0 var(--rule), inset 0 -1px 0 var(--rule); }
      section { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; width: 100%; max-width: 1240px; margin: 0 auto; padding: 28px 16px; }
      header { display: grid; gap: 10px; min-width: 0; }
      header > p { margin: 0; }
      .row { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px 24px; }
      .row > :first-child { flex: 1 1 22ch; min-width: 0; }
      .h1, .h2, .h3 { margin: 0; font-family: var(--serif); font-weight: 500; color: var(--ink); text-wrap: balance; overflow-wrap: anywhere; font-optical-sizing: auto; }
      .h2 { font-size: 30px; line-height: 1.15; letter-spacing: -.005em; }
      .h1 { font-size: clamp(34px, 5vw, 44px); line-height: 1.08; letter-spacing: -.012em; }
      .h3 { font-size: 22px; line-height: 1.2; }
      .h1::after, .h2::after, .h3::after { content: ""; display: block; width: 40px; height: 1px; margin-top: 14px; background: var(--gilt); }
      .more { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; color: var(--oxblood); font: 600 14px/1.2 var(--sans); text-decoration: none; white-space: nowrap; border-radius: 2px; }
      .more span { transition: transform .2s ease; }
      .more:hover { color: var(--oxblood-deep); text-decoration: underline; text-underline-offset: 3px; }
      .more:hover span, .more:focus-visible span { transform: translateX(3px); }
      .intro { max-width: 62ch; color: var(--soft); font: 400 18px/1.55 var(--serif); text-wrap: pretty; }
      .cta { padding-top: 4px; }
      .body { display: grid; grid-template-columns: minmax(0, 1fr); gap: 20px; min-width: 0; }
      .body.empty { display: none; }
      ::slotted(p) { margin: 0; max-width: 65ch; font-family: var(--serif); font-size: 18px; line-height: 1.65; color: var(--ink); text-wrap: pretty; }
      /* Nested in another component's slot (e.g. g-split's aside): no band, the host already pads. */
      :host([slot]), :host([slot][tone="paper"]) { background: none; box-shadow: none; }
      :host([slot]) section { padding: 0; max-width: none; }
      @media (max-width: 559px) {
        .row { flex-direction: column; align-items: flex-start; gap: 2px; }
        .row > :first-child { flex: none; width: 100%; }
        .more { min-height: 40px; }
      }
      @media (min-width: 860px) {
        :host(:not([slot])) section { padding: 48px 32px; }
        header { gap: 12px; }
      }
    </style>
    <section${heading ? ` aria-labelledby="${headId}"` : ""}>${head}<div class="body"><slot></slot></div></section>`;
    adoptKitStyle(this.shadowRoot);
    this.shadowRoot.querySelector("slot").addEventListener("slotchange", this._onSlot);
    this.syncBody();
  }
}
if (!customElements.get("g-page-section")) customElements.define("g-page-section", GPageSection);
