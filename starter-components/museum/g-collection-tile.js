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

// The museum a department id belongs to, used when the museum attribute is left out.
const MUSEUMS = { aic: "Art Institute of Chicago", met: "The Met" };
const museumOf = (id) => MUSEUMS[String(id || "").split("-")[0].toLowerCase()] || "";

class GCollectionTile extends HTMLElement {
  static get observedAttributes() { return ["collection-id", "name", "museum", "image-url"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    loadFonts();
    this.render();
    this._ready = true;
  }
  attributeChangedCallback(_name, oldValue, newValue) {
    // Before the first render (parse/upgrade), connectedCallback renders once with every attribute set.
    if (this._ready && oldValue !== newValue) this.render();
  }
  render() {
    const collectionId = (this.getAttribute("collection-id") || "").trim();
    const name = (this.getAttribute("name") || "").trim() || "Untitled collection";
    const museum = (this.getAttribute("museum") || "").trim() || museumOf(collectionId);
    const cover = artSrc(this.getAttribute("image-url"));
    const href = collectionId ? collectionHref(collectionId) : "";
    const tag = href ? "a" : "div";
    // Inside the link the mat is decorative (aria-hidden), so the link is named only by .name and .museum.
    // With a real cover, the work hangs on the mat; without one the mat is typographic (never a generated image).
    const art = cover
      ? artImg(cover, `A work from the ${name} collection`, name, { sizes: "(min-width: 1240px) 300px, (min-width: 860px) 30vw, (min-width: 520px) 45vw, 90vw" })
      : `<div class="type" aria-hidden="true"><span class="rule"></span><i class="t">${esc(name)}</i>${museum ? `<span class="label">${esc(museum)}</span>` : ""}</div>`;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      :host { height: 100%; }
      .tile { display: flex; flex-direction: column; height: 100%; min-height: 44px; text-decoration: none; color: var(--ink); border-radius: 2px;
              transition: transform .25s ease; }
      a.tile { cursor: pointer; }
      .mat { aspect-ratio: 4 / 3; width: 100%; border-radius: 2px; container-type: inline-size; transition: box-shadow .25s ease; }
      .mat.wait { animation: sk 1.6s ease-in-out infinite; }
      /* Pin the work to the mat so height: 100% resolves; otherwise a tall cover overflows and is cropped. */
      .mat img { position: absolute; inset: 0; }
      .ph i { font-size: clamp(17px, 7.5cqi, 28px); color: var(--soft); }
      .type { position: absolute; inset: 0; display: grid; place-content: center; justify-items: center; gap: 12px; padding: 10% 12%; text-align: center; }
      .type i { font-size: clamp(20px, 9cqi, 34px); line-height: 1.15; color: var(--soft); overflow-wrap: anywhere; text-wrap: balance; }
      .type .rule { width: 32px; height: 1px; background: var(--gilt); }
      .type .label { font-size: 10px; }
      .cap { display: grid; grid-template-columns: 1fr auto; column-gap: 12px; row-gap: 4px; align-items: baseline; padding: 12px 2px 4px; }
      .name { display: block; margin: 0; font: 500 20px/1.25 var(--serif); font-variation-settings: "opsz" 20; overflow-wrap: anywhere; text-wrap: balance;
              text-decoration: underline; text-decoration-color: transparent; text-decoration-thickness: 1px; text-underline-offset: 4px; transition: text-decoration-color .2s ease; }
      .arrow { color: var(--oxblood); font: 500 18px/1 var(--sans); opacity: 0; transform: translateX(-4px); transition: opacity .2s ease, transform .2s ease; }
      .museum { grid-column: 1 / -1; }
      a.tile:hover, a.tile:focus-visible { transform: translateY(-2px); }
      a.tile:hover .mat, a.tile:focus-visible .mat { box-shadow: inset 0 0 0 1px var(--gilt), inset 0 0 0 1px rgba(29,27,24,.06); }
      a.tile:hover .name, a.tile:focus-visible .name { text-decoration-color: var(--oxblood); }
      a.tile:hover .arrow, a.tile:focus-visible .arrow { opacity: 1; transform: translateX(0); }
      a.tile:focus-visible { outline-offset: 4px; }
      @media (prefers-reduced-motion: reduce) {
        a.tile:hover, a.tile:focus-visible { transform: none; }
        .arrow { opacity: 1; transform: none; }
      }
    </style>
    <${tag} class="tile"${href ? ` href="${esc(href)}"` : ""}>
      <div class="mat${cover ? " wait" : ""}"${href ? ` aria-hidden="true"` : ""}>${art}</div>
      <div class="cap">
        <span class="name">${esc(name)}</span>${href ? `<span class="arrow" aria-hidden="true">→</span>` : ""}
        ${museum ? `<span class="label museum">${esc(museum)}</span>` : ""}
      </div>
    </${tag}>`;
    adoptKitStyle(this.shadowRoot);
    wireImages(this.shadowRoot);
    // The mat pulses gently while the cover loads; once it has loaded or failed, it settles.
    const mat = this.shadowRoot.querySelector(".mat.wait");
    const img = mat && mat.querySelector("img");
    if (!img || img.complete) { if (mat) mat.classList.remove("wait"); return; }
    const settle = () => mat.classList.remove("wait");
    img.addEventListener("load", settle, { once: true });
    img.addEventListener("error", settle, { once: true });
  }
}
if (!customElements.get("g-collection-tile")) customElements.define("g-collection-tile", GCollectionTile);
