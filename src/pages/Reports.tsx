import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { mockStudents } from "@/data/students";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

function getBarColor(value: number) {
  if (value >= 70) return "hsl(150, 63%, 32%)";
  if (value >= 45) return "hsl(36, 100%, 50%)";
  return "hsl(4, 63%, 46%)";
}

const Reports = () => {
  const navigate = useNavigate();

  const byDepartment = useMemo(() => {
    const map: Record<string, { total: number; sum: number; count: number }> = {};
    mockStudents.forEach((s) => {
      if (!map[s.department]) map[s.department] = { total: 0, sum: 0, count: 0 };
      map[s.department].total++;
      map[s.department].sum += s.placementProbability;
      map[s.department].count++;
    });
    return Object.entries(map).map(([dept, d]) => ({
      name: dept,
      avgProbability: Math.round(d.sum / d.count),
      students: d.total,
    }));
  }, []);

  const byYear = useMemo(() => {
    const map: Record<number, { total: number; sum: number }> = {};
    mockStudents.forEach((s) => {
      if (!map[s.year]) map[s.year] = { total: 0, sum: 0 };
      map[s.year].total++;
      map[s.year].sum += s.placementProbability;
    });
    return Object.entries(map)
      .map(([year, d]) => ({
        name: `Year ${year}`,
        avgProbability: Math.round(d.sum / d.total),
        students: d.total,
      }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, []);

  const overallStats = useMemo(() => {
    const avg = Math.round(
      mockStudents.reduce((s, st) => s + st.placementProbability, 0) / mockStudents.length
    );
    const high = mockStudents.filter((s) => s.placementProbability >= 70).length;
    const atRisk = mockStudents.filter((s) => s.placementProbability < 35).length;
    return { avg, high, atRisk, total: mockStudents.length };
  }, []);

  const tooltipStyle = {
    contentStyle: {
      background: "hsl(0, 0%, 100%)",
      border: "1px solid hsl(210, 14%, 89%)",
      borderRadius: "6px",
      fontSize: "12px",
      fontFamily: "'Inter', sans-serif",
    },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card px-4 sm:px-8 py-4 sm:py-5 flex items-center justify-between">
        <div>
          <h1 className="font-display text-xl font-bold text-foreground">Reports</h1>
          <p className="text-xs text-muted-foreground font-body mt-0.5">
            Aggregate placement analytics across departments and years
          </p>
        </div>
        <button
          onClick={() => navigate("/")}
          className="text-sm font-body text-primary hover:underline"
        >
          ← Back to Students
        </button>
      </div>

      <div className="max-w-5xl mx-auto p-4 sm:p-8 space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {[
            { label: "Total Students", value: overallStats.total },
            { label: "Avg. Probability", value: `${overallStats.avg}%` },
            { label: "High Confidence", value: overallStats.high },
            { label: "At Risk", value: overallStats.atRisk },
          ].map((item) => (
            <div key={item.label} className="section-card text-center">
              <p className="data-label">{item.label}</p>
              <p className="stat-number mt-2">{item.value}</p>
            </div>
          ))}
        </div>

        {/* By Department */}
        <div className="section-card">
          <h3 className="font-display text-base font-semibold text-foreground mb-1">
            Average Placement Probability by Department
          </h3>
          <p className="text-xs text-muted-foreground font-body mb-6">
            Mean predicted placement rate per department
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byDepartment} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 14%, 89%)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fill: "hsl(215, 10%, 46%)" }}
                axisLine={{ stroke: "hsl(210, 14%, 89%)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fill: "hsl(215, 10%, 46%)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value}%`, "Avg. Probability"]} />
              <Bar dataKey="avgProbability" radius={[4, 4, 0, 0]}>
                {byDepartment.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.avgProbability)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* By Year */}
        <div className="section-card">
          <h3 className="font-display text-base font-semibold text-foreground mb-1">
            Average Placement Probability by Year
          </h3>
          <p className="text-xs text-muted-foreground font-body mb-6">
            How predicted placement evolves across academic years
          </p>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={byYear} barCategoryGap="25%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(210, 14%, 89%)" />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fill: "hsl(215, 10%, 46%)" }}
                axisLine={{ stroke: "hsl(210, 14%, 89%)" }}
                tickLine={false}
              />
              <YAxis
                domain={[0, 100]}
                tick={{ fontSize: 12, fontFamily: "'Inter', sans-serif", fill: "hsl(215, 10%, 46%)" }}
                axisLine={false}
                tickLine={false}
                tickFormatter={(v) => `${v}%`}
              />
              <Tooltip {...tooltipStyle} formatter={(value: number) => [`${value}%`, "Avg. Probability"]} />
              <Bar dataKey="avgProbability" radius={[4, 4, 0, 0]}>
                {byYear.map((entry, i) => (
                  <Cell key={i} fill={getBarColor(entry.avgProbability)} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default Reports;
