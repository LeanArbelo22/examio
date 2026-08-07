import { Button } from "./Button";
import { FeedbackMessage } from "./FeedbackMessage";
import { getUserErrorMessage, isRetryableError } from "@/lib/errors";

export function RequestErrorState({
  error,
  fallback,
  onRetry,
  showRetry = false,
}: {
  error: unknown;
  fallback?: string;
  onRetry?: () => void;
  showRetry?: boolean;
}) {
  const canRetry = Boolean(onRetry && (showRetry || isRetryableError(error)));

  return (
    <FeedbackMessage
      variant="error"
      message={getUserErrorMessage(error, fallback)}
      action={
        canRetry ? (
          <Button
            type="button"
            onClick={onRetry}
            className="shrink-0 rounded-lg bg-red-700 px-3 py-1.5 text-xs font-bold text-white"
          >
            Reintentar
          </Button>
        ) : undefined
      }
    />
  );
}
