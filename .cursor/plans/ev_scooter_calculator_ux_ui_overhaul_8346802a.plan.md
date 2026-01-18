---
name: EV Scooter Calculator UX/UI Overhaul
overview: Complete redesign of the EV Scooter Calculator UI/UX focusing on world-class user experience, comprehensive design system, accessibility excellence, and measurable success criteria
todos:
  - id: user-research
    content: "Implement user research tools: session recording, heatmap tracking, and analytics integration"
    status: completed
  - id: design-system-foundation
    content: "Build design system foundation: typography, color palette, spacing system, and design tokens"
    status: completed
  - id: component-library-atoms
    content: "Create atomic UI components: Button, Input, Slider, Select, Toggle, Badge, Icon, Tooltip"
    status: completed
  - id: component-library-molecules
    content: "Build molecular components: FormField, ProgressBar, UpgradeCard, PresetCard with new design system"
    status: completed
  - id: dashboard-redesign
    content: Redesign main dashboard with new layout architecture, ConfigPanel, and ResultsPanel
    status: pending
  - id: mobile-optimization
    content: Implement responsive design with mobile touch targets, gestures, and bottom navigation
    status: pending
  - id: micro-animations
    content: Add micro-animations and feedback mechanisms for all interactions
    status: pending
  - id: accessibility-audit
    content: Conduct WCAG AAA accessibility audit and implement fixes
    status: pending
  - id: performance-optimization
    content: Optimize load times, smooth scrolling, and rendering performance
    status: pending
  - id: testing-suite
    content: "Create comprehensive testing suite: unit, integration, E2E, and accessibility tests"
    status: pending
  - id: analytics-integration
    content: "Set up analytics for KPI tracking: task completion, user satisfaction, error rates, engagement"
    status: pending
  - id: ab-testing-framework
    content: Implement A/B testing framework for preset selection, configuration inputs, and display density
    status: pending
---

# EV Scooter Calculator - Complete UX/UI Redesign Plan

## 1. User Research & Discovery Phase

### 1.1 Target Audience Personas

Create 4 distinct user personas based on scooter modification community:

- **Performance Enthusiast** (35%, primary): Advanced user optimizing for speed/range
  - Technical depth: High
  - Goals: Maximize performance, validate upgrades
  - Pain points: Complex calculations scattered across tools

- **DIY Builder** (25%): Custom scooter fabrication
  - Technical depth: Medium-High
  - Goals: Component selection, budget planning
  - Pain points: Compatibility unknowns, cost uncertainty

- **Casual Rider** (25%): Wants to understand their scooter
  - Technical depth: Low-Medium
  - Goals: Learn specs, simple upgrade guidance
  - Pain points: Technical jargon, overwhelming options

- **E-Bike Shop Owner** (15%): Customer-facing advisor
  - Technical depth: High
  - Goals: Quick comparisons, sales recommendations
  - Pain points: Time constraints, customer education

### 1.2 User Journey Mapping

**Primary Journey - Configuration → Analysis → Decision:**

```
Entry Point → Preset Selection → Basic Configuration → Advanced Tuning 
→ Performance Analysis → Bottleneck Review → Upgrade Exploration → Decision
```

**Key Journey Touchpoints:**

- Onboarding (first visit, tour modal optimization)
- Preset selection (reduce cognitive load)
- Configuration input (real-time feedback)
- Results interpretation (clear visual hierarchy)
- Upgrade comparison (side-by-side deltas)
- Save/export actions (workflow completion)

**Pain Points to Address:**

- Preset grid overwhelming → Implement search/filter/smart recommendations
- Advanced settings hidden → Progressive disclosure with context
- Results scattered → Unified dashboard with drill-down
- Upgrade deltas unclear → Visual comparison with before/after

### 1.3 Behavioral Analysis Strategy

**Data Collection Methods:**

- Session recording integration (Clarity/Hotjar) - capture 100+ sessions
- Heatmap tracking (where users click, scroll depth)
- Form abandonment tracking (at what stage users leave)
- Preset selection patterns (most popular, rarely used)
- Configuration modification frequency (most adjusted fields)
- Tab switching behavior (Configuration vs Upgrades ratio)
- Feature usage analytics (profile save, share, tour engagement)

**Behavioral Metrics to Track:**

- Time to first value (preset load → meaningful result)
- Configuration session duration (optimal vs too long)
- Upgrade simulation conversion (simulated → actual purchase intent proxy)
- Preset vs manual configuration ratio
- Mobile vs desktop usage patterns
- Error rate (invalid inputs, out-of-range values)

---

## 2. Design System Architecture

### 2.1 Typography System

**Current:** System fonts (Segoe UI, Roboto) - generic

**New Typography Scale (Modular Scale 1.25):**

```css
/* Display - Hero & Major Headings */
font-display: 'Space Grotesk' 32px/40px (700 weight)
font-display-lg: 'Space Grotesk' 40px/48px (700 weight)

/* Headings - Section & Card Titles */
font-h1: 'Space Grotesk' 24px/32px (600 weight)
font-h2: 'Space Grotesk' 20px/28px (600 weight)
font-h3: 'Space Grotesk' 18px/24px (600 weight)

/* Body - Content & Descriptions */
font-body: 'Inter' 16px/24px (400 weight)
font-body-sm: 'Inter' 14px/20px (400 weight)

/* Labels - Form Fields & Metadata */
font-label: 'Inter' 13px/20px (500 weight, uppercase, letter-spacing 0.05em)
font-label-sm: 'Inter' 11px/16px (500 weight, uppercase, letter-spacing 0.05em)

/* Numbers - Stats & Values */
font-number: 'JetBrains Mono' 24px/32px (500 weight, tabular-nums)
font-number-lg: 'JetBrains Mono' 32px/40px (600 weight, tabular-nums)
font-number-sm: 'JetBrains Mono' 16px/24px (500 weight, tabular-nums)
```

**Rationale:**

- Space Grotesk: Distinctive, tech-forward for headings
- Inter: Highly readable, versatile for body text
- JetBrains Mono: Tabular numbers prevent layout shift in stats

### 2.2 Color Theory & Palette

**Current:** Primary (#00d4ff) + Secondary (#7000ff) + Dark blues

**New Systematic Palette (Semantic + Functional):**

```css
/* Primary Brand */
--brand-primary: #3b82f6      /* Core interaction color */
--brand-primary-hover: #2563eb  /* Interactive state */
--brand-primary-light: #60a5fa /* Reduced opacity states */

/* Secondary Brand */
--brand-secondary: #8b5cf6     /* Accent/gradient companion */
--brand-secondary-hover: #7c3aed

/* Functional Colors (WCAG AAA compliant) */
--success: #059669              /* 4.5:1 ratio on dark */
--success-light: #10b981
--warning: #d97706
--warning-light: #f59e0b
--danger: #dc2626
--danger-light: #ef4444
--info: #0891b2
--info-light: #06b6d4

/* Neutral Scale (Dark Theme) */
--gray-900: #020617  /* Background - darkest */
--gray-800: #0f172a  /* Surface 1 - cards */
--gray-700: #1e293b  /* Surface 2 - inputs */
--gray-600: #334155  /* Borders/dividers */
--gray-500: #475569  /* Icons/muted elements */
--gray-400: #64748b  /* Disabled states */
--gray-300: #94a3b8  /* Body text */
--gray-200: #cbd5e1  /* Secondary text */
--gray-100: #e2e8f0  /* High contrast mode text */

/* Text Colors (hierarchy) */
--text-primary: #f8fafc      /* Main content */
--text-secondary: #cbd5e1     /* Descriptions */
--text-tertiary: #94a3b8      /* Metadata */
--text-on-primary: #ffffff   /* On brand color */

/* Semantic Gradients */
--gradient-brand: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)
--gradient-success: linear-gradient(135deg, #059669 0%, #10b981 100%)
--gradient-warning: linear-gradient(135deg, #d97706 0%, #f59e0b 100%)
--gradient-danger: linear-gradient(135deg, #dc2626 0%, #ef4444 100%)
```

**Color Usage Rules:**

- Primary actions: brand-primary
- Secondary actions: text-secondary with brand-primary border
- Destructive: danger (only for permanent actions)
- Success states: success-light (e.g., performance grade A)
- Warning states: warning-light (e.g., bottlenecks)
- Info states: info-light (e.g., tooltips)

### 2.3 Spacing System

**Base Unit:** 4px (0.25rem)

**Scale:**

```css
--space-0: 0
--space-1: 4px    /* Micro spacing, icon gaps */
--space-2: 8px    /* Tight element spacing */
--space-3: 12px   /* Related element groups */
--space-4: 16px   /* Default section spacing */
--space-5: 20px   /* Loose element spacing */
--space-6: 24px   /* Section padding */
--space-8: 32px   /* Card internal spacing */
--space-10: 40px  /* Section vertical rhythm */
--space-12: 48px  /* Major section separation */
--space-16: 64px  /* Page margins */
```

**Spacing Rules:**

- Form fields: space-4 (16px) vertical rhythm
- Card padding: space-8 (32px) interior, space-4 (16px) external
- Button spacing: space-3 (12px) minimum between buttons
- Section dividers: space-6 (24px) before/after
- Mobile: Increase by 25% for touch targets

### 2.4 Component Library Structure

**New Component Hierarchy:**

```
src/lib/components/
├── ui/
│   ├── atoms/              # Smallest interactive elements
│   │   ├── Button.svelte
│   │   ├── Input.svelte
│   │   ├── Slider.svelte
│   │   ├── Select.svelte
│   │   ├── Toggle.svelte
│   │   ├── Badge.svelte
│   │   ├── Icon.svelte
│   │   └── Tooltip.svelte
│   ├── molecules/          # Combined atoms
│   │   ├── NumberInput.svelte (enhanced)
│   │   ├── FormField.svelte
│   │   ├── ProgressBar.svelte
│   │   ├── StatCard.svelte
│   │   ├── UpgradeCard.svelte
│   │   └── PresetCard.svelte
│   ├── organisms/          # Complex UI sections
│   │   ├── Dashboard.svelte (NEW - main layout)
│   │   ├── ConfigPanel.svelte
│   │   ├── ResultsPanel.svelte
│   │   ├── UpgradeSimulator.svelte
│   │   └── ComparisonView.svelte
│   └── templates/          # Page-level structures
│       ├── CalculatorTemplate.svelte
│       └── SettingsTemplate.svelte
```

**Component Standards:**

- All components accept `variant`, `size`, `disabled` props
- Atomic components use `data-*` attributes for styling hooks
- Organisms use slots for flexible composition
- Every component has documented accessibility props (aria-*)

### 2.5 Accessibility Standards (WCAG AAA)

**Contrast Requirements:**

- Normal text: 7:1 minimum (WCAG AAA)
- Large text (18px+): 4.5:1 minimum
- UI components: 3:1 minimum for non-text elements

**Semantic HTML:**

```html
<!-- Proper heading hierarchy -->
<h1>EV Scooter Calculator</h1>
  <section>
    <h2>Configuration</h2>
      <h3>Battery</h3>
  </section>

<!-- Form structure -->
<form role="form" aria-labelledby="config-heading">
  <fieldset>
    <legend>Core Specifications</legend>
    <label for="voltage">Battery Voltage</label>
    <input id="voltage" type="number">
  </fieldset>
</form>

<!-- Live regions for dynamic content -->
<div role="region" aria-live="polite" aria-atomic="true">
  <!-- Performance stats update here -->
</div>
```

**Keyboard Navigation:**

- Tab order follows visual layout
- Focus indicators: 2px solid brand-primary, 2px offset
- Esc: Close modals, cancel actions
- Enter/Space: Activate buttons, toggle checkboxes
- Arrow keys: Navigate sliders, increment/decrement inputs

**Screen Reader Support:**

- All charts have textual alternatives
- Icons have `aria-label` or `aria-hidden="true"` if decorative
- Form errors announce with `aria-describedby`
- Progress updates with `aria-live="polite"`

---

## 3. Wireframing & Prototyping Methodology

### 3.1 Low-Fidelity Sketches (Week 1)

**Tools:** Hand-drawn or Figma rough sketches

**Key Layouts:**

1. Landing/Onboarding view
2. Configuration panel (expanded)
3. Performance dashboard
4. Upgrade comparison view
5. Settings/profile management

**Focus:** Information architecture, element placement, user flow

### 3.2 Mid-Fidelity Wireframes (Week 2)

**Tools:** Figma with gray-scale, no final typography

**Deliverables:**

- All screen states (mobile, tablet, desktop)
- Component variations
- Interaction states (hover, active, disabled)
- Navigation patterns

### 3.3 High-Fidelity Interactive Prototype (Week 3)

**Tools:** Figma with full design system, prototyping interactions

**Features:**

- Clickable prototype with full user flow
- Micro-animations previewed
- Responsive behavior simulated
- Accessibility states demonstrated

### 3.4 Component-Driven Development (Week 4)

**Approach:** Build from atoms → molecules → organisms

**Implementation Order:**

1. Base UI atoms (Button, Input, Slider)
2. Form molecules (NumberInput, FormField)
3. Dashboard organisms (ConfigPanel, ResultsPanel)
4. Page templates and integration

**Deliverable Storybook:** `npm run storybook` to view all components in isolation

---

## 4. Information Architecture

### 4.1 Navigation Design

**Current:** 2-tab system (Configuration | Upgrades)

**New Navigation Structure:**

```
Primary Navigation (Tab Bar)
├── Configure  [📝] - Main configuration flow
├── Analyze    [📊] - Performance dashboard
├── Upgrade    [🚀] - Upgrade simulator
└── Profiles   [💾] - Saved configurations

Secondary Navigation (Within tabs)
- Configure: Basic → Advanced → Tips
- Analyze: Summary → Efficiency → Power → Health
- Upgrade: Simulator → Compare → Recommendations
- Profiles: List → Import/Export → Settings
```

**Navigation UX:**

- Tabs: 48px height, icon + text, active state underline
- Breadcrumbs for deep navigation
- Back button for mobile navigation
- Search bar in profile manager

### 4.2 Content Hierarchy

**Visual Hierarchy Scale:**

1. **Level 1 (Most Important):** Performance Grade, Top Speed, Range (StatsCard grid)
2. **Level 2:** Configuration inputs, upgrade cards
3. **Level 3:** Secondary metrics (efficiency, health), help text
4. **Level 4:** Metadata, tooltips, labels

**Typography Application:**

- L1: font-number-lg (32px, bold, brand-primary for primary metric)
- L2: font-body (16px, semi-bold)
- L3: font-body-sm (14px)
- L4: font-label-sm (11px, uppercase, muted)

**Spacing Application:**

- L1-L2: space-6 (24px)
- L2-L3: space-4 (16px)
- L3-L4: space-2 (8px)

### 4.3 Cognitive Load Management

**Progressive Disclosure:**

**Stage 1 - Initial Load (Minimal):**

- Preset selector with search
- Quick view: Top 3 metrics (Speed, Range, Acceleration)
- "Start Customizing" CTA

**Stage 2 - Configuration (Moderate):**

- Basic configuration panel expanded
- Real-time performance updates
- Contextual help tooltips (on hover/focus)

**Stage 3 - Advanced (Maximum):**

- All configuration fields visible
- Technical mode toggle (raw values vs formatted)
- Advanced settings panel

**Chunking Strategy:**

- Configuration sections: Battery, Motor, Usage, Environment
- Results sections: Performance, Efficiency, Power, Health
- Upgrade categories: Battery, Motor, Controller, Other

**Default State Management:**

- Hide advanced options by default
- Collapse result panels with "Show Details" toggle
- Lazy-load graphs and animations

---

## 5. Interaction Design Patterns

### 5.1 Micro-Animations

**Purpose:** Provide feedback, guide attention, create delight

**Animation Timing:**

- Instant feedback: 100-150ms (button press, hover)
- Transitions: 200-300ms (panel slide, tab switch)
- Entry animations: 400-600ms (page load, modal open)
- Complex sequences: 800-1000ms (multi-step flows)

**Animation Easing:**

```css
ease-out: cubic-bezier(0.215, 0.61, 0.355, 1)  /* Natural exit */
ease-in-out: cubic-bezier(0.645, 0.045, 0.355, 1)  /* Smooth both ways */
bounce: cubic-bezier(0.68, -0.55, 0.265, 1.55)  /* Attention-grabbing */
```

**Specific Animations:**

```css
/* Value Update - Staggered Reveal */
@keyframes valueUpdate {
  0% { transform: scale(1.1); opacity: 0.8; }
  50% { transform: scale(0.95); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
.apply-value-update { animation: valueUpdate 0.3s ease-out; }

/* Card Entry - Slide Up Fade */
@keyframes cardEntry {
  from { transform: translateY(20px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}
.card-entry { animation: cardEntry 0.4s ease-out backwards; }

/* Success Pulse - Grade Achievement */
@keyframes successPulse {
  0%, 100% { box-shadow: 0 0 0 rgba(5, 150, 105, 0); }
  50% { box-shadow: 0 0 20px rgba(5, 150, 105, 0.4); }
}
.success-pulse { animation: successPulse 0.6s ease-out; }

/* Progress Bar - Smooth Fill */
@keyframes progressFill {
  from { width: 0%; }
}
.progress-fill { animation: progressFill 0.6s ease-out; }

/* Tooltip - Pop In */
@keyframes tooltipPop {
  0% { transform: scale(0.8); opacity: 0; }
  100% { transform: scale(1); opacity: 1; }
}
.tooltip-pop { animation: tooltipPop 0.15s ease-out; }
```

### 5.2 Feedback Mechanisms

**Immediate Feedback (0-100ms):**

- Visual: Button depressed state (transform: scale(0.98))
- Audio (optional): Satisfying click sound on save

**Delayed Feedback (100-500ms):**

- Loading states: Spinner or skeleton loader
- Value updates: Numbers animate/count-up
- Color changes: Smooth transitions (0.2s)

**Progressive Feedback (500-2000ms):**

- Calculation progress: "Analyzing configuration..."
- Upgrade simulation: "Simulating upgrade impact..."
- Profile save: "Saving to local storage..."

**Success Feedback:**

- Toast notification: "Configuration saved successfully"
- Visual checkmark: Green badge on profile card
- Grade achievement: Animated grade reveal with particles

**Error Feedback:**

- Inline error: Red border + error message below field
- Shake animation: On invalid form submission
- Error summary: "3 errors found - please correct"

### 5.3 Gesture-Based Controls (Mobile)

**Swipe Actions:**

- Left/Right: Navigate between tabs
- Down: Collapse panel
- Up: Expand panel

**Pinch:**

- Zoom graphs (if interactive charts implemented)

**Long Press:**

- Show context menu (e.g., profile actions)

**Pull to Refresh:**

- Reload presets from server (if online sync added)

---

## 6. Usability Testing Protocols

### 6.1 A/B Testing Framework

**Test Variants to Run:**

**Test 1: Preset Selection Layout**

- Variant A: Grid layout (current)
- Variant B: List layout with preview images
- Metric: Time to select preset, preset selection rate

**Test 2: Configuration Input Style**

- Variant A: Number inputs with sliders (current hybrid)
- Variant B: Sliders with number readouts
- Metric: Input completion time, user preference survey

**Test 3: Results Display Density**

- Variant A: Compact (current 4-grid)
- Variant B: Expanded with more detail
- Metric: Comprehension quiz score, time to find key metric

**Test 4: Upgrade Simulator Visibility**

- Variant A: Separate tab (current)
- Variant B: Inline on configuration page
- Metric: Upgrade simulation rate, upgrade completion rate

### 6.2 Heatmap Analysis

**Track:**

- Click heatmaps (where users click)
- Scroll heatmaps (how far users scroll)
- Movement heatmaps (mouse tracking)
- Attention heatmaps (dwell time)

**Key Areas to Analyze:**

- Preset grid: Which presets are most clicked?
- Configuration panel: Which fields are most/least adjusted?
- Results area: Which metrics get the most attention?
- Upgrade cards: Which upgrades generate most interest?
- Call-to-action buttons: Where do users expect actions?

### 6.3 User Feedback Loops

**In-App Feedback:**

- Floating feedback button (bottom-right)
- Quick feedback form (emoji rating + text)
- Contextual feedback: "Did this help?" after tour completion

**Post-Session Surveys:**

- On exit (optional): "Rate your experience"
- After key actions: "How helpful was this feature?"
- Error recovery: "Did we resolve your issue?"

**Continuous Feedback:**

- GitHub issues for bugs
- Discussions for feature requests
- User interviews (monthly, 5-10 users)

### 6.4 Iteration Cycles

**Sprint-Based Iteration:**

- Week 1: User research, hypothesis generation
- Week 2: Design, wireframing, prototyping
- Week 3: Development implementation
- Week 4: Testing, data collection, analysis
- Week 5: Refinement based on findings

**Rollout Strategy:**

- Canary release: 10% of users get new design
- Monitor metrics: Compare to baseline
- If successful: Roll out to 50%, then 100%
- If issues: Roll back, iterate, retry

---

## 7. Cross-Platform Responsive Design

### 7.1 Breakpoint Strategy

```css
/* Mobile First Approach */
--breakpoint-xs: 320px   /* Small phones */
--breakpoint-sm: 640px   /* Large phones, portrait tablets */
--breakpoint-md: 768px   /* Tablets */
--breakpoint-lg: 1024px  /* Small laptops */
--breakpoint-xl: 1280px  /* Desktops */
--breakpoint-2xl: 1536px /* Large displays */
```

### 7.2 Layout Adaptations

**Mobile (≤640px):**

- Single column layout
- Sticky bottom navigation (tab bar)
- Collapsible sections
- Touch-optimized: 44px minimum tap targets
- Hide less critical elements behind "Show More"
- Graphs: Simplified, static or swipeable

**Tablet (768px-1024px):**

- Two column layout (config | results)
- Horizontal tab navigation
- Hover states enabled
- Expand panels by default

**Desktop (≥1024px):**

- Three column layout (config | results | upgrades)
- Full feature set visible
- Hover states, tooltips
- Multi-window resize support

### 7.3 Touch Optimization

**Touch Targets:**

- Buttons: 44px × 44px minimum
- Form inputs: 48px height minimum
- List items: 48px height minimum
- Spacing: 8px minimum between targets

**Touch Feedback:**

- Active state: Opacity change + scale(0.98)
- Visual ripple effect on buttons
- Haptic feedback (if supported): Vibration on actions

**Gesture Support:**

- Swipe for navigation
- Pull to refresh
- Long press for context menus

### 7.4 Performance Across Devices

**Mobile Optimization:**

- Reduce animation complexity
- Lazy load below-fold content
- Optimize images (WebP, responsive sizes)
- Minimize DOM elements

**Desktop Enhancements:**

- Hover effects
- Tooltips on hover
- Keyboard shortcuts
- Larger graphs with more detail

---

## 8. Performance Optimization

### 8.1 Load Time Optimization

**Target Metrics:**

- First Contentful Paint (FCP): < 1.5s
- Largest Contentful Paint (LCP): < 2.5s
- Time to Interactive (TTI): < 3.5s
- Cumulative Layout Shift (CLS): < 0.1

**Strategies:**

- Code splitting: Route-based chunking
- Lazy loading: Components, images, graphs
- Tree shaking: Remove unused code
- Minification: CSS, JS, HTML
- CDN: Static assets

### 8.2 Smooth Scrolling

**Implementation:**

```css
html {
  scroll-behavior: smooth;
  scroll-padding-top: 80px; /* Account for sticky header */
}

/* Custom scrollbar */
::-webkit-scrollbar {
  width: 12px;
}
::-webkit-scrollbar-track {
  background: var(--gray-900);
}
::-webkit-scrollbar-thumb {
  background: var(--gray-700);
  border-radius: 6px;
}
::-webkit-scrollbar-thumb:hover {
  background: var(--gray-600);
}
```

**Virtual Scrolling:** For long lists (presets, profiles)

### 8.3 Efficient Rendering

**React/Svelte Optimizations:**

- Memoization: `$derived` for computed values
- Debouncing: Input changes (300ms delay)
- Throttling: Window resize events (100ms)
- Virtual DOM reconciliation: Keyed lists

**Canvas Optimization:**

```javascript
// Power graph optimization
- Reduce frame rate on mobile (15fps vs 30fps)
- Use requestAnimationFrame
- Pause animation when tab not visible
- Use offscreen canvas for complex rendering
```

### 8.4 Asset Optimization

**Images:**

- WebP format with fallback to PNG
- Responsive images with srcset
- Lazy loading with loading="lazy"
- Placeholder blur effect (LQIP)

**Fonts:**

- Subset fonts (only needed characters)
- WOFF2 format
- Font-display: swap

---

## 9. Success Criteria & KPIs

### 9.1 Task Completion Rates

**Primary Tasks:**

- Preset selection: Target 95% completion rate
- Configuration: Target 90% completion rate
- Performance review: Target 85% completion rate
- Upgrade simulation: Target 80% completion rate
- Profile save: Target 70% completion rate

**Measurement:**

- Funnel analytics (Google Analytics, Plausible)
- Session recordings (Clarity)
- User surveys

### 9.2 User Satisfaction Scores

**Metrics:**

- NPS (Net Promoter Score): Target ≥ 50
- CSAT (Customer Satisfaction): Target ≥ 4.5/5
- SUS (System Usability Scale): Target ≥ 80/100

**Data Collection:**

- In-app surveys (after key actions)
- Exit survey (optional on page leave)
- Periodic user interviews (monthly)

### 9.3 Error Reduction Rates

**Metrics to Track:**

- Form validation errors: Target < 5% of submissions
- Calculation errors: Target < 1% of calculations
- Confusion events (rage clicks, repeated actions): Target < 10% of sessions

**Error Types:**

- Input validation (out-of-range values)
- Confusion (multiple rapid clicks, help searches)
- Abandonment (form started, not completed)

### 9.4 Engagement Metrics

**Core Metrics:**

- Session duration: Target 2-5 minutes (optimal)
- Return user rate: Target ≥ 40%
- Feature adoption: 
  - Presets used: ≥ 70%
  - Upgrade simulation: ≥ 50%
  - Profile management: ≥ 30%
- Mobile vs desktop usage: Track split

**Advanced Metrics:**

- Configuration complexity (number of fields adjusted)
- Preset vs manual ratio
- Cross-tab navigation frequency
- Help/tour engagement rate

---

## 10. Implementation Roadmap

### Phase 1: Foundation (Weeks 1-2)

- Typography system implementation
- Color palette migration
- Spacing system adoption
- Component library foundation (atoms)

### Phase 2: Core Components (Weeks 3-4)

- Enhanced NumberInput, Slider, Select components
- FormField molecule with validation
- StatsCard redesign
- Card component variants

### Phase 3: Dashboard Redesign (Weeks 5-6)

- New layout architecture
- Configuration panel rebuild
- Results panel redesign
- Power graph optimization

### Phase 4: Mobile Optimization (Week 7)

- Responsive breakpoint implementation
- Touch target optimization
- Mobile-specific UI patterns
- Gesture support

### Phase 5: Polish & Testing (Week 8)

- Micro-animations implementation
- Accessibility audit and fixes
- Performance optimization
- Cross-browser testing

### Phase 6: Launch & Monitoring (Week 9+)

- Feature flag rollout (canary)
- A/B testing setup
- Analytics integration
- User feedback collection
- Iteration based on data

---

## 11. File Changes Summary

### New Files to Create:

- `src/lib/components/ui/atoms/` - Button, Input, Slider, Select, Toggle, Badge, Icon, Tooltip
- `src/lib/components/ui/molecules/` - FormField, ProgressBar, UpgradeCard, PresetCard
- `src/lib/components/ui/organisms/` - Dashboard, ConfigPanel, ResultsPanel
- `src/lib/design-system/` - Design tokens documentation
- `src/styles/design-tokens.css` - CSS custom properties
- `src/lib/utils/accessibility.ts` - Accessibility helpers
- `tests/e2e/a11y-audit.spec.ts` - Accessibility test suite

### Files to Modify:

- `src/app.css` - Add design tokens, typography system
- `tailwind.config.js` - Extend theme with new colors, spacing, typography
- `src/routes/+page.svelte` - Rebuild with new component structure
- `src/lib/components/ui/NumberInput.svelte` - Enhance with new design system
- `src/lib/components/ui/StatsCard.svelte` - Redesign with new hierarchy
- `src/lib/components/ui/Card.svelte` - Add variant system
- `src/lib/components/calculator/BasicConfig.svelte` - Refactor to use FormField
- `src/lib/components/calculator/PerformanceSummary.svelte` - Redesign layout
- `src/lib/components/calculator/PowerGraph.svelte` - Optimize performance
- `src/lib/components/ui/Tabs.svelte` - Add bottom navigation for mobile
- `src/lib/components/ui/Hero.svelte` - Redesign with new typography

---

## 12. Testing & Quality Assurance

### Unit Tests (Vitest)

- Component props rendering
- State management
- Accessibility attributes
- Animation triggers

### Integration Tests

- Form submission flows
- Tab navigation
- Profile save/load
- Upgrade simulation

### E2E Tests (Playwright)

- Full user flows
- Responsive behavior
- Keyboard navigation
- Screen reader compatibility

### Accessibility Tests

- Automated: axe-core, Lighthouse
- Manual: Screen reader testing (NVDA, VoiceOver)
- Color contrast verification

### Performance Tests

- Lighthouse scores (Performance, Accessibility, Best Practices)
- WebPageTest results
- Bundle size analysis

---

This plan provides a comprehensive roadmap for transforming the EV Scooter Calculator into a world-class, accessible, and highly usable digital product with measurable success criteria and a data-driven approach to continuous improvement.