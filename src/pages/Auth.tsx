import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, Eye, EyeOff, KeyRound } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FieldError } from "@/components/ui/field-error";
import { TurnstileWidget } from "@/components/TurnstileWidget";
import { logAuthEvent } from "@/lib/authAudit";
import { passkeysSupported, signInWithPasskey } from "@/lib/passkeys";


import { FormErrorSummary, type ErrorSummaryItem } from "@/components/ui/form-error-summary";
import {
  PasswordStrengthMeter,
  passwordRequirements,
  isPasswordValid,
} from "@/components/ui/password-strength-meter";

import { toast } from "sonner";
import { z } from "zod";

const signInSchema = z.object({
  email: z.string().trim().email("Invalid email").max(255),
  password: z.string().min(6, "Min 6 characters").max(72),
  full_name: z.string().trim().max(100).optional(),
});

const signUpSchema = signInSchema
  .extend({
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

const fieldIds: Record<string, string> = {
  email: "email",
  password: "password",
  full_name: "name",
  confirm_password: "confirm-password",
};


type FormErrors = {
  email?: string;
  password?: string;
  full_name?: string;
  confirm_password?: string;
};

const AuthPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [resetSent, setResetSent] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FormErrors>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [captchaEnabled, setCaptchaEnabled] = useState(false);
  const [captchaResetKey, setCaptchaResetKey] = useState(0);
  const needsCaptcha = mode === "signup" || mode === "forgot";
  const captchaSatisfied = !captchaEnabled || Boolean(captchaToken);
  const passwordsMatch = confirmPassword.length > 0 && password === confirmPassword;
  const passwordsMismatch = confirmPassword.length > 0 && password !== confirmPassword;
  const signupPasswordReady = isPasswordValid(password) && passwordsMatch;
  const errorSummary: ErrorSummaryItem[] = (Object.keys(errors) as (keyof FormErrors)[])
    .filter((key) => errors[key])
    .map((key) => ({ fieldId: fieldIds[key] ?? key, message: errors[key] as string }));

  const verifyCaptcha = async (action: "signup" | "password_reset") => {
    if (!captchaEnabled) return true;
    if (!captchaToken) {
      toast.error("Please complete the captcha first");
      return false;
    }
    const { data, error } = await supabase.functions.invoke("verify-captcha", {
      body: { token: captchaToken, action },
    });
    if (error || !data?.success) {
      toast.error("Captcha verification failed. Please try again.");
      setCaptchaToken(null);
      setCaptchaResetKey((k) => k + 1);
      return false;
    }
    return true;
  };



  useEffect(() => {
    if (user) navigate("/", { replace: true });
  }, [user, navigate]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mode === "forgot") {
      const parsedEmail = z.string().trim().email("Invalid email").max(255).safeParse(email);
      if (!parsedEmail.success) {
        setErrors({ email: parsedEmail.error.issues[0].message });
        document.getElementById("email")?.focus();
        return;
      }
      setErrors({});
      setLoading(true);
      try {
        if (!(await verifyCaptcha("password_reset"))) return;
        const { error } = await supabase.auth.resetPasswordForEmail(parsedEmail.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (error) throw error;
        setResetSent(true);
        void logAuthEvent("password_reset_requested", { email: parsedEmail.data, success: true });
      } catch (err: any) {
        // Do not reveal whether the account exists
        console.error("Password reset request failed", err?.message);
        setResetSent(true);
        void logAuthEvent("password_reset_requested", {
          email: parsedEmail.data,
          success: false,
          details: { reason: err?.message ?? "unknown" },
        });
      } finally {

        setLoading(false);
        setCaptchaToken(null);
        setCaptchaResetKey((k) => k + 1);
      }
      return;
    }


    const values = { email, password, full_name: fullName, confirm_password: confirmPassword };
    const parsed = (mode === "signup" ? signUpSchema : signInSchema).safeParse(values);
    if (!parsed.success) {
      const next: FormErrors = {};
      for (const issue of parsed.error.issues) {
        const key = issue.path[0] as keyof FormErrors;
        if (key && !next[key]) next[key] = issue.message;
      }
      setErrors(next);
      // Focus moves to the error summary, which links to each invalid field
      return;
    }

    setErrors({});

    setLoading(true);
    try {
      if (mode === "signup") {
        if (!(await verifyCaptcha("signup"))) return;
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: window.location.origin,
            data: { full_name: fullName },
          },
        });
        if (error) throw error;
        void logAuthEvent("signup", { email, success: true });
        toast.success("Account created. Check your email if confirmation is required.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success("Welcome back");
      }
      navigate("/", { replace: true });
    } catch (err: any) {
      toast.error(err?.message ?? "Authentication failed");
      if (mode === "signup") {
        void logAuthEvent("signup", {
          email,
          success: false,
          details: { reason: err?.message ?? "unknown" },
        });
        setCaptchaToken(null);
        setCaptchaResetKey((k) => k + 1);
      }

    } finally {
      setLoading(false);
    }

  };

  const passkeyLogin = async () => {
    setLoading(true);
    try {
      await signInWithPasskey();
      toast.success("Signed in with passkey");
      navigate("/", { replace: true });
    } catch (err: unknown) {
      const message = (err as Error)?.message ?? "Passkey sign-in failed";
      if (!/NotAllowed|abort/i.test(message)) toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const google = async () => {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      toast.error(result.error.message ?? "Google sign-in failed");
      setLoading(false);
      return;
    }
    if (result.redirected) return;
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-6">
      <div className="w-full max-w-md section-card">
        <h1 className="font-display text-2xl font-bold text-foreground mb-1">
          {mode === "signin" ? "Sign in" : mode === "signup" ? "Create account" : "Reset password"}
        </h1>
        <p className="text-sm text-muted-foreground font-body mb-6">
          Student Placement Prediction System
        </p>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <FormErrorSummary items={errorSummary} title="Fix the following to continue" />

          {mode === "signup" && (
            <div>
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                value={fullName}
                onChange={(e) => {
                  setFullName(e.target.value);
                  setErrors((p) => ({ ...p, full_name: undefined }));
                }}
                placeholder="Jane Doe"
                aria-invalid={!!errors.full_name}
                aria-describedby={errors.full_name ? "name-error" : undefined}
              />
              <FieldError id="name-error">{errors.full_name}</FieldError>
            </div>
          )}
          <div>
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors((p) => ({ ...p, email: undefined }));
              }}
              required
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? "email-error" : undefined}
            />
            <FieldError id="email-error">{errors.email}</FieldError>
          </div>
          {mode !== "forgot" && (
          <div>
            <Label htmlFor="password">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setErrors((p) => ({ ...p, password: undefined }));
                }}
                required
                className="pr-12"
                aria-invalid={!!errors.password}
                aria-describedby={errors.password ? "password-error" : mode === "signup" ? "password-guidance" : undefined}
              />
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => setShowPassword((visible) => !visible)}
                className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 md:h-8 md:w-8"
                aria-label={showPassword ? "Hide password" : "Show password"}
                aria-pressed={showPassword}
              >
                {showPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
              </Button>
            </div>
            <FieldError id="password-error">{errors.password}</FieldError>
            {mode === "signup" && (
              <PasswordStrengthMeter id="password-guidance" value={password} />
            )}

          </div>
          )}

          {mode === "signup" && (
            <div>
              <Label htmlFor="confirm-password">Confirm password</Label>
              <div className="relative">
                <Input
                  id="confirm-password"
                  type={showConfirmPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    setErrors((p) => ({ ...p, confirm_password: undefined }));
                  }}
                  required
                  className="pr-12"
                  aria-invalid={!!errors.confirm_password || passwordsMismatch}
                  aria-describedby="confirm-password-error"
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfirmPassword((visible) => !visible)}
                  className="absolute right-1 top-1/2 h-9 w-9 -translate-y-1/2 md:h-8 md:w-8"
                  aria-label={showConfirmPassword ? "Hide confirmed password" : "Show confirmed password"}
                  aria-pressed={showConfirmPassword}
                >
                  {showConfirmPassword ? <EyeOff aria-hidden="true" /> : <Eye aria-hidden="true" />}
                </Button>
              </div>
              <FieldError id="confirm-password-error">
                {errors.confirm_password ?? (passwordsMismatch ? "Passwords do not match." : undefined)}
              </FieldError>
              {passwordsMatch && !errors.confirm_password && (
                <p className="mt-1 flex items-center gap-1.5 text-xs text-primary" aria-live="polite">
                  <Check aria-hidden="true" size={14} />
                  Passwords match.
                </p>
              )}
            </div>
          )}

          {mode === "forgot" && resetSent && (
            <p className="text-sm text-muted-foreground" aria-live="polite">
              If an account exists for that email, we've sent a password reset link. Check your inbox
              and spam folder — the link expires shortly for security.
            </p>
          )}

          {needsCaptcha && (
            <TurnstileWidget
              key={mode}
              resetKey={captchaResetKey}
              onToken={(token) => setCaptchaToken(token)}
              onAvailability={setCaptchaEnabled}
            />
          )}

          <Button
            type="submit"
            disabled={
              loading ||
              (mode === "signup" && !signupPasswordReady) ||
              (needsCaptcha && !captchaSatisfied)
            }
            className="w-full"
          >

            {loading
              ? "Please wait..."
              : mode === "signin"
                ? "Sign in"
                : mode === "signup"
                  ? "Create account"
                  : resetSent
                    ? "Resend reset link"
                    : "Send reset link"}
          </Button>

          {mode === "signin" && (
            <button
              type="button"
              onClick={() => {
                setMode("forgot");
                setErrors({});
                setResetSent(false);
              }}
              className="w-full text-sm text-primary hover:underline"
            >
              Forgot password?
            </button>
          )}

          {mode === "forgot" && (
            <button
              type="button"
              onClick={() => {
                setMode("signin");
                setErrors({});
                setResetSent(false);
              }}
              className="w-full text-sm text-primary hover:underline"
            >
              Back to sign in
            </button>
          )}
        </form>

        {mode !== "forgot" && (<>
        <div className="relative my-6">
          <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">Or</span>
          </div>
        </div>

        <div className="space-y-3">
          <Button type="button" variant="outline" onClick={google} disabled={loading} className="w-full">
            Continue with Google
          </Button>

          {passkeysSupported() && (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={passkeyLogin}
                disabled={loading}
                className="w-full"
              >
                <KeyRound aria-hidden="true" className="mr-2 h-4 w-4" />
                Sign in with a passkey
              </Button>
              <p className="text-xs text-center text-muted-foreground">
                Add a passkey from Passkeys settings after signing in.
              </p>
            </>
          )}
        </div>

        <p className="text-sm text-center mt-6 text-muted-foreground">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <button
            type="button"
            onClick={() => setMode(mode === "signin" ? "signup" : "signin")}
            className="text-primary hover:underline font-medium"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </button>
        </p>
        </>)}
      </div>
    </div>
  );
};

export default AuthPage;
