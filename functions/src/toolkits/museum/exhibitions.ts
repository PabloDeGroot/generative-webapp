import { randomInt } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import { userCollection } from "../shared/state";
import { escapeText } from "../community/forum";
import { getArtworkSummary, parseArtworkId, type ArtworkSummary } from "./sources";

// A signed-in user's own exhibitions ("virtual shows"), stored at
// toolkits/museum/users/{uid}/exhibitions/{id}. Artworks are kept as summary snapshots so an
// exhibition page needs no call to the museum APIs. Titles, subtitles, descriptions and notes are
// user text and are stored HTML-escaped: pages are LLM-written HTML inserted with {@html}.

export const LIMITS = { title: 120, subtitle: 200, description: 4000, note: 1000, artworks: 60, listed: 100 } as const;

type ExhibitionArtwork = ArtworkSummary & { note: string };

interface ExhibitionData {
    title: string;
    subtitle: string;
    description: string;
    artworks: ExhibitionArtwork[];
    createdAt: string;
    updatedAt: string;
}

const exhibitions = (userId: string) => userCollection(userId, "exhibitions");

function cleanText(value: string | undefined, max: number, field: string, required = false): string {
    const trimmed = (value ?? "").trim();
    if (required && !trimmed) throw new Error(`${field} can't be empty.`);
    if (trimmed.length > max) throw new Error(`${field} is limited to ${max} characters.`);
    return escapeText(trimmed);
}

async function load(userId: string, exhibitionId: string): Promise<ExhibitionData> {
    const snap = await exhibitions(userId).doc(exhibitionId).get();
    if (!snap.exists) throw new Error(`Exhibition '${exhibitionId}' not found.`);
    return snap.data() as ExhibitionData;
}

/** Read-modify-write of an exhibition's artworks inside a transaction; returns the new count. */
async function changeArtworks(userId: string, exhibitionId: string, change: (artworks: ExhibitionArtwork[]) => ExhibitionArtwork[]): Promise<number> {
    const ref = exhibitions(userId).doc(exhibitionId);
    return getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error(`Exhibition '${exhibitionId}' not found.`);
        const artworks = change((snap.data() as ExhibitionData).artworks ?? []);
        tx.update(ref, { artworks, updatedAt: new Date().toISOString() });
        return artworks.length;
    });
}

export async function listExhibitions(userId: string) {
    const snap = await exhibitions(userId).orderBy("updatedAt", "desc").limit(LIMITS.listed).get();
    return {
        exhibitions: snap.docs.map((doc) => {
            const e = doc.data() as ExhibitionData;
            return {
                id: doc.id,
                title: e.title,
                subtitle: e.subtitle ?? "",
                artworkCount: e.artworks?.length ?? 0,
                coverImageUrl: e.artworks?.[0]?.thumbUrl ?? null,
                updatedAt: e.updatedAt
            };
        })
    };
}

export async function getExhibition(userId: string, exhibitionId: string) {
    const e = await load(userId, exhibitionId);
    return {
        id: exhibitionId,
        title: e.title,
        subtitle: e.subtitle ?? "",
        description: e.description ?? "",
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
        artworks: e.artworks ?? []
    };
}

export async function createExhibition(userId: string, input: { title: string; subtitle?: string; description?: string }) {
    const now = new Date().toISOString();
    const data: ExhibitionData = {
        title: cleanText(input.title, LIMITS.title, "title", true),
        subtitle: cleanText(input.subtitle, LIMITS.subtitle, "subtitle"),
        description: cleanText(input.description, LIMITS.description, "description"),
        artworks: [],
        createdAt: now,
        updatedAt: now
    };
    // Readable ids ("water-and-light-7k2p"): LLMs copy them into links and requests, and they
    // mangle long random ids. create() fails on the rare clash, so try a fresh suffix.
    for (let attempt = 0; ; attempt++) {
        const ref = exhibitions(userId).doc(exhibitionSlug(input.title));
        try {
            await ref.create(data);
            return { id: ref.id, title: data.title };
        } catch (error) {
            if (attempt >= 2 || (error as { code?: number }).code !== 6 /* ALREADY_EXISTS */) throw error;
        }
    }
}

const SUFFIX_CHARS = "23456789abcdefghjkmnpqrstuvwxyz"; // no 0/o, 1/l/i

function exhibitionSlug(title: string): string {
    const base = title
        .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
        .toLowerCase().replace(/&/g, " and ")
        .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "")
        .slice(0, 40).replace(/-+$/g, "") || "exhibition";
    const suffix = Array.from({ length: 4 }, () => SUFFIX_CHARS[randomInt(SUFFIX_CHARS.length)]).join("");
    return `${base}-${suffix}`;
}

export async function updateExhibition(userId: string, exhibitionId: string, changes: { title?: string; subtitle?: string; description?: string }) {
    const update: Partial<ExhibitionData> = {};
    if (changes.title !== undefined) update.title = cleanText(changes.title, LIMITS.title, "title", true);
    if (changes.subtitle !== undefined) update.subtitle = cleanText(changes.subtitle, LIMITS.subtitle, "subtitle");
    if (changes.description !== undefined) update.description = cleanText(changes.description, LIMITS.description, "description");
    if (!Object.keys(update).length) throw new Error("Nothing to update: pass title, subtitle or description.");
    const ref = exhibitions(userId).doc(exhibitionId);
    if (!(await ref.get()).exists) throw new Error(`Exhibition '${exhibitionId}' not found.`);
    await ref.update({ ...update, updatedAt: new Date().toISOString() });
    return { id: exhibitionId };
}

export async function addToExhibition(userId: string, exhibitionId: string, artworkId: string, note?: string) {
    parseArtworkId(artworkId);
    const cleanNote = cleanText(note, LIMITS.note, "note");
    await load(userId, exhibitionId); // fail fast before calling the museum API
    const summary = await getArtworkSummary(artworkId);
    const artworkCount = await changeArtworks(userId, exhibitionId, (artworks) => {
        if (artworks.some((a) => a.id === summary.id)) throw new Error(`'${summary.title}' is already in this exhibition.`);
        if (artworks.length >= LIMITS.artworks) throw new Error(`An exhibition can hold at most ${LIMITS.artworks} works.`);
        return [...artworks, { ...summary, note: cleanNote }];
    });
    return { exhibitionId, artworkCount };
}

export async function removeFromExhibition(userId: string, exhibitionId: string, artworkId: string) {
    const artworkCount = await changeArtworks(userId, exhibitionId, (artworks) => {
        const remaining = artworks.filter((a) => a.id !== artworkId.trim());
        if (remaining.length === artworks.length) throw new Error(`Artwork '${artworkId}' is not in this exhibition.`);
        return remaining;
    });
    return { exhibitionId, artworkCount };
}

export async function deleteExhibition(userId: string, exhibitionId: string) {
    const ref = exhibitions(userId).doc(exhibitionId);
    if (!(await ref.get()).exists) throw new Error(`Exhibition '${exhibitionId}' not found.`);
    await ref.delete();
    return { deleted: true as const };
}
