/**
 * Analytics - Lean tracking utilities for session, funnel, behavior, vitals, and A/B tests.
 */

declare global {
	interface Window {
		gtag?: (...args: unknown[]) => void;
	}
}

// Web Vitals API shapes — use local types to avoid conflicts with lib.dom
// TypeScript's built-in definitions vary by version; cast via PerformanceEntry.
interface LCPEntry extends PerformanceEntry {
	element?: Element | null;
}

interface LayoutShiftEntry extends PerformanceEntry {
	value: number;
	hadRecentInput: boolean;
}

interface EventTimingEntry extends PerformanceEntry {
	processingEnd: number;
	name: string;
}

export type EventType =
	| 'page_view'
	| 'preset_selected'
	| 'session_end'
	| 'funnel_start'
	| 'funnel_advance'
	| 'rage_click'
	| 'scroll_depth'
	| 'time_on_page'
	| 'web_vital'
	| 'page_performance'
	| 'ab_test_assignment';

interface AnalyticsEvent {
	type: EventType;
	properties?: Record<string, string | number | boolean | null>;
	timestamp?: number;
}

// -- Session ------------------------------------------------------------------

let currentSession: { sessionId: string; startTime: number; endTime?: number; events: AnalyticsEvent[] } | null = null;

export function startSession(): void {
	if (typeof window === 'undefined') return;
	currentSession = {
		sessionId: `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
		startTime: Date.now(),
		events: [],
	};
	trackEvent('page_view', {
		path: window.location.pathname,
		referrer: document.referrer,
		viewport_width: window.innerWidth,
		viewport_height: window.innerHeight,
		is_mobile: window.innerWidth < 640,
	});
}

function endSession(): void {
	if (!currentSession) return;
	currentSession.endTime = Date.now();
	trackEvent('session_end', {
		session_id: currentSession.sessionId,
		duration_ms: currentSession.endTime - currentSession.startTime,
		events_count: currentSession.events.length,
	});
	// Flush session summary to external service
	try {
		if (typeof window.gtag === 'function') {
			window.gtag('event', 'session_complete', {
				session_id: currentSession.sessionId,
				duration: currentSession.endTime - currentSession.startTime,
				event_count: currentSession.events.length,
			});
		}
	} catch {
		/* silent */
	}
	currentSession = null;
}

// -- Event tracking -----------------------------------------------------------

function trackEvent(type: EventType, properties?: Record<string, string | number | boolean | null>): void {
	if (!currentSession || typeof window === 'undefined') return;
	const event: AnalyticsEvent = { type, properties, timestamp: Date.now() };
	currentSession.events.push(event);
	if (import.meta.env.DEV) console.log('[Analytics]', event.type, event.properties);
	try {
		if (typeof window.gtag === 'function') window.gtag('event', event.type, event.properties);
	} catch {
		/* silent */
	}
}

// -- Funnels ------------------------------------------------------------------

const ACTIVE_FUNNELS = new Map<string, { step: string; timestamp: number }[]>();

function startFunnel(funnelName: string, firstStep: string): void {
	ACTIVE_FUNNELS.set(funnelName, [{ step: firstStep, timestamp: Date.now() }]);
	trackEvent('funnel_start', { funnel: funnelName, step: firstStep });
}

function advanceFunnel(funnelName: string, stepName: string): void {
	const funnel = ACTIVE_FUNNELS.get(funnelName);
	if (!funnel) {
		startFunnel(funnelName, stepName);
		return;
	}
	const prev = funnel[funnel.length - 1];
	funnel.push({ step: stepName, timestamp: Date.now() });
	trackEvent('funnel_advance', {
		funnel: funnelName,
		step: stepName,
		previous_step: prev.step,
		time_in_previous_step_ms: Date.now() - prev.timestamp,
	});
}

// -- Behavior tracking --------------------------------------------------------

type Cleanup = () => void;

export function initBehaviorTracking(): Cleanup {
	if (typeof window === 'undefined') return () => {};
	const cleanups: Cleanup[] = [];

	// Rage-click detection
	let clickTimer: ReturnType<typeof setTimeout> | null = null;
	let lastX = 0,
		lastY = 0;
	const onClick = (e: MouseEvent) => {
		const dist = Math.sqrt((e.clientX - lastX) ** 2 + (e.clientY - lastY) ** 2);
		if (dist < 10 && clickTimer) {
			const t = e.target as HTMLElement;
			trackEvent('rage_click', { x: e.clientX, y: e.clientY, target_tag: t.tagName, target_id: t.id });
		}
		lastX = e.clientX;
		lastY = e.clientY;
		if (clickTimer) clearTimeout(clickTimer);
		clickTimer = setTimeout(() => {
			clickTimer = null;
		}, 500);
	};
	document.addEventListener('click', onClick);
	cleanups.push(() => {
		document.removeEventListener('click', onClick);
		if (clickTimer) clearTimeout(clickTimer);
	});

	// Scroll depth (throttled)
	let scrollTimer: ReturnType<typeof setTimeout> | null = null;
	let maxDepth = 0;
	const onScroll = () => {
		const depth = (window.scrollY + window.innerHeight) / document.body.scrollHeight;
		if (depth > maxDepth) maxDepth = depth;
		if (scrollTimer) clearTimeout(scrollTimer);
		scrollTimer = setTimeout(() => {
			trackEvent('scroll_depth', { max_depth: Math.round(maxDepth * 100), current_depth: Math.round(depth * 100) });
		}, 1000);
	};
	// passive: true is critical — without it, the browser must wait for the handler
	// to complete before compositing the next scroll frame, causing jank (INP/FID regression).
	document.addEventListener('scroll', onScroll, { passive: true });
	cleanups.push(() => {
		document.removeEventListener('scroll', onScroll);
		if (scrollTimer) clearTimeout(scrollTimer);
	});

	// Time on page (every 60s while visible)
	let seconds = 0;
	const timer = setInterval(() => {
		if (!document.hidden) {
			seconds += 30;
			if (seconds % 60 === 0) trackEvent('time_on_page', { seconds });
		}
	}, 30000);
	cleanups.push(() => clearInterval(timer));

	return () => cleanups.forEach((fn) => fn());
}

// -- Web Vitals ---------------------------------------------------------------

export function trackWebVitals(): Cleanup {
	if (typeof window === 'undefined') return () => {};
	const cleanups: Cleanup[] = [];

	// FCP + FP (First Paint) via paint entries
	const paintObserver = new PerformanceObserver((list) => {
		for (const entry of list.getEntries()) {
			trackEvent('web_vital', { metric: entry.name, value: Math.round(entry.startTime) });
		}
	});
	paintObserver.observe({ entryTypes: ['paint'] });
	cleanups.push(() => paintObserver.disconnect());

	// LCP — largest-contentful-paint entries (buffered: true captures entries already fired)
	if (PerformanceObserver.supportedEntryTypes?.includes('largest-contentful-paint')) {
		const lcpObserver = new PerformanceObserver((list) => {
			// LCP can fire multiple times; the last entry is the final value
			const entries = list.getEntries();
			const last = entries[entries.length - 1] as LCPEntry | undefined;
			if (last) {
				trackEvent('web_vital', {
					metric: 'LCP',
					value: Math.round(last.startTime),
					element: last.element?.tagName ?? 'unknown',
				});
			}
		});
		lcpObserver.observe({ type: 'largest-contentful-paint', buffered: true });
		cleanups.push(() => lcpObserver.disconnect());
	}

	// CLS — cumulative-layout-shift (sum of all unexpected shifts)
	if (PerformanceObserver.supportedEntryTypes?.includes('layout-shift')) {
		let clsScore = 0;
		let sessionValue = 0;
		let sessionEntries: LayoutShiftEntry[] = [];

		const clsObserver = new PerformanceObserver((list) => {
			for (const raw of list.getEntries()) {
				const shift = raw as LayoutShiftEntry;
				// Only count shifts without recent user input
				if (!shift.hadRecentInput) {
					const firstEntry = sessionEntries[0];
					const lastEntry = sessionEntries[sessionEntries.length - 1];
					// Group into sessions: < 1s gap, total < 5s window
					if (
						sessionEntries.length === 0 ||
						shift.startTime - lastEntry.startTime < 1000 ||
						shift.startTime - firstEntry.startTime < 5000
					) {
						sessionValue += shift.value;
						sessionEntries.push(shift);
					} else {
						sessionValue = shift.value;
						sessionEntries = [shift];
					}
					clsScore = Math.max(clsScore, sessionValue);
				}
			}
		});
		clsObserver.observe({ type: 'layout-shift', buffered: true });

		// Report CLS when the page is hidden (most accurate moment)
		const reportCls = () => trackEvent('web_vital', { metric: 'CLS', value: Math.round(clsScore * 1000) / 1000 });
		document.addEventListener('visibilitychange', () => {
			if (document.visibilityState === 'hidden') reportCls();
		});
		cleanups.push(() => clsObserver.disconnect());
	}

	// INP — interaction-to-next-paint (available in Chrome 96+)
	// durationThreshold: only report meaningful interactions (not micro-clicks)
	if (PerformanceObserver.supportedEntryTypes?.includes('event')) {
		let maxInp = 0;
		const inpObserver = new PerformanceObserver((list) => {
			for (const raw of list.getEntries()) {
				const evt = raw as EventTimingEntry;
				const duration = evt.processingEnd - evt.startTime;
				if (duration > maxInp) {
					maxInp = duration;
					trackEvent('web_vital', {
						metric: 'INP',
						value: Math.round(duration),
						event_type: evt.name,
					});
				}
			}
		});
		// Cast options to bypass strict PerformanceObserverInit — durationThreshold
		// is a valid option per the Event Timing spec but not in all TS lib.dom versions.
		inpObserver.observe({ type: 'event', buffered: true } as PerformanceObserverInit);
		cleanups.push(() => inpObserver.disconnect());
	}

	// TTFB + navigation timing
	const onLoad = () => {
		setTimeout(() => {
			const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
			if (nav) {
				const ttfb = Math.round(nav.responseStart - nav.requestStart);
				trackEvent('web_vital', { metric: 'TTFB', value: ttfb });
				trackEvent('page_performance', {
					ttfb,
					dom_content_loaded: Math.round(nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart),
					load_complete: Math.round(nav.loadEventEnd - nav.loadEventStart),
					dns_lookup: Math.round(nav.domainLookupEnd - nav.domainLookupStart),
					tcp_connection: Math.round(nav.connectEnd - nav.connectStart),
					request_response: ttfb,
				});
			}
		}, 0);
	};
	window.addEventListener('load', onLoad);
	cleanups.push(() => window.removeEventListener('load', onLoad));

	return () => cleanups.forEach((fn) => fn());
}

// -- A/B Testing --------------------------------------------------------------

type Variant = 'A' | 'B';
type TestName = 'preset_layout' | 'config_input_style' | 'results_display_density' | 'upgrade_simulator_visibility';

function initABTest(testName: TestName): Variant {
	if (typeof window === 'undefined') return 'A';
	const key = `ab_test_${testName}`;
	const stored = localStorage.getItem(key);
	if (stored === 'A' || stored === 'B') return stored;
	const variant: Variant = Math.random() < 0.5 ? 'A' : 'B';
	localStorage.setItem(key, variant);
	trackEvent('ab_test_assignment', { test_name: testName, variant });
	return variant;
}

export function initAllABTests(): void {
	initABTest('preset_layout');
	initABTest('config_input_style');
	initABTest('results_display_density');
	initABTest('upgrade_simulator_visibility');
}

// -- Public API ---------------------------------------------------------------

export const analytics = {
	startSession,
	endSession,
	trackEvent,
	startFunnel,
	advanceFunnel,
	initBehaviorTracking,
	trackWebVitals,
	initAllABTests,
};
