# PIIGuard Shield Frontend

## Quick Start

```bash
cd front_end
npm install
VITE_API_URL=http://localhost:8001/api/v1 npm run dev
```

Open `http://localhost:5173/login`.

Demo accounts:

- DPO: `dpo` / `dpo123`
- Analyst: `analyst` / `analyst123`

Auth flow:

`POST /sessions` returns a token, FE stores the session, then all API requests send
`Authorization: Bearer <token>`.

Main routes:

- `/dpo`: source scan, field decisions, build, publish
- `/analyst`: list published datasets and preview safe output

Checks before PR:

```bash
npm run typecheck
npm run lint
npm run test
npm run build
```
