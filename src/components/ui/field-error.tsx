import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

type FieldErrorProps = {
  /** Error text. When empty/undefined nothing renders. */
  children?: string | null;
  id?: string;
  className?: string;
};

/** Inline, screen-reader announced validation message shown under a form field. */
const FieldError = ({ children, id, className }: FieldErrorProps) => {
  if (!children) return null;
  return (
    <p
      id={id}
      role="alert"
      className={cn(
        "mt-1.5 flex items-start gap-1.5 text-sm md:text-xs font-body text-destructive",
        className,
      )}
    >
      <AlertCircle size={14} className="mt-0.5 shrink-0" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
};

export { FieldError };
