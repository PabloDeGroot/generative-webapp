import countries from "world-countries";
import { fetchJson, UpstreamError, withQuery } from "../shared/http";

// Data sources for the travel toolkit. None need an API key:
//   Open-Meteo (geocoding, forecast, historical weather), Wikipedia + Wikivoyage (summaries and
//   guides), Nager.Date (public holidays), Frankfurter (exchange rates), and the bundled
//   world-countries dataset (the data behind REST Countries, whose API now requires a key).

const DAY_MS = 24 * 60 * 60 * 1000;

// ---------------------------------------------------------------------------
// Places
// ---------------------------------------------------------------------------

export interface Place {
    id: number;
    name: string;
    country: string;
    countryCode: string;
    region?: string;
    latitude: number;
    longitude: number;
    timezone: string;
    population?: number;
}

interface GeocodingResponse {
    results?: Array<{
        id: number; name: string; country?: string; country_code?: string; admin1?: string;
        latitude: number; longitude: number; timezone?: string; population?: number;
    }>;
}

export async function searchPlaces(query: string, limit = 5): Promise<Place[]> {
    const data = await fetchJson<GeocodingResponse | null>(withQuery("https://geocoding-api.open-meteo.com/v1/search", {
        name: query, count: limit, language: "en", format: "json"
    }), { ttlSeconds: 24 * 3600 });
    return (data?.results ?? []).map((r) => ({
        id: r.id,
        name: r.name,
        country: r.country ?? "",
        countryCode: r.country_code ?? "",
        region: r.admin1,
        latitude: r.latitude,
        longitude: r.longitude,
        timezone: r.timezone ?? "UTC",
        population: r.population
    }));
}

/** Best match for a free-text place name ("Lisbon", "Kyoto, Japan"). Throws when nothing matches. */
export async function resolvePlace(query: string): Promise<Place> {
    const [name, countryHint] = query.split(",").map((s) => s.trim());
    const matches = await searchPlaces(name, 10);
    const hint = countryHint?.toLowerCase();
    const match = hint
        ? matches.find((m) => m.country.toLowerCase() === hint || m.countryCode.toLowerCase() === hint)
        : matches[0];
    if (!match) throw new Error(`No place found for '${query}'.`);
    return match;
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

// WMO weather interpretation codes, as used by Open-Meteo.
const WEATHER_CODES: Record<number, string> = {
    0: "Clear sky", 1: "Mainly clear", 2: "Partly cloudy", 3: "Overcast", 45: "Fog", 48: "Rime fog",
    51: "Light drizzle", 53: "Drizzle", 55: "Dense drizzle", 56: "Freezing drizzle", 57: "Dense freezing drizzle",
    61: "Light rain", 63: "Rain", 65: "Heavy rain", 66: "Freezing rain", 67: "Heavy freezing rain",
    71: "Light snow", 73: "Snow", 75: "Heavy snow", 77: "Snow grains",
    80: "Light showers", 81: "Showers", 82: "Violent showers", 85: "Snow showers", 86: "Heavy snow showers",
    95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with heavy hail"
};

export interface DayWeather {
    date: string;
    summary: string;
    weatherCode: number | null;
    tempMaxC: number | null;
    tempMinC: number | null;
    precipitationMm: number | null;
    precipitationChance?: number | null;
    windMaxKmh?: number | null;
    sunrise?: string;
    sunset?: string;
}

interface DailyResponse {
    timezone: string;
    daily?: Record<string, Array<number | string | null>> & { time: string[] };
}

function toDays(data: DailyResponse | null): DayWeather[] {
    const d = data?.daily;
    if (!d) return [];
    const at = (key: string, i: number) => (d[key]?.[i] ?? null);
    return d.time.map((date, i) => {
        const code = at("weather_code", i) as number | null;
        return {
            date,
            summary: code === null ? "Unknown" : WEATHER_CODES[code] ?? `Weather code ${code}`,
            weatherCode: code,
            tempMaxC: at("temperature_2m_max", i) as number | null,
            tempMinC: at("temperature_2m_min", i) as number | null,
            precipitationMm: at("precipitation_sum", i) as number | null,
            precipitationChance: at("precipitation_probability_max", i) as number | null,
            windMaxKmh: at("wind_speed_10m_max", i) as number | null,
            sunrise: (at("sunrise", i) as string | null) ?? undefined,
            sunset: (at("sunset", i) as string | null) ?? undefined
        };
    });
}

/** Daily forecast for up to 16 days ahead. */
export async function getForecast(latitude: number, longitude: number, days = 7): Promise<DayWeather[]> {
    const data = await fetchJson<DailyResponse | null>(withQuery("https://api.open-meteo.com/v1/forecast", {
        latitude, longitude, timezone: "auto", forecast_days: Math.min(Math.max(days, 1), 16),
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,sunrise,sunset"
    }), { ttlSeconds: 1800 });
    return toDays(data);
}

/** Observed weather for past dates (ERA5 reanalysis; available up to about 5 days ago). */
export async function getObservedWeather(latitude: number, longitude: number, startDate: string, endDate: string): Promise<DayWeather[]> {
    const data = await fetchJson<DailyResponse | null>(withQuery("https://archive-api.open-meteo.com/v1/archive", {
        latitude, longitude, timezone: "auto", start_date: startDate, end_date: endDate,
        daily: "weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,wind_speed_10m_max,sunrise,sunset"
    }), { ttlSeconds: 7 * 24 * 3600 });
    return toDays(data);
}

export function isoDate(date: Date): string {
    return date.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number): string {
    return isoDate(new Date(Date.parse(`${date}T00:00:00Z`) + days * DAY_MS));
}

export function daysBetween(start: string, end: string): number {
    return Math.round((Date.parse(`${end}T00:00:00Z`) - Date.parse(`${start}T00:00:00Z`)) / DAY_MS);
}

export interface TripWeather {
    source: "forecast" | "last-year" | "observed" | "mixed";
    note: string;
    days: DayWeather[];
}

/**
 * Weather for a date range, whatever its distance from today: the forecast where it reaches,
 * observed weather for the past, and the same dates last year as "typical" weather beyond the
 * forecast horizon (reported with this year's dates).
 */
export async function getWeatherForDates(latitude: number, longitude: number, startDate: string, endDate: string): Promise<TripWeather> {
    const today = isoDate(new Date());
    const forecastEnd = addDays(today, 15);
    const observedEnd = addDays(today, -6);
    const byDate = new Map<string, DayWeather>();
    const sources = new Set<TripWeather["source"]>();

    if (startDate <= observedEnd) {
        const end = endDate < observedEnd ? endDate : observedEnd;
        for (const d of await getObservedWeather(latitude, longitude, startDate, end)) byDate.set(d.date, d);
        sources.add("observed");
    }
    if (endDate >= today && startDate <= forecastEnd) {
        for (const d of await getForecast(latitude, longitude, 16)) {
            if (d.date >= startDate && d.date <= endDate) byDate.set(d.date, d);
        }
        sources.add("forecast");
    }
    if (endDate > forecastEnd) {
        const from = startDate > forecastEnd ? startDate : addDays(forecastEnd, 1);
        const lastYear = await getObservedWeather(latitude, longitude, addDays(from, -364), addDays(endDate, -364));
        for (const d of lastYear) {
            const date = addDays(d.date, 364);
            if (!byDate.has(date)) byDate.set(date, { ...d, date });
        }
        sources.add("last-year");
    }

    const days = [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
    const source = sources.size === 1 ? [...sources][0] : "mixed";
    const note = source === "forecast" ? "Forecast."
        : source === "observed" ? "Observed weather."
        : source === "last-year" ? "Beyond the forecast range: weather on the same dates last year, as a guide."
        : "Forecast where available; observed weather for past days and last year's weather beyond the forecast range.";
    return { source, note, days };
}

// ---------------------------------------------------------------------------
// Countries (bundled dataset)
// ---------------------------------------------------------------------------

export interface CountryProfile {
    name: string;
    officialName: string;
    code: string;
    flagEmoji: string;
    flagImage: string;
    capital: string[];
    region: string;
    subregion: string;
    languages: string[];
    currencies: Array<{ code: string; name: string; symbol?: string }>;
    callingCodes: string[];
    landlocked: boolean;
    areaKm2: number;
    latitude: number;
    longitude: number;
    borders: Array<{ code: string; name: string }>;
}

const byCca3 = new Map(countries.map((c) => [c.cca3, c]));

function findCountry(query: string) {
    const q = query.trim().toLowerCase();
    return countries.find((c) => c.cca2.toLowerCase() === q || c.cca3.toLowerCase() === q)
        ?? countries.find((c) => c.name.common.toLowerCase() === q || c.name.official.toLowerCase() === q)
        ?? countries.find((c) => c.altSpellings.some((s) => s.toLowerCase() === q));
}

/** Country by ISO code (PT, PRT) or name. Returns null when unknown. */
export function getCountryProfile(query: string): CountryProfile | null {
    const c = findCountry(query);
    if (!c) return null;
    const root = c.idd.root ?? "";
    return {
        name: c.name.common,
        officialName: c.name.official,
        code: c.cca2,
        flagEmoji: c.flag,
        flagImage: `https://flagcdn.com/w320/${c.cca2.toLowerCase()}.png`,
        capital: c.capital,
        region: c.region,
        subregion: c.subregion,
        languages: Object.values(c.languages ?? {}),
        currencies: Object.entries(c.currencies ?? {}).map(([code, v]) => ({ code, name: v.name, symbol: v.symbol })),
        callingCodes: (c.idd.suffixes ?? []).slice(0, 5).map((s) => `${root}${s}`),
        landlocked: c.landlocked,
        areaKm2: c.area,
        latitude: c.latlng[0],
        longitude: c.latlng[1],
        borders: c.borders.map((code) => ({ code: byCca3.get(code)?.cca2 ?? code, name: byCca3.get(code)?.name.common ?? code }))
    };
}

export function primaryCurrency(countryCode: string): string | undefined {
    return getCountryProfile(countryCode)?.currencies[0]?.code;
}

// ---------------------------------------------------------------------------
// Wikipedia / Wikivoyage
// ---------------------------------------------------------------------------

export interface WikiSummary {
    title: string;
    description?: string;
    extract: string;
    image?: string;
    url?: string;
}

interface RestSummary {
    title: string; description?: string; extract?: string;
    thumbnail?: { source: string }; originalimage?: { source: string };
    content_urls?: { desktop?: { page?: string } };
}

async function restSummary(site: "en.wikipedia.org" | "en.wikivoyage.org", title: string): Promise<WikiSummary | null> {
    try {
        const data = await fetchJson<RestSummary | null>(
            `https://${site}/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`,
            { ttlSeconds: 24 * 3600 }
        );
        if (!data) return null;
        return {
            title: data.title,
            description: data.description,
            extract: data.extract ?? "",
            image: data.originalimage?.source ?? data.thumbnail?.source,
            url: data.content_urls?.desktop?.page
        };
    } catch (error) {
        if (error instanceof UpstreamError && error.status === 404) return null;
        throw error;
    }
}

export const wikipediaSummary = (title: string) => restSummary("en.wikipedia.org", title);
export const wikivoyageSummary = (title: string) => restSummary("en.wikivoyage.org", title);

export const GUIDE_SECTIONS = [
    "Understand", "Get in", "Get around", "See", "Do", "Buy", "Eat", "Drink", "Sleep", "Stay safe", "Connect", "Go next"
] as const;

const MAX_SECTION_CHARS = 4000;

/** One section of a Wikivoyage guide as plain text, plus the sections the guide has. */
export async function getGuideSection(title: string, section: string): Promise<{ title: string; section: string; text: string; availableSections: string[]; url: string } | null> {
    const data = await fetchJson<{ query?: { pages?: Array<{ title: string; missing?: boolean; extract?: string }> } } | null>(
        withQuery("https://en.wikivoyage.org/w/api.php", {
            action: "query", prop: "extracts", explaintext: 1, titles: title, format: "json", redirects: 1, formatversion: 2
        }),
        { ttlSeconds: 24 * 3600 }
    );
    const page = data?.query?.pages?.[0];
    if (!page || page.missing || !page.extract) return null;

    // Top-level sections are delimited by "\n== Name ==\n" in the plain-text extract.
    const parts = page.extract.split(/\n== ([^=\n]+) ==\n/);
    const sections = new Map<string, string>();
    for (let i = 1; i < parts.length; i += 2) sections.set(parts[i].trim(), parts[i + 1] ?? "");
    const body = sections.get(section) ?? "";
    const text = body.replace(/\n=== ([^=\n]+) ===\n/g, "\n\n$1\n").replace(/\n{3,}/g, "\n\n").trim();
    return {
        title: page.title,
        section,
        text: text.length > MAX_SECTION_CHARS ? `${text.slice(0, MAX_SECTION_CHARS)}…` : text,
        availableSections: [...sections.keys()],
        url: `https://en.wikivoyage.org/wiki/${encodeURIComponent(page.title.replace(/ /g, "_"))}`
    };
}

// ---------------------------------------------------------------------------
// Public holidays
// ---------------------------------------------------------------------------

export interface Holiday {
    date: string;
    name: string;
    localName: string;
    nationwide: boolean;
    types: string[];
}

export async function getHolidays(countryCode: string, year: number): Promise<Holiday[]> {
    try {
        const data = await fetchJson<Array<{ date: string; name: string; localName: string; global: boolean; types?: string[] }> | null>(
            `https://date.nager.at/api/v3/PublicHolidays/${year}/${encodeURIComponent(countryCode.toUpperCase())}`,
            { ttlSeconds: 7 * 24 * 3600 }
        );
        return (data ?? []).map((h) => ({ date: h.date, name: h.name, localName: h.localName, nationwide: h.global, types: h.types ?? [] }));
    } catch (error) {
        // Nager.Date answers 204 (handled above) or 404 for countries it doesn't cover.
        if (error instanceof UpstreamError && error.status === 404) return [];
        throw error;
    }
}

export async function getHolidaysBetween(countryCode: string, startDate: string, endDate: string): Promise<Holiday[]> {
    const years = new Set([Number(startDate.slice(0, 4)), Number(endDate.slice(0, 4))]);
    const all = (await Promise.all([...years].map((y) => getHolidays(countryCode, y)))).flat();
    return all.filter((h) => h.date >= startDate && h.date <= endDate);
}

// ---------------------------------------------------------------------------
// Currency (Frankfurter: European Central Bank reference rates, ~30 currencies)
// ---------------------------------------------------------------------------

export async function getRate(from: string, to: string): Promise<{ rate: number; date: string } | null> {
    const f = from.toUpperCase();
    const t = to.toUpperCase();
    if (f === t) return { rate: 1, date: isoDate(new Date()) };
    try {
        const data = await fetchJson<{ date: string; rates?: Record<string, number> } | null>(
            withQuery("https://api.frankfurter.dev/v1/latest", { base: f, symbols: t }),
            { ttlSeconds: 3600 }
        );
        const rate = data?.rates?.[t];
        return typeof rate === "number" && data ? { rate, date: data.date } : null;
    } catch (error) {
        // Unsupported currencies come back as 404/422.
        if (error instanceof UpstreamError && (error.status === 404 || error.status === 422)) return null;
        throw error;
    }
}

export async function convertCurrency(amount: number, from: string, to: string) {
    const quote = await getRate(from, to);
    if (!quote) {
        throw new Error(`No exchange rate for ${from.toUpperCase()} → ${to.toUpperCase()} (only the ~30 ECB reference currencies are supported).`);
    }
    return {
        amount,
        from: from.toUpperCase(),
        to: to.toUpperCase(),
        rate: quote.rate,
        converted: Math.round(amount * quote.rate * 100) / 100,
        rateDate: quote.date
    };
}
