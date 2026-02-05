# SecretBox

Secure environment variables management app with end-to-end encryption.

## Stack

- **Framework**: Next.js 15 (App Router)
- **Database**: Neon (PostgreSQL serverless)
- **ORM**: Prisma 6
- **Auth**: NextAuth v5 (credentials + GitHub)
- **Styling**: Tailwind CSS + shadcn/ui
- **State**: Zustand
- **Encryption**: Web Crypto API (AES-256-GCM)

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── (auth)/            # Login/Register pages
│   ├── (dashboard)/       # Protected dashboard pages
│   └── api/               # API routes
├── components/            # React components
│   └── ui/               # shadcn/ui components
├── lib/
│   ├── actions/          # Server actions (CRUD)
│   ├── crypto/           # Encryption utilities
│   ├── auth.ts           # NextAuth config
│   ├── auth.config.ts    # Edge-compatible auth config
│   └── db.ts             # Prisma client
├── stores/               # Zustand stores
└── types/                # TypeScript types
```

## Key Concepts

### Two-Password System
1. **Account password**: For login (stored hashed with bcrypt)
2. **Master password**: For encryption (never stored, derives crypto key)

### End-to-End Encryption
- All secrets encrypted in browser before sending to server
- Server never sees plaintext values
- Key derivation: PBKDF2 with 100k iterations
- Encryption: AES-256-GCM

### Data Model
- **User** → has many **Projects**
- **Project** → has many **Environments** (dev, staging, prod)
- **Environment** → has many **Variables**
- **User** → has many **GlobalVariables** (shared across projects)

## Commands

```bash
npm run dev      # Start dev server
npm run build    # Build for production
npm run lint     # Run ESLint
npx prisma studio # Open Prisma database GUI
```

## Environment Variables

Required in `.env`:
- `DATABASE_URL` - Neon connection string
- `AUTH_SECRET` - NextAuth secret
- `AUTH_URL` - App URL (http://localhost:3000 for dev)

## Deployment

- **Vercel**: Auto-deploys on push to `main`
- **URL**: https://mysecretbox.vercel.app
- **Repo**: https://github.com/tommar21/secret-box
