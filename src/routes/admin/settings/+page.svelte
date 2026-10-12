<script lang="ts">
  let { data } = $props();
  const s = $derived(data.status);

  const rows = $derived([
    {
      label: 'Database (Supabase)',
      ok: s.supabase,
      detail: s.supabase
        ? 'Connected. Verification data, alerts and rate limits are stored here.'
        : 'Not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (the secret key).',
    },
    {
      label: 'Gemini API',
      ok: s.gemini,
      detail: s.gemini
        ? 'Configured. Scraping and discovery use AI extraction.'
        : 'Not configured. Scraping falls back to pattern matching. Set GEMINI_API_KEY to enable AI extraction.',
    },
    {
      label: 'Cron secret',
      ok: s.cronSecret,
      detail: s.cronSecret
        ? 'Configured. The daily cleanup job is authenticated.'
        : 'Not configured. Set CRON_SECRET or the daily cleanup job is rejected.',
    },
    {
      label: 'Catalog edits from the admin panel',
      ok: s.canWritePresets,
      detail: s.canWritePresets
        ? 'Available (local development): approved candidates are written into presets.ts.'
        : 'Not available on Vercel: approved candidates go live after they are added to presets.ts and the site is redeployed.',
    },
  ]);
</script>

<div class="space-y-6 max-w-2xl">
  <div>
    <h1 class="text-xl font-bold text-white">Settings</h1>
    <p class="text-sm text-gray-400 mt-0.5">
      Configuration status. Values are set as environment variables in Vercel (Project → Settings → Environment
      Variables), then take effect on the next deploy.
    </p>
  </div>

  <div class="bg-[#12121a] border border-gray-800 rounded-xl divide-y divide-gray-800">
    {#each rows as row (row.label)}
      <div class="p-4 flex items-start gap-3">
        <span
          class="mt-0.5 shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded {row.ok
            ? 'bg-green-500/10 text-green-400'
            : 'bg-yellow-500/10 text-yellow-400'}"
        >
          {row.ok ? 'OK' : 'Off'}
        </span>
        <div>
          <div class="text-sm font-medium text-white">{row.label}</div>
          <div class="text-xs text-gray-400 mt-0.5">{row.detail}</div>
        </div>
      </div>
    {/each}
  </div>

  <div class="bg-[#12121a] border border-gray-800 rounded-xl p-4 text-sm text-gray-300 space-y-1">
    <div>Catalog: {s.catalogCount} scooters (version {s.catalogVersion}, updated {s.catalogUpdated})</div>
    <div>Scrapable: {s.scrapableScooters} scooters with {s.sourceUrls} known source URLs</div>
  </div>
</div>
