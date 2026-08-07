import { useCallback, useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

type AuditRow = {
  id: string;
  event_type: string;
  email: string | null;
  user_id: string | null;
  ip_address: string | null;
  user_agent: string | null;
  success: boolean;
  details: Record<string, unknown> | null;
  created_at: string;
};

const PAGE_SIZE = 50;

const eventLabels: Record<string, string> = {
  signup: "Sign-up",
  password_reset_requested: "Reset requested",
  password_reset_completed: "Reset link used",
};

const AdminAuthLog = () => {
  const [rows, setRows] = useState<AuditRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(0);
  const [eventType, setEventType] = useState("all");
  const [emailFilter, setEmailFilter] = useState("");
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    let query = supabase
      .from("auth_audit_log")
      .select("*", { count: "exact" })
      .order("created_at", { ascending: false })
      .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE - 1);

    if (eventType !== "all") query = query.eq("event_type", eventType);
    if (emailFilter.trim()) query = query.ilike("email", `%${emailFilter.trim()}%`);

    const { data, error, count } = await query;
    if (error) {
      toast.error("Could not load the authentication log");
    } else {
      setRows((data ?? []) as AuditRow[]);
      setTotal(count ?? 0);
    }
    setLoading(false);
  }, [page, eventType, emailFilter]);

  useEffect(() => {
    void load();
  }, [load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="min-h-dvh bg-background">
      <AppHeader />
      <main className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-2xl font-bold text-foreground">Authentication audit log</h1>
            <p className="text-sm text-muted-foreground">
              Sign-ups, password reset requests, and reset link usage across all accounts.
            </p>
          </div>
          <Button variant="outline" onClick={() => void load()} disabled={loading}>
            <RefreshCw aria-hidden="true" className={loading ? "animate-spin" : undefined} />
            <span>Refresh</span>
          </Button>
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div>
            <Label htmlFor="event-filter">Event type</Label>
            <Select
              value={eventType}
              onValueChange={(value) => {
                setPage(0);
                setEventType(value);
              }}
            >
              <SelectTrigger id="event-filter">
                <SelectValue placeholder="All events" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All events</SelectItem>
                <SelectItem value="signup">Sign-up</SelectItem>
                <SelectItem value="password_reset_requested">Reset requested</SelectItem>
                <SelectItem value="password_reset_completed">Reset link used</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="email-filter">Email contains</Label>
            <Input
              id="email-filter"
              value={emailFilter}
              onChange={(e) => {
                setPage(0);
                setEmailFilter(e.target.value);
              }}
              placeholder="jane@example.com"
            />
          </div>
        </div>

        {/* Desktop table */}
        <div className="hidden overflow-x-auto rounded-md border border-border md:block">
          <table className="w-full text-sm">
            <caption className="sr-only">Authentication events, newest first</caption>
            <thead className="bg-muted/50 text-left">
              <tr>
                <th scope="col" className="p-3 font-medium">When</th>
                <th scope="col" className="p-3 font-medium">Event</th>
                <th scope="col" className="p-3 font-medium">Email</th>
                <th scope="col" className="p-3 font-medium">Result</th>
                <th scope="col" className="p-3 font-medium">IP</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id} className="border-t border-border">
                  <td className="p-3 whitespace-nowrap text-muted-foreground">
                    {new Date(row.created_at).toLocaleString()}
                  </td>
                  <td className="p-3">{eventLabels[row.event_type] ?? row.event_type}</td>
                  <td className="p-3 break-all">{row.email ?? "—"}</td>
                  <td className={`p-3 font-medium ${row.success ? "text-primary" : "text-destructive"}`}>
                    {row.success ? "Success" : "Failed"}
                  </td>
                  <td className="p-3 text-muted-foreground">{row.ip_address ?? "—"}</td>
                </tr>
              ))}
              {!loading && rows.length === 0 && (
                <tr>
                  <td colSpan={5} className="p-6 text-center text-muted-foreground">
                    No authentication events recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile cards */}
        <ul className="space-y-3 md:hidden">
          {rows.map((row) => (
            <li key={row.id} className="rounded-md border border-border p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="font-medium text-foreground">
                  {eventLabels[row.event_type] ?? row.event_type}
                </span>
                <span className={`text-xs font-semibold ${row.success ? "text-primary" : "text-destructive"}`}>
                  {row.success ? "Success" : "Failed"}
                </span>
              </div>
              <p className="mt-1 break-all text-sm text-muted-foreground">{row.email ?? "No email recorded"}</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {new Date(row.created_at).toLocaleString()} · {row.ip_address ?? "unknown IP"}
              </p>
            </li>
          ))}
          {!loading && rows.length === 0 && (
            <li className="rounded-md border border-border p-6 text-center text-muted-foreground">
              No authentication events recorded yet.
            </li>
          )}
        </ul>

        <div className="mt-4 flex items-center justify-between gap-3">
          <p className="text-sm text-muted-foreground" aria-live="polite">
            Page {page + 1} of {totalPages} · {total} events
          </p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0 || loading}>
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setPage((p) => p + 1)}
              disabled={page + 1 >= totalPages || loading}
            >
              Next
            </Button>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminAuthLog;
