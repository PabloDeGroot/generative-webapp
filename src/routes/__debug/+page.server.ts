import { error, fail } from '@sveltejs/kit';
import { Timestamp, getFirestore } from 'firebase-admin/firestore';
import { componentSourceUrl } from '$lib/component-url';
import { libraryCounts, resetComponentLibrary } from '$lib/server/component-library';
import { debugAllowed } from '$lib/server/debug-access';
import { recentComponentSamples } from '$lib/server/page-log';
import { sharedLibraryPath, userLibraryPath } from '$lib/toolkit';
import '$lib/firebase_admin';
import type { Actions, PageServerLoad } from './$types';

export interface DebugProp {
    name: string;
    type: string;
    required: boolean;
    description: string;
    default?: unknown;
}

export interface DebugComponent {
    id: string;
    /** Which copy the site uses for this user: their override when they have one. */
    scope: 'shared' | 'override';
    hasShared: boolean;
    src: string | null;
    origin: string;
    shortDesc: string;
    role: string;
    props: DebugProp[];
    slots: { name: string; description: string; accepts: string }[];
    dependencies: string[];
    interactions: { trigger: string; method: string; route: string; bodyShape: string }[];
    updatedAt: string | null;
    samples: { label: string; attrs: Record<string, string> }[];
}

type ComponentDoc = FirebaseFirestore.DocumentData;

const list = <T>(value: unknown): T[] => (Array.isArray(value) ? (value as T[]) : []);

/** A made-up attribute set from the spec, for components no generated page has used yet. */
function fromProps(props: DebugProp[]): Record<string, string> {
    const attrs: Record<string, string> = {};
    for (const p of props) {
        if (p.default !== undefined && p.default !== null && p.default !== '') attrs[p.name] = typeof p.default === 'string' ? p.default : JSON.stringify(p.default);
        else if (p.required) attrs[p.name] = p.type === 'number' ? '1' : p.type === 'boolean' ? '' : p.type === 'json' ? '{}' : p.name;
    }
    return attrs;
}

function describe(id: string, doc: ComponentDoc, scope: DebugComponent['scope'], hasShared: boolean): Omit<DebugComponent, 'samples'> {
    const spec = (doc.spec ?? {}) as ComponentDoc;
    const updatedAt = doc.updatedAt instanceof Timestamp ? doc.updatedAt.toDate().toISOString() : null;
    return {
        id,
        scope,
        hasShared,
        src: typeof doc.gsPath === 'string' ? (doc.gsPath.startsWith('http') ? doc.gsPath : componentSourceUrl(doc.gsPath)) : null,
        origin: typeof doc.origin === 'string' ? doc.origin : doc.builtIn ? 'built-in' : 'generated',
        shortDesc: String(doc.shortDesc ?? spec.shortDesc ?? ''),
        role: String(spec.role ?? ''),
        props: list<DebugProp>(spec.props),
        slots: list(spec.slots),
        dependencies: list<string>(doc.dependencies),
        interactions: list(spec.interactions),
        updatedAt
    };
}

// Reads the library, overrides and page log only: no LLM calls.
export const load: PageServerLoad = async ({ locals }) => {
    const { toolkitId, userId } = locals;
    const db = getFirestore();
    const [shared, overrides, samples] = await Promise.all([
        db.collection(sharedLibraryPath(toolkitId)).get(),
        userId ? db.collection(userLibraryPath(userId, toolkitId)).get() : Promise.resolve(null),
        recentComponentSamples(toolkitId).catch(() => ({}) as Awaited<ReturnType<typeof recentComponentSamples>>)
    ]);
    const counts = await libraryCounts(toolkitId).catch(() => null);

    const byId = new Map<string, Omit<DebugComponent, 'samples'>>();
    for (const doc of shared.docs) byId.set(doc.id, describe(doc.id, doc.data(), 'shared', true));
    for (const doc of overrides?.docs ?? []) byId.set(doc.id, describe(doc.id, doc.data(), 'override', byId.has(doc.id)));

    const components: DebugComponent[] = [...byId.values()]
        .filter((c) => c.origin !== 'built-in')
        .sort((a, b) => a.id.localeCompare(b.id))
        .map((c) => ({
            ...c,
            samples: [
                ...(samples[c.id] ?? []).map((s) => ({ label: `From ${s.route || '/'}`, attrs: s.attrs })),
                { label: 'From the spec (required props)', attrs: fromProps(c.props) }
            ]
        }));

    return { components, counts };
};

export const actions: Actions = {
    // Form actions don't run the layout's load, so they check access themselves.
    reset: async ({ request, locals }) => {
        if (!debugAllowed(locals.userId)) error(403, 'Not allowed.');
        const form = await request.formData();
        const scope = form.get('scope');
        if (scope !== 'user-overrides' && scope !== 'all') return fail(400, { message: 'Unknown reset scope.' });
        // Wiping the shared library can't be undone: the toolkit id must be typed to confirm.
        if (scope === 'all' && form.get('confirm') !== locals.toolkitId) {
            return fail(400, { message: `Type "${locals.toolkitId}" to confirm deleting the whole library.` });
        }
        const result = await resetComponentLibrary(locals.toolkitId, scope);
        return { reset: { scope, ...result } };
    }
};
