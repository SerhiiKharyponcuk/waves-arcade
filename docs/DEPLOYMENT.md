# Public Deployment Guide

This guide is for publishing Waves Arcade so other players can open it on the internet.

Recommended stack:

- Frontend: Vercel
- Backend API: Render
- Database: Neon PostgreSQL
- Ads: Google Ad Manager for web rewarded ads and banners

## What You Need First

Create accounts:

- GitHub
- Neon
- Render
- Vercel
- Google Ad Manager or Google publisher account

Do not share passwords, bank details, passport documents, or Google payment access with anyone. Those are entered only by you inside the official provider dashboards.

## 1. Put The Code On GitHub

Vercel and Render work best when they can read the project from GitHub.

Create a private GitHub repository, push this project there, then connect Vercel and Render to that repository.

## 2. Create Neon Database

In Neon:

1. Create a new project.
2. Choose a nearby region, for example Europe.
3. Copy the PostgreSQL connection string.
4. Use the pooled or standard connection string with SSL enabled.

It will look similar to:

```env
postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require
```

This becomes `DATABASE_URL` in Render.

## 3. Deploy Backend On Render

Render can use the `render.yaml` file in the project root.

Create a new Blueprint or Web Service from the GitHub repository.

Important Render environment variables:

```env
NODE_ENV=production
DATABASE_URL=your-neon-postgres-url
JWT_ACCESS_SECRET=long-random-secret
JWT_REFRESH_SECRET=another-long-random-secret
CORS_ORIGIN=https://your-vercel-app.vercel.app
ADMIN_EMAILS=your-admin-email@example.com
PASSWORD_RESET_BASE_URL=https://your-vercel-app.vercel.app
EMAIL_PROVIDER=resend
EMAIL_FROM=Waves Arcade <noreply@your-domain.com>
RESEND_API_KEY=your-resend-api-key
EMAIL_VERIFICATION_REQUIRED=false
AD_PROVIDER=google_ad_manager
AD_SESSION_TTL_SECONDS=600
```

Email verification and password reset use these email settings. Keep `EMAIL_VERIFICATION_REQUIRED=false` while no public email provider is configured. Registration and login will work immediately. Change it to `true` only after verification emails can reach every player.

Render build command:

```bash
npm install --include=dev && npm run build:backend:prod
```

Render pre-deploy command:

```bash
npm run db:migrate:prod
```

Render start command:

```bash
npm run start --workspace @waves/backend
```

If the Render service has `Root Directory` set to `apps/backend`, use these commands instead:

```bash
# Build Command
npm install --include=dev && npm run build:backend:prod

# Pre-Deploy Command
npm run db:migrate:prod

# Start Command
npm run start
```

After deployment, check:

```text
https://your-render-api.onrender.com/api/health
```

You should see:

```json
{ "status": "ok", "service": "waves-backend" }
```

## 4. Deploy Frontend On Vercel

Vercel uses `vercel.json`.

Frontend environment variables:

```env
VITE_API_URL=https://your-render-api.onrender.com/api
VITE_GAME_BUILD=production
VITE_AD_PROVIDER=google_ad_manager
VITE_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH=/123456789/waves_rewarded
VITE_GOOGLE_AD_MANAGER_BANNER_AD_UNIT_PATH=/123456789/waves_lobby_banner
```

At first, before Google ads are approved, you can temporarily use:

```env
VITE_AD_PROVIDER=mock
```

Switch it back to `google_ad_manager` before real monetized traffic.

## 5. Domain

You do not need to buy a domain on day one.

Vercel automatically gives you a public URL:

```text
https://your-project.vercel.app
```

Later, you can buy a domain in Vercel or another registrar and connect it in Vercel settings.

## 6. Google Ads And Payments

Google pays you through your Google publisher payments profile, not through this game code.

You need to complete in Google:

- publisher account approval
- site/domain approval
- identity verification
- address verification if requested
- tax information
- payment method

For the payment country, use the country where you can legally verify your identity, address, tax details, and bank/payment method.

Practical note:

- Netherlands is usually better if you actually live there and can verify it, because bank transfer support is stronger.
- Ukraine should be used if your real payment profile, address, and documents are Ukrainian.

Do not choose a country only because it looks more profitable. A mismatch can delay or block payments.

Google ad units needed:

```env
VITE_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH=/your-network-id/waves_rewarded
VITE_GOOGLE_AD_MANAGER_BANNER_AD_UNIT_PATH=/your-network-id/waves_lobby_banner
```

## 7. Production Checklist

Before inviting players:

- Backend health check works.
- Frontend opens from Vercel.
- Register/login works.
- Game starts and submits score.
- Shop and inventory load.
- Neon database has tables after migration.
- Render `CORS_ORIGIN` equals the real Vercel URL.
- Google ad unit paths are real, not placeholders.
- `mock` ads are disabled for production.

## 8. What Not To Do

- Do not run `npm run db:seed` on production. It creates a test account.
- Do not commit real `.env` files.
- Do not share Google or bank login credentials.
- Do not promise rewards for ads unless Google rewarded ads are approved and working.
