import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import type { GeneratedPage, LlmUsage, TraceSpan } from '$lib/AI/PageGenerator';
import { logger } from '$lib/logger';
import '$lib/firebase_admin';

// A record of every generated page, for the /__debug room: what the page designer did (tool calls,
// PageSpec), what the HTML generator wrote, and how each component was used (tag + attributes),
// which the component gallery reuses as real sample attributes.
//   toolkits/{toolkitId}/pageLog/{auto id}
// Server-only: firestore.rules deny client access.

const log = logger.child('page-log');
const MAX_HTML_CHARS = 400_000; // documents are capped at 1 MiB
const MAX_TEXT_CHARS = 100_000;
const MAX_TOOL_FIELD_CHARS = 4_000;
const MAX_USAGES = 200;

// Svelte built-ins compiled into the page bundle (see component-loader.ts): not library components.
const BUILT_IN_TAGS = new Set(['google-login', 'feedback-fab']);

export interface ComponentUsage {
    id: string;
    attrs: Record<string, string>;
}

export interface PageLogToolCall {
    name: string;
    args: string;
    result: string;
    readOnly: boolean;
    failed: boolean;
    durationMs?: number;
}

export interface PageLogSummary {
    id: string;
    route: string;
    userId: string | null;
    createdAt: string | null;
    usedComponentIds: string[];
    timings: { designMs: number; htmlMs: number } | null;
    /** Tokens per phase, including how many input tokens came from the provider's prompt cache. */
    usage: { design: LlmUsage; html: LlmUsage } | null;
    /** Server-side time from the request reaching the page load to the page data being ready. */
    totalMs: number | null;
    /** The model each phase ran on. */
    models: { design: string; html: string } | null;
    toolCallCount: number;
}

export interface PageLogEntry extends PageLogSummary {
    pageSpec: string;
    designerOutput: string;
    html: string;
    htmlTruncated: boolean;
    toolCalls: PageLogToolCall[];
    usages: ComponentUsage[];
    /** Timed pieces of the server-side load; the first span ('page') covers all of it. */
    trace: TraceSpan[];
}

const pageLog = (toolkitId: string) => getFirestore().collection(`toolkits/${toolkitId}/pageLog`);

const clip = (text: string, max: number) => (text.length > max ? `${text.slice(0, max)}… (${text.length - max} more chars)` : text);

const json = (value: unknown): string => {
    try {
        return JSON.stringify(value, null, 2) ?? '';
    } catch {
        return String(value);
    }
};

const ENTITIES: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", '#39': "'" };
const decodeEntities = (value: string) =>
    value.replace(/&(amp|lt|gt|quot|apos|#39);/g, (_m, name: string) => ENTITIES[name]);

/** Every custom-element opening tag in the HTML, with its attributes as the browser would read them. */
export function extractComponentUsages(html: string): ComponentUsage[] {
    const usages: ComponentUsage[] = [];
    const tag = /<([a-z][a-z0-9]*-[a-z0-9-]*)(\s[^>]*)?>/g;
    const attr = /([^\s=/>"']+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>"']+)))?/g;
    for (const match of html.matchAll(tag)) {
        const id = match[1];
        if (BUILT_IN_TAGS.has(id)) continue;
        const attrs: Record<string, string> = {};
        for (const a of (match[2] ?? '').matchAll(attr)) {
            attrs[a[1].toLowerCase()] = decodeEntities(a[2] ?? a[3] ?? a[4] ?? '');
        }
        usages.push({ id, attrs });
        if (usages.length >= MAX_USAGES) break;
    }
    return usages;
}

/** Stores one generated page. Never throws: the page is served whether or not the log is written. */
export async function recordPageLog(
    toolkitId: string,
    route: string,
    userId: string | undefined,
    page: GeneratedPage,
    trace: TraceSpan[]
): Promise<void> {
    const total = trace.find((t) => t.kind === 'page');
    try {
        await pageLog(toolkitId).add({
            route,
            userId: userId ?? null,
            createdAt: FieldValue.serverTimestamp(),
            usedComponentIds: page.usedComponentIds,
            timings: page.timings,
            usage: page.usage,
            totalMs: total ? total.end - total.start : null,
            models: page.models,
            trace,
            pageSpec: clip(json(page.pageSpec), MAX_TEXT_CHARS),
            designerOutput: clip(page.prompt, MAX_TEXT_CHARS),
            html: page.html.slice(0, MAX_HTML_CHARS),
            htmlTruncated: page.html.length > MAX_HTML_CHARS,
            toolCalls: page.toolInvocations.map((t) => ({
                name: t.name,
                args: clip(json(t.args), MAX_TOOL_FIELD_CHARS),
                result: clip(json(t.result), MAX_TOOL_FIELD_CHARS),
                readOnly: t.readOnly,
                failed: t.failed,
                durationMs: t.durationMs ?? null
            })),
            usages: extractComponentUsages(page.html)
        });
    } catch (error) {
        log.warn('write_failed', { route, error });
    }
}

const isoTime = (value: unknown) => (value instanceof Timestamp ? value.toDate().toISOString() : null);

function summary(id: string, data: FirebaseFirestore.DocumentData): PageLogSummary {
    return {
        id,
        route: String(data.route ?? ''),
        userId: data.userId ?? null,
        createdAt: isoTime(data.createdAt),
        usedComponentIds: Array.isArray(data.usedComponentIds) ? data.usedComponentIds : [],
        timings: data.timings ?? null,
        usage: data.usage ?? null,
        totalMs: typeof data.totalMs === 'number' ? data.totalMs : null,
        models: data.models ?? null,
        toolCallCount: Array.isArray(data.toolCalls) ? data.toolCalls.length : 0
    };
}

/** The most recent pages, newest first, without their HTML. */
export async function listPageLogs(toolkitId: string, limit = 50): Promise<PageLogSummary[]> {
    const snap = await pageLog(toolkitId)
        .orderBy('createdAt', 'desc')
        .limit(limit)
        .select('route', 'userId', 'createdAt', 'usedComponentIds', 'timings', 'usage', 'totalMs', 'models', 'toolCalls')
        .get();
    return snap.docs.map((doc) => summary(doc.id, doc.data()));
}

export async function getPageLog(toolkitId: string, id: string): Promise<PageLogEntry | null> {
    const doc = await pageLog(toolkitId).doc(id).get();
    if (!doc.exists) return null;
    const data = doc.data()!;
    return {
        ...summary(doc.id, data),
        pageSpec: String(data.pageSpec ?? ''),
        designerOutput: String(data.designerOutput ?? ''),
        html: String(data.html ?? ''),
        htmlTruncated: Boolean(data.htmlTruncated),
        toolCalls: Array.isArray(data.toolCalls) ? data.toolCalls : [],
        usages: Array.isArray(data.usages) ? data.usages : [],
        trace: Array.isArray(data.trace) ? data.trace : []
    };
}

/** Real attribute sets per component, from the most recent pages (newest first, distinct, capped). */
export async function recentComponentSamples(
    toolkitId: string,
    pages = 60,
    perComponent = 6
): Promise<Record<string, { attrs: Record<string, string>; route: string }[]>> {
    const snap = await pageLog(toolkitId).orderBy('createdAt', 'desc').limit(pages).select('route', 'usages').get();
    const samples: Record<string, { attrs: Record<string, string>; route: string }[]> = {};
    const seen = new Set<string>();
    for (const doc of snap.docs) {
        const route = String(doc.get('route') ?? '');
        for (const usage of (doc.get('usages') as ComponentUsage[] | undefined) ?? []) {
            const key = `${usage.id} ${JSON.stringify(usage.attrs)}`;
            if (seen.has(key)) continue;
            seen.add(key);
            const list = (samples[usage.id] ??= []);
            if (list.length < perComponent) list.push({ attrs: usage.attrs, route });
        }
    }
    return samples;
}
