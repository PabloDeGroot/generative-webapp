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

// g-collection-list: the museums' departments as g-collection-tile cards. Always reads both museums
// (READS.collections), so every instance on every page shares one request; museum, exclude, limit and
// layout only change what is shown.
const MUSEUMS = { aic: "Art Institute of Chicago", met: "The Met" };
const museumKey = (id) => (/^met-/i.test(String(id)) ? "met" : /^aic-/i.test(String(id)) ? "aic" : "");
const sortName = (name) => String(name || "").replace(/^the\s+/i, "");
const byName = (a, b) => sortName(a.name).localeCompare(sortName(b.name), undefined, { sensitivity: "base" });
const reducedMotion = () => window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

class GCollectionList extends HTMLElement {
  static get observedAttributes() { return ["museum", "exclude", "limit", "layout"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
    this._departments = [];
    this._frame = 0;
    this._resize = null;
    this._collapsed = false;
  }
  connectedCallback() {
    loadFonts();
    if (this._state.status !== "ready") this.load();
    else this.render();
  }
  disconnectedCallback() {
    this._resize?.disconnect();
    this._resize = null;
    cancelAnimationFrame(this._frame);
  }
  // Every observed prop is a display option applied to data already loaded, so no refetch is needed.
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this.render();
  }
  // aic or met; any other value means both. With no museum attribute, a single excluded id picks its
  // own museum (exclude="met-11" alone shows more of The Met's collections).
  get _museum() {
    const m = String(this.getAttribute("museum") || "").trim().toLowerCase();
    if (m) return m === "aic" || m === "met" ? m : "both";
    const ex = [...this._exclude];
    return ex.length === 1 ? museumKey(ex[0]) || "both" : "both";
  }
  get _limit() {
    const n = parseInt(this.getAttribute("limit") || "", 10);
    return Number.isFinite(n) && n > 0 ? n : 0;
  }
  get _rail() { return String(this.getAttribute("layout") || "").trim().toLowerCase() === "rail"; }
  get _exclude() {
    return new Set(String(this.getAttribute("exclude") || "").split(/[\s,]+/).map((s) => s.trim().toLowerCase()).filter(Boolean));
  }
  async load(retry = false) {
    this._state = { status: "loading" };
    this.render();
    try {
      const [route, body] = READS.collections();
      // Try again drops this page's memo of an incomplete answer so the request really goes out.
      if (retry) componentReads.delete(`${route} ${JSON.stringify(body)}`);
      const res = await readAction(route, body);
      const raw = field(res, "departments") ?? (Array.isArray(res?.data) ? res.data : Array.isArray(res) ? res : []);
      const seen = new Set();
      this._departments = (Array.isArray(raw) ? raw : []).map((d) => {
        const id = String(d?.id ?? "").trim();
        const key = museumKey(id);
        if (!key || !d?.name || seen.has(id.toLowerCase())) return null;
        seen.add(id.toLowerCase());
        return { id, key, name: String(d.name), museum: String(d.museum || MUSEUMS[key]), cover: artSrc(d.coverImageUrl) };
      }).filter(Boolean);
      this._state = { status: "ready" };
    } catch (err) {
      this._state = { status: "error", message: err?.message || "Couldn\x27t load the collections." };
    }
    if (this.isConnected) this.render();
  }
  // Returns { groups: [{ key, items }], missing: [keys] } when grouped by museum, else { items, missing }.
  // missing lists the requested museums with no departments at all (before exclude): the tool answers
  // with one museum only when the other's API is failing, so that is a load failure, not an empty list.
  view() {
    const museum = this._museum, limit = this._limit, rail = this._rail, exclude = this._exclude;
    const missing = (museum === "both" ? ["aic", "met"] : [museum]).filter((key) => !this._departments.some((d) => d.key === key));
    const pool = this._departments.filter((d) => !exclude.has(d.id.toLowerCase()) && (museum === "both" || d.key === museum));
    if (museum === "both" && !limit && !rail) {
      return { missing, groups: ["aic", "met"].map((key) => ({ key, items: pool.filter((d) => d.key === key).sort(byName) })).filter((g) => g.items.length) };
    }
    // Teasers (limit or rail) lead with collections that have a real cover work.
    const order = (list) => (limit || rail ? list.sort((a, b) => (a.cover ? 0 : 1) - (b.cover ? 0 : 1) || byName(a, b)) : list.sort(byName));
    let items;
    if (museum === "both") {
      const a = order(pool.filter((d) => d.key === "aic")), m = order(pool.filter((d) => d.key === "met"));
      items = [];
      for (let i = 0; i < Math.max(a.length, m.length); i++) {
        if (a[i]) items.push(a[i]);
        if (m[i]) items.push(m[i]);
      }
    } else {
      items = order(pool);
    }
    return { missing, items: limit ? items.slice(0, limit) : items };
  }
  tile(d) {
    return `<g-collection-tile collection-id="${esc(d.id)}" name="${esc(d.name)}" museum="${esc(d.museum)}" image-url="${esc(d.cover)}"></g-collection-tile>`;
  }
  // Teasers with nothing to show hide themselves and their g-page-section (never via this.hidden),
  // and come back if an attribute change gives them tiles again.
  setCollapsed(on) {
    if (on === this._collapsed) return;
    this._collapsed = on;
    const section = this.closest("g-page-section");
    if (on) { section?.setAttribute("hidden", ""); this.setAttribute("hidden", ""); }
    else { section?.removeAttribute("hidden"); this.removeAttribute("hidden"); }
  }
  skeletons(count) {
    return Array.from({ length: count }, () => `<div class="skel" aria-hidden="true"><div class="sk frame"></div><div class="sk line"></div><div class="sk line short"></div></div>`).join("");
  }
  rail(inner, label) {
    return `<div class="rail-wrap">
      <div class="rail" part="rail" role="group" aria-label="${esc(label)}">${inner}</div>
      <div class="controls" hidden>
        <span class="track" aria-hidden="true"><span class="thumb"></span></span>
        <button type="button" class="nav prev" aria-label="Previous collections"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M12.5 4.5 7 10l5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
        <button type="button" class="nav next" aria-label="More collections"><svg viewBox="0 0 20 20" width="18" height="18" aria-hidden="true"><path d="M7.5 4.5 13 10l-5.5 5.5" fill="none" stroke="currentColor" stroke-width="1.6"/></svg></button>
      </div>
    </div>`;
  }
  render() {
    const { status, message } = this._state;
    const rail = this._rail, teaser = rail || this._limit > 0;
    const retryButton = `<button type="button" class="btn ghost retry">Try again</button>`;
    let body, collapse = false;
    if (status === "loading") {
      const sk = this.skeletons(rail ? 6 : Math.min(this._limit || 6, 6));
      body = `<p class="sr" role="status">Loading collections…</p>${rail ? this.rail(sk, "Loading collections") : `<div class="grid">${sk}</div>`}`;
    } else if (status === "error") {
      body = `<div class="state" role="alert"><p class="error">${esc(message)}</p>${retryButton}</div>`;
    } else {
      const v = this.view();
      const count = v.groups ? v.groups.reduce((n, g) => n + g.items.length, 0) : v.items.length;
      const failed = v.missing.map((key) => MUSEUMS[key]).join(" and ");
      if (!count && teaser) {
        // A teaser (rail or limit) with nothing to show, or only a failed museum, leaves the page.
        collapse = true;
        body = "";
      } else if (!count && v.missing.length) {
        body = `<div class="state" role="alert"><p class="error">Couldn\x27t load the collections of ${esc(failed)} right now.</p>${retryButton}</div>`;
      } else if (!count) {
        body = `<div class="state"><p class="empty t">No collections available right now.</p></div>`;
      } else if (v.groups) {
        // Full grouped view with one museum failing: show the other, and say what is missing.
        const note = v.missing.length ? `<div class="state partial" role="alert"><p class="error">Couldn\x27t load the collections of ${esc(failed)} right now.</p>${retryButton}</div>` : "";
        body = v.groups.map((g) => `<section class="group" aria-labelledby="h-${g.key}">
          <div class="group-head"><h3 class="kicker" id="h-${g.key}">${esc(MUSEUMS[g.key])}</h3><span class="rule" aria-hidden="true"></span><span class="label num">${g.items.length} ${g.items.length === 1 ? "collection" : "collections"}</span></div>
          <div class="grid">${g.items.map((d) => this.tile(d)).join("")}</div>
        </section>`).join("") + note;
      } else if (rail) {
        body = this.rail(v.items.map((d) => this.tile(d)).join(""), "Collections");
      } else {
        body = `<div class="grid">${v.items.map((d) => this.tile(d)).join("")}</div>`;
      }
    }
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      /* A rail scrolls inside itself: never let its tiles' width widen a grid or flex parent (or the page). */
      :host { min-width: 0; max-width: 100%; }
      .wrap { width: 100%; min-width: 0; }
      .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(min(240px, 100%), 1fr)); gap: 24px; align-items: start; }
      .group + .group { margin-top: 44px; }
      .group-head { display: flex; align-items: center; gap: 14px; margin: 0 0 18px; }
      .group-head h3 { margin: 0; flex: none; }
      .group-head .rule { flex: 1; height: 1px; background: var(--rule); min-width: 24px; }
      .group-head .label { flex: none; letter-spacing: .08em; }
      .rail-wrap { position: relative; }
      /* Room for a focused tile's lift and 4px-offset ring, which the scroll box would otherwise clip. */
      .rail { display: flex; gap: 20px; overflow-x: auto; scroll-snap-type: x mandatory; scroll-padding-inline: 8px; overscroll-behavior-x: contain;
        padding: 10px 8px 16px; margin: -10px -8px 0; scrollbar-width: none; -webkit-overflow-scrolling: touch; }
      .rail::-webkit-scrollbar { display: none; }
      .rail > g-collection-tile, .rail > .skel { flex: 0 0 220px; width: 220px; scroll-snap-align: start; }
      .controls { display: flex; align-items: center; gap: 8px; margin-top: 6px; }
      .controls[hidden] { display: none; }
      .track { position: relative; flex: 1; height: 1px; background: var(--rule); margin-right: 12px; overflow: hidden; }
      .thumb { position: absolute; top: 0; left: 0; height: 1px; width: 20%; background: var(--gilt); transition: left .2s ease; }
      .nav { display: inline-grid; place-items: center; width: 44px; height: 44px; padding: 0; border: 1px solid var(--rule); border-radius: 2px; background: var(--paper); color: var(--ink); cursor: pointer; transition: border-color .15s ease, color .15s ease, background .15s ease; }
      .nav:hover:not([disabled]) { border-color: var(--oxblood); color: var(--oxblood); background: var(--oxblood-tint); }
      .nav[disabled] { opacity: .4; cursor: default; }
      .skel { display: grid; gap: 10px; }
      .skel .frame { aspect-ratio: 4 / 3; }
      .skel .line { height: 16px; width: 78%; }
      .skel .line.short { height: 10px; width: 46%; }
      .state { display: grid; justify-items: start; gap: 12px; padding: 28px 0; }
      .state.partial { margin-top: 44px; padding: 0; }
      .empty { margin: 0; font-size: 18px; color: var(--soft); }
      @media (min-width: 860px) { .rail > g-collection-tile, .rail > .skel { flex-basis: 240px; width: 240px; } }
    </style>
    <div class="wrap" aria-busy="${status === "loading"}">${body}</div>`;
    adoptKitStyle(this.shadowRoot);
    wireImages(this.shadowRoot);
    this.shadowRoot.querySelector(".retry")?.addEventListener("click", () => this.load(true));
    this.wireRail();
    this.setCollapsed(collapse);
  }
  wireRail() {
    this._resize?.disconnect();
    this._resize = null;
    const rail = this.shadowRoot.querySelector(".rail");
    const controls = this.shadowRoot.querySelector(".controls");
    if (!rail || !controls) return;
    const prev = controls.querySelector(".prev"), next = controls.querySelector(".next"), thumb = controls.querySelector(".thumb");
    const update = () => {
      const max = rail.scrollWidth - rail.clientWidth;
      controls.hidden = max <= 4;
      if (max <= 4) return;
      prev.disabled = rail.scrollLeft <= 4;
      next.disabled = rail.scrollLeft >= max - 4;
      const share = Math.max(0.1, Math.min(1, rail.clientWidth / rail.scrollWidth));
      thumb.style.width = `${share * 100}%`;
      thumb.style.left = `${(rail.scrollLeft / max) * (1 - share) * 100}%`;
    };
    const schedule = () => { cancelAnimationFrame(this._frame); this._frame = requestAnimationFrame(update); };
    const step = (dir) => {
      const first = rail.firstElementChild;
      const tile = first ? first.getBoundingClientRect().width + 20 : 240;
      const by = Math.max(tile, Math.floor(rail.clientWidth / tile) * tile) * dir;
      rail.scrollBy({ left: by, behavior: reducedMotion() ? "auto" : "smooth" });
    };
    prev.addEventListener("click", () => step(-1));
    next.addEventListener("click", () => step(1));
    rail.addEventListener("scroll", schedule, { passive: true });
    // Arrow keys move focus to the previous/next tile and bring it into view (focus never stays on a
    // tile scrolled out of sight); the buttons page through the row.
    rail.addEventListener("keydown", (e) => {
      if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
      const tiles = [...rail.children].filter((el) => el.localName === "g-collection-tile");
      const i = tiles.indexOf(e.target);
      const target = i < 0 ? null : tiles[i + (e.key === "ArrowRight" ? 1 : -1)];
      const link = target?.shadowRoot?.querySelector("a");
      if (!link) return;
      e.preventDefault();
      link.focus({ preventScroll: true });
      target.scrollIntoView({ block: "nearest", inline: "nearest", behavior: reducedMotion() ? "auto" : "smooth" });
    });
    if (typeof ResizeObserver === "function") {
      this._resize = new ResizeObserver(schedule);
      this._resize.observe(rail);
    }
    schedule();
  }
}
if (!customElements.get("g-collection-list")) customElements.define("g-collection-list", GCollectionList);
