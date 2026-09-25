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

// Hero helpers.
const SOURCE_ATTRS = ["artwork-id", "collection", "theme"];
const attr = (el, name) => (el.getAttribute(name) || "").trim();
const museumOfId = (id) => (/^met-/i.test(id) ? "The Met" : /^aic-/i.test(id) ? "Art Institute of Chicago" : "");
const sentence = (s) => { const v = String(s || "").trim().replace(/\s+/g, " "); return v ? v.charAt(0).toUpperCase() + v.slice(1) : ""; };
// Works the hero may show: objects with an id and a real /__art image (imageUrl, else thumbUrl). Nothing else
// ever becomes the featured picture. g-artwork-grid applies the same test before its theme fallback, so both
// fall back to READS.search(theme) together and still share one request.
const heroSrc = (a) => artSrc(a?.imageUrl) || artSrc(a?.thumbUrl);
const usable = (list) => (Array.isArray(list) ? list : []).filter((a) => a && typeof a === "object" && String(a.id ?? "").trim() && heroSrc(a));
function dayOfYear() {
  const now = new Date();
  return Math.floor((Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) - Date.UTC(now.getFullYear(), 0, 0)) / 86400000);
}
// The wall colour comes from the artwork itself: average its pixels (same-origin through /__art, so the
// canvas is not tainted), keep only a whisper of its hue, and pin the lightness to a dark or light wall.
function tintFrom(img, tone) {
  try {
    const c = document.createElement("canvas");
    c.width = 12; c.height = 12;
    const ctx = c.getContext("2d", { willReadFrequently: true });
    ctx.drawImage(img, 0, 0, 12, 12);
    const d = ctx.getImageData(0, 0, 12, 12).data;
    let r = 0, g = 0, b = 0, n = 0;
    for (let i = 0; i < d.length; i += 4) { if (d[i + 3] < 128) continue; r += d[i]; g += d[i + 1]; b += d[i + 2]; n++; }
    if (!n) return "";
    r /= n * 255; g /= n * 255; b /= n * 255;
    const max = Math.max(r, g, b), min = Math.min(r, g, b), delta = max - min;
    const l = (max + min) / 2;
    let h = 0;
    if (delta) h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
    h = Math.round(((h * 60) + 360) % 360);
    const s = delta ? Math.min(0.25, delta / (1 - Math.abs(2 * l - 1) || 1)) : 0;
    return `hsl(${h}, ${(s * 100).toFixed(1)}%, ${tone === "light" ? 93 : 14}%)`;
  } catch {
    return "";
  }
}

class GFeatureHero extends HTMLElement {
  static get observedAttributes() { return ["heading", "kicker", "intro", "theme", "collection", "artwork-id", "pick", "tone"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading", src: { kind: "highlights", value: "" } };
    this._token = 0;
    this._tint = "";
    this._tintTone = "";
    this._started = false;
    this._sourceKey = "";
  }
  connectedCallback() {
    loadFonts();
    this._started = true;
    this.load();
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (!this._started || oldValue === newValue) return;
    if (SOURCE_ATTRS.includes(name)) this.load();
    else this.render();
  }
  // Precedence: artwork-id > collection > theme > museum highlights.
  source() {
    const id = attr(this, "artwork-id");
    if (id) return { kind: "artwork", value: id };
    const collection = attr(this, "collection");
    if (collection) return { kind: "collection", value: collection };
    const theme = attr(this, "theme").replace(/\s+/g, " ");
    if (theme) return { kind: "theme", value: theme };
    return { kind: "highlights", value: "" };
  }
  async load() {
    const src = this.source();
    const key = `${src.kind}:${src.value}`;
    if (key === this._sourceKey && this._state.status !== "error") return;
    this._sourceKey = key;
    const token = ++this._token;
    this._tint = "";
    this._tintTone = "";
    this._state = { status: "loading", src };
    this.render();
    let next;
    try {
      next = await this.fetchWorks(src);
    } catch (err) {
      next = { status: "error", works: [], message: err?.message || "" };
    }
    if (token !== this._token) return;
    this._state = { ...next, src };
    this.render();
  }
  async fetchWorks(src) {
    if (src.kind === "artwork") {
      if (!isArtworkId(src.value)) return { status: "empty", works: [] };
      const work = payload(await readAction(...READS.artwork(src.value)), "title");
      const works = usable(work && typeof work === "object" ? [{ ...work, id: work.id || src.value }] : []);
      return { status: works.length ? "ready" : "empty", works, title: work?.title || "", museum: work?.museum || "" };
    }
    if (src.kind === "collection") {
      const res = await readAction(...READS.collection(src.value));
      const works = usable(field(res, "artworks"));
      return { status: works.length ? "ready" : "empty", works, name: field(res, "name") || "", museum: field(res, "museum") || "" };
    }
    if (src.kind === "theme") {
      let works = [], fallback = false;
      try { works = usable(field(await readAction(...READS.highlights(src.value)), "artworks")); } catch { works = []; }
      // A theme without museum highlights falls back to search results: the same body g-artwork-grid theme= sends.
      if (!works.length) { works = usable(field(await readAction(...READS.search(src.value)), "artworks")); fallback = works.length > 0; }
      return { status: works.length ? "ready" : "empty", works, fallback };
    }
    const works = usable(field(await readAction(...READS.highlights()), "artworks"));
    return { status: works.length ? "ready" : "empty", works };
  }
  featured() {
    const { works = [] } = this._state;
    if (!works.length) return null;
    return attr(this, "pick").toLowerCase() === "daily" ? works[dayOfYear() % works.length] : works[0];
  }
  // Default texts come from the source and, once loaded, from the data; written attributes always win.
  texts() {
    const { status, src, title, name, museum, fallback } = this._state;
    const pending = status === "loading";
    let heading = "", kicker = "", italic = false, fallbackHref = "/highlights", fallbackText = "Browse the highlights";
    if (src.kind === "artwork") {
      heading = title || (pending ? null : "Featured work");
      italic = !!title;
      kicker = museum || museumOfId(src.value) || "Featured work";
    } else if (src.kind === "collection") {
      heading = name || (pending ? null : "Collection");
      const m = museum || museumOfId(src.value);
      kicker = m ? `Collection · ${m}` : "Collection";
      fallbackHref = "/collections"; fallbackText = "Browse all collections";
    } else if (src.kind === "theme") {
      heading = sentence(src.value);
      // Works from the search fallback aren't museum highlights: say so, as g-artwork-grid theme= does.
      kicker = fallback ? "Search results" : "Highlights";
    } else {
      heading = "Highlights of the collections";
      kicker = "Highlights";
    }
    const headingAttr = attr(this, "heading");
    if (headingAttr) { heading = headingAttr; italic = false; }
    // kicker="" written explicitly hides the kicker.
    if (this.hasAttribute("kicker")) kicker = attr(this, "kicker");
    return { heading, kicker, italic, fallbackHref, fallbackText };
  }
  render() {
    const { status } = this._state;
    const tone = attr(this, "tone").toLowerCase() === "light" ? "light" : "dark";
    // A tint computed for the other tone would put dark ink on a dark wall (or the reverse): drop it until
    // wireHeroImage recomputes it for this tone.
    if (this._tint && this._tintTone !== tone) { this._tint = ""; this._tintTone = ""; }
    const { heading, kicker, italic, fallbackHref, fallbackText } = this.texts();
    const intro = attr(this, "intro");
    const work = status === "ready" ? this.featured() : null;
    const solo = status === "error" || status === "empty" || (status === "ready" && !work);
    const h1 = heading === null
      ? `<h1 id="h" class="h1"><span class="sk sk-line" aria-hidden="true"></span><span class="sk sk-line short" aria-hidden="true"></span><span class="sr">Loading…</span></h1>`
      : `<h1 id="h" class="h1${italic ? " t" : ""}">${esc(heading)}</h1>`;
    const note = status === "error"
      ? `<p class="note">The featured work couldn\x27t be loaded just now. <a class="more-link" href="${esc(fallbackHref)}">${esc(fallbackText)}</a></p>`
      : "";
    let figure = "";
    if (status === "loading") {
      figure = `<div class="work"><div class="stage" aria-hidden="true"><div class="sk frame"></div></div>
        <div class="cap" aria-hidden="true"><span class="sk sk-cap"></span><span class="sk sk-cap short"></span></div></div>`;
    } else if (work) {
      const t = work.title || "Untitled";
      const byline = [work.artist, work.date].filter(Boolean).join(", ");
      const url = heroSrc(work);
      let img = artImg(url, work.imageAlt || `${t}${work.artist ? ` by ${work.artist}` : ""}`, t, { eager: true });
      // GetArtwork also returns a ~1686px largeImageUrl: offer it to high-DPI screens (imageUrl is ~843px).
      const large = artSrc(work.largeImageUrl);
      if (large && url && large !== url && img.startsWith("<img ")) {
        img = `<img srcset="${esc(url)} 843w, ${esc(large)} 1686w" sizes="(min-width: 860px) 58vw, 100vw" ${img.slice(5)}`;
      }
      const inner = `<figure>
          <div class="stage">${img}</div>
          <figcaption class="cap"><span class="rule" aria-hidden="true"></span><span class="t ct">${esc(t)}</span>
            <span class="meta">${byline ? `<span class="num">${esc(byline)}</span>` : ""}${byline && work.museum ? ` · ` : ""}${work.museum ? `<span>${esc(work.museum)}</span>` : ""}</span></figcaption>
        </figure>`;
      figure = isArtworkId(work.id) ? `<a class="work link-work" href="${esc(artworkHref(work.id))}">${inner}</a>` : `<div class="work">${inner}</div>`;
    }
    const tint = this._tint ? ` style="--art-tint: ${esc(this._tint)}"` : "";
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .band { --fg: var(--night-ink); --fg-soft: rgba(239,233,223,.76); --kick: #e5b2a9; --ring: var(--oxblood-tint); --hair: rgba(168,132,74,.7);
        --shadow: drop-shadow(0 18px 32px rgba(0,0,0,.5)); --sk-bg: rgba(235,230,220,.1);
        --search-label: var(--fg-soft);
        background-color: var(--art-tint, var(--night)); color: var(--fg); transition: background-color .4s ease; }
      .band.light { --fg: var(--ink); --fg-soft: var(--soft); --kick: var(--oxblood); --ring: var(--oxblood); --hair: var(--gilt);
        --shadow: drop-shadow(0 14px 24px rgba(29,27,24,.22)); --sk-bg: var(--mat);
        background-color: var(--art-tint, var(--wall)); }
      .band :focus-visible { outline-color: var(--ring); }
      .wrap { max-width: 1240px; min-height: min(76vh, 700px); margin: 0 auto; padding: 28px 16px 36px; display: grid; grid-template-columns: minmax(0, 1fr); gap: 28px; align-content: center; }
      .solo .wrap { min-height: min(46vh, 420px); }
      .text { display: grid; grid-template-columns: minmax(0, 1fr); align-content: center; justify-items: start; min-width: 0; }
      .kick { display: flex; align-items: center; gap: 12px; margin: 0 0 16px; color: var(--kick); }
      .kick::before { content: ""; width: 28px; height: 1px; background: var(--hair); flex: none; }
      .h1 { margin: 0; font: 500 clamp(40px, 6vw, 64px)/1.05 var(--serif); letter-spacing: -.012em; text-wrap: balance; overflow-wrap: break-word; max-width: 18ch; color: var(--fg); }
      .h1.t { font-style: italic; }
      .solo .h1 { max-width: 22ch; }
      .sk-line { display: block; height: .82em; width: min(12ch, 100%); margin: .12em 0; background: var(--sk-bg); }
      .sk-line.short { width: min(7ch, 70%); }
      .intro { margin: 20px 0 0; max-width: 42ch; font: 400 19px/1.55 var(--serif); color: var(--fg-soft); text-wrap: pretty; }
      .note { margin: 18px 0 0; font-size: 14px; color: var(--fg-soft); }
      .more-link { color: var(--kick); font-weight: 600; text-decoration: underline; text-underline-offset: 3px; }
      .slot { width: 100%; }
      .slot.filled { margin-top: 28px; display: grid; gap: 16px; }
      .work { display: block; min-width: 0; text-decoration: none; color: inherit; border-radius: 2px; }
      figure { margin: 0; }
      .stage { position: relative; height: clamp(260px, 50vh, 520px); display: grid; place-items: center; }
      /* Out of grid sizing: as a grid item a portrait image's own height sets the row and spills past the stage. */
      .stage img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; object-fit: contain; filter: var(--shadow); opacity: 0; transition: opacity .25s ease, transform .3s ease; }
      .stage img.in { opacity: 1; }
      .stage .ph { border-radius: 2px; }
      .frame { height: 100%; aspect-ratio: 4 / 5; max-width: 100%; background: var(--sk-bg); }
      .cap { display: grid; gap: 4px; margin-top: 18px; max-width: 52ch; }
      .rule { width: 24px; height: 1px; background: var(--hair); margin-bottom: 6px; }
      .ct { font-size: 17px; line-height: 1.3; color: var(--fg); text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; transition: text-decoration-color .2s ease; }
      .meta { font-size: 12px; line-height: 1.45; letter-spacing: .01em; color: var(--fg-soft); }
      .sk-cap { display: block; height: 14px; width: 60%; background: var(--sk-bg); }
      .sk-cap.short { width: 40%; height: 11px; }
      .link-work:hover .ct, .link-work:focus-visible .ct { text-decoration-color: var(--kick); }
      .link-work:hover .stage img.in { transform: translateY(-2px); }
      .link-work:focus-visible { outline-offset: 6px; }
      @media (prefers-reduced-motion: reduce) { .link-work:hover .stage img.in { transform: none; } }
      @media (min-width: 860px) {
        .wrap { padding: 48px 32px; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 48px; align-items: center; }
        .solo .wrap { grid-template-columns: minmax(0, 1fr); padding-block: 72px; }
        .stage { height: min(62vh, 620px); }
        .cap { margin-top: 20px; }
      }
      @media (max-width: 859px) {
        .work { order: -1; }
        .stage { height: clamp(240px, 50vh, 480px); }
      }
    </style>
    <section class="band ${tone}${solo ? " solo" : ""}" aria-labelledby="h" aria-busy="${status === "loading"}"${tint}>
      <div class="wrap">
        <div class="text">
          ${kicker ? `<p class="kicker kick">${esc(kicker)}</p>` : ""}
          ${h1}
          ${intro ? `<p class="intro">${esc(intro)}</p>` : ""}
          ${note}
          <div class="slot"><slot></slot></div>
        </div>
        ${solo ? "" : figure}
      </div>
    </section>`;
    adoptKitStyle(this.shadowRoot);
    this.wireSlot();
    this.wireHeroImage(tone);
  }
  wireSlot() {
    const slot = this.shadowRoot.querySelector("slot");
    const box = this.shadowRoot.querySelector(".slot");
    if (!slot || !box) return;
    const update = () => box.classList.toggle("filled", slot.assignedNodes().some((n) => n.nodeType === 1 || (n.nodeType === 3 && n.textContent.trim())));
    slot.addEventListener("slotchange", update);
    update();
  }
  wireHeroImage(tone) {
    wireImages(this.shadowRoot);
    const img = this.shadowRoot.querySelector(".stage img[data-title]");
    if (!img) return;
    const token = this._token;
    const apply = () => {
      if (token !== this._token || !img.naturalWidth) return;
      const tint = tintFrom(img, tone);
      if (!tint || tint === this._tint) return;
      this._tint = tint;
      this._tintTone = tone;
      this.shadowRoot.querySelector(".band")?.style.setProperty("--art-tint", tint);
    };
    if (img.complete) apply();
    else img.addEventListener("load", apply, { once: true });
  }
}
if (!customElements.get("g-feature-hero")) customElements.define("g-feature-hero", GFeatureHero);
