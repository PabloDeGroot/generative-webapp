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

const LINKS = [["home", "Home", "/"], ["boards", "Boards", "/boards"], ["new", "New post", "/submit"]];

class GSiteHeader extends HTMLElement {
  static get observedAttributes() { return ["site-name", "current", "unread"]; }
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
    const current = (this.getAttribute("current") || "").toLowerCase();
    const unread = Number(this.getAttribute("unread")) || 0;
    const links = LINKS.map(([key, label, href]) => `<a href="${href}" class="${key === current ? "on" : ""}">${label}</a>`).join("");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      header { display: flex; align-items: center; gap: 18px; flex-wrap: wrap; padding: 12px 20px; background: var(--card); border-bottom: 1px solid var(--rule); }
      .logo { font: 800 21px var(--display); letter-spacing: -0.02em; color: var(--pine); text-decoration: none; }
      nav { display: flex; gap: 16px; flex-wrap: wrap; font-size: 14px; }
      nav a, ::slotted(a) { text-decoration: none; }
      nav a:hover { color: var(--pine); }
      nav a.on { font-weight: 700; color: var(--pine); }
      .right { margin-left: auto; display: flex; align-items: center; gap: 14px; }
      .bell { position: relative; text-decoration: none; font-size: 18px; }
      .bell b { position: absolute; top: -7px; right: -11px; background: var(--up); color: #fff; font: 700 10px var(--text); border-radius: 999px; padding: 1px 5px; }
    </style>
    <header><a class="logo" href="/">${esc(this.getAttribute("site-name") || "Commons")}</a><nav><slot name="nav">${links}</slot></nav>
      <div class="right"><a class="bell" href="/notifications" aria-label="Notifications${unread ? `, ${unread} unread` : ""}">🔔${unread ? `<b>${unread > 99 ? "99+" : unread}</b>` : ""}</a><slot name="account"></slot></div></header>`;
  }
}
customElements.define("g-site-header", GSiteHeader);
