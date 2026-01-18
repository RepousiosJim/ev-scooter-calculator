# Testing Guide

## Test Structure

```
tests/
├── unit/           # Vitest unit tests
│   └── physics.spec.ts
└── e2e/            # Playwright end-to-end tests
    ├── accessibility.spec.ts
    ├── calculator.spec.ts
    ├── main-page.spec.ts
    ├── profiles.spec.ts
    ├── responsive.spec.ts
    └── upgrades.spec.ts
```

## Running Tests

### All Tests
```bash
npm run test
```

### Unit Tests Only
```bash
npm run test:unit
```

### Watch Mode (Unit)
```bash
npm run test:unit:watch
```

### E2E Tests Only
```bash
npm run test:e2e
```

### E2E UI Mode
```bash
npm run test:e2e:ui
```

### E2E Debug Mode
```bash
npm run test:e2e:debug
```

### Single Test File
```bash
npm run test:unit -- tests/unit/physics.spec.ts
npm run test:e2e -- tests/e2e/main-page.spec.ts
```

### Single Test Case
```bash
npm run test:unit -- tests/unit/physics.spec.ts -t "calculates"
npm run test:e2e -- tests/e2e/main-page.spec.ts -g "loads page"
```

## Writing Unit Tests

Unit tests use Vitest and are located in `tests/unit/`.

Example:
```typescript
import { describe, it, expect } from 'vitest';
import { calculatePerformance } from '$lib/utils/physics';

describe('calculatePerformance', () => {
  it('calculates valid performance stats', () => {
    const config = {
      v: 48,
      ah: 13,
      motors: 1,
      watts: 800,
      // ... other required fields
    };
    const result = calculatePerformance(config);
    expect(result.wh).toBeGreaterThan(0);
    expect(result.speed).toBeGreaterThan(0);
  });
});
```

## Writing E2E Tests

E2E tests use Playwright and test the application running in a browser.

Example:
```typescript
import { test, expect } from '@playwright/test';

test('loads page', async ({ page }) => {
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('EV Scooter Pro Calculator');
});

test('updates performance metrics', async ({ page }) => {
  await page.goto('/');
  const speedInput = page.locator('input[name="watts"]');
  await speedInput.fill('1000');
  await expect(page.locator('[data-testid="speed-stat"]')).toBeVisible();
});
```

### E2E Best Practices

1. **Use data-testid attributes** for reliable element selection
2. **Wait for elements** using `waitForSelector` or auto-waiting assertions
3. **Test user flows**, not implementation details
4. **Clean up state** between tests
5. **Use page objects** for complex interactions

## Accessibility Testing

Accessibility tests are in `tests/e2e/accessibility.spec.ts`. They verify:
- ARIA attributes are present and correct
- Keyboard navigation works
- Screen reader compatibility
- Focus management
- Reduced motion preference

## Responsive Testing

Responsive tests in `tests/e2e/responsive.spec.ts` verify the UI works across:
- Mobile (375px width)
- Tablet (768px width)
- Desktop (1024px+ width)

## Coverage

To generate a coverage report:

```bash
npm run test:unit -- --coverage
```

## Test Data

Use minimal, realistic test data:

```typescript
const validConfig = {
  v: 48,
  ah: 13,
  motors: 1,
  watts: 800,
  weight: 75,
  ridePosition: 0.5,
  style: 15,
  soh: 1,
  regen: 0.5,
  ambientTemp: 20
};
```

## Debugging Tests

### Unit Tests
- Use `console.log` for debugging
- Use `test.only` to run a single test
- Use VS Code Vitest extension for better UX

### E2E Tests
- Use `npm run test:e2e:debug` for step-by-step debugging
- Use `page.pause()` to pause execution
- Take screenshots: `await page.screenshot({ path: 'debug.png' })`
- Trace viewer: generated on failure in `playwright-report/`

## Common Patterns

### Testing State Changes
```typescript
it('updates state on input change', async ({ page }) => {
  await page.goto('/');
  const input = page.locator('input[name="watts"]');
  const stat = page.locator('[data-testid="power-stat"]');

  await expect(stat).toHaveText('800W');
  await input.fill('1000');
  await expect(stat).toHaveText('1000W');
});
```

### Testing Async Operations
```typescript
it('handles file import', async ({ page }) => {
  await page.goto('/');
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles('test-config.json');
  await expect(page.locator('.toast')).toBeVisible();
});
```

### Testing Modals/Dialogs
```typescript
it('opens and closes modal', async ({ page }) => {
  await page.goto('/');
  await page.click('[data-testid="open-modal"]');
  await expect(page.locator('[role="dialog"]')).toBeVisible();

  await page.keyboard.press('Escape');
  await expect(page.locator('[role="dialog"]')).not.toBeVisible();
});
```

## CI/CD

Tests run automatically in CI. The workflow:

1. Install dependencies
2. Run type check: `npm run check`
3. Run unit tests: `npm run test:unit`
4. Build application: `npm run build`
5. Run e2e tests: `npm run test:e2e`

## Troubleshooting

### Tests Timeout
- Increase timeout in test: `test.setTimeout(10000)`
- Check for flaky network requests
- Ensure proper cleanup between tests

### E2E Tests Fail Locally
- Ensure preview server is running: `npm run preview`
- Check Playwright browsers are installed: `npx playwright install`
- Try headless mode: `npx playwright test --headed=false`
