# TZW FireEx — Fire Extinguisher Management System

TZW LTD fire extinguisher inventory, inspections, maintenance, and reporting. Monorepo (`tzw-firex`) with a React client and Express API backed by PostgreSQL.

## Stack

| Layer | Technology |
| --- | --- |
| Frontend | React 19, TypeScript, Vite |
| API | Express 5, TypeScript |
| Database | PostgreSQL (Supabase), Drizzle ORM |
| Tooling | npm workspaces, Turborepo, Biome |

## Prerequisites

- Node.js 20+
- npm 10+
- A Supabase project (or local PostgreSQL)

## Getting started

```bash
git clone <repository-url>
cd tzw-firex
npm install
```

**API environment**

```bash
cp apps/api/.env.example apps/api/.env
# or: npm run env:setup
```

Edit `apps/api/.env` with your Supabase keys and database password. See comments in `.env.example` for pooler host and optional `DATABASE_URL` overrides.

**Database**

```bash
npm run db:migrate
npm run db:test    # optional connection check
```

**Development**

```bash
npm run dev
```

Starts the API (default port `8080`), waits for `/health`, then the web app at [http://localhost:5173](http://localhost:5173).

Optional: `npm run setup:git` installs repository git hooks.

## API documentation

Interactive docs are served by the API process. Replace `8080` with your `PORT` from `apps/api/.env` if different.

| Resource | URL |
| --- | --- |
| Swagger UI | [http://localhost:8080/docs](http://localhost:8080/docs) |
| OpenAPI 3.0 spec | [http://localhost:8080/docs.json](http://localhost:8080/docs.json) |
| Health check | [http://localhost:8080/health](http://localhost:8080/health) |

The spec is also proxied during dev at [http://localhost:5173/docs.json](http://localhost:5173/docs.json) (for tooling). Use the API host for Swagger UI — `/docs` is not proxied through Vite.

**Routes**

- Documentation and health: `/docs`, `/docs.json`, `/health`
- Application API: `/api/*` (e.g. `/api/auth/login`, `/api/extinguishers`)

**Swagger try-it-out**

Authentication uses httpOnly cookies. Run `POST /api/auth/login` (or register) in Swagger UI from the same browser session before calling protected endpoints. Global security is cookie-based (`id`); public routes (health, login, register) are marked accordingly in the spec.

## Project structure

```
apps/
  api/          REST API, Drizzle schema and migrations
  web/          React SPA
packages/
  contracts/    @tzw-firex/contracts — shared Zod schemas
  eslint-config/ @tzw-firex/eslint-config
  tsconfig/     @tzw-firex/tsconfig
scripts/        Dev orchestration, backups, env helpers
migrations/sql/ Ad-hoc SQL for Supabase SQL Editor
```

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | API + web (sequential startup) |
| `npm run build` | Production build (all workspaces) |
| `npm run lint` | Lint all workspaces |
| `npm run check-types` | Typecheck all workspaces |
| `npm run format` | Format with Biome |
| `npm run db:migrate` | Apply Drizzle migrations |
| `npm run db:backup` | PostgreSQL dump to `backups/` |

## License

ISC
