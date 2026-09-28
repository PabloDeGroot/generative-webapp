import { listPageLogs } from '$lib/server/page-log';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
    return { pages: await listPageLogs(locals.toolkitId, 100) };
};
