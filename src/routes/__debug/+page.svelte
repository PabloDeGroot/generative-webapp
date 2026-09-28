<script lang="ts">
  import { onMount } from "svelte";
  import { enhance } from "$app/forms";
  import type { DebugComponent } from "./+page.server";

  let { data, form } = $props();
  let confirmAll = $state("");
  let resetting = $state(false);
  const resetEnhance = () => {
    resetting = true;
    return async ({ update }: { update: () => Promise<void> }) => {
      await update();
      resetting = false;
      confirmAll = "";
    };
  };

  type CardState = { sample: number; attrs: Record<string, string>; width: "full" | "phone"; nonce: number };
  const cards = $state<Record<string, CardState>>({});
  for (const c of data.components) cards[c.id] = { sample: 0, attrs: { ...c.samples[0].attrs }, width: "full", nonce: 0 };

  let query = $state("");
  let role = $state("");
  const roles = $derived([...new Set(data.components.map((c) => c.role).filter(Boolean))].sort());
  const shown = $derived(
    data.components.filter((c) => {
      const q = query.trim().toLowerCase();
      return (!role || c.role === role) && (!q || c.id.includes(q) || c.shortDesc.toLowerCase().includes(q));
    })
  );

  // Whether each tag got registered once its script ran (a broken script never defines it).
  const defined = $state<Record<string, boolean | undefined>>({});
  onMount(() => {
    for (const c of data.components) {
      if (!c.src) continue;
      customElements.whenDefined(c.id).then(() => (defined[c.id] = true));
      setTimeout(() => (defined[c.id] ??= false), 8000);
    }
  });

  function pickSample(c: DebugComponent, index: number) {
    cards[c.id].sample = index;
    cards[c.id].attrs = { ...c.samples[index].attrs };
    cards[c.id].nonce++;
  }

  /** Attribute names to offer: the spec's props, then any extra ones the current values carry. */
  function attrNames(c: DebugComponent): string[] {
    const names = c.props.map((p) => p.name);
    for (const name of Object.keys(cards[c.id].attrs)) if (!names.includes(name)) names.push(name);
    return names;
  }

  function setAttr(c: DebugComponent, name: string, value: string) {
    cards[c.id].attrs[name] = value;
    cards[c.id].nonce++;
  }

  function clearAttr(c: DebugComponent, name: string) {
    delete cards[c.id].attrs[name];
    cards[c.id].nonce++;
  }

  // Renders the component into the node: its attributes plus a labeled placeholder per slot.
  function mountComponent(node: HTMLElement, params: { component: DebugComponent; attrs: Record<string, string>; nonce: number }) {
    const render = ({ component, attrs }: typeof params) => {
      node.replaceChildren();
      const element = document.createElement(component.id);
      for (const [name, value] of Object.entries(attrs)) {
        try {
          element.setAttribute(name, value);
        } catch {
          /* not a valid attribute name */
        }
      }
      for (const slot of component.slots) {
        const box = document.createElement("div");
        if (slot.name && slot.name !== "default") box.slot = slot.name;
        box.textContent = `slot "${slot.name || "default"}" · ${slot.accepts || slot.description}`;
        box.style.cssText = "border:2px dashed #8c959f;border-radius:6px;padding:16px;color:#57606a;font:13px system-ui;background:#fff8";
        element.append(box);
      }
      node.append(element);
    };
    render(params);
    return { update: render };
  }
</script>

<svelte:head>
  <title>Debug · components</title>
  {#each data.components as c (c.id)}
    {#if c.src}
      <script type="module" src={c.src}></script>
    {/if}
  {/each}
</svelte:head>

<section class="library">
  <h2>Library of <code>{data.toolkitId}</code></h2>
  {#if data.counts}
    <p>
      {data.counts.shared} shared components · {data.counts.overrides} user overrides from {data.counts.usersWithOverrides}
      {data.counts.usersWithOverrides === 1 ? "user" : "users"} (written by feedback)
    </p>
  {/if}
  <div class="reset">
    <form
      method="POST"
      action="?/reset"
      use:enhance={resetEnhance}
      onsubmit={(e) => {
        if (!confirm(`Delete every user's component overrides in "${data.toolkitId}"? The shared library stays.`)) e.preventDefault();
      }}
    >
      <input type="hidden" name="scope" value="user-overrides" />
      <button disabled={resetting || !data.counts?.overrides}>Delete all user overrides</button>
    </form>
    <form method="POST" action="?/reset" use:enhance={resetEnhance}>
      <input type="hidden" name="scope" value="all" />
      <input name="confirm" placeholder={`type "${data.toolkitId}"`} bind:value={confirmAll} />
      <button class="danger" disabled={resetting || confirmAll !== data.toolkitId}>Delete the whole library</button>
    </form>
  </div>
  {#if form?.message}<p class="err">{form.message}</p>{/if}
  {#if form?.reset}
    <p class="ok">
      Deleted {form.reset.overridesDeleted} overrides ({form.reset.usersAffected} users){form.reset.scope === "all" ? ` and ${form.reset.sharedDeleted} shared components` : ""},
      {form.reset.storageObjectsDeleted} stored scripts.
    </p>
  {/if}
  <p class="small">User preferences saved by feedback are not touched.</p>
</section>

<div class="toolbar">
  <input type="search" placeholder="Filter by id or description" bind:value={query} />
  <select bind:value={role}>
    <option value="">All roles</option>
    {#each roles as r}<option value={r}>{r}</option>{/each}
  </select>
  <span>{shown.length} of {data.components.length} components</span>
  <nav class="jump">
    {#each shown as c (c.id)}<a href="#{c.id}">{c.id}</a>{/each}
  </nav>
</div>

{#each shown as c (c.id)}
  {@const card = cards[c.id]}
  <section class="card" id={c.id}>
    <div class="head">
      <h2>&lt;{c.id}&gt;</h2>
      {#if c.role}<span class="badge">{c.role}</span>{/if}
      <span class="badge">{c.origin}</span>
      {#if c.scope === "override"}<span class="badge warn">your override{c.hasShared ? "" : " (no shared copy)"}</span>{/if}
      {#if defined[c.id] === false}<span class="badge err">not defined: script failed?</span>{/if}
      {#if !c.src}<span class="badge err">no script</span>{/if}
      <span class="spacer"></span>
      {#if c.src}<a href={c.src} target="_blank" rel="noreferrer">source</a>{/if}
    </div>
    <p class="desc">{c.shortDesc}</p>

    <div class="controls">
      <label>
        Attributes
        <select value={card.sample} onchange={(e) => pickSample(c, Number(e.currentTarget.value))}>
          {#each c.samples as s, i}<option value={i}>{s.label}</option>{/each}
        </select>
      </label>
      <label>
        Width
        <select bind:value={cards[c.id].width}>
          <option value="full">Full</option>
          <option value="phone">Phone (390px)</option>
        </select>
      </label>
      <button onclick={() => card.nonce++}>Re-render</button>
    </div>

    <div class="body">
      <div class="preview" class:phone={card.width === "phone"}>
        <div use:mountComponent={{ component: c, attrs: card.attrs, nonce: card.nonce }}></div>
      </div>

      <details class="spec">
        <summary>Attributes, slots and spec</summary>
        <table>
          <thead><tr><th>Attribute</th><th>Value</th><th>Spec</th></tr></thead>
          <tbody>
            {#each attrNames(c) as name}
              {@const prop = c.props.find((p) => p.name === name)}
              <tr>
                <td><code>{name}</code>{#if prop?.required}<span class="req">*</span>{/if}</td>
                <td class="value">
                  <input
                    value={card.attrs[name] ?? ""}
                    placeholder={name in card.attrs ? "" : "(not set)"}
                    onchange={(e) => setAttr(c, name, e.currentTarget.value)}
                  />
                  {#if name in card.attrs}<button title="Remove the attribute" onclick={() => clearAttr(c, name)}>×</button>{/if}
                </td>
                <td class="small">{#if prop}<em>{prop.type}</em> {prop.description}{:else}<em>not in the spec</em>{/if}</td>
              </tr>
            {/each}
          </tbody>
        </table>
        {#if c.slots.length}
          <h3>Slots</h3>
          <ul>{#each c.slots as s}<li><code>{s.name || "default"}</code>: {s.description} <em>(accepts {s.accepts})</em></li>{/each}</ul>
        {/if}
        {#if c.dependencies.length}
          <h3>Uses</h3>
          <p>{#each c.dependencies as d}<a href="#{d}"><code>{d}</code></a> {/each}</p>
        {/if}
        {#if c.interactions.length}
          <h3>Actions</h3>
          <ul>{#each c.interactions as i}<li><code>{i.method} {i.route}</code> on {i.trigger}: {i.bodyShape}</li>{/each}</ul>
        {/if}
        {#if c.updatedAt}<p class="small">Updated {new Date(c.updatedAt).toLocaleString()}</p>{/if}
      </details>
    </div>
  </section>
{:else}
  <p class="empty">No components match.</p>
{/each}

<style>
  .library {
    margin: 12px 16px 0;
    padding: 10px 14px;
    background: #fff;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    font-size: 14px;
  }
  .library h2 {
    margin: 0 0 4px;
    font-size: 15px;
  }
  .library p {
    margin: 4px 0;
  }
  .reset {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 24px;
    margin: 8px 0;
  }
  .reset form {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .reset input {
    font: inherit;
    padding: 4px 8px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    width: 150px;
  }
  .danger {
    background: #cf222e;
    border-color: #cf222e;
    color: #fff;
  }
  button:disabled {
    opacity: 0.5;
    cursor: default;
  }
  .err {
    color: #cf222e;
  }
  .ok {
    color: #1a7f37;
  }
  .toolbar {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 12px;
    align-items: center;
    padding: 12px 16px;
    font-size: 14px;
  }
  .toolbar input {
    min-width: 240px;
  }
  .toolbar input,
  select,
  button,
  td input {
    font: inherit;
    padding: 4px 8px;
    border: 1px solid #d0d7de;
    border-radius: 6px;
    background: #fff;
  }
  button {
    cursor: pointer;
  }
  .jump {
    display: flex;
    flex-wrap: wrap;
    gap: 4px 10px;
    width: 100%;
    font-size: 12px;
  }
  .jump a {
    color: #0969da;
  }
  .card {
    margin: 0 16px 20px;
    background: #fff;
    border: 1px solid #d0d7de;
    border-radius: 8px;
    scroll-margin-top: 60px;
  }
  .head {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    align-items: center;
    padding: 10px 14px 0;
  }
  h2 {
    margin: 0 6px 0 0;
    font: 600 16px ui-monospace, monospace;
  }
  h3 {
    margin: 12px 0 4px;
    font-size: 13px;
  }
  .badge {
    font-size: 12px;
    padding: 1px 8px;
    border-radius: 999px;
    background: #ddf4ff;
    color: #0550ae;
  }
  .badge.warn {
    background: #fff8c5;
    color: #7d4e00;
  }
  .badge.err {
    background: #ffebe9;
    color: #a40e26;
  }
  .spacer {
    flex: 1;
  }
  .head a {
    font-size: 13px;
    color: #0969da;
  }
  .desc {
    margin: 6px 14px;
    font-size: 13px;
    color: #57606a;
  }
  .controls {
    display: flex;
    flex-wrap: wrap;
    gap: 8px 16px;
    align-items: center;
    padding: 0 14px 10px;
    font-size: 13px;
  }
  .controls label {
    display: flex;
    gap: 6px;
    align-items: center;
  }
  .controls select {
    max-width: 320px;
  }
  .preview {
    border-top: 1px solid #d0d7de;
    border-bottom: 1px solid #d0d7de;
    background: #fff;
    overflow: auto;
  }
  .preview.phone > div {
    width: 390px;
    max-width: 100%;
    margin: 0 auto;
    outline: 1px solid #d0d7de;
  }
  .spec {
    padding: 10px 14px;
    font-size: 13px;
  }
  .spec summary {
    cursor: pointer;
  }
  table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  th,
  td {
    text-align: left;
    vertical-align: top;
    padding: 4px 6px;
    border-bottom: 1px solid #eaeef2;
  }
  td.value {
    display: flex;
    gap: 4px;
    min-width: 240px;
  }
  td.value input {
    flex: 1;
    min-width: 0;
  }
  .req {
    color: #cf222e;
  }
  .small {
    font-size: 12px;
    color: #57606a;
  }
  .empty {
    padding: 16px;
  }
</style>
