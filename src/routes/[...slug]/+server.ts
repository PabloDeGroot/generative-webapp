import { getAppCheck } from "firebase-admin/app-check";
import { logger } from "$lib/logger";
import { setSessionField } from "$lib/server/session-cookie";

import type { RequestHandler } from './$types';

const log = logger.child('app-check');

export const POST: RequestHandler = async (event) => {
    const token = event.request.headers.get('x-__session') || event.request.headers.get('__session');

    if (!token) {
        log.warn('missing_token');
        return new Response('Missing App Check token', {
            status: 400,
            headers: { 'Content-Type': 'text/plain' }
        });
    }

    try {
        await getAppCheck().verifyToken(token);
        log.debug('token_verified');
    } catch (error) {
        log.warn('token_invalid', { error });
        return new Response('Invalid App Check token', {
            status: 403,
            headers: {
                'Content-Type': 'text/plain',
                'X-Robots-Tag': 'noindex, nofollow'
            }
        });
    }

    setSessionField(event.cookies, 'appCheck', token);
    return new Response('App Check token set successfully', { status: 200 });
};