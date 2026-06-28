import { useEffect } from "react";
import { AuthPage } from "./pages/AuthPage";
import { MainShell } from "./components/layout/MainShell";
import { useAuthStore } from "./store/authStore";
import { useGuestStore } from "./store/guestStore";
import { ConsentBanner } from "./components/privacy/ConsentBanner";
import { trackEvent } from "./services/analytics";
import { useConsentStore } from "./store/consentStore";
import { DevtoolsGuard } from "./components/security/DevtoolsGuard";
import { AppLoader } from "./components/ui/AppLoader";

export function App() {
  const { token, user, loading, bootstrap } = useAuthStore();
  const guestActive = useGuestStore((state) => state.active);
  const analyticsConsent = useConsentStore((state) => state.analytics);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  useEffect(() => {
    if (!analyticsConsent || sessionStorage.getItem("waves_app_open_tracked")) return;
    sessionStorage.setItem("waves_app_open_tracked", "true");
    trackEvent("app_open");
  }, [analyticsConsent]);

  useEffect(() => {
    if (!analyticsConsent || !guestActive || sessionStorage.getItem("waves_guest_session_tracked")) return;
    sessionStorage.setItem("waves_guest_session_tracked", "true");
    trackEvent("guest_session_start");
  }, [analyticsConsent, guestActive]);

  if (loading && token && !user && !guestActive) {
    return <><AppLoader fullscreen /><ConsentBanner /><DevtoolsGuard /></>;
  }

  if ((!token || !user) && !guestActive) {
    return <><AuthPage /><ConsentBanner /><DevtoolsGuard /></>;
  }

  return <><MainShell /><ConsentBanner /><DevtoolsGuard /></>;
}
