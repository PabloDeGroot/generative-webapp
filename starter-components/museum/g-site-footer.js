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

// Everything above is the kit-wide preamble, kept byte-identical in every museum component on purpose;
// this static footer uses only loadFonts, esc and the base TOKENS rules.
// Same destinations as g-site-header, plus a plain search entry (the footer has no search field).
const NAV = [
  ["Highlights", "/highlights"],
  ["Collections", "/collections"],
  ["My exhibitions", "/exhibitions"],
  ["Search the collections", "/search/"]
];
const SOURCES = [
  ["Art Institute of Chicago", "https://www.artic.edu/open-access"],
  ["The Metropolitan Museum of Art", "https://www.metmuseum.org/about-the-met/policies-and-documents/open-access"],
  ["Wikipedia", "https://www.wikipedia.org/"]
];
const ext = (label, href) => `<a class="ext" href="${esc(href)}" target="_blank" rel="noopener">${esc(label)}<span class="sr"> (opens in a new tab)</span></a>`;

class GSiteFooter extends HTMLElement {
  static get observedAttributes() { return ["site-name"]; }
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
    const name = (this.getAttribute("site-name") || "").trim() || "Vitrine";
    const nav = NAV.map(([label, href]) => `<li><a href="${href}">${esc(label)}</a></li>`).join("");
    const [aic, met, wiki] = SOURCES.map(([label, href]) => ext(label, href));
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      footer { background: var(--paper); border-top: 1px solid var(--rule); color: var(--ink); }
      .wrap { max-width: 1240px; margin: 0 auto; padding: 28px 16px; display: grid; grid-template-columns: 1fr; gap: 28px; }
      @media (min-width: 860px) { .wrap { grid-template-columns: 2fr 1fr 2fr; gap: 32px; padding: 40px 32px; } }
      .mark { display: inline-flex; align-items: center; gap: 10px; min-height: 44px; font: 500 20px/1 var(--serif); letter-spacing: -0.005em; text-decoration: none; color: var(--ink); }
      .mark i { width: 8px; height: 8px; border-radius: 50%; background: var(--oxblood); box-shadow: 0 0 0 3px var(--oxblood-tint); flex: none; }
      .mark:hover span { text-decoration: underline; text-decoration-color: var(--oxblood); text-underline-offset: 4px; text-decoration-thickness: 1px; }
      .motto { margin: 6px 0 0; max-width: 34ch; font: italic 400 16px/1.5 var(--serif); color: var(--soft); }
      .gilt { display: block; width: 40px; height: 1px; margin: 18px 0 0; background: var(--gilt); border: 0; }
      h2 { margin: 0 0 8px; }
      ul { list-style: none; margin: 0; padding: 0; display: grid; }
      nav a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; font-weight: 500; text-decoration: none; color: var(--ink); }
      nav a:hover { color: var(--oxblood); text-decoration: underline; text-underline-offset: 3px; }
      @media (min-width: 860px) { nav a { min-height: 32px; } }
      .credits p { margin: 0; font-size: 13px; line-height: 1.6; color: var(--soft); max-width: 60ch; }
      .credits p + p { margin-top: 10px; }
      .ext { color: var(--oxblood); font-weight: 600; text-decoration: none; }
      .ext:hover { color: var(--oxblood-deep); text-decoration: underline; text-underline-offset: 3px; }
      .base { border-top: 1px solid var(--rule); }
      .base .row { max-width: 1240px; margin: 0 auto; padding: 14px 16px; display: flex; flex-wrap: wrap; gap: 4px 16px; justify-content: space-between; color: var(--soft); font-size: 13px; }
      @media (min-width: 860px) { .base .row { padding: 14px 32px; } }
    </style>
    <footer>
      <div class="wrap">
        <div>
          <a class="mark" href="/"><i aria-hidden="true"></i><span>${esc(name)}</span></a>
          <p class="motto">Two museums’ collections on one quiet wall.</p>
          <hr class="gilt" aria-hidden="true">
        </div>
        <nav aria-label="Footer">
          <h2 class="label">Visit</h2>
          <ul role="list">${nav}</ul>
        </nav>
        <div class="credits">
          <h2 class="label">Credits</h2>
          <p>Images and data from the ${aic} API (public-domain images CC0) and ${met} Open Access. Artist biographies from ${wiki} (CC BY-SA).</p>
          <p>Every picture is the museums’ own photograph; nothing here is AI-generated art.</p>
        </div>
      </div>
      <div class="base"><div class="row"><span class="num">© ${new Date().getFullYear()} ${esc(name)}</span><span>Wall labels follow each museum\u2019s own records.</span></div></div>
    </footer>`;
    adoptKitStyle(this.shadowRoot);
  }
}
if (!customElements.get("g-site-footer")) customElements.define("g-site-footer", GSiteFooter);
