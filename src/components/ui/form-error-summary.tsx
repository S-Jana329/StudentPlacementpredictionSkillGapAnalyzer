import { useEffect, useRef } from "react";
import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export type ErrorSummaryItem = {
  /** id of the input the message belongs to */
  fieldId: string;
  message: string;
};

type Props = {
  items: ErrorSummaryItem[];
  title?: string;
  className?: string;
};

/**
 * Keyboard-friendly error summary. Receives focus when errors appear and links
 * to each invalid field so keyboard and screen reader users can jump straight
 * to the problem.
 */
const FormErrorSummary = ({ items, title = "There is a problem", className }: Props) => {
  const ref = useRef<HTMLDivElement>(null);
  const count = items.length;

  useEffect(() => {
    if (count > 0) ref.current?.focus();
  }, [count]);

  if (count === 0) return null;

  return (
    <div
      ref={ref}
      tabIndex={-1}
      role="alert"
      aria-labelledby="form-error-summary-title"
      className={cn(
        "rounded-md border-2 border-destructive bg-destructive/5 p-3 outline-none focus-visible:ring-2 focus-visible:ring-destructive",
        className,
      )}
    >
      <p id="form-error-summary-title" className="flex items-center gap-2 text-sm font-semibold text-destructive">
        <AlertCircle size={16} aria-hidden="true" />
        {title}
      </p>
      <ul className="mt-2 space-y-1 text-sm">
        {items.map(({ fieldId, message }) => (
          <li key={fieldId}>
            <a
              href={`#${fieldId}`}
              className="text-destructive underline underline-offset-2 hover:no-underline focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-destructive"
              onClick={(event) => {
                event.preventDefault();
                document.getElementById(fieldId)?.focus();
              }}
            >
              {message}
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
};

export { FormErrorSummary };
