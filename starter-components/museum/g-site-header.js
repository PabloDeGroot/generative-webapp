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

// Default nav: [current key, label, canonical route].
const NAV = [["highlights", "Highlights", "/highlights"], ["collections", "Collections", "/collections"], ["exhibitions", "My exhibitions", "/exhibitions"]];
// Lenient mapping of `current` values the page designer may write to the nav key they belong to.
const CURRENT = {
  highlights: "highlights", highlight: "highlights", themes: "highlights", theme: "highlights",
  collections: "collections", collection: "collections", artwork: "collections", artworks: "collections", artist: "collections", artists: "collections",
  exhibitions: "exhibitions", exhibition: "exhibitions", "my-exhibitions": "exhibitions", "my exhibitions": "exhibitions",
  home: "home", "": "", search: "search"
};
const ICON_SEARCH = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><circle cx="10.5" cy="10.5" r="6.5" fill="none" stroke="currentColor" stroke-width="1.7"/><path d="M15.4 15.4 20.5 20.5" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;
const ICON_CLOSE = `<svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6 6 18" stroke="currentColor" stroke-width="1.7" stroke-linecap="round"/></svg>`;

const STYLE = `
  .skip { position: absolute; left: 16px; top: -64px; z-index: 20; box-shadow: 0 4px 16px rgba(29,27,24,.18); }
  .skip:focus { top: 10px; }
  header { position: relative; background: var(--paper); border-bottom: 1px solid var(--rule); }
  .row { max-width: 1304px; margin: 0 auto; padding: 0 32px; min-height: 64px; display: flex; align-items: center; gap: 36px; }
  .mark { display: inline-flex; align-items: center; gap: 11px; min-height: 44px; flex: none; text-decoration: none; color: var(--ink);
    font: 500 24px/1 var(--serif); font-optical-sizing: auto; letter-spacing: -.005em; white-space: nowrap; }
  .mark i { width: 8px; height: 8px; background: var(--oxblood); flex: none; box-shadow: 0 0 0 3px var(--paper), 0 0 0 4px rgba(168,132,74,.45); }
  .mark:hover span { color: var(--oxblood-deep); }
  nav { display: flex; align-items: center; gap: 28px; min-width: 0; }
  nav a, ::slotted(a) { display: inline-flex; align-items: center; min-height: 44px; padding: 0 2px; white-space: nowrap; color: var(--ink);
    font: 500 14px/1 var(--sans); text-decoration: underline 2px transparent; text-underline-offset: 6px; transition: text-decoration-color .2s ease, color .2s ease; }
  nav a:hover, ::slotted(a:hover) { color: var(--oxblood-deep); text-decoration-color: var(--rule); }
  nav a[aria-current="page"], ::slotted(a[aria-current="page"]) { color: var(--oxblood); text-decoration-color: var(--oxblood); }
  .end { margin-left: auto; display: flex; align-items: center; gap: 16px; min-width: 0; }
  form { position: relative; display: flex; align-items: center; height: 44px; border: 1px solid var(--rule); border-radius: 2px; background: var(--wall); transition: border-color .2s ease, background-color .2s ease; }
  form:hover { border-color: #cfc6b6; }
  form:focus-within { border-color: var(--oxblood); background: var(--paper); box-shadow: 0 0 0 1px var(--oxblood); }
  input { width: 200px; height: 42px; padding: 0 4px 0 14px; border: 0; outline: 0; background: transparent; color: var(--ink);
    font: 400 14px/1 var(--sans); transition: width .25s ease; -webkit-appearance: none; appearance: none; }
  input::placeholder { color: var(--soft); opacity: 1; }
  input::-webkit-search-cancel-button { display: none; }
  input:focus { width: 260px; }
  .go, .close, .toggle { display: inline-grid; place-items: center; width: 42px; height: 42px; flex: none; border: 0; border-radius: 2px; background: transparent; color: var(--soft); cursor: pointer; text-decoration: none; }
  .go:hover, .close:hover, .toggle:hover { color: var(--oxblood); }
  .go:focus-visible, .close:focus-visible { outline-offset: -2px; }
  .close, .toggle { display: none; }
  .account { display: flex; align-items: center; min-height: 44px; }
  /* google-login floats (position: fixed), leaving an empty flex item: cancel its gap so the bar keeps its room. */
  .account.bare { margin-left: -16px; }
  @media (max-width: 759.98px) {
    .row { flex-wrap: wrap; gap: 0 12px; padding: 0 16px; min-height: 0; }
    .mark { min-height: 56px; font-size: 22px; }
    .end { gap: 4px; }
    .toggle { display: inline-grid; width: 44px; height: 44px; color: var(--ink); }
    form { display: none; }
    nav { order: 10; flex: 1 0 100%; gap: 24px; margin: 0 -16px; padding: 0 16px; height: 44px; border-top: 1px solid var(--rule);
      overflow-x: auto; scrollbar-width: none; overscroll-behavior-x: contain; scroll-padding: 0 16px; }
    nav::-webkit-scrollbar { display: none; }
    /* The scroller clips anything outside its 44px box, so draw the focus ring inset. */
    nav a:focus-visible, ::slotted(a:focus-visible) { outline-offset: -2px; }
    nav.more { -webkit-mask-image: linear-gradient(90deg, #000 calc(100% - 36px), transparent); mask-image: linear-gradient(90deg, #000 calc(100% - 36px), transparent); }
    .searching .mark, .searching .toggle, .searching .account { display: none; }
    .searching .end { flex: 1; margin-left: 0; min-height: 56px; }
    .searching form { display: flex; flex: 1; min-width: 0; }
    .searching input, .searching input:focus { width: 100%; flex: 1; min-width: 0; font-size: 16px; }
    .searching .close { display: inline-grid; }
  }
  @media (min-width: 760px) and (max-width: 979.98px) {
    .row { gap: 20px; }
    nav { gap: 20px; }
    input { width: 150px; }
    input:focus { width: 180px; }
  }`;

class GSiteHeader extends HTMLElement {
  static get observedAttributes() { return ["site-name", "current"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._searching = false;
    this._resize = null;
  }
  connectedCallback() {
    loadFonts();
    this.render();
    if (typeof ResizeObserver === "function" && !this._resize) {
      this._resize = new ResizeObserver(() => this._markOverflow());
      this._resize.observe(this);
    }
  }
  disconnectedCallback() {
    if (this._resize) { this._resize.disconnect(); this._resize = null; }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this.render();
  }
  _current() {
    const raw = (this.getAttribute("current") || "").trim().toLowerCase();
    return CURRENT[raw] ?? (NAV.some(([key]) => key === raw) ? raw : "");
  }
  render() {
    const root = this.shadowRoot;
    const typed = root.querySelector("input")?.value || "";
    const current = this._current();
    const siteName = (this.getAttribute("site-name") || "").trim() || "Vitrine";
    const links = NAV.map(([key, label, href]) => `<a href="${href}"${key === current ? ` aria-current="page"` : ""}>${label}</a>`).join("");
    root.innerHTML = `<style>${TOKENS}${STYLE}</style>
      <header class="${this._searching ? "searching" : ""}">
        <a class="skip btn" href="#main">Skip to content</a>
        <div class="row">
          <a class="mark" href="/" aria-label="${esc(siteName)}, home"${current === "home" ? ` aria-current="page"` : ""}><i aria-hidden="true"></i><span>${esc(siteName)}</span></a>
          <nav aria-label="Main"><slot name="nav">${links}</slot></nav>
          <div class="end">
            <form id="search" role="search" action="/search" novalidate>
              <input type="search" name="q" aria-label="Search the collections" placeholder="Search artworks, artists…" autocomplete="off" autocapitalize="off" spellcheck="false" enterkeyhint="search" maxlength="200" value="${esc(typed)}">
              <button class="go" type="submit" aria-label="Search">${ICON_SEARCH}</button>
              <button class="close" type="button" aria-label="Close search">${ICON_CLOSE}</button>
            </form>
            <a class="toggle" href="/search/" role="button" aria-label="Search the collections" aria-controls="search" aria-expanded="${this._searching}">${ICON_SEARCH}</a>
            <div class="account"><slot name="account"></slot></div>
          </div>
        </div>
      </header>`;
    adoptKitStyle(root);
    this._wire();
    this._markOverflow(true);
  }
  _wire() {
    const root = this.shadowRoot;
    const form = root.querySelector("form");
    const input = root.querySelector("input");
    const toggle = root.querySelector(".toggle");
    root.querySelector(".skip").addEventListener("click", (e) => {
      const main = document.getElementById("main") || document.querySelector("main");
      if (!main) return;
      e.preventDefault();
      if (!main.hasAttribute("tabindex")) main.setAttribute("tabindex", "-1");
      main.focus({ preventScroll: true });
      main.scrollIntoView({ block: "start" });
    });
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const q = input.value.replace(/\s+/g, " ").trim();
      // Dots-only queries would resolve as dot segments (/search/.. is /), so treat them as empty.
      if (!q || /^\.+$/.test(q)) { input.value = ""; input.focus(); return; }
      location.assign("/search/" + encodeURIComponent(q));
    });
    toggle.addEventListener("click", (e) => { e.preventDefault(); this._setSearching(true); });
    toggle.addEventListener("keydown", (e) => { if (e.key === " ") { e.preventDefault(); this._setSearching(true); } });
    root.querySelector(".close").addEventListener("click", () => this._setSearching(false, true));
    form.addEventListener("keydown", (e) => {
      if (e.key !== "Escape") return;
      if (this._searching) { e.preventDefault(); this._setSearching(false, true); }
      else if (input.value) { e.preventDefault(); input.value = ""; }
    });
    // On phones, leaving an empty expanded search collapses it back to the icon.
    form.addEventListener("focusout", (e) => {
      if (this._searching && !input.value.trim() && !form.contains(e.relatedTarget)) this._setSearching(false);
    });
    root.querySelector("slot[name=nav]").addEventListener("slotchange", () => this._markOverflow());
    root.querySelector("slot[name=account]").addEventListener("slotchange", () => this._markOverflow());
  }
  _setSearching(on, returnFocus = false) {
    this._searching = on;
    const root = this.shadowRoot;
    root.querySelector("header").classList.toggle("searching", on);
    const toggle = root.querySelector(".toggle");
    toggle.setAttribute("aria-expanded", String(on));
    if (on) root.querySelector("input").focus();
    else if (returnFocus) toggle.focus();
  }
  // Phones: fade the right edge of the nav row while links overflow, and keep the current link in view.
  _markOverflow(reveal = false) {
    const nav = this.shadowRoot.querySelector("nav");
    if (!nav) return;
    const account = this.shadowRoot.querySelector(".account");
    if (account) account.classList.toggle("bare", account.getBoundingClientRect().width < 1);
    const overflowing = nav.scrollWidth > nav.clientWidth + 1;
    nav.classList.toggle("more", overflowing && nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4);
    if (!nav._scrollWired) {
      nav._scrollWired = true;
      nav.addEventListener("scroll", () => nav.classList.toggle("more", nav.scrollLeft + nav.clientWidth < nav.scrollWidth - 4), { passive: true });
    }
    const on = nav.querySelector("a[aria-current=\"page\"]");
    if (reveal && overflowing && on) nav.scrollLeft = Math.max(0, on.offsetLeft - nav.offsetLeft - 16);
  }
}
if (!customElements.get("g-site-header")) customElements.define("g-site-header", GSiteHeader);
