# ADR 0002: Tech Stack

Use the stack required by `front_end/AGENTS.md`.

```mermaid
flowchart TD
  React["React 18 + TypeScript"] --> MUI["MUI Material UI"]
  React --> Router["React Router"]
  React --> Query["TanStack Query"]
  Query --> API["Backend API"]
  API --> Zod["Zod validation"]
  Forms["React Hook Form"] --> Zod
  Tests["Vitest + RTL"] --> React
```

Frontend baseline:

- Build tool: Vite
- UI: MUI + Roboto via `@fontsource`
- Server state: TanStack Query
- Validation: Zod
- Forms: React Hook Form
- Tests: Vitest + React Testing Library
