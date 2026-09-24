import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { getStorage } from 'firebase-admin/storage';
import { logger } from '$lib/logger';
import '$lib/firebase_admin';
import type { RequestHandler } from './$types';

const log = logger.child('dev-storage');

// Only component sources may be proxied: each toolkit's shared library and per-user overrides.
const ALLOWED_PATH = /^(toolkits\/[^/]+\/components|users\/[^/]+\/toolkits\/[^/]+\/components)\/[^/]+\.js$/;

// Dev-only proxy for component scripts; see $lib/dev-storage.ts.
export const GET: RequestHandler = async ({ params }) => {
    if (!dev) error(404, 'Not found');
    if (!ALLOWED_PATH.test(params.path)) error(403, 'Only component sources can be proxied.');

    const file = getStorage().bucket(params.bucket).file(params.path);
    try {
        const [contents] = await file.download();
        return new Response(new Uint8Array(contents), {
            headers: { 'Content-Type': 'application/javascript; charset=utf-8' }
        });
    } catch (err) {
        log.warn('read_failed', { bucket: params.bucket, path: params.path, error: err });
        error(404, 'Component source not found in the Storage emulator.');
    }
};
