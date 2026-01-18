/**
 * Analytics and User Research Tracking Utilities
 *
 * Provides centralized analytics for:
 * - User behavior tracking (clicks, scrolls, dwell time)
 * - Funnel analytics (task completion rates)
 * - A/B testing framework
 * - Error tracking
 * - Performance metrics
 */

// ============================================================================
// TYPES
// ============================================================================

export type EventType =
  | 'page_view'
  | 'preset_selected'
  | 'config_field_changed'
  | 'config_completed'
  | 'tab_switched'
  | 'upgrade_simulated'
  | 'upgrade_completed'
  | 'profile_saved'
  | 'profile_loaded'
  | 'tour_started'
  | 'tour_completed'
  | 'tour_skipped'
  | 'tour_previously_completed'
  | 'error_occurred'
  | 'search_performed'
  | 'help_viewed'
  | 'session_end'
  | 'funnel_start'
  | 'funnel_step'
  | 'funnel_complete'
  | 'click'
  | 'scroll'
  | 'behavior_tracked'
  | 'ab_test_assigned'
  | 'funnel_advance'
  | 'funnel_abandon'
  | 'rage_click'
  | 'scroll_depth'
  | 'form_submit'
  | 'time_on_page'
  | 'validation_error'
  | 'performance_metric'
  | 'web_vital'
  | 'page_performance'
  | 'ab_test_assignment'
  | 'ab_test_conversion';

export interface AnalyticsEvent {
  type: EventType;
  properties?: Record<string, string | number | boolean | null>;
  timestamp?: number;
}

export interface FunnelStep {
  step: string;
  timestamp: number;
  completed: boolean;
}

export interface UserSession {
  sessionId: string;
  startTime: number;
  endTime?: number;
  events: AnalyticsEvent[];
  funnels: Map<string, FunnelStep[]>;
  viewport: {
    width: number;
    height: number;
    isMobile: boolean;
  };
}

// ============================================================================
// SESSION MANAGEMENT
// ============================================================================

let currentSession: UserSession | null = null;

function generateSessionId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

export function startSession(): void {
  if (typeof window === 'undefined') return;

  currentSession = {
    sessionId: generateSessionId(),
    startTime: Date.now(),
    events: [],
    funnels: new Map(),
    viewport: {
      width: window.innerWidth,
      height: window.innerHeight,
      isMobile: window.innerWidth < 640,
    },
  };

  trackEvent('page_view', {
    path: window.location.pathname,
    referrer: document.referrer,
    viewport_width: window.innerWidth,
    viewport_height: window.innerHeight,
    is_mobile: window.innerWidth < 640,
  });
}

export function endSession(): void {
  if (!currentSession) return;

  currentSession.endTime = Date.now();
  const duration = currentSession.endTime - currentSession.startTime;

  trackEvent('session_end', {
    session_id: currentSession.sessionId,
    duration_ms: duration,
    events_count: currentSession.events.length,
  });

  // Flush to external analytics service
  flushAnalytics();

  currentSession = null;
}

// ============================================================================
// EVENT TRACKING
// ============================================================================

export function trackEvent(type: EventType, properties?: Record<string, string | number | boolean | null>): void {
  if (!currentSession || typeof window === 'undefined') return;

  const event: AnalyticsEvent = {
    type,
    properties,
    timestamp: Date.now(),
  };

  currentSession.events.push(event);

  // Console log for development (replace with actual analytics service)
  if (import.meta.env.DEV) {
    console.log('[Analytics]', event.type, event.properties);
  }

  // Send to external analytics service
  sendToAnalyticsService(event);
}

function sendToAnalyticsService(event: AnalyticsEvent): void {
  // Placeholder for actual analytics integration
  // Options: Google Analytics, Plausible, PostHog, Amplitude
  // Example implementation with custom event:

  try {
    // Example: Send to custom endpoint or analytics SDK
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', event.type, event.properties);
    }
  } catch (error) {
    // Silent fail - analytics shouldn't break the app
    console.warn('Analytics send failed:', error);
  }
}

function flushAnalytics(): void {
  if (!currentSession) return;

  // Send all queued events to analytics service
  currentSession.events.forEach(sendToAnalyticsService);

  // Send session summary
  try {
    if (typeof (window as any).gtag === 'function') {
      (window as any).gtag('event', 'session_complete', {
        session_id: currentSession.sessionId,
        duration: currentSession.endTime
          ? currentSession.endTime - currentSession.startTime
          : Date.now() - currentSession.startTime,
        event_count: currentSession.events.length,
      });
    }
  } catch (error) {
    console.warn('Analytics flush failed:', error);
  }
}

// ============================================================================
// FUNNEL ANALYTICS
// ============================================================================

const ACTIVE_FUNNELS = new Map<string, FunnelStep[]>();

export function startFunnel(funnelName: string, firstStep: string): void {
  const step: FunnelStep = {
    step: firstStep,
    timestamp: Date.now(),
    completed: true,
  };

  ACTIVE_FUNNELS.set(funnelName, [step]);

  trackEvent('funnel_start', {
    funnel: funnelName,
    step: firstStep,
  });
}

export function advanceFunnel(funnelName: string, stepName: string): void {
  const funnel = ACTIVE_FUNNELS.get(funnelName);
  if (!funnel) {
    startFunnel(funnelName, stepName);
    return;
  }

  const previousStep = funnel[funnel.length - 1];
  const timeInStep = Date.now() - previousStep.timestamp;

  const step: FunnelStep = {
    step: stepName,
    timestamp: Date.now(),
    completed: true,
  };

  funnel.push(step);

  trackEvent('funnel_advance', {
    funnel: funnelName,
    step: stepName,
    previous_step: previousStep.step,
    time_in_previous_step_ms: timeInStep,
  });
}

export function completeFunnel(funnelName: string): void {
  const funnel = ACTIVE_FUNNELS.get(funnelName);
  if (!funnel) return;

  const totalTime = Date.now() - funnel[0].timestamp;

  trackEvent('funnel_complete', {
    funnel: funnelName,
    total_steps: funnel.length,
    total_time_ms: totalTime,
  });

  ACTIVE_FUNNELS.delete(funnelName);
}

export function abandonFunnel(funnelName: string, reason?: string): void {
  const funnel = ACTIVE_FUNNELS.get(funnelName);
  if (!funnel) return;

  const totalTime = Date.now() - funnel[0].timestamp;
  const lastStep = funnel[funnel.length - 1];

  trackEvent('funnel_abandon', {
    funnel: funnelName,
    last_step: lastStep.step,
    total_steps: funnel.length,
    total_time_ms: totalTime,
    reason: reason || null,
  });

  ACTIVE_FUNNELS.delete(funnelName);
}

// ============================================================================
// BEHAVIORAL TRACKING
// ============================================================================

let clickTimeout: ReturnType<typeof setTimeout> | null = null;
let lastClickPosition = { x: 0, y: 0 };

export function initBehaviorTracking(): void {
  if (typeof window === 'undefined') return;

  // Click tracking
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    const clickData = {
      x: e.clientX,
      y: e.clientY,
      target_tag: target.tagName,
      target_id: target.id,
      target_class: target.className,
    };

    // Track rapid clicks (rage clicks)
    const distance = Math.sqrt(
      Math.pow(e.clientX - lastClickPosition.x, 2) +
        Math.pow(e.clientY - lastClickPosition.y, 2)
    );

    if (distance < 10 && clickTimeout) {
      trackEvent('rage_click', clickData);
    }

    lastClickPosition = { x: e.clientX, y: e.clientY };

    if (clickTimeout) clearTimeout(clickTimeout);
    clickTimeout = setTimeout(() => {
      clickTimeout = null;
    }, 500);
  });

  // Scroll tracking (throttled)
  let scrollTimeout: ReturnType<typeof setTimeout> | null = null;
  let maxScrollDepth = 0;

  document.addEventListener('scroll', () => {
    const scrollDepth =
      (window.scrollY + window.innerHeight) / document.body.scrollHeight;

    if (scrollDepth > maxScrollDepth) {
      maxScrollDepth = scrollDepth;
    }

    if (scrollTimeout) clearTimeout(scrollTimeout);

    scrollTimeout = setTimeout(() => {
      trackEvent('scroll_depth', {
        max_depth: Math.round(maxScrollDepth * 100),
        current_depth: Math.round(scrollDepth * 100),
      });
    }, 1000);
  });

  // Form interaction tracking
  const forms = document.querySelectorAll('form, [role="form"]');
  forms.forEach((form) => {
    form.addEventListener('submit', (e) => {
      const formData = new FormData(e.target as HTMLFormElement);
      trackEvent('form_submit', {
        form_id: form.id || 'unnamed',
        field_count: Array.from(formData.keys()).length,
      });
    });
  });

  // Time on page tracking
  let timeOnPage = 0;
  setInterval(() => {
    if (!document.hidden) {
      timeOnPage += 30;
      if (timeOnPage % 60 === 0) {
        trackEvent('time_on_page', {
          seconds: timeOnPage,
        });
      }
    }
  }, 30000);
}

// ============================================================================
// ERROR TRACKING
// ============================================================================

export function trackError(error: Error, context?: Record<string, unknown>): void {
  trackEvent('error_occurred', {
    error_message: error.message,
    error_name: error.name,
    error_stack: error.stack ? error.stack.substring(0, 500) : null,
    context: context ? JSON.stringify(context) : null,
  });
}

export function trackValidationError(fieldName: string, value: unknown, reason: string): void {
  trackEvent('validation_error', {
    field_name: fieldName,
    field_value: String(value),
    reason,
  });
}

// ============================================================================
// PERFORMANCE TRACKING
// ============================================================================

let performanceMarks: Map<string, number> = new Map();

export function startPerformanceMark(name: string): void {
  performanceMarks.set(name, performance.now());
}

export function endPerformanceMark(name: string): number {
  const startTime = performanceMarks.get(name);
  if (!startTime) return 0;

  const duration = performance.now() - startTime;
  performanceMarks.delete(name);

  trackEvent('performance_metric', {
    mark_name: name,
    duration_ms: Math.round(duration),
  });

  return duration;
}

export function trackWebVitals(): void {
  if (typeof window === 'undefined') return;

  // First Contentful Paint
  const observer = new PerformanceObserver((list) => {
    list.getEntries().forEach((entry) => {
      if (entry.entryType === 'paint') {
        trackEvent('web_vital', {
          metric: entry.name,
          value: Math.round(entry.startTime),
        });
      }
    });
  });

  observer.observe({ entryTypes: ['paint'] });

  // Navigation timing
  window.addEventListener('load', () => {
    setTimeout(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;

      if (navigation) {
        trackEvent('page_performance', {
          dom_content_loaded: Math.round(navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart),
          load_complete: Math.round(navigation.loadEventEnd - navigation.loadEventStart),
          dns_lookup: Math.round(navigation.domainLookupEnd - navigation.domainLookupStart),
          tcp_connection: Math.round(navigation.connectEnd - navigation.connectStart),
          request_response: Math.round(navigation.responseStart - navigation.requestStart),
        });
      }
    }, 0);
  });
}

// ============================================================================
// A/B TESTING FRAMEWORK
// ============================================================================

type Variant = 'A' | 'B' | 'C';
type TestName =
  | 'preset_layout'
  | 'config_input_style'
  | 'results_display_density'
  | 'upgrade_simulator_visibility';

const ACTIVE_TESTS: Map<TestName, { variant: Variant; assigned: boolean }> = new Map();
const STORAGE_KEY_PREFIX = 'ab_test_';

export function initABTest(testName: TestName, variants: Variant[] = ['A', 'B']): Variant {
  if (typeof window === 'undefined') return 'A';

  // Check if already assigned
  const stored = localStorage.getItem(`${STORAGE_KEY_PREFIX}${testName}`);
  if (stored && variants.includes(stored as Variant)) {
    ACTIVE_TESTS.set(testName, {
      variant: stored as Variant,
      assigned: true,
    });
    return stored as Variant;
  }

  // Random assignment
  const variant = variants[Math.floor(Math.random() * variants.length)];

  // Store assignment
  localStorage.setItem(`${STORAGE_KEY_PREFIX}${testName}`, variant);
  ACTIVE_TESTS.set(testName, { variant, assigned: true });

  // Track assignment
  trackEvent('ab_test_assignment', {
    test_name: testName,
    variant,
  });

  return variant;
}

export function getABVariant(testName: TestName): Variant | null {
  const test = ACTIVE_TESTS.get(testName);
  return test?.variant || null;
}

export function trackABTestConversion(testName: TestName, goal: string): void {
  const test = ACTIVE_TESTS.get(testName);
  if (!test) return;

  trackEvent('ab_test_conversion', {
    test_name: testName,
    variant: test.variant,
    goal,
  });
}

// Predefined test configurations
export function initAllABTests(): void {
  initABTest('preset_layout', ['A', 'B']); // Grid vs List
  initABTest('config_input_style', ['A', 'B']); // Hybrid vs Sliders
  initABTest('results_display_density', ['A', 'B']); // Compact vs Expanded
  initABTest('upgrade_simulator_visibility', ['A', 'B']); // Tab vs Inline
}

// ============================================================================
// EXPORTS
// ============================================================================

export const analytics = {
  startSession,
  endSession,
  trackEvent,
  startFunnel,
  advanceFunnel,
  completeFunnel,
  abandonFunnel,
  initBehaviorTracking,
  trackError,
  trackValidationError,
  startPerformanceMark,
  endPerformanceMark,
  trackWebVitals,
  initABTest,
  getABVariant,
  trackABTestConversion,
  initAllABTests,
};
