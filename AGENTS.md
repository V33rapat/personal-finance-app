# Personal Finance App

Dual-app repository: Next.js frontend + NestJS backend. No shared workspace.

## Apps

| App | Framework | Run Command | Key Tools |
|-----|-----------|------------|-----------|
| `apps/frontend` | Next.js 16.2.1, React 19 | `cd apps/frontend && npm run dev` | TailwindCSS v4 |
| `apps/backend` | NestJS 11, Prisma | `cd apps/backend && pnpm run start:dev` | Prisma ORM |

## Important

- **Frontend**: Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` before writing code.
- **Backend**: Uses Prisma - run `npx prisma migrate dev` after schema changes.
- **Backend tests**: `pnpm run test` (unit), `pnpm run test:e2e` (e2e).