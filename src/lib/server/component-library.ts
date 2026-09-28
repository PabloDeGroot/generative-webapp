import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';
import { logger } from '$lib/logger';
import { sharedLibraryPath, userLibraryPath } from '$lib/toolkit';
import '$lib/firebase_admin';

// Maintenance of a toolkit's component library for the /__debug room: counts, and resets of the
// per-user overrides (what feedback writes) or of the whole library. Firestore docs and their
// Storage objects live at the same paths (see functions/src/component-manager.ts).
//   shared:   toolkits/{toolkitId}/components/{id}
//   override: users/{uid}/toolkits/{toolkitId}/components/{id}

const log = logger.child('component-library');
const BATCH_LIMIT = 400;

export type ResetScope = 'user-overrides' | 'all';

export interface LibraryDocs {
    shared: FirebaseFirestore.DocumentReference[];
    /** Per-user overrides, by uid. */
    overrides: Map<string, FirebaseFirestore.DocumentReference[]>;
}

/** Every library document of the toolkit, shared and per-user (one collection-group query). */
async function libraryDocs(toolkitId: string): Promise<LibraryDocs> {
    const snap = await getFirestore().collectionGroup('components').get();
    const docs: LibraryDocs = { shared: [], overrides: new Map() };
    for (const doc of snap.docs) {
        const s = doc.ref.path.split('/');
        if (s.length === 4 && s[0] === 'toolkits' && s[1] === toolkitId) docs.shared.push(doc.ref);
        else if (s.length === 6 && s[0] === 'users' && s[2] === 'toolkits' && s[3] === toolkitId) {
            const list = docs.overrides.get(s[1]) ?? [];
            list.push(doc.ref);
            docs.overrides.set(s[1], list);
        }
    }
    return docs;
}

export async function libraryCounts(toolkitId: string): Promise<{ shared: number; overrides: number; usersWithOverrides: number }> {
    const docs = await libraryDocs(toolkitId);
    let overrides = 0;
    for (const list of docs.overrides.values()) overrides += list.length;
    return { shared: docs.shared.length, overrides, usersWithOverrides: docs.overrides.size };
}

/**
 * Deletes the toolkit's per-user overrides ('user-overrides': the shared library stays, as if no
 * one had given feedback) or its whole library ('all'), in Firestore and Storage. Other toolkits
 * and user preferences are untouched.
 */
export async function resetComponentLibrary(toolkitId: string, scope: ResetScope) {
    const stop = log.time('reset', { toolkitId, scope });
    const db = getFirestore();
    const bucket = getStorage().bucket(PUBLIC_FIREBASE_STORAGE_BUCKET);
    const docs = await libraryDocs(toolkitId);

    const refs = [...(scope === 'all' ? docs.shared : []), ...[...docs.overrides.values()].flat()];
    for (let i = 0; i < refs.length; i += BATCH_LIMIT) {
        const batch = db.batch();
        refs.slice(i, i + BATCH_LIMIT).forEach((ref) => batch.delete(ref));
        await batch.commit();
    }

    // Storage: each prefix whole, which also catches objects orphaned by failed doc writes. User
    // prefixes only for users that had override docs, so nothing else under users/ is touched.
    const prefixes = [...docs.overrides.keys()].map((uid) => `${userLibraryPath(uid, toolkitId)}/`);
    if (scope === 'all') prefixes.push(`${sharedLibraryPath(toolkitId)}/`);
    let storageObjectsDeleted = 0;
    for (const prefix of prefixes) {
        const [files] = await bucket.getFiles({ prefix });
        await Promise.all(files.map((f) => f.delete({ ignoreNotFound: true }).catch(() => undefined)));
        storageObjectsDeleted += files.length;
    }

    const result = {
        sharedDeleted: scope === 'all' ? docs.shared.length : 0,
        overridesDeleted: refs.length - (scope === 'all' ? docs.shared.length : 0),
        usersAffected: docs.overrides.size,
        storageObjectsDeleted
    };
    stop(result);
    return result;
}
