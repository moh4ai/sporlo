# Sporlo — Sprint 0 Deploy (Day 5)

End-of-week ritual: push the walking skeleton to Vercel so the founder can demo at any URL, not just localhost.

Two Vercel projects come out of this one repo: `sporlo-app` (the club dashboard, eventually `app.sporlo.net`) and `sporlo-admin` (Sporlo HQ, eventually `admin.sporlo.net`). Both apps share the staging Supabase project (`sveqkaemfnvlqfgkbryu`).

---

## 1. Init git + push to GitHub

```powershell
git init
git add .
git status   # eyeball: no .env.local, no node_modules, no .next
git commit -m "Sprint 0 walking skeleton"
```

Create an empty repo at https://github.com/new — name it `sporlo` (private). DO NOT initialize it with a README.

Then:

```powershell
git remote add origin https://github.com/moh4ai/sporlo.git
git branch -M main
git push -u origin main
```

If push asks for credentials, use a Personal Access Token (Settings → Developer settings → PAT).

---

## 2. Vercel project: sporlo-app

1. https://vercel.com/new → Import Git Repository → pick `moh4ai/sporlo`.
2. **Project Name:** `sporlo-app`
3. **Framework Preset:** Next.js (auto-detected)
4. **Root Directory:** `apps/app`
5. **Build & Output:** leave defaults — `vercel.json` overrides them with the monorepo-aware commands
6. **Environment Variables** (paste from your local `apps/app/.env.local`):
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `SUPABASE_SERVICE_ROLE_KEY` — mark as **Production** + **Preview** + **Development**, but it's only used server-side
7. Click **Deploy**. First build takes 2-3 min.
8. After deploy, Vercel gives you `sporlo-app-<hash>.vercel.app`. Open it and run the Day-3 smoke test (sign up → wizard → 10 modules → sign out).

---

## 3. Vercel project: sporlo-admin

Same flow:

1. https://vercel.com/new → Import the SAME `moh4ai/sporlo` repo
2. **Project Name:** `sporlo-admin`
3. **Root Directory:** `apps/admin`
4. **Env vars:** same three keys (same Supabase staging project)
5. Deploy. Get `sporlo-admin-<hash>.vercel.app`. Sign in with your super_admin account, walk the Day-4 flow.

---

## 4. Custom domains (optional for demo, required for prod)

In Vercel project settings → Domains:

- `sporlo-app` → add `app.sporlo.net`
- `sporlo-admin` → add `admin.sporlo.net`

Vercel will tell you which DNS records to add at your registrar. Since `sporlo.net` already points at the marketing site (sporlo-web), make sure the `app` and `admin` subdomains are CNAME or A records pointing at Vercel — don't touch the apex.

If your DNS is at Cloudflare or wherever — gray-cloud (DNS only) for these records initially so SSL provisioning by Vercel works.

---

## 5. Smoke-test the deployed URLs

For `sporlo-app` (deployed URL):

- [ ] Open `/` → redirects to `/ar` → redirects to `/ar/sign-in`
- [ ] Sign up with a fresh test email
- [ ] Complete the 5-step wizard
- [ ] Land on the dashboard, all 10 module links work
- [ ] Switch locale → RTL flips
- [ ] Sign out → back to `/ar/sign-in`

For `sporlo-admin` (deployed URL):

- [ ] Open `/` → redirects to `/ar/sign-in`
- [ ] Sign in with your super_admin account
- [ ] `/ar/clubs` shows orgs (including the new one from the smoke test above)
- [ ] Click into a club → impersonate → audit_log row written
- [ ] Sign out

---

## 6. Loom recording (2 min)

Six beats, ~20 sec each:

1. Open the deployed app URL, in Arabic. Show the sign-in card branded as Sporlo.
2. Sign up with a fresh email. Land in the wizard.
3. Click through the 4 wizard steps. Show the slug field, the color picker, the department toggles, the "you'll be the club admin" confirmation.
4. Finish setup → land on the dashboard. Pan the sidebar showing all 10 modules in Arabic.
5. Flip to English. Show RTL → LTR.
6. (Optional cliffhanger) Open admin.sporlo.net in a new tab, show the new club in the list and the audit-log preview.

Aim for under 2 minutes. Don't narrate every click — let the visuals carry it.

---

## 7. Moyasar merchant application (start the KYC clock)

This is on the critical path for Phase 1, NOT Sprint 0 — but the application has a 2-3 week processing time so Day 5 is the right place to fire it.

Where: https://moyasar.com/en/business

You'll need:
- Saudi Commercial Registration (CR) number for the entity that will receive payments
- Authorized signatory ID (your national ID)
- Bank IBAN of the entity
- Brief business description (Sporlo's CR + the "multi-tenant SaaS for sports clubs" framing works)
- Expected monthly volume (you can give a realistic range; doesn't affect approval)

Submit on the test environment first if you're not sure — they let you build against test keys before approving production.

Once approved, the production keys go into **Vercel env vars for `sporlo-app` only** (admin doesn't process payments). NEVER put them in `.env.local` checked into git; the staging Supabase project never sees them either.

---

## Notes on monorepo + Vercel

Each Vercel project deploys the WHOLE repo (Vercel clones the lockfile root) but runs `next build` against its `apps/<x>` root directory. The `vercel.json` in each app's directory tells Vercel to `cd ../.. && corepack pnpm install` first so workspace deps resolve. If you change something in `packages/*`, both apps redeploy because both depend on those packages.

Vercel auto-detects pnpm from the lockfile and corepack from the `packageManager` field in the root `package.json`. No extra config needed.
