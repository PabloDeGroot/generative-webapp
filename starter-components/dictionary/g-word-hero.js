const FONT_HREF = "https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500&family=IBM+Plex+Sans:wght@400;500;600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,600;1,6..72,400&display=swap";
function loadFonts() {
  if (document.querySelector("link[data-kit-fonts=\"lexicon\"]")) return;
  const link = document.createElement("link");
  link.rel = "stylesheet"; link.href = FONT_HREF; link.dataset.kitFonts = "lexicon";
  document.head.appendChild(link);
}
const esc = (v) => String(v ?? "").replace(/[&<>"\x27]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", "\"": "&quot;", "\x27": "&#39;" }[c]));
const json = (v, fallback) => { try { return v ? JSON.parse(v) : fallback; } catch { return fallback; } };
const TOKENS = `:host { display: block; --paper: #f3ead7; --vellum: #ebdfc5; --ink: #3b2a1e; --sepia: #8a5a3b; --gilt: #a0721a; --rule: #d6c3a0;
  --serif: "Newsreader", Georgia, "Times New Roman", serif; --sans: "IBM Plex Sans", system-ui, sans-serif; --mono: "IBM Plex Mono", ui-monospace, monospace;
  color: var(--ink); font-family: var(--sans); }
* { box-sizing: border-box; }
a { color: inherit; }
:focus-visible { outline: 2px solid var(--gilt); outline-offset: 2px; }`;

class GWordHero extends HTMLElement {
  static get observedAttributes() { return ["word", "part-of-speech", "syllables", "phonetic", "saved"]; }
  constructor() {
    super();
    this.attachShadow({ mode: "open" });
    this._state = "idle";
  }
  connectedCallback() {
    loadFonts();
    this.render();
  }
  attributeChangedCallback() { if (this.isConnected) this.render(); }
  async save() {
    const word = this.getAttribute("word");
    if (!word || this._state === "saving") return;
    this._state = "saving"; this.render();
    try {
      const res = await fetch("/favorites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ intent: "add a word to favorites", word, outputFormat: { ok: "boolean" } })
      });
      this._state = res.ok ? "saved" : "error";
    } catch {
      this._state = "error";
    }
    this.render();
  }
  render() {
    const saved = this.hasAttribute("saved") || this._state === "saved";
    const label = saved ? "★ Saved" : this._state === "saving" ? "Saving…" : this._state === "error" ? "Try again" : "☆ Save";
    const pos = this.getAttribute("part-of-speech");
    const syl = this.getAttribute("syllables");
    const ipa = this.getAttribute("phonetic");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .hero { display: grid; gap: 8px; padding: 26px 20px; }
      h1 { margin: 0; font: 600 clamp(40px, 8vw, 60px)/1 var(--serif); letter-spacing: -0.02em; overflow-wrap: anywhere; }
      .line { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; font-size: 14px; }
      .pos { font: italic 17px var(--serif); color: var(--sepia); }
      .mono { font-family: var(--mono); }
      .syl { color: var(--sepia); letter-spacing: .04em; }
      button { margin-left: auto; font: 500 13px var(--sans); color: var(--ink); background: transparent; border: 1px solid var(--sepia); border-radius: 999px; padding: 6px 14px; cursor: pointer; }
      button[disabled] { cursor: default; background: var(--vellum); border-color: var(--gilt); }
    </style>
    <div class="hero"><h1>${esc(this.getAttribute("word"))}</h1>
      <div class="line">${pos ? `<span class="pos">${esc(pos)}</span>` : ""}${syl ? `<span class="syl mono">${esc(syl)}</span>` : ""}${ipa ? `<span class="mono">${esc(ipa)}</span>` : ""}
        <button type="button" ${saved ? "disabled" : ""}>${label}</button></div></div>`;
    this.shadowRoot.querySelector("button").addEventListener("click", () => this.save());
  }
}
customElements.define("g-word-hero", GWordHero);
