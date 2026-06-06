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

// ---------- Generated dataset ----------
// Deterministic generator that expands the base list into a large pool of students.

const FIRST_NAMES = [
  "Aarav","Vivaan","Aditya","Vihaan","Arjun","Sai","Reyansh","Ayaan","Krishna","Ishaan",
  "Rohan","Karthik","Yash","Dhruv","Arnav","Kabir","Ansh","Aryan","Atharv","Dev",
  "Rudra","Shaurya","Veer","Tanish","Nikhil","Rahul","Siddharth","Pranav","Aniket","Manav",
  "Aditi","Ananya","Diya","Saanvi","Aaradhya","Anika","Pari","Myra","Aarohi","Riya",
  "Ishita","Kavya","Meera","Navya","Priya","Sneha","Tara","Anvi","Ira","Nisha",
  "Pooja","Ritika","Sakshi","Shreya","Tanvi","Vaishnavi","Yamini","Zara","Neha","Lavanya",
];

const LAST_NAMES = [
  "Sharma","Patel","Verma","Iyer","Reddy","Nair","Singh","Joshi","Kumar","Gupta",
  "Mehta","Shah","Rao","Pillai","Menon","Bose","Das","Mukherjee","Chatterjee","Banerjee",
  "Khan","Ahmed","Sinha","Bhat","Kapoor","Malhotra","Chopra","Agarwal","Mishra","Yadav",
  "Rao","Pandey","Trivedi","Saxena","Bansal","Goyal","Jain","Desai","Naidu","Pawar",
];

const DEPARTMENTS = ["Computer Science","Electronics","Mechanical","Civil"];

const EXTRAS_POOL = [
  "Coding Club","Robotics Club","Hackathon Winner","Open Source Contributor","ACM Chapter",
  "IEEE Member","Quiz Club","Debate Society","Cultural Lead","Music Band",
  "Drama Club","Sports Team","Cricket Team","Basketball Team","Football Team",
  "Volunteer NGO","Student Council","Blog Writer","Photography Club","Entrepreneurship Cell",
  "Women in Tech","GDSC Lead","Innovation Lab","Research Assistant",
];

const CERTS_POOL = [
  "AWS Cloud Practitioner","Azure Fundamentals","Google Cloud Associate","Python Professional",
  "Java Certified","React Developer","Node.js Certified","MongoDB Associate","SQL Advanced",
  "Data Structures Advanced","Machine Learning Specialist","TensorFlow Developer","Scrum Master",
  "AutoCAD Professional","MATLAB Certified","SolidWorks Pro","Embedded Systems","PCB Design",
  "Six Sigma Yellow Belt","CCNA","Linux Administration","Cybersecurity Essentials",
];

// Mulberry32 PRNG for deterministic randomness.
function makeRng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(rng: () => number, arr: T[]): T {
  return arr[Math.floor(rng() * arr.length)];
}

function pickMany<T>(rng: () => number, arr: T[], min: number, max: number): T[] {
  const n = Math.floor(rng() * (max - min + 1)) + min;
  const pool = [...arr];
  const out: T[] = [];
  for (let i = 0; i < n && pool.length; i++) {
    const idx = Math.floor(rng() * pool.length);
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function generateStudent(id: number, rng: () => number): Student {
  const first = pick(rng, FIRST_NAMES);
  const last = pick(rng, LAST_NAMES);
  const department = pick(rng, DEPARTMENTS);
  const year = Math.floor(rng() * 4) + 1;
  const gpa = +(4 + rng() * 6).toFixed(1); // 4.0 - 10.0
  const internships = Math.floor(rng() * 4); // 0-3
  const projectScore = Math.floor(40 + rng() * 60); // 40-100
  const certs = pickMany(rng, CERTS_POOL, 0, 4);
  const extras = pickMany(rng, EXTRAS_POOL, 0, 3);
  const backlogs = rng() < 0.6 ? 0 : Math.floor(rng() * 6); // skew to zero
  const attendancePercent = Math.floor(55 + rng() * 45); // 55-100

  // Weighted probability calculation
  const gpaScore = (gpa - 4) * 12; // 0-72
  const internScore = internships * 10; // 0-30
  const projScore = (projectScore - 40) * 0.5; // 0-30
  const certScore = certs.length * 5; // 0-20
  const attendScore = (attendancePercent - 55) * 0.4; // 0-18
  const backlogPenalty = backlogs * 8; // 0-40+
  const raw = gpaScore + internScore + projScore + certScore + attendScore - backlogPenalty;
  const placementProbability = clamp(Math.round(raw + (rng() * 14 - 7)), 5, 99);

  const sign = (good: boolean, mag: number) => ({
    weight: good ? mag : -mag,
    contribution: (good ? "positive" : "negative") as "positive" | "negative",
  });

  const factors: PredictionFactor[] = [
    { label: "GPA", ...sign(gpa >= 7, Math.round(Math.abs(gpa - 6.5) * 14)) },
    { label: "Internships", ...sign(internships >= 1, internships >= 1 ? 30 + internships * 15 : 40) },
    { label: "Project Score", ...sign(projectScore >= 65, Math.round(Math.abs(projectScore - 65) * 0.9)) },
    { label: "Certifications", ...sign(certs.length >= 1, certs.length >= 1 ? 15 + certs.length * 10 : 35) },
    { label: "Backlogs", ...sign(backlogs === 0, backlogs === 0 ? 0 : 20 + backlogs * 10) },
    { label: "Attendance", ...sign(attendancePercent >= 80, Math.round(Math.abs(attendancePercent - 80) * 1.2)) },
  ];

  return {
    id: String(id),
    name: `${first} ${last}`,
    department,
    year,
    gpa,
    internships,
    projectScore,
    extracurriculars: extras,
    certifications: certs,
    backlogs,
    attendancePercent,
    placementProbability,
    factors,
  };
}

function generateMany(count: number, startId: number, seed: number): Student[] {
  const rng = makeRng(seed);
  const out: Student[] = [];
  for (let i = 0; i < count; i++) out.push(generateStudent(startId + i, rng));
  return out;
}

// Append a large generated cohort to the curated list.
const GENERATED_COUNT = 294;
const startId = mockStudents.length + 1;
mockStudents.push(...generateMany(GENERATED_COUNT, startId, 20260606));

export const departments = ["All", "Computer Science", "Electronics", "Mechanical", "Civil"];
export const years = [0, 1, 2, 3, 4]; // 0 = All

