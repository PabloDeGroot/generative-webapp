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

// ---- g-artwork-grid -------------------------------------------------------------------------------
// Attributes that pick the data (changing one reloads) and ones that only change the display.
const GRID_SOURCE_ATTRS = ["search", "museum", "artist", "collection", "theme", "more-by-artist-of"];
const GRID_DISPLAY_ATTRS = ["limit", "layout", "min-width", "empty-text"];
const str = (v) => (typeof v === "string" ? v : typeof v === "number" ? String(v) : "");
// Tool results as a clean list: plain objects with an id, first occurrence of each id only.
function cleanWorks(list) {
  const seen = new Set();
  const out = [];
  for (const w of Array.isArray(list) ? list : []) {
    const id = w && typeof w === "object" ? str(w.id).trim() : "";
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, title: str(w.title) || "Untitled", artist: str(w.artist), date: str(w.date), museum: str(w.museum), imageUrl: artSrc(w.imageUrl), thumbUrl: artSrc(w.thumbUrl), imageAlt: str(w.imageAlt) });
  }
  return out;
}
// A theme counts as "found" only if at least one highlight carries a real image; g-feature-hero uses
// the same test before it falls back to READS.search(theme).
const hasRealImage = (works) => works.some((w) => w.thumbUrl || w.imageUrl);
const quoted = (s) => `“${s}”`;

class GArtworkGrid extends HTMLElement {
  static get observedAttributes() { return [...GRID_SOURCE_ATTRS, ...GRID_DISPLAY_ATTRS]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
    this._seq = 0;
    this._started = false;
    this._reloadQueued = false;
    this._collapsed = false;
    this._resizeObserver = null;
    this.shadowRoot.addEventListener("click", (e) => this.onClick(e));
  }
  connectedCallback() {
    loadFonts();
    if (!this._started) { this._started = true; this.load(); }
    // Moved or re-inserted: disconnectedCallback dropped the rail's ResizeObserver, so rewire it.
    else if (this._state.status === "ready" && this.isRail() && !this._resizeObserver) this.wireRail();
  }
  disconnectedCallback() {
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._started || oldValue === newValue) return;
    if (GRID_SOURCE_ATTRS.includes(name)) {
      // Several attributes may change in one go: reload once.
      if (this._reloadQueued) return;
      this._reloadQueued = true;
      queueMicrotask(() => { this._reloadQueued = false; this.load(); });
    } else {
      this.render();
    }
  }

  // Exactly one source, by precedence more-by-artist-of > search > artist > collection > theme > highlights.
  source() {
    const attr = (n) => (this.getAttribute(n) || "").trim();
    if (this.hasAttribute("more-by-artist-of")) return { kind: "more", value: attr("more-by-artist-of") };
    if (this.hasAttribute("search")) return { kind: "search", value: attr("search"), museum: attr("museum").toLowerCase() };
    if (this.hasAttribute("artist")) return { kind: "artist", value: attr("artist") };
    if (this.hasAttribute("collection")) return { kind: "collection", value: attr("collection") };
    if (this.hasAttribute("theme")) return { kind: "theme", value: attr("theme").replace(/\s+/g, " ") }; // same normalisation as g-feature-hero
    return { kind: "highlights", value: "" };
  }

  async load() {
    const seq = ++this._seq;
    const src = this.source();
    this._source = src;
    // Invalid input never reaches the runner.
    const invalid = src.kind === "more" && !isArtworkId(src.value) ? "This artwork id isn’t valid, so related works can’t be shown."
      : src.kind === "search" && !src.value ? "Type something to search the collections."
      : src.kind === "artist" && !src.value ? "No artist was chosen."
      : src.kind === "collection" && !src.value ? "No collection was chosen."
      : src.kind === "theme" && !src.value ? "No theme was chosen."
      : "";
    if (invalid) { this._state = { status: "error", message: invalid, retry: false, signIn: false }; this.render(); return; }

    this._state = { status: "loading" }; this.render();
    try {
      let works = [];
      let total = null;
      let fallback = false;
      if (src.kind === "more") {
        works = cleanWorks(field(await readAction(...READS.artwork(src.value)), "moreByArtist")).filter((w) => w.id !== src.value);
      } else if (src.kind === "search") {
        const res = await readAction(...READS.search(src.value, src.museum));
        works = cleanWorks(field(res, "artworks"));
        const t = Number(field(res, "total"));
        total = Number.isFinite(t) ? t : null;
      } else if (src.kind === "artist") {
        works = cleanWorks(field(await readAction(...READS.artist(src.value)), "artworks"));
      } else if (src.kind === "collection") {
        works = cleanWorks(field(await readAction(...READS.collection(src.value)), "artworks"));
      } else if (src.kind === "theme") {
        try { works = cleanWorks(field(await readAction(...READS.highlights(src.value)), "artworks")); } catch { works = []; }
        if (!hasRealImage(works)) {
          // Same body as g-feature-hero's fallback and as a g-artwork-grid search="<theme>" on this page.
          const res = await readAction(...READS.search(src.value));
          works = cleanWorks(field(res, "artworks"));
          const t = Number(field(res, "total"));
          total = Number.isFinite(t) ? t : null;
          fallback = true;
        }
      } else {
        works = cleanWorks(field(await readAction(...READS.highlights()), "artworks"));
      }
      if (seq !== this._seq) return;
      this._state = { status: "ready", works, total, fallback };
    } catch (err) {
      if (seq !== this._seq) return;
      this._state = { status: "error", message: (err && err.message) || "Couldn’t load these works.", retry: true, signIn: needsSignIn(err) };
    }
    this.render();
  }

  limit() {
    const n = parseInt(this.getAttribute("limit") || "", 10);
    return Number.isFinite(n) && n > 0 ? n : Infinity;
  }
  isRail() { return (this.getAttribute("layout") || "").trim().toLowerCase() === "rail"; }
  minWidth() {
    const n = parseInt(this.getAttribute("min-width") || "", 10);
    return Number.isFinite(n) && n >= 120 && n <= 600 ? n : 200;
  }
  listLabel() {
    const src = this._source || this.source();
    if (src.kind === "more") return "More works by this artist";
    if (src.kind === "search") return `Search results for ${quoted(src.value)}`;
    if (src.kind === "artist") return `Works by ${src.value}`;
    if (src.kind === "collection") return "Works in this collection";
    if (src.kind === "theme") return this._state.fallback ? `Search results for ${quoted(src.value)}` : `Highlights: ${src.value}`;
    return "Museum highlights";
  }
  emptyMessage() {
    const custom = this.getAttribute("empty-text");
    if (custom) return custom;
    const src = this._source || this.source();
    if (src.kind === "search") return `No works with images match ${quoted(src.value)}. Try an artist, a movement or a single word.`;
    if (src.kind === "artist") return `No works by ${src.value} with public images turned up in these collections.`;
    if (src.kind === "collection") return "This collection has no works with public images to show right now.";
    if (src.kind === "theme") return `Nothing in the collections matches ${quoted(src.value)} yet. Try a broader subject.`;
    return "The highlights couldn’t be gathered just now. Browse the collections instead.";
  }

  // Hide this list and its enclosing section (never via this.hidden), or undo that when works arrive.
  setCollapsed(on) {
    if (on === this._collapsed) return;
    this._collapsed = on;
    const section = this.closest("g-page-section");
    if (on) { section?.setAttribute("hidden", ""); this.setAttribute("hidden", ""); }
    else { section?.removeAttribute("hidden"); this.removeAttribute("hidden"); }
  }

  card(w, rail) {
    // The runner sometimes returns non-breaking spaces/hyphens, which stop long titles wrapping in a card.
    const t = (v) => esc(String(v ?? "").replace(/[\u00a0\u202f]|&nbsp;|&#160;/g, " ").replace(/\u2011/g, "-"));
    return `<g-artwork-card artwork-id="${esc(w.id)}" artwork-title="${t(w.title)}" artist="${t(w.artist)}" date="${t(w.date)}" museum="${t(w.museum)}" image-url="${esc(w.thumbUrl || w.imageUrl)}" image-large-url="${esc(w.imageUrl)}" image-alt="${t(w.imageAlt || (w.artist ? `${w.title} by ${w.artist}` : w.title))}"${rail ? ` size="small"` : ""}></g-artwork-card>`;
  }
  skeleton() {
    return `<div class="skc" aria-hidden="true"><div class="sk frame"></div><div class="sk bar"></div><div class="sk bar short"></div></div>`;
  }

  render() {
    const root = this.shadowRoot;
    const { status } = this._state;
    const rail = this.isRail();
    const limit = this.limit();
    const src = this._source || this.source();
    const works = status === "ready" ? this._state.works.slice(0, limit) : [];
    // more-by-artist-of is a supplementary band: g-artwork-view already reports a failed GetArtwork (same
    // request), so an error collapses it too, unless the visitor has to sign in.
    const collapse = (status === "ready" && !works.length && (rail || src.kind === "more"))
      || (status === "error" && src.kind === "more" && !this._state.signIn);
    this.setCollapsed(collapse);
    if (this._resizeObserver) { this._resizeObserver.disconnect(); this._resizeObserver = null; }
    if (collapse) { root.innerHTML = ""; return; }

    const style = `<style>${TOKENS}
      :host { min-width: 0; max-width: 100%; }
      .wrap { position: relative; }
      ul { list-style: none; margin: 0; padding: 0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(var(--min, 200px), 100%), 1fr)); gap: 32px 20px; }
      .grid > li { min-width: 0; }
      /* Phones: two columns, so a landscape work isn't a thin strip in a tall, mostly empty mat. */
      @media (max-width: 559px) { .grid.pair { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 14px; } }
      .meta { margin: 0 0 16px; font-size: 13px; color: var(--soft); }
      .meta b { color: var(--ink); font-weight: 600; }
      .rail { overflow-x: auto; overscroll-behavior-x: contain; scroll-snap-type: x mandatory; scroll-behavior: smooth; scrollbar-width: thin; scrollbar-color: var(--rule) transparent; padding: 4px 2px 14px; margin: -4px -2px 0; }
      .rail:focus-visible { outline-offset: 4px; }
      .track { display: grid; grid-auto-flow: column; grid-auto-columns: 180px; gap: 14px; width: max-content; }
      .track > li { scroll-snap-align: start; min-width: 0; }
      .arrow { position: absolute; top: 90px; z-index: 1; width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--rule); border-radius: 999px; background: var(--paper); color: var(--oxblood); cursor: pointer; box-shadow: 0 2px 10px rgba(29,27,24,.14); transition: opacity .2s ease, background .2s ease; }
      .arrow:hover { background: var(--oxblood-tint); border-color: var(--oxblood); }
      .arrow[hidden] { display: none; }
      .arrow[aria-disabled="true"] { opacity: .35; cursor: default; }
      .arrow[aria-disabled="true"]:hover { background: var(--paper); border-color: var(--rule); }
      .arrow.prev { left: -6px; } .arrow.next { right: -6px; }
      .arrow svg { width: 18px; height: 18px; }
      /* At either end the arrow fades out over the art (it keeps focus if it has it); touch screens swipe. */
      .arrow[aria-disabled="true"]:not(:focus-visible) { opacity: 0; pointer-events: none; }
      @media (hover: none), (max-width: 600px) { .arrow { display: none; } }
      .skc { display: grid; gap: 10px; }
      .sk.frame { aspect-ratio: 4 / 5; }
      .sk.bar { height: 14px; width: 80%; } .sk.bar.short { width: 55%; height: 11px; }
      .empty { max-width: 65ch; padding: 28px 0; border-top: 1px solid var(--rule); }
      .empty p { margin: 0 0 12px; font: italic 400 18px/1.55 var(--serif); color: var(--soft); }
      .empty nav { display: flex; flex-wrap: wrap; gap: 8px 24px; font-size: 14px; }
      .empty .link, .err .link { display: inline-flex; align-items: center; min-height: 44px; }
      .err { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; padding: 20px 0; border-top: 1px solid var(--rule); }
      /* Phones: two works per row, as a gallery wall, rather than one screen-tall card each. */
      @media (max-width: 559px) { .grid { grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 28px 12px; } }
    </style>`;

    if (status === "loading") {
      const n = Math.min(Number.isFinite(limit) ? limit : 8, 8);
      const cards = Array.from({ length: n }, () => `<li>${this.skeleton()}</li>`).join("");
      root.innerHTML = `${style}<div class="wrap" aria-busy="true"><span class="sr" role="status">Loading works…</span>${rail
        ? `<div class="rail"><ul class="track" role="list">${cards}</ul></div>`
        : `<ul class="grid${this.minWidth() < 280 ? " pair" : ""}" role="list" style="--min:${this.minWidth()}px">${cards}</ul>`}</div>`;
      adoptKitStyle(root);
      return;
    }

    if (status === "error") {
      root.innerHTML = `${style}<div class="err" role="alert"><p class="error">${esc(this._state.message)}</p>${this._state.retry
        ? `<button type="button" class="btn ghost" data-act="retry">Try again</button>`
        : `<a class="link" href="/highlights">Browse the highlights</a>`}</div>`;
      adoptKitStyle(root);
      return;
    }

    if (!works.length) {
      root.innerHTML = `${style}<div class="empty" role="status"><p>${esc(this.emptyMessage())}</p><nav aria-label="Other ways in"><a class="link" href="/highlights">Browse the highlights →</a><a class="link" href="/collections">Explore the collections →</a></nav></div>`;
      adoptKitStyle(root);
      return;
    }

    // Count line: search results, and themes that fell back to search.
    let meta = "";
    if (src.kind === "search" || (src.kind === "theme" && this._state.fallback)) {
      const total = this._state.total;
      const shown = works.length;
      const count = total && total > shown
        ? `Showing <b class="num">${shown.toLocaleString()}</b> of <span class="num">${total.toLocaleString()}</span> works`
        : `<b class="num">${shown.toLocaleString()}</b> ${shown === 1 ? "work" : "works"}`;
      meta = src.kind === "theme"
        ? `<p class="meta">Search results for ${esc(quoted(src.value))} · ${count}</p>`
        : `<p class="meta" aria-live="polite">${count}</p>`;
    }
    const items = works.map((w) => `<li>${this.card(w, rail)}</li>`).join("");
    const label = esc(this.listLabel());
    const chevron = (d) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="${d}"/></svg>`;
    root.innerHTML = `${style}${meta}${rail
      ? `<div class="wrap">
          <button type="button" class="arrow prev" data-act="prev" aria-label="Scroll left" hidden>${chevron("M15 6l-6 6 6 6")}</button>
          <div class="rail" role="region" aria-label="${label}" tabindex="0"><ul class="track" role="list">${items}</ul></div>
          <button type="button" class="arrow next" data-act="next" aria-label="Scroll right" hidden>${chevron("M9 6l6 6-6 6")}</button>
        </div>`
      : `<ul class="grid${this.minWidth() < 280 ? " pair" : ""}" role="list" aria-label="${label}" style="--min:${this.minWidth()}px">${items}</ul>`}`;
    adoptKitStyle(root);
    wireImages(root);
    if (rail) this.wireRail();
  }

  wireRail() {
    const scroller = this.shadowRoot.querySelector(".rail");
    const prev = this.shadowRoot.querySelector(".arrow.prev");
    const next = this.shadowRoot.querySelector(".arrow.next");
    if (!scroller || !prev || !next) return;
    const update = () => {
      const max = scroller.scrollWidth - scroller.clientWidth;
      const scrollable = max > 4;
      prev.hidden = !scrollable; next.hidden = !scrollable;
      // aria-disabled, not disabled, so a focused arrow keeps focus at the end of the rail.
      prev.setAttribute("aria-disabled", String(scroller.scrollLeft <= 4));
      next.setAttribute("aria-disabled", String(scroller.scrollLeft >= max - 4));
    };
    if (!scroller._railWired) { scroller._railWired = true; scroller.addEventListener("scroll", update, { passive: true }); }
    if (typeof ResizeObserver === "function") {
      this._resizeObserver = new ResizeObserver(update);
      this._resizeObserver.observe(scroller);
    }
    requestAnimationFrame(update);
  }

  onClick(e) {
    const btn = e.target.closest && e.target.closest("[data-act]");
    if (!btn) return;
    const act = btn.dataset.act;
    if (act === "retry") { this.load(); return; }
    if (btn.getAttribute("aria-disabled") === "true") return;
    const scroller = this.shadowRoot.querySelector(".rail");
    if (!scroller) return;
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const dx = Math.round(scroller.clientWidth * 0.8) * (act === "prev" ? -1 : 1);
    scroller.scrollBy({ left: dx, behavior: reduce ? "auto" : "smooth" });
  }
}
if (!customElements.get("g-artwork-grid")) customElements.define("g-artwork-grid", GArtworkGrid);
