import type { DomainToolkit } from "./types";
import { dictionaryToolkit } from "./dictionary";
import { demoToolkit } from "./demo";
import { travelToolkit } from "./travel";

// Every site domain the app can serve. The SvelteKit server picks one per request from the
// hostname (travel.groots.es -> "travel") and sends it to mcp as X-Toolkit-Id; keep the id list
// in sync with KNOWN_TOOLKIT_IDS in src/lib/toolkit.ts.
const TOOLKITS: DomainToolkit[] = [dictionaryToolkit, travelToolkit, demoToolkit];

const byId = new Map(TOOLKITS.map((t) => [t.id, t]));

// Used when a request names no toolkit. TOOLKIT_ID=demo switches the default for benchmarks.
export const DEFAULT_TOOLKIT_ID = process.env.TOOLKIT_ID?.trim() || "dictionary";

export function allToolkits(): DomainToolkit[] {
    return TOOLKITS;
}

/** Resolves a toolkit id (missing -> default). Throws for unknown ids. */
export function getToolkit(id?: string | null): DomainToolkit {
    const key = id?.trim() || DEFAULT_TOOLKIT_ID;
    const toolkit = byId.get(key);
    if (!toolkit) {
        throw new Error(`Unknown toolkit '${key}'. Known: ${[...byId.keys()].join(", ")}.`);
    }
    return toolkit;
}
