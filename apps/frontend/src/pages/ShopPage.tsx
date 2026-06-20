import { useEffect, useMemo, useState } from "react";
import { Coins, Gem, Lock, PackageOpen, ShoppingBag } from "lucide-react";
import { useTranslation } from "react-i18next";
import { SkinCard } from "../components/shop/SkinCard";
import { AccountRequiredModal } from "../components/auth/AccountRequiredModal";
import { GoogleAdSlot } from "../components/ads/GoogleAdSlot";
import { StatCard } from "../components/ui/StatCard";
import { shopApi } from "../services/shopApi";
import { useAuthStore } from "../store/authStore";
import { useGuestStore } from "../store/guestStore";
import { recordAdShown, shouldShowGuestAd } from "../services/ads/guestAdPolicy";
import type { ShopSkin } from "../types/api";
import { matchesSkinFilter, profileWithEquippedSkin, type SkinFilter } from "../utils/skinSelection";

const skinFilters: SkinFilter[] = ["all", "arrow", "trail"];

export function ShopPage() {
  const { t } = useTranslation();
  const { user, patchProfile, patchWallet } = useAuthStore();
  const { active: guestActive, session: guestSession, requestAuthentication, updateSession } = useGuestStore();
  const isGuest = guestActive && !user;
  const [skins, setSkins] = useState<ShopSkin[]>([]);
  const [filter, setFilter] = useState<SkinFilter>("all");
  const [busySkinId, setBusySkinId] = useState("");
  const [error, setError] = useState("");
  const [accountRequired, setAccountRequired] = useState(false);
  const [showGuestAd, setShowGuestAd] = useState(false);
  const ownedCount = useMemo(() => skins.filter((skin) => skin.owned).length, [skins]);
  const lockedCount = Math.max(0, skins.length - ownedCount);

  async function refresh() {
    const result = await shopApi.skins();
    setSkins(result);
  }

  useEffect(() => {
    void refresh().catch(() => setError(t("common.error")));
  }, [t]);

  useEffect(() => {
    if (isGuest && guestSession && shouldShowGuestAd("open_shop", guestSession)) {
      updateSession(recordAdShown);
      setShowGuestAd(true);
    }
  }, [isGuest]);

  async function buySkin(skinId: string) {
    if (isGuest) {
      setAccountRequired(true);
      return;
    }
    setBusySkinId(skinId);
    setError("");
    try {
      const result = await shopApi.buySkin(skinId);
      patchWallet(result.wallet);
      await refresh();
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusySkinId("");
    }
  }

  async function equipSkin(skinId: string) {
    if (isGuest) {
      const skin = skins.find((item) => item.id === skinId);
      if (skin && skin.priceCoins === 0 && skin.priceGems === 0 && !skin.isPremium && (skin.category === "arrow" || skin.category === "player")) {
        updateSession((current) => ({ ...current, selectedBasicSkin: skin.slug }));
        return;
      }
      setAccountRequired(true);
      return;
    }
    setBusySkinId(skinId);
    setError("");
    try {
      const result = await shopApi.equipSkin(skinId);
      setSkins((current) =>
        current.map((skin) => ({
          ...skin,
          equipped: Boolean(result.find((owned) => owned.id === skin.id && owned.equipped)),
          owned: skin.owned || Boolean(result.find((owned) => owned.id === skin.id))
        }))
      );
      const equippedSkin = result.find((skin) => skin.id === skinId);
      const nextProfile = equippedSkin ? profileWithEquippedSkin(user, equippedSkin) : null;
      if (nextProfile) {
        patchProfile(nextProfile);
      }
    } catch (error) {
      setError(error instanceof Error ? error.message : t("common.error"));
    } finally {
      setBusySkinId("");
    }
  }

  return (
    <section className="grid gap-6">
      <div className="flex flex-col justify-between gap-4 md:flex-row md:items-end">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-md bg-cyanGlow px-3 py-2 text-sm font-black text-ink">
            <ShoppingBag size={17} />
            {t("nav.shop")}
          </div>
          <h1 className="text-4xl font-black text-white neon-text">{t("shop.title")}</h1>
          <p className="mt-2 max-w-2xl text-slate-300">{t("shop.subtitle")}</p>
        </div>
        <div className="grid grid-cols-2 gap-3 lg:min-w-[34rem] lg:grid-cols-4">
          <StatCard icon={<Coins size={20} />} label={t("profile.coins")} value={user?.wallet.coins ?? 0} />
          <StatCard icon={<Gem size={20} />} label={t("profile.gems")} value={user?.wallet.gems ?? 0} />
          <StatCard icon={<PackageOpen size={20} />} label={t("inventory.total")} value={ownedCount} />
          <StatCard icon={<Lock size={20} />} label={t("shop.locked")} value={lockedCount} />
        </div>
      </div>

      {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}

      {isGuest ? (
        <div className="rounded-md border border-cyanGlow/30 bg-cyanGlow/10 p-4 text-sm leading-6 text-slate-200">
          You can preview every skin as a Guest. Create an account to buy, unlock, or equip items.
        </div>
      ) : null}
      {isGuest && showGuestAd ? <GoogleAdSlot /> : null}

      <div className="flex flex-wrap gap-2">
        {skinFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`min-h-10 rounded-md border px-4 text-sm font-black transition ${
              filter === item
                ? "border-cyanGlow bg-cyanGlow text-ink shadow-neon"
                : "border-white/10 bg-white/5 text-slate-300 hover:border-cyanGlow hover:text-white"
            }`}
          >
            {t(`inventory.filters.${item}`)}
          </button>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {skins.filter((skin) => matchesSkinFilter(skin, filter)).map((skin) => {
          const guestFree = isGuest && skin.priceCoins === 0 && skin.priceGems === 0 && !skin.isPremium;
          const visibleSkin = isGuest ? { ...skin, owned: guestFree, equipped: guestFree && guestSession?.selectedBasicSkin === skin.slug } : skin;
          return (
            <SkinCard
              key={skin.id}
              skin={visibleSkin}
              busy={busySkinId === skin.id}
              onBuy={(skinId) => void buySkin(skinId)}
              onEquip={(skinId) => void equipSkin(skinId)}
            />
          );
        })}
      </div>

      {accountRequired ? (
        <AccountRequiredModal
          message="You need an account to buy or equip skins."
          onLogin={() => requestAuthentication("login")}
          onRegister={() => requestAuthentication("register")}
          onContinue={() => setAccountRequired(false)}
        />
      ) : null}
    </section>
  );
}
