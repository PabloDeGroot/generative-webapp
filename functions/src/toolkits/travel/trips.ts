import { randomUUID } from "node:crypto";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { userCollection } from "../shared/state";
import {
    addDays, daysBetween, getHolidaysBetween, getRate, getWeatherForDates, primaryCurrency, resolvePlace,
    type DayWeather, type Holiday, type TripWeather
} from "./sources";

// Trips are stored per user at toolkits/travel/users/{uid}/trips/{tripId}, with the itinerary as
// an array on the trip document so one read returns a whole trip.

export const ITEM_KINDS = ["activity", "sight", "food", "transport", "stay", "note"] as const;
export type ItemKind = (typeof ITEM_KINDS)[number];

const MAX_TRIP_DAYS = 60;
const MAX_ITEMS = 200;
const MAX_TRIPS_LISTED = 50;

export interface Destination {
    name: string;
    country: string;
    countryCode: string;
    region?: string;
    latitude: number;
    longitude: number;
    timezone: string;
    currency?: string;
}

export interface ItineraryItem {
    id: string;
    date: string;
    time?: string;
    title: string;
    kind: ItemKind;
    location?: string;
    cost?: number;
    currency?: string;
    notes?: string;
}

export interface Trip {
    id: string;
    title: string;
    destination: Destination;
    startDate: string;
    endDate: string;
    homeCurrency: string;
    budget?: number;
    notes?: string;
    items: ItineraryItem[];
}

const trips = (userId: string) => userCollection(userId, "trips");

function validateDates(startDate: string, endDate: string): void {
    if (endDate < startDate) throw new Error("endDate must be on or after startDate.");
    if (daysBetween(startDate, endDate) >= MAX_TRIP_DAYS) throw new Error(`Trips can last at most ${MAX_TRIP_DAYS} days.`);
}

function sortItems(items: ItineraryItem[]): ItineraryItem[] {
    return [...items].sort((a, b) => a.date.localeCompare(b.date) || (a.time ?? "99:99").localeCompare(b.time ?? "99:99"));
}

function toTrip(id: string, data: FirebaseFirestore.DocumentData): Trip {
    return {
        id,
        title: data.title,
        destination: data.destination,
        startDate: data.startDate,
        endDate: data.endDate,
        homeCurrency: data.homeCurrency,
        budget: data.budget ?? undefined,
        notes: data.notes ?? undefined,
        items: sortItems(data.items ?? [])
    };
}

async function loadTrip(userId: string, tripId: string): Promise<Trip> {
    const snap = await trips(userId).doc(tripId).get();
    if (!snap.exists) throw new Error(`Trip '${tripId}' not found.`);
    return toTrip(snap.id, snap.data()!);
}

/** Read-modify-write on a trip's itinerary inside a transaction. */
async function updateItems(userId: string, tripId: string, change: (trip: Trip) => ItineraryItem[]): Promise<Trip> {
    const ref = trips(userId).doc(tripId);
    return getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(ref);
        if (!snap.exists) throw new Error(`Trip '${tripId}' not found.`);
        const trip = toTrip(snap.id, snap.data()!);
        const items = sortItems(change(trip));
        if (items.length > MAX_ITEMS) throw new Error(`A trip can hold at most ${MAX_ITEMS} itinerary items.`);
        tx.update(ref, { items, updatedAt: FieldValue.serverTimestamp() });
        return { ...trip, items };
    });
}

function checkItemDate(trip: Trip, date: string): void {
    if (date < trip.startDate || date > trip.endDate) {
        throw new Error(`${date} is outside the trip (${trip.startDate} to ${trip.endDate}).`);
    }
}

function withoutUndefined<T extends object>(value: T): T {
    return Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T;
}

// ---------------------------------------------------------------------------
// CRUD
// ---------------------------------------------------------------------------

export async function listTrips(userId: string) {
    const snap = await trips(userId).orderBy("startDate", "desc").limit(MAX_TRIPS_LISTED).get();
    return snap.docs.map((d) => {
        const t = toTrip(d.id, d.data());
        return {
            id: t.id, title: t.title, destination: t.destination.name, country: t.destination.country,
            startDate: t.startDate, endDate: t.endDate, itemCount: t.items.length
        };
    });
}

export async function createTrip(userId: string, input: {
    destination: string; startDate: string; endDate: string; title?: string; homeCurrency?: string; budget?: number; notes?: string;
}): Promise<Trip> {
    validateDates(input.startDate, input.endDate);
    const place = await resolvePlace(input.destination);
    const destination: Destination = withoutUndefined({
        name: place.name, country: place.country, countryCode: place.countryCode, region: place.region,
        latitude: place.latitude, longitude: place.longitude, timezone: place.timezone,
        currency: primaryCurrency(place.countryCode)
    });
    const data = withoutUndefined({
        title: input.title?.trim() || `${place.name} trip`,
        destination,
        startDate: input.startDate,
        endDate: input.endDate,
        homeCurrency: (input.homeCurrency ?? "EUR").toUpperCase(),
        budget: input.budget,
        notes: input.notes,
        items: [],
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp()
    });
    const ref = await trips(userId).add(data);
    return toTrip(ref.id, data);
}

export async function updateTrip(userId: string, tripId: string, changes: {
    title?: string; startDate?: string; endDate?: string; homeCurrency?: string; budget?: number; notes?: string;
}): Promise<Trip> {
    const trip = await loadTrip(userId, tripId);
    const startDate = changes.startDate ?? trip.startDate;
    const endDate = changes.endDate ?? trip.endDate;
    validateDates(startDate, endDate);
    const outside = trip.items.filter((i) => i.date < startDate || i.date > endDate);
    if (outside.length) {
        throw new Error(`${outside.length} itinerary item(s) would fall outside the new dates; move or remove them first.`);
    }
    const update = withoutUndefined({
        ...changes,
        homeCurrency: changes.homeCurrency?.toUpperCase(),
        updatedAt: FieldValue.serverTimestamp()
    });
    await trips(userId).doc(tripId).update(update);
    return loadTrip(userId, tripId);
}

export async function deleteTrip(userId: string, tripId: string) {
    await loadTrip(userId, tripId);
    await trips(userId).doc(tripId).delete();
    return { deleted: tripId };
}

export async function addItem(userId: string, tripId: string, input: Omit<ItineraryItem, "id">): Promise<ItineraryItem> {
    const item: ItineraryItem = withoutUndefined({ ...input, id: randomUUID().slice(0, 8), currency: input.currency?.toUpperCase() });
    await updateItems(userId, tripId, (trip) => {
        checkItemDate(trip, item.date);
        return [...trip.items, item];
    });
    return item;
}

export async function updateItem(userId: string, tripId: string, itemId: string, changes: Partial<Omit<ItineraryItem, "id">>): Promise<ItineraryItem> {
    let updated: ItineraryItem | undefined;
    await updateItems(userId, tripId, (trip) => trip.items.map((item) => {
        if (item.id !== itemId) return item;
        updated = withoutUndefined({ ...item, ...changes, currency: (changes.currency ?? item.currency)?.toUpperCase() });
        checkItemDate(trip, updated.date);
        return updated;
    }));
    if (!updated) throw new Error(`Itinerary item '${itemId}' not found.`);
    return updated;
}

export async function removeItem(userId: string, tripId: string, itemId: string) {
    let found = false;
    await updateItems(userId, tripId, (trip) => trip.items.filter((item) => {
        if (item.id === itemId) found = true;
        return item.id !== itemId;
    }));
    if (!found) throw new Error(`Itinerary item '${itemId}' not found.`);
    return { removed: itemId };
}

// ---------------------------------------------------------------------------
// Computed views
// ---------------------------------------------------------------------------

export async function computeBudget(trip: Trip) {
    const home = trip.homeCurrency;
    const byKind: Record<string, number> = {};
    const unconverted: Array<{ itemId: string; amount: number; currency: string }> = [];
    let total = 0;
    for (const item of trip.items) {
        if (typeof item.cost !== "number") continue;
        const currency = item.currency ?? trip.destination.currency ?? home;
        const quote = await getRate(currency, home);
        if (!quote) {
            unconverted.push({ itemId: item.id, amount: item.cost, currency });
            continue;
        }
        const value = item.cost * quote.rate;
        total += value;
        byKind[item.kind] = (byKind[item.kind] ?? 0) + value;
    }
    const round = (n: number) => Math.round(n * 100) / 100;
    return {
        currency: home,
        total: round(total),
        byKind: Object.fromEntries(Object.entries(byKind).map(([k, v]) => [k, round(v)])),
        budget: trip.budget ?? null,
        remaining: typeof trip.budget === "number" ? round(trip.budget - total) : null,
        unconverted
    };
}

/** Rule-based packing list from the trip's length and weather. */
export function computePackingList(trip: Trip, weather: DayWeather[]) {
    const nights = Math.max(daysBetween(trip.startDate, trip.endDate), 1);
    const outfits = Math.min(nights + 1, 7);
    const maxTemps = weather.map((d) => d.tempMaxC).filter((t): t is number => t !== null);
    const minTemps = weather.map((d) => d.tempMinC).filter((t): t is number => t !== null);
    const hottest = maxTemps.length ? Math.max(...maxTemps) : null;
    const coldest = minTemps.length ? Math.min(...minTemps) : null;
    const wetDays = weather.filter((d) => (d.precipitationChance ?? 0) >= 40 || (d.precipitationMm ?? 0) >= 2).length;
    const snowy = weather.some((d) => d.weatherCode !== null && [71, 73, 75, 77, 85, 86].includes(d.weatherCode));

    const list: Array<{ item: string; quantity?: number; reason: string; category: string }> = [
        { item: "Passport or ID", category: "Documents", reason: "Always" },
        { item: "Phone charger and power adapter", category: "Electronics", reason: "Always" },
        { item: "Toiletries", category: "Personal", reason: "Always" },
        { item: "Underwear and socks", quantity: outfits, category: "Clothing", reason: `${nights} night(s)` },
        { item: "Tops", quantity: outfits, category: "Clothing", reason: `${nights} night(s)` },
        { item: "Comfortable walking shoes", category: "Clothing", reason: "Sightseeing" }
    ];
    if (nights > 7) list.push({ item: "Travel laundry kit", category: "Personal", reason: `${nights} nights: plan to wash clothes` });
    if (wetDays > 0) list.push({ item: "Umbrella or rain jacket", category: "Weather", reason: `${wetDays} day(s) with rain likely` });
    if (coldest !== null && coldest < 10) list.push({ item: "Warm jacket and layers", category: "Weather", reason: `Lows down to ${coldest}°C` });
    if (coldest !== null && coldest < 0) list.push({ item: "Hat, gloves and scarf", category: "Weather", reason: "Below-freezing nights" });
    if (snowy) list.push({ item: "Waterproof boots", category: "Weather", reason: "Snow expected" });
    if (hottest !== null && hottest >= 25) list.push({ item: "Sunscreen, sunglasses and a hat", category: "Weather", reason: `Highs up to ${hottest}°C` });
    if (hottest !== null && hottest >= 27) list.push({ item: "Swimwear", category: "Clothing", reason: "Hot days" });
    if (trip.items.some((i) => i.kind === "transport")) list.push({ item: "Tickets and booking confirmations", category: "Documents", reason: "Transport in the itinerary" });
    return { nights, weatherBasis: weather.length ? { hottestC: hottest, coldestC: coldest, wetDays } : null, items: list };
}

/** Everything a trip page needs in one call: the trip, day-by-day plan with weather, holidays, budget, packing list. */
export async function getTripOverview(userId: string, tripId: string) {
    const trip = await loadTrip(userId, tripId);
    const { latitude, longitude, countryCode } = trip.destination;
    const [weather, holidays] = await Promise.all([
        getWeatherForDates(latitude, longitude, trip.startDate, trip.endDate).catch((): TripWeather => ({ source: "forecast", note: "Weather unavailable.", days: [] })),
        getHolidaysBetween(countryCode, trip.startDate, trip.endDate).catch((): Holiday[] => [])
    ]);
    const weatherByDate = new Map(weather.days.map((d) => [d.date, d]));
    const days = [];
    for (let date = trip.startDate; date <= trip.endDate; date = addDays(date, 1)) {
        days.push({
            date,
            weather: weatherByDate.get(date) ?? null,
            holidays: holidays.filter((h) => h.date === date).map((h) => h.name),
            items: trip.items.filter((i) => i.date === date)
        });
    }
    const { items: _items, ...tripFields } = trip;
    return {
        trip: tripFields,
        weatherNote: weather.note,
        days,
        holidays,
        budget: await computeBudget(trip),
        packingList: computePackingList(trip, weather.days)
    };
}
