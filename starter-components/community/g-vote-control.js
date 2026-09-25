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

class GVoteControl extends HTMLElement {
  static get observedAttributes() { return ["post-id", "comment-id", "score", "my-vote", "compact"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._override = null; // { score, vote } after a local change
    this._error = "";
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() {
    this._override = null;
    if (this.isConnected) this.render();
  }
  current() {
    return this._override || { score: Number(this.getAttribute("score")) || 0, vote: Number(this.getAttribute("my-vote")) || 0 };
  }
  async cast(direction) {
    const before = this.current();
    const vote = before.vote === direction ? 0 : direction;
    this._override = { score: before.score + (vote - before.vote), vote };
    this._error = "";
    this.render();
    const postId = this.getAttribute("post-id");
    const commentId = this.getAttribute("comment-id") || undefined;
    try {
      const data = await postAction(`/post/${encodeURIComponent(postId)}`, {
        intent: "vote", postId, commentId, value: vote, outputFormat: { ok: "boolean", score: "number", myVote: "number" }
      });
      if (data && typeof data.score === "number") { this._override = { score: data.score, vote }; this.render(); }
    } catch (err) {
      this._override = before;
      this._error = err.message;
      this.render();
    }
  }
  render() {
    const { score, vote } = this.current();
    const compact = this.hasAttribute("compact");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      :host { display: inline-block; }
      .v { display: grid; justify-items: center; font-size: 13px; }
      .v.compact { display: inline-flex; align-items: center; gap: 2px; background: var(--card); border: 1px solid var(--rule); border-radius: 999px; padding: 1px 6px; }
      button { background: none; border: 0; color: var(--soft); font-size: 15px; line-height: 1; padding: 3px 6px; cursor: pointer; border-radius: 4px; }
      button:hover { background: var(--paper); }
      .up.on { color: var(--up); } .down.on { color: var(--down); }
      b { font: 700 14px var(--display); font-variant-numeric: tabular-nums; min-width: 2ch; text-align: center; }
      b.up { color: var(--up); } b.down { color: var(--down); }
      .error { font-size: 11px; max-width: 12em; text-align: center; }
    </style>
    <div class="v ${compact ? "compact" : ""}"><button type="button" class="up ${vote === 1 ? "on" : ""}" aria-label="Upvote" aria-pressed="${vote === 1}">▲</button>
      <b class="${vote === 1 ? "up" : vote === -1 ? "down" : ""}" aria-label="Score ${score}">${score}</b>
      <button type="button" class="down ${vote === -1 ? "on" : ""}" aria-label="Downvote" aria-pressed="${vote === -1}">▼</button></div>
    ${this._error ? `<p class="error" role="alert">${esc(this._error)}</p>` : ""}`;
    this.shadowRoot.querySelector(".up").addEventListener("click", () => this.cast(1));
    this.shadowRoot.querySelector(".down").addEventListener("click", () => this.cast(-1));
  }
}
customElements.define("g-vote-control", GVoteControl);
