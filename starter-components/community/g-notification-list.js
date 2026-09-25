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
const NOTIFICATIONS_FORMAT = { unread: "number", notifications: [{ id: "string", type: "string", postId: "string", postTitle: "string", commentId: "string", fromName: "string", excerpt: "string", createdAt: "string", read: "boolean" }] };

class GNotificationList extends HTMLElement {
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = { status: "loading" };
    this._busy = false;
  }
  connectedCallback() {
    loadFonts();
    this.load();
  }
  async load() {
    this._state = { status: "loading" }; this.render();
    try {
      const res = await readAction("/notifications", { intent: "list my notifications", outputFormat: NOTIFICATIONS_FORMAT });
      this._state = { status: "ready", unread: Number(field(res, "unread")) || 0, list: field(res, "notifications") || [] };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  async markAllRead() {
    this._busy = true; this.render();
    try {
      await postAction("/notifications", { intent: "mark all my notifications as read", outputFormat: { ok: "boolean" } });
      location.reload();
    } catch (err) {
      this._busy = false; this._state = { ...this._state, error: err.message }; this.render();
    }
  }
  render() {
    const { status, unread = 0, list = [], message, error } = this._state;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 8px; padding: 12px 16px; }
      header { display: flex; justify-content: space-between; align-items: center; gap: 10px; font-size: 14px; color: var(--soft); }
      button { background: none; border: 0; font: 700 13px var(--display); color: var(--pine); cursor: pointer; padding: 0; }
      p { margin: 0; color: var(--soft); font-size: 15px; }
    </style>
    <div class="wrap" aria-busy="${status === "loading"}">${status === "loading" ? `<p>Loading notifications…</p>` : status === "error" ? `<p>${esc(message)}</p>` : `
      <header><span>${unread ? `${unread} unread` : "All caught up"}</span>${unread ? `<button type="button" ${this._busy ? "disabled" : ""}>${this._busy ? "Marking…" : "Mark all read"}</button>` : ""}</header>
      ${list.length ? list.map((n) => `<g-notification-item type="${esc(n.type)}" from-name="${esc(n.fromName)}" post-id="${esc(n.postId)}" post-title="${esc(n.postTitle)}" comment-id="${esc(n.commentId)}" excerpt="${esc(n.excerpt)}" created-at="${esc(n.createdAt)}"${n.read ? " read" : ""}></g-notification-item>`).join("") : `<p>No replies yet. When someone answers your posts or comments, it shows up here.</p>`}
      ${error ? `<p class="error" role="alert">${esc(error)}</p>` : ""}`}</div>`;
    const b = this.shadowRoot.querySelector("button");
    if (b) b.addEventListener("click", () => this.markAllRead());
  }
}
customElements.define("g-notification-list", GNotificationList);
