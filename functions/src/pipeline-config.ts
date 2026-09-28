import { getFirestore } from "firebase-admin/firestore";
import { logger } from "./logger";
import { requireEnv } from "./prompt-loader";
import { PIPELINE_CONFIG_DOC, stepSettings, type PipelineConfig, type PipelineStepId, type StepSettings } from "./pipeline-steps";

// Runtime step settings (model, reasoning effort, temperature) set from the /__debug settings page
// (see pipeline-steps.ts). Read at most every CACHE_MS per instance, so a change reaches running
// functions within that time.

const log = logger.child("pipeline-config");
const CACHE_MS = 15_000;
let cached: { at: number; config: PipelineConfig } | null = null;

async function pipelineConfig(): Promise<PipelineConfig> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.config;
    let config: PipelineConfig = { models: {} };
    try {
        const snap = await getFirestore().doc(PIPELINE_CONFIG_DOC).get();
        config = { models: {}, ...(snap.data() as Partial<PipelineConfig> | undefined) };
    } catch (error) {
        log.warn("read_failed", { error });
    }
    cached = { at: Date.now(), config };
    return config;
}

/** What a pipeline step runs with: the settings-page overrides, else its env variable's model. */
export async function pipelineSettings(step: PipelineStepId): Promise<StepSettings> {
    const config = await pipelineConfig();
    return stepSettings(config, step, config.models[step]?.trim() ? "" : requireEnv(step));
}
