export interface Student {
  id: string;
  name: string;
  department: string;
  year: number;
  gpa: number;
  internships: number;
  projectScore: number;
  extracurriculars: string[];
  certifications: string[];
  backlogs: number;
  attendancePercent: number;
  placementProbability: number;
  factors: PredictionFactor[];
}

export interface PredictionFactor {
  label: string;
  weight: number; // -100 to 100
  contribution: "positive" | "negative";
}

export const mockStudents: Student[] = [
  {
    id: "1",
    name: "Aarav Sharma",
    department: "Computer Science",
    year: 4,
    gpa: 8.7,
    internships: 2,
    projectScore: 88,
    extracurriculars: ["Hackathon Winner", "Coding Club Lead"],
    certifications: ["AWS Cloud Practitioner", "Python Professional"],
    backlogs: 0,
    attendancePercent: 92,
    placementProbability: 89,
    factors: [
      { label: "GPA", weight: 72, contribution: "positive" },
      { label: "Internships", weight: 85, contribution: "positive" },
      { label: "Project Score", weight: 68, contribution: "positive" },
      { label: "Certifications", weight: 60, contribution: "positive" },
      { label: "Backlogs", weight: 0, contribution: "positive" },
      { label: "Attendance", weight: 55, contribution: "positive" },
    ],
  },
  {
    id: "2",
    name: "Priya Patel",
    department: "Electronics",
    year: 4,
    gpa: 7.2,
    internships: 1,
    projectScore: 72,
    extracurriculars: ["Robotics Club"],
    certifications: ["MATLAB Certified"],
    backlogs: 1,
    attendancePercent: 78,
    placementProbability: 64,
    factors: [
      { label: "GPA", weight: 48, contribution: "positive" },
      { label: "Internships", weight: 40, contribution: "positive" },
      { label: "Project Score", weight: 45, contribution: "positive" },
      { label: "Certifications", weight: 30, contribution: "positive" },
      { label: "Backlogs", weight: -25, contribution: "negative" },
      { label: "Attendance", weight: -18, contribution: "negative" },
    ],
  },
  {
    id: "3",
    name: "Rahul Verma",
    department: "Mechanical",
    year: 3,
    gpa: 6.1,
    internships: 0,
    projectScore: 55,
    extracurriculars: [],
    certifications: [],
    backlogs: 3,
    attendancePercent: 65,
    placementProbability: 32,
    factors: [
      { label: "GPA", weight: 28, contribution: "positive" },
      { label: "Internships", weight: -45, contribution: "negative" },
      { label: "Project Score", weight: 20, contribution: "positive" },
      { label: "Certifications", weight: -35, contribution: "negative" },
      { label: "Backlogs", weight: -55, contribution: "negative" },
      { label: "Attendance", weight: -30, contribution: "negative" },
    ],
  },
  {
    id: "4",
    name: "Sneha Iyer",
    department: "Computer Science",
    year: 4,
    gpa: 9.2,
    internships: 3,
    projectScore: 95,
    extracurriculars: ["Tech Speaker", "Open Source Contributor", "ACM Chapter Head"],
    certifications: ["Google Cloud Associate", "React Developer", "Data Structures Advanced"],
    backlogs: 0,
    attendancePercent: 96,
    placementProbability: 96,
    factors: [
      { label: "GPA", weight: 90, contribution: "positive" },
      { label: "Internships", weight: 95, contribution: "positive" },
      { label: "Project Score", weight: 88, contribution: "positive" },
      { label: "Certifications", weight: 80, contribution: "positive" },
      { label: "Backlogs", weight: 0, contribution: "positive" },
      { label: "Attendance", weight: 70, contribution: "positive" },
    ],
  },
  {
    id: "5",
    name: "Arjun Reddy",
    department: "Civil",
    year: 4,
    gpa: 7.8,
    internships: 1,
    projectScore: 70,
    extracurriculars: ["Basketball Team Captain"],
    certifications: ["AutoCAD Professional"],
    backlogs: 0,
    attendancePercent: 88,
    placementProbability: 58,
    factors: [
      { label: "GPA", weight: 52, contribution: "positive" },
      { label: "Internships", weight: 35, contribution: "positive" },
      { label: "Project Score", weight: 40, contribution: "positive" },
      { label: "Certifications", weight: 25, contribution: "positive" },
      { label: "Backlogs", weight: 0, contribution: "positive" },
      { label: "Attendance", weight: 45, contribution: "positive" },
    ],
  },
  {
    id: "6",
    name: "Kavya Nair",
    department: "Electronics",
    year: 3,
    gpa: 8.1,
    internships: 1,
    projectScore: 80,
    extracurriculars: ["IEEE Member", "Quiz Club"],
    certifications: ["Embedded Systems"],
    backlogs: 0,
    attendancePercent: 90,
    placementProbability: 72,
    factors: [
      { label: "GPA", weight: 62, contribution: "positive" },
      { label: "Internships", weight: 40, contribution: "positive" },
      { label: "Project Score", weight: 58, contribution: "positive" },
      { label: "Certifications", weight: 35, contribution: "positive" },
      { label: "Backlogs", weight: 0, contribution: "positive" },
      { label: "Attendance", weight: 52, contribution: "positive" },
    ],
  },
  {
    id: "7",
    name: "Vikram Singh",
    department: "Mechanical",
    year: 4,
    gpa: 5.8,
    internships: 0,
    projectScore: 48,
    extracurriculars: ["Cricket Team"],
    certifications: [],
    backlogs: 5,
    attendancePercent: 55,
    placementProbability: 18,
    factors: [
      { label: "GPA", weight: 18, contribution: "positive" },
      { label: "Internships", weight: -50, contribution: "negative" },
      { label: "Project Score", weight: 12, contribution: "positive" },
      { label: "Certifications", weight: -40, contribution: "negative" },
      { label: "Backlogs", weight: -75, contribution: "negative" },
      { label: "Attendance", weight: -45, contribution: "negative" },
    ],
  },
  {
    id: "8",
    name: "Deepika Joshi",
    department: "Computer Science",
    year: 3,
    gpa: 8.4,
    internships: 2,
    projectScore: 82,
    extracurriculars: ["Women in Tech Lead", "Blog Writer"],
    certifications: ["Azure Fundamentals"],
    backlogs: 0,
    attendancePercent: 94,
    placementProbability: 82,
    factors: [
      { label: "GPA", weight: 68, contribution: "positive" },
      { label: "Internships", weight: 75, contribution: "positive" },
      { label: "Project Score", weight: 62, contribution: "positive" },
      { label: "Certifications", weight: 40, contribution: "positive" },
      { label: "Backlogs", weight: 0, contribution: "positive" },
      { label: "Attendance", weight: 60, contribution: "positive" },
    ],
  },
];

export const departments = ["All", "Computer Science", "Electronics", "Mechanical", "Civil"];
export const years = [0, 1, 2, 3, 4]; // 0 = All
