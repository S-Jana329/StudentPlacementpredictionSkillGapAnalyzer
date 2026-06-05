import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { Student } from "@/data/students";

interface StudentListProps {
  students: Student[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  department: string;
  year: number;
  onDepartmentChange: (dept: string) => void;
  onYearChange: (year: number) => void;
}

const departments = ["All", "Computer Science", "Electronics", "Mechanical", "Civil"];

function getProbabilityColor(prob: number) {
  if (prob >= 70) return "bg-success";
  if (prob >= 45) return "bg-warning";
  return "bg-destructive";
}

const StudentList = ({
  students,
  selectedId,
  onSelect,
  department,
  year,
  onDepartmentChange,
  onYearChange,
}: StudentListProps) => {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const visibleStudents = students.filter((s) =>
    s.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="panel-scaffold h-screen w-full flex flex-col">
      {/* Header */}
      <div className="p-5 border-b border-border flex items-center justify-between">
        <div>
          <h1 className="font-display text-lg font-bold text-foreground tracking-tight">
            Student Placement
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5 font-body">
            Prediction System
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/resume")}
            className="text-xs font-body text-primary hover:underline"
          >
            Resume
          </button>
          <button
            onClick={() => navigate("/reports")}
            className="text-xs font-body text-primary hover:underline"
          >
            Reports
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="px-4 pt-3 pb-1">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search by name…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded border border-border bg-background pl-8 pr-3 py-2 text-sm font-body text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          />
        </div>
      </div>

      {/* Filters */}
      <div className="p-4 border-b border-border space-y-3">
        <div>
          <label className="data-label mb-1.5 block">Department</label>
          <select
            value={department}
            onChange={(e) => onDepartmentChange(e.target.value)}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            {departments.map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="data-label mb-1.5 block">Year</label>
          <select
            value={year}
            onChange={(e) => onYearChange(Number(e.target.value))}
            className="w-full rounded border border-border bg-background px-3 py-2 text-sm font-body text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
          >
            <option value={0}>All Years</option>
            <option value={1}>Year 1</option>
            <option value={2}>Year 2</option>
            <option value={3}>Year 3</option>
            <option value={4}>Year 4</option>
          </select>
        </div>
      </div>

      {/* Student List */}
      <div className="flex-1 overflow-y-auto">
        {visibleStudents.length === 0 && (
          <p className="p-4 text-sm text-muted-foreground font-body">No students match filters.</p>
        )}
        {visibleStudents.map((student) => (
          <button
            key={student.id}
            onClick={() => onSelect(student.id)}
            className={`w-full text-left px-4 py-3.5 border-b border-border transition-colors hover:bg-muted/50 ${
              selectedId === student.id ? "bg-muted" : ""
            }`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-foreground font-body">{student.name}</p>
                <p className="text-xs text-muted-foreground font-body mt-0.5">
                  {student.department} · Year {student.year}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-display text-sm font-bold text-foreground">
                  {student.placementProbability}%
                </span>
                <div className={`w-2 h-2 rounded-full ${getProbabilityColor(student.placementProbability)}`} />
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Footer count */}
      <div className="p-3 border-t border-border">
        <p className="text-xs text-muted-foreground font-body">
          {visibleStudents.length} student{visibleStudents.length !== 1 ? "s" : ""}
        </p>
      </div>
    </div>
  );
};

export default StudentList;
