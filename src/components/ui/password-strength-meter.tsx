import { useEffect, useState } from "react";
import { Check, X } from "lucide-react";
import { cn } from "@/lib/utils";

export const passwordRequirements = [
  { id: "length", label: "At least 8 characters", test: (value: string) => value.length >= 8 },
  { id: "upper", label: "One uppercase letter", test: (value: string) => /[A-Z]/.test(value) },
  { id: "lower", label: "One lowercase letter", test: (value: string) => /[a-z]/.test(value) },
  { id: "number", label: "One number", test: (value: string) => /\d/.test(value) },
] as const;

const strengthLabels = ["Very weak", "Weak", "Fair", "Good", "Strong"] as const;

export function getPasswordStrength(value: string) {
  const score = passwordRequirements.filter(({ test }) => test(value)).length;
  return {
    score,
    label: strengthLabels[score],
    barClass:
      score >= 4 ? "bg-primary" : score >= 3 ? "bg-primary/80" : score >= 2 ? "bg-secondary" : "bg-destructive",
  };
}

export function isPasswordValid(value: string) {
  return passwordRequirements.every(({ test }) => test(value));
}

type Props = {
  /** Current password value. */
  value: string;
  /** Id used for aria-describedby wiring on the password input. */
  id: string;
  className?: string;
};

/**
 * Accessible password strength meter.
 * - Exposes progress via role="meter" with aria-valuenow/min/max/text.
 * - Announces strength changes politely and debounced, so screen readers are
 *   not flooded on every keystroke.
 * - Each requirement is announced as met / not met rather than by colour alone.
 */
const PasswordStrengthMeter = ({ value, id, className }: Props) => {
  const { score, label, barClass } = getPasswordStrength(value);
  const [announcement, setAnnouncement] = useState("");

  useEffect(() => {
    if (!value) {
      setAnnouncement("");
      return;
    }
    const timeout = window.setTimeout(() => {
      const missing = passwordRequirements.filter(({ test }) => !test(value)).map(({ label }) => label);
      setAnnouncement(
        missing.length
          ? `Password strength: ${label}. Still needed: ${missing.join(", ")}.`
          : `Password strength: ${label}. All requirements met.`,
      );
    }, 600);
    return () => window.clearTimeout(timeout);
  }, [value, label]);

  return (
    <div id={id} className={cn("mt-3 space-y-2", className)}>
      <div className="flex items-center gap-2">
        <div
          role="meter"
          aria-valuemin={0}
          aria-valuemax={passwordRequirements.length}
          aria-valuenow={score}
          aria-valuetext={`${label}: ${score} of ${passwordRequirements.length} requirements met`}
          aria-label="Password strength"
          className="flex flex-1 items-center gap-2"
        >
          {passwordRequirements.map((requirement, index) => (
            <span
              key={requirement.id}
              aria-hidden="true"
              className={cn("h-1.5 flex-1 rounded-full", index < score ? barClass : "bg-muted")}
            />
          ))}
        </div>
        <span className="min-w-24 text-right text-xs font-medium text-muted-foreground">{label}</span>
      </div>

      <ul className="grid grid-cols-1 gap-1 text-xs text-muted-foreground sm:grid-cols-2">
        {passwordRequirements.map(({ id: reqId, label: reqLabel, test }) => {
          const met = test(value);
          return (
            <li key={reqId} className="flex items-center gap-1.5">
              {met ? (
                <Check aria-hidden="true" className="text-primary" size={14} />
              ) : (
                <X aria-hidden="true" className="text-muted-foreground/70" size={14} />
              )}
              <span className={met ? "text-foreground" : undefined}>{reqLabel}</span>
              <span className="sr-only">{met ? "requirement met" : "requirement not met"}</span>
            </li>
          );
        })}
      </ul>

      <p className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </p>
    </div>
  );
};

export { PasswordStrengthMeter };
