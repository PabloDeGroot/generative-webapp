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

// ---- g-add-to-exhibition ----
const NEW_CHOICE = "__new";
const TITLE_MAX = 120;
const NOTE_MAX = 1000;
const SIGN_IN_HINT = "Sign in with Google (top right) to build your own exhibitions.";
const worksLabel = (n) => `${n} ${n === 1 ? "work" : "works"}`;
// The user's own draft text is escaped as typed (no entity decoding), so "Tom &amp; Jerry" stays literal.
const escDraft = (v) => String(v ?? "").replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));
const isDuplicate = (err) => /already in this exhibition/i.test(err?.message || "");
const STYLES = `
/* The kit's .mat img is height:100% of a grid box sized only by aspect-ratio, which doesn't resolve, so the
   image kept its natural height and the mat cropped it: pin it to the mat so the whole work shows. */
.mat > img { position: absolute; inset: 0; }
.box { display: grid; gap: 10px; }
.toggle { width: 100%; }
.toggle .plus { font-size: 17px; line-height: 1; font-weight: 500; }
.status:empty, .alert:empty { display: none; }
.done-line { margin: 0; font-size: 14px; color: var(--ink); overflow-wrap: anywhere; }
.done-line .tick { color: var(--ok); font-weight: 600; }
.done-line .t { font-size: 16px; }
.done-line .warn { color: var(--gilt-ink); font-weight: 600; }
.panel { background: var(--wall); border: 1px solid var(--rule); border-radius: 2px; padding: 16px; }
.panel[hidden] { display: none; }
form { display: grid; gap: 16px; margin: 0; }
fieldset { border: 0; margin: 0; padding: 0; min-width: 0; }
legend { padding: 0; margin: 0 0 8px; }
.opts { max-height: 240px; overflow-y: auto; overscroll-behavior: contain; border: 1px solid var(--rule); border-radius: 2px; background: var(--paper); }
.opt { display: grid; grid-template-columns: 20px 40px minmax(0, 1fr); align-items: center; gap: 12px; min-height: 56px; padding: 8px 12px; border-top: 1px solid var(--rule); cursor: pointer; transition: background-color .15s ease; }
.opt:first-child { border-top: 0; }
.opt:hover { background: var(--wall); }
.opt.on { background: var(--oxblood-tint); box-shadow: inset 2px 0 0 var(--oxblood); }
.opt.off { cursor: default; }
.opt.off input, .opt.off .cov { opacity: .5; }
.opt.off:hover { background: transparent; }
.opt input { width: 18px; height: 18px; margin: 0; accent-color: var(--oxblood); cursor: inherit; }
.cov { width: 40px; height: 40px; border-radius: 2px; }
.cov img { padding: 8%; filter: drop-shadow(0 2px 4px rgba(29,27,24,.18)); }
.cov.new { background: transparent; box-shadow: inset 0 0 0 1px var(--gilt); color: var(--gilt-ink); font: 400 22px/1 var(--serif); }
.txt { display: grid; gap: 1px; min-width: 0; }
.name { font-size: 16px; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.name.plain { font: 600 14px/1.3 var(--sans); color: var(--oxblood); }
.meta { font-size: 13px; color: var(--soft); }
.meta .in-it { color: var(--ok); font-weight: 600; }
.hint { margin: 0; padding: 12px; font-size: 14px; color: var(--soft); border-bottom: 1px solid var(--rule); }
.hint .t { color: var(--ink); }
.fieldrow { display: grid; gap: 6px; }
.fieldrow[hidden] { display: none; }
.headrow { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; }
.count { font-size: 12px; color: var(--soft); }
.count.near { color: var(--error); }
input[type="text"], textarea { width: 100%; min-height: 44px; padding: 10px 12px; border: 1px solid var(--rule); border-radius: 2px; background: var(--paper); color: var(--ink); font: 400 15px/1.5 var(--sans); }
textarea { resize: vertical; min-height: 88px; font: 400 16px/1.55 var(--serif); }
input[type="text"]:focus, textarea:focus { border-color: var(--oxblood); }
input::placeholder, textarea::placeholder { color: var(--soft); opacity: 1; }
.actions { display: flex; flex-wrap: wrap; gap: 10px; }
.actions .btn[aria-busy="true"] { cursor: progress; opacity: .8; }
.skrow { display: grid; grid-template-columns: 40px minmax(0, 1fr); align-items: center; gap: 12px; min-height: 56px; padding: 8px 12px 8px 44px; border-top: 1px solid var(--rule); }
.skrow:first-child { border-top: 0; }
.skrow .lines { display: grid; gap: 6px; }
.msg { display: grid; gap: 12px; justify-items: start; }
.msg p { margin: 0; font-size: 15px; }
@media (max-width: 420px) {
  .panel { padding: 12px; }
  .actions .btn { flex: 1 1 auto; }
}`;

class GAddToExhibition extends HTMLElement {
  static get observedAttributes() { return ["artwork-id"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._uid = Math.random().toString(36).slice(2, 8);
    this._seq = 0;
    this._resetGen = 0;
    this._reset();
    this.shadowRoot.addEventListener("click", (e) => this._onClick(e));
    this.shadowRoot.addEventListener("change", (e) => this._onChange(e));
    this.shadowRoot.addEventListener("input", (e) => this._onInput(e));
    this.shadowRoot.addEventListener("submit", (e) => { e.preventDefault(); this._save(); });
    this.shadowRoot.addEventListener("keydown", (e) => this._onKey(e));
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue) return;
    this._reset();
    if (this.isConnected) this.render();
  }
  get _artworkId() { return (this.getAttribute("artwork-id") || "").trim(); }
  _reset() {
    this._seq++;
    this._resetGen++; // a save in flight checks this and drops its result after a reset
    this._open = false;
    this._list = { status: "idle", items: [], error: "" }; // idle | loading | ready | error | signin
    this._choice = "";
    this._newTitle = "";
    this._note = "";
    this._saving = false;
    this._pendingNewId = ""; // created by us, but the add failed: retries reuse it
    this._added = new Set();
    this._success = null;
    this._alert = "";
  }
  _$(sel) { return this.shadowRoot.querySelector(sel); }

  // ---- rendering ----
  render() {
    if (!isArtworkId(this._artworkId)) {
      this.shadowRoot.innerHTML = `<style>${TOKENS}</style>`;
      adoptKitStyle(this.shadowRoot);
      return;
    }
    const pid = `p-${this._uid}`;
    this.shadowRoot.innerHTML = `<style>${TOKENS}${STYLES}</style>
      <div class="box">
        <button type="button" class="btn ghost toggle" data-toggle aria-expanded="false" aria-controls="${pid}"></button>
        <div class="status" role="status" data-status></div>
        <div class="panel" id="${pid}" data-panel hidden></div>
      </div>`;
    adoptKitStyle(this.shadowRoot);
    this._renderToggle();
    this._renderStatus();
    this._renderPanel();
  }
  _renderToggle() {
    const btn = this._$("[data-toggle]");
    if (!btn) return;
    btn.setAttribute("aria-expanded", String(this._open));
    btn.innerHTML = `<span class="plus" aria-hidden="true">＋</span><span>${this._success ? "Add to another exhibition" : "Add to exhibition"}</span>`;
  }
  _renderStatus() {
    const box = this._$("[data-status]");
    if (!box) return;
    const s = this._success;
    box.innerHTML = s && s.unsure
      ? `<p class="done-line"><span class="warn" aria-hidden="true">?</span> Couldn\x27t confirm this work was added to <a class="link t" href="${esc(exhibitionHref(s.id))}">${esc(s.title)}</a>. Open it to check.</p>`
      : s
      ? `<p class="done-line"><span class="tick" aria-hidden="true">✓</span> ${s.already ? "Already in" : "Added to"} <a class="link t" href="${esc(exhibitionHref(s.id))}">${esc(s.title)}</a>${s.count ? ` · <span class="num">${esc(worksLabel(s.count))}</span>` : ""}</p>`
      : "";
  }
  _renderPanel() {
    const panel = this._$("[data-panel]");
    if (!panel) return;
    panel.toggleAttribute("hidden", !this._open);
    if (!this._open) { panel.innerHTML = ""; return; }
    const { status, error } = this._list;
    if (status === "loading" || status === "idle") {
      panel.innerHTML = `<div aria-busy="true">
          <p class="label" style="margin:0 0 8px">Your exhibitions</p>
          <div class="opts" aria-hidden="true">${[0, 1, 2].map((i) => `<div class="skrow"><div class="sk" style="width:40px;height:40px"></div><div class="lines"><div class="sk" style="height:14px;width:${[64, 48, 56][i]}%"></div><div class="sk" style="height:10px;width:22%"></div></div></div>`).join("")}</div>
          <span class="sr">Loading your exhibitions…</span>
        </div>`;
      return;
    }
    if (status === "signin") {
      panel.innerHTML = `<div class="msg"><p>${esc(SIGN_IN_HINT)}</p><button type="button" class="btn ghost" data-cancel>Close</button></div>`;
      return;
    }
    if (status === "error") {
      panel.innerHTML = `<div class="msg"><p class="error" role="alert">${esc(error || "Your exhibitions couldn\x27t be loaded.")}</p>
        <div class="actions"><button type="button" class="btn" data-retry>Try again</button><button type="button" class="btn ghost" data-cancel>Close</button></div></div>`;
      return;
    }
    const u = this._uid;
    panel.innerHTML = `<form class="grid" novalidate>
        <fieldset>
          <legend class="label">Choose an exhibition</legend>
          <div class="opts" data-opts></div>
        </fieldset>
        <div class="fieldrow" data-newrow hidden>
          <label class="label" for="t-${u}">Title of the new exhibition</label>
          <input id="t-${u}" type="text" data-title-input maxlength="${TITLE_MAX}" autocomplete="off" placeholder="e.g. The sea at dusk" value="${escDraft(this._newTitle)}">
        </div>
        <div class="fieldrow">
          <div class="headrow"><label class="label" for="n-${u}">Note (optional)</label><span class="count num" id="c-${u}" data-count></span></div>
          <textarea id="n-${u}" data-note rows="3" maxlength="${NOTE_MAX}" aria-describedby="c-${u}" placeholder="Why this work belongs in the show…">${escDraft(this._note)}</textarea>
        </div>
        <p class="error alert" role="alert" data-alert></p>
        <div class="actions">
          <button type="submit" class="btn" data-add>Add</button>
          <button type="button" class="btn ghost" data-cancel>Cancel</button>
        </div>
      </form>`;
    this._renderOptions();
    this._sync();
  }
  _renderOptions() {
    const opts = this._$("[data-opts]");
    if (!opts) return;
    const name = `ex-${this._uid}`;
    const items = this._list.items;
    const rows = items.map((x) => {
      const added = this._added.has(x.id);
      const src = artSrc(x.coverImageUrl);
      const cover = src ? `<img class="cv" src="${esc(src)}" alt="" width="40" height="40" loading="lazy" decoding="async">` : "";
      return `<label class="opt${added ? " off" : ""}${this._choice === x.id ? " on" : ""}">
          <input type="radio" name="${name}" value="${esc(x.id)}"${this._choice === x.id ? " checked" : ""}${added ? " disabled" : ""}>
          <span class="mat cov" aria-hidden="true">${cover}</span>
          <span class="txt"><span class="t name">${esc(x.title)}</span><span class="meta num">${added ? `<span class="in-it">✓ Added</span> · ` : ""}${esc(worksLabel(x.artworkCount))}</span></span>
        </label>`;
    }).join("");
    const empty = items.length ? "" : `<p class="hint">No exhibitions yet. Name your first one and this work will open it.</p>`;
    opts.innerHTML = `${rows}${empty}
      <label class="opt${this._choice === NEW_CHOICE ? " on" : ""}">
        <input type="radio" name="${name}" value="${NEW_CHOICE}"${this._choice === NEW_CHOICE ? " checked" : ""}>
        <span class="mat cov new" aria-hidden="true">+</span>
        <span class="txt"><span class="name plain">New exhibition…</span><span class="meta">Name it and hang this work first</span></span>
      </label>`;
    opts.querySelectorAll("img.cv").forEach((img) => {
      const show = () => img.classList.add("in");
      const fail = () => img.remove(); // an empty mat, never a stand-in picture
      if (img.complete) { if (img.naturalWidth) show(); else fail(); return; }
      img.addEventListener("load", show, { once: true });
      img.addEventListener("error", fail, { once: true });
    });
  }
  // Updates the live form in place (no rebuild), so focus and typed text survive.
  _sync() {
    const form = this._$("form");
    if (!form) return;
    const isNew = this._choice === NEW_CHOICE;
    const newRow = this._$("[data-newrow]");
    const titleInput = this._$("[data-title-input]");
    newRow.toggleAttribute("hidden", !isNew);
    titleInput.toggleAttribute("required", isNew);
    this.shadowRoot.querySelectorAll(".opt").forEach((row) => row.classList.toggle("on", !!row.querySelector("input:checked")));
    const count = this._$("[data-count]");
    const len = this._note.length;
    count.textContent = `${len} / ${NOTE_MAX}`;
    count.classList.toggle("near", len > NOTE_MAX - 50);
    const add = this._$("[data-add]");
    const retry = this._pendingNewId && this._choice === this._pendingNewId;
    add.textContent = this._saving ? "Adding…" : retry ? "Try adding again" : isNew ? "Create and add" : "Add";
    add.disabled = !this._choice;
    add.setAttribute("aria-busy", String(this._saving));
    add.setAttribute("aria-disabled", String(this._saving || !this._choice));
    form.setAttribute("aria-busy", String(this._saving));
    const cancel = this._$("[data-cancel]");
    if (cancel) cancel.disabled = this._saving; // closing mid-save would hide its outcome
    const alert = this._$("[data-alert]");
    if (alert.textContent !== this._alert) alert.textContent = this._alert;
  }

  // ---- behaviour ----
  _openPanel() {
    this._open = true;
    this._alert = "";
    this._renderToggle();
    if (this._list.status === "ready") this._renderPanel();
    this._load();
  }
  _close(focusToggle) {
    this._open = false;
    this._seq++;
    if (this._list.status === "loading") this._list.status = "idle";
    this._renderToggle();
    this._renderPanel();
    if (focusToggle) this._$("[data-toggle]")?.focus();
  }
  // ListExhibitions is fetched only when the panel opens (never on mount), so public pages make no
  // sign-in-only read. It is the same request as g-exhibition-list on the page.
  async _load() {
    const seq = ++this._seq;
    const hadList = this._list.status === "ready";
    if (!hadList) { this._list = { status: "loading", items: [], error: "" }; this._renderPanel(); }
    try {
      const res = await readAction(...READS.exhibitions());
      if (seq !== this._seq || !this._open) return;
      const raw = field(res, "exhibitions");
      const items = (Array.isArray(raw) ? raw : [])
        .filter((x) => x && x.id)
        .map((x) => ({ id: String(x.id), title: String(x.title || "Untitled exhibition"), artworkCount: Math.max(0, Number(x.artworkCount) || 0), coverImageUrl: x.coverImageUrl || null, updatedAt: x.updatedAt || "" }))
        .sort((a, b) => (Date.parse(b.updatedAt) || 0) - (Date.parse(a.updatedAt) || 0));
      this._list = { status: "ready", items, error: "" };
      if (this._choice && this._choice !== NEW_CHOICE && !items.some((x) => x.id === this._choice && !this._added.has(x.id))) this._choice = "";
      if (!items.length) this._choice = NEW_CHOICE;
      if (hadList) this._renderOptions(); else this._renderPanel();
      this._sync();
    } catch (err) {
      if (seq !== this._seq || !this._open) return;
      if (hadList) return; // keep the list we already show
      this._list = { status: needsSignIn(err) ? "signin" : "error", items: [], error: err?.message || "" };
      this._renderPanel();
    }
  }
  async _save() {
    if (this._saving || !this._choice) return;
    const artworkId = this._artworkId;
    if (!isArtworkId(artworkId)) return;
    const gen = this._resetGen;
    const stale = () => gen !== this._resetGen || this._artworkId !== artworkId;
    const note = this._note.trim();
    let exhibitionId = this._choice;
    let title = "";
    if (exhibitionId === NEW_CHOICE) {
      title = this._newTitle.trim();
      if (!title) {
        this._alert = "Give the new exhibition a title.";
        this._sync();
        this._$("[data-title-input]")?.focus();
        return;
      }
    }
    this._saving = true;
    this._alert = "";
    this._sync();
    try {
      if (exhibitionId === NEW_CHOICE) {
        const created = await writeAction(...WRITES.create(title));
        if (stale()) return;
        const id = field(created, "id");
        if (!id) throw new Error("The exhibition couldn\x27t be created. Try again.");
        exhibitionId = String(id);
        title = String(field(created, "title") || title);
        // From here on the exhibition exists: a failed add is retried against it, never re-created.
        this._pendingNewId = exhibitionId;
        this._list.items = [{ id: exhibitionId, title, artworkCount: 0, coverImageUrl: null, updatedAt: new Date().toISOString() }, ...this._list.items.filter((x) => x.id !== exhibitionId)];
        this._choice = exhibitionId;
        this._newTitle = "";
        this._renderOptions();
        this._sync();
      } else {
        title = this._list.items.find((x) => x.id === exhibitionId)?.title || "your exhibition";
      }
      const res = await writeAction(...WRITES.add(exhibitionId, artworkId, note));
      if (stale()) return;
      const item = this._list.items.find((x) => x.id === exhibitionId);
      const before = item ? item.artworkCount : 0;
      const reported = Number(field(res, "artworkCount"));
      // The action runner answers 200 even when its tool call failed (or the work was already there), and
      // then reports a count that didn't grow: don't claim "Added" when nothing shows it was.
      const unsure = Number.isFinite(reported) && field(res, "artworkCount") !== undefined && reported <= before;
      const count = unsure ? before : reported || before + 1;
      if (item) item.artworkCount = count;
      this._finish(exhibitionId, title, count, false, unsure);
      this.dispatchEvent(new CustomEvent("g-exhibition-change", { bubbles: true, composed: true, detail: { exhibitionId, artworkId, artworkCount: count } }));
    } catch (err) {
      if (stale()) return;
      this._saving = false;
      // ListExhibitions carries no membership, so an exhibition may already hold this work: that is
      // what the user wanted, so confirm it instead of reporting a failure.
      if (exhibitionId !== NEW_CHOICE && isDuplicate(err)) {
        const item = this._list.items.find((x) => x.id === exhibitionId);
        this._finish(exhibitionId, title || item?.title || "your exhibition", item ? item.artworkCount : 0, true);
        return;
      }
      const message = err?.message || "That didn\x27t work. Try again.";
      if (needsSignIn(err)) this._alert = SIGN_IN_HINT;
      else if (this._pendingNewId && this._choice === this._pendingNewId) this._alert = `${message} Your new exhibition was saved, so trying again won\x27t create a second one.`;
      else this._alert = message;
      this._sync();
    }
  }
  _finish(exhibitionId, title, count, already, unsure = false) {
    if (!unsure) this._added.add(exhibitionId);
    if (this._pendingNewId === exhibitionId) this._pendingNewId = "";
    this._success = { id: exhibitionId, title, count, already, unsure };
    this._saving = false;
    this._note = "";
    this._choice = "";
    this._list.status = this._list.items.length ? "ready" : "idle";
    // Return focus to the button only if it was inside this control (the user may have moved on).
    const focusInside = !!this.shadowRoot.activeElement;
    this._close(focusInside);
    this._renderStatus();
  }
  _onClick(e) {
    const t = e.target instanceof Element ? e.target : null;
    if (!t) return;
    if (t.closest("[data-toggle]")) { if (this._saving) return; if (this._open) this._close(false); else this._openPanel(); return; }
    if (t.closest("[data-cancel]")) { if (!this._saving) this._close(true); return; }
    if (t.closest("[data-retry]")) { this._list.status = "idle"; this._load(); }
  }
  _onChange(e) {
    const t = e.target;
    if (t instanceof HTMLInputElement && t.type === "radio") {
      this._choice = t.value;
      this._alert = "";
      this._sync();
    }
  }
  _onInput(e) {
    const t = e.target;
    if (!(t instanceof Element)) return;
    if (t.matches("[data-note]")) { this._note = t.value.slice(0, NOTE_MAX); this._sync(); }
    else if (t.matches("[data-title-input]")) { this._newTitle = t.value.slice(0, TITLE_MAX); if (this._alert) { this._alert = ""; this._sync(); } }
  }
  _onKey(e) {
    if (e.key === "Escape" && this._open && !this._saving) {
      e.preventDefault();
      e.stopPropagation();
      this._close(true);
    }
  }
}

if (!customElements.get("g-add-to-exhibition")) customElements.define("g-add-to-exhibition", GAddToExhibition);
