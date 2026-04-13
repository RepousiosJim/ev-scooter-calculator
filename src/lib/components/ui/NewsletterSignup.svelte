<script lang="ts">
  import { onMount } from 'svelte';
  import { showToast } from '$lib/stores/calculator.svelte';
  import { getNewsletterState, setSubscribed, setDismissed } from '$lib/stores/newsletter.svelte';
  import { EMAIL_RE } from '$lib/utils/formatters';

  type NotificationPreference = 'price_alerts' | 'new_models' | 'guides';

  let {
    variant = 'inline',
    context = '',
  }: {
    variant?: 'inline' | 'banner';
    context?: string;
  } = $props();

  // Visibility state — initialised in onMount to avoid SSR mismatch
  let visible = $state(false);
  let subscribed = $state(false);

  // Form state
  let email = $state('');
  let loading = $state(false);
  let submitted = $state(false);
  let emailError = $state('');

  // Preferences
  type Pref = { id: NotificationPreference; label: string; checked: boolean };
  let prefs = $state<Pref[]>([
    { id: 'price_alerts', label: 'Price drops', checked: true },
    { id: 'new_models', label: 'New models', checked: true },
    { id: 'guides', label: 'Guides', checked: false },
  ]);

  onMount(() => {
    const state = getNewsletterState();
    if (state.subscribedAt) {
      subscribed = true;
      visible = false;
    } else if (state.dismissed) {
      visible = false;
    } else {
      visible = true;
    }
  });

  function dismiss() {
    setDismissed();
    visible = false;
  }

  function validateEmail(val: string): boolean {
    return EMAIL_RE.test(val.trim());
  }

  async function handleSubmit(e: SubmitEvent) {
    e.preventDefault();
    emailError = '';

    if (!validateEmail(email)) {
      emailError = 'Please enter a valid email address.';
      return;
    }

    loading = true;
    try {
      const selectedPrefs = prefs.filter((p) => p.checked).map((p) => p.id);
      const res = await fetch('/api/newsletter', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), preferences: selectedPrefs, context }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error((data as { message?: string }).message ?? `Error ${res.status}`);
      }

      setSubscribed(email.trim().toLowerCase());
      submitted = true;
      subscribed = true;
      showToast("You're subscribed! We'll keep you updated.", 'success');
    } catch (err) {
      showToast(err instanceof Error ? err.message : 'Something went wrong. Try again.', 'error');
    } finally {
      loading = false;
    }
  }
</script>

{#if visible && !subscribed}
  {#if variant === 'inline'}
    <!-- ───── Inline card variant ───── -->
    <div
      class="relative border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-bg-primary/0 overflow-hidden"
    >
      <!-- Dismiss button -->
      <button
        type="button"
        onclick={dismiss}
        class="absolute top-3 right-3 w-6 h-6 flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label="Dismiss newsletter signup"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-3.5 h-3.5"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div class="p-5 pr-10">
        <!-- Header -->
        <div class="flex items-center gap-2.5 mb-3">
          <div class="w-8 h-8 bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            <!-- Bell icon -->
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-4 h-4 text-primary"
            >
              <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
            </svg>
          </div>
          <div>
            <h3 class="text-sm font-bold text-text-primary tracking-tight">Stay Updated</h3>
            <p class="text-[11px] text-text-tertiary mt-0.5">
              Get notified about price drops, new models, and expert guides.
            </p>
          </div>
        </div>

        {#if submitted}
          <!-- Success state -->
          <div class="flex items-center gap-2 py-2">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-4 h-4 text-primary shrink-0"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span class="text-xs font-bold text-primary">Subscribed! Check your inbox.</span>
          </div>
        {:else}
          <form onsubmit={handleSubmit} novalidate>
            <!-- Email row -->
            <div class="flex gap-2 mb-2.5">
              <div class="flex-1 min-w-0">
                <input
                  type="email"
                  bind:value={email}
                  placeholder="your@email.com"
                  autocomplete="email"
                  disabled={loading}
                  aria-label="Email address"
                  aria-describedby={emailError ? 'nl-email-error' : undefined}
                  aria-invalid={!!emailError}
                  class="w-full px-3 py-2 text-xs bg-white/[0.04] border {emailError
                    ? 'border-rose-500/50'
                    : 'border-white/[0.08]'} text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none transition-colors disabled:opacity-50"
                />
                {#if emailError}
                  <p id="nl-email-error" class="text-[10px] text-rose-400 mt-1" role="alert">{emailError}</p>
                {/if}
              </div>
              <button
                type="submit"
                disabled={loading}
                class="px-3 py-2 text-[11px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-colors disabled:opacity-50 shrink-0"
              >
                {#if loading}
                  <span
                    class="inline-block w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin"
                    aria-hidden="true"
                  ></span>
                {:else}
                  Subscribe
                {/if}
              </button>
            </div>

            <!-- Preference checkboxes -->
            <div class="flex flex-wrap gap-x-4 gap-y-1">
              {#each prefs as pref}
                <label class="flex items-center gap-1.5 cursor-pointer group">
                  <input
                    type="checkbox"
                    bind:checked={pref.checked}
                    class="w-3 h-3 accent-primary cursor-pointer"
                    aria-label={pref.label}
                  />
                  <span class="text-[10px] text-text-tertiary group-hover:text-text-secondary transition-colors"
                    >{pref.label}</span
                  >
                </label>
              {/each}
            </div>
          </form>
        {/if}
      </div>
    </div>
  {:else}
    <!-- ───── Banner variant ───── -->
    <div
      class="relative border-y border-primary/15 bg-gradient-to-r from-primary/[0.05] via-primary/[0.03] to-transparent"
    >
      <button
        type="button"
        onclick={dismiss}
        class="absolute top-1/2 -translate-y-1/2 right-3 sm:right-4 w-7 h-7 flex items-center justify-center text-text-tertiary hover:text-text-secondary transition-colors"
        aria-label="Dismiss newsletter signup"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          stroke-width="2"
          stroke-linecap="round"
          stroke-linejoin="round"
          class="w-3.5 h-3.5"
        >
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      </button>

      <div class="max-w-7xl mx-auto px-3 sm:px-4 py-3 pr-12 flex flex-col sm:flex-row sm:items-center gap-3">
        <!-- Left text -->
        <div class="flex items-center gap-2.5 shrink-0">
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
          <div>
            <span class="text-xs font-bold text-text-primary">Stay Updated</span>
            <span class="hidden sm:inline text-[11px] text-text-tertiary ml-2">Price drops &amp; new models</span>
          </div>
        </div>

        {#if submitted}
          <div class="flex items-center gap-1.5">
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="2"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="w-3.5 h-3.5 text-primary"
            >
              <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
            </svg>
            <span class="text-xs font-bold text-primary">Subscribed!</span>
          </div>
        {:else}
          <form onsubmit={handleSubmit} novalidate class="flex items-center gap-2 flex-1 sm:max-w-sm">
            <input
              type="email"
              bind:value={email}
              placeholder="your@email.com"
              autocomplete="email"
              disabled={loading}
              aria-label="Email address"
              class="flex-1 min-w-0 px-3 py-1.5 text-xs bg-white/[0.04] border border-white/[0.08] text-text-primary placeholder:text-text-tertiary focus:border-primary/50 focus:outline-none transition-colors disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={loading}
              class="px-3 py-1.5 text-[11px] font-bold uppercase tracking-wider bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25 transition-colors disabled:opacity-50 shrink-0"
            >
              {#if loading}
                <span
                  class="inline-block w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin"
                  aria-hidden="true"
                ></span>
              {:else}
                Subscribe
              {/if}
            </button>
          </form>
        {/if}
      </div>
    </div>
  {/if}
{/if}
