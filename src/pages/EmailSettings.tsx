import { useEffect, useMemo, useState } from "react";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Mail, CheckCircle2, AlertCircle, ExternalLink } from "lucide-react";

const STORAGE_KEY = "email-notification-settings-v1";

type Settings = {
  senderDomain: string;
  fromName: string;
  fromLocalPart: string;
  notifyResumeComplete: boolean;
  notifyRoadmapReady: boolean;
  notifyInterviewFeedback: boolean;
};

const defaults: Settings = {
  senderDomain: "",
  fromName: "Placement Predictor",
  fromLocalPart: "notifications",
  notifyResumeComplete: true,
  notifyRoadmapReady: true,
  notifyInterviewFeedback: true,
};

const load = (): Settings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaults;
    return { ...defaults, ...JSON.parse(raw) };
  } catch {
    return defaults;
  }
};

const domainPattern = /^([a-z0-9]([a-z0-9-]*[a-z0-9])?\.)+[a-z]{2,}$/i;
const localPattern = /^[a-z0-9._-]+$/i;

const EmailSettings = () => {
  const [s, setS] = useState<Settings>(defaults);
  const [saved, setSaved] = useState(true);

  useEffect(() => {
    setS(load());
  }, []);

  const fromAddress = useMemo(
    () => (s.senderDomain && s.fromLocalPart ? `${s.fromLocalPart}@${s.senderDomain}` : ""),
    [s.senderDomain, s.fromLocalPart],
  );

  const domainValid = !s.senderDomain || domainPattern.test(s.senderDomain);
  const localValid = !s.fromLocalPart || localPattern.test(s.fromLocalPart);
  const canSave = domainValid && localValid && s.fromName.trim().length > 0;

  const update = <K extends keyof Settings>(k: K, v: Settings[K]) => {
    setS((p) => ({ ...p, [k]: v }));
    setSaved(false);
  };

  const save = () => {
    if (!canSave) {
      toast.error("Please fix the errors before saving.");
      return;
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
    setSaved(true);
    toast.success("Email settings saved");
  };

  const reset = () => {
    setS(defaults);
    setSaved(false);
  };

  return (
    <div className="min-h-screen bg-background">
      <AppHeader />
      <main className="max-w-3xl mx-auto p-8 space-y-6">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground flex items-center gap-2">
            <Mail size={22} /> Email Notifications
          </h1>
          <p className="text-sm font-body text-muted-foreground mt-1">
            Configure your sender domain and choose which events trigger emails.
          </p>
        </div>

        {/* Sender domain */}
        <section className="section-card space-y-4">
          <div>
            <h2 className="font-display text-base font-semibold">Sender Domain</h2>
            <p className="text-xs text-muted-foreground font-body mt-1">
              The domain your users will see in their inbox (e.g. <code>notify.yourdomain.com</code>).
              Verify your domain in Cloud → Emails before sending.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="domain">Sender domain</Label>
              <Input
                id="domain"
                placeholder="notify.yourdomain.com"
                value={s.senderDomain}
                onChange={(e) => update("senderDomain", e.target.value.trim().toLowerCase())}
              />
              {!domainValid && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle size={12} /> Enter a valid domain.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="fromName">From name</Label>
              <Input
                id="fromName"
                placeholder="Placement Predictor"
                value={s.fromName}
                onChange={(e) => update("fromName", e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="local">From address (local part)</Label>
              <div className="flex items-stretch">
                <Input
                  id="local"
                  placeholder="notifications"
                  value={s.fromLocalPart}
                  onChange={(e) => update("fromLocalPart", e.target.value.trim().toLowerCase())}
                  className="rounded-r-none"
                />
                <span className="inline-flex items-center px-3 rounded-r-md border border-l-0 border-input bg-muted text-xs text-muted-foreground">
                  @{s.senderDomain || "yourdomain.com"}
                </span>
              </div>
              {!localValid && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertCircle size={12} /> Use letters, digits, dots, dashes, or underscores.
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Label>Preview</Label>
              <div className="rounded-md border border-border bg-muted/40 px-3 py-2 text-sm font-body">
                {s.fromName ? <span className="font-medium">{s.fromName}</span> : <span className="text-muted-foreground">From Name</span>}{" "}
                <span className="text-muted-foreground">
                  &lt;{fromAddress || "address@yourdomain.com"}&gt;
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Notification toggles */}
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
              checked={s.notifyResumeComplete}
              onChange={(v) => update("notifyResumeComplete", v)}
            />
            <ToggleRow
              title="Career roadmap ready"
              description="Notify when a generated career roadmap is available."
              checked={s.notifyRoadmapReady}
              onChange={(v) => update("notifyRoadmapReady", v)}
            />
            <ToggleRow
              title="Interview feedback ready"
              description="Send performance feedback after a mock interview session."
              checked={s.notifyInterviewFeedback}
              onChange={(v) => update("notifyInterviewFeedback", v)}
            />
          </div>
        </section>

        {/* Status / help */}
        <section className="section-card flex items-start gap-3">
          <CheckCircle2 className="text-success shrink-0 mt-0.5" size={18} />
          <div className="text-sm font-body text-foreground">
            <p>
              After saving, verify your domain's DNS records in{" "}
              <a
                href="#"
                onClick={(e) => e.preventDefault()}
                className="text-primary inline-flex items-center gap-1"
              >
                Cloud → Emails <ExternalLink size={12} />
              </a>{" "}
              to start sending live notifications.
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              These preferences are stored locally on this device.
            </p>
          </div>
        </section>

        <div className="flex items-center justify-end gap-2">
          <Button variant="outline" onClick={reset}>Reset</Button>
          <Button onClick={save} disabled={!canSave || saved}>
            {saved ? "Saved" : "Save changes"}
          </Button>
        </div>
      </main>
    </div>
  );
};

const ToggleRow = ({
  title,
  description,
  checked,
  onChange,
}: {
  title: string;
  description: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) => (
  <div className="flex items-start justify-between gap-4 rounded-md border border-border p-3">
    <div>
      <p className="text-sm font-body font-medium text-foreground">{title}</p>
      <p className="text-xs text-muted-foreground font-body mt-0.5">{description}</p>
    </div>
    <Switch checked={checked} onCheckedChange={onChange} />
  </div>
);

export default EmailSettings;
