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

class GCommentThread extends HTMLElement {
  static get observedAttributes() { return ["post-id", "comments"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._replyTo = null;
    this._confirm = null;
    this._error = "";
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  count(list) { return list.reduce((n, c) => n + 1 + this.count(c.replies || []), 0); }
  node(c) {
    const postId = this.getAttribute("post-id") || "";
    const name = c.deleted ? "[deleted]" : c.author?.displayName || "unknown";
    const actions = c.deleted ? "" : `<div class="act"><g-vote-control compact post-id="${esc(postId)}" comment-id="${esc(c.id)}" score="${esc(c.score ?? 0)}" my-vote="${esc(c.myVote ?? 0)}"></g-vote-control>
        <button type="button" class="link" data-reply="${esc(c.id)}">Reply</button>
        ${c.mine ? (this._confirm === c.id ? `<span>Delete?</span><button type="button" class="link danger" data-yes="${esc(c.id)}">Yes, delete</button><button type="button" class="link" data-no>Cancel</button>`
          : `<button type="button" class="link danger" data-del="${esc(c.id)}">Delete</button>`) : ""}</div>`;
    const reply = this._replyTo === c.id ? `<g-reply-form post-id="${esc(postId)}" parent-comment-id="${esc(c.id)}" replying-to="${esc(name)}"></g-reply-form>` : "";
    const replies = (c.replies || []).length ? `<div class="replies">${c.replies.map((r) => this.node(r)).join("")}</div>` : "";
    return `<div class="c ${c.deleted ? "deleted" : ""}" id="c-${esc(c.id)}"><p class="who"><b>${esc(name)}</b> · ${esc(ago(c.createdAt))}${c.edited && !c.deleted ? " · edited" : ""}</p>
      <p class="text">${c.deleted ? "This comment was deleted." : esc(c.body)}</p>${actions}${reply}${replies}</div>`;
  }
  async remove(commentId) {
    const postId = this.getAttribute("post-id");
    try {
      await postAction(`/post/${encodeURIComponent(postId)}`, { intent: "delete comment", postId, commentId, outputFormat: { ok: "boolean" } });
      location.reload();
    } catch (err) {
      this._error = err.message; this.render();
    }
  }
  render() {
    const comments = json(this.getAttribute("comments"), []) || [];
    const total = this.count(comments);
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      section { display: grid; gap: 14px; background: var(--card); padding: 16px 18px; border-radius: 8px; }
      h2 { margin: 0; font: 700 18px var(--display); }
      .c { display: grid; gap: 4px; }
      .who { margin: 0; font-size: 13px; color: var(--soft); }
      .who b { color: var(--ink); }
      .text { margin: 0; font-size: 15px; line-height: 1.55; white-space: pre-wrap; overflow-wrap: anywhere; }
      .deleted .text, .deleted .who b { color: var(--soft); font-style: italic; }
      .act { display: flex; align-items: center; flex-wrap: wrap; gap: 10px; font-size: 12.5px; color: var(--soft); }
      .link { background: none; border: 0; padding: 0; font: 12.5px var(--text); color: var(--soft); cursor: pointer; }
      .link:hover { color: var(--pine); text-decoration: underline; }
      .danger { color: #b3381a; }
      .replies { display: grid; gap: 12px; border-left: 2px solid var(--rule); margin-left: 4px; padding-left: 14px; margin-top: 6px; }
      .empty { margin: 0; color: var(--soft); font-size: 14px; }
    </style>
    <section id="comments"><h2>${total} comment${total === 1 ? "" : "s"}</h2>
      <g-reply-form post-id="${esc(this.getAttribute("post-id"))}"></g-reply-form>
      ${comments.length ? comments.map((c) => this.node(c)).join("") : `<p class="empty">No comments yet. Start the conversation.</p>`}
      ${this._error ? `<p class="error" role="alert">${esc(this._error)}</p>` : ""}</section>`;
    this.shadowRoot.querySelectorAll("[data-reply]").forEach((b) => b.addEventListener("click", () => { this._replyTo = this._replyTo === b.dataset.reply ? null : b.dataset.reply; this.render(); }));
    this.shadowRoot.querySelectorAll("[data-del]").forEach((b) => b.addEventListener("click", () => { this._confirm = b.dataset.del; this.render(); }));
    this.shadowRoot.querySelectorAll("[data-no]").forEach((b) => b.addEventListener("click", () => { this._confirm = null; this.render(); }));
    this.shadowRoot.querySelectorAll("[data-yes]").forEach((b) => b.addEventListener("click", () => this.remove(b.dataset.yes)));
  }
}
customElements.define("g-comment-thread", GCommentThread);
