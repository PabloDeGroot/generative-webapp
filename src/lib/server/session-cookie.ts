import { dev } from '$app/environment';
import type { Cookies } from '@sveltejs/kit';

// Firebase Hosting strips every cookie except one named `__session` before a request reaches
// the SSR function, so everything the server needs from cookies lives in that one cookie, as
// URL-encoded fields: `auth` (Firebase ID token) and `appCheck` (App Check token).
export const SESSION_COOKIE = '__session';

export type SessionField = 'auth' | 'appCheck';

// Firebase ID tokens and App Check tokens both expire after about an hour. The Firebase JS SDK
// refreshes the ID token and re-posts it to /__session-auth, which renews the cookie.
const MAX_AGE_SECONDS = 60 * 60;

function readFields(cookies: Cookies): URLSearchParams {
    return new URLSearchParams(cookies.get(SESSION_COOKIE) ?? '');
}

export function getSessionField(cookies: Cookies, field: SessionField): string | undefined {
    return readFields(cookies).get(field) || undefined;
}

// Sets one field (or removes it when value is undefined), keeping the other.
export function setSessionField(cookies: Cookies, field: SessionField, value: string | undefined): void {
    const fields = readFields(cookies);
    for (const key of [...fields.keys()]) {
        if (key !== 'auth' && key !== 'appCheck') fields.delete(key); // drop legacy/unknown content
    }
    if (value) fields.set(field, value);
    else fields.delete(field);

    if (fields.size === 0) {
        cookies.delete(SESSION_COOKIE, { path: '/' });
        return;
    }
    cookies.set(SESSION_COOKIE, fields.toString(), {
        path: '/',
        httpOnly: true,
        secure: !dev,
        sameSite: 'lax',
        maxAge: MAX_AGE_SECONDS
    });
}
