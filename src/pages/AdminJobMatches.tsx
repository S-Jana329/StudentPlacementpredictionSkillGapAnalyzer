import { useEffect, useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import AppHeader from "@/components/AppHeader";
import { supabase } from "@/integrations/supabase/client";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Download, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useIsAdmin } from "@/hooks/useIsAdmin";

type Profile = {
  id: string;
  full_name: string | null;
  email: string | null;
  department: string | null;
  year: number | null;
  gpa: number | null;
};

type Match = {
  id: string;
  user_id: string;
  title: string;
  company: string;
  location: string | null;
  work_mode: string | null;
  match_score: number;
  required_skills: string[] | null;
  match_reasons: string[] | null;
  source: string | null;
  seen_at: string | null;
  dismissed_at: string | null;
  created_at: string;
};

type Row = Match & { profile: Profile | null };

const fmt = (iso: string) => new Date(iso).toLocaleString();

function toCSV(rows: Row[]) {
  const headers = [
    "created_at","student_name","email","department","year","gpa",
    "title","company","location","work_mode","match_score","source","seen","dismissed",
  ];
  const lines = [headers.join(",")];
  const esc = (v: unknown) => `"${String(v ?? "").replace(/"/g, '""')}"`;
  for (const r of rows) {
    lines.push([
      r.created_at,
      esc(r.profile?.full_name ?? ""),
      esc(r.profile?.email ?? ""),
      esc(r.profile?.department ?? ""),
      r.profile?.year ?? "",
      r.profile?.gpa ?? "",
      esc(r.title),
      esc(r.company),
      esc(r.location ?? ""),
      esc(r.work_mode ?? ""),
      r.match_score,
      esc(r.source ?? ""),
      r.seen_at ? "yes" : "no",
      r.dismissed_at ? "yes" : "no",
    ].join(","));
  }
  return lines.join("\n");
}

const PAGE_SIZE = 50;

const AdminJobMatches = () => {
  const { isAdmin, loading: adminLoading } = useIsAdmin();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<"all" | "unseen" | "seen" | "dismissed">("all");
  const [days, setDays] = useState<"7" | "30" | "90" | "all">("30");
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const [aggregates, setAggregates] = useState({ students: 0, avg: 0, unseen: 0 });

  // Debounce search input to avoid a request per keystroke
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  // Reset to first page when filters change
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, status, days]);

  const load = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const sinceIso =
        days !== "all"
          ? new Date(Date.now() - Number(days) * 24 * 3600 * 1000).toISOString()
          : null;
      const searchTerm = debouncedSearch.replace(/[%,()]/g, "");

      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;

      let q = supabase
        .from("job_recommendations")
        .select(
          "id, user_id, title, company, location, work_mode, match_score, required_skills, match_reasons, source, seen_at, dismissed_at, created_at",
          { count: "exact" },
        )
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .range(from, to);

      if (sinceIso) q = q.gte("created_at", sinceIso);
      if (status === "unseen") q = q.is("seen_at", null).is("dismissed_at", null);
      else if (status === "seen") q = q.not("seen_at", "is", null);
      else if (status === "dismissed") q = q.not("dismissed_at", "is", null);
      if (searchTerm) q = q.or(`title.ilike.%${searchTerm}%,company.ilike.%${searchTerm}%`);

      const { data: recs, error, count } = await q;
      if (error) throw error;
      const list = (recs ?? []) as Match[];
      setTotal(count ?? 0);

      const ids = Array.from(new Set(list.map((r) => r.user_id)));
      let profilesById = new Map<string, Profile>();
      if (ids.length) {
        const { data: profs, error: pErr } = await supabase
          .from("profiles")
          .select("id, full_name, email, department, year, gpa")
          .in("id", ids);
        if (pErr) throw pErr;
        profilesById = new Map((profs ?? []).map((p) => [p.id, p as Profile]));
      }
      setRows(list.map((m) => ({ ...m, profile: profilesById.get(m.user_id) ?? null })));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to load job matches");
    } finally {
      setLoading(false);
    }
  };


  // Aggregate stats across the full filtered set (not just current page)
  const loadAggregates = async () => {
    if (!isAdmin) return;
    try {
      const sinceIso =
        days !== "all"
          ? new Date(Date.now() - Number(days) * 24 * 3600 * 1000).toISOString()
          : null;
      let q = supabase
        .from("job_recommendations")
        .select("user_id, match_score, seen_at, dismissed_at");
      if (sinceIso) q = q.gte("created_at", sinceIso);
      if (status === "unseen") q = q.is("seen_at", null).is("dismissed_at", null);
      else if (status === "seen") q = q.not("seen_at", "is", null);
      else if (status === "dismissed") q = q.not("dismissed_at", "is", null);
      if (debouncedSearch) {
        const s = debouncedSearch.replace(/[%,()]/g, "");
        q = q.or(`title.ilike.%${s}%,company.ilike.%${s}%`);
      }
      const { data, error } = await q.limit(10000);
      if (error) throw error;
      const arr = data ?? [];
      const students = new Set(arr.map((r) => r.user_id)).size;
      const avg = arr.length
        ? Math.round(arr.reduce((s, r) => s + (r.match_score ?? 0), 0) / arr.length)
        : 0;
      const unseen = arr.filter((r) => !r.seen_at && !r.dismissed_at).length;
      setAggregates({ students, avg, unseen });
    } catch {
      // stats are best-effort
    }
  };

  useEffect(() => {
    if (!adminLoading && isAdmin) {
      load();
      loadAggregates();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, status, debouncedSearch, page, adminLoading, isAdmin]);

  if (adminLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-sm text-muted-foreground font-body">Checking permissions...</p>
      </div>
    );
  }
  if (!isAdmin) return <Navigate to="/" replace />;

  const filtered = rows;
  const stats = {
    total,
    students: aggregates.students,
    avg: aggregates.avg,
    unseen: aggregates.unseen,
  };
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE));


  const handleExport = () => {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `job-matches-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-card px-8 py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Job Matches</h1>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              Every AI-generated recommendation across all students
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={load} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={filtered.length === 0}>
              <Download size={14} /> Export CSV
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-8 space-y-6">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <Stat label="Matches shown" value={stats.total} />
          <Stat label="Students" value={stats.students} />
          <Stat label="Avg. match score" value={`${stats.avg}%`} />
          <Stat label="Unseen" value={stats.unseen} />
        </div>

        <div className="section-card flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[220px]">
            <label className="data-label mb-1.5 block">Search</label>
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search student, email, dept, title, or company..."
            />
          </div>
          <div>
            <label className="data-label mb-1.5 block">Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as typeof status)}
              className="rounded border border-border bg-background px-3 py-2 text-sm font-body min-w-[140px]"
            >
              <option value="all">All</option>
              <option value="unseen">Unseen</option>
              <option value="seen">Seen</option>
              <option value="dismissed">Dismissed</option>
            </select>
          </div>
          <div>
            <label className="data-label mb-1.5 block">Range</label>
            <select
              value={days}
              onChange={(e) => setDays(e.target.value as typeof days)}
              className="rounded border border-border bg-background px-3 py-2 text-sm font-body"
            >
              <option value="7">Last 7 days</option>
              <option value="30">Last 30 days</option>
              <option value="90">Last 90 days</option>
              <option value="all">All time</option>
            </select>
          </div>
        </div>

        <div className="section-card p-0 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm font-body">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr>
                  <Th>Generated</Th>
                  <Th>Student</Th>
                  <Th>Dept / Year</Th>
                  <Th>GPA</Th>
                  <Th>Role</Th>
                  <Th>Company</Th>
                  <Th>Location</Th>
                  <Th className="text-right">Score</Th>
                  <Th>Status</Th>
                </tr>
              </thead>
              <tbody>
                {loading && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      Loading matches...
                    </td>
                  </tr>
                )}
                {!loading && filtered.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-xs text-muted-foreground">
                      No matches found for the current filters.
                    </td>
                  </tr>
                )}
                {!loading && filtered.map((r) => (
                  <tr key={r.id} className="border-t border-border hover:bg-muted/30">
                    <Td className="whitespace-nowrap text-xs text-muted-foreground">{fmt(r.created_at)}</Td>
                    <Td>
                      <div className="font-medium text-foreground">{r.profile?.full_name ?? "—"}</div>
                      <div className="text-xs text-muted-foreground">{r.profile?.email ?? r.user_id.slice(0, 8)}</div>
                    </Td>
                    <Td className="text-xs text-muted-foreground">
                      {r.profile?.department ?? "—"}
                      {r.profile?.year ? ` · Y${r.profile.year}` : ""}
                    </Td>
                    <Td className="text-xs">{r.profile?.gpa ?? "—"}</Td>
                    <Td className="font-medium">{r.title}</Td>
                    <Td>{r.company}</Td>
                    <Td className="text-xs text-muted-foreground">
                      {r.location ?? "—"}
                      {r.work_mode ? ` · ${r.work_mode}` : ""}
                    </Td>
                    <Td className="text-right">
                      <span className={`inline-block px-2 py-0.5 rounded font-mono text-xs ${
                        r.match_score >= 80 ? "bg-success/10 text-success"
                        : r.match_score >= 60 ? "bg-primary/10 text-primary"
                        : "bg-muted text-muted-foreground"
                      }`}>
                        {r.match_score}
                      </span>
                    </Td>
                    <Td className="text-xs">
                      {r.dismissed_at ? (
                        <span className="text-destructive">Dismissed</span>
                      ) : r.seen_at ? (
                        <span className="text-muted-foreground">Seen</span>
                      ) : (
                        <span className="text-primary font-medium">New</span>
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value }: { label: string; value: string | number }) => (
  <div className="section-card">
    <p className="data-label">{label}</p>
    <p className="stat-number mt-2">{value}</p>
  </div>
);

const Th = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <th className={`px-4 py-2 text-left font-medium ${className}`}>{children}</th>
);

const Td = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <td className={`px-4 py-3 align-top ${className}`}>{children}</td>
);

export default AdminJobMatches;
