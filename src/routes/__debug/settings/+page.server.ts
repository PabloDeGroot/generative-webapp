import { error, fail } from '@sveltejs/kit';
import {
    MODEL_CHOICES,
    MODEL_ID_PATTERN,
    MODEL_REASONING,
    PIPELINE_STEPS,
    REASONING_EFFORTS,
    TEMPERATURE_RANGE,
    settingsProblem,
    type PipelineConfig,
    type ReasoningEffort
} from '$functions/pipeline-steps';
import { debugAllowed } from '$lib/server/debug-access';
import { defaultModel, readPipelineConfig, writePipelineConfig } from '$lib/server/pipeline-config';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
    const config = await readPipelineConfig();
    return {
        choices: [...MODEL_CHOICES] as string[],
        efforts: [...REASONING_EFFORTS] as string[],
        modelReasoning: MODEL_REASONING as Record<string, { efforts: readonly string[]; default: string }>,
        temperatureRange: TEMPERATURE_RANGE,
        steps: PIPELINE_STEPS.map((step) => ({
            ...step,
            defaultModel: defaultModel(step.id),
            override: config.models[step.id] ?? '',
            reasoningEffort: config.reasoningEffort?.[step.id] ?? '',
            temperature: config.temperature?.[step.id]?.toString() ?? ''
        }))
    };
};

export const actions: Actions = {
    // Form actions don't run the layout's load, so they check access themselves.
    save: async ({ request, locals }) => {
        if (!debugAllowed(locals.userId)) error(403, 'Not allowed.');
        const form = await request.formData();
        const config: Required<PipelineConfig> = { models: {}, reasoningEffort: {}, temperature: {} };
        for (const step of PIPELINE_STEPS) {
            const model = String(form.get(`${step.id}.model`) ?? '').trim();
            const effort = String(form.get(`${step.id}.effort`) ?? '').trim();
            const temperatureText = String(form.get(`${step.id}.temperature`) ?? '').trim();

            if (model && !MODEL_ID_PATTERN.test(model)) return fail(400, { message: `${step.label}: "${model}" is not a valid model id.` });
            if (effort && !(REASONING_EFFORTS as readonly string[]).includes(effort)) return fail(400, { message: `${step.label}: unknown reasoning effort "${effort}".` });
            const temperature = temperatureText === '' ? undefined : Number(temperatureText);
            if (temperature !== undefined && Number.isNaN(temperature)) return fail(400, { message: `${step.label}: temperature must be a number.` });

            const settings = {
                model: model || defaultModel(step.id),
                reasoningEffort: (effort || undefined) as ReasoningEffort | undefined,
                temperature
            };
            const problem = settingsProblem(settings);
            if (problem) return fail(400, { message: `${step.label}: ${problem}` });

            if (model) config.models[step.id] = model;
            if (settings.reasoningEffort) config.reasoningEffort[step.id] = settings.reasoningEffort;
            if (temperature !== undefined) config.temperature[step.id] = temperature;
        }
        await writePipelineConfig(config, locals.userId);
        return { saved: true };
    }
};
