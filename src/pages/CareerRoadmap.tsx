import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Loader2, Plus, Trash2, Map, ExternalLink, CheckCircle2 } from "lucide-react";

type Roadmap = {
  id: string;
  target_role: string;
  current_skills: string | null;
  time_horizon_months: number;
  status: string;
  roadmap: any | null;
  error: string | null;
  created_at: string;
};

const CareerRoadmap = () => {
  const { user } = useAuth();
  const [items, setItems] = useState<Roadmap[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [creating, setCreating] = useState(false);
  const [role, setRole] = useState("Frontend Developer");
  const [months, setMonths] = useState(6);
  const [skills, setSkills] = useState("");

  const load = async () => {
    const { data } = await supabase
      .from("career_roadmaps")
      .select("*")
      .order("created_at", { ascending: false });
    setItems((data ?? []) as any);
    if (data?.length && !activeId) setActiveId(data[0].id);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("roadmaps-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "career_roadmaps", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const active = items.find((i) => i.id === activeId) ?? null;

  const create = async () => {
    if (!user) return;
    if (!role.trim()) return toast.error("Target role is required");
    setCreating(true);
    try {
      const { data: row, error } = await supabase
        .from("career_roadmaps")
        .insert({
          user_id: user.id,
          target_role: role.trim(),
          current_skills: skills.trim() || null,
          time_horizon_months: months,
          status: "processing",
        })
        .select()
        .single();
      if (error) throw error;
      setActiveId(row.id);
      setShowNew(false);

      const { error: fnErr } = await supabase.functions.invoke("generate-roadmap", {
        body: { roadmap_id: row.id },
      });
      if (fnErr) throw fnErr;
      toast.success("Roadmap generated");
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to generate roadmap");
    } finally {
      setCreating(false);
    }
  };

  const remove = async (id: string) => {
    const { error } = await supabase.from("career_roadmaps").delete().eq("id", id);
    if (error) return toast.error(error.message);
    if (activeId === id) setActiveId(null);
    toast.success("Deleted");
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="flex h-[calc(100vh-57px)]">
        {/* Sidebar */}
        <aside className="w-72 border-r border-border bg-card p-4 flex flex-col gap-3 overflow-y-auto">
          <Button onClick={() => setShowNew(true)} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> New roadmap
          </Button>
          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-xs text-muted-foreground font-body">No roadmaps yet.</p>
            )}
            {items.map((r) => (
              <button
                key={r.id}
                onClick={() => setActiveId(r.id)}
                className={`w-full text-left p-3 rounded-md border transition ${
                  activeId === r.id ? "border-primary bg-primary/5" : "border-border hover:bg-muted"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium font-body truncate">{r.target_role}</p>
                  <Trash2
                    className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      remove(r.id);
                    }}
                  />
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <Badge variant="outline" className="text-[10px]">
                    {r.time_horizon_months}mo
                  </Badge>
                  <span className="text-[10px] text-muted-foreground">
                    {r.status === "processing" ? "Generating..." : r.status}
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Main */}
        <section className="flex-1 overflow-y-auto p-8">
          {showNew && (
            <div className="section-card max-w-2xl mb-6">
              <h2 className="font-display text-xl font-bold mb-4">New career roadmap</h2>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="role">Target role</Label>
                  <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Data Analyst" />
                </div>
                <div>
                  <Label htmlFor="months">Time horizon (months)</Label>
                  <Input
                    id="months"
                    type="number"
                    min={1}
                    max={24}
                    value={months}
                    onChange={(e) => setMonths(Math.max(1, Math.min(24, parseInt(e.target.value || "6"))))}
                  />
                </div>
                <div>
                  <Label htmlFor="skills">Current skills & background (optional)</Label>
                  <Textarea
                    id="skills"
                    value={skills}
                    onChange={(e) => setSkills(e.target.value)}
                    placeholder="What you already know, projects you've built, courses you've taken..."
                    rows={4}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={create} disabled={creating}>
                    {creating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Map className="w-4 h-4 mr-2" />}
                    Generate roadmap
                  </Button>
                  <Button variant="outline" onClick={() => setShowNew(false)} disabled={creating}>
                    Cancel
                  </Button>
                </div>
              </div>
            </div>
          )}

          {!active && !showNew && (
            <div className="text-center text-muted-foreground py-20">
              <Map className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p className="font-body">Create a roadmap to get an AI-generated learning path.</p>
            </div>
          )}

          {active && (
            <div className="max-w-4xl space-y-6">
              <div>
                <h1 className="font-display text-3xl font-bold">{active.target_role}</h1>
                <p className="text-sm text-muted-foreground font-body mt-1">
                  {active.time_horizon_months}-month plan · created {new Date(active.created_at).toLocaleDateString()}
                </p>
              </div>

              {active.status === "processing" && (
                <div className="section-card flex items-center gap-3">
                  <Loader2 className="w-5 h-5 animate-spin text-primary" />
                  <p className="font-body text-sm">Generating your roadmap...</p>
                </div>
              )}

              {active.status === "failed" && (
                <div className="section-card border-destructive">
                  <p className="text-sm text-destructive font-body">
                    {active.error ?? "Generation failed."}
                  </p>
                </div>
              )}

              {active.status === "complete" && active.roadmap && (
                <RoadmapView data={active.roadmap} />
              )}
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

const RoadmapView = ({ data }: { data: any }) => (
  <div className="space-y-6">
    <div className="section-card">
      <h2 className="font-display text-lg font-bold mb-2">Summary</h2>
      <p className="font-body text-sm text-muted-foreground">{data.summary}</p>
      {data.core_skills?.length > 0 && (
        <div className="mt-4 flex flex-wrap gap-2">
          {data.core_skills.map((s: string) => (
            <Badge key={s} variant="secondary">
              {s}
            </Badge>
          ))}
        </div>
      )}
    </div>

    <div className="space-y-4">
      <h2 className="font-display text-xl font-bold">Milestones</h2>
      {(data.milestones ?? []).map((m: any, idx: number) => (
        <div key={idx} className="section-card">
          <div className="flex items-baseline justify-between mb-2">
            <h3 className="font-display text-base font-bold">{m.title}</h3>
            <Badge>{m.phase}</Badge>
          </div>
          {m.objectives?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-1">Objectives</p>
              <ul className="space-y-1">
                {m.objectives.map((o: string, i: number) => (
                  <li key={i} className="text-sm font-body flex gap-2">
                    <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
                    <span>{o}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {m.skills?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-1">Skills</p>
              <div className="flex flex-wrap gap-1.5">
                {m.skills.map((s: string) => (
                  <Badge key={s} variant="outline" className="text-xs">{s}</Badge>
                ))}
              </div>
            </div>
          )}
          {m.projects?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-1">Projects</p>
              <ul className="list-disc pl-5 text-sm font-body space-y-1">
                {m.projects.map((p: string, i: number) => <li key={i}>{p}</li>)}
              </ul>
            </div>
          )}
          {m.resources?.length > 0 && (
            <div className="mt-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground font-body mb-1">Resources</p>
              <ul className="space-y-1">
                {m.resources.map((r: any, i: number) => (
                  <li key={i} className="text-sm font-body">
                    {r.url ? (
                      <a href={r.url} target="_blank" rel="noreferrer" className="text-primary hover:underline inline-flex items-center gap-1">
                        {r.title} <ExternalLink className="w-3 h-3" />
                      </a>
                    ) : (
                      <span>{r.title}</span>
                    )}
                    <span className="text-muted-foreground ml-2 text-xs">({r.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ))}
    </div>

    {data.final_outcomes?.length > 0 && (
      <div className="section-card">
        <h2 className="font-display text-lg font-bold mb-2">By the end you'll be able to</h2>
        <ul className="space-y-1">
          {data.final_outcomes.map((o: string, i: number) => (
            <li key={i} className="text-sm font-body flex gap-2">
              <CheckCircle2 className="w-4 h-4 text-primary shrink-0 mt-0.5" />
              <span>{o}</span>
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

export default CareerRoadmap;
