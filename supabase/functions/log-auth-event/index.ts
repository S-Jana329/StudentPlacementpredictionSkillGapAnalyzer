import { createClient } from "npm:@supabase/supabase-js@2";
import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  event_type: z.enum(["signup", "password_reset_requested", "password_reset_completed"]),
  email: z.string().trim().email().max(255).optional(),
  success: z.boolean().optional(),
  details: z.record(z.union([z.string(), z.number(), z.boolean()])).optional(),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = { headers: { ...corsHeaders, "Content-Type": "application/json" } };

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { ...json, status: 400 });
  }

  const parsed = BodySchema.safeParse(raw);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { ...json, status: 400 });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { persistSession: false } },
  );

  // If the caller is signed in (e.g. completing a password reset), attribute the event.
  let userId: string | null = null;
  const authHeader = req.headers.get("Authorization");
  if (authHeader?.startsWith("Bearer ")) {
    const { data } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));
    userId = data.user?.id ?? null;
  }

  const ip =
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    null;

  const { error } = await supabase.from("auth_audit_log").insert({
    event_type: parsed.data.event_type,
    email: parsed.data.email ?? null,
    user_id: userId,
    ip_address: ip,
    user_agent: req.headers.get("user-agent")?.slice(0, 500) ?? null,
    success: parsed.data.success ?? true,
    details: parsed.data.details ?? {},
  });

  if (error) {
    console.error("Failed to write auth audit log", error.message);
    return new Response(JSON.stringify({ error: "Could not record event" }), { ...json, status: 500 });
  }

  return new Response(JSON.stringify({ success: true }), { ...json, status: 200 });
});
