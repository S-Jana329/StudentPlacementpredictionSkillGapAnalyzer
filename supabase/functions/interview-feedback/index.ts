// Generates structured end-of-interview feedback by analyzing the full transcript.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return j({ error: "Unauthorized" }, 401);

    const userClient = createClient(SUPABASE_URL, ANON, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return j({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { session_id } = await req.json();
    if (!session_id) return j({ error: "session_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: session } = await admin
      .from("interview_sessions")
      .select("*")
      .eq("id", session_id)
      .single();
    if (!session || session.user_id !== userId) return j({ error: "Forbidden" }, 403);

    const { data: msgs } = await admin
      .from("interview_messages")
      .select("role, content")
      .eq("session_id", session_id)
      .order("created_at", { ascending: true });

    const transcript = (msgs ?? [])
      .map((m: any) => `${m.role === "assistant" ? "INTERVIEWER" : "CANDIDATE"}: ${m.content}`)
      .join("\n\n");

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You evaluate mock interview transcripts and produce honest, constructive feedback for the candidate.",
          },
          {
            role: "user",
            content: `Role: ${session.role}\nDifficulty: ${session.difficulty}\n\nTRANSCRIPT:\n${transcript}\n\nGive structured feedback.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_feedback",
            description: "Submit structured interview feedback.",
            parameters: {
              type: "object",
              properties: {
                overall_score: { type: "number", description: "0-100 overall performance." },
                summary: { type: "string", description: "2-3 sentence overall summary." },
                strengths: { type: "array", items: { type: "string" } },
                improvements: { type: "array", items: { type: "string" } },
                question_feedback: {
                  type: "array",
                  items: {
                    type: "object",
                    properties: {
                      question: { type: "string" },
                      answer_quality: { type: "string", description: "weak | average | strong" },
                      note: { type: "string", description: "What was good and what to improve." },
                    },
                    required: ["question", "answer_quality", "note"],
                  },
                },
                next_steps: { type: "array", items: { type: "string" } },
              },
              required: ["overall_score", "summary", "strengths", "improvements", "question_feedback", "next_steps"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_feedback" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI feedback error", aiRes.status, t);
      const msg = aiRes.status === 429 ? "Rate limit reached." :
                  aiRes.status === 402 ? "AI credits exhausted." :
                  "Feedback generation failed.";
      return j({ error: msg }, aiRes.status);
    }

    const data = await aiRes.json();
    const tool = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tool?.function?.arguments) return j({ error: "No feedback returned" }, 500);

    const parsed = JSON.parse(tool.function.arguments);

    await admin
      .from("interview_sessions")
      .update({
        status: "completed",
        overall_score: Math.round(parsed.overall_score),
        feedback: parsed,
      })
      .eq("id", session_id);

    return j({ ok: true, feedback: parsed });
  } catch (e) {
    console.error("interview-feedback error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
