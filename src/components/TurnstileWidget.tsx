import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, options: Record<string, unknown>) => string;
      reset: (id?: string) => void;
      remove: (id?: string) => void;
    };
    onloadTurnstileCallback?: () => void;
  }
}

const SCRIPT_ID = "cf-turnstile-script";

function loadScript(): Promise<void> {
  if (window.turnstile) return Promise.resolve();
  return new Promise((resolve, reject) => {
    let script = document.getElementById(SCRIPT_ID) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement("script");
      script.id = SCRIPT_ID;
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    script.addEventListener("load", () => resolve(), { once: true });
    script.addEventListener("error", () => reject(new Error("Failed to load captcha")), { once: true });
    if (window.turnstile) resolve();
  });
}

type Props = {
  /** Called with the captcha token, or null when it expires / errors. */
  onToken: (token: string | null) => void;
  /** Bump this value to force a fresh challenge (e.g. after a failed submit). */
  resetKey?: number;
  /** Called once we know whether captcha is configured for this project. */
  onAvailability?: (enabled: boolean) => void;
};

/** Cloudflare Turnstile challenge. Renders nothing if no site key is configured. */
const TurnstileWidget = ({ onToken, resetKey = 0, onAvailability }: Props) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const widgetIdRef = useRef<string | null>(null);
  const [siteKey, setSiteKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("captcha-config")
      .then(({ data }) => {
        if (cancelled) return;
        const key: string = data?.siteKey ?? "";
        setSiteKey(key || null);
        onAvailability?.(Boolean(key));
        if (!key) onToken("");
      })
      .catch(() => {
        if (cancelled) return;
        setError("Captcha unavailable. Please try again later.");
        onAvailability?.(false);
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!siteKey || !containerRef.current) return;
    let cancelled = false;

    loadScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.turnstile) return;
        containerRef.current.innerHTML = "";
        widgetIdRef.current = window.turnstile.render(containerRef.current, {
          sitekey: siteKey,
          callback: (token: string) => onToken(token),
          "expired-callback": () => onToken(null),
          "error-callback": () => {
            setError("Captcha failed to load. Refresh and try again.");
            onToken(null);
          },
          "refresh-expired": "auto",
        });
      })
      .catch(() => setError("Captcha failed to load. Refresh and try again."));

    return () => {
      cancelled = true;
      if (widgetIdRef.current && window.turnstile) {
        try {
          window.turnstile.remove(widgetIdRef.current);
        } catch {
          /* widget already gone */
        }
        widgetIdRef.current = null;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [siteKey, resetKey]);

  if (!siteKey && !error) return null;

  return (
    <div>
      <div ref={containerRef} className="flex justify-center" aria-live="polite" />
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
};

export { TurnstileWidget };
