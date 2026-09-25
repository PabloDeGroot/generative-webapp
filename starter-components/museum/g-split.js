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

// Layout only: the grid is driven entirely by :host attribute selectors, so changing aside-width,
// aside-side or sticky restyles instantly without re-rendering (and without touching slotted children).
// The column elements are plain <div> and <aside>: the page already has its own <main id="main">.
// slot="main" is the same column as the default slot; it exists so a g-page-section placed there carries a
// slot attribute, which makes it drop its band padding and background (as it does in slot="aside").
const SPLIT_CSS = `
  :host { --aside: 300px; }
  :host([aside-width="wide"]) { --aside: 380px; }
  .split { display: grid; grid-template-columns: minmax(0, 1fr); gap: 32px; max-width: 1240px; margin: 0 auto; padding: 28px 16px; } /* the section rhythm: nothing sits flush against the header, the next band or the footer */
  .col { display: flex; flex-direction: column; gap: 24px; min-width: 0; }
  .col > ::slotted(*) { min-width: 0; }
  /* With nothing in the aside, the main column takes the full width instead of leaving a hole. */
  .split.no-aside aside { display: none; }
  @media (min-width: 860px) {
    .split { gap: 40px; padding: 48px 32px; grid-template-columns: minmax(0, 1fr) var(--aside); }
    :host([aside-side="left"]) .split { grid-template-columns: var(--aside) minmax(0, 1fr); }
    /* The DOM keeps main first, so phones and screen readers get main, then sidebar. */
    :host([aside-side="left"]) aside { order: -1; }
    .split.no-aside, :host([aside-side="left"]) .split.no-aside { grid-template-columns: minmax(0, 1fr); }
    /* Sticky sidebar: stays in view; if it is taller than the window it scrolls on its own. sticky="false"
       counts as off. The 4px inset leaves room for the 2px focus ring and its 2px offset. */
    :host([sticky]:not([sticky="false"])) aside { position: sticky; top: 24px; align-self: start; max-height: calc(100vh - 48px); overflow-y: auto; overscroll-behavior: contain; padding: 4px; margin: -4px; scrollbar-width: thin; scrollbar-color: var(--rule) transparent; }
  }`;

class GSplit extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._rendered = false;
  }
  static get observedAttributes() { return ["sticky"]; }
  connectedCallback() {
    loadFonts();
    if (!this._rendered) this.render();
    this._syncAside();
    if (!this._ro && typeof ResizeObserver === "function") {
      this._ro = new ResizeObserver(() => this._syncScroll());
      this._ro.observe(this.shadowRoot.querySelector("aside"));
    }
    this._syncScroll();
  }
  disconnectedCallback() {
    this._ro?.disconnect();
    this._ro = null;
  }
  attributeChangedCallback() {
    if (this._rendered) this._syncScroll();
  }
  render() {
    this.shadowRoot.innerHTML = `<style>${TOKENS}${SPLIT_CSS}</style>
      <div class="split" part="split">
        <div class="col main" part="main"><slot name="main"></slot><slot></slot></div>
        <aside class="col" part="aside" aria-label="Related"><slot name="aside"></slot></aside>
      </div>`;
    adoptKitStyle(this.shadowRoot);
    this._rendered = true;
    this.shadowRoot.querySelector("slot[name=aside]").addEventListener("slotchange", () => this._syncAside());
  }
  _syncAside() {
    const slot = this.shadowRoot.querySelector("slot[name=aside]");
    const split = this.shadowRoot.querySelector(".split");
    if (!slot || !split) return;
    const has = slot.assignedElements().length > 0;
    split.classList.toggle("no-aside", !has);
    this._syncScroll();
  }
  // A sticky aside that overflows scrolls on its own: make it focusable so keyboard users can scroll it
  // (Safari doesn't focus scroll containers by itself). The kit's :focus-visible ring styles it.
  _syncScroll() {
    const aside = this.shadowRoot.querySelector("aside");
    if (!aside) return;
    const sticky = this.hasAttribute("sticky") && this.getAttribute("sticky") !== "false";
    const scrolls = sticky && getComputedStyle(aside).overflowY === "auto" && aside.scrollHeight > aside.clientHeight + 1;
    if (scrolls) aside.setAttribute("tabindex", "0");
    else aside.removeAttribute("tabindex");
  }
}
if (!customElements.get("g-split")) customElements.define("g-split", GSplit);
