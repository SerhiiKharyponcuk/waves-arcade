import { useEffect } from "react";
import { AuthPage } from "./pages/AuthPage";
import { MainShell } from "./components/layout/MainShell";
import { useAuthStore } from "./store/authStore";

export function App() {
  const { token, user, bootstrap } = useAuthStore();

  useEffect(() => {
    void bootstrap();
  }, [bootstrap]);

  if (!token || !user) {
    return <AuthPage />;
  }

  return <MainShell />;
}
