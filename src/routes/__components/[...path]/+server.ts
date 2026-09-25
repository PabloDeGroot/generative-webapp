import { error } from '@sveltejs/kit';
import { getStorage } from 'firebase-admin/storage';
import { PUBLIC_FIREBASE_STORAGE_BUCKET } from '$env/static/public';
import { logger } from '$lib/logger';
import '$lib/firebase_admin';
import type { RequestHandler } from './$types';

const log = logger.child('component-source');

// Only component sources: each toolkit's shared library and per-user overrides.
const SHARED_PATH = /^toolkits\/[^/]+\/components\/[^/]+\.js$/;
const USER_PATH = /^users\/([^/]+)\/toolkits\/[^/]+\/components\/[^/]+\.js$/;

// Serves component scripts from the site's own origin; see $lib/component-url.ts. Behind the auth
// gate like every other route, and always from the project's own bucket.
export const GET: RequestHandler = async ({ params, locals }) => {
    const path = params.path;
    const userMatch = path.match(USER_PATH);
    if (!SHARED_PATH.test(path) && !userMatch) error(403, 'Only component sources can be served.');
    // A user's overrides are theirs alone.
    if (userMatch && userMatch[1] !== locals.userId) error(404, 'Not found');

    try {
        const [contents] = await getStorage().bucket(PUBLIC_FIREBASE_STORAGE_BUCKET).file(path).download();
        return new Response(new Uint8Array(contents), {
            headers: {
                'Content-Type': 'application/javascript; charset=utf-8',
                // Short-lived: updated components are also pushed live by component-watcher.
                'Cache-Control': 'private, max-age=60'
            }
        });
    } catch (err) {
        log.warn('read_failed', { path, error: err });
        error(404, 'Component source not found.');
    }
};
