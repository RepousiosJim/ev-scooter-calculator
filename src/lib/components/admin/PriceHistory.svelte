<script lang="ts">
  import type { PriceObservation } from '$lib/server/verification/types';

  let {
    priceHistory,
    scooterKey,
    onupdated,
  }: {
    priceHistory: PriceObservation[];
    scooterKey: string;
    onupdated: () => void;
  } = $props();

  let showForm = $state(false);
  let price = $state('');
  let source = $state('');
  let url = $state('');
  let inStock = $state(true);
  let saving = $state(false);

  async function addPrice() {
    if (!price || !source) return;

    saving = true;
    try {
      const res = await fetch('/api/admin/price', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scooterKey,
          observation: {
            price: parseFloat(price),
            currency: 'USD',
            source,
            url: url || undefined,
            inStock,
          },
        }),
      });

      if (res.ok) {
        showForm = false;
        price = '';
        source = '';
        url = '';
        onupdated();
      }
    } finally {
      saving = false;
    }
  }

  function formatDate(iso: string): string {
    return new Date(iso).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  }
</script>

<div class="bg-[#12121a] border border-gray-800 rounded-xl overflow-hidden">
  <div class="px-4 py-3 border-b border-gray-800 flex items-center justify-between">
    <h3 class="text-sm font-semibold text-white">Price History</h3>
    <button onclick={() => (showForm = !showForm)} class="text-xs text-cyan-400 hover:text-cyan-300 transition-colors">
      {showForm ? 'Cancel' : '+ Add Price'}
    </button>
  </div>

  {#if showForm}
    <div class="p-4 border-b border-gray-800 space-y-3">
      <div class="grid grid-cols-2 gap-3">
        <div>
          <label for="price-value" class="block text-xs text-gray-400 mb-1">Price (USD)</label>
          <input
            id="price-value"
            type="number"
            step="0.01"
            bind:value={price}
            placeholder="0.00"
            class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
							   focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
        <div>
          <label for="price-source" class="block text-xs text-gray-400 mb-1">Source</label>
          <input
            id="price-source"
            type="text"
            bind:value={source}
            placeholder="e.g., Amazon"
            class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
							   focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
          />
        </div>
      </div>
      <div>
        <label for="price-url" class="block text-xs text-gray-400 mb-1">URL (optional)</label>
        <input
          id="price-url"
          type="url"
          bind:value={url}
          placeholder="https://..."
          class="w-full px-3 py-2 bg-[#0a0a0f] border border-gray-700 rounded-lg text-white text-sm
						   focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
        />
      </div>
      <div class="flex items-center justify-between">
        <label class="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" bind:checked={inStock} class="rounded" />
          In Stock
        </label>
        <button
          onclick={addPrice}
          disabled={saving || !price || !source}
          class="px-4 py-1.5 text-xs text-white bg-cyan-600 hover:bg-cyan-500
						   disabled:bg-cyan-800 disabled:cursor-not-allowed rounded-lg transition-colors"
        >
          {saving ? 'Saving...' : 'Add'}
        </button>
      </div>
    </div>
  {/if}

  {#if priceHistory.length === 0}
    <div class="p-6 text-center text-gray-600 text-sm">No price observations recorded yet.</div>
  {:else}
    <div class="divide-y divide-gray-800/50">
      {#each priceHistory as obs, i (i)}
        <div class="px-4 py-3 flex items-center justify-between">
          <div>
            <span class="text-white font-medium text-sm">
              ${obs.price.toLocaleString()}
            </span>
            <span class="text-gray-500 text-xs ml-2">{obs.source}</span>
            {#if obs.inStock === false}
              <span class="ml-2 text-xs text-red-400">Out of stock</span>
            {/if}
          </div>
          <div class="flex items-center gap-3">
            {#if obs.url}
              <a
                href={obs.url}
                target="_blank"
                rel="noopener noreferrer"
                class="text-xs text-cyan-400 hover:text-cyan-300"
              >
                Link
              </a>
            {/if}
            <span class="text-xs text-gray-500">{formatDate(obs.observedAt)}</span>
          </div>
        </div>
      {/each}
    </div>
  {/if}
</div>
