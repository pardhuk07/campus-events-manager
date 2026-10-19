# ACM Conflict-Aware Events & Expenses Manager

> Centralized event and expense management system for ACM NIT Surat

## 🚀 Quick Start

### Prerequisites
- Node.js v18+
- A [Neon.tech](https://neon.tech) account (free PostgreSQL)
- A [Cloudinary](https://cloudinary.com) account (free plan)

### 1. Clone the repository
```bash
git clone https://github.com/YOUR_ORG/acm-conflict-manager.git
cd acm-conflict-manager
```

### 2. Install dependencies
```bash
npm install
```

### 3. Set up environment variables
```bash
cp .env.example .env.local
# Fill in your values in .env.local
```

> **Get your DATABASE_URL** from Neon.tech:
> 1. Go to [neon.tech](https://neon.tech) → Create account → New Project
> 2. Copy the connection string from the dashboard
> 3. Paste it as `DATABASE_URL` in `.env.local`

> **Generate NEXTAUTH_SECRET**:
> ```bash
> # On Windows PowerShell:
> [Convert]::ToBase64String((1..32 | ForEach-Object { [byte](Get-Random -Max 256) }))
> ```

### 4. Push database schema
```bash
npm run db:push
```

### 5. Seed demo data (optional)
```bash
npm run db:seed
```

Demo credentials after seeding:
| Role | Email | Password |
|---|---|---|
| Core Verifier | core@acm.nitsu.ac.in | password123 |
| Club Executive | exec@acm.nitsu.ac.in | password123 |
| Member | member@acm.nitsu.ac.in | password123 |

### 6. Start development server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 🏗️ Tech Stack

| Layer | Technology |
|---|---|
| Frontend | Next.js 15, Tailwind CSS, Shadcn UI |
| Calendar | FullCalendar |
| Backend | Next.js API Routes |
| Database | PostgreSQL (Neon.tech) |
| ORM | Prisma |
| Auth | NextAuth.js v5 |
| Storage | Cloudinary |
| Charts | Recharts |

## 👥 Team Division

| Person | Module |
|---|---|
| Person 1 | Event Management |
| Person 2 | Conflict Detection |
| Person 3 | Expenses + Budget |
| Person 4 | Auth + Dashboard + Integration |

## 📂 Folder Structure

```
app/
├── (auth)/login/         → Login page
├── (protected)/
│   ├── dashboard/        → Main dashboard
│   ├── events/           → Event management (P1)
│   ├── conflicts/        → Conflict detection (P2)
│   ├── expenses/         → Expense management (P3)
│   └── budgets/          → Budget management (P3)
└── api/                  → All API routes

lib/
├── auth/                 → NextAuth config
├── prisma/               → Prisma client
├── cloudinary/           → Cloudinary helpers
├── validations/          → Zod schemas
└── constants/            → Shared constants

prisma/
├── schema.prisma         → Database schema (SHARED)
└── seed.ts               → Demo data seeder
```

## 🌿 Git Workflow

```bash
# Create your feature branch
git checkout -b feature/your-module

# Work, then commit
git add .
git commit -m "feat: add event creation"
git push origin feature/your-module

# Create PR → team reviews → merge to main
```

## ⚠️ Important Rules

1. **NEVER** push directly to `main`
2. **NEVER** commit `.env.local`
3. **NEVER** change `prisma/schema.prisma` without team discussion
4. Always use `successResponse()` / `errorResponse()` from `lib/api/response.ts`
5. Always use constants from `lib/constants/index.ts`

## 🗄️ Database Commands

```bash
npm run db:push      # Push schema changes to DB
npm run db:migrate   # Create a migration
npm run db:generate  # Regenerate Prisma client
npm run db:studio    # Open Prisma Studio (DB GUI)
npm run db:seed      # Seed demo data
```
