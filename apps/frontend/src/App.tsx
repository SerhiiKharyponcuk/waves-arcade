import { useEffect } from "react";
import { AuthPage } from "./pages/AuthPage";
import { MainShell } from "./components/layout/MainShell";
import { useAuthStore } from "./store/authStore";
import { useGuestStore } from "./store/guestStore";

export function App() {
  const { token, user, bootstrap } = useAuthStore();
  const guestActive = useGuestStore((state) => state.active);

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if ((!token || !user) && !guestActive) {
    return <AuthPage />;
  }

  return <MainShell />;
}
