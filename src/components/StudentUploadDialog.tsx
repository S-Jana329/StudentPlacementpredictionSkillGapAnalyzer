import { useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Upload, FileSpreadsheet, Download, Loader2 } from "lucide-react";
import { useStudents } from "@/hooks/useStudents";
import { parseFile, rowsToStudents, CSV_TEMPLATE } from "@/lib/studentImport";

const StudentUploadDialog = ({ trigger }: { trigger?: React.ReactNode }) => {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const fileRef = useRef<HTMLInputElement>(null);
  const { addStudents, nextId, uploaded, clearUploaded } = useStudents();

  const handleFile = async (file: File) => {
    setBusy(true);
    setErrors([]);
    try {
      const rows = await parseFile(file);
      if (rows.length === 0) {
        toast.error("No rows found in file");
        return;
      }
      const { students, errors: rowErrors } = rowsToStudents(rows, nextId);
      if (students.length === 0) {
        toast.error("No valid student rows could be imported");
        setErrors(rowErrors);
        return;
      }
      addStudents(students);
      setErrors(rowErrors);
      toast.success(
        `Imported ${students.length} student${students.length !== 1 ? "s" : ""}` +
          (rowErrors.length ? ` (${rowErrors.length} skipped)` : "")
      );
      if (rowErrors.length === 0) setOpen(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to parse file");
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const downloadTemplate = () => {
    const blob = new Blob([CSV_TEMPLATE], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "students-template.csv";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button size="sm" variant="outline">
            <Upload className="w-3.5 h-3.5 mr-1.5" /> Upload
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle className="font-display">Import students</DialogTitle>
          <DialogDescription className="font-body">
            Upload a CSV or Excel file. Required column: <code>name</code>. Optional:
            department, year, gpa, internships, project_score, certifications,
            extracurriculars, backlogs, attendance_percent. List fields can be separated by
            <code>;</code> or <code>,</code>.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="w-full border-2 border-dashed border-border rounded-lg p-6 flex flex-col items-center justify-center gap-2 hover:bg-muted/40 transition"
            disabled={busy}
          >
            {busy ? (
              <Loader2 className="w-8 h-8 text-muted-foreground animate-spin" />
            ) : (
              <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
            )}
            <p className="text-sm font-body text-foreground">
              {busy ? "Importing..." : "Click to choose a CSV or Excel file"}
            </p>
            <p className="text-xs text-muted-foreground font-body">.csv, .xlsx, .xls</p>
          </button>
          <input
            ref={fileRef}
            type="file"
            accept=".csv,.xlsx,.xls,text/csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) handleFile(f);
            }}
          />

          {errors.length > 0 && (
            <div className="rounded-md border border-warning/40 bg-warning/5 p-3 max-h-40 overflow-y-auto">
              <p className="text-xs font-medium text-foreground mb-1 font-body">
                {errors.length} row{errors.length !== 1 ? "s" : ""} skipped
              </p>
              <ul className="text-xs text-muted-foreground font-body space-y-0.5">
                {errors.slice(0, 20).map((e, i) => (
                  <li key={i}>• {e}</li>
                ))}
                {errors.length > 20 && <li>...and {errors.length - 20} more</li>}
              </ul>
            </div>
          )}

          {uploaded.length > 0 && (
            <p className="text-xs text-muted-foreground font-body">
              {uploaded.length} uploaded student{uploaded.length !== 1 ? "s" : ""} stored
              locally in this browser.
            </p>
          )}
        </div>

        <DialogFooter className="sm:justify-between gap-2">
          <Button variant="ghost" size="sm" onClick={downloadTemplate}>
            <Download className="w-3.5 h-3.5 mr-1.5" /> Download CSV template
          </Button>
          {uploaded.length > 0 && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                clearUploaded();
                toast.success("Cleared uploaded students");
              }}
            >
              Clear uploads
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default StudentUploadDialog;
