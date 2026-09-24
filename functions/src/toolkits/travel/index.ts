import { z } from "zod/v4";
import type { DomainToolkit } from "../types";
import { requireUser } from "../shared/state";
import {
    GUIDE_SECTIONS, convertCurrency, getCountryProfile, getForecast, getGuideSection, getHolidays,
    getWeatherForDates, primaryCurrency, resolvePlace, searchPlaces, wikipediaSummary, wikivoyageSummary
} from "./sources";
import {
    ITEM_KINDS, addItem, createTrip, deleteTrip, getTripOverview, listTrips, removeItem, updateItem, updateTrip
} from "./trips";

const isoDate = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD.");
const currencyCode = z.string().regex(/^[A-Za-z]{3}$/, "Use a 3-letter ISO currency code.");
const time = z.string().regex(/^\d{2}:\d{2}$/, "Use HH:MM (24h).");

export const travelToolkit: DomainToolkit = {
    id: "travel",
    description: [
        "This site is a travel planner: discover destinations, then plan trips day by day.",
        "Audience: independent travellers researching a destination and organising an itinerary.",
        "Data: live weather (forecasts up to 16 days, last year's weather beyond that), Wikivoyage travel guides, Wikipedia summaries and photos, country facts, public holidays and exchange rates.",
        "Signed-in users can create trips, add itinerary items (activities, sights, food, transport, stays, notes) with costs, and see a budget in their home currency and a packing list derived from the weather.",
        "Design hints: bright, photographic and airy; destination photos as hero images; cards for places and itinerary items; a clear day-by-day timeline; weather shown with icons and temperatures.",
        "Sample routes: /destination/<city>, /country/<name>, /guide/<city>/<section>, /trips, /trips/<tripId>, /plan/<city>."
    ].join(" "),
    tools: [
        // --- Discovery -------------------------------------------------------------------------
        {
            name: "SearchPlaces",
            description: "Finds cities and places by name. Returns name, country, region, coordinates, timezone and population for each match.",
            inputSchema: { query: z.string().min(1), limit: z.number().int().min(1).max(20).optional() },
            readOnly: true,
            handler: async ({ query, limit }: { query: string; limit?: number }) => searchPlaces(query, limit)
        },
        {
            name: "GetDestination",
            description: "Everything for a destination page in one call: the place (coordinates, timezone), a Wikipedia summary with a photo, the Wikivoyage travel-guide intro, country facts, and a 7-day forecast. Accepts 'City' or 'City, Country'.",
            inputSchema: { place: z.string().min(1) },
            readOnly: true,
            handler: async ({ place }: { place: string }) => {
                const match = await resolvePlace(place);
                const [wikipedia, wikivoyage, forecast] = await Promise.all([
                    wikipediaSummary(match.name).catch(() => null),
                    wikivoyageSummary(match.name).catch(() => null),
                    getForecast(match.latitude, match.longitude, 7).catch(() => [])
                ]);
                return {
                    place: match,
                    wikipedia,
                    guideIntro: wikivoyage,
                    guideSections: GUIDE_SECTIONS,
                    country: getCountryProfile(match.countryCode),
                    localCurrency: primaryCurrency(match.countryCode) ?? null,
                    forecast
                };
            }
        },
        {
            name: "GetTravelGuide",
            description: `Returns one section of the Wikivoyage travel guide for a place as plain text (up to ~4000 characters), plus the list of sections the guide has. Sections: ${GUIDE_SECTIONS.join(", ")}.`,
            inputSchema: { place: z.string().min(1), section: z.enum(GUIDE_SECTIONS) },
            readOnly: true,
            handler: async ({ place, section }: { place: string; section: string }) => {
                const guide = await getGuideSection(place, section);
                if (!guide) throw new Error(`No Wikivoyage guide found for '${place}'.`);
                return guide;
            }
        },
        {
            name: "GetCountry",
            description: "Country facts by name or ISO code: official name, flag (emoji and image URL), capital, region, languages, currencies, calling codes, area and neighbouring countries.",
            inputSchema: { country: z.string().min(2) },
            readOnly: true,
            handler: async ({ country }: { country: string }) => {
                const profile = getCountryProfile(country);
                if (!profile) throw new Error(`Unknown country '${country}'.`);
                return profile;
            }
        },
        {
            name: "GetWeather",
            description: "Daily weather for a place and date range: forecast up to 16 days ahead, observed weather for past dates, and last year's weather on the same dates beyond the forecast range (the result says which). Each day has a summary, highs/lows in °C, precipitation and sunrise/sunset. Omit dates for the next 7 days.",
            inputSchema: { place: z.string().min(1), startDate: isoDate.optional(), endDate: isoDate.optional() },
            readOnly: true,
            handler: async ({ place, startDate, endDate }: { place: string; startDate?: string; endDate?: string }) => {
                const match = await resolvePlace(place);
                if (!startDate || !endDate) {
                    return { place: match, source: "forecast", days: await getForecast(match.latitude, match.longitude, 7) };
                }
                if (endDate < startDate) throw new Error("endDate must be on or after startDate.");
                return { place: match, ...(await getWeatherForDates(match.latitude, match.longitude, startDate, endDate)) };
            }
        },
        {
            name: "GetPublicHolidays",
            description: "Public holidays for a country (ISO 2-letter code) in a year, with local names. Useful to warn about closures during a trip.",
            inputSchema: { countryCode: z.string().length(2), year: z.number().int().min(1975).max(2100) },
            readOnly: true,
            handler: async ({ countryCode, year }: { countryCode: string; year: number }) => getHolidays(countryCode, year)
        },
        {
            name: "ConvertCurrency",
            description: "Converts an amount between currencies at today's European Central Bank reference rate (about 30 major currencies).",
            inputSchema: { amount: z.number().nonnegative(), from: currencyCode, to: currencyCode },
            readOnly: true,
            handler: async ({ amount, from, to }: { amount: number; from: string; to: string }) => convertCurrency(amount, from, to)
        },

        // --- Trips (signed-in users) -----------------------------------------------------------
        {
            name: "ListTrips",
            description: "Lists the signed-in user's trips (id, title, destination, dates, number of itinerary items), newest first.",
            inputSchema: {},
            readOnly: true,
            requiresAuth: true,
            handler: async (_args: unknown, ctx) => listTrips(requireUser(ctx.userId))
        },
        {
            name: "GetTripOverview",
            description: "Everything for a trip page in one call: trip details, a day-by-day plan (each day's itinerary items, weather and holidays), the budget converted to the home currency, and a packing list derived from the weather.",
            inputSchema: { tripId: z.string().min(1) },
            readOnly: true,
            requiresAuth: true,
            handler: async ({ tripId }: { tripId: string }, ctx) => getTripOverview(requireUser(ctx.userId), tripId)
        },
        {
            name: "CreateTrip",
            description: "Creates a trip for the signed-in user. The destination is a place name ('Lisbon' or 'Lisbon, Portugal'); dates are YYYY-MM-DD (at most 60 days). Home currency defaults to EUR.",
            inputSchema: {
                destination: z.string().min(1),
                startDate: isoDate,
                endDate: isoDate,
                title: z.string().max(120).optional(),
                homeCurrency: currencyCode.optional(),
                budget: z.number().nonnegative().optional(),
                notes: z.string().max(2000).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async (args: Parameters<typeof createTrip>[1], ctx) => createTrip(requireUser(ctx.userId), args)
        },
        {
            name: "UpdateTrip",
            description: "Changes a trip's title, dates, home currency, budget or notes. Dates can't move past existing itinerary items.",
            inputSchema: {
                tripId: z.string().min(1),
                title: z.string().max(120).optional(),
                startDate: isoDate.optional(),
                endDate: isoDate.optional(),
                homeCurrency: currencyCode.optional(),
                budget: z.number().nonnegative().optional(),
                notes: z.string().max(2000).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ tripId, ...changes }: { tripId: string } & Parameters<typeof updateTrip>[2], ctx) =>
                updateTrip(requireUser(ctx.userId), tripId, changes)
        },
        {
            name: "DeleteTrip",
            description: "Deletes one of the signed-in user's trips and its itinerary.",
            inputSchema: { tripId: z.string().min(1) },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ tripId }: { tripId: string }, ctx) => deleteTrip(requireUser(ctx.userId), tripId)
        },
        {
            name: "AddItineraryItem",
            description: `Adds an item to a trip day. kind is one of ${ITEM_KINDS.join(", ")}. Optional cost is in 'currency' (defaults to the destination's local currency).`,
            inputSchema: {
                tripId: z.string().min(1),
                date: isoDate,
                title: z.string().min(1).max(200),
                kind: z.enum(ITEM_KINDS),
                time: time.optional(),
                location: z.string().max(200).optional(),
                cost: z.number().nonnegative().optional(),
                currency: currencyCode.optional(),
                notes: z.string().max(2000).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ tripId, ...item }: { tripId: string } & Parameters<typeof addItem>[2], ctx) =>
                addItem(requireUser(ctx.userId), tripId, item)
        },
        {
            name: "UpdateItineraryItem",
            description: "Changes fields of an itinerary item (move it to another day, retime, rename, change cost...).",
            inputSchema: {
                tripId: z.string().min(1),
                itemId: z.string().min(1),
                date: isoDate.optional(),
                title: z.string().min(1).max(200).optional(),
                kind: z.enum(ITEM_KINDS).optional(),
                time: time.optional(),
                location: z.string().max(200).optional(),
                cost: z.number().nonnegative().optional(),
                currency: currencyCode.optional(),
                notes: z.string().max(2000).optional()
            },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ tripId, itemId, ...changes }: { tripId: string; itemId: string } & Parameters<typeof updateItem>[3], ctx) =>
                updateItem(requireUser(ctx.userId), tripId, itemId, changes)
        },
        {
            name: "RemoveItineraryItem",
            description: "Removes an item from a trip's itinerary.",
            inputSchema: { tripId: z.string().min(1), itemId: z.string().min(1) },
            readOnly: false,
            requiresAuth: true,
            handler: async ({ tripId, itemId }: { tripId: string; itemId: string }, ctx) =>
                removeItem(requireUser(ctx.userId), tripId, itemId)
        }
    ]
};
