// JSON fetching for toolkit backends: timeout, in-memory TTL cache, de-duplication of identical
// in-flight requests, and a minimum interval between requests to the same host (some public APIs,
// e.g. MusicBrainz, ban clients that go faster). The cache is per function instance.

const USER_AGENT = "generative-webapp/1.0 (+https://groots.es)";
const MAX_CACHE_ENTRIES = 500;

export interface FetchJsonOptions {
    /** How long a successful response is reused. 0 disables caching. Default 5 minutes. */
    ttlSeconds?: number;
    /** Abort after this long. Default 8 seconds. */
    timeoutMs?: number;
    /** Minimum gap between requests to this URL's host. Default 0. */
    minIntervalMs?: number;
    headers?: Record<string, string>;
}

export class UpstreamError extends Error {
    constructor(message: string, readonly status?: number) {
        super(message);
        this.name = "UpstreamError";
    }
}

const cache = new Map<string, { expires: number; value: unknown }>();
const inFlight = new Map<string, Promise<unknown>>();
const nextSlotByHost = new Map<string, number>();

async function waitForHostSlot(host: string, minIntervalMs: number): Promise<void> {
    if (minIntervalMs <= 0) return;
    const now = Date.now();
    const slot = Math.max(now, nextSlotByHost.get(host) ?? 0);
    nextSlotByHost.set(host, slot + minIntervalMs);
    if (slot > now) await new Promise((resolve) => setTimeout(resolve, slot - now));
}

function remember(key: string, value: unknown, ttlSeconds: number): void {
    if (ttlSeconds <= 0) return;
    if (cache.size >= MAX_CACHE_ENTRIES) {
        const oldest = cache.keys().next().value;
        if (oldest !== undefined) cache.delete(oldest);
    }
    cache.set(key, { expires: Date.now() + ttlSeconds * 1000, value });
}

/** Fetches and parses JSON. Resolves to null when the response has no body (e.g. HTTP 204). */
export async function fetchJson<T = unknown>(url: string, options: FetchJsonOptions = {}): Promise<T> {
    const { ttlSeconds = 300, timeoutMs = 8000, minIntervalMs = 0, headers = {} } = options;

    const cached = cache.get(url);
    if (cached && cached.expires > Date.now()) return cached.value as T;

    const pending = inFlight.get(url);
    if (pending) return pending as Promise<T>;

    const request = (async () => {
        const { host } = new URL(url);
        await waitForHostSlot(host, minIntervalMs);
        let response: Response;
        try {
            response = await fetch(url, {
                headers: { Accept: "application/json", "User-Agent": USER_AGENT, ...headers },
                signal: AbortSignal.timeout(timeoutMs)
            });
        } catch (error) {
            const reason = error instanceof Error && error.name === "TimeoutError" ? "timed out" : "failed";
            throw new UpstreamError(`Request to ${host} ${reason}.`);
        }
        if (!response.ok) {
            throw new UpstreamError(`${host} responded with HTTP ${response.status}.`, response.status);
        }
        // Some APIs answer "no data" with 204 or an empty body: that comes back as null.
        const body = await response.text();
        let value: unknown = null;
        if (body.trim()) {
            try {
                value = JSON.parse(body);
            } catch {
                throw new UpstreamError(`${host} returned invalid JSON.`, response.status);
            }
        }
        remember(url, value, ttlSeconds);
        return value;
    })();

    inFlight.set(url, request);
    try {
        return (await request) as T;
    } finally {
        inFlight.delete(url);
    }
}

/** Builds a URL with the given query parameters, skipping undefined values. */
export function withQuery(base: string, params: Record<string, string | number | boolean | undefined>): string {
    const url = new URL(base);
    for (const [key, value] of Object.entries(params)) {
        if (value !== undefined) url.searchParams.set(key, String(value));
    }
    return url.toString();
}
