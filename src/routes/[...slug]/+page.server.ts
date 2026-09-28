import { GenerateHomePage, GenerateHtml, type TraceSpan } from "$lib/AI/PageGenerator";
import { resolveComponentScripts } from "$lib/AI/component-loader";
import { recordPageLog } from "$lib/server/page-log";
import type { PageServerLoad } from "./$types";

export const load: PageServerLoad = async (event) => {
    const startedAt = Date.now();
    const { token } = await event.parent();
    if (!token) {
        return;
    }
    const authSpan: TraceSpan = { label: 'Layout (session and auth checks)', kind: 'db', start: startedAt, end: Date.now() };

    const { idToken, userId, toolkitId } = event.locals;
    const pathname = event.url.pathname;
    const generated = pathname === '/'
        ? await GenerateHomePage(event.request, idToken, userId)
        : await GenerateHtml(event.request, pathname.replace(/^\//, ''), idToken, userId);

    const scriptsStartedAt = Date.now();
    const componentScripts = await resolveComponentScripts(generated.usedComponentIds, toolkitId, userId);
    const end = Date.now();

    // For the /__debug room: the whole server-side load, and each timed piece of it.
    await recordPageLog(toolkitId, pathname, userId, generated, [
        { label: 'Server total', kind: 'page', start: startedAt, end },
        authSpan,
        ...generated.trace,
        { label: 'Resolve component scripts', kind: 'db', start: scriptsStartedAt, end, detail: `${componentScripts.length} scripts` }
    ]);

    return {
        html: generated.html,
        prompt: generated.prompt,
        token,
        css: undefined,
        componentScripts
    };
};
