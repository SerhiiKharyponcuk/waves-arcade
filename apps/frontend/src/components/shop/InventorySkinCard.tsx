import { Check, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { ShopSkin } from "../../types/api";
import { Button } from "../ui/Button";
import { SkinPreview } from "./SkinPreview";

interface InventorySkinCardProps {
  busy?: boolean;
  skin: ShopSkin;
  onEquip: (skinId: string) => void;
}

export function InventorySkinCard({ busy, skin, onEquip }: InventorySkinCardProps) {
  const { t } = useTranslation();

  return (
    <article className="arcade-border grid gap-4 rounded-sm p-4">
      <SkinPreview category={skin.category} visual={skin.visual} compact />
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="truncate text-lg font-black text-white">{t(skin.nameKey)}</h3>
          <p className="mt-1 line-clamp-2 text-sm text-slate-400">{t(skin.descriptionKey)}</p>
        </div>
        <span className="shrink-0 rounded-md border border-white/10 bg-white/5 px-2 py-1 text-xs font-bold text-cyanGlow">
          {t(`rarity.${skin.rarity}`)}
        </span>
      </div>

      <div className="flex flex-wrap gap-2 text-xs font-bold">
        <span className="rounded-md border border-cyanGlow/20 bg-cyanGlow/10 px-2 py-1 text-cyanGlow">
          {t(`skinCategory.${skin.category}`)}
        </span>
        {skin.ownedAt ? (
          <span className="rounded-md bg-white/5 px-2 py-1 text-slate-300">
            {t("inventory.unlocked")}
          </span>
        ) : null}
      </div>

      {skin.equipped ? (
        <Button type="button" variant="secondary" disabled icon={<Check size={18} />}>
          {t("shop.equipped")}
        </Button>
      ) : (
        <Button type="button" disabled={busy} onClick={() => onEquip(skin.id)} icon={<Sparkles size={18} />}>
          {t("shop.equip")}
        </Button>
      )}
    </article>
  );
}
