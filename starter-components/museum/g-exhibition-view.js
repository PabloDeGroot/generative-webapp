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

// Data too large or structured for attributes is fetched by the component itself through the site's
// action runner (POST with an intent). Identical reads on one page share a single request, and the
// server caches read results, so repeat visits don't run the LLM again.
const componentReads = (window.__gComponentReads ??= new Map());
async function postJson(route, body) {
  const res = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  if (!res.ok || (data && data.ok === false)) {
    const err = new Error(res.status === 401 ? "Sign in to see this." : (data && (data.message || data.error)) || "Couldn\x27t load this.");
    err.status = res.status;
    throw err;
  }
  return data;
}
function readAction(route, body) {
  const key = `${route} ${JSON.stringify(body)}`;
  if (!componentReads.has(key)) componentReads.set(key, postJson(route, body).catch((err) => { componentReads.delete(key); throw err; }));
  return componentReads.get(key);
}
// Writes are never memoised; a successful one drops this page's read memo (the server cache is
// invalidated by the write itself).
async function writeAction(route, body) {
  const res = await postJson(route, body);
  componentReads.clear();
  return res;
}
const needsSignIn = (err) => err?.status === 401 || /sign.?in|signed.?in|unauthenticated|not authenticated/i.test(err?.message || "");
// Responses follow the requested outputFormat; when the runner couldn't shape them, the raw tool
// result arrives under data.
const field = (res, key) => (res && typeof res === "object" ? (res[key] ?? res.data?.[key]) : undefined);
const payload = (res, key) => (res && typeof res === "object" && res[key] === undefined && res.data && typeof res.data === "object" ? res.data : res);
// Canonical requests. Every self-fetching file carries this block verbatim, so components that need
// the same data send byte-identical bodies and share one request. Routes name the data, not the page.
// Tool limits are fixed here; a component's limit attribute only trims what it shows.
const ART_URL = "string: the /__art/... URL, copied exactly";
const CARD = { id: "string", title: "string", artist: "string", date: "string", museum: "string", imageUrl: ART_URL, thumbUrl: ART_URL, imageAlt: "string" };
const READS = {
  artwork: (id) => [artworkHref(id), { intent: "get artwork details (GetArtwork)", id, outputFormat: { id: "string", title: "string", artist: "string", artistBio: "string", date: "string", museum: "string", imageUrl: ART_URL, largeImageUrl: ART_URL, imageAlt: "string", additionalImages: [{ imageUrl: ART_URL, thumbUrl: ART_URL }], medium: "string", dimensions: "string", creditLine: "string", department: "string", departmentId: "string", placeOfOrigin: "string", style: "string", classification: "string", description: "string", onView: "boolean", gallery: "string|null", isPublicDomain: "boolean", sourceUrl: "string", moreByArtist: [CARD] } }],
  artist: (name) => [`/artist/${encodeURIComponent(name)}`, { intent: "get artist profile and works (GetArtist)", name, outputFormat: { name: "string", description: "string", bio: "string", born: "number|null", died: "number|null", portraitUrl: "string|null: the /__art/... URL, copied exactly", wikipediaUrl: "string|null", artworks: [CARD] } }],
  search: (query, museum) => [`/search/${encodeURIComponent(query)}`, { intent: "search artworks (SearchArtworks)", query, museum: museum === "aic" || museum === "met" ? museum : "both", limit: 24, outputFormat: { query: "string", total: "number", artworks: [CARD] } }],
  highlights: (theme) => [theme ? `/highlights/${encodeURIComponent(theme)}` : "/highlights", { intent: "get museum highlights (GetHighlights)", theme: theme || undefined, limit: 12, outputFormat: { theme: "string|null", artworks: [CARD] } }],
  collection: (id) => [collectionHref(id), { intent: "get a collection and its works (GetDepartment)", id, limit: 24, outputFormat: { id: "string", name: "string", museum: "string", artworks: [CARD] } }],
  collections: () => ["/collections", { intent: "list museum collections (ListDepartments)", museum: "both", outputFormat: { departments: [{ id: "string", museum: "string", name: "string", coverImageUrl: "string|null: the /__art/... URL, copied exactly" }] } }],
  exhibitions: () => ["/exhibitions", { intent: "list my exhibitions (ListExhibitions)", outputFormat: { exhibitions: [{ id: "string", title: "string", subtitle: "string", artworkCount: "number", coverImageUrl: "string|null: the /__art/... URL, copied exactly", updatedAt: "string" }] } }],
  exhibition: (id) => [exhibitionHref(id), { intent: "get my exhibition (GetExhibition)", exhibitionId: id, outputFormat: { id: "string", title: "string", subtitle: "string", description: "string", updatedAt: "string", artworks: [{ ...CARD, note: "string" }] } }]
};
const WRITES = {
  create: (title, subtitle, description) => ["/exhibitions/new", { intent: "create an exhibition (CreateExhibition)", title, subtitle: subtitle || undefined, description: description || undefined, outputFormat: { id: "string", title: "string" } }],
  update: (exhibitionId, title, subtitle, description) => [exhibitionHref(exhibitionId), { intent: "update my exhibition (UpdateExhibition)", exhibitionId, title, subtitle, description, outputFormat: { id: "string" } }],
  add: (exhibitionId, artworkId, note) => [exhibitionHref(exhibitionId), { intent: "add an artwork to my exhibition (AddToExhibition)", exhibitionId, artworkId, note: note || undefined, outputFormat: { exhibitionId: "string", artworkCount: "number" } }],
  remove: (exhibitionId, artworkId) => [exhibitionHref(exhibitionId), { intent: "remove an artwork from my exhibition (RemoveFromExhibition)", exhibitionId, artworkId, outputFormat: { exhibitionId: "string", artworkCount: "number" } }],
  delete: (exhibitionId) => [exhibitionHref(exhibitionId), { intent: "delete my exhibition (DeleteExhibition)", exhibitionId, outputFormat: { deleted: "boolean" } }]
};

const TITLE_MAX = 120;
const SUBTITLE_MAX = 200;
const DESCRIPTION_MAX = 4000;
const works = (n) => `${n} work${n === 1 ? "" : "s"}`;
const reducedMotion = () => { try { return window.matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };

const VIEW_CSS = `
/* The kit's .mat img is height:100% of a grid box sized only by aspect-ratio, which doesn't resolve, so the
   image kept its natural height and the mat cropped it: pin it to the mat so the whole work shows. */
.mat > img { position: absolute; inset: 0; }
:host { background: var(--wall); }
.page { max-width: 1240px; margin: 0 auto; padding: 28px 16px 56px; }
@media (min-width: 860px) { .page { padding: 48px 32px 80px; } }

/* Title wall: a centred panel framed by a double gilt hairline, like a gallery's opening wall. */
.wall { position: relative; max-width: 820px; margin: 0 auto; padding: 44px 20px 32px; text-align: center; background: var(--wall); border: 1px solid var(--gilt); border-radius: 2px; }
.wall::before { content: ""; position: absolute; inset: 6px; border: 1px solid rgba(168,132,74,.32); pointer-events: none; }
@media (min-width: 860px) { .wall { padding: 64px 56px 44px; } }
.wall > * { position: relative; }
h1 { margin: 12px auto 0; max-width: 18ch; font: 500 clamp(40px, 6vw, 60px)/1.06 var(--serif); letter-spacing: -.01em; color: var(--ink); text-wrap: balance; overflow-wrap: anywhere; }
h1:focus { outline: none; }
h1:focus-visible { outline: 2px solid var(--oxblood); outline-offset: 4px; }
.sub { margin: 14px auto 0; max-width: 40ch; font-size: 22px; line-height: 1.35; color: var(--soft); font-weight: 400; text-wrap: balance; overflow-wrap: anywhere; }
.rule { width: 40px; height: 1px; margin: 26px auto 0; background: var(--gilt); border: 0; }
.intro { max-width: 60ch; margin: 24px auto 0; text-align: left; display: grid; gap: 14px; }
.intro p { margin: 0; font: 400 18px/1.65 var(--serif); color: var(--ink); overflow-wrap: anywhere; }
.meta { margin: 24px 0 0; font-size: 13px; color: var(--soft); }
.meta b { font-weight: 400; padding: 0 .4em; color: var(--gilt); }
.actions { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 12px; margin-top: 24px; }
.quiet { display: inline-flex; align-items: center; min-height: 44px; padding: 0 10px; background: none; border: 0; border-radius: 2px; font: 600 14px/1 var(--sans); color: var(--soft); cursor: pointer; text-decoration: underline; text-decoration-color: var(--rule); text-underline-offset: 4px; }
.quiet:hover { color: var(--error); text-decoration-color: currentColor; }
.confirm { display: flex; flex-wrap: wrap; justify-content: center; align-items: center; gap: 10px 12px; margin-top: 24px; padding: 14px 16px; background: var(--paper); border: 1px solid var(--rule); border-top: 2px solid var(--error); border-radius: 2px; }
.confirm p { margin: 0; font: 500 18px/1.35 var(--serif); flex-basis: 100%; overflow-wrap: anywhere; }
.btn.danger { background: var(--error); border-color: var(--error); }
.btn.danger:hover { background: #7f2517; border-color: #7f2517; }
.saved { margin: 14px 0 0; font-size: 14px; color: var(--ok); }

/* Inline edit form */
form { max-width: 620px; margin: 28px auto 0; display: grid; gap: 18px; text-align: left; }
.field { display: grid; gap: 6px; }
.field label { font: 600 11px/1.3 var(--sans); letter-spacing: .12em; text-transform: uppercase; color: var(--soft); }
.field label i { font-style: normal; font-weight: 500; letter-spacing: 0; text-transform: none; }
input, textarea { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--rule); border-radius: 2px; background: var(--paper); color: var(--ink); font: 400 16px/1.5 var(--sans); }
input:hover, textarea:hover { border-color: #cfc6b6; }
input:focus-visible, textarea:focus-visible { outline: 2px solid var(--oxblood); outline-offset: 2px; border-color: var(--oxblood); }
#f-title { font: 500 22px/1.3 var(--serif); }
#f-sub { font: italic 400 18px/1.4 var(--serif); }
textarea { min-height: 200px; resize: vertical; font: 400 17px/1.6 var(--serif); }
.count { justify-self: end; font-size: 12px; color: var(--soft); }
.count.near { color: var(--gilt-ink); font-weight: 600; }
.form-actions { display: flex; flex-wrap: wrap; gap: 10px; align-items: center; }
[aria-invalid="true"] { border-color: var(--error); }

/* Floor plan: a strip of numbered thumbnails, sticky on desktop. */
.plan { margin: 40px -16px 0; padding: 10px 16px; border-top: 1px solid var(--rule); border-bottom: 1px solid var(--rule); background: var(--wall); }
@media (min-width: 860px) {
  .plan { position: sticky; top: 0; z-index: 5; margin: 56px -32px 0; padding: 10px 32px; background: rgba(246,243,238,.92); -webkit-backdrop-filter: blur(10px); backdrop-filter: blur(10px); }
}
.plan-in { display: flex; align-items: center; gap: 16px; max-width: 1240px; margin: 0 auto; }
.plan-in > .label { flex: none; }
@media (max-width: 559px) { .plan-in > .label { display: none; } }
.thumbs { display: flex; gap: 8px; margin: 0; padding: 2px 2px 4px; list-style: none; overflow-x: auto; scrollbar-width: thin; scroll-behavior: smooth; }
.thumbs li { flex: none; }
.thumb { display: grid; justify-items: center; gap: 4px; width: 56px; text-decoration: none; color: var(--soft); border-radius: 2px; }
.thumb .mat { width: 56px; height: 56px; border-radius: 2px; transition: box-shadow .2s ease; }
.thumb .mat img { padding: 5px; filter: drop-shadow(0 2px 3px rgba(29,27,24,.18)); }
.thumb .ph { padding: 4px; }
.thumb .ph i, .thumb .ph span { display: none; }
.thumb .n { font: 600 11px/1 var(--sans); padding-bottom: 3px; border-bottom: 2px solid transparent; }
.thumb:hover .mat { box-shadow: inset 0 0 0 1px var(--gilt); }
.thumb:focus-visible { outline: none; }
.thumb:focus-visible .mat { outline: 2px solid var(--oxblood); outline-offset: 2px; }
.thumb[aria-current] .mat { box-shadow: inset 0 0 0 1px var(--gilt), 0 0 0 1px var(--gilt); }
.thumb[aria-current] .n { color: var(--oxblood); border-bottom-color: var(--oxblood); }

/* Walk-through */
.walk { margin-top: 48px; }
@media (min-width: 860px) { .walk { margin-top: 64px; } }
.stops { display: grid; gap: 72px; margin: 0; padding: 0; list-style: none; }
.stops > li { position: relative; scroll-margin-top: 20px; min-width: 0; }
@media (min-width: 860px) { .stops > li { scroll-margin-top: 112px; } }
.stops > li:focus { outline: none; }
.stops > li + li::before { content: ""; position: absolute; top: -36px; left: 50%; width: 40px; height: 1px; margin-left: -20px; background: var(--gilt); }
g-exhibition-stop { display: block; }

/* Closing wall and empty gallery */
.end { max-width: 620px; margin: 88px auto 0; padding-top: 36px; text-align: center; border-top: 1px solid var(--rule); }
.end h2 { margin: 10px 0 0; font: italic 500 30px/1.2 var(--serif); }
.end p { margin: 8px 0 0; color: var(--soft); }
.empty { max-width: 640px; margin: 48px auto 0; padding: 32px 24px; text-align: center; background: var(--paper); border: 1px solid var(--rule); border-top: 2px solid var(--gilt); border-radius: 2px; }
.empty p { margin: 0; font: 500 22px/1.4 var(--serif); text-wrap: balance; }
.empty .actions { margin-top: 20px; }

/* Signed-out and not-found states */
.state p.lead { margin: 18px auto 0; max-width: 46ch; font: 400 20px/1.5 var(--serif); color: var(--ink); text-wrap: balance; }
.state .small { margin: 10px 0 0; font-size: 14px; color: var(--soft); }

/* Loading skeleton */
.skw { display: grid; justify-items: center; gap: 14px; }
.sk-plan { display: flex; gap: 8px; margin-top: 40px; justify-content: center; }
.sk-stop { display: grid; gap: 24px; margin-top: 56px; }
@media (min-width: 860px) { .sk-stop { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); align-items: end; gap: 40px; } }
.sk-lines { display: grid; gap: 12px; }
`;

const unescapeOnce = (v) => String(v ?? "").replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]);

class GExhibitionView extends HTMLElement {
  static get observedAttributes() { return ["exhibition-id"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._exId = "";
    this._state = { status: "loading" };
    this._mode = "view"; // view | edit | confirm-delete
    this._busy = false;
    this._formError = "";
    this._saved = false;
    this._draft = null;
    this._seq = 0;
    this._active = 0;
    this._io = null;
    this._started = false;
    this._hashDone = false;
    this.shadowRoot.addEventListener("click", (e) => this.onClick(e));
    this.shadowRoot.addEventListener("submit", (e) => { e.preventDefault(); this.save(); });
    this.shadowRoot.addEventListener("input", (e) => this.onInput(e));
    this.shadowRoot.addEventListener("keydown", (e) => this.onKey(e));
    // g-exhibition-stop saves a removal itself, then tells us so the walk-through can renumber.
    this.shadowRoot.addEventListener("g-exhibition-change", (e) => this.onStopChange(e));
  }
  connectedCallback() {
    loadFonts();
    this.load();
  }
  disconnectedCallback() {
    if (this._io) { this._io.disconnect(); this._io = null; }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this.load();
  }

  async load() {
    const id = (this.getAttribute("exhibition-id") || "").trim();
    // Upgrades fire attributeChangedCallback and connectedCallback back to back: load each id once
    // (a failed load is retried when the element is re-attached, or by the Try again button).
    if (this._started && id === this._exId && this._state.status !== "not-found" && this._state.status !== "failed") return;
    this._started = true;
    this._exId = id;
    const seq = ++this._seq;
    this._mode = "view"; this._busy = false; this._formError = ""; this._saved = false; this._draft = null;
    if (!id || id === "new") { this._state = { status: "not-found" }; this.render(); return; }
    this._state = { status: "loading" }; this.render();
    try {
      const res = await readAction(...READS.exhibition(id));
      if (seq !== this._seq) return;
      const title = field(res, "title");
      if (!title && !Array.isArray(field(res, "artworks"))) throw Object.assign(new Error("Exhibition not found."), { status: 404 });
      const artworks = (field(res, "artworks") || []).filter((a) => a && a.id);
      this._state = {
        status: "ready",
        ex: { title: title || "Untitled exhibition", subtitle: field(res, "subtitle") || "", description: field(res, "description") || "", updatedAt: field(res, "updatedAt") || "", artworks }
      };
    } catch (err) {
      if (seq !== this._seq) return;
      // Only a real not-found says so; network errors, 5xx and runner failures can be retried.
      const missing = err?.status === 404 || /not found|doesn\x27t exist|does not exist/i.test(err?.message || "");
      this._state = { status: needsSignIn(err) ? "signed-out" : missing ? "not-found" : "failed", message: err?.message || "" };
    }
    this.render();
  }

  // ---------- rendering ----------
  render() {
    if (this._io) { this._io.disconnect(); this._io = null; }
    const { status } = this._state;
    const style = `<style>${TOKENS}${VIEW_CSS}</style>`;
    if (status === "loading") {
      this.shadowRoot.innerHTML = `${style}<div class="page" aria-busy="true">
        <h1 class="sr">Loading exhibition…</h1>
        <div class="wall skw" aria-hidden="true">
          <div class="sk" style="width:84px;height:12px"></div>
          <div class="sk" style="width:min(520px,80%);height:52px"></div>
          <div class="sk" style="width:min(340px,60%);height:22px"></div>
          <div class="sk" style="width:min(560px,90%);height:14px;margin-top:14px"></div>
          <div class="sk" style="width:min(520px,84%);height:14px"></div>
          <div class="sk" style="width:min(420px,70%);height:14px"></div>
        </div>
        <div class="sk-plan" aria-hidden="true">${Array.from({ length: 6 }, () => `<div class="sk" style="width:56px;height:56px"></div>`).join("")}</div>
        <div class="sk-stop" aria-hidden="true">
          <div class="sk" style="aspect-ratio:4/3;width:100%"></div>
          <div class="sk-lines"><div class="sk" style="width:48px;height:36px"></div><div class="sk" style="width:80%;height:28px"></div><div class="sk" style="width:55%;height:16px"></div><div class="sk" style="width:40%;height:14px"></div></div>
        </div></div>`;
      adoptKitStyle(this.shadowRoot);
      return;
    }
    if (status === "failed") {
      this.shadowRoot.innerHTML = `${style}<div class="page"><section class="wall state">
        <p class="kicker">Exhibition</p>
        <h1 tabindex="-1">Couldn\x27t load this exhibition</h1>
        <p class="lead">Something went wrong while opening it. Your exhibition is safe; try again in a moment.</p>
        ${this._state.message ? `<p class="small">${esc(this._state.message)}</p>` : ""}
        <div class="actions"><button type="button" class="btn" data-act="retry">Try again</button><a class="btn ghost" href="/exhibitions">My exhibitions</a></div>
      </section></div>`;
      adoptKitStyle(this.shadowRoot);
      return;
    }
    if (status === "signed-out" || status === "not-found") {
      const out = status === "signed-out";
      this.shadowRoot.innerHTML = `${style}<div class="page"><section class="wall state">
        <p class="kicker">Exhibition</p>
        <h1 tabindex="-1">${out ? "A private exhibition" : "Exhibition not found"}</h1>
        <p class="lead">${out ? "Sign in to see this exhibition. Exhibitions are private to their curator." : "This exhibition doesn\x27t exist or isn\x27t yours."}</p>
        ${out ? `<p class="small">Use the Google sign-in at the top of the page.</p>` : ""}
        <div class="actions">${out
          ? `<a class="btn ghost" href="/highlights">Browse highlights</a>`
          : `<a class="btn" href="/exhibitions">My exhibitions</a><a class="btn ghost" href="/highlights">Browse highlights</a>`}</div>
      </section></div>`;
      adoptKitStyle(this.shadowRoot);
      return;
    }
    this.shadowRoot.innerHTML = `${style}<div class="page">
      <header class="wall" id="wall" aria-labelledby="ex-title"></header>
      <div id="rest"></div>
      <p class="sr" id="live" role="status" aria-live="polite"></p></div>`;
    adoptKitStyle(this.shadowRoot);
    this.renderWall();
    this.renderRest();
  }

  renderWall() {
    const wall = this.shadowRoot.getElementById("wall");
    if (!wall) return;
    const { ex } = this._state;
    const n = ex.artworks.length;
    const updated = ago(ex.updatedAt);
    const intro = paras(ex.description);
    let body;
    if (this._mode === "edit") {
      const d = this._draft || { title: unescapeOnce(ex.title), subtitle: unescapeOnce(ex.subtitle), description: unescapeOnce(ex.description) };
      body = `<form novalidate aria-label="Edit exhibition details">
        <div class="field"><label for="f-title">Title <i>(required)</i></label>
          <input id="f-title" name="title" maxlength="${TITLE_MAX}" required value="${esc(d.title)}" autocomplete="off" ${this._formError ? `aria-invalid="true" aria-describedby="f-err"` : ""}></div>
        <div class="field"><label for="f-sub">Subtitle</label>
          <input id="f-sub" name="subtitle" maxlength="${SUBTITLE_MAX}" value="${esc(d.subtitle)}" autocomplete="off"></div>
        <div class="field"><label for="f-desc">Introduction</label>
          <textarea id="f-desc" name="description" maxlength="${DESCRIPTION_MAX}" aria-describedby="f-count">${esc(d.description)}</textarea>
          <span class="count num" id="f-count">${this.countText(d.description)}</span></div>
        ${this._formError ? `<p class="error" id="f-err" role="alert">${esc(this._formError)}</p>` : ""}
        <div class="form-actions">
          <button type="submit" class="btn" ${this._busy ? "disabled" : ""}>${this._busy ? "Saving…" : "Save"}</button>
          <button type="button" class="btn ghost" data-act="cancel" ${this._busy ? "disabled" : ""}>Cancel</button>
        </div></form>`;
    } else {
      const confirm = this._mode === "confirm-delete";
      body = `${ex.subtitle ? `<p class="sub t">${esc(ex.subtitle)}</p>` : ""}
        ${intro.length ? `<hr class="rule" aria-hidden="true"><div class="intro">${intro.map((p) => `<p>${esc(p)}</p>`).join("")}</div>` : ""}
        <p class="meta num">${works(n)}${updated ? `<b aria-hidden="true">·</b>updated ${esc(updated)}` : ""}</p>
        ${confirm
          ? `<div class="confirm" role="group" aria-labelledby="del-q"><p id="del-q">Delete “${esc(ex.title)}” for good?</p>
              <button type="button" class="btn danger" data-act="delete-yes" ${this._busy ? "disabled" : ""}>${this._busy ? "Deleting…" : "Delete"}</button>
              <button type="button" class="btn ghost" data-act="delete-no" ${this._busy ? "disabled" : ""}>Keep it</button></div>
             ${this._formError ? `<p class="error" role="alert" style="margin-top:10px">${esc(this._formError)}</p>` : ""}`
          : `<div class="actions">
              ${n ? `<a class="btn" href="#stop-1" data-stop="1">Begin the walk-through <span aria-hidden="true">↓</span></a>` : ""}
              <button type="button" class="btn ghost" data-act="edit" aria-expanded="false">Edit details</button>
              <button type="button" class="quiet" data-act="delete">Delete exhibition</button></div>
             ${this._saved ? `<p class="saved" role="status">Details saved.</p>` : ""}`}`;
    }
    wall.innerHTML = `<p class="kicker">Exhibition</p><h1 id="ex-title" tabindex="-1">${esc(ex.title)}</h1>${body}`;
  }

  renderRest() {
    const rest = this.shadowRoot.getElementById("rest");
    if (!rest) return;
    const { artworks } = this._state.ex;
    const total = artworks.length;
    if (!total) {
      rest.innerHTML = `<section class="empty" aria-label="Empty gallery">
        <p>This gallery is still empty. Open any artwork and use “Add to exhibition”.</p>
        <div class="actions"><a class="btn" href="/highlights">Browse highlights</a><a class="btn ghost" href="/collections">Explore the collections</a></div></section>`;
      return;
    }
    const plan = artworks.map((a, i) => `<li><a class="thumb" href="#stop-${i + 1}" data-stop="${i + 1}" aria-label="${esc(`${i + 1}. ${a.title || "Untitled"}`)}">
        <span class="mat">${artImg(a.thumbUrl || a.imageUrl, "", a.title || "Untitled")}</span><span class="n num" aria-hidden="true">${i + 1}</span></a></li>`).join("");
    const stops = artworks.map((a, i) => `<li id="stop-${i + 1}" tabindex="-1" data-artwork="${esc(a.id)}">
        <g-exhibition-stop id="work-${esc(a.id)}" exhibition-id="${esc(this._exId)}" artwork-id="${esc(a.id)}" position="${i + 1}" total="${total}" artwork-title="${esc(a.title)}" artist="${esc(a.artist)}" date="${esc(a.date)}" museum="${esc(a.museum)}" image-url="${esc(a.imageUrl)}" image-alt="${esc(a.imageAlt)}" note="${esc(a.note)}"${i < 2 ? ` eager` : ""}></g-exhibition-stop></li>`).join("");
    rest.innerHTML = `<nav class="plan" aria-label="Floor plan"><div class="plan-in"><span class="label">Floor plan</span><ol class="thumbs">${plan}</ol></div></nav>
      <section class="walk" aria-labelledby="walk-h"><h2 class="sr" id="walk-h">The walk-through</h2><ol class="stops">${stops}</ol></section>
      <footer class="end"><p class="kicker">${works(total)}</p><h2>End of the exhibition</h2><p>Thank you for visiting.</p>
        <div class="actions"><a class="btn ghost" href="#top" data-act="top">Back to top</a><a class="btn" href="/highlights">Add more works <span aria-hidden="true">→</span></a></div></footer>`;
    wireImages(rest);
    this.markActive(this._active && this._active <= total ? this._active : 1, false);
    this.observe();
    // A shared link such as /exhibitions/x7Qp2#stop-3 lands on that stop (the fragment lives in our shadow DOM).
    const m = /^#stop-(\d+)$/.exec(location.hash || "");
    if (m && !this._hashDone) { this._hashDone = true; requestAnimationFrame(() => this.jump(Number(m[1]), false)); }
  }

  observe() {
    if (!("IntersectionObserver" in window)) return;
    const items = this.shadowRoot.querySelectorAll(".stops > li");
    this._io = new IntersectionObserver((entries) => {
      const hit = entries.filter((e) => e.isIntersecting).map((e) => e.target)[0];
      if (!hit) return;
      // Read the number from the stop itself: removals renumber the ids, while `items` is a static list.
      const n = Number(String(hit.id).replace("stop-", ""));
      if (n > 0) this.markActive(n, true);
    }, { rootMargin: "-40% 0px -55% 0px" });
    items.forEach((li) => this._io.observe(li));
  }

  markActive(n, follow) {
    this._active = n;
    const links = this.shadowRoot.querySelectorAll(".thumb");
    links.forEach((a, i) => { if (i + 1 === n) a.setAttribute("aria-current", "step"); else a.removeAttribute("aria-current"); });
    const cur = links[n - 1];
    const strip = this.shadowRoot.querySelector(".thumbs");
    if (follow && cur && strip && strip.scrollWidth > strip.clientWidth) {
      const left = cur.parentElement.offsetLeft - strip.offsetLeft - strip.clientWidth / 2 + 28;
      try { strip.scrollTo({ left, behavior: reducedMotion() ? "auto" : "smooth" }); } catch { strip.scrollLeft = left; }
    }
  }

  jump(n, focus = true) {
    const li = this.shadowRoot.getElementById(`stop-${n}`);
    if (!li) return;
    li.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    if (focus) li.focus({ preventScroll: true });
    try { history.replaceState(history.state, "", `#stop-${n}`); } catch { /* sandboxed */ }
    this.markActive(n, true);
  }

  toTop() {
    this.scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
    const h = this.shadowRoot.getElementById("ex-title");
    if (h) h.focus({ preventScroll: true });
    try { history.replaceState(history.state, "", location.pathname + location.search); } catch { /* sandboxed */ }
  }

  countText(value) {
    return `${String(value || "").length.toLocaleString()} / ${DESCRIPTION_MAX.toLocaleString()}`;
  }

  // ---------- interaction ----------
  onClick(e) {
    const stopLink = e.target.closest("a[data-stop]");
    if (stopLink) { e.preventDefault(); this.jump(Number(stopLink.dataset.stop)); return; }
    const el = e.target.closest("[data-act]");
    if (!el || el.hasAttribute("disabled")) return;
    const act = el.dataset.act;
    if (act === "top") { e.preventDefault(); this.toTop(); return; }
    if (act === "retry") {
      // readAction already dropped the failed key; drop it again in case another component re-memoised a failure.
      const [route, body] = READS.exhibition(this._exId);
      componentReads.delete(`${route} ${JSON.stringify(body)}`);
      this._started = false;
      this.load().then(() => this.focusSel("h1"));
      return;
    }
    if (this._busy) return;
    if (act === "edit") {
      const { ex } = this._state;
      this._mode = "edit"; this._formError = ""; this._saved = false;
      // Stored text arrives HTML-escaped: edit the plain text, so untouched fields aren't escaped twice on save.
      this._draft = { title: unescapeOnce(ex.title), subtitle: unescapeOnce(ex.subtitle), description: unescapeOnce(ex.description) };
      this.renderWall();
      this.focusSel("#f-title");
    } else if (act === "cancel") {
      this.closeTo("edit");
    } else if (act === "delete") {
      this._mode = "confirm-delete"; this._formError = ""; this._saved = false;
      this.renderWall();
      this.focusSel("[data-act=delete-no]");
    } else if (act === "delete-no") {
      this.closeTo("delete");
    } else if (act === "delete-yes") {
      this.deleteExhibition();
    }
  }

  onInput(e) {
    if (!this._draft || !e.target.name) return;
    this._draft[e.target.name] = e.target.value;
    if (e.target.name === "description") {
      const c = this.shadowRoot.getElementById("f-count");
      if (c) { c.textContent = this.countText(e.target.value); c.classList.toggle("near", e.target.value.length > DESCRIPTION_MAX - 200); }
    }
    if (e.target.name === "title" && this._formError && e.target.value.trim()) {
      e.target.removeAttribute("aria-invalid");
    }
  }

  onKey(e) {
    if (e.key !== "Escape" || this._busy) return;
    // keydown is composed: Escape inside a g-exhibition-stop (closing its own confirm or note editor)
    // arrives here with the stop as target and must not cancel the title wall's edit.
    if (!this.shadowRoot.getElementById("wall")?.contains(e.target)) return;
    if (this._mode === "edit") { e.preventDefault(); this.closeTo("edit"); }
    else if (this._mode === "confirm-delete") { e.preventDefault(); this.closeTo("delete"); }
  }

  closeTo(act) {
    this._mode = "view"; this._formError = ""; this._draft = null;
    this.renderWall();
    this.focusSel(`[data-act=${act}]`);
  }

  focusSel(sel) {
    const el = this.shadowRoot.querySelector(sel);
    if (el) el.focus();
  }

  announce(text) {
    const live = this.shadowRoot.getElementById("live");
    if (live) { live.textContent = ""; setTimeout(() => { live.textContent = text; }, 30); }
  }

  async save() {
    if (this._mode !== "edit" || this._busy) return;
    const d = this._draft || {};
    const title = String(d.title || "").trim();
    const subtitle = String(d.subtitle || "").trim();
    const description = String(d.description || "").trim();
    if (!title) { this._formError = "Give the exhibition a title."; this.renderWall(); this.focusSel("#f-title"); return; }
    if (title.length > TITLE_MAX || subtitle.length > SUBTITLE_MAX || description.length > DESCRIPTION_MAX) {
      this._formError = "One of the fields is too long."; this.renderWall(); return;
    }
    this._busy = true; this._formError = ""; this.renderWall();
    try {
      // All three strings are always sent, so a cleared subtitle or introduction is saved as empty.
      const ex = this._state.ex;
      const cleared = (!subtitle && !!ex.subtitle) || (!description && !!ex.description);
      await writeAction(...WRITES.update(this._exId, title, subtitle, description));
      Object.assign(ex, { title, subtitle, description, updatedAt: new Date().toISOString() });
      if (cleared) {
        // An emptied field depends on the runner passing "" through; re-read (the write dropped the memo)
        // and show what was actually stored.
        try {
          const res = await readAction(...READS.exhibition(this._exId));
          const kept = { subtitle: field(res, "subtitle") || "", description: field(res, "description") || "" };
          if (kept.subtitle || kept.description) {
            Object.assign(ex, kept);
            if ((kept.subtitle && !subtitle) || (kept.description && !description)) throw new Error("The cleared text was kept. Try saving again.");
          }
        } catch (verifyErr) {
          if (verifyErr?.message === "The cleared text was kept. Try saving again.") throw verifyErr;
          /* re-read failed: keep the optimistic state */
        }
      }
      this._busy = false; this._mode = "view"; this._draft = null; this._saved = true;
      this.renderWall();
      this.focusSel("[data-act=edit]");
    } catch (err) {
      this._busy = false;
      this._formError = needsSignIn(err) ? "Your session ended. Sign in again to save." : (err?.message || "Couldn\x27t save. Try again.");
      this.renderWall();
      this.focusSel("#f-title");
    }
  }

  async deleteExhibition() {
    this._busy = true; this._formError = ""; this.renderWall();
    try {
      await writeAction(...WRITES.delete(this._exId));
      location.assign("/exhibitions");
    } catch (err) {
      this._busy = false;
      this._formError = needsSignIn(err) ? "Your session ended. Sign in again to delete." : (err?.message || "Couldn\x27t delete. Try again.");
      this.renderWall();
      this.focusSel("[data-act=delete-no]");
    }
  }

  onStopChange(e) {
    const d = e.detail || {};
    if (!d.removed || this._state.status !== "ready") return;
    if (d.exhibitionId && d.exhibitionId !== this._exId) return;
    const stop = e.target?.closest?.("g-exhibition-stop") || e.composedPath().find((n) => n.tagName === "G-EXHIBITION-STOP");
    const artworkId = typeof d.removed === "string" ? d.removed : (d.artworkId || stop?.getAttribute("artwork-id"));
    const { ex } = this._state;
    const index = ex.artworks.findIndex((a) => a.id === artworkId);
    if (index < 0) return;
    const [gone] = ex.artworks.splice(index, 1);
    ex.updatedAt = new Date().toISOString();
    const total = ex.artworks.length;
    this.renderWall();
    this.announce(`Removed “${gone.title || "Untitled"}”. ${total ? `${works(total)} remain.` : "The exhibition is now empty."}`);
    if (!total) { this.renderRest(); this.focusSel("#ex-title"); return; }
    // Drop the stop in place (other stops keep their loaded images), then renumber.
    const li = this.shadowRoot.querySelector(`.stops > li[data-artwork="${CSS.escape(artworkId)}"]`);
    if (li) li.remove();
    const planItems = this.shadowRoot.querySelectorAll(".thumbs > li");
    if (planItems[index]) planItems[index].remove();
    this.shadowRoot.querySelectorAll(".stops > li").forEach((item, i) => {
      item.setAttribute("id", `stop-${i + 1}`);
      const s = item.querySelector("g-exhibition-stop");
      if (s) { s.setAttribute("position", String(i + 1)); s.setAttribute("total", String(total)); }
    });
    this.shadowRoot.querySelectorAll(".thumb").forEach((a, i) => {
      a.setAttribute("href", `#stop-${i + 1}`);
      a.dataset.stop = String(i + 1);
      a.setAttribute("aria-label", `${i + 1}. ${ex.artworks[i]?.title || "Untitled"}`);
      const num = a.querySelector(".n");
      if (num) num.textContent = String(i + 1);
    });
    const endKicker = this.shadowRoot.querySelector(".end .kicker");
    if (endKicker) endKicker.textContent = works(total);
    const next = Math.min(index + 1, total);
    this.markActive(next, true);
    const target = this.shadowRoot.getElementById(`stop-${next}`);
    if (target) target.focus({ preventScroll: true });
  }
}
if (!customElements.get("g-exhibition-view")) customElements.define("g-exhibition-view", GExhibitionView);
