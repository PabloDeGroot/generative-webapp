import { error } from '@sveltejs/kit';
import { resolveComponentScripts } from '$lib/AI/component-loader';
import { getPageLog } from '$lib/server/page-log';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ params, locals }) => {
    const entry = await getPageLog(locals.toolkitId, params.id);
    if (!entry) error(404, 'No such page in the log.');
    // The replay loads the components as they are now, which may differ from when the page was made.
    const componentScripts = await resolveComponentScripts(entry.usedComponentIds, locals.toolkitId, locals.userId);
    return { entry, componentScripts };
};
