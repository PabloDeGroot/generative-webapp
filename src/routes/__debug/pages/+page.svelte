<script lang="ts">
  let { data } = $props();
  const seconds = (ms: number | undefined) => (ms === undefined ? "–" : `${(ms / 1000).toFixed(1)} s`);
  const k = (n: number) => (n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n));
  // "input (cached%)" for one phase: how much of the prompt the provider served from its cache.
  const tokens = (u: { inputTokens: number; cachedInputTokens: number } | undefined) =>
    u ? `${k(u.inputTokens)} (${u.inputTokens ? Math.round((100 * u.cachedInputTokens) / u.inputTokens) : 0}% cached)` : "–";
</script>

<svelte:head><title>Debug · page log</title></svelte:head>

<div class="wrap">
  <p class="intro">
    Every page generated in this toolkit, newest first. Open one to see the page designer's tool calls, its PageSpec,
    the generated HTML, and a replay of the page (no LLM calls).
  </p>
  {#if data.pages.length}
    <table>
      <thead>
        <tr><th>When</th><th>Route</th><th>Total</th><th>Design</th><th>HTML</th><th>Design input</th><th>HTML input</th><th>Models</th><th>Tool calls</th><th>Components</th></tr>
      </thead>
      <tbody>
        {#each data.pages as p (p.id)}
          <tr>
            <td class="nowrap">{p.createdAt ? new Date(p.createdAt).toLocaleString() : "–"}</td>
            <td><a href="/__debug/pages/{p.id}">{p.route || "/"}</a></td>
            <td class="num"><strong>{seconds(p.totalMs ?? undefined)}</strong></td>
            <td class="num">{seconds(p.timings?.designMs)}</td>
            <td class="num">{seconds(p.timings?.htmlMs)}</td>
            <td class="num">{tokens(p.usage?.design)}</td>
            <td class="num">{tokens(p.usage?.html)}</td>
            <td class="small">{p.models ? (p.models.design === p.models.html ? p.models.design : `${p.models.design} / ${p.models.html}`) : "–"}</td>
            <td class="num">{p.toolCallCount}</td>
            <td class="small">{p.usedComponentIds.join(", ")}</td>
          </tr>
        {/each}
      </tbody>
    </table>
  {:else}
    <p>No pages logged yet. Pages are recorded from now on, each time one is generated.</p>
  {/if}
</div>

<style>
  .wrap {
    padding: 16px;
    font-size: 14px;
  }
  .intro {
    margin-top: 0;
    color: #57606a;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    background: #fff;
    border: 1px solid #d0d7de;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 6px 10px;
    border-bottom: 1px solid #eaeef2;
  }
  a {
    color: #0969da;
    font-family: ui-monospace, monospace;
  }
  .num,
  .nowrap {
    white-space: nowrap;
  }
  .small {
    font-size: 12px;
    color: #57606a;
  }
</style>
