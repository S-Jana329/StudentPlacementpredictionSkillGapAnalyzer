import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, FileText, Trash2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Analysis = {
  id: string;
  file_name: string;
  status: string;
  match_score: number | null;
  skills: string[] | null;
  experience_summary: string | null;
  education_summary: string | null;
  strengths: string[] | null;
  weaknesses: string[] | null;
  recommendations: string[] | null;
  recommended_roles: string[] | null;
  error: string | null;
  created_at: string;
  storage_path: string;
};

const ResumeAnalyzer = () => {
  const { user } = useAuth();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [uploading, setUploading] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const load = async () => {
    const { data, error } = await supabase
      .from("resume_analyses")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
      return;
    }
    setAnalyses((data ?? []) as any);
    if (data && data.length && !selectedId) setSelectedId(data[0].id);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  // Realtime updates so UI reflects status change from edge function
  useEffect(() => {
    if (!user) return;
    const channel = supabase
      .channel("resume_analyses_changes")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "resume_analyses", filter: `user_id=eq.${user.id}` },
        () => load()
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const handleUpload = async (file: File) => {
    if (!user) return;
    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error("File must be under 10MB");
      return;
    }
    setUploading(true);
    try {
      const path = `${user.id}/${crypto.randomUUID()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("resumes").upload(path, file, {
        contentType: "application/pdf",
      });
      if (upErr) throw upErr;

      const { data: inserted, error: insErr } = await supabase
        .from("resume_analyses")
        .insert({
          user_id: user.id,
          file_name: file.name,
          storage_path: path,
          status: "processing",
        })
        .select()
        .single();
      if (insErr) throw insErr;

      setSelectedId(inserted.id);
      await load();
      toast.success("Resume uploaded. AI analysis in progress...");

      const { error: fnErr } = await supabase.functions.invoke("analyze-resume", {
        body: { analysis_id: inserted.id },
      });
      if (fnErr) {
        toast.error(fnErr.message);
      }
      await load();
    } catch (e: any) {
      toast.error(e?.message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (a: Analysis) => {
    if (!confirm(`Delete "${a.file_name}"?`)) return;
    await supabase.storage.from("resumes").remove([a.storage_path]);
    await supabase.from("resume_analyses").delete().eq("id", a.id);
    toast.success("Deleted");
    if (selectedId === a.id) setSelectedId(null);
    load();
  };

  const selected = analyses.find((a) => a.id === selectedId) ?? null;

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <div className="flex h-[calc(100vh-57px)] overflow-hidden">
        {/* Sidebar */}
        <aside className="w-80 border-r border-border bg-card overflow-y-auto p-4 space-y-4">
          <div>
            <label className="block">
              <div className={`border-2 border-dashed border-border rounded-md p-6 text-center cursor-pointer hover:border-primary transition-colors ${uploading ? "opacity-60 pointer-events-none" : ""}`}>
                <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
                <p className="text-sm font-body text-foreground font-medium">
                  {uploading ? "Uploading..." : "Upload Resume (PDF)"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">Max 10MB</p>
              </div>
              <Input
                type="file"
                accept="application/pdf"
                className="hidden"
                disabled={uploading}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) handleUpload(f);
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          <div className="space-y-1">
            <p className="data-label">Previous Analyses</p>
            {analyses.length === 0 && (
              <p className="text-xs text-muted-foreground py-4">No resumes yet. Upload one to get started.</p>
            )}
            {analyses.map((a) => (
              <button
                key={a.id}
                onClick={() => setSelectedId(a.id)}
                className={`w-full text-left p-3 rounded border transition-colors ${
                  selectedId === a.id
                    ? "border-primary bg-primary/5"
                    : "border-border bg-background hover:bg-muted"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <FileText size={14} className="mt-0.5 shrink-0 text-muted-foreground" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-body font-medium text-foreground truncate">{a.file_name}</p>
                    <div className="flex items-center gap-2 mt-1">
                      <StatusBadge status={a.status} />
                      {a.match_score != null && (
                        <span className="text-xs text-muted-foreground">· {a.match_score}%</span>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(a); }}
                    className="text-muted-foreground hover:text-destructive"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Detail */}
        <main className="flex-1 overflow-y-auto p-8">
          {!selected ? (
            <div className="h-full flex items-center justify-center">
              <p className="text-sm text-muted-foreground font-body">
                Upload a resume to see AI-powered analysis.
              </p>
            </div>
          ) : selected.status === "processing" ? (
            <div className="max-w-2xl mx-auto section-card text-center py-12">
              <Loader2 className="mx-auto animate-spin text-primary mb-3" />
              <h3 className="font-display text-base font-semibold">Analyzing resume...</h3>
              <p className="text-sm text-muted-foreground font-body mt-2">
                Our AI is extracting skills, experience, and placement insights.
              </p>
            </div>
          ) : selected.status === "failed" ? (
            <div className="max-w-2xl mx-auto section-card">
              <div className="flex items-start gap-3">
                <AlertCircle className="text-destructive shrink-0 mt-1" />
                <div>
                  <h3 className="font-display text-base font-semibold">Analysis failed</h3>
                  <p className="text-sm text-muted-foreground font-body mt-1">
                    {selected.error || "Something went wrong analyzing this resume."}
                  </p>
                </div>
              </div>
            </div>
          ) : (
            <AnalysisDetail a={selected} />
          )}
        </main>
      </div>
    </div>
  );
};

const StatusBadge = ({ status }: { status: string }) => {
  if (status === "processing")
    return <span className="inline-flex items-center gap-1 text-xs text-warning"><Loader2 size={10} className="animate-spin" /> Processing</span>;
  if (status === "failed")
    return <span className="inline-flex items-center gap-1 text-xs text-destructive"><AlertCircle size={10} /> Failed</span>;
  return <span className="inline-flex items-center gap-1 text-xs text-success"><CheckCircle2 size={10} /> Done</span>;
};

const AnalysisDetail = ({ a }: { a: Analysis }) => (
  <div className="max-w-3xl mx-auto space-y-6">
    <div className="section-card">
      <p className="data-label">{a.file_name}</p>
      <div className="flex items-baseline gap-3 mt-2">
        <h2 className="stat-number text-4xl">{a.match_score ?? "--"}%</h2>
        <span className="text-sm text-muted-foreground font-body">Placement readiness score</span>
      </div>
      <Progress value={a.match_score ?? 0} className="mt-3" />
    </div>

    <div className="section-card">
      <h3 className="font-display text-base font-semibold mb-3">Skills Detected</h3>
      <div className="flex flex-wrap gap-2">
        {(a.skills ?? []).map((s) => (
          <span key={s} className="inline-block rounded border border-primary/20 bg-primary/5 px-3 py-1 text-xs text-primary font-medium">
            {s}
          </span>
        ))}
      </div>
    </div>

    <div className="grid sm:grid-cols-2 gap-4">
      <div className="section-card">
        <h3 className="font-display text-sm font-semibold mb-2">Experience</h3>
        <p className="text-sm font-body text-foreground">{a.experience_summary}</p>
      </div>
      <div className="section-card">
        <h3 className="font-display text-sm font-semibold mb-2">Education</h3>
        <p className="text-sm font-body text-foreground">{a.education_summary}</p>
      </div>
    </div>

    <div className="grid sm:grid-cols-2 gap-4">
      <div className="section-card">
        <h3 className="font-display text-sm font-semibold text-success mb-3">Strengths</h3>
        <ul className="space-y-2">
          {(a.strengths ?? []).map((s, i) => (
            <li key={i} className="text-sm font-body text-foreground flex gap-2">
              <span className="text-success">✓</span><span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="section-card">
        <h3 className="font-display text-sm font-semibold text-destructive mb-3">Areas to Improve</h3>
        <ul className="space-y-2">
          {(a.weaknesses ?? []).map((s, i) => (
            <li key={i} className="text-sm font-body text-foreground flex gap-2">
              <span className="text-destructive">!</span><span>{s}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>

    <div className="section-card">
      <h3 className="font-display text-sm font-semibold mb-3">Recommended Next Steps</h3>
      <ol className="space-y-2 list-decimal list-inside">
        {(a.recommendations ?? []).map((r, i) => (
          <li key={i} className="text-sm font-body text-foreground">{r}</li>
        ))}
      </ol>
    </div>

    <div className="section-card">
      <h3 className="font-display text-sm font-semibold mb-3">Suggested Roles</h3>
      <div className="flex flex-wrap gap-2">
        {(a.recommended_roles ?? []).map((r) => (
          <span key={r} className="inline-block rounded border border-border bg-muted px-3 py-1 text-xs font-body text-foreground">
            {r}
          </span>
        ))}
      </div>
    </div>
  </div>
);

export default ResumeAnalyzer;
