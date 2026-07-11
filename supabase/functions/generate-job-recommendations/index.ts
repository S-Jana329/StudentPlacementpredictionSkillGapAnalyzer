// Generate AI job recommendations for one user or for all eligible students (cron mode).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const ANON = Deno.env.get("SUPABASE_ANON_KEY") ?? "";
const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY")!;

type Pref = {
  work_mode: string;
  locations: string[];
  min_match_score: number;
  email_digest: boolean;
};

const DEFAULT_PREF: Pref = {
  work_mode: "any",
  locations: [],
  min_match_score: 60,
  email_digest: true,
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

    let targetUserIds: string[] = [];
    let invokedByUser: string | null = null;

    const authHeader = req.headers.get("Authorization");
    let body: { user_id?: string; all?: boolean } = {};
    try {
      body = await req.json();
    } catch (_e) {
      body = {};
    }

    if (body?.all === true) {
      // Cron path: require shared secret stored in the internal app_secrets table
      const cronSecret = req.headers.get("x-cron-secret");
      const { data: secretRow } = await admin
        .from("app_secrets")
        .select("value")
        .eq("name", "cron_secret")
        .maybeSingle();
      const expected = (secretRow as { value?: string } | null)?.value ?? Deno.env.get("CRON_SECRET");
      if (!expected || !cronSecret || cronSecret !== expected) {
        return j({ error: "Forbidden" }, 403);
      }
      const { data: rows } = await admin
        .from("resume_analyses")
        .select("user_id")
        .eq("status", "complete");
      targetUserIds = Array.from(new Set((rows ?? []).map((r) => r.user_id as string)));
    } else {
      // User-invoked path
      if (!authHeader) return j({ error: "Unauthorized" }, 401);
      const userClient = createClient(SUPABASE_URL, ANON, {
        global: { headers: { Authorization: authHeader } },
      });
      const { data: userData, error: userErr } = await userClient.auth.getUser();
      if (userErr || !userData?.user) return j({ error: "Unauthorized" }, 401);
      invokedByUser = userData.user.id;
      targetUserIds = [body?.user_id || invokedByUser];
      if (body?.user_id && body.user_id !== invokedByUser) {
        return j({ error: "Forbidden" }, 403);
      }
    }

    const results: { user_id: string; new_count: number; status: string; error?: string }[] = [];
    for (const uid of targetUserIds) {
      try {
        const newCount = await runForUser(admin, uid);
        results.push({ user_id: uid, new_count: newCount, status: "ok" });
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        console.error("job-rec failure", uid, msg);
        await admin.from("job_alert_runs").insert({
          user_id: uid,
          status: "failed",
          new_count: 0,
          error: msg.slice(0, 500),
        });
        results.push({ user_id: uid, new_count: 0, status: "failed", error: msg });
      }
    }

    return j({ ok: true, processed: results.length, results });
  } catch (e) {
    console.error("generate-job-recommendations error", e);
    return j({ error: e instanceof Error ? e.message : "Unknown" }, 500);
  }
});

async function runForUser(admin: ReturnType<typeof createClient>, userId: string): Promise<number> {
  // Gather context
  const [profileRes, resumeRes, roadmapRes, prefRes, recentRecs] = await Promise.all([
    admin.from("profiles").select("full_name, department, gpa, year, email").eq("id", userId).maybeSingle(),
    admin.from("resume_analyses")
      .select("skills, recommended_roles, experience_summary, education_summary, match_score, created_at")
      .eq("user_id", userId).eq("status", "complete")
      .order("created_at", { ascending: false }).limit(1).maybeSingle(),
    admin.from("career_roadmaps")
      .select("target_role, current_skills, created_at")
      .eq("user_id", userId).eq("status", "complete")
      .order("created_at", { ascending: false }).limit(3),
    admin.from("job_preferences").select("work_mode, locations, min_match_score, email_digest")
      .eq("user_id", userId).maybeSingle(),
    admin.from("job_recommendations")
      .select("title, company")
      .eq("user_id", userId)
      .gte("created_at", new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()),
  ]);

  if (!resumeRes.data) {
    // nothing to match against
    await admin.from("job_alert_runs").insert({ user_id: userId, status: "skipped", new_count: 0, error: "no resume" });
    return 0;
  }

  const profile = profileRes.data ?? {};
  const resume = resumeRes.data;
  const roadmaps = (roadmapRes.data ?? []) as Array<{ target_role: string }>;
  const pref: Pref = { ...DEFAULT_PREF, ...(prefRes.data ?? {}) };
  const existing = new Set(
    (recentRecs.data ?? []).map((r: any) => `${(r.title ?? "").toLowerCase()}|${(r.company ?? "").toLowerCase()}`),
  );

  const skills = Array.isArray(resume.skills) ? resume.skills : [];
  const recommendedRoles = Array.isArray(resume.recommended_roles) ? resume.recommended_roles : [];
  const targetRoles = roadmaps.map((r) => r.target_role).filter(Boolean);

  const sys = `You generate realistic, current job role recommendations for a student.
Scoring weights (0-100 total): skills overlap 50, target-role alignment 25, GPA/department fit 15, location/work-mode fit 10.
Only return roles plausibly hiring entry-level / early-career talent. Companies should be real, well-known, or plausible startups; do not invent obvious fakes.
Output 4 to 8 roles. Avoid duplicates of the "previously suggested" list.`;

  const userPrompt = `STUDENT PROFILE
Department: ${(profile as any).department ?? "unknown"}
GPA: ${(profile as any).gpa ?? "unknown"}
Year: ${(profile as any).year ?? "unknown"}

RESUME SKILLS: ${JSON.stringify(skills).slice(0, 2000)}
RESUME RECOMMENDED ROLES: ${JSON.stringify(recommendedRoles).slice(0, 1000)}
ROADMAP TARGET ROLES: ${JSON.stringify(targetRoles)}

PREFERENCES
Work mode: ${pref.work_mode}
Locations: ${JSON.stringify(pref.locations)}
Minimum match score to surface: ${pref.min_match_score}

PREVIOUSLY SUGGESTED (avoid duplicates):
${Array.from(existing).slice(0, 40).join("\n") || "(none)"}

Generate fresh role suggestions now.`;

  const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${LOVABLE_API_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages: [
        { role: "system", content: sys },
        { role: "user", content: userPrompt },
      ],
      tools: [{
        type: "function",
        function: {
          name: "submit_recommendations",
          description: "Submit job role recommendations.",
          parameters: {
            type: "object",
            properties: {
              roles: {
                type: "array",
                items: {
                  type: "object",
                  properties: {
                    title: { type: "string" },
                    company: { type: "string" },
                    location: { type: "string" },
                    work_mode: { type: "string", enum: ["remote", "hybrid", "onsite"] },
                    description: { type: "string", description: "1-2 sentences." },
                    required_skills: { type: "array", items: { type: "string" } },
                    min_gpa: { type: "number" },
                    match_score: { type: "integer", minimum: 0, maximum: 100 },
                    match_reasons: { type: "array", items: { type: "string" }, description: "3-5 short reasons." },
                  },
                  required: ["title", "company", "match_score", "required_skills", "match_reasons"],
                  additionalProperties: false,
                },
              },
            },
            required: ["roles"],
            additionalProperties: false,
          },
        },
      }],
      tool_choice: { type: "function", function: { name: "submit_recommendations" } },
    }),
  });

  if (!aiRes.ok) {
    const t = await aiRes.text();
    throw new Error(`AI ${aiRes.status}: ${t.slice(0, 300)}`);
  }

  const data = await aiRes.json();
  const tool = data.choices?.[0]?.message?.tool_calls?.[0];
  if (!tool?.function?.arguments) throw new Error("No structured output");
  const parsed = JSON.parse(tool.function.arguments) as {
    roles: Array<{
      title: string; company: string; location?: string; work_mode?: "remote" | "hybrid" | "onsite";
      description?: string; required_skills: string[]; min_gpa?: number;
      match_score: number; match_reasons: string[];
    }>;
  };

  const fresh = parsed.roles.filter((r) => {
    const k = `${r.title.toLowerCase()}|${r.company.toLowerCase()}`;
    if (existing.has(k)) return false;
    if (r.match_score < pref.min_match_score) return false;
    return true;
  });

  if (fresh.length === 0) {
    await admin.from("job_alert_runs").insert({ user_id: userId, status: "ok", new_count: 0 });
    return 0;
  }

  const rows = fresh.map((r) => ({
    user_id: userId,
    title: r.title,
    company: r.company,
    location: r.location ?? null,
    work_mode: r.work_mode ?? null,
    description: r.description ?? null,
    required_skills: r.required_skills ?? [],
    min_gpa: r.min_gpa ?? null,
    match_score: Math.max(0, Math.min(100, Math.round(r.match_score))),
    match_reasons: r.match_reasons ?? [],
    source: "ai",
  }));

  const { error: insErr } = await admin.from("job_recommendations").insert(rows);
  if (insErr) throw new Error(insErr.message);

  await admin.from("job_alert_runs").insert({ user_id: userId, status: "ok", new_count: rows.length });

  // Optional email digest — best-effort, ignore errors if email infra is not set up
  if (pref.email_digest && (profile as any).email) {
    try {
      await admin.functions.invoke("send-transactional-email", {
        body: {
          templateName: "job-recommendations-digest",
          recipientEmail: (profile as any).email,
          idempotencyKey: `job-digest-${userId}-${new Date().toISOString().slice(0, 10)}`,
          templateData: {
            name: (profile as any).full_name ?? "there",
            count: rows.length,
            roles: rows.slice(0, 5).map((r) => ({
              title: r.title, company: r.company, location: r.location,
              match_score: r.match_score,
            })),
          },
        },
      });
    } catch (e) {
      console.warn("email digest skipped:", e instanceof Error ? e.message : e);
    }
  }

  return rows.length;
}

function j(b: unknown, s = 200) {
  return new Response(JSON.stringify(b), { status: s, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
