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

// Field limits match CreateExhibition on the server.
const LIMITS = { title: 120, subtitle: 200, description: 4000 };

// Sign-in state from the page's <google-login>: its shadow root shows a sign-in button only when the
// visitor is signed out (it is empty while loading and when signed in). "out" is certain, anything
// else is treated as "maybe signed in", so the form shows and a 401 on submit settles it.
function loginShowsSignIn() {
  try {
    return !!document.querySelector("google-login")?.shadowRoot?.querySelector(".google-login button");
  } catch { return false; }
}

// What the visitor typed survives a reload (used by the signed-out panel's Try again), per tab only.
const DRAFT_KEY = "g-exhibition-form:draft";
function readDraft() {
  try { const d = JSON.parse(sessionStorage.getItem(DRAFT_KEY) || "null"); return d && typeof d === "object" ? d : null; } catch { return null; }
}
function writeDraft(values) {
  try { if (values) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(values)); else sessionStorage.removeItem(DRAFT_KEY); } catch { /* storage unavailable */ }
}

const FORM_CSS = `
/* The kit's .mat img is height:100% of a grid box sized only by aspect-ratio, which doesn't resolve, so the
   image kept its natural height and the mat cropped it: pin it to the mat so the whole work shows. */
.mat > img { position: absolute; inset: 0; }
.wrap { max-width: 680px; }
form, .panel { margin: 0; background: var(--paper); border: 1px solid var(--rule); border-radius: 2px; padding: 28px; }
@media (max-width: 520px) { form, .panel { padding: 20px 16px; } }
fieldset { margin: 0; padding: 0; border: 0; min-width: 0; display: grid; gap: 24px; }
fieldset[disabled] .field, fieldset[disabled] .open { opacity: .7; }
.head { display: flex; align-items: center; gap: 12px; }
.head::after { content: ""; flex: 1; height: 1px; background: linear-gradient(90deg, var(--gilt), transparent); opacity: .6; }
.field { display: grid; gap: 8px; min-width: 0; }
.row { display: flex; justify-content: space-between; align-items: baseline; gap: 12px; }
.hint { margin: 0; font-size: 13px; color: var(--soft); }
input, textarea { width: 100%; color: var(--ink); background: var(--wall); border: 1px solid var(--rule); border-radius: 2px; transition: border-color .15s ease, background-color .15s ease; }
/* Rules Twind's preflight also sets (button fill, form-control font and padding, placeholder colour)
   are scoped under :host as well, so they win even where adoptKitStyle() can't reorder the sheets. */
:host input::placeholder, :host textarea::placeholder { color: var(--soft); opacity: .75; }
input:hover, textarea:hover { border-color: #cfc6b6; }
input:focus, textarea:focus { background: #fff; border-color: var(--oxblood); }
input.sub { min-height: 44px; padding: 10px 12px; font: 400 16px/1.4 var(--sans); }
input.ttl { min-height: 56px; padding: 6px 0 10px; font: italic 500 28px/1.2 var(--serif); font-optical-sizing: auto; background: transparent; border: 0; border-bottom: 1px solid var(--rule); border-radius: 0; }
input.ttl:hover { border-bottom-color: #cfc6b6; }
input.ttl:focus { background: transparent; border-bottom-color: var(--oxblood); }
input.ttl[aria-invalid="true"] { border-bottom-color: var(--error); }
:host textarea { display: block; min-height: 160px; padding: 12px 14px; font: 400 17px/1.65 var(--serif); resize: vertical; }
.count { font-size: 12px; color: var(--soft); }
.count.near { color: var(--gilt-ink); font-weight: 600; }
.invalid { margin: 0; font-size: 13px; font-weight: 500; color: var(--error); }
.invalid:empty { display: none; }
.open { display: grid; grid-template-columns: 96px minmax(0, 1fr); gap: 16px; align-items: center; padding: 12px; background: var(--wall); border: 1px solid var(--rule); border-radius: 2px; }
.open[hidden] { display: none; }
.open .mat { width: 96px; aspect-ratio: 4 / 5; border-radius: 2px; }
.open .mat .ph { padding: 8%; }
.open .mat .ph i { font-size: 12px; }
.open .mat .ph i:empty, .open .mat .ph span { display: none; }
.open .txt { display: grid; gap: 3px; min-width: 0; }
.open .name { margin: 0; font-size: 20px; line-height: 1.25; overflow-wrap: anywhere; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
.open .who { margin: 0; font: 500 14px/1.4 var(--sans); }
.open .meta { margin: 0; font-size: 12px; color: var(--soft); }
.open .meta b { font-weight: 400; padding: 0 .35em; color: var(--rule); }
.open .sk.l1 { height: 20px; width: 70%; }
.open .sk.l2 { height: 14px; width: 45%; }
.open .sk.l3 { height: 12px; width: 35%; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 8px 20px; padding-top: 4px; }
:host .btn { background: var(--oxblood); color: #fff; }
:host .btn:hover { background: var(--oxblood-deep); border-color: var(--oxblood-deep); }
:host .btn.ghost { background: transparent; color: var(--oxblood); }
:host .btn.ghost:hover { background: var(--oxblood-tint); }
:host .btn[disabled] { opacity: .55; cursor: default; }
.actions .link { display: inline-flex; align-items: center; min-height: 44px; padding: 0 4px; }
.alert { margin: 0; padding: 10px 12px; border-left: 2px solid var(--error); background: #fbeeea; }
.alert:empty { display: none; }
.note { margin: 0; padding-top: 16px; border-top: 1px solid var(--rule); font-size: 12px; color: var(--soft); }
.panel { display: grid; gap: 14px; justify-items: start; }
.panel .msg { margin: 0; max-width: 46ch; font: 400 20px/1.45 var(--serif); }
@media (prefers-reduced-motion: reduce) { input, textarea { transition: none; } }`;

class GExhibitionForm extends HTMLElement {
  static get observedAttributes() { return ["artwork-id"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._auth = "unknown";            // "out" when the visitor is known to be signed out
    this._preview = { status: "none" }; // none | loading | ready | error
    this._values = { title: "", subtitle: "", description: "" };
    const draft = readDraft();
    if (draft) for (const k of Object.keys(this._values)) if (typeof draft[k] === "string") this._values[k] = draft[k];
    if (draft) writeDraft(null);
    this._created = null;               // { id, artworkId } once created but the opening work failed to add
    this._busy = false;
    this._seq = 0;
    this._uid = `xf${Math.random().toString(36).slice(2, 8)}`;
    this._onSession = (e) => {
      const signedIn = e?.detail?.signedIn;
      if (typeof signedIn === "boolean") this.setAuth(signedIn ? "in" : "out");
    };
  }
  connectedCallback() {
    loadFonts();
    window.addEventListener("session-auth-synced", this._onSession);
    if (loginShowsSignIn()) this._auth = "out";
    this.watchLogin();
    this.render();
    this.loadPreview();
  }
  disconnectedCallback() {
    window.removeEventListener("session-auth-synced", this._onSession);
    this._loginObserver?.disconnect();
    this._loginObserver = null;
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue === newValue || !this.isConnected) return;
    this.loadPreview();
  }
  artworkId() {
    const id = (this.getAttribute("artwork-id") || "").trim();
    return isArtworkId(id) ? id : "";
  }
  // Follows the header's <google-login>: its sign-in button appearing means signed out, and the button
  // disappearing after that means the visitor just signed in.
  watchLogin() {
    if (!window.customElements) return;
    customElements.whenDefined("google-login").then(() => {
      if (!this.isConnected || this._loginObserver) return;
      const root = document.querySelector("google-login")?.shadowRoot;
      if (!root) return;
      this._loginObserver = new MutationObserver(() => {
        if (loginShowsSignIn()) this.setAuth("out");
        else if (this._auth === "out") this.setAuth("in");
      });
      this._loginObserver.observe(root, { childList: true, subtree: true });
      if (loginShowsSignIn()) this.setAuth("out");
    }).catch(() => {});
  }
  setAuth(state) {
    const wasOut = this._auth === "out";
    this._auth = state;
    if (wasOut !== (state === "out") && !this._busy) { this.captureValues(); this.render(); }
  }
  async loadPreview() {
    const id = this.artworkId();
    const seq = ++this._seq;
    if (!id) { this._preview = { status: "none" }; this.renderPreview(); return; }
    this._preview = { status: "loading", id };
    this.renderPreview();
    try {
      const res = await readAction(...READS.artwork(id));
      if (seq !== this._seq) return;
      const d = payload(res, "title") || {};
      const title = String(d.title || "").trim();
      if (!title && !artSrc(d.imageUrl)) throw new Error("No preview");
      this._preview = { status: "ready", id, title: title || "Untitled", artist: String(d.artist || ""), date: String(d.date || ""), museum: String(d.museum || ""), imageUrl: d.imageUrl, imageAlt: String(d.imageAlt || "") };
    } catch {
      if (seq !== this._seq) return;
      this._preview = { status: "error", id };
    }
    this.renderPreview();
  }
  previewHtml() {
    const p = this._preview;
    if (p.status === "none") return "";
    const lbl = `<span class="label">Opening with</span>`;
    if (p.status === "loading") {
      return `<div class="mat sk" aria-hidden="true"></div><div class="txt" aria-busy="true">${lbl}<span class="sr">Loading the opening work…</span><span class="sk l1"></span><span class="sk l2"></span><span class="sk l3"></span></div>`;
    }
    if (p.status === "error") {
      return `<div class="mat">${placeholder("")}</div><div class="txt">${lbl}<p class="who">This work will be the first in your exhibition.</p><p class="meta">Its preview couldn\x27t load; it will be added when you create the exhibition, if the museum allows.</p></div>`;
    }
    const alt = p.imageAlt || (p.artist ? `${p.title} by ${p.artist}` : p.title);
    const meta = [p.date, p.museum].filter(Boolean);
    return `<div class="mat">${artImg(p.imageUrl, alt, p.title)}</div>
      <div class="txt">${lbl}
        <p class="name t">${esc(p.title)}</p>
        ${p.artist ? `<p class="who">${esc(p.artist)}</p>` : ""}
        ${meta.length ? `<p class="meta num">${meta.map(esc).join(`<b aria-hidden="true">·</b>`)}</p>` : ""}
      </div>`;
  }
  renderPreview() {
    const box = this.shadowRoot.querySelector(".open");
    if (!box) return;
    const html = this.previewHtml();
    box.hidden = !html;
    box.innerHTML = html;
    wireImages(box);
  }
  captureValues() {
    const form = this.shadowRoot.querySelector("form");
    if (!form) return;
    for (const k of Object.keys(this._values)) this._values[k] = form.elements[k]?.value ?? this._values[k];
  }
  render() {
    const u = this._uid;
    if (this._created) {
      const { id, artworkId } = this._created;
      this.shadowRoot.innerHTML = `<style>${TOKENS}${FORM_CSS}</style>
        <div class="wrap"><section class="panel" aria-labelledby="${u}-k">
          <span class="kicker" id="${u}-k">Exhibition created</span>
          <p class="msg" role="status">Your exhibition is ready, but the opening work couldn\x27t be added. You can add it from its artwork page.</p>
          <div class="actions">
            <a class="btn" href="${esc(exhibitionHref(id))}">Open exhibition</a>
            <a class="link" href="${esc(artworkHref(artworkId))}">Back to the work</a>
          </div>
          <p class="note">Only you can see your exhibitions.</p>
        </section></div>`;
      adoptKitStyle(this.shadowRoot);
      return;
    }
    if (this._auth === "out") {
      const canPrompt = loginShowsSignIn();
      this.shadowRoot.innerHTML = `<style>${TOKENS}${FORM_CSS}</style>
        <div class="wrap"><section class="panel" aria-labelledby="${u}-k">
          <span class="kicker" id="${u}-k">New exhibition</span>
          <p class="msg">${canPrompt ? "Sign in with Google to curate exhibitions." : "Your sign-in needs refreshing. Try again to reload the page; what you typed is kept."}</p>
          <div class="actions">
            ${canPrompt ? `<button type="button" class="btn" data-signin>Sign in with Google</button>` : `<button type="button" class="btn" data-reload>Try again</button>`}
            <a class="link" href="/highlights">Browse highlights</a>
          </div>
          <p class="note">Only you can see your exhibitions.</p>
        </section></div>`;
      adoptKitStyle(this.shadowRoot);
      this.shadowRoot.querySelector("[data-signin]")?.addEventListener("click", () => {
        document.querySelector("google-login")?.shadowRoot?.querySelector(".google-login button")?.click();
      });
      // No sign-in button to press (e.g. an expired session cookie while the Firebase client is still
      // signed in): a reload re-syncs the cookie, and the draft brings the typed text back.
      this.shadowRoot.querySelector("[data-reload]")?.addEventListener("click", () => {
        writeDraft(this._values);
        location.reload();
      });
      return;
    }
    const active = this.shadowRoot.activeElement;
    const focusName = active && active.name;
    const sel = focusName && typeof active.selectionStart === "number" ? [active.selectionStart, active.selectionEnd] : null;
    this.shadowRoot.innerHTML = `<style>${TOKENS}${FORM_CSS}</style>
      <div class="wrap"><form novalidate aria-labelledby="${u}-k">
        <fieldset>
          <div class="head"><span class="kicker" id="${u}-k">New exhibition</span></div>
          <div class="open" hidden></div>
          <div class="field">
            <label class="label" for="${u}-t">Title</label>
            <input class="ttl" id="${u}-t" name="title" type="text" required maxlength="${LIMITS.title}" placeholder="Untitled exhibition" autocomplete="off" aria-describedby="${u}-te">
            <p class="invalid" id="${u}-te"></p>
          </div>
          <div class="field">
            <label class="label" for="${u}-s">Subtitle <span class="sr">(optional)</span></label>
            <input class="sub" id="${u}-s" name="subtitle" type="text" maxlength="${LIMITS.subtitle}" placeholder="Water and light in French painting" autocomplete="off" aria-describedby="${u}-sh">
            <p class="hint" id="${u}-sh">Optional. One line under the title.</p>
          </div>
          <div class="field">
            <div class="row"><label class="label" for="${u}-d">Introduction <span class="sr">(optional)</span></label><span class="count num" id="${u}-c" aria-hidden="true"></span></div>
            <textarea id="${u}-d" name="description" rows="6" maxlength="${LIMITS.description}" placeholder="What ties these works together? Visitors read this on the title wall." aria-describedby="${u}-cs"></textarea>
            <span class="sr" id="${u}-cs">Up to ${LIMITS.description} characters.</span>
          </div>
          <p class="alert error" role="alert"></p>
          <div class="actions">
            <button type="submit" class="btn">Create exhibition</button>
            <a class="link" href="/exhibitions">Cancel</a>
          </div>
        </fieldset>
        <p class="note">Only you can see your exhibitions.</p>
      </form></div>`;
    adoptKitStyle(this.shadowRoot);
    const form = this.shadowRoot.querySelector("form");
    // Values are set as properties, not markup, so what the visitor typed is kept exactly.
    for (const [k, v] of Object.entries(this._values)) form.elements[k].value = v;
    const title = form.elements.title;
    const desc = form.elements.description;
    const count = this.shadowRoot.getElementById(`${u}-c`);
    const updateCount = () => {
      const n = desc.value.length;
      count.textContent = `${n.toLocaleString()} / ${LIMITS.description.toLocaleString()}`;
      count.classList.toggle("near", n >= LIMITS.description * 0.9);
    };
    updateCount();
    desc.addEventListener("input", updateCount);
    title.addEventListener("input", () => { if (title.value.trim()) this.setTitleError(""); });
    form.addEventListener("submit", (e) => { e.preventDefault(); this.submit(); });
    this.renderPreview();
    if (focusName && form.elements[focusName]) {
      const el = form.elements[focusName];
      el.focus();
      if (sel) try { el.setSelectionRange(sel[0], sel[1]); } catch { /* not a text field */ }
    }
  }
  setTitleError(message) {
    const input = this.shadowRoot.querySelector("input.ttl");
    const msg = this.shadowRoot.querySelector(".invalid");
    if (!input || !msg) return;
    if (message) input.setAttribute("aria-invalid", "true"); else input.removeAttribute("aria-invalid");
    msg.textContent = message;
  }
  setBusy(busy, label) {
    this._busy = busy;
    const fs = this.shadowRoot.querySelector("fieldset");
    const btn = this.shadowRoot.querySelector("button[type=submit]");
    if (fs) { fs.disabled = busy; fs.setAttribute("aria-busy", busy ? "true" : "false"); }
    if (btn) btn.textContent = label || "Create exhibition";
  }
  showError(message) {
    const box = this.shadowRoot.querySelector(".alert");
    if (box) box.textContent = message;
  }
  async submit() {
    if (this._busy) return;
    this.captureValues();
    const title = this._values.title.trim();
    const subtitle = this._values.subtitle.trim();
    const description = this._values.description.trim();
    this.showError("");
    if (!title) {
      this.setTitleError("Give your exhibition a title.");
      this.shadowRoot.querySelector("input.ttl")?.focus();
      return;
    }
    this.setTitleError("");
    this.setBusy(true, "Creating…");
    const artworkId = this.artworkId();
    try {
      const res = await writeAction(...WRITES.create(title, subtitle, description));
      const raw = field(res, "id");
      const id = raw === undefined || raw === null ? "" : String(raw).trim();
      writeDraft(null);
      if (id && artworkId) {
        this.setBusy(true, "Adding the first work…");
        // The exhibition exists now, so a failed add must not look like a failed create: say so and
        // offer the exhibition and the work's page instead of landing on an empty exhibition.
        try { await writeAction(...WRITES.add(id, artworkId)); } catch {
          this._busy = false;
          this._created = { id, artworkId };
          this.render();
          return;
        }
      }
      this.setBusy(true, "Opening…");
      location.assign(id ? exhibitionHref(id) : "/exhibitions");
    } catch (err) {
      this.setBusy(false);
      if (needsSignIn(err)) { this.setAuth("out"); return; }
      const detail = err?.message && !/^Couldn\x27t load this\.$/.test(err.message) ? ` ${err.message}` : " Try again.";
      this.showError(`Couldn\x27t create the exhibition.${detail}`);
    }
  }
}
if (!customElements.get("g-exhibition-form")) customElements.define("g-exhibition-form", GExhibitionForm);
