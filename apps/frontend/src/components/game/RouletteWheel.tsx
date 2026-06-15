import { useMemo, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Coins, Crown, Gem, Gift, HeartPulse, Sparkles, Ticket, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
import type { RouletteConfigDto, RouletteSpinDto } from "../../types/api";
import { Button } from "../ui/Button";

interface RouletteWheelProps {
  adBusy: boolean;
  config: RouletteConfigDto | null;
  lastSpin: RouletteSpinDto | null;
  spinning: boolean;
  tickets: number;
  onSpin: () => Promise<RouletteSpinDto | null>;
  onWatchAd: () => Promise<void>;
}

type RouletteRewardType = RouletteSpinDto["rewardType"];

type WheelSegment = {
  color: string;
  displayValue: string;
  icon: LucideIcon;
  rewardType: RouletteRewardType;
};

const rewardIcons: Record<RouletteRewardType, LucideIcon> = {
  antiAds: Sparkles,
  booster: Sparkles,
  coins: Coins,
  extraLife: HeartPulse,
  gems: Gem,
  premiumTrial: Crown,
  rouletteTicket: Ticket,
  skin: Gift
};

const defaultSegments: WheelSegment[] = [
  { color: "#f9c74f", rewardType: "coins", displayValue: "250", icon: Coins },
  { color: "#3ddcff", rewardType: "gems", displayValue: "16", icon: Gem },
  { color: "#8b5cf6", rewardType: "rouletteTicket", displayValue: "x1", icon: Ticket },
  { color: "#fb7185", rewardType: "extraLife", displayValue: "+1", icon: HeartPulse },
  { color: "#22c55e", rewardType: "skin", displayValue: "SKIN", icon: Gift },
  { color: "#f59e0b", rewardType: "premiumTrial", displayValue: "VIP", icon: Crown }
];

function prizeKey(rewardType: RouletteRewardType) {
  return `roulette.prizes.${rewardType}`;
}

export function RouletteWheel({
  adBusy,
  config,
  lastSpin,
  spinning,
  tickets,
  onSpin,
  onWatchAd
}: RouletteWheelProps) {
  const { t } = useTranslation();
  const [rotation, setRotation] = useState(0);
  const [animating, setAnimating] = useState(false);

  const segments = useMemo<WheelSegment[]>(
    () =>
      config?.categories.length
        ? config.categories.map((segment) => ({
            color: segment.color,
            displayValue: segment.displayValue,
            icon: rewardIcons[segment.rewardType] ?? Sparkles,
            rewardType: segment.rewardType
          }))
        : defaultSegments,
    [config]
  );

  const segmentCount = segments.length;
  const angle = 360 / segmentCount;
  const neededAds = config?.nextSpinCostAds ?? 0;
  const spinLocked = neededAds > 0;

  const wheelBackground = useMemo(
    () =>
      segments
        .map((segment, index) => {
          const start = index * angle;
          const end = (index + 1) * angle;
          return `${segment.color} ${start}deg ${end - 1.4}deg, rgba(5, 9, 20, 0.95) ${end - 1.4}deg ${end}deg`;
        })
        .join(", "),
    [angle, segments]
  );

  async function handleSpin() {
    if (!config || spinLocked || spinning || animating) {
      return;
    }

    setAnimating(true);
    const result = await onSpin();

    if (!result) {
      setAnimating(false);
      return;
    }

    const spins = 6 + Math.floor(Math.random() * 3);
    const selectedIndex = Math.max(
      0,
      segments.findIndex((segment) => segment.rewardType === result.rewardType)
    );
    const sectionAngle = selectedIndex * angle + angle / 2;
    const targetRotation = rotation + spins * 360 + (360 - sectionAngle);
    setRotation(targetRotation);

    window.setTimeout(() => setAnimating(false), 3300);
  }

  function formatLastPrize(spin: RouletteSpinDto) {
    if (spin.rewardType === "skin" && spin.rewardSkin) {
      return t(spin.rewardSkin.nameKey);
    }

    if (spin.rewardType === "premiumTrial") {
      return t("roulette.vipTrial");
    }

    if (spin.rewardType === "rouletteTicket") {
      return `x${spin.rewardAmount}`;
    }

    if (spin.rewardType === "extraLife") {
      return `+${spin.rewardAmount}`;
    }

    return spin.rewardAmount.toLocaleString();
  }

  return (
    <div className="arcade-border rounded-lg p-5 shadow-neon">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <div className="text-xs font-black uppercase tracking-[0.26em] text-cyanGlow">{t("roulette.eyebrow")}</div>
          <h2 className="mt-1 text-2xl font-black text-white">{t("roulette.title")}</h2>
        </div>
        <div className="rounded-md border border-white/10 bg-black/30 px-3 py-2 text-right">
          <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">
            {t("roulette.tickets")}
          </div>
          <div className="text-lg font-black text-violet-200">{tickets}</div>
        </div>
      </div>

      <div className="relative mx-auto aspect-square w-full max-w-[19rem]">
        <div className="absolute -inset-5 rounded-full bg-[conic-gradient(from_45deg,#3ddcff,#22c55e,#f9c74f,#fb7185,#8b5cf6,#3ddcff)] opacity-25 blur-2xl" />
        <div className="absolute inset-0 rounded-full border border-white/15 bg-slate-950 shadow-[inset_0_0_34px_rgba(255,255,255,0.08)]" />
        <div className="absolute left-1/2 top-[-0.35rem] z-20 h-9 w-9 -translate-x-1/2 rotate-45 rounded-sm border border-white/40 bg-cyanGlow shadow-[0_0_24px_rgba(61,220,255,0.9)]" />
        <div className="absolute left-1/2 top-[0.1rem] z-30 h-3 w-3 -translate-x-1/2 rotate-45 bg-white" />

        <div className="absolute inset-4 overflow-hidden rounded-full border border-white/20 bg-ink">
          <div
            className="absolute inset-0 rounded-full"
            style={{
              background: `conic-gradient(${wheelBackground})`,
              transform: `rotate(${rotation}deg)`,
              transition: animating ? "transform 3.3s cubic-bezier(0.12, 0.76, 0.15, 1)" : "none"
            }}
          >
            <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle_at_35%_28%,rgba(255,255,255,0.38),transparent_18%),radial-gradient(circle,transparent_48%,rgba(0,0,0,0.34)_72%)]" />
            {segments.map((segment, index) => {
              const Icon = segment.icon;
              const midAngle = index * angle + angle / 2 - 90;
              const radians = (midAngle * Math.PI) / 180;
              const left = 50 + Math.cos(radians) * 31;
              const top = 50 + Math.sin(radians) * 31;

              return (
                <div
                  key={`${segment.rewardType}-${index}`}
                  className="absolute grid h-14 w-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-md border border-white/20 bg-black/30 text-white shadow-[0_0_16px_rgba(0,0,0,0.35)] backdrop-blur-sm"
                  style={{ left: `${left}%`, top: `${top}%` }}
                  title={t(prizeKey(segment.rewardType))}
                >
                  <Icon size={18} />
                  <span className="text-[0.62rem] font-black uppercase tracking-[0.08em]">{segment.displayValue}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="absolute left-1/2 top-1/2 z-20 grid h-24 w-24 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border border-white/20 bg-[radial-gradient(circle_at_35%_25%,rgba(255,255,255,0.25),rgba(13,18,32,0.95)_45%,rgba(3,7,18,1)_100%)] text-center shadow-[0_0_28px_rgba(61,220,255,0.35)]">
          <Sparkles className="text-cyanGlow" size={22} />
          <div className="text-sm font-black uppercase tracking-[0.2em] text-white">{spinLocked ? t("roulette.locked") : t("roulette.ready")}</div>
        </div>
      </div>

      <div className="mt-5 grid gap-3">
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">
              {t("roulette.nextSpin")}
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {spinLocked ? t("roulette.adsNeeded", { count: neededAds }) : t("roulette.freeReady")}
            </div>
          </div>
          <div className="rounded-md border border-white/10 bg-black/25 px-3 py-2">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.2em] text-slate-400">
              {t("roulette.freeSpins")}
            </div>
            <div className="mt-1 text-sm font-bold text-white">
              {(config?.freeDailySpins ?? 0) + (config?.premiumExtraSpins ?? 0)}
            </div>
          </div>
        </div>

        <div className="grid gap-2">
          {segments.map((segment) => {
            const Icon = segment.icon;
            const chance = config?.probabilities[segment.rewardType];
            return (
              <div key={segment.rewardType} className="flex items-center justify-between gap-3 rounded-md bg-white/[0.04] px-3 py-2">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-ink" style={{ backgroundColor: segment.color }}>
                    <Icon size={15} />
                  </span>
                  <span className="truncate text-sm font-bold text-slate-100">{t(prizeKey(segment.rewardType))}</span>
                </div>
                <span className="shrink-0 text-xs font-black uppercase tracking-[0.12em] text-slate-400">
                  {chance ? `${Math.round(chance * 100)}%` : segment.displayValue}
                </span>
              </div>
            );
          })}
        </div>

        {lastSpin ? (
          <div className="rounded-md border border-cyanGlow/25 bg-cyanGlow/10 p-3 text-white">
            <div className="text-[0.65rem] font-black uppercase tracking-[0.24em] text-cyanGlow">
              {t("roulette.lastPrize")}
            </div>
            <div className="mt-1 text-lg font-black">{formatLastPrize(lastSpin)}</div>
            <div className="text-sm font-bold text-slate-200">{t(prizeKey(lastSpin.rewardType))}</div>
          </div>
        ) : null}

        <div className="grid gap-2 sm:grid-cols-2">
          <Button
            type="button"
            variant="secondary"
            disabled={!config || !spinLocked || adBusy || spinning || animating}
            onClick={() => void onWatchAd()}
            icon={<Video size={18} />}
          >
            {adBusy ? t("roulette.adWatching") : t("roulette.watchAd")}
          </Button>
          <Button type="button" disabled={!config || spinLocked || spinning || animating} onClick={() => void handleSpin()}>
            {spinning || animating ? t("roulette.spinning") : t("roulette.spin")}
          </Button>
        </div>
      </div>
    </div>
  );
}
