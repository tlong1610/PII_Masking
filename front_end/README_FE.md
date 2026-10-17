# PIIGuard Shield Frontend

React 18 + TypeScript + Vite frontend for PIIGuard Shield.

## Quick Start

From the repository root:

```bash
cd front_end
npm install
npm run dev
```

Open:

- `http://localhost:5173/login` - demo role login
- `http://localhost:5173/dpo` - DPO review and policy governance workflow
- `http://localhost:5173/analyst` - Analyst published dataset preview and export

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
http://localhost:8000/api/v1
```

Override with:

```bash
VITE_API_URL=http://localhost:8000/api/v1 npm run dev
```

Or go through the Vite dev proxy (same origin, no CORS). `/api` is proxied to `http://localhost:8000` by default; set `VITE_PROXY_TARGET` when the backend runs elsewhere (docker-compose exposes `8002`):

```bash
VITE_API_URL=/api/v1 npm run dev
VITE_API_URL=/api/v1 VITE_PROXY_TARGET=http://localhost:8002 npm run dev
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
POST /sessions -> store token in memory -> send Authorization: Bearer <token> on API calls
```

## Architecture & Features

The app follows the feature-sliced structure described in `AGENTS.md`:

```text
src/
  app/                  # providers, routing, theme
  pages/                # route-level composition
  features/
    auth/               # demo login & RBAC guards
    piiReview/          # DPO and Analyst workflows
  shared/               # reusable UI and config
```

### Key Frontend Capabilities

1. **Cloud Data Sources & Dynamic Introspection:**
   - Supports **Cloud PostgreSQL** (`postgresql://`, `postgres://`) and **Cloud MongoDB** (`mongodb://`, `mongodb+srv://` for Atlas).
   - Dialog `AddSourceDialog` allows testing connections and fetching database scope dynamically.
2. **Interactive Visualizations (React Flow + Dagre):**
   - `SourceScopePickerDiagram`: Visual table dependency graph for selecting scan scope with automatic hierarchical layout.
   - `ErdLineageDiagram`: Full lineage and ERD diagram showing database tables, column types, transformations (`MASK`, `HMAC`, `KEEP`, `DROPPED`), and PK/FK links.
3. **DPO Governance & Risk Assessment Workspace (`DpoReviewExperienceMVP`):**
   - **4 tabs:** Overview & PII Schema, Risk & Insights, Audit History, and Dữ liệu cho Analyst (Verifier + snapshot preview).
   - The review UI does not render source values. However, an approved PII `KEEP` exception can put the original value into a published snapshot; do not describe Analyst access as unconditionally Zero Raw-PII until the backend blocks or safely transforms that path.
   - **Inspector Drawer (`FieldPolicyDrawerContent`):**
     - Detailed legal basis breakdown (Decree 13/2023/NĐ-CP & Personal Data Protection Law 2025).
     - Join key partner alerts and automatic action synchronization.
     - Confirmation of `UNKNOWN` fields as non-personal data (`notPersonal: true`).
     - Mandatory justifications for AI overrides and exception deadlines (`exceptionUntil`).
4. **Analyst Experience (`AnalystDatasetExperienceMVP`):**
   - Table-based data preview (`previewDataset`) with limit selection (20, 50, 100, 200 rows).
   - Safe CSV download with automatic exclusion of `DROPPED` columns.
   - Analyst preview shows published snapshot values. PII `KEEP` exceptions are a known privacy gap; see the warning above.

## Brand & Mascot (Pango)

- Design source: Figma [PIIGuard Shield — Pango Mascot Kit](https://www.figma.com/design/xcSramnWgGISlpaGiHe4MQ) — component `Pango` (7 `State` variants) and `Logo`.
- Assets: `src/assets/mascot/pango-<pose>.webp` (480px, ~40–50 kB each), `src/assets/brand/logo.webp`; favicon/touch icons in `public/`.
- Components (`@/shared/ui`):
  - `<Mascot pose="scanning" size={120} float />` — poses: `default`, `scanning`, `detected`, `awaiting`, `loading`, `error`, `protected`. Decorative by default (`alt=""`); pass `label` only when the image carries meaning not said in text. `float` bobbing respects `prefers-reduced-motion`.
  - `<MascotLoader pose="loading" title="…" />` — busy state with `role="status"`.
  - `StateNotice` shows Pango automatically (`empty` → `default`, `error` → `error`; override with `pose`).
  - `BrandLogo` — app mark used in `AppShell` and the login screen.
- Where it appears: login brand panel, DPO source loading / scanning, empty and error notices, Analyst loading / no dataset, and the status banner of tab “Dữ liệu cho Analyst” (`awaiting` / `error` / `protected`).
- Plan & tasks: [Sprint 05](tx/planing/sprints/sprint_05_brand_mascot.md), FE-23 → FE-26 in [TASKS_INDEX](tx/tasks/TASKS_INDEX.md).

## Verification Checklist

Run before opening a PR:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
