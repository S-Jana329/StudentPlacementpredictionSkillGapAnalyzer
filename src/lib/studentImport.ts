import Papa from "papaparse";
import * as XLSX from "xlsx";
import type { Student, PredictionFactor } from "@/data/students";

const VALID_DEPARTMENTS = ["Computer Science", "Electronics", "Mechanical", "Civil"];

function clamp(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

function toNum(v: unknown, fallback = 0): number {
  if (v === null || v === undefined || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v).trim());
  return Number.isFinite(n) ? n : fallback;
}

function toList(v: unknown): string[] {
  if (Array.isArray(v)) return v.map((x) => String(x).trim()).filter(Boolean);
  if (!v) return [];
  return String(v)
    .split(/[,;|]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function normalizeDepartment(v: unknown): string {
  const raw = String(v ?? "").trim();
  const match = VALID_DEPARTMENTS.find(
    (d) => d.toLowerCase() === raw.toLowerCase()
  );
  return match ?? "Computer Science";
}

function computeFactors(s: {
  gpa: number;
  internships: number;
  projectScore: number;
  certifications: string[];
  backlogs: number;
  attendancePercent: number;
}): { probability: number; factors: PredictionFactor[] } {
  const gpaScore = (s.gpa - 4) * 12;
  const internScore = s.internships * 10;
  const projScore = (s.projectScore - 40) * 0.5;
  const certScore = s.certifications.length * 5;
  const attendScore = (s.attendancePercent - 55) * 0.4;
  const backlogPenalty = s.backlogs * 8;
  const raw =
    gpaScore + internScore + projScore + certScore + attendScore - backlogPenalty;
  const probability = clamp(Math.round(raw), 5, 99);

  const sign = (good: boolean, mag: number): Pick<PredictionFactor, "weight" | "contribution"> => ({
    weight: good ? mag : -mag,
    contribution: good ? "positive" : "negative",
  });

  const factors: PredictionFactor[] = [
    { label: "GPA", ...sign(s.gpa >= 7, Math.round(Math.abs(s.gpa - 6.5) * 14)) },
    {
      label: "Internships",
      ...sign(s.internships >= 1, s.internships >= 1 ? 30 + s.internships * 15 : 40),
    },
    {
      label: "Project Score",
      ...sign(s.projectScore >= 65, Math.round(Math.abs(s.projectScore - 65) * 0.9)),
    },
    {
      label: "Certifications",
      ...sign(
        s.certifications.length >= 1,
        s.certifications.length >= 1 ? 15 + s.certifications.length * 10 : 35
      ),
    },
    {
      label: "Backlogs",
      ...sign(s.backlogs === 0, s.backlogs === 0 ? 0 : 20 + s.backlogs * 10),
    },
    {
      label: "Attendance",
      ...sign(
        s.attendancePercent >= 80,
        Math.round(Math.abs(s.attendancePercent - 80) * 1.2)
      ),
    },
  ];

  return { probability, factors };
}

export type ImportRow = Record<string, unknown>;

export interface ImportResult {
  students: Student[];
  errors: string[];
}

export function rowsToStudents(rows: ImportRow[], startId: number): ImportResult {
  const errors: string[] = [];
  const students: Student[] = [];

  rows.forEach((rawRow, idx) => {
    const row: Record<string, unknown> = {};
    for (const k of Object.keys(rawRow)) {
      row[k.toLowerCase().trim().replace(/\s+/g, "_")] = rawRow[k];
    }

    const name = String(row.name ?? row.full_name ?? "").trim();
    if (!name) {
      errors.push(`Row ${idx + 2}: missing name — skipped`);
      return;
    }

    const gpa = clamp(toNum(row.gpa, 0), 0, 10);
    const year = clamp(Math.round(toNum(row.year, 1)), 1, 4);
    const internships = clamp(Math.round(toNum(row.internships, 0)), 0, 10);
    const projectScore = clamp(Math.round(toNum(row.project_score ?? row.projectscore, 50)), 0, 100);
    const backlogs = clamp(Math.round(toNum(row.backlogs, 0)), 0, 20);
    const attendancePercent = clamp(
      Math.round(toNum(row.attendance ?? row.attendance_percent ?? row.attendancepercent, 75)),
      0,
      100
    );
    const certifications = toList(row.certifications);
    const extracurriculars = toList(row.extracurriculars ?? row.activities);
    const department = normalizeDepartment(row.department);

    const { probability, factors } = computeFactors({
      gpa,
      internships,
      projectScore,
      certifications,
      backlogs,
      attendancePercent,
    });

    students.push({
      id: String(startId + students.length),
      name,
      department,
      year,
      gpa,
      internships,
      projectScore,
      extracurriculars,
      certifications,
      backlogs,
      attendancePercent,
      placementProbability: probability,
      factors,
    });
  });

  return { students, errors };
}

export async function parseFile(file: File): Promise<ImportRow[]> {
  const ext = file.name.toLowerCase().split(".").pop();

  if (ext === "csv" || file.type === "text/csv") {
    return new Promise((resolve, reject) => {
      Papa.parse<ImportRow>(file, {
        header: true,
        skipEmptyLines: true,
        complete: (res) => resolve(res.data),
        error: (err) => reject(err),
      });
    });
  }

  if (ext === "xlsx" || ext === "xls") {
    const buf = await file.arrayBuffer();
    const wb = XLSX.read(buf, { type: "array" });
    const sheet = wb.Sheets[wb.SheetNames[0]];
    return XLSX.utils.sheet_to_json<ImportRow>(sheet, { defval: "" });
  }

  throw new Error("Unsupported file type. Use .csv, .xlsx, or .xls");
}

export const CSV_TEMPLATE = `name,department,year,gpa,internships,project_score,certifications,extracurriculars,backlogs,attendance_percent
Jane Doe,Computer Science,4,8.5,2,85,"AWS Cloud Practitioner;React Developer","Coding Club;Hackathon Winner",0,92
John Smith,Mechanical,3,7.0,1,70,"AutoCAD Professional","Sports Team",1,80
`;
