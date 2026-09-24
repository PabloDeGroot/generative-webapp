import type { LayoutServerLoad } from './$types';
import { getAppCheck } from 'firebase-admin/app-check';
import { logger } from '$lib/logger';
import { authGateEnabled, GATE_SIGN_IN_PROVIDER } from '$lib/server/auth-gate';
import { setSessionField } from '$lib/server/session-cookie';
import '$lib/firebase_admin';

const log = logger.child('layout');

export const load: LayoutServerLoad = async (data) => {
    // With the auth gate on, a Google sign-in is the only way in; it replaces the App Check
    // token as the "token" that lets pages generate. Without one, the layout shows sign-in.
    if (authGateEnabled()) {
        return data.locals.signInProvider === GATE_SIGN_IN_PROVIDER
            ? { token: 'signed-in', authRequired: false, authGate: true }
            : { token: undefined, authRequired: true, authGate: true };
    }

    if (import.meta.env.DEV) {
        return { token: 'dev-token', authRequired: false, authGate: false };
    }

    let validationCookie = data.locals.validationCookie;
    if (validationCookie) {
        try {
            await getAppCheck().verifyToken(validationCookie);
            log.debug('app_check_ok');
        } catch (error) {
            log.warn('app_check_invalid', { error });
            setSessionField(data.cookies, 'appCheck', undefined);
            validationCookie = undefined;
        }
    } else {
        log.debug('app_check_no_cookie');
    }

    return { token: validationCookie, authRequired: false, authGate: false };
};
