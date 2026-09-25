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

// Initials for the monogram frame shown when there is neither a portrait nor a usable work.
const initials = (name) => {
  const words = String(name || "").split(/[\s\-]+/).filter((w) => /^\p{L}/u.test(w));
  if (!words.length) return "·";
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : "";
  return (first + last).toUpperCase();
};
const safeHttps = (u) => (typeof u === "string" && /^https:\/\//i.test(u) ? u : "");
const lifeYear = (v) => (typeof v === "number" || (typeof v === "string" && /^\d{1,4}$/.test(v.trim())) ? String(v).trim() : "");
const BIO_LINES = 7;

const STYLE = `
  .band { background: var(--paper); border-bottom: 1px solid var(--rule); padding: 28px 16px; }
  .inner { max-width: 1240px; margin: 0 auto; display: grid; gap: 28px; align-items: start; }
  figure { margin: 0; width: min(100%, 260px); }
  .frame { position: relative; aspect-ratio: 3 / 4; border: 1px solid var(--rule); border-radius: 2px; overflow: hidden; background: var(--mat); }
  .frame.mat { display: grid; }
  .frame.mat img { position: absolute; inset: 0; }
  /* The portrait is itself a work (often a print or painting): shown whole, never cropped. The frame keeps
     3:4 while it loads, then takes the image's own proportions. */
  .frame.portrait { background: var(--mat); }
  .frame.portrait:has(img.in) { aspect-ratio: auto; }
  .portrait img { display: block; width: 100%; height: 100%; object-fit: contain; opacity: 0; transition: opacity .25s ease; }
  .portrait img.in { height: auto; max-height: 520px; opacity: 1; }
  .mono { display: grid; place-items: center; }
  .mono::after { content: ""; position: absolute; inset: 12px; border: 1px solid var(--gilt); opacity: .55; pointer-events: none; }
  .mono b { font: 500 64px/1 var(--serif); color: var(--gilt-ink); letter-spacing: .02em; }
  figcaption { margin-top: 10px; display: grid; gap: 4px; }
  figcaption .cap { font-size: 14px; line-height: 1.4; color: var(--soft); }
  figcaption .cap .t { color: var(--ink); font-size: 15px; }
  a.work { display: block; text-decoration: none; border-radius: 2px; }
  a.work .frame { transition: transform .2s ease, box-shadow .2s ease; }
  a.work:hover .frame, a.work:focus-visible .frame { transform: translateY(-2px); box-shadow: inset 0 0 0 1px var(--gilt), 0 8px 18px rgba(29,27,24,.08); }
  a.work:hover .t, a.work:focus-visible .t { text-decoration: underline; text-decoration-color: var(--oxblood); text-underline-offset: 3px; }
  .text { min-width: 0; }
  h1 { margin: 8px 0 0; font: 500 clamp(40px, 6vw, 60px)/1.04 var(--serif); letter-spacing: -.01em; text-wrap: balance; overflow-wrap: anywhere; }
  .desc { margin: 12px 0 0; font-size: 18px; line-height: 1.45; color: var(--soft); max-width: 60ch; }
  .life { margin: 14px 0 0; display: flex; align-items: baseline; gap: 10px; font-size: 15px; }
  .rule { width: 48px; height: 1px; background: var(--gilt); margin: 24px 0; border: 0; }
  .bio { position: relative; max-width: 65ch; font: 400 18px/1.65 var(--serif); }
  .bio p { margin: 0 0 1em; }
  .bio p:last-child { margin-bottom: 0; }
  .bio.clamped { max-height: calc(${BIO_LINES} * 1.65em); overflow: hidden; }
  .bio.clamped.over { -webkit-mask-image: linear-gradient(to bottom, #000 62%, transparent); mask-image: linear-gradient(to bottom, #000 62%, transparent); }
  .more { margin-top: 6px; min-height: 44px; padding: 0 2px; border: 0; background: none; color: var(--oxblood); font: 600 14px/1 var(--sans); cursor: pointer; }
  .more:hover { text-decoration: underline; text-underline-offset: 3px; }
  .more[hidden] { display: none; }
  .src { display: flex; flex-wrap: wrap; align-items: center; gap: 0 10px; margin-top: 14px; }
  .src a { display: inline-flex; align-items: center; min-height: 44px; text-decoration: none; }
  .src a:hover { color: var(--oxblood); text-decoration: underline; text-underline-offset: 3px; }
  .notfound { margin: 16px 0 0; max-width: 55ch; font: 400 18px/1.6 var(--serif); }
  .actions { display: flex; flex-wrap: wrap; gap: 12px; margin-top: 20px; }
  .sk.line { height: 14px; margin-top: 12px; }
  .sk.big { height: 20px; }
  .sk.frame { border-color: transparent; }
  @media (min-width: 760px) {
    .inner { grid-template-columns: 280px minmax(0, 1fr); gap: 40px; }
    figure { width: 100%; }
  }
  @media (min-width: 860px) { .band { padding: 48px 32px; } }`;

class GArtistProfile extends HTMLElement {
  static get observedAttributes() { return ["artist"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
    this._artist = null;
    this._token = 0;
    this._expanded = false;
    this._noPortrait = false;
    this._resize = null;
    this._measure = null;
  }
  connectedCallback() {
    loadFonts();
    // Re-attached after a move: the ResizeObserver was dropped on disconnect, so observe the existing bio again.
    this.observeBio();
    this.load();
  }
  disconnectedCallback() {
    if (this._resize) { this._resize.disconnect(); this._resize = null; }
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this.load();
  }
  async load() {
    const artist = (this.getAttribute("artist") || "").trim();
    // Parsing fires attributeChangedCallback and then connectedCallback: load each name once (errors can retry).
    if (artist === this._artist && this._state.status !== "error") return;
    this._artist = artist;
    this._expanded = false;
    this._noPortrait = false;
    const token = ++this._token;
    if (!artist) { this._state = { status: "empty" }; this.render(); return; }
    this._state = { status: "loading" }; this.render();
    try {
      const res = await readAction(...READS.artist(artist));
      if (token !== this._token) return;
      const works = field(res, "artworks");
      const data = {
        name: String(field(res, "name") || "").trim() || artist,
        description: String(field(res, "description") || "").trim(),
        bio: String(field(res, "bio") || ""),
        born: lifeYear(field(res, "born")),
        died: lifeYear(field(res, "died")),
        portraitUrl: artSrc(field(res, "portraitUrl")),
        wikipediaUrl: safeHttps(field(res, "wikipediaUrl")),
        work: (Array.isArray(works) ? works : []).find((w) => w && artSrc(w.thumbUrl || w.imageUrl)) || null
      };
      const empty = !data.description && !paras(data.bio).length && !data.portraitUrl && !data.work;
      this._state = empty ? { status: "error", notFound: true } : { status: "ready", data };
    } catch (err) {
      if (token !== this._token) return;
      this._state = { status: "error", message: err?.message || "", code: err?.status || 0, signIn: needsSignIn(err) };
    }
    this.render();
  }
  figure(d) {
    if (d.portraitUrl && !this._noPortrait) {
      return `<figure>
        <div class="frame portrait"><img class="pimg" src="${esc(d.portraitUrl)}" alt="${esc(`Portrait of ${d.name}`)}" loading="eager" fetchpriority="high" decoding="async"></div>
        <figcaption><span class="label">Portrait · Wikimedia Commons</span></figcaption>
      </figure>`;
    }
    const w = d.work;
    if (w) {
      const small = artSrc(w.thumbUrl) || artSrc(w.imageUrl);
      const img = artImg(small, w.imageAlt || `${w.title} by ${d.name}`, w.title, { eager: true, large: w.imageUrl, sizes: "(min-width: 760px) 280px, 260px" });
      const caption = `<figcaption><span class="label">A work by the artist</span><span class="cap"><span class="t">${esc(w.title || "Untitled")}</span>${w.date ? `, <span class="num">${esc(w.date)}</span>` : ""}</span></figcaption>`;
      const inner = `<div class="frame mat">${img}</div>${caption}`;
      return `<figure>${isArtworkId(w.id) ? `<a class="work" href="${esc(artworkHref(w.id))}">${inner}</a>` : inner}</figure>`;
    }
    return `<figure><div class="frame mono" role="img" aria-label="${esc(`Monogram for ${d.name}; no portrait available`)}"><b aria-hidden="true">${esc(initials(d.name))}</b></div></figure>`;
  }
  render() {
    const { status } = this._state;
    const artist = this._artist;
    if (this._resize) { this._resize.disconnect(); this._resize = null; }
    if (status === "empty") { this.shadowRoot.innerHTML = `<style>${TOKENS}</style>`; adoptKitStyle(this.shadowRoot); return; }
    let body;
    if (status === "loading") {
      body = `<div class="inner" aria-busy="true">
        <figure><div class="frame sk" aria-hidden="true"></div></figure>
        <div class="text">
          <span class="kicker">Artist</span>
          <h1>${esc(artist)}</h1>
          <div aria-hidden="true">
            <div class="sk line big" style="width: min(360px, 80%); margin-top: 16px"></div>
            <div class="sk line" style="width: 120px"></div>
            <hr class="rule">
            <div class="sk line" style="max-width: 62ch"></div><div class="sk line" style="max-width: 60ch"></div>
            <div class="sk line" style="max-width: 64ch"></div><div class="sk line" style="max-width: 44ch"></div>
          </div>
          <span class="sr" role="status">Loading the artist’s profile…</span>
        </div>
      </div>`;
    } else if (status === "error") {
      const q = artist;
      // Only an explicit not-found (empty result, or a not-found message from the tool) says the artist is
      // unknown; a 401 asks to sign in; every other failure (5xx, network, generic) is transient.
      const msg = this._state.message || "";
      const signIn = !this._state.notFound && (this._state.signIn || this._state.code === 401);
      const notFound = !signIn && (this._state.notFound || /not found|no (wikipedia|artworks?|results)|unknown artist|couldn.t find/i.test(msg));
      const text = signIn ? `Sign in to see the profile of “${esc(artist)}”.`
        : notFound ? `We couldn’t find “${esc(artist)}” in the collections.`
        : `The collections are busy right now, so we couldn’t load “${esc(artist)}”.`;
      body = `<div class="inner">
        <figure><div class="frame mono" aria-hidden="true"><b>${esc(initials(artist))}</b></div></figure>
        <div class="text">
          <span class="kicker">Artist</span>
          <h1>${esc(artist)}</h1>
          <p class="notfound" role="status">${text}</p>
          <div class="actions">
            <a class="btn" href="/search/${encodeURIComponent(q)}">Search the collections for “${esc(q)}”</a>
            <button class="btn ghost" type="button" data-retry>Try again</button>
          </div>
        </div>
      </div>`;
    } else {
      const d = this._state.data;
      // The one-line description often already carries the life dates ("Japanese artist (1760–1849)").
      const life = d.born && d.died && d.description.includes(d.born) && d.description.includes(d.died) ? "" : years(d.born, d.died);
      const ps = paras(d.bio);
      body = `<div class="inner">
        ${this.figure(d)}
        <div class="text">
          <span class="kicker">Artist</span>
          <h1>${esc(d.name)}</h1>
          ${d.description ? `<p class="desc">${esc(d.description)}</p>` : ""}
          ${life ? `<p class="life"><span class="label">Life</span><span class="num">${esc(life)}</span></p>` : ""}
          ${ps.length ? `<hr class="rule">
          <div class="bio ${this._expanded ? "" : "clamped"}" id="bio">${ps.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
          <button class="more" type="button" aria-controls="bio" aria-expanded="${this._expanded}" hidden>${this._expanded ? "Show less" : "Read more"}</button>` : ""}
          ${d.wikipediaUrl ? `<p class="src">
            <a class="label" href="${esc(d.wikipediaUrl)}" target="_blank" rel="noopener">Biography from Wikipedia&nbsp;<span aria-hidden="true">↗</span><span class="sr"> (opens in a new tab)</span></a>
            <span class="label">Text CC BY-SA 4.0</span></p>` : ""}
        </div>
      </div>`;
    }
    this.shadowRoot.innerHTML = `<style>${TOKENS}${STYLE}</style><section class="band" aria-label="${esc(`About ${status === "ready" ? this._state.data.name : artist}`)}">${body}</section>`;
    adoptKitStyle(this.shadowRoot);
    wireImages(this.shadowRoot);
    this.wire();
  }
  observeBio() {
    const bio = this.shadowRoot.querySelector(".bio");
    if (this._resize || !this._measure || !bio || !("ResizeObserver" in window)) return;
    this._resize = new ResizeObserver(this._measure);
    this._resize.observe(bio);
  }
  wire() {
    this._measure = null;
    const root = this.shadowRoot;
    const retry = root.querySelector("[data-retry]");
    if (retry) retry.addEventListener("click", () => { this._artist = null; this.load(); });
    const pimg = root.querySelector("img.pimg");
    if (pimg) {
      const show = () => pimg.classList.add("in");
      // A broken portrait falls back to one of the artist's works, then to the monogram; never a generated image.
      // Ignore errors from an <img> a later render or artist change has already replaced.
      const token = this._token;
      const fail = () => { if (!pimg.isConnected || token !== this._token) return; this._noPortrait = true; this.render(); };
      if (pimg.complete) { if (pimg.naturalWidth) show(); else fail(); }
      else { pimg.addEventListener("load", show, { once: true }); pimg.addEventListener("error", fail, { once: true }); }
    }
    const bio = root.querySelector(".bio");
    const more = root.querySelector(".more");
    if (!bio || !more) return;
    const measure = () => {
      if (this._expanded) { more.removeAttribute("hidden"); return; }
      const over = bio.scrollHeight > bio.clientHeight + 2;
      bio.classList.toggle("over", over);
      if (over) more.removeAttribute("hidden"); else more.setAttribute("hidden", "");
    };
    more.addEventListener("click", () => {
      this._expanded = !this._expanded;
      bio.classList.toggle("clamped", !this._expanded);
      bio.classList.toggle("over", !this._expanded);
      more.setAttribute("aria-expanded", String(this._expanded));
      more.textContent = this._expanded ? "Show less" : "Read more";
      if (!this._expanded) {
        const top = this.getBoundingClientRect().top;
        if (top < 0) this.scrollIntoView({ block: "start" });
      }
      measure();
    });
    measure();
    this._measure = measure;
    this.observeBio();
    if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => { if (bio.isConnected) measure(); });
  }
}
if (!customElements.get("g-artist-profile")) customElements.define("g-artist-profile", GArtistProfile);
