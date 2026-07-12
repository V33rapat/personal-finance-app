# ꒰ᐢ.   ̫ .ᐢ꒱ Walpaca — Personal Finance Management App

Walpaca is a personal finance web application designed to help users track income and expenses, manage budgets, and organize financial data in a structured and intuitive way. It supports multi-level wallet management and investment portfolio tracking in a single platform.

---

## ✨ Features

* 📊 Daily income & expense tracking (past entries allowed, no future entries)
* 💼 **Multi Wallet** system
* 🧩 **Nested Wallets** (hierarchical structure)
* 🔁 Transfer money between wallets
* 📈 **Investment Portfolio** support
* 📊 Analytics Dashboard:
  * Daily / Weekly / Monthly / Yearly summaries
  * Most / least spending categories
* ⚡ Transaction Templates for quick input
* 🔐 Authentication (Register / Login)
* 🛠️ Roles:
  * Admin
  * User

---

## 🧠 Concept

> "Your money should be managed with clarity and structure."

Walpaca helps you:
* Separate finances by purpose (spending / saving / investing)
* Gain clear financial insights
* Take control of your financial behavior

---

## 🏗️ Tech Stack

### Package Managers
| App | Package Manager |
|-----|-----------------|
| Frontend | npm |
| Backend | pnpm |

### Frontend
| Tool | Version |
|------|---------|
| Next.js | 16.2.1 |
| React | 19 |
| TypeScript | 5.7.3 |
| Tailwind CSS | 4 |
| next-themes | latest |

### Backend
| Tool | Version |
|------|---------|
| NestJS | 11 |
| Prisma | 5.22 |
| PostgreSQL | Docker (local) / Supabase (production) |

---

## 📁 Project Structure

```
personal-finance-app/
├── apps/
│   ├── frontend/           # Next.js App
│   │   └── src/
│   │       ├── app/        # App Router pages
│   │       │   ├── (auth)/ # Auth pages (login, register)
│   │       │   └── api/    # BFF routes
│   │       ├── components/ # Reusable UI components
│   │       └── feature/    # Feature-based architecture
│   │           └── auth/   # Auth feature (components, hooks, types, lib)
│   │
│   └── backend/            # NestJS API
│       └── src/
│           ├── auth/      # Auth module
│           └── prisma/    # Prisma service
│
├── AGENTS.md              # Developer instructions
└── README.md
```

---

## 🔄 Architecture

```
┌─────────────────┐     ┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Next.js        │ →   │ BFF Routes  │ →   │ NestJS API   │ →   │ PostgreSQL  │
│  (Frontend)     │     │ /api/auth/* │     │ (Backend)    │     │ (Supabase)  │
└─────────────────┘     └─────────────┘     └──────────────┘     └─────────────┘
```

- **BFF Pattern**: Frontend calls `/api/auth/*` routes which proxy to backend
- **Why BFF**: Security (hide backend URL), CORS handling, flexibility

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm (for frontend)
- pnpm (for backend)
- Supabase account (for PostgreSQL)

### 1. Clone Repository
```bash
git clone https://github.com/your-username/walpaca.git
cd walpaca
```

### 2. Start the local database

The local environment uses PostgreSQL in Docker:

```bash
docker compose up -d
docker ps
```

To stop the database:

```bash
docker compose down
```

### 3. Configure environment variables

Copy the examples before starting the applications:

```bash
copy apps\frontend\.env.example apps\frontend\.env
copy apps\backend\.env.example apps\backend\.env
```

On macOS/Linux, use `cp` instead of `copy`.

For local Docker, the Backend database values are:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/personal_finance?schema=public
DIRECT_URL=postgresql://postgres:postgres@localhost:5432/personal_finance?schema=public
PORT=3001
JWT_SECRET=use-a-local-development-secret
```

The Frontend BFF uses:

```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

For production, replace the database values with the connection strings from `Supabase Dashboard > Project Settings > Database > Connect`. Set the production `JWT_SECRET` in Render and never commit real `.env` files.

### 4. Setup Backend (pnpm)

```bash
cd apps/backend
pnpm install
npx prisma generate
pnpm run start:dev
```

Backend runs on `http://localhost:3001`.

### 5. Setup Frontend (npm)

Open a second terminal:

```bash
cd apps/frontend
npm install
npm run dev
```

Frontend runs on `http://localhost:3000`.

Run both applications at the same time for the complete local flow.

---

## 🛠️ Commands

### Frontend
```bash
npm run dev      # Start development server (http://localhost:3000)
npm run build    # Build for production
npm run lint     # Run ESLint
```

### Backend (pnpm)
```bash
pnpm run start:dev      # Start with hot reload
pnpm run build          # Build for production
pnpm run test           # Run unit tests
pnpm run test:e2e       # Run e2e tests
```

### Prisma
```bash
cd apps/backend
npx prisma generate    # Generate Prisma Client after schema changes
npx prisma db pull     # Read the current database schema into Prisma
npx prisma studio      # Open the database GUI
```

Use `prisma migrate dev` only when working with a tracked migration workflow. Do not use `prisma db push` as the normal production deployment strategy because it does not create a migration history.

---

## 🗄️ Database Schema

### Core Models
- **Users** - Authentication & user data
- **Wallets** - Multi-level wallet system (supports nesting)
- **Transactions** - Income/expense records
- **Transfers** - Wallet-to-wallet transfers
- **Categories** - Transaction categories (per user)
- **TransactionTemplates** - Quick input templates

### Database environments

```text
Local development:  Docker PostgreSQL
Production:         Supabase PostgreSQL
Prisma Client:      NestJS Backend only
```

---

## 🎨 Design System

- **Theme**: Light/Dark mode using `next-themes`
- **Color Palette**: Violet/Indigo gradient accent
- **Pattern**: Clean, minimal UI with subtle background effects
- **Responsive**: Mobile-first design

---

## ⚠️ Important Notes

1. **Next.js 16** has breaking changes — check `node_modules/next/dist/docs/` before writing code
2. **Theme Provider**: Add `suppressHydrationWarning` to `<html>` tag in `layout.tsx`
3. **BFF Routes**: The browser calls `/api/*` routes. Do not call the NestJS Backend directly from client components.
4. **Prisma**: Run `npx prisma generate` after schema changes.
5. **Secrets**: Never commit `.env`, database passwords, JWT secrets, or Supabase connection strings.
6. **Date rules**: Transaction and transfer dates cannot be in the future.
7. **Wallet rules**: Transfers validate wallet ownership, prevent the same source and destination wallet, and require sufficient balance.

---

## 🚀 Deployment

The production architecture is:

```text
Browser
  ↓
Next.js Frontend + BFF (Vercel)
  ↓
NestJS Backend (Render)
  ↓
Supabase PostgreSQL
```

### Supabase

Supabase hosts the production PostgreSQL database. Restore or migrate the schema and data before deploying the Backend. Keep database connection strings only in Backend environment variables.

### Render Backend

Create a Render Web Service from the repository with:

```text
Root Directory: apps/backend
Build Command:  pnpm install --frozen-lockfile && pnpm prisma generate && pnpm run build
Start Command:  pnpm run start:prod
```

Set these Render environment variables:

```env
DATABASE_URL=<SUPABASE_DATABASE_URL>
DIRECT_URL=<SUPABASE_DIRECT_URL>
JWT_SECRET=<LONG_RANDOM_PRODUCTION_SECRET>
PORT=3001
```

Copy the public Render Backend URL for the Frontend configuration.

### Vercel Frontend

Create a Vercel Project from the same repository with:

```text
Root Directory: apps/frontend
Framework:      Next.js
Production Branch: main
```

Set this Vercel environment variable for the Production environment:

```env
NEXT_PUBLIC_BACKEND_URL=https://your-backend.onrender.com
```

The URL must not end with `/`. Vercel uses `main` for Production and creates Preview Deployments for other branches.

---

## 🔀 Git Workflow

Keep `main` deployable and use one branch for each feature or focused fix:

```text
main
├── feature/transfer-history
├── feature/transaction-template
└── fix/login-url
```

Typical workflow:

```bash
git switch main
git pull origin main
git switch -c feature/my-feature

# make changes and run checks
git add .
git commit -m "feat: describe the change"
git push -u origin feature/my-feature
```

Open a Pull Request, test the Vercel Preview Deployment, then merge into `main` for Production.

---

## 📌 Roadmap

- [x] Authentication (Register / Login)
- [x] BFF Layer for Auth
- [x] Dashboard UI
- [x] Wallet Management
- [x] Transaction System
- [x] Transfer System
- [x] Category Management and Combobox
- [x] Transaction Templates
- [x] Light/Dark Theme
- [x] Responsive UI
- [ ] Analytics & Charts
- [ ] Investment Portfolio Enhancements

---

## 🤖 AI Usage

This project uses AI tools to assist development:
- **OpenCode** - Code generation, bug fixing, refactoring, architecture design, development
- **Codex** - Code generation, bug fixing, refactoring
- **ChatGPT** - System planning, architecture, feature ideation

> All AI-generated content has been reviewed and understood by the developer.

---

## 👨‍💻 Author

Developed by Veerapat Visaidsombat

---

## 📄 License

For educational and personal use
