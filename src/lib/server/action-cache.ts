import { createHash } from 'node:crypto';
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore';
import { logger } from '$lib/logger';
import '$lib/firebase_admin';

// Caches action-runner responses so components that fetch their own data (POST with an intent)
// don't run the LLM again for the same request.
//   toolkits/{toolkitId}/actionCache/{sha256}   one response: { version, response, expiresAt }
//   toolkits/{toolkitId}/actionCache/_version   { version } — bumped by any write in the toolkit
// Only responses produced by read-only tools are stored. A write (vote, comment, trip change…)
// bumps the version, which retires every cached read of that toolkit on all server instances.
// Server-only: firestore.rules deny client access.

const log = logger.child('action-cache');
const TTL_MS = 15 * 60 * 1000;
const MAX_RESPONSE_CHARS = 800_000; // stay well under Firestore's 1 MiB document limit

const cacheCollection = (toolkitId: string) => getFirestore().collection(`toolkits/${toolkitId}/actionCache`);
const versionRef = (toolkitId: string) => cacheCollection(toolkitId).doc('_version');

/** Same request (route, method, body, user) → same key; object keys are sorted first. */
export function actionCacheKey(input: { method: string; route: string; body: unknown; userId?: string | null }): string {
    const canonical = (value: unknown): unknown => {
        if (Array.isArray(value)) return value.map(canonical);
        if (value && typeof value === 'object') {
            return Object.fromEntries(Object.keys(value).sort().map((k) => [k, canonical((value as Record<string, unknown>)[k])]));
        }
        return value;
    };
    const text = JSON.stringify(canonical({ ...input, userId: input.userId ?? null }));
    return createHash('sha256').update(text).digest('hex');
}

async function currentVersion(toolkitId: string): Promise<number> {
    const snap = await versionRef(toolkitId).get();
    return (snap.get('version') as number | undefined) ?? 0;
}

/** The cached response for this key, or null. Never throws: a cache failure just means a miss. */
export async function readCachedAction(toolkitId: string, key: string): Promise<{ response: unknown; version: number } | null> {
    try {
        const [version, snap] = await Promise.all([currentVersion(toolkitId), cacheCollection(toolkitId).doc(key).get()]);
        if (!snap.exists) return null;
        const entry = snap.data() as { version: number; response: string; expiresAt: Timestamp };
        if (entry.version !== version || entry.expiresAt.toMillis() < Date.now()) return null;
        return { response: JSON.parse(entry.response), version };
    } catch (error) {
        log.warn('read_failed', { error });
        return null;
    }
}

/** Stores a read-only response, tagged with the version it was computed under. */
export async function writeCachedAction(toolkitId: string, key: string, response: unknown, version: number): Promise<void> {
    try {
        const text = JSON.stringify(response);
        if (text.length > MAX_RESPONSE_CHARS) return;
        await cacheCollection(toolkitId).doc(key).set({
            version,
            response: text,
            expiresAt: Timestamp.fromMillis(Date.now() + TTL_MS),
            createdAt: FieldValue.serverTimestamp()
        });
    } catch (error) {
        log.warn('write_failed', { error });
    }
}

/** Version to tag a new entry with; read before running the action so a concurrent write wins. */
export async function actionCacheVersion(toolkitId: string): Promise<number> {
    try {
        return await currentVersion(toolkitId);
    } catch {
        return -1; // unknown: the entry will never match and simply isn't used
    }
}

/** Retires every cached read of the toolkit (call after any successful write). */
export async function invalidateActionCache(toolkitId: string): Promise<void> {
    try {
        await versionRef(toolkitId).set({ version: FieldValue.increment(1) }, { merge: true });
    } catch (error) {
        log.warn('invalidate_failed', { error });
    }
}
