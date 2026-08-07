import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";
import { z } from "npm:zod@3.23.8";

const BodySchema = z.object({
  token: z.string().min(1).max(4096),
  action: z.enum(["signup", "password_reset"]),
});

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const json = { headers: { ...corsHeaders, "Content-Type": "application/json" } };

  const secret = Deno.env.get("TURNSTILE_SECRET_KEY");
  if (!secret) {
    return new Response(JSON.stringify({ error: "Captcha is not configured" }), { ...json, status: 503 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON body" }), { ...json, status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return new Response(JSON.stringify({ error: parsed.error.flatten().fieldErrors }), { ...json, status: 400 });
  }

  const form = new FormData();
  form.append("secret", secret);
  form.append("response", parsed.data.token);
  const ip = req.headers.get("cf-connecting-ip") ?? req.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  if (ip) form.append("remoteip", ip);

  try {
    const res = await fetch("https://challenges.cloudflare.com/turnstile/v0/siteverify", {
      method: "POST",
      body: form,
    });
    const result = await res.json();

    if (!result.success) {
      console.error("Turnstile verification failed", result["error-codes"], parsed.data.action);
      return new Response(JSON.stringify({ success: false, error: "Captcha verification failed" }), {
        ...json,
        status: 403,
      });
    }

    return new Response(JSON.stringify({ success: true }), { ...json, status: 200 });
  } catch (err) {
    console.error("Turnstile request error", (err as Error)?.message);
    return new Response(JSON.stringify({ success: false, error: "Captcha verification unavailable" }), {
      ...json,
      status: 502,
    });
  }
});
