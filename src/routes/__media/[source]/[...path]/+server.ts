import { error } from '@sveltejs/kit';
import { dev } from '$app/environment';
import { logger } from '$lib/logger';
import { imageSourcesFor } from '$lib/server/image-sources';
import { IMAGE_PROXY_PREFIX } from '$toolkits/shared/image-proxy';
import type { RequestHandler } from './$types';

const log = logger.child('art-image');

// Real images (museum artwork, Wikimedia photos…) served from the site's own origin, so pages never
// point at external hosts: /__media/<source>/<path>. The sources are the request's toolkit's, declared
// in functions/src/toolkits/<id>/image-proxy.ts (see shared/image-proxy.ts there).

const USER_AGENT = 'generative-webapp/1.0 (https://groots.es)';
const TIMEOUT_MS = 15_000;

export const GET: RequestHandler = async ({ params, url: requestUrl, locals, fetch }) => {
    const sources = imageSourcesFor(locals.toolkitId);
    const source = Object.hasOwn(sources, params.source) ? sources[params.source] : undefined;
    // The raw path, still percent-encoded as the tools emitted it: params.path is decoded, so a Met
    // "%20" or a Wikimedia "%C3%A9" would fail the patterns and be refetched unencoded.
    const path = requestUrl.pathname.slice(`${IMAGE_PROXY_PREFIX}${params.source}/`.length);
    if (!source || !source.path.test(path) || /\.\.|%2e/i.test(path)) error(404, 'Unknown image.');

    const url = source.base + path;
    if (source.redirectInProduction && !dev) {
        return new Response(null, {
            status: 302,
            headers: { Location: url, 'Cache-Control': 'public, max-age=604800, immutable' }
        });
    }
    let upstream: Response;
    try {
        upstream = await fetch(url, {
            headers: { 'User-Agent': USER_AGENT, Accept: 'image/*', ...source.headers },
            signal: AbortSignal.timeout(TIMEOUT_MS)
        });
    } catch (err) {
        log.warn('fetch_failed', { url, error: err });
        error(502, 'Image source unavailable.');
    }
    const type = upstream.headers.get('content-type') ?? '';
    if (!upstream.ok || !type.startsWith('image/')) {
        log.warn('bad_upstream', { url, status: upstream.status, type });
        error(upstream.status === 404 ? 404 : 502, 'Image not available.');
    }
    return new Response(upstream.body, {
        headers: {
            'Content-Type': type,
            // Real images for a given URL never change.
            'Cache-Control': 'public, max-age=604800, immutable'
        }
    });
};
