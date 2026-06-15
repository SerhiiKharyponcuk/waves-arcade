import { useEffect, useMemo, useState } from "react";
import { Gem, PackageOpen, Sparkles, Target } from "lucide-react";
import { useTranslation } from "react-i18next";
import { InventorySkinCard } from "../components/shop/InventorySkinCard";
import { LoadoutPreview } from "../components/shop/LoadoutPreview";
import { StatCard } from "../components/ui/StatCard";
import { defaultArrowVisual, defaultTrailVisual } from "../game/skins/skinResolver";
import { shopApi } from "../services/shopApi";
import { useAuthStore } from "../store/authStore";
import type { ShopSkin } from "../types/api";
import { matchesSkinFilter, profileWithEquippedSkin, type SkinFilter } from "../utils/skinSelection";

const skinFilters: SkinFilter[] = ["all", "arrow", "trail"];

export function InventoryPage() {
  const { t } = useTranslation();
  const { user, patchProfile } = useAuthStore();
  const [skins, setSkins] = useState<ShopSkin[]>([]);
  const [filter, setFilter] = useState<SkinFilter>("all");
  const [busySkinId, setBusySkinId] = useState("");
  const [error, setError] = useState("");

  async function refresh() {
    const result = await shopApi.mySkins();
    setSkins(result);
  }

  useEffect(() => {
    void refresh().catch(() => setError(t("common.error")));
  }, [t]);

  const filteredSkins = useMemo(() => skins.filter((skin) => matchesSkinFilter(skin, filter)), [filter, skins]);
  const arrowCount = useMemo(() => skins.filter((skin) => skin.category === "arrow").length, [skins]);
  const trailCount = useMemo(() => skins.filter((skin) => matchesSkinFilter(skin, "trail")).length, [skins]);
  const selectedArrow = useMemo(
    () => skins.find((skin) => skin.id === user?.profile.selectedArrowSkinId),
    [skins, user?.profile.selectedArrowSkinId]
  );
  const selectedTrail = useMemo(
    () => skins.find((skin) => skin.id === user?.profile.selectedTrailSkinId),
    [skins, user?.profile.selectedTrailSkinId]
  );

  async function equipSkin(skinId: string) {
    setBusySkinId(skinId);
    setError("");
    try {
      const result = await shopApi.equipSkin(skinId);
      setSkins(result);
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
            <PackageOpen size={17} />
            {t("nav.inventory")}
          </div>
          <h1 className="text-4xl font-black text-white neon-text">{t("inventory.title")}</h1>
          <p className="mt-2 max-w-2xl text-slate-300">{t("inventory.subtitle")}</p>
        </div>
        <div className="grid grid-cols-3 gap-3 sm:min-w-[28rem]">
          <StatCard icon={<PackageOpen size={20} />} label={t("inventory.total")} value={skins.length} />
          <StatCard icon={<Target size={20} />} label={t("inventory.arrowSkins")} value={arrowCount} />
          <StatCard icon={<Sparkles size={20} />} label={t("inventory.trailSkins")} value={trailCount} />
        </div>
      </div>

      <div className="arcade-border grid gap-4 rounded-lg p-4 lg:grid-cols-[minmax(18rem,1fr)_minmax(22rem,0.95fr)] lg:items-center">
        <div>
          <h2 className="text-lg font-black text-white">{t("inventory.currentLoadout")}</h2>
          <p className="mt-1 text-sm text-slate-400">{t("inventory.loadoutHint")}</p>
          <div className="mt-4 grid gap-2 text-sm font-bold sm:grid-cols-2">
            <div className="rounded-md bg-white/5 px-3 py-2">
              <span className="block text-xs uppercase tracking-[0.16em] text-slate-400">{t("inventory.arrowSlot")}</span>
              <span className="mt-1 block truncate text-white">
                {selectedArrow ? t(selectedArrow.nameKey) : t("inventory.emptySlot")}
              </span>
            </div>
            <div className="rounded-md bg-white/5 px-3 py-2">
              <span className="block text-xs uppercase tracking-[0.16em] text-slate-400">{t("inventory.trailSlot")}</span>
              <span className="mt-1 block truncate text-white">
                {selectedTrail ? t(selectedTrail.nameKey) : t("inventory.emptySlot")}
              </span>
            </div>
          </div>
        </div>
        <LoadoutPreview
          arrowVisual={selectedArrow?.visual ?? defaultArrowVisual}
          trailVisual={selectedTrail?.visual ?? defaultTrailVisual}
        />
      </div>

      {error ? <div className="rounded-md border border-magentaGlow/40 bg-magentaGlow/10 p-3 text-sm text-pink-200">{error}</div> : null}

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

      {filteredSkins.length ? (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filteredSkins.map((skin) => (
            <InventorySkinCard
              key={skin.id}
              skin={skin}
              busy={busySkinId === skin.id}
              onEquip={(skinId) => void equipSkin(skinId)}
            />
          ))}
        </div>
      ) : (
        <div className="arcade-border rounded-lg p-6 text-sm text-slate-300">
          <Gem className="mb-3 text-cyanGlow" size={24} />
          {t("inventory.empty")}
        </div>
      )}
    </section>
  );
}
