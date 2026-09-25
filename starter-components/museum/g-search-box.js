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

const LONG_PLACEHOLDER = "Search artworks, artists, subjects…";
// Phones: the long text would be cut mid-word next to the button.
const SHORT_PLACEHOLDER = "Artworks, artists, subjects…";
const defaultPlaceholder = () => (window.matchMedia?.("(max-width: 420px)").matches ? SHORT_PLACEHOLDER : LONG_PLACEHOLDER);
const ICON = `<svg class="icon" viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M15.5 15.5 20 20" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/></svg>`;
let searchBoxCount = 0;

class GSearchBox extends HTMLElement {
  static get observedAttributes() { return ["value", "placeholder", "size", "hide-label"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._uid = `sb${++searchBoxCount}`;
    this._busy = false;
    this._hint = "";
    // Back/forward cache restores the page with the button still in its "Searching…" state.
    this._onPageShow = (e) => { if (e.persisted && this._busy) { this._hint = ""; this.unbusy(); } };
  }
  connectedCallback() {
    loadFonts();
    window.addEventListener("pageshow", this._onPageShow);
    this.render();
  }
  disconnectedCallback() {
    window.removeEventListener("pageshow", this._onPageShow);
    clearTimeout(this._busyTimer);
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this.isConnected || oldValue === newValue || !this.shadowRoot.firstChild) return;
    const input = this.shadowRoot.querySelector("input");
    // A new value replaces what's typed; placeholder changes update in place so focus and typing survive.
    if (name === "value") { input.value = newValue || ""; return; }
    if (name === "placeholder") { input.placeholder = newValue || defaultPlaceholder(); return; }
    if (name === "size") { this.shadowRoot.querySelector("form").className = this._size; return; }
    if (name === "hide-label") this.shadowRoot.querySelector("label").className = this._labelClass;
  }
  get _size() { return (this.getAttribute("size") || "").toLowerCase() === "regular" ? "regular" : "large"; }
  // hide-label keeps the label for screen readers only, for when a heading right above says the same.
  get _labelClass() { return this.hasAttribute("hide-label") ? "label sr" : "label"; }
  render() {
    const id = this._uid;
    const value = this.getAttribute("value") || "";
    const ph = this.getAttribute("placeholder") || defaultPlaceholder();
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      :host { min-width: 0; max-width: 100%; }
      form { width: 100%; max-width: 720px; margin: 0; display: grid; gap: 8px; }
      :focus-visible { outline-color: var(--search-ring, var(--oxblood)); }
      label.label { color: var(--search-label, var(--soft)); }
      .row { display: flex; align-items: stretch; gap: 8px; }
      .field { position: relative; flex: 1; min-width: 0; display: flex; align-items: center; background: var(--paper); border: 1px solid var(--rule); border-radius: 2px;
        box-shadow: 0 1px 2px rgba(29,27,24,.05); transition: border-color .15s ease, box-shadow .15s ease; }
      .field:hover { border-color: #cfc6b6; }
      .field:focus-within { border-color: var(--oxblood); box-shadow: 0 0 0 1px var(--oxblood), 0 1px 2px rgba(29,27,24,.05); }
      .icon { position: absolute; left: 14px; color: var(--soft); pointer-events: none; }
      .field:focus-within .icon { color: var(--oxblood); }
      input { width: 100%; min-width: 0; height: 100%; border: 0; background: transparent; color: var(--ink); padding: 0 14px 0 44px; border-radius: 2px; }
      input:focus, input:focus-visible { outline: none; }
      input::placeholder { color: var(--soft); opacity: 1; }
      input::-webkit-search-cancel-button { cursor: pointer; }
      .large .field { height: 56px; }
      .large input { font: 400 20px/1.2 var(--serif); }
      .large .btn { min-height: 56px; padding: 0 26px; font-size: 15px; }
      .regular .field { height: 44px; }
      .regular input { font: 400 16px/1.2 var(--sans); padding-left: 40px; }
      .regular .icon { left: 12px; width: 18px; height: 18px; }
      .btn { flex: none; letter-spacing: .01em; }
      .btn .spin { width: 14px; height: 14px; border: 2px solid rgba(255,255,255,.4); border-top-color: #fff; border-radius: 50%; animation: spin .8s linear infinite; }
      @keyframes spin { to { transform: rotate(360deg); } }
      .hint { min-height: 0; margin: 0; font-size: 13px; color: var(--search-hint, var(--error)); }
      .hint:empty { display: none; }
      @media (max-width: 420px) {
        .large .field { height: 52px; }
        .large input { font-size: 18px; }
        .large .btn { min-height: 52px; padding: 0 16px; }
      }
    </style>
    <form class="${this._size}" role="search" action="/search" novalidate>
      <label class="${this._labelClass}" for="${id}-q">Search the collections</label>
      <div class="row">
        <div class="field">${ICON}<input id="${id}-q" name="q" type="search" enterkeyhint="search" autocomplete="off" spellcheck="false"
          maxlength="200" value="${esc(value)}" placeholder="${esc(ph)}" aria-describedby="${id}-hint"></div>
        <button class="btn" type="submit"></button>
      </div>
      <p class="hint" id="${id}-hint" role="status" aria-live="polite"></p>
    </form>`;
    adoptKitStyle(this.shadowRoot);
    const form = this.shadowRoot.querySelector("form");
    const input = form.querySelector("input");
    form.addEventListener("submit", (e) => { e.preventDefault(); this.submit(input); });
    input.addEventListener("input", () => { if (this._hint) { this._hint = ""; this.sync(); } });
    this.sync();
  }
  // Updates the button and hint without rebuilding the form, so typing and focus are kept.
  sync() {
    const btn = this.shadowRoot.querySelector("button");
    const hint = this.shadowRoot.querySelector(".hint");
    if (!btn) return;
    btn.setAttribute("aria-busy", this._busy ? "true" : "false");
    btn.innerHTML = this._busy ? `<span class="spin" aria-hidden="true"></span><span>Searching…</span>` : `<span>Search</span>`;
    hint.textContent = this._hint;
  }
  unbusy() {
    clearTimeout(this._busyTimer);
    if (!this._busy) return;
    this._busy = false;
    this.sync();
  }
  // The button stays enabled while busy: pages are generated server-side and can take a while, so a
  // stopped or stalled navigation must never leave the box unusable. Submitting again just restarts it.
  submit(input) {
    const q = input.value.replace(/\s+/g, " ").trim();
    if (!q) {
      this._hint = "Type an artwork, an artist or a subject to search.";
      this.sync();
      input.focus();
      return;
    }
    const href = `/search/${encodeURIComponent(q)}`;
    // Searching for what's already shown: nothing to load.
    if (location.pathname === href) { input.value = q; return; }
    this._busy = true;
    this._hint = "";
    this.sync();
    // If navigation is stopped or never commits (Esc, a download, a 204), drop the spinner eventually.
    clearTimeout(this._busyTimer);
    this._busyTimer = setTimeout(() => this.unbusy(), 30000);
    this.dispatchEvent(new CustomEvent("g-search", { detail: { query: q }, bubbles: true, composed: true }));
    location.assign(href);
  }
}
if (!customElements.get("g-search-box")) customElements.define("g-search-box", GSearchBox);
