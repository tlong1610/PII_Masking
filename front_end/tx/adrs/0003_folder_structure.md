# ADR 0003: Folder Structure

```text
src/
  app/                  # providers, routes, theme
  pages/                # route-level composition
  features/
    auth/               # login/session role flow
    piiReview/          # DPO + Analyst dataset workflow
  shared/
    config/             # app routes/config
    ui/                 # reusable UI components
```

Feature shape:

```text
features/<feature>/
  api/                  # HTTP calls, DTO validation
  model/                # pure types/rules
  hooks/                # TanStack Query orchestration
  components/           # MUI UI
  index.ts              # public exports
```

Runtime architecture:

```mermaid
flowchart TD
  Browser["Browser"] --> AppShell["AppShell"]
  AppShell --> Login["Auth Feature"]
  AppShell --> DPO["PII Review: DPO"]
  AppShell --> Analyst["PII Review: Analyst"]
  DPO --> Hooks["Feature hooks"]
  Analyst --> Hooks
  Hooks --> RealAPI["realPiiReviewApi"]
  Hooks --> AuthAPI["auth api"]
  RealAPI --> Backend["FastAPI backend"]
  AuthAPI --> Backend
```

Raw PII must not be rendered in any route.
