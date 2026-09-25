import { UpstreamError, fetchJson, withQuery } from "../shared/http";

// Public collection APIs of the Art Institute of Chicago and The Met, plus Wikipedia for artists.
// Every image URL handed out is a same-origin /__art/... proxy URL (src/routes/__art), never an
// external one: pages must show the real artwork, served from the site itself.

const DAY = 24 * 3600;
const AIC_API = "https://api.artic.edu/api/v1";
const AIC_HEADERS = { "AIC-User-Agent": "groots-museum (https://groots.es)" };
const MET_API = "https://collectionapi.metmuseum.org/public/collection/v1";
const WIKI_HEADERS = { "User-Agent": "generative-webapp/1.0 (https://groots.es)" };
const MET_FETCH_CONCURRENCY = 4;
// The Met's API sits behind a bot filter (Imperva) that answers 403 for ~30-60 s once a client
// goes faster than ~3 requests/s, so requests are spaced out and a 403 pauses all Met calls.
const MET_OPTIONS = { ttlSeconds: DAY, timeoutMs: 10_000, minIntervalMs: 400 };
const MET_PAUSE_MS = 60_000;
let metPausedUntil = 0;

async function metFetch<T>(url: string): Promise<T> {
    if (Date.now() < metPausedUntil) {
        throw new UpstreamError("The Met's collection API is rate-limiting this server; try again in a minute.", 429);
    }
    try {
        return await fetchJson<T>(url, MET_OPTIONS);
    } catch (error) {
        if (error instanceof UpstreamError && error.status === 403) {
            metPausedUntil = Date.now() + MET_PAUSE_MS;
            throw new UpstreamError("The Met's collection API is rate-limiting this server; try again in a minute.", 429);
        }
        throw error;
    }
}

export type MuseumChoice = "aic" | "met" | "both";
export const MUSEUM_NAMES = { aic: "Art Institute of Chicago", met: "The Met" } as const;
export const ARTWORK_ID = /^(aic|met)-(\d+)$/;

export interface ArtworkSummary {
    id: string;
    title: string;
    artist: string;
    date: string;
    museum: string;
    imageUrl: string;
    thumbUrl: string;
    imageAlt: string;
}

export interface ArtworkDetail extends ArtworkSummary {
    largeImageUrl: string;
    additionalImages: { imageUrl: string; thumbUrl: string }[];
    artistBio: string;
    medium: string;
    dimensions: string;
    creditLine: string;
    department: string;
    departmentId: string;
    placeOfOrigin: string;
    style: string;
    classification: string;
    description: string;
    onView: boolean;
    gallery: string | null;
    isPublicDomain: boolean;
    sourceUrl: string;
    moreByArtist: ArtworkSummary[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const text = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

/**
 * A one-line display field (title, artist, date, medium): CSV-style doubled quotes collapsed
 * (AIC has titles like 'from the series ""Fifty-three Stations""'), whitespace collapsed, trimmed.
 */
const line = (value: unknown): string => text(value).replace(/""/g, "\"").replace(/\s+/g, " ").trim();

/** Reduces an HTML fragment to plain text (paragraphs become blank lines). */
export function htmlToText(html: string): string {
    return html
        .replace(/<\s*br\s*\/?>/gi, "\n")
        .replace(/<\/\s*p\s*>/gi, "\n\n")
        .replace(/<[^>]*>/g, "")
        .replace(/&nbsp;/g, " ")
        .replace(/&quot;/g, "\"")
        .replace(/&#39;|&apos;/g, "'")
        .replace(/&lt;/g, "<")
        .replace(/&gt;/g, ">")
        .replace(/&#(\d+);/g, (_m, n) => String.fromCodePoint(Number(n)))
        .replace(/&amp;/g, "&")
        .replace(/[ \t]+/g, " ")
        .replace(/ *\n */g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();
}

function truncate(value: string, max: number): string {
    if (value.length <= max) return value;
    const cut = value.slice(0, max - 1);
    const lastSpace = cut.lastIndexOf(" ");
    return `${cut.slice(0, lastSpace > max * 0.8 ? lastSpace : cut.length)}…`;
}

/** Runs fn over items with at most `limit` calls in flight, preserving order. */
async function mapLimit<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
    const results: R[] = new Array(items.length);
    let next = 0;
    const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
        while (next < items.length) {
            const index = next++;
            results[index] = await fn(items[index]);
        }
    });
    await Promise.all(workers);
    return results;
}

/** Alternates between lists: a1, b1, a2, b2, ... */
export function interleave<T>(...lists: T[][]): T[] {
    const out: T[] = [];
    const longest = Math.max(0, ...lists.map((l) => l.length));
    for (let i = 0; i < longest; i++) for (const list of lists) if (i < list.length) out.push(list[i]);
    return out;
}

/**
 * Keeps one work per title (several impressions of one print share it), in order, up to `limit`.
 * `seed` (the work a page is about) counts as already shown. Dropped copies only come back when
 * there would be fewer than `limit` works, the other museum's copies first.
 */
function distinctTitles(items: ArtworkSummary[], limit: number, seed?: ArtworkSummary): ArtworkSummary[] {
    const key = (a: ArtworkSummary) => normalize(a.title) || a.id; // titles in other scripts normalize to ""
    const firstMuseum = new Map<string, string>(seed ? [[key(seed), seed.museum]] : []);
    const picked = new Set<number>();
    const otherMuseum: number[] = [];
    const sameMuseum: number[] = [];
    items.forEach((a, i) => {
        const museum = firstMuseum.get(key(a));
        if (museum === undefined) {
            firstMuseum.set(key(a), a.museum);
            picked.add(i);
        } else (museum === a.museum ? sameMuseum : otherMuseum).push(i);
    });
    for (const i of [...otherMuseum, ...sameMuseum]) {
        if (picked.size >= limit) break;
        picked.add(i);
    }
    return items.filter((_a, i) => picked.has(i)).slice(0, limit);
}

const normalize = (value: string) =>
    value.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9 ]+/g, " ").replace(/\s+/g, " ").trim();

/** True when an artist display name plausibly refers to the queried name (surname must match). */
function sameArtist(displayName: string, query: string): boolean {
    const shown = ` ${normalize(displayName)} `;
    const words = normalize(query).split(" ").filter((w) => w.length > 1);
    if (!words.length) return false;
    return shown.includes(` ${words[words.length - 1]} `) || words.every((w) => shown.includes(w));
}

export function parseArtworkId(id: string): { museum: "aic" | "met"; num: number } {
    const match = ARTWORK_ID.exec(id.trim());
    if (!match) throw new Error(`Invalid artwork id '${id}': use 'aic-<number>' or 'met-<number>'.`);
    return { museum: match[1] as "aic" | "met", num: Number(match[2]) };
}

// ---------------------------------------------------------------------------
// Image URLs (always /__art proxy paths)
// ---------------------------------------------------------------------------

/** IIIF URL at the given width, capped at the image's own width (AIC refuses to upscale). */
function aicImage(imageId: string, width: 200 | 400 | 843 | 1686, fullWidth?: number | null): string {
    const w = fullWidth && fullWidth > 0 ? Math.min(width, fullWidth) : width;
    return `/__art/aic/${imageId}/full/${w},/0/default.jpg`;
}

const MET_IMAGE_BASE = "https://images.metmuseum.org/CRDImages/";

/** Met image URL (any rendition) -> proxy URL of the given rendition, or null if not a Met image. */
function metImage(url: string, rendition: "web-large" | "mobile-large"): string | null {
    if (!url.startsWith(MET_IMAGE_BASE)) return null;
    const path = url.slice(MET_IMAGE_BASE.length).replace(/ /g, "%20").replace(/\/(original|web-large|mobile-large|web-additional)\//, `/${rendition}/`);
    if (!/^[\w\-./%]+\.(jpe?g|png)$/i.test(path)) return null;
    return `/__art/met/${path}`;
}

const WIKI_IMAGE_BASE = /^https:\/\/(upload|thumb)\.wikimedia\.org\/wikipedia\//;

/**
 * Wikimedia image URL (upload. or thumb. host; query string dropped) -> /__art/wiki proxy URL,
 * or null when the proxy wouldn't accept it.
 */
export function wikiImage(url: string | undefined): string | null {
    if (!url || !WIKI_IMAGE_BASE.test(url)) return null;
    const path = url.replace(WIKI_IMAGE_BASE, "").split(/[?#]/)[0];
    if (path.includes("..") || !/^[\w\-./%(),'!~]+\.(jpe?g|png|gif|webp|svg)(\/[\w\-.%(),'!~]+)?$/i.test(path)) return null;
    return `/__art/wiki/${path}`;
}

// ---------------------------------------------------------------------------
// Art Institute of Chicago
// ---------------------------------------------------------------------------

interface AicArtwork {
    id: number;
    title: string | null;
    artist_title: string | null;
    artist_display: string | null;
    artist_id: number | null;
    date_display: string | null;
    image_id: string | null;
    alt_image_ids?: string[];
    thumbnail?: { alt_text?: string | null; width?: number | null } | null;
    is_public_domain?: boolean;
    medium_display?: string | null;
    dimensions?: string | null;
    credit_line?: string | null;
    department_title?: string | null;
    department_id?: string | null;
    place_of_origin?: string | null;
    style_title?: string | null;
    classification_title?: string | null;
    description?: string | null;
    short_description?: string | null;
    is_on_view?: boolean;
    gallery_title?: string | null;
}

const AIC_SUMMARY_FIELDS = ["id", "title", "artist_title", "artist_display", "artist_id", "date_display", "image_id", "thumbnail"];
const AIC_DETAIL_FIELDS = [
    ...AIC_SUMMARY_FIELDS, "alt_image_ids", "is_public_domain", "medium_display", "dimensions", "credit_line",
    "department_title", "department_id", "place_of_origin", "style_title", "classification_title", "description",
    "short_description", "is_on_view", "gallery_title"
];

// Departments that hold archives and library material rather than artworks.
const AIC_SKIPPED_DEPARTMENTS = new Set(["PC-826", "PC-824", "PC-135"]);

function aicArtistName(a: AicArtwork): string {
    return line(a.artist_title) || line(text(a.artist_display).split("\n")[0]) || "Unknown artist";
}

function aicSummary(a: AicArtwork): ArtworkSummary {
    const title = line(htmlToText(text(a.title))) || "Untitled";
    const artist = aicArtistName(a);
    return {
        id: `aic-${a.id}`,
        title,
        artist,
        date: line(a.date_display),
        museum: MUSEUM_NAMES.aic,
        imageUrl: aicImage(a.image_id!, 843, a.thumbnail?.width),
        thumbUrl: aicImage(a.image_id!, 400, a.thumbnail?.width),
        imageAlt: line(a.thumbnail?.alt_text) || `${title} by ${artist}`
    };
}

interface AicSearchResponse { pagination: { total: number }; data: AicArtwork[] }

/**
 * Artwork search restricted to works with an image. `must` holds extra Elasticsearch clauses
 * (term filters); `q` is a full-text query; `should` boosts without filtering.
 */
async function aicSearch(options: { q?: string; must?: object[]; should?: object[]; limit: number }): Promise<{ total: number; artworks: ArtworkSummary[] }> {
    const bool: Record<string, unknown> = { must: [{ exists: { field: "image_id" } }, ...(options.must ?? [])] };
    if (options.should?.length) bool.should = options.should;
    const params: Record<string, unknown> = { query: { bool } };
    if (options.q) params.q = options.q;
    const data = await fetchJson<AicSearchResponse>(
        withQuery(`${AIC_API}/artworks/search`, {
            params: JSON.stringify(params),
            limit: options.limit,
            fields: AIC_SUMMARY_FIELDS.join(",")
        }),
        { ttlSeconds: DAY, headers: AIC_HEADERS, timeoutMs: 10_000 }
    );
    const artworks = (data?.data ?? []).filter((a) => a.image_id).map(aicSummary);
    return { total: data?.pagination?.total ?? artworks.length, artworks };
}

/** Every word of the text must appear in one of the descriptive fields (any mix of them). */
function textClause(query: string, operator: "and" | "or" = "and"): object {
    return {
        multi_match: {
            query,
            type: "cross_fields",
            operator,
            fields: [
                "title^3", "artist_title^2", "artist_display", "subject_titles", "term_titles", "classification_titles",
                "style_titles", "place_of_origin", "medium_display"
            ]
        }
    };
}

/** Full-text search: every word must match; when nothing does, any word may (ranked by relevance). */
async function aicTextSearch(q: string, limit: number, must: object[] = [], fallback = true) {
    const strict = await aicSearch({ q, must: [...must, textClause(q)], limit });
    if (strict.artworks.length || !fallback) return strict;
    return aicSearch({ q, must: [...must, textClause(q, "or")], limit });
}

async function aicArtwork(num: number): Promise<AicArtwork> {
    try {
        const data = await fetchJson<{ data: AicArtwork }>(
            withQuery(`${AIC_API}/artworks/${num}`, { fields: AIC_DETAIL_FIELDS.join(",") }),
            { ttlSeconds: DAY, headers: AIC_HEADERS, timeoutMs: 10_000 }
        );
        if (!data?.data) throw new Error(`Artwork 'aic-${num}' not found.`);
        return data.data;
    } catch (error) {
        if (error instanceof UpstreamError && error.status === 404) throw new Error(`Artwork 'aic-${num}' not found.`);
        throw error;
    }
}

/** "Claude Monet (French, 1840–1926)" -> "French, 1840–1926". */
function aicArtistBio(display: string): string {
    const firstLine = display.split("\n")[0];
    const match = /\(([^()]*)\)\s*$/.exec(firstLine);
    return match ? match[1].trim() : display.split("\n").slice(1).join(", ").trim();
}

async function aicDetail(num: number): Promise<ArtworkDetail> {
    const a = await aicArtwork(num);
    if (!a.image_id) throw new Error(`Artwork 'aic-${num}' has no image.`);
    const summary = aicSummary(a);
    const publicDomain = Boolean(a.is_public_domain);
    const more = a.artist_id
        ? await aicSearch({ must: [{ term: { artist_id: a.artist_id } }], should: [{ term: { is_boosted: true } }], limit: 24 })
            .then((r) => distinctTitles(r.artworks.filter((w) => w.id !== summary.id), 8, summary))
            .catch(() => [])
        : [];
    const description = htmlToText(text(a.description) || text(a.short_description));
    return {
        ...summary,
        largeImageUrl: aicImage(a.image_id, publicDomain ? 1686 : 843, a.thumbnail?.width),
        additionalImages: (a.alt_image_ids ?? []).slice(0, 12).map((id) => ({ imageUrl: aicImage(id, 843), thumbUrl: aicImage(id, 400) })),
        artistBio: aicArtistBio(text(a.artist_display)),
        medium: line(a.medium_display),
        dimensions: text(a.dimensions),
        creditLine: text(a.credit_line),
        department: text(a.department_title),
        departmentId: a.department_id ? `aic-${a.department_id}` : "",
        placeOfOrigin: text(a.place_of_origin),
        style: text(a.style_title),
        classification: text(a.classification_title),
        description: truncate(description, 2000),
        onView: Boolean(a.is_on_view),
        gallery: text(a.gallery_title) || null,
        isPublicDomain: publicDomain,
        sourceUrl: `https://www.artic.edu/artworks/${a.id}`,
        moreByArtist: more
    };
}

interface AicAgent { id: number; title: string; birth_date: number | null; death_date: number | null }

async function aicFindAgent(name: string): Promise<AicAgent | null> {
    const data = await fetchJson<{ data: AicAgent[] }>(
        withQuery(`${AIC_API}/agents/search`, { q: name, limit: 5, fields: "id,title,birth_date,death_date" }),
        { ttlSeconds: DAY, headers: AIC_HEADERS, timeoutMs: 10_000 }
    );
    return (data?.data ?? []).find((agent) => sameArtist(agent.title, name)) ?? null;
}

interface AicDepartment { id: string; title: string }

async function aicDepartments(): Promise<AicDepartment[]> {
    const data = await fetchJson<{ data: AicDepartment[] }>(
        withQuery(`${AIC_API}/departments`, { limit: 100, fields: "id,title" }),
        { ttlSeconds: DAY, headers: AIC_HEADERS, timeoutMs: 10_000 }
    );
    return (data?.data ?? []).filter((d) => !AIC_SKIPPED_DEPARTMENTS.has(d.id));
}

// ---------------------------------------------------------------------------
// The Met
// ---------------------------------------------------------------------------

interface MetObject {
    objectID: number;
    title: string;
    artistDisplayName: string;
    artistDisplayBio: string;
    culture: string;
    period: string;
    dynasty: string;
    objectDate: string;
    primaryImage: string;
    primaryImageSmall: string;
    additionalImages: string[];
    isPublicDomain: boolean;
    medium: string;
    dimensions: string;
    creditLine: string;
    department: string;
    country: string;
    city: string;
    region: string;
    classification: string;
    objectName: string;
    objectURL: string;
    GalleryNumber: string;
}

async function metObject(num: number): Promise<MetObject> {
    try {
        const data = await metFetch<MetObject | null>(`${MET_API}/objects/${num}`);
        if (!data?.objectID) throw new Error(`Artwork 'met-${num}' not found.`);
        return data;
    } catch (error) {
        if (error instanceof UpstreamError && error.status === 404) throw new Error(`Artwork 'met-${num}' not found.`);
        throw error;
    }
}

function metSummary(o: MetObject): ArtworkSummary | null {
    const imageUrl = metImage(o.primaryImageSmall || o.primaryImage, "web-large");
    const thumbUrl = metImage(o.primaryImageSmall || o.primaryImage, "mobile-large");
    if (!imageUrl || !thumbUrl) return null;
    const title = line(htmlToText(text(o.title))) || line(o.objectName) || "Untitled";
    const artist = line(o.artistDisplayName) || line(o.culture) || "Unknown artist";
    return {
        id: `met-${o.objectID}`,
        title,
        artist,
        date: line(o.objectDate),
        museum: MUSEUM_NAMES.met,
        imageUrl,
        thumbUrl,
        imageAlt: `${title} by ${artist}`
    };
}

/** The Met's search returns only ids; fetch objects (capped) and keep the ones with an image. */
async function metSummaries(ids: number[], limit: number, accept: (o: MetObject) => boolean = () => true): Promise<ArtworkSummary[]> {
    // Many "hasImages" results carry no public image (rights-restricted), so over-fetch a little.
    const candidates = ids.slice(0, limit + Math.min(limit, 3));
    let rateLimited: unknown = null;
    const objects = await mapLimit(candidates, MET_FETCH_CONCURRENCY, (id) => metObject(id).catch((error) => {
        if (error instanceof UpstreamError && error.status === 429) rateLimited = error;
        return null;
    }));
    if (rateLimited && !objects.some(Boolean)) throw rateLimited;
    const out: ArtworkSummary[] = [];
    for (const o of objects) {
        if (!o || !accept(o)) continue;
        const summary = metSummary(o);
        if (summary) out.push(summary);
        if (out.length >= limit) break;
    }
    return out;
}

async function metSearchIds(params: Record<string, string | number | boolean | undefined>): Promise<{ total: number; ids: number[] }> {
    const data = await metFetch<{ total: number; objectIDs: number[] | null }>(withQuery(`${MET_API}/search`, { hasImages: true, ...params }));
    return { total: data?.total ?? 0, ids: data?.objectIDs ?? [] };
}

async function metSearch(params: Record<string, string | number | boolean | undefined>, limit: number, accept?: (o: MetObject) => boolean) {
    const { total, ids } = await metSearchIds(params);
    return { total, artworks: await metSummaries(ids, limit, accept) };
}

interface MetDepartment { departmentId: number; displayName: string }

// Departments that hold library material rather than artworks.
const MET_SKIPPED_DEPARTMENTS = new Set([16]);

// Cover image per Met department (a highlighted work's image path under CRDImages/). Static because
// finding one live costs ~40 Met requests, far over its rate limit. Modern Art (21) has no
// public-domain image to show.
const MET_DEPARTMENT_COVERS: Record<number, string> = {
    1: "ad/web-large/DT11595.jpg", // Embroidered Picture (13747)
    3: "an/web-large/DP-41767-001.jpg", // Fragment of a bowl with a frieze of bulls (324111)
    4: "aa/web-large/LC-19_115_2-002.jpg", // Mask (22739)
    5: "ao/web-large/DP-17791-001.jpg", // Bird pendant (313330)
    6: "as/web-large/DP119525.jpg", // Night Rain at the Double-Shelf Stand (37145)
    7: "cl/web-large/DP102839.jpg", // Theodosius Arrives at Ephesus (469857)
    8: "ci/web-large/DP156471.jpg", // Ensemble (107375)
    9: "dp/web-large/DP-19731-001.jpg", // Statue of Liberty presentation drawing (654264)
    10: "eg/web-large/DP263833.jpg", // Game of Hounds and Jackals (543867)
    11: "ep/web-large/DP-42549-001.jpg", // Van Gogh, Wheat Field with Cypresses (436535)
    12: "es/web-large/DT818.jpg", // Hunting and fishing scenes (229770)
    13: "gr/web-large/DP260421.jpg", // Terracotta stirrup jar with octopus (254779)
    14: "is/web-large/DP215596.jpg", // Carpet with Scrolling Vines and Blossoms (446646)
    15: "rl/web-large/rl1975.1.1244.R.jpg", // Watch (459201)
    17: "md/web-large/DP144443.jpg", // Saint Margaret of Antioch (469836)
    18: "mi/web-large/DP218094.jpg", // Bassoon (503615)
    19: "ph/web-large/DT1161.jpg" // American Barque "Jane Tudor," Conway Bay (267019)
};

async function metDepartments(): Promise<MetDepartment[]> {
    const data = await metFetch<{ departments: MetDepartment[] }>(`${MET_API}/departments`);
    return (data?.departments ?? []).filter((d) => !MET_SKIPPED_DEPARTMENTS.has(d.departmentId));
}

async function metDetail(num: number): Promise<ArtworkDetail> {
    const o = await metObject(num);
    const summary = metSummary(o);
    if (!summary) throw new Error(`Artwork 'met-${num}' has no public image.`);
    const [departments, more] = await Promise.all([
        metDepartments().catch(() => []),
        o.artistDisplayName
            ? metSearch({ artistOrCulture: true, q: o.artistDisplayName }, 6, (other) => other.objectID !== o.objectID && sameArtist(other.artistDisplayName, o.artistDisplayName))
                .then((r) => distinctTitles(r.artworks, 8, summary))
                .catch(() => [])
            : Promise.resolve([])
    ]);
    const department = departments.find((d) => d.displayName === o.department);
    const additionalImages = (o.additionalImages ?? [])
        .slice(0, 12)
        .map((url) => ({ imageUrl: metImage(url, "web-large"), thumbUrl: metImage(url, "mobile-large") }))
        .filter((img): img is { imageUrl: string; thumbUrl: string } => Boolean(img.imageUrl && img.thumbUrl));
    const gallery = text(o.GalleryNumber);
    return {
        ...summary,
        // The Met publishes no rendition between web-large (~600 px) and the multi-megabyte original.
        largeImageUrl: summary.imageUrl,
        additionalImages,
        artistBio: text(o.artistDisplayBio),
        medium: line(o.medium),
        dimensions: text(o.dimensions),
        creditLine: text(o.creditLine),
        department: text(o.department),
        departmentId: department ? `met-${department.departmentId}` : "",
        placeOfOrigin: [o.city, o.country].map(text).filter(Boolean).join(", ") || text(o.region) || text(o.culture),
        style: text(o.period) || text(o.dynasty) || text(o.culture),
        classification: text(o.classification) || text(o.objectName),
        description: "",
        onView: Boolean(gallery),
        gallery: gallery ? `Gallery ${gallery}` : null,
        isPublicDomain: Boolean(o.isPublicDomain),
        sourceUrl: text(o.objectURL) || `https://www.metmuseum.org/art/collection/search/${o.objectID}`,
        moreByArtist: more
    };
}

// ---------------------------------------------------------------------------
// Public operations (the tools)
// ---------------------------------------------------------------------------

const wants = (museum: MuseumChoice, which: "aic" | "met") => museum === "both" || museum === which;

/**
 * How many Met works to fetch. Each costs one rate-limited request, so when mixing museums the Met
 * contributes up to half and AIC (fetched in full) fills the rest.
 */
const metShare = (museum: MuseumChoice, limit: number) => (museum === "met" ? limit : Math.ceil(limit / 2));

/** Runs the per-museum lookups; fails only when every requested museum failed. */
async function fromMuseums<T>(museum: MuseumChoice, aic: () => Promise<T>, met: () => Promise<T>, empty: T): Promise<{ aic: T; met: T }> {
    const [a, m] = await Promise.allSettled([
        wants(museum, "aic") ? aic() : Promise.resolve(empty),
        wants(museum, "met") ? met() : Promise.resolve(empty)
    ]);
    if (a.status === "rejected" && m.status === "rejected") throw a.reason;
    if (museum === "aic" && a.status === "rejected") throw a.reason;
    if (museum === "met" && m.status === "rejected") throw m.reason;
    return { aic: a.status === "fulfilled" ? a.value : empty, met: m.status === "fulfilled" ? m.value : empty };
}

export async function searchArtworks(query: string, museum: MuseumChoice = "both", limit = 12) {
    const q = query.trim();
    const empty = { total: 0, artworks: [] as ArtworkSummary[] };
    const results = await fromMuseums(
        museum,
        () => aicTextSearch(q, limit),
        () => metSearch({ q }, metShare(museum, limit)),
        empty
    );
    return {
        query: q,
        total: results.aic.total + results.met.total,
        artworks: interleave(results.aic.artworks, results.met.artworks).slice(0, limit)
    };
}

export async function getArtwork(id: string): Promise<ArtworkDetail> {
    const { museum, num } = parseArtworkId(id);
    return museum === "aic" ? aicDetail(num) : metDetail(num);
}

/** The summary snapshot of one artwork (for exhibitions). */
export async function getArtworkSummary(id: string): Promise<ArtworkSummary> {
    const { museum, num } = parseArtworkId(id);
    if (museum === "aic") {
        const a = await aicArtwork(num);
        if (!a.image_id) throw new Error(`Artwork '${id}' has no image.`);
        return aicSummary(a);
    }
    const summary = metSummary(await metObject(num));
    if (!summary) throw new Error(`Artwork '${id}' has no public image.`);
    return summary;
}

interface WikiRestSummary {
    type?: string;
    title: string;
    description?: string;
    extract?: string;
    thumbnail?: { source: string };
    originalimage?: { source: string; width: number };
    content_urls?: { desktop?: { page?: string } };
}

const PORTRAIT_WIDTH = 500; // a standard Wikimedia thumbnail step (arbitrary widths are refused)

/** A ~500 px portrait: the original when it is small, else its 500px thumbnail, else the API thumbnail. */
function portraitUrl(article: WikiRestSummary | null): string | null {
    const original = article?.originalimage;
    if (original) {
        const clean = original.source.split(/[?#]/)[0];
        if (original.width <= PORTRAIT_WIDTH) return wikiImage(clean);
        const match = /^(https:\/\/upload\.wikimedia\.org\/wikipedia\/[^/]+\/)(\w\/\w\w\/)([^/]+\.(?:jpe?g|png))$/i.exec(clean);
        if (match) {
            const url = wikiImage(`${match[1]}thumb/${match[2]}${match[3]}/${PORTRAIT_WIDTH}px-${match[3]}`);
            if (url) return url;
        }
    }
    return wikiImage(article?.thumbnail?.source);
}

async function wikiSummary(title: string): Promise<WikiRestSummary | null> {
    try {
        const data = await fetchJson<WikiRestSummary | null>(
            `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
            { ttlSeconds: DAY, headers: WIKI_HEADERS, timeoutMs: 10_000 }
        );
        if (!data || data.type === "disambiguation" || !data.extract) return null;
        return data;
    } catch (error) {
        if (error instanceof UpstreamError && error.status === 404) return null;
        throw error;
    }
}

async function wikiSearchTitle(query: string): Promise<string | null> {
    const data = await fetchJson<{ query?: { search?: { title: string }[] } }>(
        withQuery("https://en.wikipedia.org/w/api.php", {
            action: "query", list: "search", srsearch: query, srlimit: 1, format: "json", formatversion: 2
        }),
        { ttlSeconds: DAY, headers: WIKI_HEADERS, timeoutMs: 10_000 }
    );
    return data?.query?.search?.[0]?.title ?? null;
}

/** The Wikipedia article about an artist: the exact title first, then a search biased to artists. */
async function artistArticle(name: string): Promise<WikiRestSummary | null> {
    const direct = await wikiSummary(name);
    if (direct && sameArtist(direct.title, name)) return direct;
    const title = await wikiSearchTitle(`${name} artist`);
    if (!title || !sameArtist(title, name)) return direct;
    return (await wikiSummary(title)) ?? direct;
}

/** Birth and death years from "French painter (1840–1926)" or the first sentence of the bio. */
function lifeYears(...sources: (string | undefined)[]): { born: number | null; died: number | null } {
    for (const source of sources) {
        const match = /\((?:[^()]*?\b)?(?:c\.\s*|born\s+)?(\d{3,4})\s*[–—-]\s*(?:c\.\s*)?(\d{3,4})\)/.exec(source ?? "");
        if (match) return { born: Number(match[1]), died: Number(match[2]) };
        const bornOnly = /\((?:[^()]*?\b)?born\s+(?:[^()]*?\s)?(\d{4})\)/i.exec(source ?? "");
        if (bornOnly) return { born: Number(bornOnly[1]), died: null };
    }
    return { born: null, died: null };
}

export async function getArtist(name: string) {
    const query = name.trim();
    const [article, agent] = await Promise.all([
        artistArticle(query).catch(() => null),
        aicFindAgent(query).catch(() => null)
    ]);
    const displayName = article?.title ?? agent?.title ?? query;
    const [aicWorks, metWorks] = await Promise.all([
        agent
            ? aicSearch({ must: [{ term: { artist_id: agent.id } }], should: [{ term: { is_boosted: true } }], limit: 30 }).then((r) => r.artworks).catch(() => [])
            : Promise.resolve([]),
        metSearch({ artistOrCulture: true, q: displayName }, 6, (o) => sameArtist(o.artistDisplayName, displayName))
            .then((r) => r.artworks)
            .catch(() => [])
    ]);
    // AIC is over-fetched (one request either way) so duplicate impressions leave room for variety.
    const artworks = distinctTitles(interleave(aicWorks, metWorks), 12);
    if (!article && !artworks.length) throw new Error(`No artist found for '${query}'.`);

    const years = lifeYears(article?.description, article?.extract?.slice(0, 300));
    return {
        name: displayName,
        description: text(article?.description),
        bio: text(article?.extract),
        born: agent?.birth_date ?? years.born,
        died: agent?.death_date ?? years.died,
        portraitUrl: portraitUrl(article),
        wikipediaUrl: article?.content_urls?.desktop?.page ?? null,
        artworks
    };
}

async function aicDepartmentCover(id: string): Promise<string | null> {
    const { artworks } = await aicSearch({ must: [{ term: { department_id: id } }], should: [{ term: { is_boosted: true } }], limit: 1 });
    return artworks[0]?.thumbUrl ?? null;
}

function metDepartmentCover(id: number): string | null {
    const path = MET_DEPARTMENT_COVERS[id];
    return path ? metImage(MET_IMAGE_BASE + path, "mobile-large") : null;
}

export async function listDepartments(museum: MuseumChoice = "both") {
    type Department = { id: string; museum: string; name: string; coverImageUrl: string | null };
    const results = await fromMuseums<Department[]>(
        museum,
        async () => mapLimit(await aicDepartments(), 6, async (d) => ({
            id: `aic-${d.id}`, museum: MUSEUM_NAMES.aic, name: d.title,
            coverImageUrl: await aicDepartmentCover(d.id).catch(() => null)
        })),
        async () => (await metDepartments()).map((d) => ({
            id: `met-${d.departmentId}`, museum: MUSEUM_NAMES.met, name: d.displayName,
            coverImageUrl: metDepartmentCover(d.departmentId)
        })),
        []
    );
    return { departments: [...results.aic, ...results.met] };
}

export async function getDepartment(id: string, limit = 12) {
    const match = /^(aic|met)-(.+)$/.exec(id.trim());
    if (!match) throw new Error(`Invalid department id '${id}': use an id from ListDepartments ('aic-PC-10', 'met-11').`);
    const [, museum, raw] = match;
    if (museum === "aic") {
        const department = (await aicDepartments()).find((d) => d.id === raw);
        if (!department) throw new Error(`Department '${id}' not found.`);
        const { artworks } = await aicSearch({ must: [{ term: { department_id: raw } }], should: [{ term: { is_boosted: true } }], limit });
        return { id, name: department.title, museum: MUSEUM_NAMES.aic, artworks };
    }
    const department = (await metDepartments()).find((d) => String(d.departmentId) === raw);
    if (!department) throw new Error(`Department '${id}' not found.`);
    // Highlights first; top up with the rest of the department when there are too few.
    let { artworks } = await metSearch({ departmentId: department.departmentId, isHighlight: true, q: "*" }, limit);
    if (artworks.length < limit) {
        const seen = new Set(artworks.map((a) => a.id));
        const more = await metSearch({ departmentId: department.departmentId, q: "*" }, limit - artworks.length, (o) => !seen.has(`met-${o.objectID}`));
        artworks = [...artworks, ...more.artworks];
    }
    return { id, name: department.displayName, museum: MUSEUM_NAMES.met, artworks };
}

export async function getHighlights(theme: string | undefined, limit = 12) {
    const q = theme?.trim() || undefined;
    const results = await fromMuseums(
        "both",
        () => (q
            ? aicTextSearch(q, limit, [{ term: { is_boosted: true } }], false)
            : aicSearch({ must: [{ term: { is_boosted: true } }], limit })
        ).then((r) => r.artworks),
        () => metSearch({ isHighlight: true, q: q ?? "*" }, metShare("both", limit)).then((r) => r.artworks),
        [] as ArtworkSummary[]
    );
    return { theme: q ?? null, artworks: interleave(results.aic, results.met).slice(0, limit) };
}
