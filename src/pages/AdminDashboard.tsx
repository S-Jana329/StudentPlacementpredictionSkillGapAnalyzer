import { useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { useStudents } from "@/hooks/useStudents";
import type { Student } from "@/data/students";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
  PieChart, Pie, Legend, ScatterChart, Scatter, ZAxis,
} from "recharts";
import { Users, TrendingUp, AlertTriangle, Award, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const COLORS = {
  high: "hsl(150, 63%, 32%)",
  medium: "hsl(36, 100%, 50%)",
  low: "hsl(4, 63%, 46%)",
  primary: "hsl(211, 100%, 21%)",
  muted: "hsl(215, 10%, 46%)",
  border: "hsl(210, 14%, 89%)",
};

const tooltipStyle = {
  contentStyle: {
    background: "hsl(0, 0%, 100%)",
    border: `1px solid ${COLORS.border}`,
    borderRadius: "6px",
    fontSize: "12px",
    fontFamily: "'Inter', sans-serif",
  },
};

const tickStyle = { fontSize: 11, fontFamily: "'Inter', sans-serif", fill: COLORS.muted };

function barColor(v: number) {
  if (v >= 70) return COLORS.high;
  if (v >= 45) return COLORS.medium;
  return COLORS.low;
}

function toCSV(rows: Student[]) {
  const headers = ["id","name","department","year","gpa","internships","projectScore","certifications","backlogs","attendancePercent","placementProbability"];
  const lines = [headers.join(",")];
  for (const s of rows) {
    lines.push([
      s.id,
      `"${s.name.replace(/"/g, '""')}"`,
      `"${s.department}"`,
      s.year,
      s.gpa,
      s.internships,
      s.projectScore,
      s.certifications.length,
      s.backlogs,
      s.attendancePercent,
      s.placementProbability,
    ].join(","));
  }
  return lines.join("\n");
}

const AdminDashboard = () => {
  const { students } = useStudents();
  const [deptFilter, setDeptFilter] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const departments = useMemo(() => Array.from(new Set(students.map((s) => s.department))).sort(), [students]);
  const years = useMemo(() => Array.from(new Set(students.map((s) => s.year))).sort(), [students]);

  const filtered = useMemo(() => {
    return students.filter((s) => {
      if (deptFilter !== "all" && s.department !== deptFilter) return false;
      if (yearFilter !== "all" && String(s.year) !== yearFilter) return false;
      if (search.trim() && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [students, deptFilter, yearFilter, search]);

  const stats = useMemo(() => {
    if (filtered.length === 0) return { total: 0, avg: 0, high: 0, atRisk: 0, avgGpa: 0, avgAttendance: 0 };
    const total = filtered.length;
    const avg = Math.round(filtered.reduce((s, x) => s + x.placementProbability, 0) / total);
    const high = filtered.filter((s) => s.placementProbability >= 70).length;
    const atRisk = filtered.filter((s) => s.placementProbability < 35).length;
    const avgGpa = +(filtered.reduce((s, x) => s + x.gpa, 0) / total).toFixed(2);
    const avgAttendance = Math.round(filtered.reduce((s, x) => s + x.attendancePercent, 0) / total);
    return { total, avg, high, atRisk, avgGpa, avgAttendance };
  }, [filtered]);

  const byDept = useMemo(() => {
    const map: Record<string, { sum: number; count: number; high: number }> = {};
    filtered.forEach((s) => {
      map[s.department] ??= { sum: 0, count: 0, high: 0 };
      map[s.department].sum += s.placementProbability;
      map[s.department].count++;
      if (s.placementProbability >= 70) map[s.department].high++;
    });
    return Object.entries(map)
      .map(([name, d]) => ({
        name,
        avg: Math.round(d.sum / d.count),
        students: d.count,
        high: d.high,
      }))
      .sort((a, b) => b.avg - a.avg);
  }, [filtered]);

  const byYear = useMemo(() => {
    const map: Record<number, { sum: number; count: number }> = {};
    filtered.forEach((s) => {
      map[s.year] ??= { sum: 0, count: 0 };
      map[s.year].sum += s.placementProbability;
      map[s.year].count++;
    });
    return Object.entries(map)
      .map(([y, d]) => ({ name: `Year ${y}`, avg: Math.round(d.sum / d.count), students: d.count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const riskBuckets = useMemo(() => {
    const buckets = [
      { name: "High (70+)", value: 0, color: COLORS.high },
      { name: "Medium (45-69)", value: 0, color: COLORS.medium },
      { name: "At Risk (<45)", value: 0, color: COLORS.low },
    ];
    filtered.forEach((s) => {
      if (s.placementProbability >= 70) buckets[0].value++;
      else if (s.placementProbability >= 45) buckets[1].value++;
      else buckets[2].value++;
    });
    return buckets;
  }, [filtered]);

  const gpaBuckets = useMemo(() => {
    const ranges = [
      { name: "<5", min: 0, max: 5 },
      { name: "5-6", min: 5, max: 6 },
      { name: "6-7", min: 6, max: 7 },
      { name: "7-8", min: 7, max: 8 },
      { name: "8-9", min: 8, max: 9 },
      { name: "9-10", min: 9, max: 10.01 },
    ];
    return ranges.map((r) => ({
      name: r.name,
      students: filtered.filter((s) => s.gpa >= r.min && s.gpa < r.max).length,
    }));
  }, [filtered]);

  const scatter = useMemo(
    () => filtered.map((s) => ({ gpa: s.gpa, probability: s.placementProbability, name: s.name })),
    [filtered]
  );

  const atRiskList = useMemo(
    () => [...filtered].sort((a, b) => a.placementProbability - b.placementProbability).slice(0, 10),
    [filtered]
  );

  const topPerformers = useMemo(
    () => [...filtered].sort((a, b) => b.placementProbability - a.placementProbability).slice(0, 10),
    [filtered]
  );

  const handleExport = () => {
    const csv = toCSV(filtered);
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `students-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="border-b border-border bg-card px-4 sm:px-8 py-4 sm:py-5">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
          <div>
            <h1 className="font-display text-xl font-bold text-foreground">Admin Dashboard</h1>
            <p className="text-xs text-muted-foreground font-body mt-0.5">
              Aggregate placement analytics across all students
            </p>
          </div>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download size={14} /> Export CSV
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-8 space-y-6">
        {/* Filters */}
        <div className="section-card flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[180px]">
            <label className="data-label mb-1.5 block">Search</label>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search by name..." />
          </div>
          <div>
            <label className="data-label mb-1.5 block">Department</label>
            <select
              value={deptFilter}
              onChange={(e) => setDeptFilter(e.target.value)}
              className="rounded border border-border bg-background px-3 py-2 text-sm font-body min-w-[180px]"
            >
              <option value="all">All departments</option>
              {departments.map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>
          <div>
            <label className="data-label mb-1.5 block">Year</label>
            <select
              value={yearFilter}
              onChange={(e) => setYearFilter(e.target.value)}
              className="rounded border border-border bg-background px-3 py-2 text-sm font-body"
            >
              <option value="all">All years</option>
              {years.map((y) => <option key={y} value={String(y)}>Year {y}</option>)}
            </select>
          </div>
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
          <StatCard icon={<Users size={16} />} label="Students" value={stats.total} />
          <StatCard icon={<TrendingUp size={16} />} label="Avg. Probability" value={`${stats.avg}%`} />
          <StatCard icon={<Award size={16} />} label="High Confidence" value={stats.high} tone="success" />
          <StatCard icon={<AlertTriangle size={16} />} label="At Risk" value={stats.atRisk} tone="danger" />
          <StatCard label="Avg. GPA" value={stats.avgGpa} />
          <StatCard label="Avg. Attendance" value={`${stats.avgAttendance}%`} />
        </div>

        {/* By Department */}
        <div className="section-card">
          <h3 className="font-display text-base font-semibold mb-1">Placement Probability by Department</h3>
          <p className="text-xs text-muted-foreground font-body mb-6">Mean predicted placement rate per department</p>
          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={byDept} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
              <XAxis dataKey="name" tick={tickStyle} axisLine={{ stroke: COLORS.border }} tickLine={false} interval={0} angle={-15} textAnchor="end" height={60} />
              <YAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
              <Tooltip {...tooltipStyle} formatter={(v: number, n: string) => [n === "avg" ? `${v}%` : v, n === "avg" ? "Avg. Probability" : "Students"]} />
              <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                {byDept.map((e, i) => <Cell key={i} fill={barColor(e.avg)} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* Risk distribution */}
          <div className="section-card">
            <h3 className="font-display text-base font-semibold mb-1">Risk Distribution</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">Share of students per placement confidence band</p>
            <ResponsiveContainer width="100%" height={260}>
              <PieChart>
                <Pie data={riskBuckets} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e) => `${e.value}`}>
                  {riskBuckets.map((b, i) => <Cell key={i} fill={b.color} />)}
                </Pie>
                <Tooltip {...tooltipStyle} />
                <Legend wrapperStyle={{ fontSize: 12, fontFamily: "'Inter', sans-serif" }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* By Year */}
          <div className="section-card">
            <h3 className="font-display text-base font-semibold mb-1">Avg. Probability by Year</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">How placement readiness evolves across cohorts</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={byYear} barCategoryGap="25%">
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="name" tick={tickStyle} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                <YAxis domain={[0, 100]} tick={tickStyle} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                <Tooltip {...tooltipStyle} formatter={(v: number) => [`${v}%`, "Avg."]} />
                <Bar dataKey="avg" radius={[4, 4, 0, 0]}>
                  {byYear.map((e, i) => <Cell key={i} fill={barColor(e.avg)} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          {/* GPA distribution */}
          <div className="section-card">
            <h3 className="font-display text-base font-semibold mb-1">GPA Distribution</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">Number of students per GPA band</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={gpaBuckets}>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis dataKey="name" tick={tickStyle} axisLine={{ stroke: COLORS.border }} tickLine={false} />
                <YAxis tick={tickStyle} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip {...tooltipStyle} />
                <Bar dataKey="students" fill={COLORS.primary} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* GPA vs Probability scatter */}
          <div className="section-card">
            <h3 className="font-display text-base font-semibold mb-1">GPA vs. Placement Probability</h3>
            <p className="text-xs text-muted-foreground font-body mb-4">Each dot is a student in the current filter</p>
            <ResponsiveContainer width="100%" height={260}>
              <ScatterChart>
                <CartesianGrid strokeDasharray="3 3" stroke={COLORS.border} />
                <XAxis type="number" dataKey="gpa" name="GPA" domain={[0, 10]} tick={tickStyle} />
                <YAxis type="number" dataKey="probability" name="Probability" domain={[0, 100]} tick={tickStyle} tickFormatter={(v) => `${v}%`} />
                <ZAxis range={[40, 40]} />
                <Tooltip {...tooltipStyle} cursor={{ strokeDasharray: "3 3" }}
                  formatter={(v: number, n: string) => n === "probability" ? [`${v}%`, "Probability"] : [v, "GPA"]}
                  labelFormatter={() => ""}
                />
                <Scatter data={scatter} fill={COLORS.primary} fillOpacity={0.55} />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <StudentTable title="At-risk students" subtitle="Lowest placement probability" rows={atRiskList} tone="danger" />
          <StudentTable title="Top performers" subtitle="Highest placement probability" rows={topPerformers} tone="success" />
        </div>
      </div>
    </div>
  );
};

const StatCard = ({ icon, label, value, tone }: {
  icon?: React.ReactNode; label: string; value: string | number; tone?: "success" | "danger";
}) => (
  <div className="section-card">
    <div className="flex items-center gap-2 text-muted-foreground">
      {icon}
      <p className="data-label">{label}</p>
    </div>
    <p className={`stat-number mt-2 ${tone === "success" ? "text-success" : tone === "danger" ? "text-destructive" : ""}`}>
      {value}
    </p>
  </div>
);

const StudentTable = ({ title, subtitle, rows, tone }: {
  title: string; subtitle: string; rows: Student[]; tone: "success" | "danger";
}) => (
  <div className="section-card">
    <h3 className="font-display text-base font-semibold mb-1">{title}</h3>
    <p className="text-xs text-muted-foreground font-body mb-4">{subtitle}</p>
    <div className="space-y-1">
      {rows.length === 0 && <p className="text-xs text-muted-foreground py-2">No students.</p>}
      {rows.map((s) => (
        <div key={s.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
          <div className="min-w-0">
            <p className="text-sm font-body font-medium truncate">{s.name}</p>
            <p className="text-xs text-muted-foreground">{s.department} · Year {s.year} · GPA {s.gpa}</p>
          </div>
          <span className={`text-sm font-display font-semibold ${tone === "success" ? "text-success" : "text-destructive"}`}>
            {s.placementProbability}%
          </span>
        </div>
      ))}
    </div>
  </div>
);

export default AdminDashboard;
