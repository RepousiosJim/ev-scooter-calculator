<script lang="ts">
  import { onMount } from 'svelte';
  import { showToast } from '$lib/stores/calculator.svelte';
  import { getNewsletterState, setSubscribed, clearSubscription } from '$lib/stores/newsletter.svelte';
  import { EMAIL_RE } from '$lib/utils/formatters';

  // Page state — hydrated on mount to avoid SSR mismatch
  let mounted = $state(false);
  let subscribed = $state(false);
  let subscribedEmail = $state<string | null>(null);
  let subscribedAt = $state<string | null>(null);

  // Form
  let email = $state('');
  let emailError = $state('');
  let loading = $state(false);

  // Preferences
  type PrefId = 'price_alerts' | 'new_models' | 'guides';
  interface Pref {
    id: PrefId;
    label: string;
    description: string;
    checked: boolean;
  }

  let prefs = $state<Pref[]>([
    { id: 'price_alerts', label: 'Price Alerts', description: 'Get notified when scooter prices drop.', checked: true },
    { id: 'new_models', label: 'New Models', description: 'Stay updated when new scooters are added.', checked: true },
    {
      id: 'guides',
      label: 'Expert Guides',
      description: 'Receive in-depth guides on upgrading & buying.',
      checked: false,
    },
  ]);

  onMount(() => {
    const state = getNewsletterState();
    subscribed = !!state.subscribedAt;
    subscribedEmail = state.email;
    subscribedAt = state.subscribedAt;
    if (state.email) email = state.email;
    mounted = true;
  });

  async function handleSubscribe(e: SubmitEvent) {
    e.preventDefault();
    emailError = '';

    if (!EMAIL_RE.test(email.trim())) {
      emailError = 'Please enter a valid email address.';
      return;
    }

    loading = true;
    try {
      const selectedPrefs = prefs.filter((p) => p.checked).map((p) => p.id);
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), preferences: selectedPrefs }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? `Error ${res.status}`);
      }

      setSubscribed(email.trim().toLowerCase());
      subscribed = true;
      subscribedEmail = email.trim().toLowerCase();
      subscribedAt = new Date().toISOString();
      showToast("You're subscribed! We'll keep you updated.", 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong. Try again.', 'error');
    } finally {
      loading = false;
    }
  }

  async function handleUpdatePrefs(e: SubmitEvent) {
    e.preventDefault();
    if (!subscribedEmail) return;

    loading = true;
    try {
      const selectedPrefs = prefs.filter((p) => p.checked).map((p) => p.id);
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribedEmail, preferences: selectedPrefs }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? `Error ${res.status}`);
      }

      showToast('Preferences updated.', 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong. Try again.', 'error');
    } finally {
      loading = false;
    }
  }

  async function handleUnsubscribe() {
    if (!subscribedEmail) return;
    if (!confirm('Unsubscribe from all notifications?')) return;

    loading = true;
    try {
      const res = await fetch('/api/newsletter', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: subscribedEmail }),
      });

      if (!res.ok && res.status !== 404) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? `Error ${res.status}`);
      }

      clearSubscription();
      subscribed = false;
      subscribedEmail = null;
      subscribedAt = null;
      email = '';
      showToast('You have been unsubscribed.', 'info');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong. Try again.', 'error');
    } finally {
      loading = false;
    }
  }

  function formatDate(iso: string | null): string {
    if (!iso) return '';
    try {
      return new Date(iso).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
    } catch {
      return iso;
    }
  }
</script>

<svelte:head>
  <title>Notification Preferences — EV Scooter Pro Calculator</title>
  <meta
    name="description"
    content="Manage your newsletter and notification preferences for the EV Scooter Pro Calculator."
  />
</svelte:head>

<div class="min-h-screen bg-bg-primary">
  <!-- Header -->
  <header class="border-b border-white/[0.06] bg-bg-primary/80 backdrop-blur-xl">
    <div class="max-w-xl mx-auto px-4 sm:px-6">
      <div class="h-14 flex items-center justify-between">
        <a
          href="/rankings"
          class="flex items-center gap-2 text-text-tertiary hover:text-text-primary transition-colors text-xs font-bold uppercase tracking-[0.12em]"
        >
          &larr; Back
        </a>
        <span class="text-xs font-black text-text-tertiary tracking-tight">EV Scooter Pro</span>
      </div>
    </div>
  </header>

  <div class="max-w-xl mx-auto px-4 sm:px-6 pt-8 pb-16 space-y-6">
    <!-- Page title -->
    <div>
      <h1 class="text-xl font-black text-text-primary tracking-tight">Notification Preferences</h1>
      <p class="text-xs text-text-tertiary mt-1">Manage how we keep you updated about EV scooters.</p>
    </div>

    {#if !mounted}
      <!-- Loading skeleton -->
      <div class="border border-white/[0.06] p-6 space-y-4">
        <div class="h-4 w-32 bg-white/[0.06] animate-pulse"></div>
        <div class="h-10 w-full bg-white/[0.04] animate-pulse"></div>
      </div>
    {:else if subscribed && subscribedEmail}
      <!-- ──── Subscribed State ──── -->
      <div class="border border-primary/20 bg-primary/[0.04] p-5 space-y-1">
        <div class="flex items-center gap-2">
          <!-- Bell icon -->
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-4 h-4 text-primary shrink-0"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span class="text-xs font-bold text-primary uppercase tracking-wider">Subscribed</span>
        </div>
        <p class="text-sm font-bold text-text-primary">{subscribedEmail}</p>
        {#if subscribedAt}
          <p class="text-[10px] text-text-tertiary">Since {formatDate(subscribedAt)}</p>
        {/if}
      </div>

      <!-- Preferences -->
      <form onsubmit={handleUpdatePrefs} class="border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
        <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary">What to send me</h2>

        <fieldset class="space-y-4" aria-label="Notification preferences">
          {#each prefs as pref (pref.id)}
            <label class="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                bind:checked={pref.checked}
                class="mt-0.5 w-4 h-4 accent-primary cursor-pointer shrink-0"
              />
              <div>
                <div class="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  {pref.label}
                </div>
                <div class="text-[11px] text-text-tertiary mt-0.5">{pref.description}</div>
              </div>
            </label>
          {/each}
        </fieldset>

        <div class="flex items-center gap-3 pt-2 border-t border-white/[0.06]">
          <button
            type="submit"
            disabled={loading}
            class="px-4 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-colors disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      <!-- Danger zone -->
      <div class="border border-rose-500/15 p-5 space-y-3">
        <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary">Unsubscribe</h2>
        <p class="text-xs text-text-tertiary">
          Remove your email from all notifications. You can re-subscribe at any time.
        </p>
        <button
          type="button"
          onclick={handleUnsubscribe}
          disabled={loading}
          class="px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-rose-400 border border-rose-500/20 hover:bg-rose-500/10 transition-colors disabled:opacity-50"
        >
          Unsubscribe
        </button>
      </div>
    {:else}
      <!-- ──── Not subscribed State ──── -->
      <div class="border border-white/[0.06] bg-white/[0.02] p-5 space-y-1">
        <div class="flex items-center gap-2">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="w-4 h-4 text-text-tertiary shrink-0"
          >
            <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
          </svg>
          <span class="text-xs font-bold text-text-tertiary uppercase tracking-wider">Not Subscribed</span>
        </div>
        <p class="text-[11px] text-text-tertiary mt-1">Sign up below to receive updates.</p>
      </div>

      <!-- Subscribe form -->
      <form onsubmit={handleSubscribe} novalidate class="border border-white/[0.06] bg-white/[0.02] p-5 space-y-5">
        <h2 class="text-xs font-bold uppercase tracking-wider text-text-secondary">Stay Updated</h2>
        <p class="text-xs text-text-tertiary">Get notified about price drops, new scooter models, and expert guides.</p>

        <div class="space-y-1.5">
          <label for="notif-email" class="text-[11px] font-bold uppercase tracking-wider text-text-tertiary"
            >Email address</label
          >
          <input
            id="notif-email"
            type="email"
            bind:value={email}
            placeholder="your@email.com"
            autocomplete="email"
            disabled={loading}
            aria-describedby={emailError ? 'notif-email-error' : undefined}
            aria-invalid={!!emailError}
            class="w-full px-3 py-2.5 text-sm bg-white/[0.04] border {emailError
              ? 'border-rose-500/50'
              : 'border-white/[0.08]'} text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none transition-colors disabled:opacity-50"
          />
          {#if emailError}
            <p id="notif-email-error" class="text-[11px] text-rose-400" role="alert">{emailError}</p>
          {/if}
        </div>

        <fieldset class="space-y-4" aria-label="Notification preferences">
          <legend class="text-[11px] font-bold uppercase tracking-wider text-text-tertiary">What to send me</legend>
          {#each prefs as pref (pref.id)}
            <label class="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                bind:checked={pref.checked}
                class="mt-0.5 w-4 h-4 accent-primary cursor-pointer shrink-0"
              />
              <div>
                <div class="text-sm font-bold text-text-primary group-hover:text-primary transition-colors">
                  {pref.label}
                </div>
                <div class="text-[11px] text-text-tertiary mt-0.5">{pref.description}</div>
              </div>
            </label>
          {/each}
        </fieldset>

        <div class="pt-2 border-t border-white/[0.06]">
          <button
            type="submit"
            disabled={loading}
            class="px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-colors disabled:opacity-50"
          >
            {#if loading}
              <span
                class="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin mr-2"
                aria-hidden="true"
              ></span>
            {/if}
            Subscribe
          </button>
        </div>
      </form>
    {/if}

    <!-- Footer links -->
    <div class="pt-4 border-t border-white/[0.04] flex flex-wrap gap-x-4 gap-y-1">
      <a href="/" class="text-[11px] text-text-tertiary hover:text-primary transition-colors">Calculator</a>
      <a href="/rankings" class="text-[11px] text-text-tertiary hover:text-primary transition-colors">Rankings</a>
    </div>
  </div>
</div>
