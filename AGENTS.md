# Personal Finance App

Dual-app repository: Next.js frontend + NestJS backend. No shared workspace.

## Package Managers

- **Frontend**: npm (uses `package-lock.json`)
- **Backend**: pnpm (uses `pnpm-lock.yaml`) - must use pnpm for tests

## Apps

| App | Framework | Run Command | Key Tools |
|-----|-----------|------------|-----------|
| `apps/frontend` | Next.js 16.2.1, React 19, TailwindCSS v4 | `cd apps/frontend && npm run dev` | next-themes |
| `apps/backend` | NestJS 11, Prisma | `cd apps/backend && npm run start:dev` | Prisma ORM |

## Project Structure

```
apps/frontend/src/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Auth routes (login, register)
│   │   ├── login/page.tsx
│   │   └── register/page.tsx
│   └── api/auth/                 # BFF routes (proxy to backend)
│       ├── register/route.ts
│       └── login/route.ts
├── feature/auth/                 # Auth feature (clean architecture)
│   ├── components/               # UI components
│   ├── hooks/                    # Business logic hooks
│   ├── lib/                      # Validation functions
│   └── types/                    # Type definitions
└── components/ui/               # Reusable UI components
```

## Development Notes

- **Frontend**: Next.js 16 has breaking changes. Read `node_modules/next/dist/docs/` before writing code.
- **Language**: UI defaults to Thai (`lang="th"` in layout.tsx)
- **BFF Pattern**: Use `/api/auth/*` routes to proxy to backend (don't call backend directly from client)
- **Theme**: Uses `next-themes` with `ThemeProvider` in `layout.tsx`. Add `suppressHydrationWarning` to `<html>`.
- **Backend**: Uses Prisma - run `npx prisma generate` after schema changes, `npx prisma migrate dev` for migrations.

## Commands

```bash
# Frontend
cd apps/frontend && npm run dev

# Backend
cd apps/backend && npm run start:dev

# Backend tests
cd apps/backend && pnpm run test              # unit
cd apps/backend && pnpm run test:e2e         # e2e

# Prisma
cd apps/backend && npx prisma generate
cd apps/backend && npx prisma migrate dev
```