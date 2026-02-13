# SC2 Downloader Frontend

React + Vite frontend for browsing game quotes and building Claude Code sound setups.

## UI Architecture (Catalyst-style)

- `src/layouts/AppShell.jsx`: Responsive app shell with mobile drawer + desktop sidebar.
- `src/hooks/useQuotesAppState.js`: Central app state and list persistence orchestration.
- `src/components/Sidebar.jsx`: Navigation, game/faction switching, section browsing, search.
- `src/components/UnitPanel.jsx`: Top-level content router for home/search/setup/unit views.
- `src/components/recommended/`: Setup-specific panels (`SetupActionsPanel`, `RecommendedHooksPanel`).
- `src/components/units/UnitQuotesPanel.jsx`: Unit-level quote browsing.
- `src/components/quotes/QuoteResultsPanel.jsx`: Quote search result entrypoint.
- `src/contexts/NotificationContext.jsx`: In-app notifications (replaces alert/prompt UX).

## Styling

- Tailwind CSS v4 with custom faction colors in `src/index.css`.
- Shared UI tokens and surface styles in `src/styles/theme.css`.

## Scripts

- `npm run dev`: start local development server.
- `npm run build`: production build.
- `npm run preview`: preview production build.
- `npm run lint`: run ESLint.
- `npm run test`: run Vitest tests once.
- `npm run test:watch`: run Vitest in watch mode.
