// Generate a structured career roadmap using Lovable AI.
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

    const { roadmap_id } = await req.json();
    if (!roadmap_id) return j({ error: "roadmap_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    const { data: row } = await admin
      .from("career_roadmaps")
      .select("*")
      .eq("id", roadmap_id)
      .single();
    if (!row || row.user_id !== userId) return j({ error: "Forbidden" }, 403);

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content: "You are a career coach. Build practical, week-by-week learning roadmaps that get a student job-ready. Be specific about skills, projects, and free or low-cost resources.",
          },
          {
            role: "user",
            content: `Target role: ${row.target_role}\nTime horizon: ${row.time_horizon_months} months\nCurrent skills / background:\n${row.current_skills || "(not provided)"}\n\nBuild a roadmap.`,
          },
        ],
        tools: [{
          type: "function",
          function: {
            name: "submit_roadmap",
            description: "Submit a structured career roadmap.",
            parameters: {
              type: "object",
              properties: {
                summary: { type: "string", description: "2-3 sentence overview." },
                core_skills: { type: "array", items: { type: "string" } },
                milestones: {
                  type: "array",
                  description: "Phased milestones across the time horizon.",
                  items: {
                    type: "object",
                    properties: {
                      phase: { type: "string", description: "e.g. Month 1, Weeks 1-4" },
                      title: { type: "string" },
                      objectives: { type: "array", items: { type: "string" } },
                      skills: { type: "array", items: { type: "string" } },
                      projects: { type: "array", items: { type: "string" } },
                      resources: {
                        type: "array",
                        items: {
                          type: "object",
                          properties: {
                            title: { type: "string" },
                            type: { type: "string", description: "course | book | docs | video | article" },
                            url: { type: "string" },
                          },
                          required: ["title", "type"],
                        },
                      },
                    },
                    required: ["phase", "title", "objectives", "skills"],
                  },
                },
                final_outcomes: { type: "array", items: { type: "string" }, description: "What the student should be able to do at the end." },
              },
              required: ["summary", "core_skills", "milestones", "final_outcomes"],
              additionalProperties: false,
            },
          },
        }],
        tool_choice: { type: "function", function: { name: "submit_roadmap" } },
      }),
    });

    if (!aiRes.ok) {
      const t = await aiRes.text();
      console.error("AI roadmap error", aiRes.status, t);
      const msg = aiRes.status === 429 ? "Rate limit reached. Please try again." :
                  aiRes.status === 402 ? "AI credits exhausted. Add credits in workspace settings." :
                  "Roadmap generation failed.";
      await admin.from("career_roadmaps").update({ status: "failed", error: msg }).eq("id", roadmap_id);
      return j({ error: msg }, aiRes.status);
    }

    const data = await aiRes.json();
    const tool = data.choices?.[0]?.message?.tool_calls?.[0];
    if (!tool?.function?.arguments) {
      await admin.from("career_roadmaps").update({ status: "failed", error: "No structured output" }).eq("id", roadmap_id);
      return j({ error: "No structured output" }, 500);
    }

    const parsed = JSON.parse(tool.function.arguments);

    await admin
      .from("career_roadmaps")
      .update({ status: "complete", roadmap: parsed, error: null })
      .eq("id", roadmap_id);

    return j({ ok: true, roadmap: parsed });
  } catch (e) {
    console.error("generate-roadmap error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
