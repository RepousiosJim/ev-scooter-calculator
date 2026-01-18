# Contributing Guidelines

## Development Workflow

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/my-feature`
3. Make your changes
4. Run tests: `npm run test`
5. Run type check: `npm run check`
6. Commit with clear messages
7. Push to your fork
8. Create a pull request

## Code Standards

### TypeScript
- Strict mode is enabled - keep types accurate
- Use interfaces from `src/lib/types.ts`
- Avoid `any`; use explicit unions or generics
- Prefer typed helper functions over inline complex logic

### Svelte 5 Runes
- Use `$state` for reactive state
- Use `$derived` for computed values
- Use `$props()` for component props
- Keep script blocks minimal and organized

### Styling
- Use Tailwind utility classes
- Prefer existing theme colors from `tailwind.config.js`
- Avoid inline styles unless needed for dynamic values
- Maintain consistency with existing patterns

### Testing
- Add unit tests when editing physics logic
- Add e2e tests when changing main UI flows
- Keep tests deterministic; avoid long timeouts
- Run `npm run test:unit` for unit tests
- Run `npm run test:e2e` for end-to-end tests

### Git Commit Messages
- Use conventional commit format: `type: description`
- Types: `feat`, `fix`, `refactor`, `docs`, `test`, `chore`
- Examples:
  - `feat: add upgrade simulator`
  - `fix: correct battery calculation`
  - `refactor: simplify state management`
