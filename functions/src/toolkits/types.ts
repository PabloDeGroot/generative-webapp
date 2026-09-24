import type { ZodTypeAny } from "zod/v4";
import type { defineSecret } from "firebase-functions/params";

type SecretParam = ReturnType<typeof defineSecret>;

export interface ToolkitContext {
    userId: string | null;
}

export interface ToolkitTool {
    name: string;
    description: string;
    inputSchema: Record<string, ZodTypeAny>;
    readOnly: boolean;
    requiresAuth?: boolean;
    handler: (args: any, ctx: ToolkitContext) => Promise<unknown>;
}

export interface DomainToolkit {
    id: string;
    description: string;
    /** Optional async override — if present, mcpHandler calls this instead of .description */
    getDescription?: () => Promise<string>;
    tools: ToolkitTool[];
    /**
     * API keys the tools need (defineSecret). The mcp function binds every toolkit's secrets,
     * so handlers read them as process.env.<NAME>. Create each in Secret Manager before deploying.
     */
    secrets?: SecretParam[];
}
