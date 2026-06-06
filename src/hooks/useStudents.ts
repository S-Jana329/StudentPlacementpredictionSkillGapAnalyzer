import { useCallback, useEffect, useState } from "react";
import { mockStudents, type Student } from "@/data/students";

const STORAGE_KEY = "uploaded-students-v1";

function loadStored(): Student[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Student[]) : [];
  } catch {
    return [];
  }
}

function persist(list: Student[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch (e) {
    console.error("Failed to persist uploaded students", e);
  }
}

export function useStudents() {
  const [uploaded, setUploaded] = useState<Student[]>(() => loadStored());

  useEffect(() => {
    const handler = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) setUploaded(loadStored());
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const addStudents = useCallback((items: Student[]) => {
    setUploaded((prev) => {
      const next = [...items, ...prev];
      persist(next);
      return next;
    });
  }, []);

  const clearUploaded = useCallback(() => {
    setUploaded([]);
    persist([]);
  }, []);

  const all: Student[] = [...uploaded, ...mockStudents];
  const nextId = mockStudents.length + uploaded.length + 1;

  return { students: all, uploaded, addStudents, clearUploaded, nextId };
}
