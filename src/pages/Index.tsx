import { useState, useMemo, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import StudentList from "@/components/StudentList";
import StudentProfile from "@/components/StudentProfile";

const Index = () => {
  const { students } = useStudents();
  const [selectedId, setSelectedId] = useState<string | null>(students[0]?.id ?? null);
  const [department, setDepartment] = useState("All");
  const [year, setYear] = useState(0);
  const [mobileView, setMobileView] = useState<"list" | "profile">("list");

  useEffect(() => {
    if (!selectedId && students[0]) setSelectedId(students[0].id);
  }, [students, selectedId]);

  const filteredStudents = useMemo(() => {
    return students.filter((s) => {
      if (department !== "All" && s.department !== department) return false;
      if (year !== 0 && s.year !== year) return false;
      return true;
    });
  }, [students, department, year]);

  const selectedStudent = students.find((s) => s.id === selectedId) ?? null;

  const handleSelect = (id: string) => {
    setSelectedId(id);
    setMobileView("profile");
  };

  return (
    <div className="md:flex md:h-screen md:overflow-hidden">
      {/* List panel */}
      <div
        className={`md:w-1/3 md:min-w-[280px] md:max-w-[400px] md:block ${
          mobileView === "list" ? "block" : "hidden"
        }`}
      >
        <StudentList
          students={filteredStudents}
          selectedId={selectedId}
          onSelect={handleSelect}
          department={department}
          year={year}
          onDepartmentChange={setDepartment}
          onYearChange={setYear}
        />
      </div>

      {/* Profile panel */}
      <div
        className={`flex-1 md:block ${mobileView === "profile" ? "block" : "hidden"}`}
      >
        {selectedStudent ? (
          <div className="h-screen md:h-screen flex flex-col">
            <button
              onClick={() => setMobileView("list")}
              className="md:hidden flex items-center gap-2 px-4 py-3 border-b border-border bg-card text-sm font-body text-foreground"
            >
              <ArrowLeft size={16} /> Back to students
            </button>
            <div className="flex-1 overflow-hidden">
              <StudentProfile student={selectedStudent} />
            </div>
          </div>
        ) : (
          <div className="h-screen flex items-center justify-center px-6">
            <p className="text-muted-foreground font-body text-sm text-center">
              Select a student to view their profile and prediction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
