# Production Readiness

## Implemented controls

- Server-owned game sessions with periodic monotonic checkpoints for elapsed time, distance, coins and input transitions.
- Server-computed score formula, plausibility limits, review states and leaderboard filtering.
- Registration, password recovery, support and global API rate limits.
- Proxy-aware backend rate limiting with configurable `TRUST_PROXY_HOPS` for direct Render or Cloudflare-fronted production traffic.
- Optional Cloudflare Turnstile verification that fails closed when enabled in production.
- Password hashing, one-time admin temporary passwords and mandatory password changes.
- Consent-gated analytics and Google Ad Manager loading.
- Structured server error logs and privacy-gated client error events; Sentry DSNs are reserved for the official SDK adapter.
- Pseudonymous analytics, admin audit logs and wallet/purchase financial ledgers.
- Soft account deletion that anonymizes identity, hides scores and removes authentication access.
- Privacy Policy, Cookie Policy, installable PWA shell and PostgreSQL backup command.

## Remaining launch risks

1. Access tokens currently use browser storage. Move refresh tokens to rotated `HttpOnly`, `Secure`, `SameSite` cookies before handling high-value payments.
2. The checkpoint protocol rejects simple browser score editing but is not a cryptographic authoritative simulation. Competitive prize tournaments need deterministic server replay or a server-authoritative game.
3. Configure a Google-certified consent management platform where required; the built-in consent UI is a technical gate, not legal certification.
4. Add the official Sentry browser and Node SDKs before relying on Sentry alerts. DSNs alone do not send events.
5. Run professional legal review and native-speaker review of policies and the canonical English rules before paid marketing.
6. Add provider server-to-server verification for paid purchases and rewarded ad callbacks.
7. Migrate database backups into encrypted private object storage with retention and restore drills.
8. The backend still uses in-memory limiter storage. Multi-instance production must add Cloudflare edge rate limiting or a Redis-backed distributed limiter before traffic scaling.

## Backup

Install PostgreSQL client tools so `pg_dump` is available, then run from a trusted environment:

```bash
DATABASE_URL="postgresql://..." npm run db:backup
```

The generated dump is ignored by Git. Upload it to encrypted private storage and test restoration regularly.

## Verification

```bash
npm run typecheck
npm test
npm run build
npm run build:backend:prod
npm run lint
```
