import { json } from '@sveltejs/kit';
import { getAuth } from 'firebase-admin/auth';
import { logger } from '$lib/logger';
import '$lib/firebase_admin';
import { setSessionField } from '$lib/server/session-cookie';
import type { RequestHandler } from './$types';

const log = logger.child('session-auth');


export const POST: RequestHandler = async ({ request, cookies }) => {
    let body: { idToken?: string } = {};
    try {
        body = await request.json();
    } catch {
        return json({ ok: false, error: 'invalid_json' }, { status: 400 });
    }

    const idToken = typeof body.idToken === 'string' ? body.idToken.trim() : '';
    if (!idToken) {
        return json({ ok: false, error: 'missing_id_token' }, { status: 400 });
    }

    try {
        const decoded = await getAuth().verifyIdToken(idToken);
        setSessionField(cookies, 'auth', idToken);
        log.info('session_auth_set', { uid: decoded.uid });
        return json({ ok: true, uid: decoded.uid });
    } catch (error) {
        log.warn('session_auth_invalid', { error });
        return json({ ok: false, error: 'invalid_id_token' }, { status: 401 });
    }
};

export const DELETE: RequestHandler = async ({ cookies }) => {
    setSessionField(cookies, 'auth', undefined);
    log.info('session_auth_cleared');
    return json({ ok: true });
};
