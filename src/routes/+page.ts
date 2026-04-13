// SSR enabled: the calculator shell (header, config panels, results skeleton) is
// rendered server-side so users see content immediately (LCP improvement).
// The calculator store hydrates on the client via onMount/loadConfigFromUrl.
// prerender=false is correct — content is dynamic (URL params, user config).
export const ssr = true;
export const prerender = false;
