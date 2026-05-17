# Sporlo — Product Monorepo

Multi-tenant SaaS platform for Saudi sports clubs. This monorepo holds the product (club dashboard + Sporlo HQ admin). The marketing landing page lives in a separate repo at `../sporlo-web`.

## Layout

```
sporlo/
├── apps/
│   ├── app/        # app.sporlo.net — club dashboard (Next.js 16 + next-intl)
│   └── admin/      # admin.sporlo.net — Sporlo HQ Super Admin (Day 4 of Sprint 0)
└── packages/
    ├── ui/         # design system (tokens + 10 primitives)
    ├── db/         # Supabase schema + RLS helpers (Day 2)
    ├── auth/       # role + department permission matrix (Day 2)
    ├── i18n/       # shared AR/EN message helpers (Day 4)
    └── governance/ # KPI event engine (Day 2 / Phase 1+)
```

## First-time setup

Node 24 ships corepack, so pnpm is one command away:

```powershell
# from this directory:
corepack enable
corepack prepare pnpm@9.15.0 --activate
pnpm install
```

Then run the dashboard:

```powershell
pnpm dev:app
# opens http://localhost:3000/ar (default locale Arabic, RTL)
```

## Stack

- Next.js 16 + React 19 + TypeScript 5
- Tailwind CSS v4 (tokens in `packages/ui/src/tokens.css`)
- next-intl 4 (AR default, EN secondary, both with `localePrefix: "always"`)
- Supabase (Postgres + RLS + Auth) — added Day 2
- Moyasar payments — Phase 1
- Vercel hosting

## Brand

Authoritative tokens: `packages/ui/src/tokens.css` (ported from `../sporlo-web/src/app/globals.css`, which itself was ported from `<OneDrive>/Sporlo/Business Development/عروض كلود/Sporlo/brand.css`).

- Primary: Sporlo Green `#0F6E3F`
- Ink/Paper neutrals
- Display EN: Baumans · Body EN: Manrope · AR: Rubik VF
- All radii from the brand spec (cards 20-28px, pills 9999px)

## Plan

Full plan at `C:\Users\Moh4A\.claude\plans\look-at-whatever-is-sequential-lampson.md`. Sprint 0 (Days 1-5) ships a walking skeleton — multi-tenant dashboard with 10 module stubs, real auth, real RLS. Then Phase 0-4 (14-20 weeks) builds out the full product.
