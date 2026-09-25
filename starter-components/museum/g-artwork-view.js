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

// ---- g-artwork-view ----------------------------------------------------------------------------------
// The /artwork/<id> page body: tinted stage + zoom dialog, wall label (the page h1), museum description.
const clampN = (v, lo, hi) => Math.min(hi, Math.max(lo, v));
const text = (v) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");
const fileName = (title, url) => `${(text(title) || "artwork").normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/\s+/g, "-").slice(0, 60) || "artwork"}${(/\.(jpe?g|png|webp|tiff?)$/i.exec(url) || [".jpg"])[0].toLowerCase()}`;
// Average a loaded (same-origin /__art) image into a 12x12 canvas, then keep only a muted, dark version of it.
function darkTint(img) {
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
    const max = Math.max(r, g, b), min = Math.min(r, g, b), l = (max + min) / 2, delta = max - min;
    let h = 0, s = 0;
    if (delta) {
      s = delta / (1 - Math.abs(2 * l - 1));
      h = max === r ? ((g - b) / delta) % 6 : max === g ? (b - r) / delta + 2 : (r - g) / delta + 4;
      h = Math.round(h * 60 + 360) % 360;
    }
    return `hsl(${h} ${Math.round(Math.min(s, 0.25) * 100)}% 14%)`;
  } catch { return ""; }
}
// A long description shows its first ~700 characters and folds the rest behind "Read more".
function foldParas(description) {
  let list = paras(description);
  const total = list.join(" ").length;
  if (total <= 900) return { head: list, rest: [] };
  if (list.length === 1) {
    const m = /[.!?]["”’)]?\s/.exec(list[0].slice(600));
    if (!m) return { head: list, rest: [] };
    const at = 600 + m.index + m[0].length - 1;
    list = [list[0].slice(0, at).trim(), list[0].slice(at).trim()].filter(Boolean);
  }
  const head = [];
  let used = 0;
  for (const p of list) { if (head.length && used + p.length > 700) break; head.push(p); used += p.length; }
  return { head, rest: list.slice(head.length) };
}

const VIEW_CSS = `
.stage { position: relative; display: grid; grid-template-rows: minmax(0, 1fr) auto; height: clamp(360px, 72vh, 800px); height: min(clamp(360px, 72vh, 800px), max(300px, calc((100vw - 40px) / var(--ar, 1) + 100px))); background: var(--art-tint, var(--night)); color: var(--night-ink); transition: background-color .6s ease; }
.stage :focus-visible { outline: 2px solid var(--night-ink); outline-offset: 2px; box-shadow: 0 0 0 4px var(--oxblood); }
.zoom { position: relative; display: grid; place-items: center; width: 100%; height: 100%; min-height: 0; padding: 0; margin: 0; border: 0; background: transparent; color: inherit; font: inherit; cursor: zoom-in; overflow: hidden; }
.zoom[disabled] { cursor: default; }
.zoom img { position: absolute; inset: 0; display: block; width: 100%; height: 100%; max-width: none; object-fit: contain; padding: clamp(20px, 5%, 56px) clamp(16px, 5%, 64px) 12px; filter: drop-shadow(0 14px 30px rgba(0,0,0,.42)); opacity: 0; transition: opacity .25s ease; }
.zoom img.in { opacity: 1; }
.stage.nobar .zoom img { padding-bottom: clamp(20px, 5%, 56px); }
.zoom .ph { inset: clamp(20px, 5%, 56px) clamp(16px, 8%, 96px) 12px; border-radius: 2px; }
.chip-zoom { position: absolute; right: 16px; bottom: 12px; display: inline-flex; align-items: center; gap: 6px; min-height: 32px; padding: 0 12px; border-radius: 999px; background: rgba(21,19,15,.62); color: var(--night-ink); font: 600 12px/1 var(--sans); letter-spacing: .04em; pointer-events: none; transition: background-color .2s ease; }
.zoom:hover .chip-zoom, .zoom:focus-visible .chip-zoom { background: rgba(21,19,15,.86); }
.zoom[disabled] .chip-zoom { display: none; }
.bar { display: flex; align-items: center; justify-content: space-between; gap: 12px; min-height: 64px; padding: 8px 16px 12px; }
.rail { display: flex; gap: 8px; overflow-x: auto; padding: 4px; margin: -4px; scrollbar-width: thin; }
.thumb { flex: none; width: 56px; height: 56px; padding: 0; border: 0; border-radius: 2px; cursor: pointer; opacity: .7; transition: opacity .2s ease; }
.thumb:hover { opacity: 1; }
.thumb[aria-pressed="true"] { opacity: 1; box-shadow: 0 0 0 2px var(--night-ink); }
.thumb img { padding: 6px; filter: none; }
.thumb .ph { padding: 4px; }
.thumb .ph i { display: none; }
.thumb .ph span { font-size: 7px; letter-spacing: .06em; }
.dl { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; margin-left: auto; padding: 0 4px; color: var(--night-ink); font: 500 13px/1 var(--sans); text-decoration: none; opacity: .85; white-space: nowrap; }
.dl:hover { opacity: 1; text-decoration: underline; text-underline-offset: 3px; }

.body { max-width: 1240px; margin: 0 auto; padding: 28px 16px; display: grid; gap: 32px; }
.body.solo { grid-template-columns: minmax(0, 720px); justify-content: center; }
.card { position: relative; background: var(--paper); border: 1px solid var(--rule); border-radius: 2px; padding: 28px; }
.card::before { content: ""; display: block; width: 32px; height: 1px; background: var(--gilt); margin-bottom: 16px; }
.card p { margin: 0; }
h1 { margin: 8px 0 14px; font-family: var(--serif); font-weight: 500; font-size: clamp(30px, 3.4vw, 40px); line-height: 1.12; color: var(--ink); overflow-wrap: anywhere; font-optical-sizing: auto; }
.who { font-size: 17px; line-height: 1.4; }
.who a { color: var(--oxblood); font-weight: 600; text-decoration: none; }
.who a:hover { color: var(--oxblood-deep); text-decoration: underline; text-underline-offset: 3px; }
.bio { color: var(--soft); font-size: 14px; margin-top: 2px !important; }
.date { font-family: var(--serif); font-size: 18px; margin-top: 10px !important; }
.act { margin-top: 20px; }
hr { border: 0; border-top: 1px solid var(--rule); margin: 22px 0 18px; }
dl { display: grid; grid-template-columns: 110px minmax(0, 1fr); gap: 10px 16px; margin: 0; }
dt { padding-top: 3px; }
dd { margin: 0; font-size: 14px; line-height: 1.5; overflow-wrap: anywhere; }
dd .soft { color: var(--soft); }
.chips { display: flex; flex-wrap: wrap; gap: 8px; margin-top: 20px; }
.chip { display: inline-flex; align-items: center; gap: 7px; min-height: 28px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--rule); font: 600 12px/1 var(--sans); color: var(--soft); }
.chip.on { color: var(--gilt-ink); border-color: transparent; background: rgba(168,132,74,.1); }
.chip.on i { width: 7px; height: 7px; border-radius: 50%; background: var(--gilt); }
.chip.pd { color: var(--gilt-ink); border-color: var(--gilt); }
.src { display: inline-flex; align-items: center; min-height: 44px; margin-top: 12px; }

.about { min-width: 0; }
.about h2 { margin: 8px 0 18px; font: 500 30px/1.2 var(--serif); }
.prose { max-width: 65ch; font: 400 18px/1.65 var(--serif); color: var(--ink); }
.prose p { margin: 0 0 1em; }
.more { display: inline-flex; align-items: center; gap: 6px; min-height: 44px; padding: 0; border: 0; background: none; color: var(--oxblood); font: 600 14px/1 var(--sans); cursor: pointer; }
.more:hover { text-decoration: underline; text-underline-offset: 3px; }
.more span { display: inline-block; transition: transform .2s ease; }
.more[aria-expanded="true"] span { transform: rotate(180deg); }
.credit { margin: 14px 0 0; color: var(--soft); font-size: 13px; }

.sk-stage { height: clamp(360px, 72vh, 800px); border-radius: 0; }
.bar-sk { height: 12px; margin-bottom: 12px; }
h1.sk { height: 40px; width: 80%; margin: 8px 0 18px; }
.err { max-width: 1240px; margin: 0 auto; padding: 64px 16px; }
.err h1 { font-style: normal; max-width: 22ch; }
.err p { max-width: 60ch; color: var(--soft); margin: 0 0 20px; }
.err .row { display: flex; flex-wrap: wrap; align-items: center; gap: 12px 20px; }

dialog { width: 100vw; height: 100vh; height: 100dvh; max-width: none; max-height: none; margin: 0; padding: 0; border: 0; background: var(--night); color: var(--night-ink); overflow: hidden; }
dialog[open] { display: grid; grid-template-rows: auto minmax(0, 1fr); }
dialog::backdrop { background: rgba(21,19,15,.9); }
dialog :focus-visible { outline: 2px solid var(--night-ink); outline-offset: 2px; }
.ztop { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 8px 8px 8px 16px; border-bottom: 1px solid rgba(239,233,223,.12); }
.ztitle { margin: 0; min-width: 0; font-size: 14px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.ztitle i { font: italic 500 17px/1.3 var(--serif); }
.ztitle span { color: rgba(239,233,223,.7); }
.ztools { display: flex; flex: none; gap: 2px; }
.ztools button { min-width: 44px; height: 44px; padding: 0 10px; border: 0; border-radius: 2px; background: transparent; color: var(--night-ink); font: 600 14px/1 var(--sans); cursor: pointer; }
.ztools button:hover { background: rgba(239,233,223,.12); }
.ztools .close { margin-left: 6px; border: 1px solid rgba(239,233,223,.3); }
.vp { position: relative; overflow: hidden; touch-action: none; cursor: zoom-in; user-select: none; -webkit-user-select: none; }
.vp.zoomed { cursor: grab; }
.vp.dragging { cursor: grabbing; }
.layer { position: absolute; inset: 0; transform-origin: 0 0; will-change: transform; }
.layer.anim { transition: transform .22s ease; }
.layer img { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; -webkit-user-drag: none; pointer-events: none; }
.layer .hi { opacity: 0; transition: opacity .25s ease; }
.layer .hi.in { opacity: 1; }
.pill { position: absolute; left: 50%; bottom: 20px; transform: translateX(-50%); margin: 0; padding: 8px 14px; border-radius: 999px; background: rgba(21,19,15,.8); border: 1px solid rgba(239,233,223,.2); font: 500 13px/1 var(--sans); white-space: nowrap; pointer-events: none; }
@media (max-width: 480px) {
  .ztitle { display: none; } .ztop { justify-content: flex-end; } .card { padding: 22px 18px; } dl { grid-template-columns: 118px minmax(0, 1fr); gap: 10px 12px; }
  /* The chip would sit on the painting itself: move it down into the toolbar row, left of Download. */
  .zoom { overflow: visible; }
  .stage:has(.bar .dl):not(:has(.rail)) .chip-zoom { right: auto; left: 16px; bottom: -46px; }
}
@media (min-width: 860px) {
  .body { padding: 48px 32px; grid-template-columns: minmax(0, 7fr) minmax(0, 5fr); gap: 56px; align-items: start; }
  .body.solo { grid-template-columns: minmax(0, 720px); }
  .body:not(.solo) .label-col { grid-column: 2; grid-row: 1; }
  .body:not(.solo) .about { grid-column: 1; grid-row: 1; padding-top: 4px; }
  .bar { padding: 8px 32px 14px; }
  .chip-zoom { right: 32px; }
  .err { padding: 96px 32px; }
}
@media (prefers-reduced-motion: reduce) { .zoom img, .layer .hi { opacity: 1; } }`;

class GArtworkView extends HTMLElement {
  static get observedAttributes() { return ["artwork-id"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
    this._loadedId = null;
    this._token = 0;
    this._view = 0;
    this._z = { s: 1, x: 0, y: 0 };
    this._pointers = new Map();
    this._prefetched = new Set();
    this._onResize = () => this._clampPan();
  }
  connectedCallback() {
    loadFonts();
    this.load();
  }
  disconnectedCallback() {
    this._closeZoom();
  }
  // Closes the zoom dialog and drops its listeners, timer and pan/zoom state. Removing an open dialog
  // (a re-render) doesn't fire "close", so this runs before every render too.
  _closeZoom() {
    const dialog = this.shadowRoot.querySelector("dialog");
    if (dialog?.open) dialog.close();
    window.removeEventListener("resize", this._onResize);
    clearTimeout(this._levelTimer);
    this._pointers.clear();
    this._z = { s: 1, x: 0, y: 0 };
  }
  attributeChangedCallback(name, oldValue, newValue) {
    if (oldValue !== newValue && this.isConnected) this.load();
  }
  _id() { return (this.getAttribute("artwork-id") || "").trim(); }

  async load(force = false) {
    const id = this._id();
    if (!force && id === this._loadedId) return;
    this._loadedId = id;
    const token = ++this._token;
    if (!isArtworkId(id)) {
      this._state = { status: "error", invalid: true, message: id ? `“${id}” isn’t an artwork id. Ids look like aic-16568 or met-436535.` : "No artwork was chosen." };
      this.render();
      return;
    }
    this._state = { status: "loading" };
    this._view = 0;
    this.render();
    try {
      const req = READS.artwork(id);
      let art = null;
      // A 200 response the runner couldn't shape is memoised like a good one: drop it and ask once more
      // (and again on "Try again") instead of re-reading the same unusable result.
      for (let attempt = 0; attempt < 2 && !art; attempt++) {
        const res = await readAction(...req);
        const got = payload(res, "title");
        if (got && typeof got === "object" && text(got.title)) art = got;
        else componentReads.delete(`${req[0]} ${JSON.stringify(req[1])}`);
        if (token !== this._token) return;
      }
      if (!art) throw new Error("This artwork wasn’t found in the museums’ collections.");
      if (token !== this._token) return;
      this._state = { status: "ready", art };
    } catch (err) {
      if (token !== this._token) return;
      this._state = { status: "error", message: err?.message || "Couldn’t load this." };
    }
    this.render();
  }

  // The main image plus alternate views; each knows its stage, thumbnail and zoom URLs.
  _views(art) {
    const main = artSrc(art.imageUrl);
    const views = [];
    if (main) views.push({ src: main, thumb: main, large: artSrc(art.largeImageUrl) || main, alt: text(art.imageAlt) });
    const extra = Array.isArray(art.additionalImages) ? art.additionalImages : [];
    for (const v of extra) {
      const src = artSrc(v?.imageUrl) || artSrc(v?.thumbUrl);
      if (!src || views.some((x) => x.src === src)) continue;
      views.push({ src, thumb: artSrc(v?.thumbUrl) || src, large: src, alt: "" });
    }
    return views.slice(0, 12);
  }

  render() {
    const s = this._state;
    let html;
    if (s.status === "loading") html = this._loadingHtml();
    else if (s.status === "error") html = this._errorHtml(s);
    else html = this._readyHtml(s.art);
    this._closeZoom();
    this.shadowRoot.innerHTML = `<style>${TOKENS}${VIEW_CSS}</style>${html}`;
    adoptKitStyle(this.shadowRoot);
    wireImages(this.shadowRoot);
    if (s.status === "ready") this._wire(s.art);
    if (s.status === "error") {
      this.shadowRoot.querySelector(".retry")?.addEventListener("click", () => this.load(true));
    }
  }

  _loadingHtml() {
    return `<div aria-busy="true">
      <div class="sk sk-stage"></div>
      <div class="body">
        <div class="label-col"><div class="card">
          <div class="sk bar-sk" style="width: 38%"></div>
          <h1 class="sk"><span class="sr">Loading artwork…</span></h1>
          <div class="sk bar-sk" style="width: 55%; height: 16px"></div>
          <div class="sk bar-sk" style="width: 30%"></div>
          <div class="sk" style="height: 44px; width: 180px; margin: 22px 0"></div>
          ${[70, 50, 62, 44].map((w) => `<div class="sk bar-sk" style="width: ${w}%"></div>`).join("")}
        </div></div>
        <div class="about">
          <div class="sk bar-sk" style="width: 22%"></div>
          <div class="sk" style="height: 28px; width: 46%; margin: 8px 0 22px"></div>
          ${[96, 92, 98, 88, 94, 60].map((w) => `<div class="sk bar-sk" style="width: ${w}%; height: 14px"></div>`).join("")}
        </div>
      </div>
    </div>`;
  }

  _errorHtml(s) {
    return `<section class="err" role="alert">
      <p class="kicker" style="margin-bottom: 10px">Artwork</p>
      <h1>This artwork couldn’t be loaded.</h1>
      <p>${esc(s.message)}</p>
      <div class="row">
        ${s.invalid ? "" : `<button type="button" class="btn retry">Try again</button>`}
        <a class="link" href="/search/">Search the collections</a>
        <a class="link" href="/highlights">Browse highlights</a>
      </div>
    </section>`;
  }

  _readyHtml(art) {
    const id = this._id();
    const title = text(art.title) || "Untitled";
    const artist = text(art.artist) || "Unknown artist";
    const museum = text(art.museum);
    const views = this._views(art);
    const view = views[this._view] || views[0];
    const alt = (v, i) => v.alt || (i === 0 ? `${title} by ${artist}` : `${title}, view ${i + 1}`);
    const aHref = artistHref(artist);

    // Stage: the uncropped image as a zoom button, then a toolbar of views and the download link.
    const stageImg = view ? artImg(view.src, alt(view, this._view), title, { eager: true }) : placeholder(title);
    const rail = views.length > 1
      ? `<div class="rail" role="group" aria-label="Views of this work">${views.map((v, i) => `<button type="button" class="thumb mat" data-view="${i}" aria-pressed="${i === this._view}" tabindex="${i === this._view ? 0 : -1}" aria-label="${esc(i === 0 ? `Main view (1 of ${views.length})` : `View ${i + 1} of ${views.length}`)}">${artImg(v.thumb, "", title)}</button>`).join("")}</div>`
      : "";
    const download = art.isPublicDomain === true && view
      ? `<a class="dl" href="${esc(view.large)}" download="${esc(fileName(title, view.large))}">⤓ Download<span class="sr"> image (public domain)</span></a>`
      : "";
    const stage = `<section class="stage${rail || download ? "" : " nobar"}" aria-label="Artwork image">
      <button type="button" class="zoom" aria-label="${esc(`Zoom into ${title}`)}" aria-describedby="stage-alt"${view ? "" : " disabled"}>${stageImg}<span class="chip-zoom" aria-hidden="true">⤢ Zoom</span></button>
      <span class="sr" id="stage-alt">${esc(view ? alt(view, this._view) : "Image unavailable")}</span>
      ${rail || download ? `<div class="bar">${rail}${download}</div>` : `<div></div>`}
    </section>`;

    // Wall label, with rows skipped when empty.
    const deptId = text(art.departmentId);
    const dept = text(art.department);
    const collection = dept
      ? `${/^(aic|met)-/.test(deptId) ? `<a class="link" href="${esc(collectionHref(deptId))}">${esc(dept)}</a>` : esc(dept)}${museum ? `<span class="soft">, ${esc(museum)}</span>` : ""}`
      : "";
    const rows = [
      ["Medium", esc(text(art.medium))],
      ["Dimensions", esc(text(art.dimensions))],
      ["Place", esc(text(art.placeOfOrigin))],
      ["Classification", esc(text(art.classification))],
      ["Style", esc(text(art.style))],
      ["Collection", collection],
      ["Credit line", esc(text(art.creditLine))]
    ].filter(([, v]) => v);
    const gallery = text(art.gallery);
    const onView = art.onView === true
      ? `<span class="chip on"><i aria-hidden="true"></i>On view${gallery ? ` · ${esc(/^\d/.test(gallery) ? `Gallery ${gallery}` : gallery)}` : ""}</span>`
      : art.onView === false ? `<span class="chip">Not on view</span>` : "";
    const pd = art.isPublicDomain === true ? `<span class="chip pd">Public domain</span>` : "";
    const src = /^https?:\/\//.test(text(art.sourceUrl)) ? text(art.sourceUrl) : "";
    const label = `<div class="label-col"><article class="card" aria-labelledby="art-title">
      ${museum ? `<p class="label">${esc(museum)}</p>` : ""}
      <h1 id="art-title" class="t">${esc(title)}</h1>
      <p class="who">${aHref ? `<a href="${esc(aHref)}">${esc(artist)}</a>` : esc(artist)}</p>
      ${text(art.artistBio) ? `<p class="bio">${esc(text(art.artistBio))}</p>` : ""}
      ${text(art.date) ? `<p class="date num">${esc(text(art.date))}</p>` : ""}
      <div class="act"><g-add-to-exhibition artwork-id="${esc(id)}"></g-add-to-exhibition></div>
      ${rows.length ? `<hr><dl>${rows.map(([k, v]) => `<dt class="label">${k}</dt><dd>${v}</dd>`).join("")}</dl>` : ""}
      ${onView || pd ? `<div class="chips">${onView}${pd}</div>` : ""}
      ${src ? `<a class="link src" href="${esc(src)}" target="_blank" rel="noopener">View on the museum’s website ↗<span class="sr"> (opens in a new tab)</span></a>` : ""}
    </article></div>`;

    // Museum description, folded after ~700 characters.
    const { head, rest } = foldParas(art.description);
    const about = head.length ? `<section class="about" aria-labelledby="about-h">
      <p class="kicker">From the museum</p>
      <h2 id="about-h">About this work</h2>
      <div class="prose">
        ${head.map((p) => `<p>${esc(p)}</p>`).join("")}
        ${rest.length ? `<div id="rest" hidden>${rest.map((p) => `<p>${esc(p)}</p>`).join("")}</div>
        <button type="button" class="more" aria-expanded="false" aria-controls="rest">Read more <span aria-hidden="true">⌄</span></button>` : ""}
      </div>
      ${museum ? `<p class="credit">Text courtesy of the ${esc(museum.replace(/^the\s+/i, ""))}${/^the met$/i.test(museum) ? " (The Metropolitan Museum of Art)" : ""}.</p>` : ""}
    </section>` : "";

    const dialog = `<dialog aria-labelledby="z-title">
      <div class="ztop">
        <p class="ztitle" id="z-title"><i>${esc(title)}</i><span> · ${esc(artist)}</span></p>
        <div class="ztools" role="toolbar" aria-label="Zoom controls">
          <button type="button" data-z="out" aria-label="Zoom out">−</button>
          <button type="button" data-z="actual" aria-label="Actual size (100%)">100%</button>
          <button type="button" data-z="in" aria-label="Zoom in">+</button>
          <button type="button" data-z="fit" aria-label="Fit to screen">Fit</button>
          <button type="button" data-z="close" class="close">Close</button>
        </div>
      </div>
      <div class="vp" tabindex="0" role="img" aria-label="${esc(`${alt(view || {}, this._view)}. Use plus and minus to zoom, 0 to fit, arrow keys to pan.`)}">
        <div class="layer"><img class="lo" alt=""><img class="hi" alt=""></div>
        <p class="pill" hidden>Loading full resolution…</p>
      </div>
      <p class="sr" aria-live="polite" data-level></p>
    </dialog>`;

    return `${stage}<div class="body${about ? "" : " solo"}">${label}${about}</div>${dialog}`;
  }

  _wire(art) {
    const root = this.shadowRoot;
    const views = this._views(art);
    const zoomBtn = root.querySelector(".zoom");
    const stage = root.querySelector(".stage");
    const stageAlt = root.querySelector("#stage-alt");

    // Tint the stage from the work's own pixels; falls back to --night.
    const tintFrom = (img) => {
      if (!img) return;
      const apply = () => {
        const t = img.naturalWidth ? darkTint(img) : "";
        if (t) stage.style.setProperty("--art-tint", t); else stage.style.removeProperty("--art-tint");
        // Phones: a landscape work gets a stage sized to it, not a mostly empty 72vh box.
        if (img.naturalWidth && img.naturalHeight) stage.style.setProperty("--ar", (img.naturalWidth / img.naturalHeight).toFixed(3));
      };
      const fail = () => { zoomBtn.disabled = true; stageAlt.textContent = "Image unavailable"; stage.style.removeProperty("--art-tint"); };
      if (img.complete && img.naturalWidth) apply();
      else { img.addEventListener("load", apply, { once: true }); img.addEventListener("error", fail, { once: true }); }
    };
    if (!zoomBtn.querySelector("img")) { zoomBtn.disabled = true; stageAlt.textContent = "Image unavailable"; }
    tintFrom(zoomBtn.querySelector("img"));

    // Prefetch the large image when the visitor shows intent to zoom.
    const prefetch = () => {
      const v = views[this._view];
      if (!v || v.large === v.src || this._prefetched.has(v.large)) return;
      this._prefetched.add(v.large);
      const pre = new Image();
      pre.decoding = "async";
      pre.src = v.large;
    };
    zoomBtn.addEventListener("pointerenter", prefetch);
    zoomBtn.addEventListener("focus", prefetch);
    zoomBtn.addEventListener("click", () => this._openZoom(views));

    // View rail: aria-pressed buttons with roving focus (arrows, Home, End).
    const thumbs = [...root.querySelectorAll(".thumb")];
    const select = (i, focus) => {
      const v = views[i];
      if (!v) return;
      this._view = i;
      thumbs.forEach((t, j) => { t.setAttribute("aria-pressed", String(j === i)); t.tabIndex = j === i ? 0 : -1; });
      if (focus) thumbs[i].focus();
      const title = text(art.title) || "Untitled";
      const altText = v.alt || (i === 0 ? `${title} by ${text(art.artist) || "Unknown artist"}` : `${title}, view ${i + 1}`);
      zoomBtn.querySelectorAll("img, .ph").forEach((n) => n.remove());
      zoomBtn.insertAdjacentHTML("afterbegin", artImg(v.src, altText, title, { eager: true }));
      wireImages(zoomBtn);
      zoomBtn.disabled = !zoomBtn.querySelector("img");
      stageAlt.textContent = zoomBtn.disabled ? "Image unavailable" : altText;
      tintFrom(zoomBtn.querySelector("img"));
      root.querySelector(".vp")?.setAttribute("aria-label", `${altText}. Use plus and minus to zoom, 0 to fit, arrow keys to pan.`);
      const dl = root.querySelector(".dl");
      if (dl) { dl.href = v.large; dl.setAttribute("download", fileName(title, v.large)); }
    };
    thumbs.forEach((t, i) => {
      t.addEventListener("click", () => select(i, false));
      t.addEventListener("keydown", (e) => {
        const n = thumbs.length;
        const to = e.key === "ArrowRight" || e.key === "ArrowDown" ? (i + 1) % n
          : e.key === "ArrowLeft" || e.key === "ArrowUp" ? (i - 1 + n) % n
          : e.key === "Home" ? 0 : e.key === "End" ? n - 1 : -1;
        if (to < 0) return;
        e.preventDefault();
        select(to, true);
      });
    });

    // Read more / Show less.
    const more = root.querySelector(".more");
    const rest = root.querySelector("#rest");
    if (more && rest) {
      more.addEventListener("click", () => {
        const open = more.getAttribute("aria-expanded") !== "true";
        more.setAttribute("aria-expanded", String(open));
        rest.hidden = !open;
        more.firstChild.textContent = open ? "Show less " : "Read more ";
      });
    }

    this._wireDialog();
  }

  // ---- Zoom dialog -------------------------------------------------------------------------------------
  _openZoom(views) {
    const root = this.shadowRoot;
    const dialog = root.querySelector("dialog");
    const v = views[this._view];
    if (!dialog || !v || typeof dialog.showModal !== "function") return;
    const lo = root.querySelector(".layer .lo");
    const hi = root.querySelector(".layer .hi");
    const pill = root.querySelector(".pill");
    this._z = { s: 1, x: 0, y: 0 };
    lo.src = v.src;
    hi.classList.remove("in");
    hi.onload = null; hi.onerror = null;
    if (v.large && v.large !== v.src) {
      pill.hidden = false;
      hi.onload = () => { hi.classList.add("in"); pill.hidden = true; this._clampPan(); };
      hi.onerror = () => { pill.hidden = true; hi.removeAttribute("src"); };
      hi.src = v.large;
      if (hi.complete && hi.naturalWidth) hi.onload();
    } else {
      pill.hidden = true;
      hi.removeAttribute("src");
    }
    lo.onload = () => this._clampPan();
    dialog.showModal();
    window.addEventListener("resize", this._onResize);
    this._apply(false);
    root.querySelector(".vp").focus();
  }

  _wireDialog() {
    const root = this.shadowRoot;
    const dialog = root.querySelector("dialog");
    const vp = root.querySelector(".vp");
    if (!dialog || !vp) return;
    const center = () => [vp.clientWidth / 2, vp.clientHeight / 2];
    const actions = {
      in: () => this._zoomTo(this._z.s * 1.5, ...center(), true),
      out: () => this._zoomTo(this._z.s / 1.5, ...center(), true),
      fit: () => this._zoomTo(1, ...center(), true),
      actual: () => {
        const img = root.querySelector(".layer .hi.in") || root.querySelector(".layer .lo");
        const box = this._contentBox();
        this._zoomTo(img?.naturalWidth && box.w ? img.naturalWidth / box.w : 1, ...center(), true);
      },
      close: () => dialog.close()
    };
    root.querySelectorAll("[data-z]").forEach((b) => b.addEventListener("click", () => actions[b.dataset.z]()));
    dialog.addEventListener("close", () => {
      window.removeEventListener("resize", this._onResize);
      this._pointers.clear();
      root.querySelector(".zoom")?.focus();
    });
    dialog.addEventListener("keydown", (e) => {
      if (e.altKey || e.ctrlKey || e.metaKey) return;
      const k = e.key;
      if (k === "+" || k === "=") actions.in();
      else if (k === "-" || k === "_") actions.out();
      else if (k === "0") actions.fit();
      else if (k.startsWith("Arrow")) {
        const dx = k === "ArrowLeft" ? 80 : k === "ArrowRight" ? -80 : 0;
        const dy = k === "ArrowUp" ? 80 : k === "ArrowDown" ? -80 : 0;
        this._z.x += dx; this._z.y += dy;
        this._clampPan(); this._apply(true);
      } else return;
      e.preventDefault();
    });

    // Wheel zooms around the pointer.
    vp.addEventListener("wheel", (e) => {
      e.preventDefault();
      const r = vp.getBoundingClientRect();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? r.height : 1;
      this._zoomTo(this._z.s * Math.exp(-e.deltaY * unit * 0.0015), e.clientX - r.left, e.clientY - r.top, false);
    }, { passive: false });

    // Drag pans, two pointers pinch, double-click / double-tap toggles 1x and 2.5x.
    let lastTap = null;
    let moved = 0;
    let lastType = "mouse";
    const toggle = (x, y) => this._zoomTo(this._z.s > 1.01 ? 1 : 2.5, x, y, true);
    const local = (e) => { const r = vp.getBoundingClientRect(); return { x: e.clientX - r.left, y: e.clientY - r.top }; };
    vp.addEventListener("pointerdown", (e) => {
      if (e.button > 0) return;
      lastType = e.pointerType;
      vp.setPointerCapture?.(e.pointerId);
      this._pointers.set(e.pointerId, local(e));
      if (this._pointers.size === 1) moved = 0;
      vp.classList.toggle("dragging", this._z.s > 1);
    });
    vp.addEventListener("pointermove", (e) => {
      const prev = this._pointers.get(e.pointerId);
      if (!prev) return;
      const p = local(e);
      if (this._pointers.size === 1) {
        moved += Math.abs(p.x - prev.x) + Math.abs(p.y - prev.y);
        this._pointers.set(e.pointerId, p);
        if (this._z.s <= 1) return;
        this._z.x += p.x - prev.x; this._z.y += p.y - prev.y;
        this._clampPan(); this._apply(false);
        return;
      }
      const pts = [...this._pointers.entries()].slice(0, 2);
      if (!pts.some(([pid]) => pid === e.pointerId)) return;
      const other = pts.find(([pid]) => pid !== e.pointerId)[1];
      const d0 = Math.hypot(prev.x - other.x, prev.y - other.y) || 1;
      const d1 = Math.hypot(p.x - other.x, p.y - other.y) || 1;
      const m0 = { x: (prev.x + other.x) / 2, y: (prev.y + other.y) / 2 };
      const m1 = { x: (p.x + other.x) / 2, y: (p.y + other.y) / 2 };
      moved += 99;
      this._pointers.set(e.pointerId, p);
      this._z.x += m1.x - m0.x; this._z.y += m1.y - m0.y;
      this._zoomTo(this._z.s * (d1 / d0), m1.x, m1.y, false);
    });
    const end = (e) => {
      if (!this._pointers.has(e.pointerId)) return;
      const p = this._pointers.get(e.pointerId);
      this._pointers.delete(e.pointerId);
      vp.classList.remove("dragging");
      if (e.type !== "pointerup" || e.pointerType !== "touch" || this._pointers.size || moved > 12) return;
      const now = Date.now();
      if (lastTap && now - lastTap.t < 320 && Math.hypot(p.x - lastTap.x, p.y - lastTap.y) < 32) { lastTap = null; toggle(p.x, p.y); }
      else lastTap = { t: now, x: p.x, y: p.y };
    };
    vp.addEventListener("pointerup", end);
    vp.addEventListener("pointercancel", end);
    vp.addEventListener("dblclick", (e) => {
      if (lastType === "touch") return;
      const p = local(e);
      toggle(p.x, p.y);
    });
  }

  // Where the contained image actually sits inside the viewport (at scale 1).
  _contentBox() {
    const root = this.shadowRoot;
    const vp = root.querySelector(".vp");
    const lo = root.querySelector(".layer .lo");
    const W = vp?.clientWidth || 0, H = vp?.clientHeight || 0;
    const iw = lo?.naturalWidth, ih = lo?.naturalHeight;
    if (!iw || !ih || !W || !H) return { W, H, w: W, h: H, ox: 0, oy: 0 };
    const r = Math.min(W / iw, H / ih);
    const w = iw * r, h = ih * r;
    return { W, H, w, h, ox: (W - w) / 2, oy: (H - h) / 2 };
  }
  _clampPan() {
    const { W, H, w, h, ox, oy } = this._contentBox();
    const z = this._z;
    if (w * z.s <= W) z.x = (W - w * z.s) / 2 - ox * z.s;
    else z.x = clampN(z.x, W - (ox + w) * z.s, -ox * z.s);
    if (h * z.s <= H) z.y = (H - h * z.s) / 2 - oy * z.s;
    else z.y = clampN(z.y, H - (oy + h) * z.s, -oy * z.s);
    this._apply(null);
  }
  _zoomTo(target, px, py, animate) {
    const z = this._z;
    const s2 = clampN(target, 1, 6);
    const k = s2 / z.s;
    z.x = px - (px - z.x) * k;
    z.y = py - (py - z.y) * k;
    z.s = s2;
    this._clampPan();
    this._apply(animate);
  }
  // animate: true = eased (buttons, keys, double-click), false = live (gestures), null = keep.
  _apply(animate) {
    const root = this.shadowRoot;
    const layer = root.querySelector(".layer");
    if (!layer) return;
    if (animate !== null) layer.classList.toggle("anim", animate);
    const { s, x, y } = this._z;
    layer.style.transform = `translate(${x}px, ${y}px) scale(${s})`;
    root.querySelector(".vp")?.classList.toggle("zoomed", s > 1.01);
    const level = root.querySelector("[data-level]");
    const pct = `Zoom ${Math.round(s * 100)}%`;
    if (level && level.textContent !== pct) {
      clearTimeout(this._levelTimer);
      this._levelTimer = setTimeout(() => { level.textContent = pct; }, 250);
    }
  }
}
if (!customElements.get("g-artwork-view")) customElements.define("g-artwork-view", GArtworkView);
