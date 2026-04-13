import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import sveltePlugin from 'eslint-plugin-svelte';
import svelteParser from 'svelte-eslint-parser';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';

export default tseslint.config(
	// Base JS recommended rules
	eslint.configs.recommended,

	// TypeScript recommended rules (type-aware)
	...tseslint.configs.recommended,

	// Svelte recommended rules
	...sveltePlugin.configs['flat/recommended'],

	// Prettier disables conflicting formatting rules — must be last
	eslintConfigPrettier,

	// Global rule: respect _ prefix for unused variables across all files
	{
		rules: {
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},

	// TypeScript files (exclude .svelte.ts from type-aware linting — they're parsed by svelte parser)
	{
		files: ['**/*.ts', '**/*.tsx'],
		ignores: ['**/*.svelte.ts', '**/*.svelte.js'],
		languageOptions: {
			parserOptions: {
				project: './tsconfig.json',
				extraFileExtensions: ['.svelte'],
			},
		},
	},

	// Override: .svelte.ts files use the TypeScript parser, not the svelte parser
	// (eslint-plugin-svelte's flat/recommended adds a block for *.svelte.ts that applies
	// svelte-eslint-parser, which cannot parse plain .ts syntax — override it here)
	{
		files: ['**/*.svelte.ts'],
		languageOptions: {
			parser: tseslint.parser,
			parserOptions: {
				project: './tsconfig.json',
			},
		},
		rules: {
			// .svelte.ts stores use Svelte 5 runes ($state, $derived) which handle reactivity
			// natively — the Svelte 4 reactivity wrappers (SvelteSet, SvelteDate, etc.) are
			// not needed here.
			'svelte/prefer-svelte-reactivity': 'off',
		},
	},

	// Svelte-specific config — browser globals + relaxed rules for SvelteKit patterns
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parser: svelteParser,
			parserOptions: {
				parser: tseslint.parser,
				project: './tsconfig.json',
				extraFileExtensions: ['.svelte'],
			},
			globals: {
				...globals.browser,
				...globals.es2021,
				gtag: 'readonly',
			},
		},
		rules: {
			// Static hrefs in SvelteKit are fine — resolve() is only needed for dynamic paths
			'svelte/no-navigation-without-resolve': 'off',
			// {#each} keys are good practice but not required — downgrade to warning
			'svelte/require-each-key': 'warn',
			// Unused svelte-ignore comments from Svelte version upgrades — downgrade to warning
			'svelte/no-unused-svelte-ignore': 'warn',
			// {@html} for intentional trusted markup (structured data, markdown, SVG) — downgrade to warning
			'svelte/no-at-html-tags': 'warn',
			// Allow any in Svelte component scripts where complex typing is impractical
			'@typescript-eslint/no-explicit-any': 'warn',
			// Unused vars: _ prefix convention, support destructured arrays
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
				},
			],
		},
	},

	// Server-side TypeScript files (Node.js globals, relaxed any for complex server logic)
	{
		files: ['src/lib/server/**/*.ts', 'src/hooks.server.ts', 'src/routes/**/*.server.ts'],
		languageOptions: {
			globals: {
				...globals.node,
				...globals.es2021,
			},
		},
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			'@typescript-eslint/no-require-imports': 'warn',
		},
	},

	// API route TS files
	{
		files: ['src/routes/api/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'warn',
			// Underscore-prefixed destructured vars in API handlers
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
				},
			],
		},
	},

	// Test file overrides — much more relaxed for test code
	{
		files: ['tests/**/*.ts'],
		rules: {
			'@typescript-eslint/no-explicit-any': 'off',
			'@typescript-eslint/no-require-imports': 'off',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					varsIgnorePattern: '^_',
					destructuredArrayIgnorePattern: '^_',
				},
			],
		},
	},

	// Global ignores
	{
		ignores: [
			'node_modules/**',
			'.svelte-kit/**',
			'.claude/**',
			'.vercel/**',
			'build/**',
			'dist/**',
			'static/**',
			'*.config.js',
			'*.config.ts',
			'*.config.mjs',
			'*.config.cjs',
			'scripts/**',
			'lighthouserc.js',
		],
	}
);
