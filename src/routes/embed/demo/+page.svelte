<script lang="ts">
  import { presetMetadata } from '$lib/data/presets';

  // Build a sorted list of preset keys for the example picker
  const presetEntries = Object.entries(presetMetadata).sort(
    ([, a], [, b]) => b.year - a.year || a.name.localeCompare(b.name)
  );

  let selectedKey = $state('nami_burn_e_2_max');

  const liveEmbedUrl = $derived(`/embed?scooter=${selectedKey}`);

  const iframeSnippet = $derived(
    `<iframe\n  src="https://evscooterpro.com/embed?scooter=${selectedKey}"\n  width="420"\n  height="220"\n  style="border:none;border-radius:14px;"\n  loading="lazy"\n  title="EV Scooter Performance Widget"\n></iframe>`
  );

  const customSnippet = `<iframe\n  src="https://evscooterpro.com/embed?scooter=custom&v=72&ah=40&motors=2&watts=2000&style=35&weight=80&wheel=11"\n  width="420"\n  height="220"\n  style="border:none;border-radius:14px;"\n  loading="lazy"\n  title="EV Scooter Performance Widget"\n></iframe>`;
</script>

<svelte:head>
  <title>Widget Embed Guide — EV Scooter Pro</title>
  <meta
    name="description"
    content="Embed the EV Scooter Pro performance widget on your website using a simple iframe."
  />
</svelte:head>

<div class="page-wrap">
  <!-- Nav bar -->
  <nav class="top-nav">
    <a href="/" class="nav-logo"> EV Scooter Pro </a>
    <div class="nav-links">
      <a href="/" class="nav-link">Calculator</a>
      <a href="/rankings" class="nav-link">Rankings</a>
    </div>
  </nav>

  <main class="content">
    <!-- Hero -->
    <div class="hero">
      <h1 class="hero-title">Embed the Widget</h1>
      <p class="hero-sub">
        Add a live EV scooter performance card to any website with a single
        <code>&lt;iframe&gt;</code> tag.
      </p>
    </div>

    <!-- Live preview section -->
    <section class="section">
      <h2 class="section-title">Live Preview</h2>
      <p class="section-desc">Select a scooter to see the widget and copy the embed code.</p>

      <div class="preview-layout">
        <!-- Selector + code -->
        <div class="preview-controls">
          <label class="input-label" for="scooter-select">Scooter preset</label>
          <select id="scooter-select" class="select-input" bind:value={selectedKey}>
            {#each presetEntries as [key, meta]}
              <option value={key}>{meta.name} ({meta.year})</option>
            {/each}
          </select>

          <label class="input-label mt" for="embed-code">Embed code</label>
          <textarea id="embed-code" class="code-block" readonly value={iframeSnippet} rows="6"></textarea>

          <button class="copy-btn" onclick={() => navigator.clipboard.writeText(iframeSnippet)}> Copy Code </button>
        </div>

        <!-- Live iframe preview -->
        <div class="preview-frame-wrap">
          <p class="preview-label">Live widget preview</p>
          <iframe
            src={liveEmbedUrl}
            width="420"
            height="220"
            style="border:none;border-radius:14px;width:100%;max-width:420px;"
            loading="lazy"
            title="EV Scooter Performance Widget Preview"
          ></iframe>
        </div>
      </div>
    </section>

    <!-- Custom config section -->
    <section class="section">
      <h2 class="section-title">Custom Configuration</h2>
      <p class="section-desc">
        Use <code>scooter=custom</code> to embed specs for any scooter by passing individual parameters.
      </p>

      <textarea class="code-block" readonly value={customSnippet} rows="7"></textarea>

      <button class="copy-btn" onclick={() => navigator.clipboard.writeText(customSnippet)}> Copy Code </button>
    </section>

    <!-- Parameter reference -->
    <section class="section">
      <h2 class="section-title">URL Parameters</h2>

      <div class="param-table-wrap">
        <table class="param-table">
          <thead>
            <tr>
              <th>Parameter</th>
              <th>Type</th>
              <th>Description</th>
              <th>Default</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td><code>scooter</code></td>
              <td>string</td>
              <td>Preset key (e.g. <code>nami_burn_e_2_max</code>) or <code>custom</code></td>
              <td>—</td>
            </tr>
            <tr>
              <td><code>v</code></td>
              <td>number</td>
              <td>Battery voltage (V) — used with <code>scooter=custom</code></td>
              <td>52</td>
            </tr>
            <tr>
              <td><code>ah</code></td>
              <td>number</td>
              <td>Battery capacity (Ah)</td>
              <td>16</td>
            </tr>
            <tr>
              <td><code>motors</code></td>
              <td>number</td>
              <td>Number of motors (1–4)</td>
              <td>1</td>
            </tr>
            <tr>
              <td><code>watts</code></td>
              <td>number</td>
              <td>Power per motor (W)</td>
              <td>500</td>
            </tr>
            <tr>
              <td><code>style</code></td>
              <td>number</td>
              <td>Riding style / consumption (Wh/km)</td>
              <td>30</td>
            </tr>
            <tr>
              <td><code>weight</code></td>
              <td>number</td>
              <td>Rider weight (kg)</td>
              <td>80</td>
            </tr>
            <tr>
              <td><code>wheel</code></td>
              <td>number</td>
              <td>Wheel size (inches)</td>
              <td>10</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Preset key list -->
    <section class="section">
      <h2 class="section-title">Available Preset Keys</h2>
      <p class="section-desc">
        Pass any of these as the <code>scooter</code> parameter.
      </p>
      <div class="preset-grid">
        {#each presetEntries as [key, meta]}
          <div class="preset-chip">
            <span class="preset-chip-name">{meta.name}</span>
            <code class="preset-chip-key">{key}</code>
          </div>
        {/each}
      </div>
    </section>
  </main>
</div>

<style>
  /* ── layout ── */
  .page-wrap {
    min-height: 100dvh;
    background: #080810;
    color: #e2e8f0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  /* ── nav ── */
  .top-nav {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 0 24px;
    height: 56px;
    border-bottom: 1px solid rgba(148, 163, 184, 0.1);
    background: #0a0a14;
    position: sticky;
    top: 0;
    z-index: 10;
  }

  .nav-logo {
    font-size: 15px;
    font-weight: 700;
    color: #22d3ee;
    text-decoration: none;
    letter-spacing: -0.01em;
  }

  .nav-links {
    display: flex;
    gap: 20px;
  }

  .nav-link {
    font-size: 13px;
    color: #94a3b8;
    text-decoration: none;
    transition: color 0.15s;
  }

  .nav-link:hover {
    color: #f1f5f9;
  }

  /* ── content ── */
  .content {
    max-width: 900px;
    margin: 0 auto;
    padding: 40px 24px 80px;
  }

  /* ── hero ── */
  .hero {
    margin-bottom: 48px;
  }

  .hero-title {
    font-size: 36px;
    font-weight: 800;
    color: #f1f5f9;
    letter-spacing: -0.03em;
    margin-bottom: 12px;
  }

  .hero-sub {
    font-size: 16px;
    color: #94a3b8;
    max-width: 560px;
    line-height: 1.6;
  }

  /* ── sections ── */
  .section {
    margin-bottom: 56px;
  }

  .section-title {
    font-size: 20px;
    font-weight: 700;
    color: #f1f5f9;
    margin-bottom: 8px;
    letter-spacing: -0.02em;
  }

  .section-desc {
    font-size: 14px;
    color: #64748b;
    margin-bottom: 20px;
    line-height: 1.6;
  }

  /* ── preview layout ── */
  .preview-layout {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 24px;
    align-items: start;
  }

  @media (max-width: 680px) {
    .preview-layout {
      grid-template-columns: 1fr;
    }
  }

  /* ── controls ── */
  .preview-controls {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .input-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .mt {
    margin-top: 12px;
  }

  .select-input {
    background: #12121e;
    border: 1px solid rgba(148, 163, 184, 0.15);
    border-radius: 8px;
    color: #e2e8f0;
    font-size: 13px;
    padding: 8px 10px;
    width: 100%;
    cursor: pointer;
    outline: none;
    transition: border-color 0.15s;
  }

  .select-input:focus {
    border-color: #22d3ee;
  }

  /* ── code block ── */
  .code-block {
    background: #0a0a14;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 10px;
    color: #a5f3fc;
    font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
    font-size: 12px;
    line-height: 1.6;
    padding: 12px 14px;
    resize: none;
    width: 100%;
    outline: none;
  }

  /* ── copy button ── */
  .copy-btn {
    align-self: flex-start;
    background: rgba(34, 211, 238, 0.1);
    border: 1px solid rgba(34, 211, 238, 0.25);
    border-radius: 8px;
    color: #22d3ee;
    cursor: pointer;
    font-size: 13px;
    font-weight: 600;
    padding: 8px 16px;
    transition:
      background 0.15s,
      border-color 0.15s;
  }

  .copy-btn:hover {
    background: rgba(34, 211, 238, 0.18);
    border-color: rgba(34, 211, 238, 0.4);
  }

  /* ── iframe preview ── */
  .preview-frame-wrap {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }

  .preview-label {
    font-size: 11px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  /* ── param table ── */
  .param-table-wrap {
    overflow-x: auto;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.1);
  }

  .param-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
  }

  .param-table th {
    background: #0f172a;
    color: #64748b;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    padding: 10px 14px;
    text-align: left;
  }

  .param-table td {
    padding: 10px 14px;
    color: #cbd5e1;
    border-top: 1px solid rgba(148, 163, 184, 0.07);
    vertical-align: top;
  }

  .param-table tbody tr:hover td {
    background: rgba(148, 163, 184, 0.03);
  }

  .param-table code {
    background: rgba(148, 163, 184, 0.1);
    border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
    font-size: 11px;
    padding: 1px 5px;
    color: #a5f3fc;
  }

  /* ── preset grid ── */
  .preset-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
    gap: 8px;
  }

  .preset-chip {
    background: #0f172a;
    border: 1px solid rgba(148, 163, 184, 0.1);
    border-radius: 8px;
    padding: 8px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .preset-chip-name {
    font-size: 12px;
    font-weight: 600;
    color: #e2e8f0;
  }

  .preset-chip-key {
    font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
    font-size: 10px;
    color: #64748b;
  }

  code {
    background: rgba(148, 163, 184, 0.1);
    border-radius: 4px;
    font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
    font-size: 0.9em;
    padding: 1px 5px;
    color: #a5f3fc;
  }
</style>
