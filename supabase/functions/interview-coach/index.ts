// Streaming AI interviewer. Receives full message history and streams the next interviewer turn.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return jsonErr("Unauthorized", 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return jsonErr("Unauthorized", 401);

    const { role, difficulty, messages } = await req.json();
    if (!role || !Array.isArray(messages)) return jsonErr("role and messages required", 400);

    const system = `You are a friendly but rigorous technical interviewer conducting a mock interview for the role of "${role}" at ${difficulty} difficulty.

Rules:
- Ask ONE question at a time. Wait for the candidate's answer before asking the next.
- Cover a mix: behavioral, technical concepts, problem-solving, and a couple of role-specific scenarios.
- After the candidate answers, briefly acknowledge (1 sentence), then either ask a follow-up to probe deeper OR move to the next question.
- Keep your turns concise (under 80 words).
- Do NOT reveal you are an AI. Stay in character as an interviewer.
- After about 6-8 questions total, wrap up by saying: "Great, that's all the questions I have for today. Click 'End interview' to see your feedback."
- Do not give detailed feedback during the interview — that comes at the end.

Start with a warm greeting and your first question if no candidate messages exist yet.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        stream: true,
        messages: [{ role: "system", content: system }, ...messages],
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI error", aiRes.status, t);
      const msg =
        aiRes.status === 429 ? "Rate limit reached. Please wait a moment and try again." :
        aiRes.status === 402 ? "AI credits exhausted. Add credits in workspace settings." :
        "AI request failed.";
      return jsonErr(msg, aiRes.status);
    }

    return new Response(aiRes.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("interview-coach error", e);
    return jsonErr(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

function jsonErr(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
