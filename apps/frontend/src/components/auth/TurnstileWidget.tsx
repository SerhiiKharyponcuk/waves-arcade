import { useEffect, useRef } from "react";

interface TurnstileApi {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  remove: (widgetId: string) => void;
}

interface TurnstileWindow extends Window {
  turnstile?: TurnstileApi;
}

interface TurnstileWidgetProps {
  onToken: (token: string) => void;
}

export function TurnstileWidget({ onToken }: TurnstileWidgetProps) {
  const siteKey = import.meta.env.VITE_TURNSTILE_SITE_KEY;
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let widgetId = "";
    let cancelled = false;

    const render = () => {
      const api = (window as TurnstileWindow).turnstile;
      if (!cancelled && api && containerRef.current && !widgetId) {
        widgetId = api.render(containerRef.current, {
          sitekey: siteKey,
          theme: "dark",
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(""),
          "error-callback": () => onToken("")
        });
      }
    };

    const existing = document.querySelector<HTMLScriptElement>('script[data-waves-turnstile="true"]');
    if (existing) {
      if ((window as TurnstileWindow).turnstile) render();
      else existing.addEventListener("load", render, { once: true });
    } else {
      const script = document.createElement("script");
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      script.dataset.wavesTurnstile = "true";
      script.addEventListener("load", render, { once: true });
      document.head.appendChild(script);
    }

    return () => {
      cancelled = true;
      if (widgetId) (window as TurnstileWindow).turnstile?.remove(widgetId);
    };
  }, [onToken, siteKey]);

  if (!siteKey) return null;
  return <div ref={containerRef} className="min-h-[65px]" aria-label="Security verification" />;
}
