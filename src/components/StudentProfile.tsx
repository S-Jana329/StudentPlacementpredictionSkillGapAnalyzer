import { Student } from "@/data/students";
import PredictionEngine from "./PredictionEngine";

interface StudentProfileProps {
  student: Student;
}

const StudentProfile = ({ student }: StudentProfileProps) => {
  return (
    <div className="panel-stage h-full md:h-screen overflow-y-auto">
      <div className="max-w-3xl mx-auto p-4 sm:p-6 md:p-8 space-y-4 sm:space-y-6">
        {/* Student Vitals */}
        <div className="section-card">
          <h2 className="font-display text-xl font-bold text-foreground mb-1">
            {student.name}
          </h2>
          <p className="text-sm text-muted-foreground font-body">
            {student.department} · Year {student.year}
          </p>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6">
            <div>
              <p className="data-label">GPA</p>
              <p className="stat-number mt-1">{student.gpa}</p>
              <p className="text-xs text-muted-foreground">/10.0</p>
            </div>
            <div>
              <p className="data-label">Internships</p>
              <p className="stat-number mt-1">{student.internships}</p>
              <p className="text-xs text-muted-foreground">completed</p>
            </div>
            <div>
              <p className="data-label">Project Score</p>
              <p className="stat-number mt-1">{student.projectScore}</p>
              <p className="text-xs text-muted-foreground">/100</p>
            </div>
            <div>
              <p className="data-label">Attendance</p>
              <p className="stat-number mt-1">{student.attendancePercent}%</p>
              <p className="text-xs text-muted-foreground">overall</p>
            </div>
          </div>
        </div>

        {/* Academic Record */}
        <div className="section-card">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">
            Academic Record
          </h3>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="data-label">Active Backlogs</p>
              <p className={`text-lg font-display font-bold mt-1 ${
                student.backlogs > 0 ? "text-destructive" : "text-success"
              }`}>
                {student.backlogs}
              </p>
            </div>
            <div>
              <p className="data-label">Attendance Rate</p>
              <p className={`text-lg font-display font-bold mt-1 ${
                student.attendancePercent >= 75 ? "text-success" : "text-destructive"
              }`}>
                {student.attendancePercent}%
              </p>
            </div>
          </div>
        </div>

        {/* Co-curriculars */}
        <div className="section-card">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">
            Co-curriculars & Activities
          </h3>
          {student.extracurriculars.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {student.extracurriculars.map((activity) => (
                <span
                  key={activity}
                  className="inline-block rounded border border-border bg-muted px-3 py-1 text-xs font-body text-foreground"
                >
                  {activity}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-body">No co-curricular activities recorded.</p>
          )}
        </div>

        {/* Certifications */}
        <div className="section-card">
          <h3 className="font-display text-base font-semibold text-foreground mb-4">
            Certifications
          </h3>
          {student.certifications.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {student.certifications.map((cert) => (
                <span
                  key={cert}
                  className="inline-block rounded border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-body text-primary font-medium"
                >
                  {cert}
                </span>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground font-body">No certifications on record.</p>
          )}
        </div>

        {/* Prediction Engine */}
        <PredictionEngine
          probability={student.placementProbability}
          factors={student.factors}
        />
      </div>
    </div>
  );
};

export default StudentProfile;
