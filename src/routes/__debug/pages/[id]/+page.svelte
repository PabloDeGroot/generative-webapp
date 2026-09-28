<script lang="ts">
  let { data } = $props();
  const entry = $derived(data.entry);

  const tabs = ["Replay", "Timeline", "Tool calls", "PageSpec", "Designer output", "HTML", "Component usages"] as const;
  let tab = $state<(typeof tabs)[number]>("Replay");
  let outline = $state(false);

  const seconds = (ms: number | null | undefined) => (ms === undefined || ms === null ? "–" : `${(ms / 1000).toFixed(1)} s`);
  const duration = (ms: number) => (ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(2)} s`);

  // Timeline: every span placed on one axis from the start of the server-side load.
  const timeline = $derived.by(() => {
    const spans = [...entry.trace].sort((a, b) => a.start - b.start || b.end - a.end);
    const t0 = spans.length ? Math.min(...spans.map((s) => s.start)) : 0;
    const total = spans.length ? Math.max(1, Math.max(...spans.map((s) => s.end)) - t0) : 1;
    return spans.map((s) => ({
      ...s,
      offset: s.start - t0,
      ms: s.end - s.start,
      left: ((s.start - t0) / total) * 100,
      width: Math.max(0.3, ((s.end - s.start) / total) * 100)
    }));
  });
  const tokens = (u: { inputTokens: number; cachedInputTokens: number; outputTokens: number } | undefined) =>
    u ? `${u.inputTokens} in (${u.cachedInputTokens} cached) · ${u.outputTokens} out` : "–";

  // Outlines and labels every custom element in the replay, to show which component drew what.
  function outlineComponents(node: HTMLElement, on: boolean) {
    const apply = (enabled: boolean) => {
      for (const el of node.querySelectorAll<HTMLElement>("*")) {
        if (!el.tagName.includes("-")) continue;
        el.style.outline = enabled ? "2px dashed #cf222e" : "";
        el.style.outlineOffset = enabled ? "-2px" : "";
        if (enabled) el.title = `<${el.tagName.toLowerCase()}>`;
        else el.removeAttribute("title");
      }
    };
    apply(on);
    return { update: apply };
  }
</script>

<svelte:head>
  <title>Debug · {entry.route || "/"}</title>
  {#each data.componentScripts as script (script.id)}
    <script type="module" src={script.src}></script>
  {/each}
</svelte:head>

<div class="meta">
  <a href="/__debug/pages">← Page log</a>
  <h1><code>{entry.route || "/"}</code></h1>
  <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleString() : ""}</span>
  <span><strong>total {seconds(entry.totalMs)}</strong> · design {seconds(entry.timings?.designMs)} · HTML {seconds(entry.timings?.htmlMs)}</span>
  {#if entry.models}<span>models: design <code>{entry.models.design}</code> · HTML <code>{entry.models.html}</code></span>{/if}
  {#if entry.usage}
    <span>design tokens: {tokens(entry.usage.design)}</span>
    <span>HTML tokens: {tokens(entry.usage.html)}</span>
  {/if}
  <span>{entry.toolCalls.length} tool calls · {entry.usedComponentIds.length} components</span>
  <a href="/{entry.route}" title="Opens the real page, which generates it again with the LLM">Generate again ↗</a>
</div>

<div class="tabs" role="tablist">
  {#each tabs as t}
    <button role="tab" aria-selected={tab === t} onclick={() => (tab = t)}>{t}</button>
  {/each}
</div>

{#if tab === "Replay"}
  <div class="bar">
    <label><input type="checkbox" bind:checked={outline} /> Outline components</label>
    <span class="small">Rendered from the stored HTML with today's components; no LLM calls.</span>
    {#if entry.htmlTruncated}<span class="warn">The stored HTML was truncated.</span>{/if}
  </div>
  <div class="replay" use:outlineComponents={outline}>
    {@html entry.html}
  </div>
{:else if tab === "Timeline"}
  {#if timeline.length}
    <div class="bar small">
      Server-side time from the request reaching the page load until the page data was ready. The model share of each
      step ends where its first tool call starts; tools called in the same step run in parallel. Not included: the
      browser downloading the page and loading component scripts.
    </div>
    <table class="timeline">
      <thead><tr><th>Step</th><th class="num">Start</th><th class="num">Took</th><th class="track-head"></th></tr></thead>
      <tbody>
        {#each timeline as span}
          <tr class="kind-{span.kind}" class:failed={span.failed}>
            <td>
              <span class="label">{span.label}</span>
              {#if span.detail}<div class="small">{span.detail}</div>{/if}
            </td>
            <td class="num">+{duration(span.offset)}</td>
            <td class="num">{duration(span.ms)}</td>
            <td class="track"><span class="span-bar" style="left:{span.left}%;width:{span.width}%"></span></td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p class="bar">No timing recorded for this page (it was generated before timings were added).</p>
  {/if}
{:else if tab === "Tool calls"}
  <ol class="calls">
    {#each entry.toolCalls as call, i}
      <li class:failed={call.failed}>
        <details>
          <summary>
            <code>{call.name}</code>
            {#if call.durationMs != null}<span class="small">{duration(call.durationMs)}</span>{/if}
            {#if call.readOnly}<span class="badge">read-only</span>{:else}<span class="badge write">write</span>{/if}
            {#if call.failed}<span class="badge err">failed</span>{/if}
          </summary>
          <h3>Arguments</h3>
          <pre>{call.args}</pre>
          <h3>Result</h3>
          <pre>{call.result}</pre>
        </details>
      </li>
    {:else}
      <p>The page designer made no tool calls.</p>
    {/each}
  </ol>
{:else if tab === "PageSpec"}
  <pre class="block">{entry.pageSpec}</pre>
{:else if tab === "Designer output"}
  <pre class="block">{entry.designerOutput}</pre>
{:else if tab === "HTML"}
  <pre class="block">{entry.html}</pre>
{:else}
  <table>
    <thead><tr><th>Component</th><th>Attributes</th></tr></thead>
    <tbody>
      {#each entry.usages as usage}
        <tr>
          <td><a href="/__debug#{usage.id}"><code>{usage.id}</code></a></td>
          <td>
            {#each Object.entries(usage.attrs) as [name, value]}
              <div><code>{name}</code>=<span class="value">"{value}"</span></div>
            {/each}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>
{/if}

<style>
  .meta {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 16px;
    align-items: baseline;
    padding: 12px 16px;
    font-size: 13px;
    color: #57606a;
  }
  h1 {
    margin: 0;
    font-size: 18px;
    color: #1f2328;
  }
  a {
    color: #0969da;
  }
  .tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    padding: 0 16px;
    border-bottom: 1px solid #d0d7de;
  }
  .tabs button {
    font: inherit;
    font-size: 14px;
    padding: 6px 12px;
    border: 1px solid transparent;
    border-bottom: none;
    border-radius: 6px 6px 0 0;
    background: none;
    cursor: pointer;
  }
  .tabs button[aria-selected="true"] {
    background: #fff;
    border-color: #d0d7de;
    margin-bottom: -1px;
  }
  .bar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    padding: 8px 16px;
    font-size: 13px;
  }
  .replay {
    background: #fff;
    border-top: 1px solid #d0d7de;
  }
  .block,
  pre {
    white-space: pre-wrap;
    overflow-wrap: anywhere;
    font: 12px/1.5 ui-monospace, monospace;
  }
  .block {
    margin: 0;
    padding: 16px;
    background: #fff;
  }
  pre {
    background: #f6f8fa;
    padding: 8px;
    border-radius: 6px;
    max-height: 480px;
    overflow: auto;
  }
  .calls {
    margin: 0;
    padding: 12px 16px 12px 40px;
    font-size: 13px;
    background: #fff;
  }
  .calls li {
    padding: 4px 0;
  }
  .calls summary {
    cursor: pointer;
  }
  .calls h3 {
    margin: 8px 0 4px;
    font-size: 12px;
  }
  .badge {
    font-size: 11px;
    padding: 1px 6px;
    border-radius: 999px;
    background: #ddf4ff;
    color: #0550ae;
  }
  .badge.write {
    background: #fff8c5;
    color: #7d4e00;
  }
  .badge.err,
  .failed code {
    background: #ffebe9;
    color: #a40e26;
  }
  .small {
    color: #57606a;
  }
  .warn {
    color: #9a6700;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    font-size: 13px;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 6px 16px;
    border-bottom: 1px solid #eaeef2;
  }
  .value {
    overflow-wrap: anywhere;
  }
  .timeline td {
    padding: 4px 16px;
  }
  .timeline .num {
    white-space: nowrap;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .track-head,
  .track {
    width: 50%;
  }
  .track {
    position: relative;
  }
  .span-bar {
    position: absolute;
    top: 50%;
    height: 12px;
    margin-top: -6px;
    border-radius: 3px;
    background: #8c959f;
  }
  .kind-page .span-bar {
    background: #24292f;
  }
  .kind-phase .span-bar {
    background: #8250df;
  }
  .kind-llm .span-bar {
    background: #0969da;
  }
  .kind-tool .span-bar {
    background: #1a7f37;
  }
  .kind-mcp .span-bar {
    background: #bf8700;
  }
  .kind-page .label,
  .kind-phase .label {
    font-weight: 600;
  }
  .failed .span-bar {
    background: #cf222e;
  }
</style>
