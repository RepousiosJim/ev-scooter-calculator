<script lang="ts">
  import { page } from '$app/stores';
  import { presets, presetMetadata } from '$lib/data/presets';
  import { calculatePerformance } from '$lib/physics';
  import { computeScore, getGradeInfo } from '$lib/utils/scoring';
  import type { ScooterConfig, PresetMetadata } from '$lib/types';

  // ----- Parse query params -----
  const params = $derived($page.url.searchParams);
  const scooterKey = $derived(params.get('scooter') ?? '');

  const DEFAULT_CONFIG: Partial<ScooterConfig> = {
    charger: 3,
    regen: 0.08,
    cost: 0.2,
    slope: 0,
    ridePosition: 0.6,
    dragCoefficient: 0.7,
    frontalArea: 0.5,
    rollingResistance: 0.015,
    soh: 1,
    ambientTemp: 20,
    drivetrainEfficiency: 0.9,
    batterySagPercent: 0.08,
  };

  interface ResolvedWidget {
    config: ScooterConfig;
    name: string;
    year: number | null;
    isCustom: boolean;
    isInvalid: boolean;
  }

  const resolved = $derived.by((): ResolvedWidget => {
    if (!scooterKey) {
      return {
        config: presets['custom'] as ScooterConfig,
        name: 'Custom Configuration',
        year: null,
        isCustom: true,
        isInvalid: false,
      };
    }

    if (scooterKey === 'custom') {
      const v = Number(params.get('v')) || 52;
      const ah = Number(params.get('ah')) || 16;
      const motors = Number(params.get('motors')) || 1;
      const watts = Number(params.get('watts')) || 500;
      const style = Number(params.get('style')) || 30;
      const weight = Number(params.get('weight')) || 80;
      const wheel = Number(params.get('wheel')) || 10;

      const config: ScooterConfig = {
        ...DEFAULT_CONFIG,
        v,
        ah,
        motors,
        watts,
        style,
        weight,
        wheel,
      } as ScooterConfig;

      return { config, name: 'Custom Configuration', year: null, isCustom: true, isInvalid: false };
    }

    if (scooterKey in presets && scooterKey !== 'custom') {
      const config = presets[scooterKey] as ScooterConfig;
      const meta: PresetMetadata | undefined = presetMetadata[scooterKey];
      return {
        config,
        name: meta?.name ?? scooterKey,
        year: meta?.year ?? null,
        isCustom: false,
        isInvalid: false,
      };
    }

    // Unknown key
    return { config: presets['custom'] as ScooterConfig, name: '', year: null, isCustom: false, isInvalid: true };
  });

  const stats = $derived.by(() => {
    if (resolved.isInvalid) return null;
    return calculatePerformance(resolved.config, 'spec');
  });

  const scoreInfo = $derived.by(() => {
    if (!stats || resolved.isInvalid) return null;
    const score = computeScore(resolved.config, stats);
    const info = getGradeInfo(score);
    return { score, ...info };
  });

  // Formatting helpers
  function fmt(val: number, decimals = 1): string {
    return val.toFixed(decimals);
  }
</script>

<svelte:head>
  <title>EV Scooter Widget</title>
  <meta name="robots" content="noindex" />
</svelte:head>

<!-- Widget root — dark card, no background page chrome -->
<div class="widget-root">
  {#if resolved.isInvalid}
    <!-- Error state -->
    <div class="widget-card widget-error">
      <p class="error-title">Unknown scooter</p>
      <p class="error-sub">Key <code>{scooterKey}</code> not found.</p>
    </div>
  {:else if stats && scoreInfo}
    <div class="widget-card">
      <!-- Header: name + grade badge -->
      <div class="widget-header">
        <div class="widget-name-block">
          <span class="widget-name">{resolved.name}</span>
          {#if resolved.year}
            <span class="widget-year">{resolved.year}</span>
          {/if}
        </div>

        <div class="grade-badge" style="--grade-color: {scoreInfo.color}">
          <span class="grade-letter">{scoreInfo.grade}</span>
          <span class="grade-label">{scoreInfo.label}</span>
        </div>
      </div>

      <!-- Score bar -->
      <div class="score-bar-wrap">
        <div class="score-bar-track">
          <div class="score-bar-fill" style="width: {scoreInfo.score}%; background-color: {scoreInfo.color};"></div>
        </div>
        <span class="score-num" style="color: {scoreInfo.color}">
          {fmt(scoreInfo.score, 0)}/100
        </span>
      </div>

      <!-- 2×2 stat grid -->
      <div class="stat-grid">
        <div class="stat-cell">
          <span class="stat-label">Range</span>
          <span class="stat-value">{fmt(stats.totalRange, 0)} <span class="stat-unit">km</span></span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">Top Speed</span>
          <span class="stat-value">{fmt(stats.speed, 0)} <span class="stat-unit">km/h</span></span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">Peak Power</span>
          <span class="stat-value">{fmt(stats.totalWatts / 1000, 1)} <span class="stat-unit">kW</span></span>
        </div>
        <div class="stat-cell">
          <span class="stat-label">Score</span>
          <span class="stat-value" style="color: {scoreInfo.color}">
            {fmt(scoreInfo.score, 1)}
          </span>
        </div>
      </div>

      <!-- Footer link -->
      <div class="widget-footer">
        <a href="https://evscooterpro.com" target="_blank" rel="noopener noreferrer" class="powered-by">
          Powered by <strong>EV Scooter Pro</strong>
        </a>
      </div>
    </div>
  {/if}
</div>

<style>
  /* Reset & root */
  :global(*, *::before, *::after) {
    box-sizing: border-box;
    margin: 0;
    padding: 0;
  }

  :global(body) {
    background: transparent;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  }

  .widget-root {
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: 8px;
    min-height: 100dvh;
    background: transparent;
  }

  /* Card */
  .widget-card {
    background: #0f172a;
    border: 1px solid rgba(148, 163, 184, 0.12);
    border-radius: 14px;
    width: 100%;
    max-width: 400px;
    padding: 16px;
    color: #e2e8f0;
    box-shadow: 0 4px 24px rgba(0, 0, 0, 0.5);
  }

  /* Error card */
  .widget-error {
    text-align: center;
    padding: 24px 16px;
  }

  .error-title {
    font-size: 15px;
    font-weight: 600;
    color: #f87171;
    margin-bottom: 6px;
  }

  .error-sub {
    font-size: 13px;
    color: #94a3b8;
  }

  .error-sub code {
    background: rgba(148, 163, 184, 0.12);
    padding: 1px 4px;
    border-radius: 4px;
    font-family: monospace;
  }

  /* Header */
  .widget-header {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    margin-bottom: 12px;
  }

  .widget-name-block {
    display: flex;
    flex-direction: column;
    gap: 2px;
    min-width: 0;
  }

  .widget-name {
    font-size: 15px;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1.2;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    max-width: 220px;
  }

  .widget-year {
    font-size: 11px;
    color: #64748b;
    font-weight: 500;
  }

  /* Grade badge */
  .grade-badge {
    display: flex;
    flex-direction: column;
    align-items: center;
    background: color-mix(in srgb, var(--grade-color) 15%, transparent);
    border: 1px solid color-mix(in srgb, var(--grade-color) 35%, transparent);
    border-radius: 10px;
    padding: 6px 12px;
    flex-shrink: 0;
  }

  .grade-letter {
    font-size: 22px;
    font-weight: 800;
    color: var(--grade-color);
    line-height: 1;
  }

  .grade-label {
    font-size: 9px;
    font-weight: 700;
    color: var(--grade-color);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    opacity: 0.85;
    margin-top: 2px;
  }

  /* Score bar */
  .score-bar-wrap {
    display: flex;
    align-items: center;
    gap: 10px;
    margin-bottom: 14px;
  }

  .score-bar-track {
    flex: 1;
    height: 6px;
    background: rgba(148, 163, 184, 0.1);
    border-radius: 99px;
    overflow: hidden;
  }

  .score-bar-fill {
    height: 100%;
    border-radius: 99px;
    transition: width 0.4s ease;
  }

  .score-num {
    font-size: 12px;
    font-weight: 700;
    white-space: nowrap;
    flex-shrink: 0;
  }

  /* Stat grid */
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
    margin-bottom: 14px;
  }

  .stat-cell {
    background: rgba(148, 163, 184, 0.05);
    border: 1px solid rgba(148, 163, 184, 0.08);
    border-radius: 10px;
    padding: 10px 12px;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .stat-label {
    font-size: 10px;
    font-weight: 600;
    color: #64748b;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }

  .stat-value {
    font-size: 20px;
    font-weight: 700;
    color: #f1f5f9;
    line-height: 1;
  }

  .stat-unit {
    font-size: 12px;
    font-weight: 500;
    color: #94a3b8;
  }

  /* Footer */
  .widget-footer {
    border-top: 1px solid rgba(148, 163, 184, 0.08);
    padding-top: 10px;
    text-align: center;
  }

  .powered-by {
    font-size: 11px;
    color: #475569;
    text-decoration: none;
    transition: color 0.15s;
  }

  .powered-by:hover {
    color: #94a3b8;
  }

  .powered-by strong {
    color: #22d3ee;
    font-weight: 600;
  }
</style>
