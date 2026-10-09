# PIIGuard Shield Frontend

React + TypeScript + Vite frontend for the PIIGuard Shield MVP demo.

## Quick Start

From the repository root:

```bash
cd front_end
npm install
npm run dev
```

Open:

- `http://localhost:5173/login` - demo role login
- `http://localhost:5173/dpo` - DPO review workflow
- `http://localhost:5173/analyst` - Analyst published dataset view

If port `5173` is busy, Vite will suggest another port in the terminal.

## Available Scripts

```bash
npm run dev        # Start local Vite dev server
npm run typecheck  # Run TypeScript strict checks
npm run lint       # Run ESLint, including architecture boundaries
npm run test       # Run Vitest tests
npm run build      # Typecheck and create production build
npm run preview    # Preview the production build locally
```

## Current API Mode

The frontend calls the real backend API by default:

```text
http://localhost:8001/api/v1
```

Override with:

```bash
VITE_API_URL=http://localhost:8001/api/v1 npm run dev
```

Main integration file:

```text
src/features/piiReview/api/realPiiReviewApi.ts
```

Auth demo accounts:

- DPO: `dpo` / `dpo123`
- Analyst: `analyst` / `analyst123`

Auth flow:

```text
POST /sessions -> store token -> send Authorization: Bearer <token> on API calls
```

The login screen keeps a local demo fallback only when the backend is unreachable. API integration is not considered complete until the backend E2E flow passes.

## Architecture

The app follows the feature-sliced structure described in `AGENTS.md`:

```text
src/
  app/                  # providers, routing, theme
  pages/                # route-level composition
  features/
    auth/               # demo login
    piiReview/          # DPO and Analyst workflows
  shared/               # reusable UI and config
```

Important rules:

- Components do not call network APIs directly.
- Feature hooks own TanStack Query orchestration.
- Feature `api/` validates boundary data with Zod.
- `model/` stays pure TypeScript.
- UI does not display raw PII.

## Demo Screenshots

Screenshots are stored in:

```text
screenshots/login.png
screenshots/dpo-source.png
screenshots/analyst.png
```

## Verification Checklist

Run before opening a PR:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
