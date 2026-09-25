import { error } from '@sveltejs/kit';
import { logger } from '$lib/logger';
import type { RequestHandler } from './$types';

const log = logger.child('art-image');

// Real artwork and reference images, served from the site's own origin so pages never point at
// external hosts (and never fall back to AI-generated images when a real one exists):
//   /__art/aic/<image_id>/full/843,/0/default.jpg   Art Institute of Chicago IIIF
//   /__art/met/<path>                               Met Museum (images.metmuseum.org/CRDImages/…)
//   /__art/wiki/<path>                              Wikimedia (upload.wikimedia.org/wikipedia/…)
// AIC's image server sits behind a bot challenge that only lets through requests with an https
// Referer, which a page on http://museum.localhost wouldn't send; fetching server-side avoids it.
const SOURCES: Record<string, { base: string; path: RegExp; headers?: Record<string, string> }> = {
    aic: {
        base: 'https://www.artic.edu/iiif/2/',
        path: /^[0-9a-f-]{36}\/(full|square|\d+,\d+,\d+,\d+)\/(full|max|\d*,\d*|!\d+,\d+)\/0\/default\.jpg$/,
        headers: { Referer: 'https://groots.es/' }
    },
    met: { base: 'https://images.metmuseum.org/CRDImages/', path: /^[\w\-./%]+\.(jpe?g|png)$/i },
    wiki: { base: 'https://upload.wikimedia.org/wikipedia/', path: /^[\w\-./%(),'!~]+\.(jpe?g|png|gif|webp|svg)(\/[\w\-.%(),'!~]+)?$/i }
};

const USER_AGENT = 'generative-webapp/1.0 (https://groots.es)';
const TIMEOUT_MS = 15_000;

export const GET: RequestHandler = async ({ params, fetch }) => {
    const source = SOURCES[params.source];
    const path = params.path;
    if (!source || !source.path.test(path) || path.includes('..')) error(404, 'Unknown image.');

    const url = source.base + path;
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
            // Museum images for a given URL never change.
            'Cache-Control': 'public, max-age=604800, immutable'
        }
    });
};
