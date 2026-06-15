# Waves Arcade

Commercial-ready MVP for a neon arcade web game with real account, wallet, shop, skins, leaderboard, daily reward, and monetization-ready backend architecture.

This project is an original arcade game inspired by smooth line/arrow runner mechanics. It does not copy third-party assets.

## Stack

- Frontend: React, TypeScript, Vite, Tailwind CSS, Zustand, i18next
- Game rendering: Phaser 3
- Backend: Node.js, Express, TypeScript
- Database: SQLite for local development with Prisma, PostgreSQL schema preserved for production
- Auth: JWT access token with bcrypt password hashing
- Shared contracts: `packages/shared`

## Project Structure

```text
apps/
  frontend/
    src/
      components/
      game/
        engine/
        player/
        obstacles/
        skins/
        effects/
      i18n/locales/
      pages/
      services/
      store/
      types/
  backend/
    prisma/
    src/
      config/
      controllers/
      data/
      middleware/
      routes/
      services/
      types/
      utils/
packages/
  shared/
```

## Setup

1. Install dependencies:

```bash
npm install
```

2. Copy env files:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/frontend/.env.example apps/frontend/.env
```

On Windows PowerShell:

```powershell
Copy-Item apps/backend/.env.example apps/backend/.env
Copy-Item apps/frontend/.env.example apps/frontend/.env
```

3. Generate and migrate the local SQLite database:

```bash
npm run db:migrate
npm run db:seed
```

5. Run both apps:

```bash
npm run dev
```

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:4000/api`

## Database Modes

Local development now uses SQLite by default:

```env
DATABASE_URL="file:./dev.db"
```

That means Docker is not required to run the MVP locally.

The PostgreSQL production schema and migrations live at:

```text
apps/backend/prisma-postgres/
```

When deploying commercially, use managed PostgreSQL and migrate the production schema with:

```bash
npm run db:migrate:prod
```

## Windows Troubleshooting

If your terminal inserts characters like `[200~` or `~`, delete them before pressing Enter. The command should be plain `npm run dev`.

## Environment Variables

Backend:

- `DATABASE_URL`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `JWT_ACCESS_EXPIRES_IN`
- `JWT_REFRESH_EXPIRES_IN`
- `PORT`
- `CORS_ORIGIN`
- `NODE_ENV`
- `AD_PROVIDER`
- `AD_SESSION_TTL_SECONDS`

Frontend:

- `VITE_API_URL`
- `VITE_GAME_BUILD`
- `VITE_AD_PROVIDER`
- `VITE_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH`
- `VITE_GOOGLE_AD_MANAGER_BANNER_AD_UNIT_PATH`

Use long random JWT secrets before any public deployment.

For Google-paid web ads, create rewarded and banner ad units in Google Ad Manager, then set:

```env
AD_PROVIDER="google_ad_manager"
VITE_AD_PROVIDER="google_ad_manager"
VITE_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH="/123456789/waves_rewarded"
VITE_GOOGLE_AD_MANAGER_BANNER_AD_UNIT_PATH="/123456789/waves_lobby_banner"
```

Those paths must be your real Google Ad Manager ad unit paths from an approved publisher account and approved game domain.

## API Endpoints

Auth:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

User:

- `GET /api/user/profile`
- `PATCH /api/user/profile`

Game:

- `POST /api/game/session/start`
- `POST /api/game/session/end`
- `POST /api/game/score`
- `GET /api/game/leaderboard`

Shop:

- `GET /api/shop/skins`
- `POST /api/shop/buy-skin`
- `POST /api/shop/equip-skin`
- `GET /api/shop/my-skins`

Currency:

- `GET /api/wallet`
- `GET /api/wallet/daily-reward`
- `POST /api/wallet/reward`
- `POST /api/wallet/ad/reward/start`
- `POST /api/wallet/ad/reward/complete`
- `POST /api/wallet/purchase-placeholder`

## Security Notes

- Passwords are hashed with bcrypt.
- Authenticated routes require a bearer token.
- Input validation uses Zod.
- Helmet, CORS, and rate limiting are enabled.
- Skin purchases and coin spending are validated server-side.
- Score submission goes through game sessions and anti-cheat validation placeholders.
- Client-only coin changes are not trusted.

## Monetization Plan

Implemented foundations:

- In-game coins
- Premium gems
- Server-side cosmetic shop
- Purchase transaction records
- Payment provider abstraction
- Daily reward economy
- Premium and limited skin flags
- Rewarded ad session flow
- CrazyGames rewarded-ad frontend adapter
- Google Ad Manager rewarded web adapter
- Google Publisher Tag lobby banner slot
- Local mock ad provider for development

Ready to connect later:

- Stripe checkout or payment intents
- Google Play Billing
- Apple In-App Purchases
- AdMob rewarded ads with server-side verification for Android/iOS
- Battle pass / season pass tables
- Limited-time offer scheduling
- Admin panel for content operations

See [docs/MONETIZATION.md](docs/MONETIZATION.md) for real ad provider setup.
See [docs/DEPLOYMENT.md](docs/DEPLOYMENT.md) for Vercel + Render + Neon production deployment.

## Database Models

Prisma models live in `apps/backend/prisma/schema.prisma`:

- `User`
- `UserProfile`
- `Wallet`
- `Skin`
- `OwnedSkin`
- `Score`
- `PurchaseTransaction`
- `GameSession`
- `RefreshToken`

## Development Roadmap

Next production milestones:

1. Add refresh-token rotation and token revocation.
2. Add admin dashboard for skins, offers, rewards, and moderation.
3. Add deterministic server score replay checks for stronger anti-cheat.
4. Add audio mixer, haptics, and mobile safe-area polish.
5. Add seasonal missions, battle pass progress, and daily quests.
6. Add CDN-backed asset pipeline for premium cosmetics.
7. Add automated tests for auth, purchases, rewards, and score validation.
8. Package with Capacitor or React Native WebView for iOS/Android.

## Deployment

Recommended MVP deployment:

- Frontend: Vercel, Netlify, Cloudflare Pages, or static hosting behind a CDN
- Backend: Fly.io, Render, Railway, ECS, or Kubernetes
- Database: Managed PostgreSQL
- Secrets: platform secret manager, never committed `.env`

Production checklist:

- Replace JWT secrets.
- Restrict `CORS_ORIGIN`.
- Enable HTTPS only.
- Run Prisma migrations in CI/CD.
- Set up database backups.
- Add logging and error monitoring.
- Add abuse monitoring for auth, wallet, and score endpoints.
