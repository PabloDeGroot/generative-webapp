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

// Theme chips are pure attributes: no fetch, so no loading or error state. An empty theme list renders
// nothing at all (the host collapses) instead of an empty band.
const MAX_THEMES = 14;
const MAX_THEME_LENGTH = 60;
const norm = (s) => String(s ?? "").replace(/\+/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
function parseThemes(raw) {
  const seen = new Set();
  const out = [];
  for (const part of String(raw ?? "").split(",")) {
    const label = part.replace(/\s+/g, " ").trim().slice(0, MAX_THEME_LENGTH).trim();
    const key = norm(label);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    out.push({ label, key });
    if (out.length >= MAX_THEMES) break;
  }
  return out;
}

class GThemeChips extends HTMLElement {
  static get observedAttributes() { return ["themes", "current", "base", "include-all"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback(name, oldValue, newValue) { if (this.isConnected && oldValue !== newValue) this.render(); }
  render() {
    const base = norm(this.getAttribute("base")) === "search" ? "search" : "highlights";
    // Accept the segment decoded ("the sea") or still percent-encoded ("the%20sea").
    let rawCurrent = this.getAttribute("current") ?? "";
    try { rawCurrent = decodeURIComponent(rawCurrent); } catch { /* keep as written */ }
    const current = norm(rawCurrent);
    const includeAll = this.hasAttribute("include-all") && this.getAttribute("include-all") !== "false";
    const themes = parseThemes(this.getAttribute("themes"));
    const items = themes.map((t) => ({ label: t.label, href: `/${base}/${encodeURIComponent(t.label)}`, on: !!current && t.key === current }));
    if (includeAll) {
      // "All highlights" is current on /highlights itself: current="all" or current="" written explicitly.
      const allOn = this.hasAttribute("current") && (current === "" || current === "all" || current === "all highlights");
      items.unshift({ label: "All highlights", href: "/highlights", on: allOn, all: true });
    }
    if (!items.length) { this.shadowRoot.innerHTML = `<style>${TOKENS} :host { display: none; }</style>`; adoptKitStyle(this.shadowRoot); return; }
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      /* The phone scroller must not widen a grid or flex parent: the chips scroll inside it instead. */
      :host { min-width: 0; max-width: 100%; }
      nav { position: relative; }
      nav ul.chips { list-style: none; margin: 0; padding: 2px 0; display: flex; flex-wrap: wrap; gap: 8px; }
      li { flex: none; scroll-snap-align: start; }
      a.chip { display: inline-flex; align-items: center; gap: 8px; min-height: 44px; padding: 8px 16px; border: 1px solid var(--rule); border-radius: 999px; background: var(--paper);
        color: var(--ink); font: 500 14px/1.2 var(--sans); text-decoration: none; white-space: nowrap; max-width: 22ch; overflow: hidden; text-overflow: ellipsis;
        transition: border-color .15s ease, color .15s ease, background-color .15s ease; }
      a.chip span { overflow: hidden; text-overflow: ellipsis; }
      a.chip:hover { border-color: var(--oxblood); color: var(--oxblood); }
      a.chip:active { background: var(--oxblood-tint); }
      a.chip[aria-current="page"] { background: var(--oxblood-tint); border-color: var(--oxblood-tint); color: var(--oxblood); font-weight: 600; }
      a.chip[aria-current="page"]:hover { border-color: var(--oxblood); }
      a.chip.all::before { content: ""; width: 5px; height: 5px; border-radius: 999px; background: var(--gilt); flex: none; }
      a.chip.all[aria-current="page"]::before { background: var(--oxblood); }
      @media (max-width: 639px) {
        nav ul.chips { flex-wrap: nowrap; overflow-x: auto; scroll-snap-type: x proximity; scroll-padding-inline: 16px; scrollbar-width: none; -webkit-overflow-scrolling: touch;
          padding: 4px 16px; margin: 0 -16px; -webkit-mask-image: linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%);
          mask-image: linear-gradient(90deg, transparent 0, #000 16px, #000 calc(100% - 16px), transparent 100%); }
        nav ul.chips::-webkit-scrollbar { display: none; }
      }
    </style><nav aria-label="Explore by theme"><ul class="chips" role="list">${items.map((it) =>
      `<li><a class="chip${it.all ? " all" : ""}" href="${esc(it.href)}"${it.on ? ` aria-current="page"` : ""} title="${esc(it.label)}"><span>${esc(it.label)}</span></a></li>`).join("")}</ul></nav>`;
    adoptKitStyle(this.shadowRoot);
    // On the phone scroller, bring the current chip into view without scrolling the page itself.
    const list = this.shadowRoot.querySelector("ul.chips");
    const on = this.shadowRoot.querySelector("a[aria-current]");
    if (list && on) requestAnimationFrame(() => {
      if (list.scrollWidth <= list.clientWidth) return;
      const li = on.parentElement;
      list.scrollLeft = Math.max(0, li.offsetLeft - list.offsetLeft - 16);
    });
  }
}
if (!customElements.get("g-theme-chips")) customElements.define("g-theme-chips", GThemeChips);
