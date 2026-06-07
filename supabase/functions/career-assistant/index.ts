// Streaming career assistant chatbot.
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

    const { messages } = await req.json();
    if (!Array.isArray(messages)) return jsonErr("messages required", 400);

    const system = `You are a warm, encouraging career assistant for students. You help with:
- Career path exploration and decision-making
- Resume, internship, and job application advice
- Skill development recommendations
- Interview preparation tips
- Industry insights and trends
- Networking and personal branding

Guidelines:
- Be conversational, supportive, and specific.
- Ask clarifying questions when the student's goal is unclear.
- Use markdown (lists, bold, headings) to keep answers scannable.
- Recommend concrete next steps and learning resources when relevant.
- If the student asks about something outside career/education, gently steer back.`;

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
    console.error("career-assistant error", e);
    return jsonErr(e instanceof Error ? e.message : "Unknown error", 500);
  }
});

function jsonErr(error: string, status: number) {
  return new Response(JSON.stringify({ error }), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
