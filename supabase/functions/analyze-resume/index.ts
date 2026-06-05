// Analyze an uploaded resume PDF using Lovable AI and store structured results.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { extractText, getDocumentProxy } from "https://esm.sh/unpdf@0.12.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return json({ error: "Missing authorization" }, 401);
    }

    // Validate user from JWT
    const userClient = createClient(SUPABASE_URL, Deno.env.get("SUPABASE_ANON_KEY") ?? "", {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: userData, error: userErr } = await userClient.auth.getUser();
    if (userErr || !userData?.user) return json({ error: "Unauthorized" }, 401);
    const userId = userData.user.id;

    const { analysis_id } = await req.json();
    if (!analysis_id) return json({ error: "analysis_id required" }, 400);

    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    // Fetch the analysis row + verify ownership
    const { data: row, error: rowErr } = await admin
      .from("resume_analyses")
      .select("*")
      .eq("id", analysis_id)
      .single();
    if (rowErr || !row) return json({ error: "Analysis not found" }, 404);
    if (row.user_id !== userId) return json({ error: "Forbidden" }, 403);

    // Download the PDF
    const { data: blob, error: dlErr } = await admin.storage
      .from("resumes")
      .download(row.storage_path);
    if (dlErr || !blob) {
      await admin.from("resume_analyses").update({ status: "failed", error: "Could not download file" }).eq("id", analysis_id);
      return json({ error: "Download failed" }, 500);
    }

    // Extract text
    let resumeText = "";
    try {
      const buf = new Uint8Array(await blob.arrayBuffer());
      const pdf = await getDocumentProxy(buf);
      const { text } = await extractText(pdf, { mergePages: true });
      resumeText = Array.isArray(text) ? text.join("\n") : text;
    } catch (e) {
      console.error("PDF extract error", e);
      await admin.from("resume_analyses").update({ status: "failed", error: "PDF parsing failed" }).eq("id", analysis_id);
      return json({ error: "PDF parsing failed" }, 500);
    }

    if (!resumeText || resumeText.trim().length < 30) {
      await admin.from("resume_analyses").update({ status: "failed", error: "Resume text too short or empty" }).eq("id", analysis_id);
      return json({ error: "Resume appears empty" }, 400);
    }

    // Call Lovable AI Gateway with tool calling for structured output
    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-2.5-flash",
        messages: [
          {
            role: "system",
            content:
              "You are an expert career advisor analyzing student resumes for placement readiness. Be specific, honest, and constructive.",
          },
          {
            role: "user",
            content: `Analyze this resume and return structured insights for placement prediction.\n\nRESUME:\n${resumeText.slice(0, 12000)}`,
          },
        ],
        tools: [
          {
            type: "function",
            function: {
              name: "submit_analysis",
              description: "Return structured resume analysis.",
              parameters: {
                type: "object",
                properties: {
                  skills: { type: "array", items: { type: "string" }, description: "Technical and soft skills extracted." },
                  experience_summary: { type: "string", description: "2-3 sentence summary of work/internship experience." },
                  education_summary: { type: "string", description: "Brief education summary." },
                  match_score: { type: "number", description: "Placement readiness score 0-100." },
                  strengths: { type: "array", items: { type: "string" }, description: "3-5 key strengths." },
                  weaknesses: { type: "array", items: { type: "string" }, description: "3-5 areas to improve." },
                  recommendations: { type: "array", items: { type: "string" }, description: "3-5 actionable next steps." },
                  recommended_roles: { type: "array", items: { type: "string" }, description: "3-5 suitable job roles." },
                },
                required: [
                  "skills","experience_summary","education_summary","match_score",
                  "strengths","weaknesses","recommendations","recommended_roles",
                ],
                additionalProperties: false,
              },
            },
          },
        ],
        tool_choice: { type: "function", function: { name: "submit_analysis" } },
      }),
    });

    if (!aiRes.ok) {
      const text = await aiRes.text();
      console.error("AI error", aiRes.status, text);
      const msg =
        aiRes.status === 429 ? "Rate limit reached. Please try again in a minute." :
        aiRes.status === 402 ? "AI credits exhausted. Please add credits in workspace settings." :
        "AI analysis failed.";
      await admin.from("resume_analyses").update({ status: "failed", error: msg }).eq("id", analysis_id);
      return json({ error: msg }, aiRes.status);
    }

    const aiData = await aiRes.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    if (!toolCall?.function?.arguments) {
      await admin.from("resume_analyses").update({ status: "failed", error: "No structured output from AI" }).eq("id", analysis_id);
      return json({ error: "No structured output" }, 500);
    }

    const parsed = JSON.parse(toolCall.function.arguments);

    const { error: updErr } = await admin
      .from("resume_analyses")
      .update({
        status: "complete",
        skills: parsed.skills,
        experience_summary: parsed.experience_summary,
        education_summary: parsed.education_summary,
        match_score: Math.round(parsed.match_score),
        strengths: parsed.strengths,
        weaknesses: parsed.weaknesses,
        recommendations: parsed.recommendations,
        recommended_roles: parsed.recommended_roles,
        raw_text: resumeText.slice(0, 20000),
        error: null,
      })
      .eq("id", analysis_id);

    if (updErr) {
      console.error("DB update error", updErr);
      return json({ error: "Failed to save results" }, 500);
    }

    return json({ ok: true, analysis_id });
  } catch (e) {
    console.error("analyze-resume error", e);
    return json({ error: e instanceof Error ? e.message : "Unknown error" }, 500);
  }
});

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
