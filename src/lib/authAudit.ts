import { supabase } from "@/integrations/supabase/client";

export type AuthAuditEvent = "signup" | "password_reset_requested" | "password_reset_completed";

/**
 * Records an authentication event in the admin-visible audit log.
 * Fire-and-forget: logging must never block or break the auth flow.
 */
export async function logAuthEvent(
  event_type: AuthAuditEvent,
  options: { email?: string; success?: boolean; details?: Record<string, string | number | boolean> } = {},
) {
  try {
    await supabase.functions.invoke("log-auth-event", {
      body: { event_type, ...options },
    });
  } catch (err) {
    console.error("Failed to record auth event", (err as Error)?.message);
  }
}
