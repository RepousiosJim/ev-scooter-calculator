<script lang="ts">
  import { page } from '$app/state';
  import { SITE_URL, siteUrl } from '$lib/config/site';

  /**
   * The single source of a page's <title>, description, canonical, Open Graph and
   * Twitter tags. Render it exactly once per page (error pages included), at the
   * top level of the page — not inside the page's own <svelte:head>: a nested
   * head breaks hydration ("Illegal invocation") and the page never becomes
   * interactive. The root layout and app.html deliberately emit none of these,
   * so no page ends up with duplicate or conflicting tags.
   */
  interface Props {
    title: string;
    description?: string;
    /** Site path for canonical/og:url; defaults to the current path. */
    path?: string;
    /** Absolute or site-relative image URL; defaults to the generic OG card. */
    image?: string;
    type?: 'website' | 'article' | 'product';
    /** Social titles/descriptions when they should differ from the page's. */
    socialTitle?: string;
    socialDescription?: string;
    /** Error, utility and embed pages: noindex and no canonical. */
    noindex?: boolean;
  }

  let {
    title,
    description,
    path,
    image = '/api/og',
    type = 'website',
    socialTitle,
    socialDescription,
    noindex = false,
  }: Props = $props();

  const url = $derived(siteUrl(path ?? page.url.pathname));
  const imageUrl = $derived(image.startsWith('http') ? image : SITE_URL + image);
  const ogTitle = $derived(socialTitle ?? title);
  const ogDescription = $derived(socialDescription ?? description);
</script>

<svelte:head>
  <title>{title}</title>
  {#if description}
    <meta name="description" content={description} />
  {/if}
  {#if noindex}
    <meta name="robots" content="noindex" />
  {:else}
    <link rel="canonical" href={url} />
  {/if}

  <meta property="og:type" content={type} />
  <meta property="og:site_name" content="EV Scooter Pro" />
  <meta property="og:title" content={ogTitle} />
  {#if ogDescription}
    <meta property="og:description" content={ogDescription} />
  {/if}
  <meta property="og:url" content={url} />
  <meta property="og:image" content={imageUrl} />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />

  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content={ogTitle} />
  {#if ogDescription}
    <meta name="twitter:description" content={ogDescription} />
  {/if}
  <meta name="twitter:image" content={imageUrl} />
</svelte:head>
