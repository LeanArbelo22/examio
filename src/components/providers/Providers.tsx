"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { useState } from "react";
import { SessionExpiredModal } from "./SessionExpiredModal";
import { ApiError } from "@/lib/api";

const SESSION_ERROR_CODES = new Set([
  "REFRESH_CONFLICT",
  "REFRESH_TOKEN_INVALID",
  "REFRESH_TOKEN_EXPIRED",
  "REFRESH_TOKEN_REVOKED",
  "REFRESH_TOKEN_REUSED",
  "SESSION_REVOKED",
  "SESSION_UNAVAILABLE",
  "USER_INACTIVE",
  "RATE_LIMITED",
  "AUTH_INFRASTRUCTURE_ERROR",
]);

function notifySessionProblem(error: unknown) {
  if (
    error instanceof ApiError &&
    error.code &&
    SESSION_ERROR_CODES.has(error.code)
  ) {
    window.dispatchEvent(
      new CustomEvent("EXAMIO_SESSION_PROBLEM", {
        detail: { code: error.code },
      }),
    );
  }
}

export function Providers({ children }: { children: React.ReactNode }) {
  // TODO: Remover en producción - Bypass para desarrollo local
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    console.warn("DEV BYPASS AUTH ACTIVE: No requiere sesión real.");
  }

  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: notifySessionProblem,
    }),
    mutationCache: new MutationCache({
      onError: notifySessionProblem,
    }),
    defaultOptions: {
      queries: {
        retry: false,
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider refetchInterval={5 * 60} refetchOnWindowFocus>
        {children}
        <SessionExpiredModal />
      </SessionProvider>
    </QueryClientProvider>
  );
}
