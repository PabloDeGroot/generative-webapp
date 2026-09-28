// The LLM steps whose model can be overridden at runtime from the /__debug settings page.
// Shared by the SvelteKit server and the functions (both read the overrides from Firestore
// PIPELINE_CONFIG_DOC and fall back to the env variable of the same name), so keep this file
// dependency-free.

export const PIPELINE_CONFIG_DOC = "config/pipeline";

export const PIPELINE_STEPS = [
    { id: "PAGE_DESIGNER_MODEL", runtime: "site", label: "Page designer", description: "Agent that reads the route, calls the toolkit's tools and writes the PageSpec." },
    { id: "HTML_GENERATOR_MODEL", runtime: "site", label: "HTML generator", description: "Single call turning the PageSpec into the page's HTML." },
    { id: "ACTION_RUNNER_MODEL", runtime: "site", label: "Action runner", description: "Agent answering components' data requests (POST with an intent) with the toolkit's tools." },
    { id: "IMAGE_DESCRIPTION_MODEL", runtime: "site", label: "Image description", description: "Describes the picture for an AI-generated /images/... route before it is drawn." },
    { id: "COMPONENT_DESIGNER_MODEL", runtime: "functions", label: "Component designer", description: "Agent that writes a new or updated component's spec (CreateComponent, UpdateComponent)." },
    { id: "COMPONENT_CODEGEN_MODEL", runtime: "functions", label: "Component codegen", description: "Writes a component's JavaScript from its spec." },
    { id: "COMPONENT_EVALUATOR_MODEL", runtime: "functions", label: "Component evaluator", description: "Reviews generated component code; a failure triggers one codegen retry." },
    { id: "FEEDBACK_EVALUATOR_MODEL", runtime: "functions", label: "Feedback evaluator", description: "Routes a user's feedback into a component override or a saved preference." },
    { id: "COMPONENT_INITIALIZER_MODEL", runtime: "functions", label: "Component initializer", description: "Operator: seeds a toolkit's library (initializeComponents)." },
    { id: "COMPONENT_CURATOR_MODEL", runtime: "functions", label: "Component curator", description: "Operator: curates a toolkit's library (updateComponents)." }
] as const;

export type PipelineStepId = (typeof PIPELINE_STEPS)[number]["id"];

/** Suggested models; any other model id can still be typed in. */
export const MODEL_CHOICES = ["gpt-oss-120b", "qwen-3.8-27b"] as const;

/** A model id as accepted from the settings page (provider ids are short and plain). */
export const MODEL_ID_PATTERN = /^[\w.:/-]{1,100}$/;

export const REASONING_EFFORTS = ["none", "low", "medium", "high"] as const;
export type ReasoningEffort = (typeof REASONING_EFFORTS)[number];

/**
 * reasoning_effort values each Cerebras model accepts, and its default
 * (https://inference-docs.cerebras.ai/api-reference/chat-completions). Models not listed get
 * whatever is set, unchecked.
 */
export const MODEL_REASONING: Record<string, { efforts: readonly ReasoningEffort[]; default: ReasoningEffort }> = {
    "gpt-oss-120b": { efforts: ["low", "medium", "high"], default: "medium" },
    "qwen-3.8-27b": { efforts: ["none", "low", "medium", "high"], default: "high" }
};

/** Cerebras accepts 0–2. */
export const TEMPERATURE_RANGE = { min: 0, max: 2 } as const;

export interface PipelineConfig {
    /** Model per step; a missing step uses its env variable. */
    models: Partial<Record<PipelineStepId, string>>;
    /** Missing: the model's own default. */
    reasoningEffort?: Partial<Record<PipelineStepId, ReasoningEffort>>;
    /** Missing: the provider's default. */
    temperature?: Partial<Record<PipelineStepId, number>>;
}

/** What one step runs with. */
export interface StepSettings {
    model: string;
    reasoningEffort?: ReasoningEffort;
    temperature?: number;
}

export function stepSettings(config: PipelineConfig, step: PipelineStepId, defaultModel: string): StepSettings {
    return {
        model: config.models[step]?.trim() || defaultModel,
        reasoningEffort: config.reasoningEffort?.[step],
        temperature: config.temperature?.[step]
    };
}

/** Why these settings can't be used together, or null. */
export function settingsProblem(settings: StepSettings): string | null {
    const known = MODEL_REASONING[settings.model];
    if (settings.reasoningEffort && known && !known.efforts.includes(settings.reasoningEffort)) {
        return `${settings.model} accepts reasoning effort ${known.efforts.join(", ")}, not "${settings.reasoningEffort}".`;
    }
    const t = settings.temperature;
    if (t !== undefined && !(t >= TEMPERATURE_RANGE.min && t <= TEMPERATURE_RANGE.max)) {
        return `Temperature must be between ${TEMPERATURE_RANGE.min} and ${TEMPERATURE_RANGE.max}.`;
    }
    return null;
}

/**
 * generateText options for a step: temperature, plus for Cerebras models the reasoning effort and,
 * for multi-step tool loops, a prompt_cache_key that keeps every step of one run on the same cache
 * backend (unique per run; see https://inference-docs.cerebras.ai/capabilities/prompt-caching).
 * An effort the model doesn't accept (e.g. left over after switching models) is dropped rather
 * than failing the request.
 */
export function stepCallOptions(settings: StepSettings, cacheKey?: string): {
    temperature?: number;
    providerOptions?: { cerebras: { prompt_cache_key?: string; reasoningEffort?: ReasoningEffort } };
} {
    const options: ReturnType<typeof stepCallOptions> = {};
    if (settings.temperature !== undefined) options.temperature = settings.temperature;
    if (/gemini/i.test(settings.model)) return options;
    const known = MODEL_REASONING[settings.model];
    const effort = settings.reasoningEffort && (!known || known.efforts.includes(settings.reasoningEffort))
        ? settings.reasoningEffort
        : undefined;
    const cerebras = {
        ...(cacheKey && { prompt_cache_key: cacheKey }),
        ...(effort && { reasoningEffort: effort })
    };
    if (Object.keys(cerebras).length) options.providerOptions = { cerebras };
    return options;
}

/** "gpt-oss-120b · effort low · temp 0.2", for logs and the page log. */
export function describeSettings(settings: StepSettings): string {
    return [
        settings.model,
        settings.reasoningEffort && `effort ${settings.reasoningEffort}`,
        settings.temperature !== undefined && `temp ${settings.temperature}`
    ].filter(Boolean).join(" · ");
}
