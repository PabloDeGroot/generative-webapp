<script lang="ts">
  import { browser } from "$app/environment";
  import { trackPageView } from "$lib/analytics";
  import "../lib/firebase"; // Initialize Firebase
  import "../app.css";
  // Track page views when route changes
  const { children, data } = $props();
  import { page } from "$app/state";
  import { onMount } from "svelte";
  import TextContent from "../Components/TextContent.svelte";
  import GoogleLogin from "../Components/GoogleLogin.svelte";
  import ThreeCanvas from "../Components/ThreeCanvas.svelte";
  import FeedbackFAB from "../Components/FeedbackFAB.svelte";
  let token = data.token;

  // Behind the auth gate the server decides what to render from the session cookie, so
  // reload once GoogleLogin has set (or cleared) it.
  onMount(() => {
    if (!data.authGate) return;
    const onSessionChange = (event: Event) => {
      const signedIn = (event as CustomEvent<{ signedIn: boolean }>).detail?.signedIn;
      if (signedIn === data.authRequired) location.reload();
    };
    window.addEventListener("session-auth-synced", onSessionChange);
    return () => window.removeEventListener("session-auth-synced", onSessionChange);
  });
  import "@twind/with-web-components";

  /*
  onMount(() => {
    if (browser && TextContent.element && !customElements.get("text-content")) {
      customElements.define("text-content", TextContent.element);
    }
  }); */
  $effect(() => {
    if (browser) {
      window.addEventListener("error", (event) => {
        console.error("Custom element error:", event.error);
      });
      if (page.url) {
        trackPageView(page.url.pathname, page.url.href);
      }
    }
  });
</script>

<div class="app">
  {#if data.authRequired}
    <main>
      <div class="p-4 w-full max-w-md mx-auto mt-24 text-center">
        <h1 class="text-2xl font-bold mb-4">Sign in to continue</h1>
        <p class="text-gray-700 mb-6">This site is only available to signed-in users.</p>
        <google-login></google-login>
      </div>
    </main>
  {:else if token}
    {@render children()}
    <google-login></google-login>
    <feedback-fab></feedback-fab>
  {:else}
    <main>
      <div class="p-4 w-full max-w-2xl mx-auto">
        <h1 class="text-2xl font-bold mb-4">Checking your browser...</h1>
        <p class="text-gray-700">Please wait while we verify your browser.</p>
        <p class="text-gray-500 mt-2">
          If this takes too long, please try refreshing the page.
        </p>
      </div>
    </main>
  {/if}
</div>

<style>
  .app {
    display: flex;
    flex-direction: column;
    min-height: 100vh;
  }
</style>
