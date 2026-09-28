import { error } from '@sveltejs/kit';
import { debugAllowed } from '$lib/server/debug-access';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals }) => {
    if (!debugAllowed(locals.userId)) {
        error(403, locals.userId
            ? `The debug room is limited to DEBUG_USER_IDS in .env. Your uid is ${locals.userId}.`
            : 'Sign in to use the debug room.');
    }
    return { toolkitId: locals.toolkitId };
};
