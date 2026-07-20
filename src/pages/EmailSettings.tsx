import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, CheckCircle2, AlertCircle, ExternalLink, Loader2, ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Settings = {
  sender_domain: string;
  from_name: string;
  from_local_part: string;
  notify_resume_complete: boolean;
  notify_roadmap_ready: boolean;
  notify_interview_feedback: boolean;
};

const defaults: Settings = {
  sender_domain: "",
  from_name: "Placement Predictor",
  from_local_part: "notifications",
  notify_resume_complete: true,
  notify_roadmap_ready: true,
  notify_interview_feedback: true,
};

const domainRegex = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const localRegex = /^[a-z0-9._-]+$/i;

const schema = z.object({
  sender_domain: z
    .string()
    .trim()
    .max(253)
    .refine((v) => v === "" || domainRegex.test(v), "Enter a valid domain."),
  from_name: z.string().trim().min(1, "From name is required").max(100),
  from_local_part: z
    .string()
    .trim()
    .min(1)
    .max(64)
    .regex(localRegex, "Use letters, digits, dots, dashes, or underscores."),
  notify_resume_complete: z.boolean(),
  notify_roadmap_ready: z.boolean(),
  notify_interview_feedback: z.boolean(),
});

const EmailSettings = () => {
  const { user } = useAuth();
  const [s, setS] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(true);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [verifying, setVerifying] = useState(false);
  const [dnsError, setDnsError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [retryAt, setRetryAt] = useState<number | null>(null);
  const [now, setNow] = useState(Date.now());
  const [dnsResult, setDnsResult] = useState<{
    domain: string;
    checkedAt: string;
    checks: {
      spf: { status: "pass" | "fail" | "unknown"; detail: string; record?: string };
      dkim: { status: "pass" | "fail" | "unknown"; detail: string; record?: string };
      dmarc: { status: "pass" | "fail" | "unknown"; detail: string; record?: string };
    };
  } | null>(null);

  useEffect(() => {
    if (!retryAt) return;
    const id = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(id);
  }, [retryAt]);

  // Exponential backoff: 2s, 4s, 8s, 16s, capped at 30s
  const backoffMs = (n: number) => Math.min(30_000, 2_000 * Math.pow(2, Math.max(0, n - 1)));
  const TIMEOUT_MS = 15_000;

  const verifyDns = async () => {
    const domain = s.sender_domain.trim().toLowerCase();
    if (!domain || !domainRegex.test(domain)) {
      setErrors((p) => ({ ...p, sender_domain: "Enter a valid domain before verifying DNS." }));
      toast.error("Enter a valid domain first.");
      return;
    }
    if (retryAt && Date.now() < retryAt) return;

    setVerifying(true);
    setDnsError(null);
    setDnsResult(null);
    setRetryAt(null);
    const thisAttempt = attempt + 1;
    setAttempt(thisAttempt);

    try {
      const invocation = supabase.functions.invoke("verify-email-dns", { body: { domain } });
      const timeout = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error("Request timed out after 15s.")), TIMEOUT_MS),
      );
      const { data, error } = (await Promise.race([invocation, timeout])) as Awaited<typeof invocation>;
      if (error) throw new Error(error.message || "Edge function returned an error.");
      if (!data?.checks) throw new Error("Malformed response from DNS verification.");

      setDnsResult(data);
      const c = data.checks;
      const passes = [c.spf, c.dkim, c.dmarc].filter((x: any) => x.status === "pass").length;
      if (passes === 3) {
        setAttempt(0);
        toast.success("All DNS checks passed");
      } else {
        const next = Date.now() + backoffMs(thisAttempt);
        setRetryAt(next);
        toast.message(`${passes}/3 DNS checks passed`, {
          description: `You can retry in ${Math.ceil(backoffMs(thisAttempt) / 1000)}s.`,
        });
      }
    } catch (e) {
      const msg = (e as Error).message || "DNS check failed.";
      setDnsError(msg);
      const next = Date.now() + backoffMs(thisAttempt);
      setRetryAt(next);
      toast.error("DNS check failed", {
        description: `${msg} Retry available in ${Math.ceil(backoffMs(thisAttempt) / 1000)}s.`,
      });
    } finally {
      setVerifying(false);
    }
  };

  const resetRetry = () => {
    setAttempt(0);
    setRetryAt(null);
    setDnsError(null);
  };


  useEffect(() => {
    if (!user) return;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("email_settings")
        .select("sender_domain, from_name, from_local_part, notify_resume_complete, notify_roadmap_ready, notify_interview_feedback")
        .eq("user_id", user.id)
        .maybeSingle();
      if (error) toast.error(error.message);
      if (data) setS({ ...defaults, ...data });
      setLoading(false);
    })();
  }, [user]);

  const fromAddress = useMemo(
    () => (s.sender_domain && s.from_local_part ? `${s.from_local_part}@${s.sender_domain}` : ""),
    [s.sender_domain, s.from_local_part],
  );

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  const save = async () => {
    if (!user) return;
    const parsed = schema.safeParse(s);
    if (!parsed.success) {
      const e: Record<string, string> = {};
      for (const i of parsed.error.issues) e[i.path[0] as string] = i.message;
      setErrors(e);
      toast.error("Please fix the highlighted fields before saving.", {
        description: `${parsed.error.issues.length} field${parsed.error.issues.length > 1 ? "s" : ""} need attention.`,
      });
      return;
    }
    setErrors({});
    setSaving(true);
    const { error } = await supabase
      .from("email_settings")
      .upsert({ user_id: user.id, ...parsed.data }, { onConflict: "user_id" });
    setSaving(false);
    if (error) {
      // Map Postgres CHECK constraint violations back to specific fields
      const fieldErrors: Record<string, string> = {};
      const msg = `${error.message} ${(error as any).details ?? ""}`.toLowerCase();
      if (msg.includes("email_settings_domain_chk")) {
        fieldErrors.sender_domain = "Backend rejected this domain. Use a valid format like notify.yourdomain.com.";
      }
      if (msg.includes("email_settings_local_chk")) {
        fieldErrors.from_local_part = "Backend rejected this address. Use letters, digits, dots, dashes, or underscores (max 64).";
      }
      if (msg.includes("email_settings_from_name_chk")) {
        fieldErrors.from_name = "Backend rejected this name. Must be 1–100 characters.";
      }
      if (Object.keys(fieldErrors).length > 0) {
        setErrors(fieldErrors);
        toast.error("Couldn't save settings", {
          description: "Your sender details didn't pass validation. See the highlighted fields.",
        });
      } else {
        toast.error("Couldn't save settings", { description: error.message });
      }
      return;
    }
    setSaved(true);
    toast.success("Email settings saved", {
      description: s.sender_domain
        ? `Notifications will send from ${s.from_local_part}@${s.sender_domain}.`
        : "Add a sender domain to start sending notifications.",
    });
    if (s.sender_domain && domainRegex.test(s.sender_domain)) {
      verifyDns();
    }
  };


  const reset = () => {
    setS(defaults);
    setErrors({});
    setSaved(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AppHeader />
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-muted-foreground" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto p-4 sm:p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail size={22} /> Email Notifications
          </h1>
          <p className="text-sm font-body text-muted-foreground mt-1">
            Configure your sender domain and choose which events trigger emails.
          </p>
        </div>

        <section className="section-card space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold">Sender Domain</h2>
            <p className="text-xs text-muted-foreground font-body mt-1">
              The domain your users will see in their inbox (e.g. <code>notify.yourdomain.com</code>).
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="domain">Sender domain</Label>
                {(() => {
                  const cooldown = retryAt ? Math.max(0, Math.ceil((retryAt - now) / 1000)) : 0;
                  const blocked = verifying || !s.sender_domain || cooldown > 0;
                  const isRetry = attempt > 0 && (dnsError || (dnsResult && [dnsResult.checks.spf, dnsResult.checks.dkim, dnsResult.checks.dmarc].some((c) => c.status !== "pass")));
                  return (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={verifyDns}
                      disabled={blocked}
                      title={cooldown > 0 ? `Retry available in ${cooldown}s` : undefined}
                    >
                      {verifying ? (
                        <><Loader2 className="animate-spin mr-1.5" size={12} /> Checking...</>
                      ) : cooldown > 0 ? (
                        <><ShieldAlert className="mr-1.5" size={12} /> Retry in {cooldown}s</>
                      ) : isRetry ? (
                        <><ShieldAlert className="mr-1.5" size={12} /> Retry verification</>
                      ) : (
                        <><ShieldCheck className="mr-1.5" size={12} /> Verify DNS</>
                      )}
                    </Button>
                  );
                })()}
              </div>
              <Input
                id="domain"
                placeholder="notify.yourdomain.com"
                maxLength={253}
                value={s.sender_domain}
                onChange={(e) => {
                  update("sender_domain", e.target.value.trim().toLowerCase());
                  setDnsResult(null);
                  resetRetry();
                }}
              />
              {errors.sender_domain && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.sender_domain}
                </p>
              )}
              {dnsError && (
                <div className="rounded-md border border-destructive/40 bg-destructive/5 px-3 py-2 text-xs font-body text-destructive flex items-start gap-2">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <p className="font-medium">DNS verification failed (attempt {attempt})</p>
                    <p className="mt-0.5 text-destructive/90">{dnsError}</p>
                    {retryAt && now < retryAt && (
                      <p className="mt-0.5 text-muted-foreground">
                        Backing off — retry available in {Math.max(0, Math.ceil((retryAt - now) / 1000))}s.
                      </p>
                    )}
                  </div>
                </div>
              )}

              {dnsResult && (
                <div className="mt-2 rounded-md border border-border divide-y divide-border overflow-hidden">
                  {(["spf", "dkim", "dmarc"] as const).map((k) => {
                    const c = dnsResult.checks[k];
                    const Icon = c.status === "pass" ? ShieldCheck : c.status === "fail" ? ShieldAlert : ShieldQuestion;
                    const color =
                      c.status === "pass" ? "text-success" : c.status === "fail" ? "text-destructive" : "text-muted-foreground";
                    return (
                      <div key={k} className="flex items-start gap-2 px-3 py-2 bg-muted/30">
                        <Icon className={`${color} shrink-0 mt-0.5`} size={14} />
                        <div className="min-w-0">
                          <p className="text-xs font-body font-medium text-foreground uppercase tracking-wide">
                            {k} <span className={`ml-1 ${color}`}>{c.status}</span>
                          </p>
                          <p className="text-xs font-body text-muted-foreground mt-0.5">{c.detail}</p>
                          {c.record && (
                            <p className="text-[10px] font-mono text-muted-foreground/80 mt-1 break-all">{c.record}</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                  <p className="text-[10px] text-muted-foreground px-3 py-1.5 bg-muted/30">
                    Checked at {new Date(dnsResult.checkedAt).toLocaleTimeString()}
                  </p>
                </div>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromName">From name</Label>
              <Input
                id="fromName"
                placeholder="Placement Predictor"
                maxLength={100}
                value={s.from_name}
                onChange={(e) => update("from_name", e.target.value)}
              />
              {errors.from_name && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.from_name}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">From address (local part)</Label>
              <div className="flex items-stretch">
                <Input
                  id="local"
                  placeholder="notifications"
                  maxLength={64}
                  value={s.from_local_part}
                  onChange={(e) => update("from_local_part", e.target.value.trim().toLowerCase())}
                  className="rounded-r-none"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-xs text-muted-foreground">
                  @{s.sender_domain || "yourdomain.com"}
                </span>
              </div>
              {errors.from_local_part && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle size={12} /> {errors.from_local_part}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-body">
                {s.from_name ? <span className="font-medium">{s.from_name}</span> : <span className="text-muted-foreground">From Name</span>}{" "}
                <span className="text-muted-foreground">
                  &lt;{fromAddress || "address@yourdomain.com"}&gt;
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="section-card space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold">Notification Events</h2>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Choose which events trigger an email to the recipient.
            </p>
          </div>

          <div className="space-y-3">
            <ToggleRow
              title="Resume analysis complete"
              description="Send a summary email when AI resume analysis finishes."
              checked={s.notify_resume_complete}
              onChange={(v) => update("notify_resume_complete", v)}
            />
            <ToggleRow
              title="Career roadmap ready"
              description="Notify when a generated career roadmap is available."
              checked={s.notify_roadmap_ready}
              onChange={(v) => update("notify_roadmap_ready", v)}
            />
            <ToggleRow
              title="Interview feedback ready"
              description="Send performance feedback after a mock interview session."
              checked={s.notify_interview_feedback}
              onChange={(v) => update("notify_interview_feedback", v)}
            />
          </div>
        </section>

        <section className="section-card space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold">Email Previews</h2>
            <p className="text-xs text-muted-foreground font-body mt-1">
              Examples of what recipients will see for each enabled event.
            </p>
          </div>
          <div className="space-y-3">
            {[
              {
                enabled: s.notify_resume_complete,
                subject: "Your resume analysis is ready",
                preview: "We've finished analyzing your resume. View your match scores and top skill highlights inside the app.",
                cta: "View resume report",
              },
              {
                enabled: s.notify_roadmap_ready,
                subject: "Your career roadmap is ready",
                preview: "Your personalized roadmap with milestones, recommended courses, and target roles is now available.",
                cta: "Open roadmap",
              },
              {
                enabled: s.notify_interview_feedback,
                subject: "Your mock interview feedback is ready",
                preview: "See your performance breakdown, strengths, and areas to improve from your latest mock interview.",
                cta: "View feedback",
              },
            ].map((ex, i) => (
              <div
                key={i}
                className={`rounded-md border border-border overflow-hidden ${ex.enabled ? "" : "opacity-50"}`}
              >
                <div className="bg-muted/40 px-3 py-2 text-xs font-body border-b border-border flex items-center justify-between">
                  <span className="truncate">
                    <span className="font-medium text-foreground">{s.from_name || "From Name"}</span>{" "}
                    <span className="text-muted-foreground">&lt;{fromAddress || "address@yourdomain.com"}&gt;</span>
                  </span>
                  {!ex.enabled && <span className="text-[10px] uppercase text-muted-foreground ml-2">Off</span>}
                </div>
                <div className="px-3 py-3 bg-background">
                  <p className="text-sm font-display font-semibold text-foreground">{ex.subject}</p>
                  <p className="text-xs font-body text-muted-foreground mt-1 leading-relaxed">{ex.preview}</p>
                  <div className="mt-3">
                    <span className="inline-block text-xs font-body font-medium px-3 py-1.5 rounded bg-primary text-primary-foreground">
                      {ex.cta}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="section-card flex items-start gap-3">
          <CheckCircle2 className="text-success shrink-0 mt-0.5" size={18} />
          <div className="text-sm font-body text-foreground">
            <p>
              After saving, verify your domain's DNS records in{" "}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-primary inline-flex items-center gap-1">
                Cloud → Emails <ExternalLink size={12} />
              </a>{" "}
              to start sending live notifications.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Settings are stored securely in your account.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={reset} disabled={saving}>Reset</Button>
          <Button onClick={save} disabled={saving || saved}>
            {saving ? <><Loader2 className="animate-spin mr-2" size={14} /> Saving...</> : saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </main>
    </div>
  );
};

const ToggleRow = ({
  title, description, checked, onChange,
}: { title: string; description: string; checked: boolean; onChange: (v: boolean) => void }) => (
  <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
    <div>
      <p className="text-sm font-body font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground font-body mt-0.5">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default EmailSettings;
