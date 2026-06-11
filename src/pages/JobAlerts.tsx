import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { Briefcase, Loader2, MapPin, Sparkles, Eye, X, Plus, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Rec = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  work_mode: string | null;
  description: string | null;
  required_skills: string[];
  min_gpa: number | null;
  match_score: number;
  match_reasons: string[];
  seen_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

type Pref = {
  work_mode: "remote" | "hybrid" | "onsite" | "any";
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

type Filter = "all" | "unseen" | "dismissed";

const JobAlerts = () => {
  const { user } = useAuth();
  const [recs, setRecs] = useState<Rec[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [filter, setFilter] = useState<Filter>("all");
  const [pref, setPref] = useState<Pref>(DEFAULT_PREF);
  const [savingPref, setSavingPref] = useState(false);
  const [locationDraft, setLocationDraft] = useState("");

  const loadAll = async () => {
    if (!user) return;
    const [{ data: r }, { data: p }] = await Promise.all([
      supabase
        .from("job_recommendations")
        .select("*")
        .eq("user_id", user.id)
        .order("match_score", { ascending: false })
        .order("created_at", { ascending: false }),
      supabase
        .from("job_preferences")
        .select("work_mode, locations, min_match_score, email_digest")
        .eq("user_id", user.id)
        .maybeSingle(),
    ]);
    setRecs((r ?? []) as Rec[]);
    if (p) setPref({ ...DEFAULT_PREF, ...(p as Pref) });
    setLoading(false);
  };

  useEffect(() => {
    if (!user) return;
    loadAll();
    const channel = supabase
      .channel(`job-recs-page-${user.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "job_recommendations", filter: `user_id=eq.${user.id}` },
        () => loadAll(),
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const filtered = useMemo(() => {
    if (filter === "unseen") return recs.filter((r) => !r.seen_at && !r.dismissed_at);
    if (filter === "dismissed") return recs.filter((r) => r.dismissed_at);
    return recs.filter((r) => !r.dismissed_at);
  }, [recs, filter]);

  const unseenCount = recs.filter((r) => !r.seen_at && !r.dismissed_at).length;

  const generate = async () => {
    setGenerating(true);
    const { data, error } = await supabase.functions.invoke("generate-job-recommendations", { body: {} });
    setGenerating(false);
    if (error) {
      toast.error("Couldn't fetch new matches", { description: error.message });
      return;
    }
    const newCount = data?.results?.[0]?.new_count ?? 0;
    if (newCount > 0) toast.success(`${newCount} new match${newCount === 1 ? "" : "es"} added`);
    else toast.message("No new matches right now", { description: "Try again later or adjust your preferences." });
    loadAll();
  };

  const markSeen = async (id: string) => {
    const { error } = await supabase
      .from("job_recommendations")
      .update({ seen_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setRecs((p) => p.map((r) => (r.id === id ? { ...r, seen_at: new Date().toISOString() } : r)));
  };

  const dismiss = async (id: string) => {
    const { error } = await supabase
      .from("job_recommendations")
      .update({ dismissed_at: new Date().toISOString() })
      .eq("id", id);
    if (error) return toast.error(error.message);
    setRecs((p) => p.map((r) => (r.id === id ? { ...r, dismissed_at: new Date().toISOString() } : r)));
  };

  const savePref = async (next: Pref) => {
    if (!user) return;
    setPref(next);
    setSavingPref(true);
    const { error } = await supabase
      .from("job_preferences")
      .upsert({ user_id: user.id, ...next }, { onConflict: "user_id" });
    setSavingPref(false);
    if (error) toast.error("Couldn't save preferences", { description: error.message });
  };

  const addLocation = () => {
    const v = locationDraft.trim();
    if (!v) return;
    if (pref.locations.includes(v)) { setLocationDraft(""); return; }
    savePref({ ...pref, locations: [...pref.locations, v] });
    setLocationDraft("");
  };

  const removeLocation = (loc: string) => {
    savePref({ ...pref, locations: pref.locations.filter((l) => l !== loc) });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-5xl mx-auto p-8 space-y-6">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
              <Briefcase size={22} /> Job Matches
            </h1>
            <p className="text-sm font-body text-muted-foreground mt-1">
              AI-curated roles based on your resume, roadmap, and preferences.{" "}
              <span className="text-foreground font-medium">{unseenCount}</span> new.
            </p>
          </div>
          <Button onClick={generate} disabled={generating}>
            {generating ? <><Loader2 className="animate-spin mr-2" size={14} /> Finding…</> : <><Sparkles className="mr-2" size={14} /> Find matches now</>}
          </Button>
        </div>

        <section className="section-card space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold">Preferences</h2>
            <p className="text-xs text-muted-foreground font-body mt-1">
              These shape which roles the AI suggests and which appear in your daily email digest.
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Work mode</Label>
              <Select
                value={pref.work_mode}
                onValueChange={(v) => savePref({ ...pref, work_mode: v as Pref["work_mode"] })}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any</SelectItem>
                  <SelectItem value="remote">Remote</SelectItem>
                  <SelectItem value="hybrid">Hybrid</SelectItem>
                  <SelectItem value="onsite">Onsite</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Preferred locations</Label>
              <div className="flex gap-2">
                <Input
                  placeholder="e.g. Bengaluru"
                  value={locationDraft}
                  onChange={(e) => setLocationDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLocation(); } }}
                />
                <Button type="button" variant="outline" onClick={addLocation}>
                  <Plus size={14} />
                </Button>
              </div>
              <div className="flex flex-wrap gap-1.5 pt-1">
                {pref.locations.length === 0 && (
                  <span className="text-xs text-muted-foreground">No locations — open to all.</span>
                )}
                {pref.locations.map((l) => (
                  <Badge key={l} variant="secondary" className="gap-1">
                    {l}
                    <button onClick={() => removeLocation(l)} aria-label={`Remove ${l}`}>
                      <X size={10} />
                    </button>
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Minimum match score</Label>
                <span className="text-xs font-mono text-muted-foreground">{pref.min_match_score}</span>
              </div>
              <Slider
                min={0}
                max={100}
                step={5}
                value={[pref.min_match_score]}
                onValueChange={(v) => setPref({ ...pref, min_match_score: v[0] })}
                onValueCommit={(v) => savePref({ ...pref, min_match_score: v[0] })}
              />
            </div>

            <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
              <div>
                <p className="text-sm font-body font-medium text-foreground">Email digest</p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  Get an email when new matches are found.
                </p>
              </div>
              <Switch
                checked={pref.email_digest}
                onCheckedChange={(v) => savePref({ ...pref, email_digest: v })}
              />
            </div>
          </div>
          {savingPref && <p className="text-xs text-muted-foreground">Saving…</p>}
        </section>

        <div className="flex items-center gap-2">
          {(["all", "unseen", "dismissed"] as Filter[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`text-xs font-body px-3 py-1.5 rounded-full border transition-colors capitalize ${
                filter === f
                  ? "bg-primary text-primary-foreground border-primary"
                  : "bg-background border-border text-muted-foreground hover:text-foreground"
              }`}
            >
              {f}
              {f === "unseen" && unseenCount > 0 && <span className="ml-1 opacity-80">({unseenCount})</span>}
            </button>
          ))}
          <Button variant="ghost" size="sm" onClick={loadAll} className="ml-auto">
            <RefreshCw size={12} className="mr-1.5" /> Refresh
          </Button>
        </div>

        {filtered.length === 0 ? (
          <div className="section-card text-center py-12">
            <Briefcase className="mx-auto text-muted-foreground" size={28} />
            <p className="mt-3 text-sm font-body text-foreground">No matches to show.</p>
            <p className="text-xs text-muted-foreground mt-1">
              Click <span className="font-medium">Find matches now</span> to generate fresh recommendations.
            </p>
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {filtered.map((r) => (
              <article
                key={r.id}
                className={`rounded-lg border border-border bg-card p-4 space-y-3 ${
                  !r.seen_at && !r.dismissed_at ? "ring-1 ring-primary/30" : ""
                } ${r.dismissed_at ? "opacity-60" : ""}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-display font-semibold text-foreground leading-snug">{r.title}</h3>
                    <p className="text-sm font-body text-muted-foreground mt-0.5">{r.company}</p>
                  </div>
                  <div
                    className={`shrink-0 w-12 h-12 rounded-full flex items-center justify-center text-sm font-mono font-semibold ${
                      r.match_score >= 80 ? "bg-success/15 text-success"
                        : r.match_score >= 60 ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                    }`}
                    title="Match score"
                  >
                    {r.match_score}
                  </div>
                </div>

                <div className="flex flex-wrap gap-1.5 text-xs">
                  {r.work_mode && <Badge variant="outline" className="capitalize">{r.work_mode}</Badge>}
                  {r.location && (
                    <Badge variant="outline" className="gap-1">
                      <MapPin size={10} /> {r.location}
                    </Badge>
                  )}
                  {!r.seen_at && !r.dismissed_at && (
                    <Badge className="bg-primary text-primary-foreground">New</Badge>
                  )}
                </div>

                {r.description && (
                  <p className="text-xs font-body text-muted-foreground leading-relaxed">{r.description}</p>
                )}

                {r.match_reasons?.length > 0 && (
                  <div>
                    <p className="text-[11px] uppercase tracking-wide font-body font-medium text-muted-foreground">
                      Why this matches
                    </p>
                    <ul className="mt-1 space-y-0.5">
                      {r.match_reasons.slice(0, 4).map((m, i) => (
                        <li key={i} className="text-xs font-body text-foreground flex gap-1.5">
                          <span className="text-primary">•</span>{m}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {r.required_skills?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {r.required_skills.slice(0, 6).map((s) => (
                      <span key={s} className="text-[10px] px-1.5 py-0.5 rounded bg-muted text-muted-foreground font-body">
                        {s}
                      </span>
                    ))}
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  {!r.seen_at && !r.dismissed_at && (
                    <Button variant="outline" size="sm" onClick={() => markSeen(r.id)}>
                      <Eye size={12} className="mr-1.5" /> Mark seen
                    </Button>
                  )}
                  {!r.dismissed_at && (
                    <Button variant="ghost" size="sm" onClick={() => dismiss(r.id)}>
                      <X size={12} className="mr-1.5" /> Dismiss
                    </Button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default JobAlerts;
