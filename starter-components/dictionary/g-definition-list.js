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
const WORD_FORMAT = { word: "string", phonetic: "string", origin: "string", meanings: [{ partOfSpeech: "string", definitions: [{ text: "string", example: "string" }], synonyms: ["string"], antonyms: ["string"] }] };
const wordRequest = (word) => readAction(`/word/${encodeURIComponent(word)}`, { intent: "look up a word", word, outputFormat: WORD_FORMAT });

class GDefinitionList extends HTMLElement {
  static get observedAttributes() { return ["word", "part-of-speech"]; }
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
    const word = this.getAttribute("word");
    if (!word) return;
    this._state = { status: "loading" }; this.render();
    try {
      const res = await wordRequest(word);
      this._state = { status: "ready", meanings: field(res, "meanings") || [] };
    } catch (err) {
      this._state = { status: "error", message: err.message };
    }
    this.render();
  }
  render() {
    const only = (this.getAttribute("part-of-speech") || "").toLowerCase();
    const { status, meanings = [], message } = this._state;
    const groups = meanings.filter((m) => !only || String(m.partOfSpeech || "").toLowerCase() === only);
    let n = 0;
    const body = status === "loading" ? `<p class="note">Looking up definitions…</p>`
      : status === "error" ? `<p class="note">${esc(message)}</p>`
      : !groups.length ? `<p class="note">No definitions found.</p>`
      : groups.map((g) => `${groups.length > 1 || !only ? `<span class="pos">${esc(g.partOfSpeech)}</span>` : ""}<ol>${(g.definitions || []).map((d) => {
          const def = typeof d === "string" ? { text: d } : d || {};
          return `<li><span class="n">${++n}</span><p>${esc(def.text || def.definition)}</p>${def.example ? `<p class="ex">“${esc(def.example)}”</p>` : ""}</li>`;
        }).join("")}</ol>`).join("");
    this.shadowRoot.innerHTML = `<style>${TOKENS}
      .wrap { display: grid; gap: 10px; padding: 16px 20px; max-width: 72ch; }
      .pos { font: italic 16px var(--serif); color: var(--sepia); }
      ol { list-style: none; margin: 0; padding: 0; display: grid; gap: 16px; }
      li { display: grid; grid-template-columns: 30px 1fr; gap: 4px 10px; }
      .n { font: 600 20px/1.35 var(--serif); color: var(--gilt); }
      p { margin: 0; font: 18px/1.5 var(--serif); }
      .ex { grid-column: 2; font: italic 16px/1.5 var(--serif); color: var(--sepia); }
      .note { font: italic 16px var(--serif); color: var(--sepia); }
    </style><div class="wrap" aria-busy="${status === "loading"}">${body}</div>`;
  }
}
customElements.define("g-definition-list", GDefinitionList);
