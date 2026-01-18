# Deployment Guide

## Production Build

```bash
npm run build
```

This creates an optimized production build in the `.svelte-kit/output` directory.

## Preview Production Build

```bash
npm run preview
```

Serves the production build at `http://localhost:4173`.

## Environment Variables

This application uses client-side only storage (localStorage) and doesn't require server-side environment variables for basic functionality.

### Optional Configuration

If you need to add server-side features in the future, create a `.env` file:

```bash
# Example for future use
VITE_API_URL=https://api.example.com
VITE_ANALYTICS_ID=your-analytics-id
```

Note: Environment variables must be prefixed with `VITE_` to be accessible in client-side code.

## Static Hosting

The production build is static and can be deployed to any static hosting service:

### Vercel
1. Connect your repository to Vercel
2. Vercel automatically detects SvelteKit and builds correctly
3. Deploy!

### Netlify
1. Connect your repository to Netlify
2. Set build command: `npm run build`
3. Set publish directory: `.svelte-kit/output/client`
4. Deploy!

### GitHub Pages
1. Run `npm run build`
2. Deploy the contents of `.svelte-kit/output/client` to the `gh-pages` branch

## PWA Support

The application includes PWA configuration via `vite-plugin-pwa`. The build will generate:
- A service worker for offline support
- A web app manifest
- Optimized assets

## Performance Targets

- Main bundle (uncompressed) < 100KB
- Total bundle (gzipped) < 200KB
- First Contentful Paint < 1.5s
- Time to Interactive < 3s

## Browser Support

- Chrome/Edge (latest)
- Firefox (latest)
- Safari (latest)
- Mobile browsers (iOS Safari, Chrome Mobile)

Minimum versions:
- Chrome 90+
- Firefox 88+
- Safari 14+
- iOS Safari 14+
