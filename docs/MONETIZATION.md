# Monetization Setup

Waves Arcade now uses a production-minded rewarded ads flow:

1. The backend creates a short-lived ad reward session.
2. The frontend asks the configured ad SDK to show a rewarded ad.
3. After the SDK reports completion, the frontend completes the session.
4. The backend grants the wallet reward once and records the transaction.

This keeps rewards server-side and prevents duplicate claims for the same ad session.

## Local Development

Use mock ads locally:

```env
# apps/backend/.env
AD_PROVIDER="mock"
AD_SESSION_TTL_SECONDS=600

# apps/frontend/.env
VITE_AD_PROVIDER="mock"
```

Mock ads simulate a completed rewarded ad after a short delay. They are for development only and do not generate revenue.

## CrazyGames Web Monetization

For a CrazyGames build:

```env
# apps/backend/.env
AD_PROVIDER="crazygames"
CORS_ORIGIN="https://your-crazygames-host-origin"

# apps/frontend/.env
VITE_AD_PROVIDER="crazygames"
VITE_API_URL="https://your-api-domain.com/api"
```

Then publish the HTML5 build through the CrazyGames Developer Portal and make sure the game uses the CrazyGames SDK environment. The frontend adapter expects `window.CrazyGames.SDK.ad.requestAd("rewarded", ...)` to be available at runtime.

## Google Web Monetization

Use Google Ad Manager for the browser game when you want Google-paid rewarded ads and banner inventory. AdSense is simpler for normal website banners, but Google Ad Manager is the better fit for rewarded game ads because it supports Google Publisher Tag rewarded slots.

Create these ad units in Google Ad Manager:

- Rewarded web ad unit for opt-in rewards such as coins, roulette tickets, and continues.
- Multi-size display/banner ad unit for the lobby/menu.

Production env example:

```env
# apps/backend/.env
AD_PROVIDER="google_ad_manager"
CORS_ORIGIN="https://your-game-domain.com"

# apps/frontend/.env
VITE_AD_PROVIDER="google_ad_manager"
VITE_API_URL="https://your-api-domain.com/api"
VITE_GOOGLE_AD_MANAGER_REWARDED_AD_UNIT_PATH="/123456789/waves_rewarded"
VITE_GOOGLE_AD_MANAGER_BANNER_AD_UNIT_PATH="/123456789/waves_lobby_banner"
```

The ad unit paths must come from your own Google Ad Manager account. The local mock provider does not generate revenue and should never be used for production monetization claims.

Current Google integration:

- Loads the official Google Publisher Tag script only when `VITE_AD_PROVIDER="google_ad_manager"`.
- Shows rewarded ads through `defineOutOfPageSlot(..., REWARDED)`.
- Grants rewards only after Google fires `rewardedSlotGranted`.
- Shows a reserved banner slot in the lobby/menu when a banner ad unit path is configured.
- Keeps all wallet rewards server-side through the existing ad session flow.

Important Google limitations:

- Rewarded web ads require a mobile-optimized page and user opt-in before the ad.
- Google Ad Manager rewarded ads for web do not provide server-side verification. The backend still prevents duplicate reward claims, but the reward grant depends on the official GPT browser event. AdMob SSV should be added later for native Android/iOS builds.
- You need an approved Google publisher account, approved site/domain, tax/payment setup, and policy-compliant ad placements before Google will pay out.

## Reward Placements

Current rewarded ad placements:

- `coins`: grants coins after a completed rewarded ad.
- `roulette`: grants one roulette ticket after a completed rewarded ad.
- `continue`: grants one extra life after a completed rewarded ad. The wallet backend is ready; the game-over continue UI can be expanded further.

## Production Notes

- Real revenue requires an approved ad provider account or platform distribution agreement.
- The current CrazyGames integration uses SDK completion callbacks. If a provider offers server-side verification, add that verifier inside `completeAdRewardSession` before wallet rewards are granted.
- The Google Ad Manager web integration uses GPT rewarded events. For native apps, implement AdMob rewarded ads with server-side verification before granting high-value rewards.
- Keep `mock` disabled in production builds.
- Add analytics for ad started, completed, failed, skipped, and reward claimed events before scaling paid acquisition.
- Avoid forcing ads too often. Rewarded ads should be opt-in and tied to clear value.
