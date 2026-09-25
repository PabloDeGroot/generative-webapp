import { z } from "zod/v4";
import type { DomainToolkit } from "../types";
import { requireUser } from "../shared/state";
import {
    ARTWORK_ID, getArtist, getArtwork, getDepartment, getHighlights, listDepartments, searchArtworks, type MuseumChoice
} from "./sources";
import {
    LIMITS, addToExhibition, createExhibition, deleteExhibition, getExhibition, listExhibitions, removeFromExhibition,
    updateExhibition
} from "./exhibitions";

const artworkId = z.string().regex(ARTWORK_ID, "Use an artwork id like 'aic-16568' or 'met-436535'.");
const museum = z.enum(["aic", "met", "both"]);
const limit = z.number().int().min(1).max(24);

const SUMMARY_SHAPE =
    "Each artwork is { id, title, artist, date, museum, imageUrl (~843 px), thumbUrl (~400 px), imageAlt }.";

export const museumToolkit: DomainToolkit = {
    id: "museum",
    description: [
        "This site is an online art museum built on the open collections of the Art Institute of Chicago and The Metropolitan Museum of Art: explore real artworks, artists and museum departments, and curate your own exhibitions.",
        "Audience: art lovers, students and curious visitors browsing, searching and learning about art.",
        "Data: hundreds of thousands of real artworks with museum photographs, dates, media, dimensions, provenance credit lines, gallery locations and curatorial descriptions; artist biographies and portraits from Wikipedia; museum highlights; departments. Artwork ids look like 'aic-16568' or 'met-436535'.",
        "Signed-in visitors can create exhibitions (a title, subtitle and description), add works to them with a personal note, remove works, and delete exhibitions.",
        "REAL IMAGE POLICY: always show the real artwork using imageUrl, thumbUrl or largeImageUrl from the tools, and real artist portraits via portraitUrl; these are same-origin /__art/... URLs. Never use generated /images/... routes for an artwork, an artist or a collection, and never invent image URLs. If a tool gives no image (e.g. portraitUrl is null), show a typographic placeholder instead. Use imageAlt as the alt text.",
        "Credit every work with title, artist, date and museum, and link to its sourceUrl on the museum's website where shown.",
        "All user text (exhibition titles, subtitles, descriptions, notes) is already HTML-escaped: insert it into pages exactly as returned, never decode or unescape it.",
        "Design hints: like the walls of a gallery — generous whitespace, calm neutral backgrounds, images large and uncropped (object-fit: contain), restrained serif typography, small museum-label captions; grids of thumbnails for search results and collections; one large image with a label and details for an artwork page.",
        "Page structure: every page starts with the site header component and ends with the site footer, so the site feels like one museum. When a component already shows the page's title (an artwork view, an artist profile, a feature hero), don't add another heading or h1 above it. Let data components fetch their own content: pass them the id, name or query from the route instead of copying tool results into the page.",
        "Sample routes: / (highlights), /artwork/<id>, /artist/<name>, /search/<query>, /collections, /collections/<departmentId>, /highlights/<theme>, /exhibitions, /exhibitions/<exhibitionId>."
    ].join(" "),
    tools: [
        // --- Collection (public) -----------------------------------------------------------------
        {
            name: "SearchArtworks",
            description: `Full-text search of artworks with images across both museums (results interleaved). Returns { query, total, artworks }. ${SUMMARY_SHAPE}`,
            inputSchema: { query: z.string().min(1).max(200), museum: museum.optional(), limit: limit.optional() },
            readOnly: true,
            handler: async ({ query, museum, limit }: { query: string; museum?: MuseumChoice; limit?: number }) =>
                searchArtworks(query, museum ?? "both", limit ?? 12)
        },
        {
            name: "GetArtwork",
            description: "Everything for an artwork page in one call: the summary fields plus largeImageUrl (up to ~1686 px), additionalImages [{ imageUrl, thumbUrl }], artistBio, medium, dimensions, creditLine, department, departmentId, placeOfOrigin, style, classification, description (plain text, may be empty), onView, gallery (or null), isPublicDomain, sourceUrl (museum web page) and moreByArtist (up to 8 other works by the same artist).",
            inputSchema: { id: artworkId },
            readOnly: true,
            handler: async ({ id }: { id: string }) => getArtwork(id)
        },
        {
            name: "GetArtist",
            description: `An artist by name ('Claude Monet', 'Hokusai'): { name, description (e.g. 'French painter (1840–1926)'), bio (Wikipedia, plain text), born, died (years or null), portraitUrl (real portrait or null), wikipediaUrl, artworks (up to 12 from both museums) }. ${SUMMARY_SHAPE}`,
            inputSchema: { name: z.string().min(2).max(120) },
            readOnly: true,
            handler: async ({ name }: { name: string }) => getArtist(name)
        },
        {
            name: "ListDepartments",
            description: "The museums' curatorial departments (collections): { departments: [{ id ('aic-PC-10', 'met-11'), museum, name, coverImageUrl (thumbnail of a representative work, or null) }] }.",
            inputSchema: { museum: museum.optional() },
            readOnly: true,
            handler: async ({ museum }: { museum?: MuseumChoice }) => listDepartments(museum ?? "both")
        },
        {
            name: "GetDepartment",
            description: `One department with notable works (highlights first): { id, name, museum, artworks }. ${SUMMARY_SHAPE}`,
            inputSchema: { id: z.string().min(1), limit: limit.optional() },
            readOnly: true,
            handler: async ({ id, limit }: { id: string; limit?: number }) => getDepartment(id, limit ?? 12)
        },
        {
            name: "GetHighlights",
            description: `The museums' highlighted masterpieces, optionally on a theme ('impressionism', 'japan', 'portraits'): { theme (or null), artworks }. ${SUMMARY_SHAPE}`,
            inputSchema: { theme: z.string().max(100).optional(), limit: limit.optional() },
            readOnly: true,
            handler: async ({ theme, limit }: { theme?: string; limit?: number }) => getHighlights(theme, limit ?? 12)
        },

        // --- Exhibitions (signed-in users) ------------------------------------------------------
        {
            name: "ListExhibitions",
            description: "The signed-in user's exhibitions, most recently updated first: { exhibitions: [{ id, title, subtitle, artworkCount, coverImageUrl (or null), updatedAt }] }.",
            inputSchema: {},
            readOnly: true,
            requiresAuth: true,
            handler: async (_args: unknown, ctx) => listExhibitions(requireUser(ctx.userId))
        },
        {
            name: "GetExhibition",
            description: `One of the user's exhibitions: { id, title, subtitle, description, createdAt, updatedAt, artworks }. Each artwork has the summary fields plus note (the user's note, may be empty). ${SUMMARY_SHAPE}`,
            inputSchema: { exhibitionId: z.string().min(1) },
            readOnly: true,
            requiresAuth: true,
            handler: async ({ exhibitionId }: { exhibitionId: string }, ctx) => getExhibition(requireUser(ctx.userId), exhibitionId)
        },
        {
            name: "CreateExhibition",
            description: "Creates an exhibition for the signed-in user. Returns { id, title }.",
            inputSchema: {
                title: z.string().min(1).max(LIMITS.title),
                subtitle: z.string().max(LIMITS.subtitle).optional(),
                description: z.string().max(LIMITS.description).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async (args: { title: string; subtitle?: string; description?: string }, ctx) =>
                createExhibition(requireUser(ctx.userId), args)
        },
        {
            name: "UpdateExhibition",
            description: "Changes an exhibition's title, subtitle or description. Returns { id }.",
            inputSchema: {
                exhibitionId: z.string().min(1),
                title: z.string().min(1).max(LIMITS.title).optional(),
                subtitle: z.string().max(LIMITS.subtitle).optional(),
                description: z.string().max(LIMITS.description).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ exhibitionId, ...changes }: { exhibitionId: string; title?: string; subtitle?: string; description?: string }, ctx) =>
                updateExhibition(requireUser(ctx.userId), exhibitionId, changes)
        },
        {
            name: "AddToExhibition",
            description: `Adds an artwork (by id) to an exhibition, with an optional note. No duplicates; at most ${LIMITS.artworks} works. Returns { exhibitionId, artworkCount }.`,
            inputSchema: {
                exhibitionId: z.string().min(1),
                artworkId,
                note: z.string().max(LIMITS.note).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ exhibitionId, artworkId, note }: { exhibitionId: string; artworkId: string; note?: string }, ctx) =>
                addToExhibition(requireUser(ctx.userId), exhibitionId, artworkId, note)
        },
        {
            name: "RemoveFromExhibition",
            description: "Removes an artwork from an exhibition. Returns { exhibitionId, artworkCount }.",
            inputSchema: { exhibitionId: z.string().min(1), artworkId },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ exhibitionId, artworkId }: { exhibitionId: string; artworkId: string }, ctx) =>
                removeFromExhibition(requireUser(ctx.userId), exhibitionId, artworkId)
        },
        {
            name: "DeleteExhibition",
            description: "Deletes one of the user's exhibitions. Returns { deleted: true }.",
            inputSchema: { exhibitionId: z.string().min(1) },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ exhibitionId }: { exhibitionId: string }, ctx) => deleteExhibition(requireUser(ctx.userId), exhibitionId)
        }
    ]
};
