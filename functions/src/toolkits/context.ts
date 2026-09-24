import { AsyncLocalStorage } from "node:async_hooks";
import type { DomainToolkit } from "./types";

// The toolkit (site domain) the current request is for. Entry points (the mcp handler, operator
// functions, evaluateFeedback) wrap their work in runWithToolkit(); everything below them —
// component library paths, toolkit state — reads it with currentToolkit() instead of threading
// a toolkit id through every call.
const toolkitStorage = new AsyncLocalStorage<DomainToolkit>();

export function runWithToolkit<T>(toolkit: DomainToolkit, fn: () => Promise<T>): Promise<T> {
    return toolkitStorage.run(toolkit, fn);
}

export function currentToolkit(): DomainToolkit {
    const toolkit = toolkitStorage.getStore();
    if (!toolkit) {
        // Failing loudly beats silently reading or writing another toolkit's library.
        throw new Error("No toolkit in context: wrap the entry point in runWithToolkit().");
    }
    return toolkit;
}
