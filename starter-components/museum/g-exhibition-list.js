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

const DEFAULT_EMPTY = "You haven\x27t curated anything yet. Start an exhibition, then use “Add to exhibition” on any artwork page.";
const time = (iso) => { const t = Date.parse(iso); return isNaN(t) ? -Infinity : t; };

class GExhibitionList extends HTMLElement {
  static get observedAttributes() { return ["limit", "layout", "empty-text"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
    this._seq = 0;
    this._resize = null;
    this._railUpdate = null;
    this._started = false;
  }
  // Load once. A later reconnect (the element moved in the DOM) keeps the rendered cards and the rail's
  // scroll position, and only re-observes the rail that disconnectedCallback stopped watching.
  connectedCallback() {
    loadFonts();
    if (!this._started) { this._started = true; this.load(); }
    else this.observeRail();
  }
  disconnectedCallback() {
    this._resize?.disconnect();
    this._resize = null;
  }
  // limit, layout and empty-text only change the display: re-render from the data already loaded.
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected && this.shadowRoot.innerHTML) this.render();
  }
  async load() {
    const seq = ++this._seq;
    this._state = { status: "loading" };
    this.render();
    try {
      const res = await readAction(...READS.exhibitions());
      const raw = field(res, "exhibitions") ?? (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      const items = (Array.isArray(raw) ? raw : [])
        .filter((e) => e && typeof e === "object" && e.id)
        .sort((a, b) => time(b.updatedAt) - time(a.updatedAt));
      if (seq !== this._seq) return;
      this._state = { status: "ready", items };
    } catch (err) {
      if (seq !== this._seq) return;
      this._state = needsSignIn(err) ? { status: "signed-out" } : { status: "error", message: err?.message || "Couldn\x27t load your exhibitions." };
    }
    this.render();
  }
  get _layout() { return this.getAttribute("layout") === "rail" ? "rail" : "grid"; }
  get _limit() { const n = parseInt(this.getAttribute("limit") || "", 10); return Number.isFinite(n) && n >= 0 ? n : Infinity; }
  newCard() {
    return `<li class="cell"><a class="new" href="/exhibitions/new">
      <span class="plus" aria-hidden="true">＋</span>
      <span class="t new-title">Curate a new exhibition</span>
      <span class="new-hint">Hang works from the Art Institute of Chicago and The Met on your own wall.</span>
    </a></li>`;
  }
  card(e) {
    return `<li class="cell"><g-exhibition-card exhibition-id="${esc(e.id)}" title="${esc(e.title || "Untitled exhibition")}" subtitle="${esc(e.subtitle)}" artwork-count="${esc(Number(e.artworkCount) || 0)}" image-url="${esc(artSrc(e.coverImageUrl))}" updated-at="${esc(e.updatedAt)}"></g-exhibition-card></li>`;
  }
  skeleton() {
    return `<li class="cell" aria-hidden="true"><div class="skc"><div class="sk mat43"></div><div class="sk line" style="width:72%"></div><div class="sk line thin" style="width:48%"></div></div></li>`;
  }
  list(cells, label) {
    const rail = this._layout === "rail";
    const track = `<ul class="track ${rail ? "rail" : "grid"}" role="list" aria-label="${esc(label)}"${rail ? ` tabindex="-1"` : ""}>${cells}</ul>`;
    if (!rail) return track;
    return `<div class="railwrap">
      <div class="controls" hidden>
        <button type="button" class="nav prev" aria-label="Scroll to previous exhibitions"><span aria-hidden="true">←</span></button>
        <button type="button" class="nav next" aria-label="Scroll to more exhibitions"><span aria-hidden="true">→</span></button>
      </div>${track}</div>`;
  }
  render() {
    const { status, items = [], message } = this._state;
    let body = "";
    if (status === "loading") {
      body = `<div aria-busy="true">${this.list(this.skeleton().repeat(3), "Loading your exhibitions")}<p class="sr" role="status">Loading your exhibitions…</p></div>`;
    } else if (status === "signed-out") {
      body = `<div class="panel" role="note">
        <p class="kicker">Your exhibitions</p>
        <p class="panel-text">Sign in with Google (top right) to curate and keep your own exhibitions.</p>
        <p class="panel-sub">Browse the <a class="link" href="/highlights">highlights</a> or the <a class="link" href="/collections">collections</a> in the meantime.</p>
      </div>`;
    } else if (status === "error") {
      body = `<div class="err" role="alert"><p class="error">${esc(message)}</p><button type="button" class="btn ghost retry">Try again</button></div>`;
    } else if (!items.length) {
      body = `${this.list(this.newCard(), "Your exhibitions")}
        <div class="empty"><p class="empty-text">${esc(this.getAttribute("empty-text") || DEFAULT_EMPTY)}</p>
        <p class="empty-links">Find works in the <a class="link" href="/highlights">highlights</a> or browse the <a class="link" href="/collections">collections</a>.</p></div>`;
    } else {
      const shown = items.slice(0, this._limit);
      const count = shown.length < items.length
      ? `Showing ${shown.length} of ${items.length}`
      : (items.length === 1 ? "1 exhibition" : `${items.length} exhibitions`);
      body = `${this._layout === "grid" ? `<p class="label count num">${esc(count)} · Most recent first</p>` : ""}
        ${this.list(this.newCard() + shown.map((e) => this.card(e)).join(""), "Your exhibitions")}`;
    }
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      :host { min-width: 0; max-width: 100%; }
      .track { list-style: none; margin: 0; padding: 0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(260px, 100%), 1fr)); gap: 24px; align-items: stretch; }
      .rail { display: flex; gap: 24px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; overscroll-behavior-x: contain;
        padding: 4px 4px 14px; margin: -4px -4px 0; scrollbar-width: thin; scrollbar-color: var(--rule) transparent; }
      .rail:focus { outline: none; }
      .rail > .cell { flex: 0 0 240px; scroll-snap-align: start; }
      .cell { display: flex; min-width: 0; }
      .cell > * { flex: 1 1 auto; min-width: 0; }
      .railwrap { position: relative; }
      .controls { display: flex; justify-content: flex-end; gap: 8px; margin: 0 0 12px; }
      .controls[hidden] { display: none; }
      .nav { width: 44px; height: 44px; display: grid; place-items: center; border: 1px solid var(--rule); border-radius: 2px; background: var(--paper);
        color: var(--ink); font: 500 18px/1 var(--sans); cursor: pointer; transition: border-color .2s ease, color .2s ease, background .2s ease; }
      .nav:hover:not([disabled]) { border-color: var(--oxblood); color: var(--oxblood); }
      .nav[disabled] { opacity: .4; cursor: default; }
      .new { display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; min-height: 280px; height: 100%; padding: 28px 24px;
        border: 1.5px dashed var(--rule); border-radius: 2px; background: transparent; color: var(--ink); text-align: center; text-decoration: none;
        transition: border-color .2s ease, background .2s ease, transform .2s ease; }
      .rail .new { min-height: 260px; }
      .new:hover, .new:focus-visible { border-color: var(--oxblood); background: var(--oxblood-tint); transform: translateY(-2px); }
      .plus { display: grid; place-items: center; width: 64px; height: 64px; border-radius: 999px; border: 1px solid var(--gilt);
        color: var(--oxblood); font: 400 34px/1 var(--serif); transition: background .2s ease, color .2s ease; }
      .new:hover .plus, .new:focus-visible .plus { background: var(--oxblood); color: #fff; border-color: var(--oxblood); }
      .new-title { font-size: 20px; line-height: 1.25; }
      .new:hover .new-title, .new:focus-visible .new-title { text-decoration: underline; text-decoration-color: var(--oxblood); text-underline-offset: 4px; text-decoration-thickness: 1px; }
      @media (prefers-reduced-motion: reduce) { .new:hover, .new:focus-visible { transform: none; } }
.new-hint { max-width: 24ch; font-size: 13px; line-height: 1.45; color: var(--soft); }
      .skc { display: grid; gap: 10px; align-content: start; width: 100%; }
      .mat43 { aspect-ratio: 4 / 3; width: 100%; }
      .line { height: 18px; }
      .line.thin { height: 12px; }
      .count { margin: 0 0 16px; }
      .panel { padding: 28px 24px; background: var(--paper); border: 1px solid var(--rule); border-radius: 2px; border-top: 2px solid var(--gilt); max-width: 65ch; }
      .panel p { margin: 0; }
      .panel-text { margin-top: 8px !important; font: 500 22px/1.35 var(--serif); color: var(--ink); }
      .panel-sub { margin-top: 10px !important; color: var(--soft); font-size: 15px; }
      .err { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 16px; padding: 20px 0; }
      .empty { max-width: 65ch; margin-top: 20px; padding-top: 16px; border-top: 1px solid var(--rule); }
      .empty p { margin: 0; }
      .empty-text { font: 400 18px/1.65 var(--serif); color: var(--ink); }
      .empty-links { margin-top: 6px !important; color: var(--soft); font-size: 14px; }
      @media (min-width: 860px) { .rail > .cell { flex-basis: 260px; } }
      /* Phones: the New card becomes one compact row, so the user's own exhibitions start on the first screen. */
      @media (max-width: 559px) {
        .grid .new { display: grid; grid-template-columns: 48px minmax(0, 1fr); align-items: center; column-gap: 16px; row-gap: 2px; min-height: 0; padding: 18px 20px; text-align: left; }
        .grid .plus { grid-row: span 2; width: 48px; height: 48px; font-size: 26px; }
        .grid .new-title { font-size: 19px; }
        .grid .new-hint { max-width: none; }
      }
    </style>${body}`;
    adoptKitStyle(this.shadowRoot);
    this.wire();
  }
  wire() {
    this._resize?.disconnect();
    this._resize = null;
    this._railUpdate = null;
    const root = this.shadowRoot;
    wireImages(root);
    root.querySelector(".retry")?.addEventListener("click", () => this.load());
    const track = root.querySelector(".track.rail");
    const controls = root.querySelector(".controls");
    if (!track || !controls) return;
    const prev = controls.querySelector(".prev");
    const next = controls.querySelector(".next");
    const update = () => {
      const max = track.scrollWidth - track.clientWidth;
      controls.hidden = max <= 4;
      prev.disabled = track.scrollLeft <= 4;
      next.disabled = track.scrollLeft >= max - 4;
    };
    const step = (dir) => {
      const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
      track.scrollBy({ left: dir * Math.max(track.clientWidth * 0.85, 240), behavior: reduce ? "auto" : "smooth" });
    };
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));
    track.addEventListener("scroll", update, { passive: true });
    this._railUpdate = { track, update };
    this.observeRail();
  }
  observeRail() {
    if (!this._railUpdate) return;
    const { track, update } = this._railUpdate;
    this._resize?.disconnect();
    this._resize = "ResizeObserver" in window ? new ResizeObserver(update) : null;
    this._resize?.observe(track);
    requestAnimationFrame(update);
  }
}
if (!customElements.get("g-exhibition-list")) customElements.define("g-exhibition-list", GExhibitionList);
