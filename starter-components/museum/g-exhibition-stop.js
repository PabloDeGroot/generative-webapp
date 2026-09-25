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

// Stop-specific styles. The .fold wrapper collapses the stop (grid rows 1fr -> 0fr) while a removal is
// in flight, and opens again if it fails. The mat pulses (the kit's skeleton) until its image settles.
const STOP_CSS = `
/* The kit's .mat img is height:100% of a grid box sized only by aspect-ratio, which doesn't resolve, so the
   image kept its natural height and the mat cropped it: pin it to the mat so the whole work shows. */
.mat > img { position: absolute; inset: 0; }
:host { scroll-margin-top: 24px; }
.fold { display: grid; grid-template-rows: 1fr; opacity: 1; transition: grid-template-rows .45s ease, opacity .3s ease; }
.fold.gone { grid-template-rows: 0fr; opacity: 0; }
.fold > .clip { min-height: 0; overflow: hidden; padding: 4px; margin: -4px; }
article { display: grid; gap: 22px; padding: 28px 0; }
.art { min-width: 0; }
.frame { display: block; border-radius: 2px; color: inherit; text-decoration: none; }
.mat { aspect-ratio: 4 / 3; width: 100%; max-height: 72vh; border-radius: 2px; transition: box-shadow .2s ease; }
.mat.wait { animation: sk 1.6s ease-in-out infinite; }
.frame:hover .mat { box-shadow: inset 0 0 0 1px var(--gilt), 0 14px 30px -22px rgba(29,27,24,.5); }
.ph i { font-size: 22px; }
.text { min-width: 0; max-width: 34rem; }
.no { display: flex; align-items: center; gap: 12px; margin: 0; font: 500 13px/1 var(--sans); letter-spacing: .08em; color: var(--gilt-ink); }
.no::before { content: ""; width: 28px; height: 1px; background: var(--gilt); }
.no .of { color: var(--gilt); padding: 0 .2em; }
h2 { margin: 14px 0 10px; font-size: 24px; line-height: 1.18; color: var(--ink); overflow-wrap: anywhere; outline: none; }
h2:focus-visible { outline: 2px solid var(--oxblood); outline-offset: 4px; }
.who { margin: 0; font: 500 15px/1.45 var(--sans); }
.who a { text-decoration: underline; text-decoration-color: var(--soft); text-underline-offset: 4px; text-decoration-thickness: 1px; }
.who a:hover { color: var(--oxblood); text-decoration-color: var(--oxblood); }
.who .date { font-weight: 400; color: var(--soft); }
.where { margin: 8px 0 0; }
blockquote { margin: 24px 0 0; padding: 2px 0 2px 20px; border-left: 2px solid var(--gilt); max-width: 65ch;
  font: 400 18px/1.55 var(--serif); color: var(--ink); }
blockquote p { margin: 0 0 .65em; }
blockquote p:last-child { margin-bottom: 0; }
.links { display: flex; flex-wrap: wrap; gap: 0 24px; margin-top: 20px; }
.links a { display: inline-flex; align-items: center; min-height: 44px; font-size: 14px; }
.links .next { color: var(--ink); font-weight: 500; text-decoration: none; }
.links .next:hover { color: var(--oxblood); text-decoration: underline; text-underline-offset: 3px; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 4px 10px; margin-top: 12px; padding-top: 2px; border-top: 1px solid var(--rule); font-size: 13px; color: var(--soft); }
.actions button { min-height: 44px; padding: 0 2px; border: 0; background: none; font: 500 13px/1 var(--sans); color: var(--soft); cursor: pointer; border-radius: 2px;
  text-decoration: underline; text-decoration-color: transparent; text-underline-offset: 4px; transition: color .15s ease, text-decoration-color .15s ease; }
.actions button:hover:not([disabled]) { color: var(--oxblood); text-decoration-color: currentColor; }
.actions button[disabled] { opacity: .55; cursor: default; }
.actions .q { color: var(--ink); font-weight: 500; }
.actions .yes { color: var(--oxblood); font-weight: 600; }
.actions .dot { color: var(--rule); }
.actions .error { flex-basis: 100%; padding-bottom: 8px; }
@media (min-width: 860px) {
  article { grid-template-columns: minmax(0, 3fr) minmax(0, 2fr); gap: 56px; align-items: center; padding: 48px 0; }
  article.flip { grid-template-columns: minmax(0, 2fr) minmax(0, 3fr); }
  article.flip .art { order: 2; }
  h2 { font-size: 30px; }
  blockquote { font-size: 20px; }
}
@media (prefers-reduced-motion: reduce) { .fold.gone { display: none; } }`;

const reducedMotion = () => { try { return matchMedia("(prefers-reduced-motion: reduce)").matches; } catch { return false; } };
const two = (n) => String(n).padStart(2, "0");

class GExhibitionStop extends HTMLElement {
  static get observedAttributes() { return ["exhibition-id", "artwork-id", "position", "total", "artwork-title", "title", "artist", "date", "museum", "image-url", "image-alt", "note", "eager"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._phase = "idle"; // idle | confirm | busy | removed
    this._error = "";
    this._dirty = false; // attributes changed while a removal was in flight
    this._legacyTitle = ""; // a global title="" attribute, moved here so it doesn't become a tooltip
    this._removeStarted = 0;
  }
  connectedCallback() {
    loadFonts();
    this.adoptTitle();
    this.render();
  }
  // The work's title belongs in artwork-title. A global title attribute (older markup) would show the
  // browser's tooltip over the whole stop, so it is read once, kept privately and removed.
  adoptTitle() {
    if (!this.hasAttribute("title")) return false;
    this._legacyTitle = (this.getAttribute("title") || "").trim();
    this.removeAttribute("title");
    return true;
  }
  titleText() { return this.attr("artwork-title") || this._legacyTitle; }
  attributeChangedCallback(name, oldValue, newValue) {
    // Removing a moved title fires this again with null: that is not a change of the work's title.
    if (name === "title") { if (newValue === null) return; oldValue = this._legacyTitle; this.adoptTitle(); newValue = this._legacyTitle; }
    if (oldValue === newValue || !this.isConnected) return;
    if (this._phase === "busy") { this._dirty = true; return; }
    // A removed stop stays collapsed (renumbering doesn't bring it back) until the view reuses it for
    // another work: then show it again.
    if (this._phase === "removed") {
      if (name !== "artwork-id" && name !== "exhibition-id") return;
      this.removeAttribute("hidden");
    }
    this._phase = "idle";
    this._error = "";
    this.render();
  }
  attr(name) { return (this.getAttribute(name) || "").trim(); }
  position() { const n = parseInt(this.attr("position"), 10); return n > 0 ? n : 0; }
  total() { const n = parseInt(this.attr("total"), 10); return n > 0 ? n : 0; }
  // Public: g-exhibition-view (and the previous stop's 'Next stop' link) move focus here.
  focusHeading() { this.shadowRoot.querySelector("h2")?.focus({ preventScroll: true }); }
  render() {
    const id = this.attr("artwork-id");
    const n = this.position();
    const total = this.total();
    const title = this.titleText() || "Untitled";
    const artist = this.attr("artist");
    const date = this.attr("date");
    const museum = this.attr("museum");
    const alt = this.attr("image-alt") || (artist ? `${title} by ${artist}` : title);
    const note = paras(this.attr("note"));
    const linked = isArtworkId(id);
    const artistLink = artistHref(artist);
    // Anchor for #stop-<n> links in the same tree (the floor plan, 'Next stop').
    if (n && !this.hasAttribute("id")) this.setAttribute("id", `stop-${n}`);

    const img = artImg(this.attr("image-url"), alt, title, { eager: this.hasAttribute("eager") });
    const mat = `<div class="mat">${img}</div>`;
    // The image link is a mouse shortcut; keyboard users get 'View the work', so it stays out of the tab order.
    const art = linked ? `<a class="frame" href="${esc(artworkHref(id))}" tabindex="-1">${mat}</a>` : mat;
    const number = n
      ? `<p class="no num"><span class="sr">Stop </span>${two(n)}${total ? `<span class="of" aria-hidden="true">/</span><span class="sr"> of </span>${two(total)}` : ""}</p>`
      : "";
    const who = artist || date
      ? `<p class="who">${artist ? (artistLink ? `<a href="${esc(artistLink)}">${esc(artist)}</a>` : esc(artist)) : ""}${artist && date ? ", " : ""}${date ? `<span class="date num">${esc(date)}</span>` : ""}</p>`
      : "";
    const quote = note.length ? `<blockquote><span class="sr">Curator\x27s note: </span>${note.map((p) => `<p>${esc(p)}</p>`).join("")}</blockquote>` : "";
    const hasNext = n && total && n < total;
    const links = linked || hasNext
      ? `<div class="links">${linked ? `<a class="link" href="${esc(artworkHref(id))}">View the work <span aria-hidden="true">→</span></a>` : ""}${hasNext ? `<a class="next" href="#stop-${n + 1}">Next stop <span aria-hidden="true">→</span></a>` : ""}</div>`
      : "";

    this.shadowRoot.innerHTML = `<style>${TOKENS}${STOP_CSS}</style>
      <div class="fold${this._phase === "busy" || this._phase === "removed" ? " gone" : ""}"><div class="clip">
        <article class="${n % 2 === 0 ? "flip" : ""}" aria-labelledby="h">
          <div class="art">${art}</div>
          <div class="text">
            ${number}
            <h2 id="h" class="t" tabindex="-1">${esc(title)}</h2>
            ${who}
            ${museum ? `<p class="where label">${esc(museum)}</p>` : ""}
            ${quote}
            ${links}
            <div class="actions"></div>
          </div>
        </article>
      </div></div>
      <p class="sr" role="status" aria-live="polite"></p>`;
    adoptKitStyle(this.shadowRoot);

    wireImages(this.shadowRoot);
    const pending = this.shadowRoot.querySelector(".mat img:not(.in)");
    if (pending) {
      const box = pending.closest(".mat");
      const done = () => box.classList.remove("wait");
      box.classList.add("wait");
      pending.addEventListener("load", done, { once: true });
      pending.addEventListener("error", done, { once: true });
    }
    this.shadowRoot.querySelector(".next")?.addEventListener("click", (e) => this.goNext(e));
    this.renderActions();
  }
  // Only the actions row changes during confirm/remove, so the image and the collapse transition survive.
  renderActions(focus) {
    const box = this.shadowRoot.querySelector(".actions");
    if (!box) return;
    const canRemove = this.attr("exhibition-id") && isArtworkId(this.attr("artwork-id"));
    if (!canRemove) { box.remove(); return; }
    const busy = this._phase === "busy";
    const error = this._error ? `<p class="error" role="alert">${esc(this._error)}</p>` : "";
    box.innerHTML = this._phase === "confirm" || busy
      ? `${error}<span class="q" id="q">Remove from exhibition?</span>
         <button type="button" class="yes" aria-describedby="q" ${busy ? "disabled" : ""}>Yes</button><span class="dot" aria-hidden="true">·</span>
         <button type="button" class="cancel" ${busy ? "disabled" : ""}>Cancel</button>`
      : `${error}<button type="button" class="rm" aria-label="Remove ${esc(this.titleText() || "this work")} from the exhibition">Remove</button>`;
    box.querySelector(".rm")?.addEventListener("click", () => { this._phase = "confirm"; this._error = ""; this.renderActions("yes"); });
    box.querySelector(".yes")?.addEventListener("click", () => this.removeFromExhibition());
    box.querySelector(".cancel")?.addEventListener("click", () => { this._phase = "idle"; this.renderActions("rm"); });
    box.onkeydown = (e) => {
      if (e.key === "Escape" && this._phase === "confirm") { e.preventDefault(); this._phase = "idle"; this.renderActions("rm"); }
    };
    if (focus) box.querySelector(`.${focus}`)?.focus();
  }
  announce(text) {
    const live = this.shadowRoot.querySelector("[role=status]");
    if (live) live.textContent = text;
  }
  // Other visible stops in the same tree (the view's shadow root, or the document), in walk order.
  siblings() {
    const root = this.getRootNode();
    return Array.from(root.querySelectorAll ? root.querySelectorAll("g-exhibition-stop") : [])
      .filter((el) => el !== this && !el.hasAttribute("hidden"));
  }
  goNext(e) {
    const n = this.position();
    const next = this.siblings()
      .map((el) => [parseInt(el.getAttribute("position"), 10) || 0, el])
      .filter(([p]) => p > n)
      .sort((a, b) => a[0] - b[0])[0]?.[1];
    if (!next) return; // let the #stop-<n> fragment do its default
    e.preventDefault();
    const p = parseInt(next.getAttribute("position"), 10) || n + 1;
    const root = this.getRootNode();
    // Inside g-exhibition-view the anchor is the view's <li id="stop-N">, whose scroll margin clears the
    // sticky floor plan; let the view jump there so the hash and the floor plan's current stop update too.
    const anchor = root.getElementById?.(`stop-${p}`);
    const view = root.host;
    if (anchor && anchor !== next && view && typeof view.jump === "function") view.jump(p, false);
    else {
      (anchor || next).scrollIntoView({ behavior: reducedMotion() ? "auto" : "smooth", block: "start" });
      try { history.replaceState(history.state, "", `#stop-${p}`); } catch { /* sandboxed */ }
    }
    if (typeof next.focusHeading === "function") next.focusHeading();
  }
  async removeFromExhibition() {
    if (this._phase === "busy") return;
    const exhibitionId = this.attr("exhibition-id");
    const artworkId = this.attr("artwork-id");
    const title = this.titleText() || "This work";
    const n = this.position();
    this._phase = "busy";
    this._removeStarted = Date.now();
    this._error = "";
    this.renderActions();
    this.shadowRoot.querySelector(".fold")?.classList.add("gone");
    this.shadowRoot.querySelector(".clip")?.setAttribute("inert", "");
    this.announce(`Removing ${title} from the exhibition…`);
    try {
      const res = await writeAction(...WRITES.remove(exhibitionId, artworkId));
      const count = Number(field(res, "artworkCount"));
      this._phase = "removed";
      this._dirty = false;
      this.announce(`${title} was removed from the exhibition.`);
      // Tell the host only once the collapse has played, so a host that drops the stop at once (as
      // g-exhibition-view does) doesn't cut the animation short.
      const wait = reducedMotion() ? 0 : Math.max(0, 460 - (Date.now() - this._removeStarted));
      setTimeout(() => {
        if (this._phase !== "removed") return;
        const change = new CustomEvent("g-exhibition-change", {
          bubbles: true, composed: true, cancelable: true,
          detail: { exhibitionId, artworkId, removed: true, artworkCount: Number.isFinite(count) ? count : undefined }
        });
        const others = this.siblings().map((el) => [parseInt(el.getAttribute("position"), 10) || 0, el]);
        this.dispatchEvent(change);
        // A host that took the stop out of the page (or called preventDefault) owns focus; otherwise keep
        // keyboard users in the walk: focus the next stop, else the previous one.
        if (this._phase !== "removed" || !this.isConnected || change.defaultPrevented) return;
        this.setAttribute("hidden", "");
        const after = others.filter(([p]) => p > n).sort((a, b) => a[0] - b[0])[0];
        const before = others.filter(([p]) => p < n).sort((a, b) => b[0] - a[0])[0];
        const target = (after || before)?.[1];
        if (target && target.isConnected && typeof target.focusHeading === "function") target.focusHeading();
      }, wait);
    } catch (err) {
      this._phase = "idle";
      this._error = needsSignIn(err) ? "Sign in to change this exhibition." : (err?.message || "Couldn\x27t remove this work. Try again.");
      this.announce("");
      if (this._dirty) { this._dirty = false; this.render(); this.shadowRoot.querySelector(".rm")?.focus(); return; }
      this.shadowRoot.querySelector(".clip")?.removeAttribute("inert");
      this.shadowRoot.querySelector(".fold")?.classList.remove("gone");
      this.renderActions("rm");
    }
  }
}
if (!customElements.get("g-exhibition-stop")) customElements.define("g-exhibition-stop", GExhibitionStop);
