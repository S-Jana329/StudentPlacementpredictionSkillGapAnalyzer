import { corsHeaders } from "npm:@supabase/supabase-js@2/cors";

// Returns the public Turnstile site key so the frontend can render the widget.
// The site key is public by design; the secret key never leaves the server.
Deno.serve((req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const siteKey = Deno.env.get("TURNSTILE_SITE_KEY") ?? "";

  return new Response(JSON.stringify({ siteKey, enabled: siteKey.length > 0 }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
    status: 200,
  });
});
