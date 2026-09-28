<script lang="ts">
  import { onDestroy } from "svelte";
  import { browser } from "$app/environment";
  import { page } from "$app/state";

  let { data, children } = $props();

  // Components fetch their data from the action runner (an LLM call on a cache miss). Here every
  // same-origin POST carries X-Action-Cache-Only, so the server answers from the action cache
  // (stale entries included) or with a 409, unless live actions are switched on. Installed while
  // the layout is created, before any child renders a component.
  const LIVE_KEY = "debug-live-actions";
  let live = $state(false);

  if (browser) {
    try {
      live = sessionStorage.getItem(LIVE_KEY) === "1";
    } catch {
      /* storage unavailable */
    }
    const originalFetch = window.fetch;
    window.fetch = (input: RequestInfo | URL, init?: RequestInit) => {
      const request = new Request(input, init);
      const sameOrigin = new URL(request.url).origin === location.origin;
      if (live || !sameOrigin || request.method === "GET" || request.method === "HEAD") return originalFetch(request);
      const headers = new Headers(request.headers);
      headers.set("X-Action-Cache-Only", "1");
      return originalFetch(new Request(request, { headers }));
    };
    onDestroy(() => {
      window.fetch = originalFetch;
    });
  }

  function toggleLive(event: Event) {
    live = (event.currentTarget as HTMLInputElement).checked;
    try {
      sessionStorage.setItem(LIVE_KEY, live ? "1" : "0");
    } catch {
      /* storage unavailable */
    }
  }

  const tabs = [
    { href: "/__debug", label: "Components" },
    { href: "/__debug/pages", label: "Page log" },
    { href: "/__debug/settings", label: "Settings" }
  ];
  const current = $derived(tabs.findLast((t) => page.url.pathname.startsWith(t.href))?.href ?? "/__debug");
</script>

<div class="debug">
  <header>
    <strong>Debug room</strong>
    <span class="toolkit">toolkit: {data.toolkitId}</span>
    <nav>
      {#each tabs as tab}
        <a href={tab.href} aria-current={current === tab.href ? "page" : undefined}>{tab.label}</a>
      {/each}
    </nav>
    <label class="live" title="Off: components only get cached action responses, so no LLM calls are made.">
      <input type="checkbox" checked={live} onchange={toggleLive} />
      Live actions (LLM)
    </label>
  </header>
  {@render children()}
</div>

<style>
  .debug {
    font-family: system-ui, sans-serif;
    color: #1f2328;
    background: #f6f8fa;
    min-height: 100vh;
  }
  header {
    position: sticky;
    top: 0;
    z-index: 50;
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 8px 20px;
    padding: 10px 16px;
    background: #24292f;
    color: #fff;
    font-size: 14px;
  }
  .toolkit {
    color: #b7bdc4;
  }
  nav {
    display: flex;
    gap: 4px;
  }
  nav a {
    color: #d0d7de;
    text-decoration: none;
    padding: 4px 10px;
    border-radius: 6px;
  }
  nav a[aria-current="page"] {
    background: #fff;
    color: #24292f;
  }
  .live {
    margin-left: auto;
    display: flex;
    gap: 6px;
    align-items: center;
    cursor: pointer;
  }
</style>
