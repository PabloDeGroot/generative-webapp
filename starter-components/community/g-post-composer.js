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

const DEFAULT_BOARDS = [
  { id: "general", name: "General" }, { id: "show-and-tell", name: "Show and tell" }, { id: "questions", name: "Questions" },
  { id: "ideas", name: "Ideas" }, { id: "off-topic", name: "Off-topic" }
];

class GPostComposer extends HTMLElement {
  static get observedAttributes() { return ["board"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._busy = false;
    this._error = "";
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  async publish(form) {
    const f = new FormData(form);
    const tags = String(f.get("tags") || "").split(",").map((t) => t.trim()).filter(Boolean).slice(0, 5);
    this._busy = true; this._error = ""; this.render(f);
    try {
      const data = await postAction("/submit", {
        intent: "create a post", board: f.get("board"), title: f.get("title"), body: f.get("body"), tags,
        outputFormat: { ok: "boolean", postId: "string" }
      });
      const id = data && (data.postId || data.id || data.data?.id);
      if (id) location.href = `/post/${encodeURIComponent(id)}`; else location.reload();
    } catch (err) {
      this._busy = false; this._error = err.message; this.render(f);
    }
  }
  render(values) {
    const boards = DEFAULT_BOARDS;
    const selected = values?.get("board") || this.getAttribute("board") || "";
    const v = (k) => esc(values?.get(k) || "");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      form { display: grid; gap: 10px; background: var(--card); padding: 18px 20px; border-radius: 8px; }
      .two { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; }
      @media (max-width: 520px) { .two { grid-template-columns: 1fr; } }
      .field { display: grid; gap: 5px; }
      label { font-weight: 700; font-size: 14px; }
      input, select, textarea { font: 15px/1.5 var(--text); color: var(--ink); background: #fcfcfa; border: 1px solid #cfcfc6; border-radius: 6px; padding: 9px 11px; width: 100%; }
      textarea { min-height: 180px; resize: vertical; }
      .foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--soft); }
      button { font: 700 14px var(--display); color: #fff; background: var(--pine); border: 0; border-radius: 6px; padding: 10px 18px; cursor: pointer; }
      button[disabled] { opacity: .6; cursor: default; }
    </style>
    <form><div class="two"><div class="field"><label for="pc-board">Board</label><select id="pc-board" name="board" required>${boards.map((b) => `<option value="${esc(b.id)}" ${b.id === selected ? "selected" : ""}>${esc(b.name || b.id)}</option>`).join("")}</select></div>
        <div class="field"><label for="pc-tags">Tags</label><input id="pc-tags" name="tags" placeholder="travel, weather" value="${v("tags")}"></div></div>
      <div class="field"><label for="pc-title">Title</label><input id="pc-title" name="title" required maxlength="200" value="${v("title")}"></div>
      <div class="field"><label for="pc-body">Post</label><textarea id="pc-body" name="body" required maxlength="10000">${v("body")}</textarea></div>
      <div class="foot"><span>Up to 5 posts per hour · up to 5 tags</span><button type="submit" ${this._busy ? "disabled" : ""}>${this._busy ? "Publishing…" : "Publish post"}</button></div>
      ${this._error ? `<p class="error" role="alert">${esc(this._error)}</p>` : ""}</form>`;
    this.shadowRoot.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); this.publish(e.target); });
  }
}
customElements.define("g-post-composer", GPostComposer);
