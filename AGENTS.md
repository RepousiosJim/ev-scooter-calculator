# Agent Guidelines (ev-scooter-calc-v2)

This file guides agentic coding assistants working in this repo.

## Repository Overview
- Framework: SvelteKit 2.x with Svelte 5 runes
- Language: TypeScript (strict)
- Build tool: Vite 7.x
- Styling: Tailwind CSS v4 + app.css theme tokens
- Tests: Vitest (unit), Playwright (e2e)
- State: Svelte runes with $state / $derived stores

## Source Layout
- `src/routes/+page.svelte`: main UI composition
- `src/lib/components/calculator`: calculator feature components
- `src/lib/components/ui`: reusable UI components
- `src/lib/stores`: app state + persistence
- `src/lib/utils`: physics + formatting + validation
- `src/lib/data`: presets
- `tests/unit`: Vitest specs
- `tests/e2e`: Playwright specs

## Commands
### Install
- `npm install`

### Development
- `npm run dev` (Vite dev server, http://localhost:5173)

### Build / Preview
- `npm run build`
- `npm run preview` (serves build at http://localhost:4173)

### Type Check
- `npm run check`
- `npm run check:watch`

### Unit Tests (Vitest)
- `npm run test:unit`
- `npm run test:unit:watch`

### E2E Tests (Playwright)
- `npm run test:e2e`
- `npm run test:e2e:ui`
- `npm run test:e2e:debug`

### All Tests
- `npm run test`

## Running a Single Test
### Vitest (unit)
- `npm run test:unit -- tests/unit/physics.spec.ts`
- `npm run test:unit -- tests/unit/physics.spec.ts -t "calculates"`

### Playwright (e2e)
- `npm run test:e2e -- tests/e2e/main-page.spec.ts`
- `npm run test:e2e -- tests/e2e/main-page.spec.ts -g "loads page"`
- `npm run test:e2e -- --project=chromium`

## Code Style Conventions
### General
- Prefer small, focused changes that align with existing structure.
- Keep UI logic in Svelte components and calculations in `utils`.
- Use minimal comments; prefer clear naming and structure.
- Avoid adding new dependencies without reason.

### TypeScript
- Strict mode is enabled; keep types accurate and explicit.
- Use interfaces from `src/lib/types.ts`.
- Prefer typed helper functions over inline complex logic.
- Avoid `any`; use explicit unions or generics instead.

### Svelte 5 Runes
- Use `$state` for stores and component state.
- Use `$derived` for computed values.
- Use `$props()` for component props.
- Keep `script` blocks minimal and logic organized.

### Imports
- Use `$lib` alias for internal modules.
- Group imports by type: external, then `$lib`, then local.
- Use `import type` for types.
- Avoid unused imports.

### Formatting
- Indentation: 2 spaces (existing code uses 2 spaces).
- Use single quotes in TS/JS.
- Keep lines readable; wrap long template literals or JSX/Svelte markup.
- Prefer trailing commas in multi-line object literals.

### Naming
- Components: `PascalCase` filenames and component names.
- Stores/utilities: `camelCase`.
- Constants: `UPPER_SNAKE_CASE` for physical constants.
- Use descriptive names for calculations and derived values.

### State Management
- Store shared state in `src/lib/stores`.
- Avoid direct mutation outside store helpers unless already established.
- Use store helpers (e.g., `updateConfig`) to update config values.

### Error Handling
- Handle `localStorage` access with `try/catch`.
- Log errors with `console.error` only when needed.
- Prefer early returns for invalid states.

### UI / Styling
- Use Tailwind utility classes for styling.
- Prefer existing theme colors in `tailwind.config.js`.
- Avoid inline styles unless needed for dynamic values.
- Keep HTML structure consistent with current layout.

### Validation
- Use `validationRules` and `validateField` for input guidance.
- Clamp numeric values with `clampValue` if needed.

## Testing Guidance
- Update/add unit tests when editing physics logic.
- Update/add e2e tests when changing main UI flows.
- Keep tests deterministic; avoid long timeouts.

## Config Notes
- Playwright runs against `npm run preview` at port 4173.
- `playwright.config.ts` includes multi-browser projects.
- PWA config is in `vite.config.ts` via `vite-plugin-pwa`.

## Cursor / Copilot Rules
- No `.cursor/rules/`, `.cursorrules`, or `.github/copilot-instructions.md` files were found.

## Agent Etiquette
- Do not edit `node_modules` or generated `.svelte-kit` output.
- Keep changes scoped to the request.
- Avoid introducing new global CSS rules unless necessary.

## Contribution Checklist
- Run `npm run check` for type validation when changing TS.
- Run the narrowest relevant test first (unit or e2e).
- Ensure formatting matches existing files.

## Notes for UI Components
- Prefer reuse of `NumberInput` for numeric fields.
- Keep `ResultDisplay` and `ComponentStatus` focused on display logic.
- Put physics logic in `utils/physics.ts`.

## Notes for Data
- Presets live in `src/lib/data/presets.ts`.
- Profile persistence uses `localStorage`.

## When Adding Features
- Update config types in `src/lib/types.ts`.
- Add rules to `src/lib/utils/validators.ts`.
- Extend calculations in `src/lib/utils/physics.ts`.
- Update UI in `BasicConfig`/`AdvancedConfig` and `ResultDisplay`.

## When Modifying State
- Use `calculatorState` in `src/lib/stores/calculator.svelte.ts`.
- Keep `simulateUpgrade` behavior consistent with UI expectations.

## If Something Is Unclear
- Prefer asking for clarification rather than guessing.
- Document assumptions in the PR description or notes.
