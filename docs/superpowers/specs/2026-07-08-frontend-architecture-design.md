# Frontend Architecture Design

Date: 2026-07-08

## Scope

This work initializes only the frontend described in `SA.png`.

Included:

- Vite
- React
- TypeScript
- Vercel-ready frontend application structure
- API client placeholder for future backend integration

Excluded for now:

- FastAPI backend
- Docker and Nginx runtime setup
- Redis, Celery, PostgreSQL, pgvector, RDS
- AWS EC2 deployment files
- Monitoring stack
- GitHub Actions deployment pipeline

## Recommended Approach

Use `Vite + React + TypeScript` with a small but scalable application structure.

Install only the libraries needed for the frontend foundation:

- `react`
- `react-dom`
- `vite`
- `typescript`
- `react-router-dom`
- `axios`

Development tooling should include standard Vite TypeScript support. Additional UI, form, state, testing, and styling libraries should be added later when screen requirements are known.

## File Structure

Create the frontend with this structure:

```text
src/
  app/
    App.tsx
    router.tsx
  pages/
    HomePage.tsx
  components/
    layout/
      AppLayout.tsx
  features/
  shared/
    constants/
    utils/
  api/
    client.ts
  types/
  styles/
    globals.css
```

Root-level files:

```text
index.html
package.json
tsconfig.json
tsconfig.node.json
vite.config.ts
.env.example
.gitignore
README.md
```

## Architecture

`src/app` owns application wiring such as the root component and router.

`src/pages` contains route-level pages.

`src/components` contains reusable UI components. The initial layout component provides a stable place for navigation and page framing.

`src/features` is reserved for domain-specific modules once concrete product features are defined.

`src/shared` contains cross-feature constants, utilities, and other low-level helpers.

`src/api` contains the HTTP client. It reads `VITE_API_BASE_URL` from environment variables, but backend calls are not implemented yet.

`src/types` is reserved for shared TypeScript types.

## Data Flow

The initial app renders a home page through React Router.

Future backend communication should flow through `src/api/client.ts` instead of calling `fetch` or `axios` directly from pages and components.

Environment configuration should use:

```text
VITE_API_BASE_URL=
```

The value may stay empty during frontend-only development.

## Error Handling

The initial API client should set a base URL and JSON headers only.

Request-specific error handling will be added when backend endpoints exist. Until then, errors should not be hidden by a global interceptor because there is no defined API contract yet.

## Testing And Verification

For this initial setup, verification should include:

- Dependency installation succeeds.
- TypeScript build succeeds.
- Vite development server starts.
- The home page renders locally.

Automated tests are intentionally deferred until there are concrete components or feature behaviors to test.

## Open Decisions

Styling will start with plain CSS in `src/styles/globals.css`.

State management will not be installed yet. React local state and route-level data flow are enough until the app has shared client state requirements.

UI component libraries will not be installed yet because no product screen design has been provided.
