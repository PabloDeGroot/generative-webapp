// src/app.d.ts
declare global {
    namespace App {
        // interface Error {}
        interface Locals {
            validationCookie: string | undefined;
            requestId: string;
            userId?: string;
            idToken?: string;
            signInProvider?: string;
            toolkitId: string;
        }
        // interface PageData {}
        // interface Platform {}
    }
}

import { GenerateImageFromRoute, HandleAction } from '$lib/AI/PageGenerator';
import { logServerSideEvent } from '$lib/server_analytics';
import { generateRequestId, logger, withRequestContext } from '$lib/logger';
import { withPageMetrics } from '$lib/metrics';
import type { Handle, RequestEvent } from '@sveltejs/kit';
import { getAuth } from 'firebase-admin/auth';
import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import './lib/firebase_admin';
import { authGateEnabled, GATE_SIGN_IN_PROVIDER } from '$lib/server/auth-gate';
import { getSessionField, setSessionField } from '$lib/server/session-cookie';
import { resolveToolkitId, setRequestToolkit } from '$lib/server/toolkit';

const log = logger.child('hooks');

const SESSION_AUTH_PATH = '/__session-auth';
const IMAGE_PATH = /\.(png|jpg|jpeg|gif|webp|avif|svg)$/i;
const FAVICON_PATH = /favicon\.(png|ico)$/i;
// Real images proxied by the /__art route (museum artwork, Wikimedia); never generated.
const ART_PREFIX = '/__art/';

async function handleImageRequest(event: RequestEvent, pathname: string): Promise<Response> {
    const imgLog = log.child('image', { route: pathname });
    let imageKey = pathname;
    if (imageKey.startsWith('/')) imageKey = imageKey.substring(1);
    imageKey = imageKey.replace(/\//g, '-');
    const lastDotIndex = imageKey.lastIndexOf('.');
    if (lastDotIndex > 0) imageKey = imageKey.substring(0, lastDotIndex);

    const requestHeaders: Record<string, string> = {};
    // Credentials stay out of the log: the __session cookie holds a live Firebase ID token.
    event.request.headers.forEach((value, key) => {
        if (key !== 'cookie' && key !== 'authorization') requestHeaders[key] = value;
    });

    // firebase-admin: firestore.rules deny all client-SDK writes.
    try {
        await getFirestore().collection('imageAccessLog').add({
            timestamp: FieldValue.serverTimestamp(),
            method: event.request.method,
            url: event.request.url,
            pathname: event.url.pathname,
            headers: requestHeaders,
            imageKey
        });
    } catch (error) {
        imgLog.warn('access_log_write_failed', { error });
    }

    const userAgent = event.request.headers.get('user-agent') || 'unknown';
    const referer = event.request.headers.get('referer') || 'unknown';
    logServerSideEvent('image_viewed', {
        event_category: 'engagement',
        event_label: pathname,
        custom_parameter: 'image_request',
        user_agent: userAgent,
        page_referrer: referer
    });

    const stop = imgLog.time('generate', { imageKey });
    const imageBase64 = await GenerateImageFromRoute(event.request, pathname);
    stop({ ok: imageBase64.length > 0, bytes: imageBase64.length });

    if (!imageBase64) {
        return new Response('Image generation failed', { status: 502 });
    }

    const imageBuffer = Buffer.from(imageBase64, 'base64');
    return new Response(imageBuffer, {
        status: 200,
        headers: {
            'Content-Type': 'image/png',
            'Cache-Control': 'public, max-age=3600, immutable',
            'X-Robots-Tag': 'noindex, nofollow'
        }
    });
}

async function resolveAuth(event: RequestEvent): Promise<{ userId?: string; idToken?: string; signInProvider?: string }> {
    const idToken = getSessionField(event.cookies, 'auth');
    if (!idToken) return {};
    try {
        const decoded = await getAuth().verifyIdToken(idToken);
        return { userId: decoded.uid, idToken, signInProvider: decoded.firebase?.sign_in_provider };
    } catch (error) {
        log.warn('auth_cookie_invalid', { error });
        setSessionField(event.cookies, 'auth', undefined);
        return {};
    }
}

export const handle: Handle = async ({ event, resolve }) => {
    const requestId = event.request.headers.get('x-request-id') ?? generateRequestId();

    return withRequestContext(
        requestId,
        {
            method: event.request.method,
            path: event.url.pathname
        },
        async () => {
            const validationCookie = getSessionField(event.cookies, 'appCheck');
            const auth = await resolveAuth(event);
            event.locals = {
                validationCookie: validationCookie || undefined,
                requestId,
                userId: auth.userId,
                idToken: auth.idToken,
                signInProvider: auth.signInProvider,
                toolkitId: resolveToolkitId(event.request, event.url)
            };
            setRequestToolkit(event.request, event.locals.toolkitId);

            const userAgent = event.request.headers.get('user-agent') || '';
            if (!userAgent) {
                log.warn('blocked_no_user_agent');
                logServerSideEvent('blocked_access', { event_category: 'security', event_label: 'no_user_agent', user_agent: 'empty' });
                return new Response('User-Agent header is required', {
                    status: 403,
                    headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow' }
                });
            }

            const isBot = /bot|crawl|spider|slurp|mediapartners/i.test(userAgent);
            const isDiscordBot = /Discordbot/i.test(userAgent);
            if (isBot && !isDiscordBot) {
                log.info('bot_blocked', { user_agent: userAgent });
                logServerSideEvent('bot_access', { event_category: 'engagement', event_label: event.url.pathname, user_agent: userAgent });
                return new Response(null, {
                    status: 204,
                    headers: { 'Cache-Control': 'private, no-cache', 'X-Robots-Tag': 'noindex, nofollow' }
                });
            }

            // Auth gate: visitors without a Google sign-in may only load pages (the layout then
            // shows the sign-in screen and nothing is generated) and set their session cookie.
            if (authGateEnabled() && auth.signInProvider !== GATE_SIGN_IN_PROVIDER) {
                const pathname = event.url.pathname;
                const method = event.request.method;
                const isPageLoad = (method === 'GET' || method === 'HEAD')
                    && event.route.id === '/[...slug]'
                    && !IMAGE_PATH.test(pathname);
                if (pathname !== SESSION_AUTH_PATH && !isPageLoad && !FAVICON_PATH.test(pathname)) {
                    log.info('auth_gate_blocked', { method, user_agent: userAgent });
                    return new Response('Sign in is required.', {
                        status: 401,
                        headers: { 'Content-Type': 'text/plain', 'X-Robots-Tag': 'noindex, nofollow' }
                    });
                }
            }

            const stop = log.time('request', { user_agent: userAgent, authenticated: Boolean(auth.userId) });
            try {
                const pathname = event.url.pathname;
                if (IMAGE_PATH.test(pathname) && !pathname.startsWith(ART_PREFIX)) {
                    if (FAVICON_PATH.test(pathname)) {
                        return new Response(null, {
                            status: 204,
                            headers: { 'Cache-Control': 'public, max-age=3600, immutable', 'X-Robots-Tag': 'noindex, nofollow' }
                        });
                    }
                    const response = await handleImageRequest(event, pathname);
                    stop({ status: response.status, kind: 'image' });
                    return response;
                }

                const method = event.request.method;
                const isAppCheckPost = Boolean(
                    event.request.headers.get('x-__session') || event.request.headers.get('__session')
                );
                const isSessionAuth = pathname === SESSION_AUTH_PATH;
                if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS' && !isAppCheckPost && !isSessionAuth) {
                    const response = await HandleAction(event.request, auth.idToken, auth.userId);
                    stop({ status: response.status, kind: 'action', method });
                    return response;
                }

                const response = await withPageMetrics(requestId, pathname, () => Promise.resolve(resolve(event, {
                    // app.html: <html data-toolkit="%toolkit%"> tells browser code which library to use.
                    transformPageChunk: ({ html }) => html.replace('%toolkit%', event.locals.toolkitId)
                })));
                // Pages must not be cached; routes that set their own policy (component sources) keep it.
                if (!response.headers.has('Cache-Control')) response.headers.set('Cache-Control', 'private, no-cache');
                response.headers.set('vary', 'Cookie, Accept');
                response.headers.set('X-Robots-Tag', 'noindex, nofollow');
                stop({ status: response.status, kind: 'page' });
                return response;
            } catch (error) {
                stop({ status: 500, error });
                log.error('request_failed', { error });
                throw error;
            }
        }
    );
};
