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

class GNotificationItem extends HTMLElement {
  static get observedAttributes() { return ["notification"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  render() {
    const n = json(this.getAttribute("notification"), {}) || {};
    const what = n.type === "comment-reply" ? "your comment" : "your post";
    const href = `/post/${encodeURIComponent(n.postId || "")}${n.commentId ? `#c-${encodeURIComponent(n.commentId)}` : ""}`;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      a { display: grid; grid-template-columns: 10px 1fr auto; gap: 10px; align-items: start; text-decoration: none; background: var(--card); border: 1px solid var(--rule); border-radius: 8px; padding: 10px 12px; font-size: 14px; }
      a:hover { border-color: var(--pine); }
      .dot { width: 8px; height: 8px; border-radius: 50%; margin-top: 6px; background: ${n.read ? "transparent" : "var(--up)"}; }
      small { display: block; color: var(--soft); font-size: 13px; margin-top: 2px; overflow-wrap: anywhere; }
      .on { color: var(--soft); }
      time { font-size: 12px; color: var(--soft); white-space: nowrap; }
    </style>
    <a href="${href}"><span class="dot" aria-label="${n.read ? "Read" : "Unread"}"></span>
      <div><b>${esc(n.fromName || "Someone")}</b> replied to ${what}${n.postTitle ? ` <span class="on">on “${esc(n.postTitle)}”</span>` : ""}${n.excerpt ? `<small>“${esc(n.excerpt)}”</small>` : ""}</div>
      <time>${esc(ago(n.createdAt))}</time></a>`;
  }
}
customElements.define("g-notification-item", GNotificationItem);
