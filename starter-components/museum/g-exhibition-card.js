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

// Card-specific styles. The cover hangs in front of two offset gilt hairline frames (the rest of the
// show, stacked behind it); the mat pulses as the kit's skeleton until its image has loaded or failed.
const CARD_CSS = `
/* The kit's .mat img is height:100% of a grid box sized only by aspect-ratio, which doesn't resolve, so the
   image kept its natural height and the mat cropped it: pin it to the mat so the whole work shows. */
.mat > img { position: absolute; inset: 0; }
:host { height: 100%; min-width: 0; }
.card { display: flex; flex-direction: column; height: 100%; color: var(--ink); text-decoration: none; border-radius: 2px; transition: transform .2s ease; }
.hang { position: relative; isolation: isolate; margin: 12px 12px 0 0; }
.hang::before, .hang::after { content: ""; position: absolute; z-index: -1; border: 1px solid var(--gilt); border-radius: 2px; pointer-events: none; transition: transform .25s ease, opacity .25s ease; }
.hang::before { inset: 0; transform: translate(6px, -6px); opacity: .55; background: var(--paper); }
.hang::after { inset: 0; transform: translate(12px, -12px); opacity: .3; }
.mat { aspect-ratio: 4 / 3; width: 100%; border-radius: 2px; transition: box-shadow .2s ease; }
.mat.wait { animation: sk 1.6s ease-in-out infinite; }
.empty { background: var(--paper); box-shadow: none; }
.empty .frame { position: absolute; inset: 11%; display: grid; place-content: center; gap: 6px; padding: 8px; text-align: center; border: 1px dashed var(--gilt); border-radius: 2px; }
.empty .frame i { font-size: 18px; line-height: 1.3; color: var(--soft); }
.empty .frame span { color: var(--soft); }
.body { display: grid; gap: 4px; align-content: start; padding: 14px 2px 4px; min-width: 0; }
.ttl { margin: 0; font: 500 22px/1.25 var(--serif); color: var(--ink); overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
  text-decoration: underline; text-decoration-color: transparent; text-decoration-thickness: 1px; text-underline-offset: 5px; transition: text-decoration-color .2s ease; }
.sub { margin: 0; font-size: 15px; line-height: 1.45; color: var(--soft); overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.meta { margin: 4px 0 0; font-size: 13px; line-height: 1.4; color: var(--soft); }
.meta b { font-weight: 400; padding: 0 .35em; color: var(--gilt); }
a.card { cursor: pointer; }
a.card:focus-visible { outline: none; }
a.card:focus-visible .mat { outline: 2px solid var(--oxblood); outline-offset: 2px; }
a.card:hover, a.card:focus-visible { transform: translateY(-2px); }
a.card:hover .mat, a.card:focus-visible .mat { box-shadow: inset 0 0 0 1px var(--gilt), 0 10px 22px -16px rgba(29,27,24,.45); }
a.card:hover .hang::before, a.card:focus-visible .hang::before { transform: translate(8px, -8px); opacity: .75; }
a.card:hover .hang::after, a.card:focus-visible .hang::after { transform: translate(15px, -15px); opacity: .45; }
a.card:hover .ttl, a.card:focus-visible .ttl { text-decoration-color: var(--oxblood); }
@media (max-width: 380px) { .ttl { font-size: 19px; } .hang { margin: 10px 10px 0 0; } }
@media (prefers-reduced-motion: reduce) { a.card:hover, a.card:focus-visible { transform: none; } }`;

class GExhibitionCard extends HTMLElement {
  static get observedAttributes() { return ["exhibition-id", "title", "subtitle", "artwork-count", "image-url", "updated-at"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    loadFonts();
    this.takeTitle();
    this.render();
  }
  // `title` is a global attribute: left on the host it becomes a native tooltip showing the stored,
  // still-escaped text ("Monet &amp; friends"). Keep it in a private field and drop the attribute.
  takeTitle() {
    const value = this.getAttribute("title");
    if (value === null) return false;
    this._title = value;
    this.removeAttribute("title");
    return true;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (name === "title") {
      // Our own removal (newValue null) needs no re-render; a new value is taken and rendered below.
      if (newValue === null || !this.isConnected) return;
      this.takeTitle();
    } else if (oldValue === newValue) return;
    if (this.isConnected) this.render();
  }
  render() {
    const attr = (name) => (this.getAttribute(name) || "").trim();
    const id = attr("exhibition-id");
    const title = String(this._title ?? "").trim() || "Untitled exhibition";
    const subtitle = attr("subtitle");
    const rawCount = attr("artwork-count");
    const count = rawCount === "" ? NaN : Math.max(0, Math.floor(Number(rawCount)));
    const hasCount = Number.isFinite(count);
    const cover = artSrc(attr("image-url"));
    const updated = ago(attr("updated-at"));
    // The dashed 'No works yet' frame only when the exhibition is known to be empty (count 0), or when
    // there is neither a count nor a cover. With works but no usable cover, the mat shows the kit's
    // neutral placeholder (artImg falls back to it), so the card never says 'No works yet' and '9 works'.
    const empty = hasCount ? count === 0 : !cover;
    const meta = [];
    if (hasCount) meta.push(`${count.toLocaleString()} ${count === 1 ? "work" : "works"}`);
    if (updated) meta.push(`<time datetime="${esc(attr("updated-at"))}">updated ${esc(updated)}</time>`);
    const mat = empty
      ? `<div class="mat empty"><div class="frame"><i class="t">No works yet</i><span class="label">Add works from any artwork page</span></div></div>`
      : `<div class="mat">${artImg(cover, `Opening work of the exhibition ${title}`, title, { sizes: "(min-width: 1240px) 380px, (min-width: 900px) 30vw, (min-width: 520px) 45vw, 90vw" })}</div>`;
    const inner = `<div class="hang">${mat}</div>
      <div class="body">
        <h3 class="ttl">${esc(title)}</h3>
        ${subtitle ? `<p class="sub">${esc(subtitle)}</p>` : ""}
        ${meta.length ? `<p class="meta num">${meta.map((m, i) => (i ? `<b aria-hidden="true">·</b>` : "") + (m.startsWith("<time") ? m : esc(m))).join("")}</p>` : ""}
      </div>`;
    // Without an id there is no page to open, so the card is shown but not linked.
    const body = id && id !== "new"
      ? `<a class="card" href="${esc(exhibitionHref(id))}">${inner}</a>`
      : `<div class="card">${inner}</div>`;
    this.shadowRoot.innerHTML = `<style>${TOKENS}${CARD_CSS}</style><article class="h-full">${body}</article>`;
    adoptKitStyle(this.shadowRoot);
    wireImages(this.shadowRoot);
    const pending = this.shadowRoot.querySelector(".mat img:not(.in)");
    if (pending) {
      const box = pending.closest(".mat");
      const done = () => box.classList.remove("wait");
      box.classList.add("wait");
      pending.addEventListener("load", done, { once: true });
      pending.addEventListener("error", done, { once: true });
    }
  }
}
if (!customElements.get("g-exhibition-card")) customElements.define("g-exhibition-card", GExhibitionCard);
