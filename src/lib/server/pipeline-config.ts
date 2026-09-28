import { FieldValue, getFirestore } from 'firebase-admin/firestore';
import { env } from '$env/dynamic/private';
import { logger } from '$lib/logger';
import {
    PIPELINE_CONFIG_DOC,
    PIPELINE_STEPS,
    stepSettings,
    type PipelineConfig,
    type PipelineStepId,
    type StepSettings
} from '$functions/pipeline-steps';
import functionsEnvFile from '../../../functions/.env?raw';
import '$lib/firebase_admin';

// Runtime step settings (model, reasoning effort, temperature) set from the /__debug settings page
// (see functions/src/pipeline-steps.ts; the functions read the same document). Read at most every
// CACHE_MS per server instance.

const log = logger.child('pipeline-config');
const CACHE_MS = 15_000;
let cached: { at: number; config: PipelineConfig } | null = null;

export async function readPipelineConfig(): Promise<PipelineConfig> {
    if (cached && Date.now() - cached.at < CACHE_MS) return cached.config;
    let config: PipelineConfig = { models: {} };
    try {
        const snap = await getFirestore().doc(PIPELINE_CONFIG_DOC).get();
        config = { models: {}, ...(snap.data() as Partial<PipelineConfig> | undefined) };
    } catch (error) {
        log.warn('read_failed', { error });
    }
    cached = { at: Date.now(), config };
    return config;
}

/** Replaces the overrides; this instance sees them at once, others within CACHE_MS. */
export async function writePipelineConfig(config: PipelineConfig, userId: string | undefined): Promise<void> {
    await getFirestore().doc(PIPELINE_CONFIG_DOC).set({
        ...config,
        updatedAt: FieldValue.serverTimestamp(),
        updatedBy: userId ?? null
    });
    cached = { at: Date.now(), config };
}

// functions/.env is the functions' committed config (no secrets), bundled so the settings page can
// show their defaults.
const functionsEnv = Object.fromEntries(
    functionsEnvFile
        .split(/\r?\n/)
        .map((line) => /^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/.exec(line))
        .filter((m): m is RegExpExecArray => Boolean(m))
        .map((m) => [m[1], m[2].replace(/^(['"])(.*)\1$/, '$2')])
);

/** The .env default of a step, from the runtime that runs it. */
export function defaultModel(step: PipelineStepId): string {
    const runtime = PIPELINE_STEPS.find((s) => s.id === step)?.runtime;
    return ((runtime === 'functions' ? functionsEnv[step] : env[step]) ?? '').trim();
}

/** What a site-side pipeline step runs with: the settings-page overrides, else its env variable's model. */
export async function pipelineSettings(step: PipelineStepId): Promise<StepSettings> {
    const settings = stepSettings(await readPipelineConfig(), step, defaultModel(step));
    if (!settings.model) throw new Error(`Missing required environment variable: ${step}`);
    return settings;
}
