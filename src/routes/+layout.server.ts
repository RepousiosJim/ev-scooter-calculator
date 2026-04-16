// Cache-Control headers for all HTML responses are set at the CDN layer in
// vercel.json (single source of truth). Admin routes get `private, no-store`
// via the /admin/:path* rule; everything else gets the public cache rule.
//
// Setting Cache-Control via setHeaders here previously caused "header already
// set" warnings on prerendered routes, where the header is captured at build
// time and re-setting it during a request triggers SvelteKit's guard.
export {};
