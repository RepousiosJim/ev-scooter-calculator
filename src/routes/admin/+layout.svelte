<script lang="ts">
  import '../../app.css';
  import { page } from '$app/stores';
  import { presetMetadata } from '$lib/data/presets';

  let { data, children } = $props();

  const isLoginPage = $derived($page.url.pathname.startsWith('/admin/login'));

  const scootersByYear = $derived.by(() => {
    const grouped: Record<number, { key: string; name: string }[]> = {};
    for (const [key, meta] of Object.entries(presetMetadata)) {
      if (!grouped[meta.year]) grouped[meta.year] = [];
      grouped[meta.year].push({ key, name: meta.name });
    }
    return Object.entries(grouped)
      .sort(([a], [b]) => Number(b) - Number(a))
      .map(([year, scooters]) => ({
        year: Number(year),
        scooters: scooters.sort((a, b) => a.name.localeCompare(b.name)),
      }));
  });

  let sidebarOpen = $state(true);
</script>

<svelte:head>
  <title>Admin - EV Scooter Verification</title>
  <meta name="robots" content="noindex, nofollow" />
</svelte:head>

{#if isLoginPage}
  {@render children()}
{:else}
  <div class="h-screen bg-[#0a0a0f] flex overflow-hidden">
    <!-- Sidebar -->
    <aside
      class="w-64 bg-[#12121a] border-r border-gray-800 flex flex-col shrink-0 overflow-hidden transition-all duration-200"
      class:w-0={!sidebarOpen}
      class:border-r-0={!sidebarOpen}
    >
      <div class="p-4 border-b border-gray-800">
        <h2 class="text-lg font-bold text-white">Admin Panel</h2>
        <p class="text-xs text-gray-500 mt-0.5">Spec Verification</p>
      </div>

      <nav class="flex-1 overflow-y-auto p-3 space-y-1">
        <a
          href="/admin"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
					   {$page.url.pathname === '/admin'
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          <span class="text-base">&#9632;</span>
          Dashboard
        </a>
        <a
          href="/admin/pipeline"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
					   {$page.url.pathname === '/admin/pipeline'
            ? 'bg-cyan-500/10 text-cyan-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          <span class="text-base">&#9654;</span>
          Pipeline
        </a>
        <a
          href="/admin/discover"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
					   {$page.url.pathname === '/admin/discover'
            ? 'bg-green-500/10 text-green-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          <span class="text-base">&#9679;</span>
          Discover New
        </a>
        <a
          href="/admin/candidates"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
					   {$page.url.pathname === '/admin/candidates'
            ? 'bg-yellow-500/10 text-yellow-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          <span class="text-base">&#9733;</span>
          Candidates
        </a>
        <a
          href="/admin/alerts"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
					   {$page.url.pathname === '/admin/alerts'
            ? 'bg-red-500/10 text-red-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          <span class="text-base">&#9888;</span>
          Smart Alerts
          {#if data.alertCounts?.total > 0}
            <span
              class="ml-auto px-1.5 py-0.5 rounded-full text-[10px] font-bold
						{data.alertCounts.critical > 0 ? 'bg-red-500 text-white' : 'bg-yellow-500/20 text-yellow-400'}"
            >
              {data.alertCounts.total}
            </span>
          {/if}
        </a>
        <a
          href="/admin/logs"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
					   {$page.url.pathname === '/admin/logs'
            ? 'bg-purple-500/10 text-purple-400'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          <span class="text-base">&#9670;</span>
          Activity Log
        </a>
        <a
          href="/admin/settings"
          class="flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-colors
					   {$page.url.pathname === '/admin/settings'
            ? 'bg-gray-500/10 text-gray-300'
            : 'text-gray-400 hover:text-white hover:bg-white/5'}"
        >
          <span class="text-base">&#9881;</span>
          Settings
        </a>

        {#each scootersByYear as group (group.year)}
          <div class="mt-4 first:mt-0">
            <h3 class="px-3 py-1 text-xs font-semibold text-gray-500 uppercase tracking-wider">
              {group.year}
            </h3>
            {#each group.scooters as scooter (scooter.key)}
              <a
                href="/admin/{scooter.key}"
                class="flex items-center px-3 py-1.5 rounded-lg text-xs transition-colors
								   {$page.url.pathname === `/admin/${scooter.key}`
                  ? 'bg-cyan-500/10 text-cyan-400'
                  : 'text-gray-400 hover:text-white hover:bg-white/5'}"
              >
                {scooter.name}
              </a>
            {/each}
          </div>
        {/each}
      </nav>

      <div class="p-3 border-t border-gray-800">
        <div class="flex gap-2">
          <a
            href="/"
            class="flex-1 text-center px-3 py-2 text-xs text-gray-400 hover:text-white
						   bg-white/5 hover:bg-white/10 rounded-lg transition-colors"
          >
            Calculator
          </a>
          <form method="POST" action="/admin/logout">
            <button
              type="submit"
              class="px-3 py-2 text-xs text-red-400 hover:text-red-300
							   bg-red-500/5 hover:bg-red-500/10 rounded-lg transition-colors"
            >
              Logout
            </button>
          </form>
        </div>
      </div>
    </aside>

    <!-- Main Content -->
    <div class="flex-1 flex flex-col min-w-0">
      <header class="h-12 bg-[#12121a] border-b border-gray-800 flex items-center px-4 shrink-0 gap-3">
        <button
          onclick={() => (sidebarOpen = !sidebarOpen)}
          class="text-gray-400 hover:text-white text-lg shrink-0"
          aria-label="Toggle sidebar"
        >
          &#9776;
        </button>

        <!-- Breadcrumb -->
        <nav class="flex items-center gap-1.5 text-xs min-w-0" aria-label="Breadcrumb">
          <a href="/admin" class="text-gray-500 hover:text-gray-300 transition-colors shrink-0">Admin</a>
          {#if $page.url.pathname !== '/admin'}
            <span class="text-gray-700 shrink-0">/</span>
            {#if $page.url.pathname === '/admin/pipeline'}
              <span class="text-cyan-400 font-medium">Pipeline</span>
            {:else if $page.url.pathname === '/admin/discover'}
              <span class="text-green-400 font-medium">Discover New</span>
            {:else if $page.url.pathname === '/admin/candidates'}
              <span class="text-yellow-400 font-medium">Candidates</span>
            {:else if $page.url.pathname === '/admin/alerts'}
              <span class="text-red-400 font-medium">Smart Alerts</span>
            {:else if $page.url.pathname === '/admin/logs'}
              <span class="text-purple-400 font-medium">Activity Log</span>
            {:else if $page.url.pathname === '/admin/settings'}
              <span class="text-gray-300 font-medium">Settings</span>
            {:else}
              <span class="text-gray-300 font-medium truncate">
                {$page.url.pathname.replace('/admin/', '')}
              </span>
            {/if}
          {/if}
        </nav>

        <span class="ml-auto text-xs text-gray-600 shrink-0 hidden sm:block">Spec & Price Verification</span>
      </header>

      <main class="flex-1 overflow-y-auto p-6">
        {@render children()}
      </main>
    </div>
  </div>
{/if}
