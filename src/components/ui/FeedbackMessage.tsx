import type { ReactNode } from "react";

type FeedbackVariant = "error" | "success" | "info" | "warning";

const styles: Record<FeedbackVariant, string> = {
  error: "border-red-200 bg-red-50 text-red-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  warning: "border-amber-200 bg-amber-50 text-amber-900",
};

export function FeedbackMessage({
  message,
  variant = "info",
  action,
}: {
  message: string;
  variant?: FeedbackVariant;
  action?: ReactNode;
}) {
  return (
    <div
      role={variant === "error" ? "alert" : "status"}
      aria-live={variant === "error" ? "assertive" : "polite"}
      className={`flex items-center justify-between gap-3 rounded-xl border p-3 text-sm font-medium ${styles[variant]}`}
    >
      <span>{message}</span>
      {action}
    </div>
  );
}
