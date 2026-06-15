import { MousePointerClick } from "lucide-react";
import { useTranslation } from "react-i18next";

function emit(pressed: boolean) {
  window.dispatchEvent(new CustomEvent("waves:virtual-control", { detail: { pressed } }));
}

export function VirtualJoystick() {
  const { t } = useTranslation();

  return (
    <button
      type="button"
      aria-label={t("game.tapToControl")}
      title={t("game.tapToControl")}
      className="pointer-events-auto grid h-16 w-16 place-items-center rounded-lg border border-white/20 bg-cyanGlow text-ink shadow-neon backdrop-blur-md md:hidden"
      onPointerDown={() => emit(true)}
      onPointerUp={() => emit(false)}
      onPointerCancel={() => emit(false)}
      onPointerLeave={() => emit(false)}
    >
      <MousePointerClick size={26} />
    </button>
  );
}
