import { useState, useMemo } from "react";
import { mockStudents } from "@/data/students";
import StudentList from "@/components/StudentList";
import StudentProfile from "@/components/StudentProfile";

const Index = () => {
  const [selectedId, setSelectedId] = useState<string | null>(mockStudents[0]?.id ?? null);
  const [department, setDepartment] = useState("All");
  const [year, setYear] = useState(0);

  const filteredStudents = useMemo(() => {
    return mockStudents.filter((s) => {
      if (department !== "All" && s.department !== department) return false;
      if (year !== 0 && s.year !== year) return false;
      return true;
    });
  }, [department, year]);

  const selectedStudent = mockStudents.find((s) => s.id === selectedId) ?? null;

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Left scaffold panel — 1/3 */}
      <div className="w-1/3 min-w-[280px] max-w-[400px]">
        <StudentList
          students={filteredStudents}
          selectedId={selectedId}
          onSelect={setSelectedId}
          department={department}
          year={year}
          onDepartmentChange={setDepartment}
          onYearChange={setYear}
        />
      </div>

      {/* Right stage panel — 2/3 */}
      <div className="flex-1">
        {selectedStudent ? (
          <StudentProfile student={selectedStudent} />
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-muted-foreground font-body text-sm">
              Select a student to view their profile and prediction.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Index;
