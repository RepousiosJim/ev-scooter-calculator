// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			requestId: string;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}

	/** Public site origin, injected at build time (see site-origin.config.js). */
	const __SITE_URL__: string;

	// Google Analytics gtag
	function gtag(...args: unknown[]): void;
	interface Window {
		dataLayer: unknown[];
	}
}

export {};
