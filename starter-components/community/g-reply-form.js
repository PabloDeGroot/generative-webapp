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

const MAX = 5000;

class GReplyForm extends HTMLElement {
  static get observedAttributes() { return ["post-id", "parent-comment-id", "replying-to"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._draft = "";
    this._busy = false;
    this._error = "";
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  async submit() {
    const body = this._draft.trim();
    if (!body || this._busy) return;
    const postId = this.getAttribute("post-id");
    this._busy = true; this._error = ""; this.render();
    try {
      await postAction(`/post/${encodeURIComponent(postId)}`, {
        intent: "add a comment", postId, body, parentCommentId: this.getAttribute("parent-comment-id") || undefined,
        outputFormat: { ok: "boolean", id: "string" }
      });
      location.reload();
    } catch (err) {
      this._busy = false; this._error = err.message; this.render();
    }
  }
  render() {
    const to = this.getAttribute("replying-to");
    const isReply = this.hasAttribute("parent-comment-id");
    const uid = `r-${this.getAttribute("parent-comment-id") || this.getAttribute("post-id") || "x"}`;
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      form { display: grid; gap: 8px; background: var(--card); padding: 14px 16px; border-radius: 8px; }
      label { font-weight: 700; font-size: 14px; }
      textarea { font: 15px/1.5 var(--text); color: var(--ink); background: #fcfcfa; border: 1px solid #cfcfc6; border-radius: 6px; padding: 9px 11px; min-height: 84px; resize: vertical; width: 100%; }
      .foot { display: flex; justify-content: space-between; align-items: center; gap: 10px; flex-wrap: wrap; font-size: 12px; color: var(--soft); }
      button { font: 700 14px var(--display); color: #fff; background: var(--pine); border: 0; border-radius: 6px; padding: 9px 16px; cursor: pointer; }
      button[disabled] { opacity: .6; cursor: default; }
    </style>
    <form><label for="${uid}">${isReply ? `Reply${to ? ` to ${esc(to)}` : ""}` : "Add a comment"}</label>
      <textarea id="${uid}" maxlength="${MAX}" placeholder="${isReply ? "Write a reply" : "Share your thoughts"}">${esc(this._draft)}</textarea>
      <div class="foot"><span class="count">${this._draft.length.toLocaleString()} / ${MAX.toLocaleString()}</span><button type="submit" ${this._busy ? "disabled" : ""}>${this._busy ? "Posting…" : isReply ? "Post reply" : "Post comment"}</button></div>
      ${this._error ? `<p class="error" role="alert">${esc(this._error)}</p>` : ""}</form>`;
    const area = this.shadowRoot.querySelector("textarea");
    area.addEventListener("input", () => { this._draft = area.value; this.shadowRoot.querySelector(".count").textContent = `${area.value.length.toLocaleString()} / ${MAX.toLocaleString()}`; });
    this.shadowRoot.querySelector("form").addEventListener("submit", (e) => { e.preventDefault(); this.submit(); });
  }
}
customElements.define("g-reply-form", GReplyForm);
