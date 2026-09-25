import { fetchJson, UpstreamError, withQuery } from "../shared/http";

// English entries from Wiktionary (no API key), shaped the way the dictionary components read them:
//   definitions — REST endpoint /page/definition/{word}: senses grouped by part of speech (HTML)
//   pronunciation, syllables, origin, synonyms, antonyms — the page's plain-text extract

export interface WordMeaning {
    partOfSpeech: string;
    definitions: Array<{ text: string; example?: string }>;
    synonyms: string[];
    antonyms: string[];
}

export interface WordEntry {
    word: string;
    phonetic: string;
    syllables: string;
    origin: string;
    meanings: WordMeaning[];
    source: "Wiktionary";
    url: string;
}

const REST = "https://en.wiktionary.org/api/rest_v1/page/definition/";
const ACTION_API = "https://en.wiktionary.org/w/api.php";
const TTL_SECONDS = 24 * 3600;
const MAX_DEFINITIONS_PER_POS = 8;

const ENTITIES: Record<string, string> = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": "\"", "&#39;": "'", "&nbsp;": " " };

/** Wiktionary definitions are HTML with links and markup; reduce them to plain text. */
function htmlToText(html: string): string {
    return html
        .replace(/<[^>]+>/g, "")
        .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m) => ENTITIES[m] ?? m)
        .replace(/&#(\d+);/g, (_, n: string) => String.fromCodePoint(Number(n)))
        .replace(/\s+/g, " ")
        .trim();
}

interface RestSense {
    definition: string;
    examples?: string[];
    parsedExamples?: Array<{ example: string }>;
}

interface RestEntry {
    partOfSpeech: string;
    language: string;
    definitions: RestSense[];
}

async function fetchDefinitions(word: string): Promise<RestEntry[]> {
    try {
        const data = await fetchJson<Record<string, RestEntry[]> | null>(`${REST}${encodeURIComponent(word)}`, { ttlSeconds: TTL_SECONDS });
        return data?.en ?? [];
    } catch (error) {
        if (error instanceof UpstreamError && error.status === 404) return [];
        throw error;
    }
}

async function fetchPageText(word: string): Promise<string> {
    const data = await fetchJson<{ query?: { pages?: Array<{ missing?: boolean; extract?: string }> } } | null>(
        withQuery(ACTION_API, { action: "query", prop: "extracts", explaintext: 1, titles: word, format: "json", formatversion: 2, redirects: 1 }),
        { ttlSeconds: TTL_SECONDS }
    );
    const page = data?.query?.pages?.[0];
    return page && !page.missing ? page.extract ?? "" : "";
}

/** The "== English ==" part of the page text, split into its "=== Heading ===" sections. */
function englishSections(pageText: string): Array<{ heading: string; body: string }> {
    const english = pageText.split(/\n== (?=[^=])/).find((part) => part.startsWith("English ==")) ?? "";
    const parts = english.split(/\n={3,4} ([^=\n]+?) ={3,4}\n/);
    const sections: Array<{ heading: string; body: string }> = [];
    for (let i = 1; i < parts.length; i += 2) sections.push({ heading: parts[i].trim(), body: parts[i + 1] ?? "" });
    return sections;
}

// Items come with sense qualifiers ("(of a step): rise"), thesaurus pointers and "see also" notes;
// keep only the words themselves.
const listFrom = (line: string) => line
    .replace(/\([^()]*\)/g, "")
    .split(/[,;]/)
    .map((w) => w.slice(w.lastIndexOf(":") + 1).replace(/[“”"()]/g, "").trim())
    .filter((w) => w && w.length < 40 && !/thesaurus|^see\b|^also\b/i.test(w) && /^[A-Za-z]/.test(w));

/** Synonyms/antonyms for a part of speech: inline "Synonyms: a, b" lines and "Synonyms" subsections. */
function relatedWords(sections: Array<{ heading: string; body: string }>, partOfSpeech: string) {
    const synonyms = new Set<string>();
    const antonyms = new Set<string>();
    let inPos = false;
    for (const s of sections) {
        if (/^(Noun|Verb|Adjective|Adverb|Pronoun|Preposition|Conjunction|Interjection|Proper noun|Phrase|Prefix|Suffix)$/i.test(s.heading)) {
            inPos = s.heading.toLowerCase() === partOfSpeech.toLowerCase();
        }
        if (!inPos) continue;
        for (const line of s.body.split("\n")) {
            const m = line.match(/^\s*(Synonyms?|Antonyms?):\s*(.+)$/i);
            if (m) listFrom(m[2]).forEach((w) => (/^syn/i.test(m[1]) ? synonyms : antonyms).add(w));
        }
        if (/^Synonyms$/i.test(s.heading)) s.body.split("\n").flatMap(listFrom).forEach((w) => synonyms.add(w));
        if (/^Antonyms$/i.test(s.heading)) s.body.split("\n").flatMap(listFrom).forEach((w) => antonyms.add(w));
    }
    return { synonyms: [...synonyms].slice(0, 12), antonyms: [...antonyms].slice(0, 12) };
}

/** Throws when Wiktionary has no English entry for the word. */
export async function lookupWord(word: string): Promise<WordEntry> {
    const [entries, pageText] = await Promise.all([fetchDefinitions(word), fetchPageText(word)]);
    const sections = englishSections(pageText);

    // A word with several etymologies lists the same part of speech more than once: merge them.
    const byPos = new Map<string, RestEntry>();
    for (const e of entries.filter((x) => x.language === "English")) {
        const key = e.partOfSpeech.toLowerCase();
        const seen = byPos.get(key);
        if (seen) seen.definitions.push(...e.definitions);
        else byPos.set(key, { ...e, definitions: [...e.definitions] });
    }
    const meanings: WordMeaning[] = [...byPos.values()]
        .map((e) => ({
            partOfSpeech: e.partOfSpeech.toLowerCase(),
            definitions: e.definitions
                .map((d) => {
                    const text = htmlToText(d.definition);
                    const example = htmlToText(d.parsedExamples?.[0]?.example ?? d.examples?.[0] ?? "");
                    return example ? { text, example } : { text };
                })
                .filter((d) => d.text)
                .slice(0, MAX_DEFINITIONS_PER_POS),
            ...relatedWords(sections, e.partOfSpeech)
        }))
        .filter((m) => m.definitions.length);

    if (!meanings.length) throw new Error(`Wiktionary has no English entry for "${word}".`);

    const pronunciation = sections.find((s) => /^Pronunciation/i.test(s.heading))?.body ?? "";
    const etymology = sections.find((s) => /^Etymology/i.test(s.heading))?.body ?? "";
    return {
        word,
        phonetic: pronunciation.match(/IPA\(key\):\s*(\/[^/]+\/)/)?.[1] ?? "",
        syllables: (pronunciation.match(/Hyphenation[^:]*:\s*([^\n]+)/)?.[1] ?? "").replace(/‧/g, "·").trim(),
        origin: (etymology.split(/\n{2,}/).map((p) => p.trim()).find(Boolean) ?? "").replace(/\s+/g, " "),
        meanings,
        source: "Wiktionary",
        url: `https://en.wiktionary.org/wiki/${encodeURIComponent(word)}`
    };
}
