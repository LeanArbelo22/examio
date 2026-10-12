import { useCallback, useRef } from "react";

interface PendingOperation {
  fingerprint: string;
  key: string;
}

export function useIdempotencyKey() {
  const pendingOperation = useRef<PendingOperation | null>(null);

  const keyFor = useCallback((payload: unknown) => {
    const fingerprint = JSON.stringify(payload);
    if (pendingOperation.current?.fingerprint === fingerprint) {
      return pendingOperation.current.key;
    }

    const key = crypto.randomUUID();
    pendingOperation.current = { fingerprint, key };
    return key;
  }, []);

  const complete = useCallback(() => {
    pendingOperation.current = null;
  }, []);

  return { keyFor, complete };
}
