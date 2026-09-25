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

class GPostView extends HTMLElement {
  static get observedAttributes() { return ["post"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._mode = "view"; // view | edit | confirm-delete
    this._busy = false;
    this._error = "";
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  async act(body, then) {
    const p = json(this.getAttribute("post"), {}) || {};
    this._busy = true; this._error = ""; this.render();
    try {
      await postAction(`/post/${encodeURIComponent(p.id)}`, { postId: p.id, outputFormat: { ok: "boolean" }, ...body });
      then();
    } catch (err) {
      this._busy = false; this._error = err.message; this.render();
    }
  }
  render() {
    const p = json(this.getAttribute("post"), {}) || {};
    const paragraphs = String(p.body || "").split(/\n{2,}/).filter((x) => x.trim());
    const comments = Number(p.commentCount) || 0;
    const editing = this._mode === "edit";
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      article { display: grid; gap: 12px; background: var(--card); padding: 20px; border-radius: 8px; }
      h1 { margin: 0; font: 800 28px/1.2 var(--display); letter-spacing: -0.01em; text-wrap: balance; overflow-wrap: anywhere; }
      .meta { color: var(--soft); font-size: 13px; margin: 0; }
      .body { display: grid; gap: 10px; }
      .body p { margin: 0; font-size: 16px; line-height: 1.65; max-width: 64ch; white-space: pre-wrap; overflow-wrap: anywhere; }
      .tags { display: flex; gap: 6px; flex-wrap: wrap; }
      footer { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; font-size: 13px; color: var(--soft); border-top: 1px solid var(--rule); padding-top: 10px; }
      footer a { text-decoration: none; }
      .link { background: none; border: 0; padding: 0; font: 13px var(--text); color: var(--soft); cursor: pointer; text-decoration: underline; }
      .danger { color: #b3381a; }
      input, textarea { font: 15px/1.5 var(--text); color: var(--ink); border: 1px solid #cfcfc6; border-radius: 6px; padding: 9px 11px; width: 100%; background: #fcfcfa; }
      textarea { min-height: 160px; resize: vertical; }
      .btn { font: 700 14px var(--display); color: #fff; background: var(--pine); border: 0; border-radius: 6px; padding: 8px 14px; cursor: pointer; }
      .btn.red { background: #b3381a; }
    </style>
    <article>${p.boardId ? `<a class="tag" href="/b/${encodeURIComponent(p.boardId)}" style="justify-self:start">${esc(p.board?.name || p.boardId)}</a>` : ""}
      ${editing ? `<input id="edit-title" value="${esc(p.title)}" maxlength="200" aria-label="Title"><textarea id="edit-body" maxlength="10000" aria-label="Post">${esc(p.body)}</textarea>`
        : `<h1>${esc(p.title)}</h1><p class="meta">${esc(p.author?.displayName || "unknown")} · ${esc(ago(p.createdAt))}${p.edited ? " · edited" : ""}</p>
           <div class="body">${paragraphs.map((x) => `<p>${esc(x)}</p>`).join("")}</div>`}
      ${!editing && (p.tags || []).length ? `<div class="tags">${p.tags.map((t) => `<span class="tag">#${esc(t)}</span>`).join("")}</div>` : ""}
      <footer>${editing ? `<button type="button" class="btn save" ${this._busy ? "disabled" : ""}>${this._busy ? "Saving…" : "Save changes"}</button><button type="button" class="link cancel">Cancel</button>`
        : this._mode === "confirm-delete" ? `<span>Delete this post? Comments stay readable.</span><button type="button" class="btn red yes" ${this._busy ? "disabled" : ""}>${this._busy ? "Deleting…" : "Delete post"}</button><button type="button" class="link cancel">Keep it</button>`
        : `<g-vote-control compact post-id="${esc(p.id)}" score="${esc(p.score ?? 0)}" my-vote="${esc(p.myVote ?? 0)}"></g-vote-control><a href="#comments">${comments} comment${comments === 1 ? "" : "s"}</a>
           ${p.mine ? `<button type="button" class="link edit">Edit</button><button type="button" class="link danger del">Delete</button>` : ""}`}</footer>
      ${this._error ? `<p class="error" role="alert">${esc(this._error)}</p>` : ""}</article>`;
    const on = (sel, fn) => { const el = this.shadowRoot.querySelector(sel); if (el) el.addEventListener("click", fn); };
    on(".edit", () => { this._mode = "edit"; this.render(); });
    on(".del", () => { this._mode = "confirm-delete"; this.render(); });
    on(".cancel", () => { this._mode = "view"; this._error = ""; this.render(); });
    on(".yes", () => this.act({ intent: "delete post" }, () => { location.href = "/"; }));
    on(".save", () => this.act({
      intent: "edit post",
      title: this.shadowRoot.querySelector("#edit-title").value,
      body: this.shadowRoot.querySelector("#edit-body").value
    }, () => location.reload()));
  }
}
customElements.define("g-post-view", GPostView);
