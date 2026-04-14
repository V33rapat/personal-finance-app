# 🦙 Walpaca — Personal Finance Management App

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
| PostgreSQL | Supabase |

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

### 2. Setup Frontend (npm)
```bash
cd apps/frontend
npm install
npm run dev
```

### 3. Setup Backend (pnpm)
```bash
cd apps/backend
pnpm install
pnpm run start:dev
```

### 4. Environment Variables

**Backend** (`apps/backend/.env`):
```env
DATABASE_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
DIRECT_URL="postgresql://<user>:<password>@<host>:<port>/<database>"
```

**Frontend** (`apps/frontend/.env.local`):
```env
NEXT_PUBLIC_BACKEND_URL=http://localhost:3001
```

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
npx prisma generate    # Generate Prisma Client (after schema changes)
npx prisma migrate dev # Run migrations
npx prisma studio      # Open database GUI
```

---

## 🗄️ Database Schema

### Core Models
- **Users** - Authentication & user data
- **Wallets** - Multi-level wallet system (supports nesting)
- **Transactions** - Income/expense records
- **Transfers** - Wallet-to-wallet transfers
- **Categories** - Transaction categories (per user)
- **TransactionTemplates** - Quick input templates

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
3. **BFF Routes**: Always use `/api/auth/*` endpoints, never call backend directly from client
4. **Prisma**: Run `npx prisma generate` after any schema changes

---

## 📌 Roadmap

- [x] Authentication (Register / Login)
- [x] BFF Layer for Auth
- [ ] Dashboard UI
- [ ] Wallet Management
- [ ] Transaction System
- [ ] Analytics & Charts
- [ ] Investment Portfolio
- [ ] Theme Customization
- [ ] Mobile Responsive UI

---

## 🤖 AI Usage

This project uses AI tools to assist development:
- **OpenCode** - Code generation, architecture design, development
- **ChatGPT** - System planning, architecture, feature ideation

> All AI-generated content has been reviewed and understood by the developer.

---

## 👨‍💻 Author

Developed by Veerapat Visaidsombat

---

## 📄 License

For educational and personal use