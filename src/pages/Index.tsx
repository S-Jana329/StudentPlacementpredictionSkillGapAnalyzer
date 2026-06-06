import { useState, useMemo, useEffect } from "react";
import { useStudents } from "@/hooks/useStudents";
import StudentList from "@/components/StudentList";
import StudentProfile from "@/components/StudentProfile";

const Index = () => {
  const { students } = useStudents();
  const [selectedId, setSelectedId] = useState<string | null>(students[0]?.id ?? null);
  const [department, setDepartment] = useState("All");
  const [year, setYear] = useState(0);

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
