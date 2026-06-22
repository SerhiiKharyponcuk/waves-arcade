const CONSOLE_BRANDING_KEY = "waves_console_branding_shown";

export function showConsoleBranding() {
  if (typeof window === "undefined" || sessionStorage.getItem(CONSOLE_BRANDING_KEY)) return;
  sessionStorage.setItem(CONSOLE_BRANDING_KEY, "true");

  console.info(
    "%c WAVES ARCADE %c Ride the pulse. Own the trail. ",
    "background:#21d4fd;color:#070914;font-size:18px;font-weight:900;padding:8px 12px;border-radius:4px 0 0 4px",
    "background:#111827;color:#f8fafc;font-size:18px;font-weight:700;padding:8px 12px;border-radius:0 4px 4px 0"
  );
  console.info(
    "%cPlay fairly, climb the leaderboard and unlock your style: https://waves-arcade.vercel.app",
    "color:#67e8f9;font-size:13px;font-weight:700"
  );
  console.warn(
    "%cSECURITY WARNING%c Never paste code here or share access tokens. Waves Arcade support will never ask you to do that.",
    "background:#f43f8c;color:white;font-weight:900;padding:4px 7px;border-radius:3px",
    "color:#fda4af;font-weight:700"
  );
}
