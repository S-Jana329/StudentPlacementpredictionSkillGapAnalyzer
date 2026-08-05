import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { toast } from "sonner";
import { z } from "zod";

const passwordRequirements = [
  { label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { label: "One number", test: (value: string) => /\d/.test(value) },
] as const;

const schema = z
  .object({
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password must be 72 characters or fewer")
      .regex(/[A-Z]/, "Password needs an uppercase letter")
      .regex(/[a-z]/, "Password needs a lowercase letter")
      .regex(/\d/, "Password needs a number"),
    confirm_password: z.string().min(1, "Please confirm your password"),
  })
  .superRefine(({ password, confirm_password }, context) => {
    if (password !== confirm_password) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["confirm_password"],
        message: "Passwords do not match",
      });
    }
  });

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [ready, setReady] = useState(false);
  const [validLink, setValidLink] = useState(false);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<{ password?: string; confirm_password?: string }>({});
  const [done, setDone] = useState(false);

  const score = passwordRequirements.filter(({ test }) => test(password)).length;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    const hash = window.location.hash ?? "";
    const isRecovery = hash.includes("type=recovery");

    const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || (isRecovery && session)) {
        setValidLink(true);
        setReady(true);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data.session && (isRecovery || true)) setValidLink(true);
      setReady(true);
    });

    return () => sub.subscription.unsubscribe();
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = schema.safeParse({ password, confirm_password: confirmPassword });
    if (!parsed.success) {
      const next: typeof errors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof typeof errors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      return;
    }
    setErrors({});
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) throw error;
      setDone(true);
      toast.success("Password updated");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/auth", { replace: true }), 1200);
    } catch (err: any) {
      toast.error(err?.message ?? "Could not update password");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md section-card">
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">Set a new password</h1>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Student Placement Prediction System
        </p>

        {!ready && <p className="text-sm text-muted-foreground">Checking your reset link...</p>}

        {ready && !validLink && !done && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              This reset link is invalid or has expired. Request a new one to continue.
            </p>
            <Button className="w-full" onClick={() => navigate("/auth", { replace: true })}>
              Back to sign in
            </Button>
          </div>
        )}

        {ready && validLink && !done && (
          <form onSubmit={submit} className="space-y-4" noValidate>
            <div>
              <Label htmlFor="new-password">New password</Label>
              <div className="relative">
                <Input
                  id="new-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrors((p) => ({ ...p, password: undefined }));
                  }}
                  required
                  className="pr-12"
                  aria-invalid={!!errors.password}
                  aria-describedby="new-password-error"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 md:h-8 md:w-8"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </div>
              <FieldError id="new-password-error">{errors.password}</FieldError>
              <div className="mt-3 space-y-2" aria-live="polite">
                <div className="flex items-center gap-2">
                  {passwordRequirements.map((_, index) => (
                    <span
                      key={index}
                      className={`h-1.5 flex-1 rounded-full ${index < score ? (score >= 4 ? "bg-primary" : score >= 2 ? "bg-secondary" : "bg-destructive") : "bg-muted"}`}
                    />
                  ))}
                </div>
                <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
                  {passwordRequirements.map(({ label, test }) => {
                    const met = test(password);
                    return (
                      <li key={label} className="flex items-center gap-1.5">
                        <Check aria-hidden="true" className={met ? "text-primary" : "text-muted-foreground/60"} size={14} />
                        <span className={met ? "text-foreground" : undefined}>{label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>

            <div>
              <Label htmlFor="confirm-new-password">Confirm new password</Label>
              <Input
                id="confirm-new-password"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => {
                  setConfirmPassword(e.target.value);
                  setErrors((p) => ({ ...p, confirm_password: undefined }));
                }}
                required
                aria-invalid={!!errors.confirm_password || passwordsMismatch}
                aria-describedby="confirm-new-password-error"
              />
              <FieldError id="confirm-new-password-error">
                {errors.confirm_password ?? (passwordsMismatch ? "Passwords do not match." : undefined)}
              </FieldError>
            </div>

            <Button type="submit" disabled={loading} className="w-full">
              {loading ? "Updating..." : "Update password"}
            </Button>
          </form>
        )}

        {done && (
          <p className="text-sm text-foreground">
            Your password has been updated. Redirecting you to sign in...
          </p>
        )}
      </div>
    </div>
  );
};

export default ResetPasswordPage;
