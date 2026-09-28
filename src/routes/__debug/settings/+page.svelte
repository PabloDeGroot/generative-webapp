<script lang="ts">
  import { enhance } from "$app/forms";

  let { data, form } = $props();

  type Row = { model: string; effort: string; temperature: string };
  // Per step: "" = default (the .env model, the model's own effort, the provider's temperature).
  const values = $state<Record<string, Row>>(
    Object.fromEntries(
      data.steps.map((s) => [s.id, { model: s.override, effort: s.reasoningEffort, temperature: s.temperature }])
    )
  );
  const other = $state<Record<string, boolean>>(
    Object.fromEntries(data.steps.map((s) => [s.id, Boolean(s.override) && !data.choices.includes(s.override)]))
  );
  let saving = $state(false);

  type Step = (typeof data.steps)[number];
  const effectiveModel = (step: Step) => values[step.id].model || step.defaultModel;
  const reasoning = (step: Step) => data.modelReasoning[effectiveModel(step)];
  // Efforts the step's model accepts (all of them for a model we know nothing about).
  const effortsFor = (step: Step) => reasoning(step)?.efforts ?? data.efforts;
  const effortInvalid = (step: Step) => Boolean(values[step.id].effort) && !effortsFor(step).includes(values[step.id].effort);
  const temperatureInvalid = (step: Step) => {
    const t = values[step.id].temperature.trim();
    if (!t) return false;
    const n = Number(t);
    return Number.isNaN(n) || n < data.temperatureRange.min || n > data.temperatureRange.max;
  };
  const invalid = $derived(data.steps.some((s) => effortInvalid(s) || temperatureInvalid(s)));
  const changed = $derived(
    data.steps.some((s) => {
      const v = values[s.id];
      return v.model !== s.override || v.effort !== s.reasoningEffort || v.temperature.trim() !== s.temperature;
    })
  );
  const rowChanged = (s: Step) => {
    const v = values[s.id];
    return v.model !== s.override || v.effort !== s.reasoningEffort || v.temperature.trim() !== s.temperature;
  };

  function pick(stepId: string, choice: string) {
    other[stepId] = choice === "__other";
    values[stepId].model = choice === "__other" ? "" : choice;
  }

  function setAll(patch: Partial<Row>) {
    for (const s of data.steps) {
      Object.assign(values[s.id], patch);
      if (patch.model !== undefined) other[s.id] = false;
    }
  }
</script>

<svelte:head><title>Debug · settings</title></svelte:head>

<form
  method="POST"
  action="?/save"
  class="wrap"
  use:enhance={() => {
    saving = true;
    return async ({ update }) => {
      await update({ reset: false });
      saving = false;
    };
  }}
>
  <p class="intro">
    What each step runs with, for everyone on this project. Empty means the default: the <code>.env</code> model, the
    model's own reasoning effort, the provider's temperature. Changes reach running servers and functions within about
    15 seconds; the page log records what each page ran with.
  </p>

  <div class="bulk">
    <span>Every step:</span>
    {#each data.choices as choice}
      <button type="button" onclick={() => setAll({ model: choice })}>{choice}</button>
    {/each}
    <button type="button" onclick={() => setAll({ model: "" })}>.env models</button>
    <span class="sep"></span>
    {#each data.efforts as effort}
      <button type="button" onclick={() => setAll({ effort })}>effort {effort}</button>
    {/each}
    <button type="button" onclick={() => setAll({ effort: "", temperature: "" })}>default effort & temperature</button>
  </div>

  <table>
    <thead>
      <tr><th>Step</th><th>Model</th><th>Reasoning effort</th><th>Temperature</th><th>Runs with</th></tr>
    </thead>
    <tbody>
      {#each data.steps as step (step.id)}
        {@const v = values[step.id]}
        {@const r = reasoning(step)}
        <tr class:modified={rowChanged(step)}>
          <td>
            <strong>{step.label}</strong>
            <span class="small">· {step.runtime === "site" ? "SvelteKit server" : "Functions"}</span>
            <div class="small">{step.description}</div>
          </td>
          <td class="pick">
            <select value={other[step.id] ? "__other" : v.model} onchange={(e) => pick(step.id, e.currentTarget.value)}>
              <option value="">Default ({step.defaultModel || "not set"})</option>
              {#each data.choices as choice}<option value={choice}>{choice}</option>{/each}
              <option value="__other">Other…</option>
            </select>
            {#if other[step.id]}<input placeholder="model id" bind:value={v.model} />{/if}
            <input type="hidden" name="{step.id}.model" value={v.model} />
          </td>
          <td class="pick">
            <select name="{step.id}.effort" bind:value={v.effort} class:bad={effortInvalid(step)}>
              <option value="">Default{r ? ` (${r.default})` : ""}</option>
              {#each data.efforts as effort}
                <option value={effort} disabled={!effortsFor(step).includes(effort)}>{effort}{effort === "none" ? " (no reasoning)" : ""}</option>
              {/each}
            </select>
            {#if effortInvalid(step)}<span class="err small">{effectiveModel(step)} doesn't accept "{v.effort}".</span>{/if}
          </td>
          <td class="pick">
            <input
              name="{step.id}.temperature"
              inputmode="decimal"
              placeholder="default ({data.temperatureRange.min}–{data.temperatureRange.max})"
              bind:value={v.temperature}
              class:bad={temperatureInvalid(step)}
            />
          </td>
          <td class="small">
            <code>{effectiveModel(step)}</code>
            · effort {v.effort || r?.default || "default"}
            · temp {v.temperature.trim() || "default"}
          </td>
        </tr>
      {/each}
    </tbody>
  </table>

  <div class="actions">
    <button type="submit" class="primary" disabled={saving || !changed || invalid}>{saving ? "Saving…" : "Save"}</button>
    {#if form?.message}<span class="err">{form.message}</span>{:else if form?.saved && !changed}<span class="ok">Saved.</span>{/if}
  </div>
</form>

<style>
  .wrap {
    padding: 16px;
    font-size: 14px;
  }
  .intro {
    margin-top: 0;
    color: #57606a;
  }
  .bulk,
  .actions {
    display: flex;
    flex-wrap: wrap;
    gap: 8px;
    align-items: center;
    margin: 12px 0;
  }
  .sep {
    width: 12px;
  }
  button,
  select,
  input {
    font: inherit;
    padding: 4px 10px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #fff;
  }
  button {
    cursor: pointer;
  }
  .primary {
    background: #1f883d;
    border-color: #1f883d;
    color: #fff;
  }
  .primary:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .bad {
    border-color: #cf222e;
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
    padding: 8px 10px;
    border-bottom: 1px solid #eaeef2;
  }
  tr.modified {
    background: #fff8c5;
  }
  .pick {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 150px;
  }
  td.pick input[inputmode="decimal"] {
    width: 130px;
  }
  .small {
    font-size: 12px;
    color: #57606a;
  }
  .err {
    color: #cf222e;
  }
  .ok {
    color: #1a7f37;
  }
</style>
