# Agent Guidelines (ev-scooter-calc-v2)

Guidelines for agentic coding assistants working in this repository.

## Repository Overview

- **Framework**: SvelteKit 2.x with Svelte 5 runes
- **Language**: TypeScript (strict mode)
- **Build Tool**: Vite 7.x
- **Styling**: Tailwind CSS v4 + custom theme tokens
- **Testing**: Vitest (unit) + Playwright (e2e)
- **State**: Svelte runes (`$state`, `$derived`, `$props`)

## Source Layout

```
src/
├── routes/                    # SvelteKit routes
│   ├── +page.svelte          # Main calculator page
│   └── +layout.svelte        # Root layout
├── lib/
│   ├── components/
│   │   ├── calculator/       # Feature components (BasicConfig, ResultDisplay)
│   │   └── ui/              # Reusable UI primitives (Card, NumberInput)
│   ├── stores/              # Svelte rune stores
│   ├── utils/               # Physics, validation, formatting
│   ├── data/                # Presets and static data
│   └── types.ts             # Centralized type definitions
├── tests/
│   ├── unit/                # Vitest specs (*.spec.ts)
│   └── e2e/                 # Playwright specs (*.spec.ts)
```

## Commands

### Development
- `npm install` - Install dependencies
- `npm run dev` - Start dev server (http://localhost:5173)
- `npm run build` - Production build
- `npm run preview` - Preview build (http://localhost:4173)

### Type Checking
- `npm run check` - TypeScript validation
- `npm run check:watch` - Watch mode

### Testing
- `npm run test` - Run all tests
- `npm run test:unit` - Unit tests only
- `npm run test:unit:watch` - Unit tests in watch mode
- `npm run test:e2e` - E2E tests (requires `npm run preview`)
- `npm run test:e2e:ui` - E2E tests with UI
- `npm run test:e2e:debug` - Debug mode

### Running Single Tests
```bash
# Vitest - single file
npm run test:unit -- tests/unit/physics.spec.ts

# Vitest - single test case
npm run test:unit -- tests/unit/physics.spec.ts -t "calculates"

# Playwright - single file
npm run test:e2e -- tests/e2e/main-page.spec.ts

# Playwright - single test by name
npm run test:e2e -- tests/e2e/main-page.spec.ts -g "loads page"

# Playwright - specific browser
npm run test:e2e -- --project=chromium
```

## Code Style Guidelines

### TypeScript
- Strict mode enabled; avoid `any` types
- Use interfaces from `src/lib/types.ts`
- Use `import type` for type-only imports
- Prefer typed helper functions over inline complex logic

### Svelte 5 Runes
- Use `$state` for reactive state
- Use `$derived` for computed values
- Use `$props()` for component props
- Use `get` accessors for computed state in stores

### Imports
Group in this order:
1. External libraries
2. SvelteKit/Svelte imports
3. `$lib` imports (types, utils, stores, components)
4. Relative imports (avoid; use `$lib` alias)

### Naming Conventions
- **Components**: `PascalCase` (files and exports)
- **Functions/Variables**: `camelCase`
- **Constants**: `UPPER_SNAKE_CASE` (e.g., `AIR_DENSITY`, `GRAVITY`)
- **Interfaces/Types**: `PascalCase`
- **Boolean Variables**: Prefix with `is`, `has`, `should`
- **Files**: Match the main export (components: PascalCase, utils: camelCase)

### Formatting
- **Indentation**: 2 spaces (no tabs)
- **Quotes**: Single quotes in TS/JS, double in HTML
- **Trailing Commas**: Always in multi-line objects/arrays
- **Semicolons**: Required
- **Line Length**: Prefer under 100 characters

### State Management
- Store shared state in `src/lib/stores/`
- Export action functions for mutations (e.g., `updateConfig()`)
- Always normalize inputs using validators
- Handle localStorage with try/catch blocks
- Check `typeof window !== 'undefined'` for browser-only code

### Error Handling
```typescript
// Always catch errors from external operations
try {
  const data = localStorage.getItem('key');
  return JSON.parse(data);
} catch (error) {
  console.error('[context] Failed:', error);
  return defaultValue; // Graceful fallback
}

// Guard against invalid numeric values
if (!Number.isFinite(value)) return 0;

// Prevent division by zero
if (divisor === 0) {
  console.warn('[context] Division by zero prevented');
  return 0;
}
```

### UI / Styling
- Use Tailwind utility classes (avoid inline styles)
- Prefer theme colors from `tailwind.config.js`
- Include accessibility attributes (`aria-label`, `aria-valuenow`)
- Use `data-testid` attributes for testable elements

### Validation
- Use `validationRules` and `validateField` from `validators.ts`
- Always normalize inputs with `normalizeConfigValue()`
- Clamp numeric values with `clampValue()` if needed

## Testing Guidelines

### Unit Tests (Vitest)
- Location: `tests/unit/*.spec.ts`
- Keep tests isolated and deterministic
- Use specific matchers (`toBe`, `toBeCloseTo`)
- Aim for >80% coverage on physics logic
- Test edge cases and error handling

### E2E Tests (Playwright)
- Location: `tests/e2e/*.spec.ts`
- Test user flows, not implementation
- Use `data-testid` attributes for selectors
- Use Playwright's auto-waiting; avoid `waitForTimeout`
- Runs against `npm run preview` at port 4173

## Key Patterns

### Store Pattern
```typescript
// src/lib/stores/calculator.svelte.ts
export const calculatorState = $state({
  config: { ... },
  showAdvanced: false,
  get stats() { return calculatePerformance(this.config); },
});

export function updateConfig(key, value) {
  const normalized = normalizeConfigValue(key, value, calculatorState.config[key]);
  calculatorState.config[key] = normalized;
}
```

### Component Structure
```svelte
<script lang="ts">
  // 1. Imports (external, $lib, local)
  import type { Props } from '$lib/types';
  import { helper } from '$lib/utils/helper';

  // 2. Props
  let { prop1, prop2 = defaultValue }: Props = $props();

  // 3. Local state
  let localState = $state(initial);

  // 4. Derived values
  const derived = $derived(compute(localState));
</script>

<!-- 5. Template with Tailwind classes -->
<div class="bg-bgCard border border-white/10 rounded-lg p-4">
  <!-- content -->
</div>
```

## Contribution Checklist

Before committing:
- [ ] Run `npm run check` - TypeScript validation
- [ ] Run relevant tests (`npm run test:unit` for logic, `npm run test:e2e` for UI)
- [ ] No `any` types (replace with proper types)
- [ ] All imports are used
- [ ] Follow naming conventions
- [ ] Error handling with try/catch for external operations
- [ ] Input validation for user inputs
- [ ] Accessibility attributes present
- [ ] No console.log in production code

## Important Notes

- **Physics Logic**: Document formulas, use named constants (e.g., `AIR_DENSITY`, `GRAVITY`)
- **Performance**: Physics calculations are cached (limit: 200 entries)
- **Security**: Always validate localStorage data; sanitize any HTML content
- **State Updates**: Batch updates to avoid multiple reactive recalculations
- **Browser APIs**: Check `typeof window !== 'undefined'` before using `window`, `localStorage`, `document`

## When Adding Features

1. Update types in `src/lib/types.ts`
2. Add validation rules in `src/lib/utils/validators.ts`
3. Extend calculations in `src/lib/utils/physics.ts`
4. Update stores if needed in `src/lib/stores/calculator.svelte.ts`
5. Update UI components in `src/lib/components/calculator/`
6. Add/update tests

## Cursor/Copilot Rules

Comprehensive coding standards are defined in `.cursorrules` (1169 lines). Key highlights:
- Follow conventional commit format: `type(scope): subject`
- Branch naming: `type/short-description`
- Always validate user inputs before use
- Never use magic numbers; use named constants
- Prefer `$derived` over computed values in render
- Use store helpers, never mutate state directly from components

If something is unclear, prefer asking for clarification rather than guessing.
