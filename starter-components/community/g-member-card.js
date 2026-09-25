const FONT_HREF = "https://fonts.googleapis.com/css2?family=Archivo:wght@500;700;800&family=Atkinson+Hyperlegible:wght@400;700&display=swap";
function loadFonts() {
  if (document.querySelector("link[data-kit-fonts=\"commons\"]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = FONT_HREF; link.dataset.kitFonts = "commons";
  document.head.appendChild(link);
}
// Community text is stored HTML-escaped and may reach us decoded or not: decode once, then always escape.
const ENTITIES = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "\x27" };
const esc = (v) => String(v ?? "").replace(/&(amp|lt|gt|quot|#39);/g, (m) => ENTITIES[m]).replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));
const json = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
function ago(iso) {
  const t = Date.parse(iso);
  if (isNaN(t)) return "";
  const s = Math.max(0, (Date.now() - t) / 1000);
  if (s < 60) return "just now";
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  if (s < 172800) return "yesterday";
  if (s < 2592000) return `${Math.floor(s / 86400)}d ago`;
  return new Date(t).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" });
}
async function postAction(route, body) {
  const res = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error(res.status === 401 ? "Sign in to do that." : (data && (data.message || data.error)) || "That didn\x27t work. Try again.");
  }
  return data;
}
const TOKENS = `:host { display: block; --paper: #f6f6f3; --card: #ffffff; --ink: #22262b; --soft: #6b7178; --pine: #2d6a4c; --pine-tint: #e8f0eb; --up: #e0582c; --down: #3a6ea5; --rule: #e2e2dc;
  --display: "Archivo", system-ui, sans-serif; --text: "Atkinson Hyperlegible", system-ui, sans-serif;
  color: var(--ink); font-family: var(--text); }
* { box-sizing: border-box; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--pine); outline-offset: 2px; }
.tag { display: inline-block; font-size: 12px; font-weight: 700; padding: 1px 8px; border-radius: 4px; background: var(--pine-tint); color: var(--pine); text-decoration: none; }
.error { color: #b3381a; font-size: 13px; margin: 0; }`;

// Data too large or structured for attributes is fetched by the component itself through the site's
// action runner (POST with an intent). Identical reads on one page share a single request, and the
// server caches read results, so repeat visits don't run the LLM again.
const componentReads = (window.__gComponentReads ??= new Map());
async function postJson(route, body) {
  const res = await fetch(route, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  let data = null;
  try { data = await res.json(); } catch { /* no JSON body */ }
  if (!res.ok || (data && data.ok === false)) {
    throw new Error(res.status === 401 ? "Sign in to see this." : (data && (data.message || data.error)) || "Couldn\x27t load this.");
  }
  return data;
}
function readAction(route, body) {
  const key = `${route} ${JSON.stringify(body)}`;
  if (!componentReads.has(key)) componentReads.set(key, postJson(route, body).catch((err) => { componentReads.delete(key); throw err; }));
  return componentReads.get(key);
}
// Responses follow the requested outputFormat; when the runner couldn't shape them, the raw tool
// result arrives under data.
const field = (res, key) => (res && typeof res === "object" ? (res[key] ?? res.data?.[key]) : undefined);
const PROFILE_FORMAT = { displayName: "string", photoURL: "string", bio: "string", memberSince: "string", postCount: "number", commentCount: "number", karma: "number" };

class GMemberCard extends HTMLElement {
  static get observedAttributes() { return ["user-id"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
  }
  connectedCallback() {
    loadFonts();
    this.load();
  }
  attributeChangedCallback() { if (this.isConnected) this.load(); }
  async load() {
    const userId = this.getAttribute("user-id") || undefined;
    this._state = { status: "loading" }; this.render();
    try {
      const res = await readAction(`/u/${encodeURIComponent(userId || "me")}`, { intent: "get a member profile", userId, outputFormat: PROFILE_FORMAT });
      const p = res && typeof res === "object" ? (res.displayName ? res : res.data || {}) : {};
      this._state = { status: "ready", p };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  render() {
    const { status, p = {}, message } = this._state;
    const name = p.displayName || (status === "ready" ? "Member" : "");
    const initial = name.replace(/&[a-z#0-9]+;/gi, "").trim().charAt(0).toUpperCase() || "·";
    const since = p.memberSince ? new Date(p.memberSince).toLocaleDateString(undefined, { month: "short", year: "numeric" }) : "";
    const photo = typeof p.photoURL === "string" && /^https:\/\//.test(p.photoURL) ? p.photoURL : "";
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .card { display: grid; grid-template-columns: 64px 1fr; gap: 14px; align-items: center; padding: 18px 20px; background: var(--card); border-radius: 8px; }
      .av { width: 64px; height: 64px; border-radius: 50%; background: #d7e6dd; color: var(--pine); display: grid; place-items: center; font: 800 24px var(--display); overflow: hidden; }
      .av img { width: 100%; height: 100%; object-fit: cover; }
      b { font: 800 20px var(--display); overflow-wrap: anywhere; }
      .stats { display: flex; gap: 16px; flex-wrap: wrap; font-size: 13px; color: var(--soft); margin-top: 4px; }
      .stats strong { color: var(--ink); font-variant-numeric: tabular-nums; }
      .bio { grid-column: 1 / -1; margin: 0; font-size: 14px; line-height: 1.55; overflow-wrap: anywhere; }
      .note { color: var(--soft); font-size: 14px; }
    </style>
    <div class="card" aria-busy="${status === "loading"}"><span class="av">${photo ? `<img src="${esc(photo)}" alt="" referrerpolicy="no-referrer">` : esc(initial)}</span>
      ${status === "loading" ? `<span class="note">Loading profile…</span>` : status === "error" ? `<span class="note">${esc(message)}</span>`
        : `<div><b>${esc(name)}</b><div class="stats"><span><strong>${Number(p.karma) || 0}</strong> karma</span><span><strong>${Number(p.postCount) || 0}</strong> posts</span><span><strong>${Number(p.commentCount) || 0}</strong> comments</span>${since ? `<span>since ${esc(since)}</span>` : ""}</div></div>
      ${p.bio ? `<p class="bio">${esc(p.bio)}</p>` : ""}`}</div>`;
  }
}
customElements.define("g-member-card", GMemberCard);
