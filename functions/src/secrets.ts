import { defineSecret } from "firebase-functions/params";

// API keys stored in Google Secret Manager. Binding a secret to a function
// (via its `secrets` option) exposes it to that function as process.env.<NAME>.
// Locally, the emulator reads the same names from functions/.secret.local.
export const cerebrasApiKey = defineSecret("CEREBRAS_API_KEY");
export const geminiApiKey = defineSecret("GEMINI_API_KEY");
export const openaiApiKey = defineSecret("OPENAI_API_KEY");

export const aiSecrets = [cerebrasApiKey, geminiApiKey];
