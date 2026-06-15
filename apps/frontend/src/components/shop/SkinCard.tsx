import { Check, Gem, Lock, ShoppingCart, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ShopSkin } from "../../types/api";
import { Button } from "../ui/Button";
import { SkinPreview } from "./SkinPreview";

interface SkinCardProps {
  skin: ShopSkin;
  busy?: boolean;
  onBuy: (skinId: string) => void;
  onEquip: (skinId: string) => void;
}

export function SkinCard({ skin, busy, onBuy, onEquip }: SkinCardProps) {
  const { t } = useTranslation();
  const price = skin.priceGems > 0 ? t("shop.gems", { count: skin.priceGems }) : t("shop.coins", { count: skin.priceCoins });

  return (
    <article className="arcade-border grid gap-4 rounded-sm p-4">
      <SkinPreview category={skin.category} visual={skin.visual} />
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-black text-white">{t(skin.nameKey)}</h3>
          <p className="mt-1 text-sm text-slate-400">{t(skin.descriptionKey)}</p>
        </div>
        <span className="rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-cyanGlow">
          {t(`rarity.${skin.rarity}`)}
        </span>
      </div>
      <div className="flex flex-wrap items-center gap-2 text-xs font-bold">
        <span className="rounded-md border border-cyanGlow/20 bg-cyanGlow/10 px-2 py-1 text-cyanGlow">
          {t(`skinCategory.${skin.category}`)}
        </span>
        {skin.isPremium ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-goldGlow/15 px-2 py-1 text-goldGlow">
            <Gem size={14} />
            {t("shop.premium")}
          </span>
        ) : null}
        {skin.isLimited ? (
          <span className="inline-flex items-center gap-1 rounded-md bg-magentaGlow/15 px-2 py-1 text-pink-300">
            <Sparkles size={14} />
            {t("shop.limited")}
          </span>
        ) : null}
        <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
          {skin.owned ? t("shop.owned") : price}
        </span>
      </div>
      {skin.equipped ? (
        <Button variant="secondary" disabled icon={<Check size={18} />}>
          {t("shop.equipped")}
        </Button>
      ) : skin.owned ? (
        <Button disabled={busy} onClick={() => onEquip(skin.id)} icon={<Sparkles size={18} />}>
          {t("shop.equip")}
        </Button>
      ) : (
        <Button disabled={busy} onClick={() => onBuy(skin.id)} icon={<ShoppingCart size={18} />}>
          {t("shop.buy")}
        </Button>
      )}
      {!skin.owned ? (
        <div className="flex items-center gap-2 text-xs text-slate-500">
          <Lock size={14} />
          {t("shop.locked")}
        </div>
      ) : null}
    </article>
  );
}
