<script lang="ts">
  import '../app.css';
  import favicon from '$lib/assets/favicon.svg';
  import Toast from '$lib/components/ui/Toast.svelte';
  import Footer from '$lib/components/ui/Footer.svelte';
  import MobileNavigation from '$lib/components/ui/organisms/MobileNavigation.svelte';
  import { toastState } from '$lib/stores/toast.svelte';
  import { initUnitSystem } from '$lib/stores/ui.svelte';
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { afterNavigate } from '$app/navigation';
  import { browser } from '$app/environment';

  let { children } = $props();

  onMount(() => {
    initUnitSystem();
  });

  const isAdmin = $derived($page.url.pathname.startsWith('/admin'));
  const isRankings = $derived($page.url.pathname.startsWith('/rankings'));
  const isEmbed = $derived($page.url.pathname.startsWith('/embed'));

  // Track page views on client-side navigation
  afterNavigate(() => {
    if (browser && typeof gtag === 'function') {
      gtag('event', 'page_view', {
        page_path: $page.url.pathname,
        page_title: document.title,
      });
    }
  });
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <!-- Title, description, canonical, OG and Twitter tags come from <Seo> on each page. -->
</svelte:head>

{#if !isEmbed}
  <!-- Skip Link for Keyboard Navigation (WCAG 2.1 AA) -->
  <a
    href="#main-content"
    class="sr-only focus:not-sr-only focus:fixed focus:top-4 focus:left-4 focus:z-[200] focus:px-4 focus:py-2 focus:bg-primary focus:text-white focus:rounded-lg focus:shadow-lg focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 focus:ring-offset-bg-primary"
  >
    Skip to main content
  </a>
{/if}

<main id="main-content" tabindex="-1" class="outline-none">
  {@render children()}
</main>

{#if !isEmbed}
  <Footer />
{/if}

<!-- Mobile Navigation - shown on calculator page only (not rankings, admin, or embed) -->
{#if !isAdmin && !isRankings && !isEmbed}
  <div class="lg:hidden">
    <MobileNavigation />
  </div>
{/if}

{#if !isEmbed && browser}
  <div class="toast-container fixed top-4 right-4 z-[100] flex flex-col gap-2">
    {#each toastState.toasts as toast (toast.id)}
      <Toast message={toast.message} type={toast.type} />
    {/each}
  </div>
{/if}
