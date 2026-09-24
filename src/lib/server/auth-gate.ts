import { env } from '$env/dynamic/private';

// AUTH_GATE (in .env): when on, every page, image and action requires a Google-signed-in
// Firebase user; anonymous visitors only get the sign-in screen. Functions read the same
// flag from functions/.env.
export function authGateEnabled(): boolean {
    return /^(1|true|yes|on)$/i.test(env.AUTH_GATE?.trim() ?? '');
}

export const GATE_SIGN_IN_PROVIDER = 'google.com';
