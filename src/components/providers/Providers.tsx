"use client";

import { SessionProvider } from "next-auth/react";
import { QueryClient, QueryClientProvider, QueryCache, MutationCache } from "@tanstack/react-query";
import { useState } from "react";
import { SessionExpiredModal } from "./SessionExpiredModal";

export function Providers({ children }: { children: React.ReactNode }) {
  // TODO: Remover en producción - Bypass para desarrollo local
  if (process.env.NODE_ENV === "development" && process.env.NEXT_PUBLIC_DEV_BYPASS_AUTH === "true") {
    console.warn("DEV BYPASS AUTH ACTIVE: No requiere sesión real.");
  }

  const [queryClient] = useState(() => new QueryClient({
    queryCache: new QueryCache({
      onError: (error: any) => {
        if (error?.status === 401 || error?.message?.includes("401")) {
          window.dispatchEvent(new CustomEvent("EXAMIO_SESSION_EXPIRED"));
        }
      }
    }),
    mutationCache: new MutationCache({
      onError: (error: any) => {
        if (error?.status === 401 || error?.message?.includes("401")) {
          window.dispatchEvent(new CustomEvent("EXAMIO_SESSION_EXPIRED"));
        }
      }
    }),
    defaultOptions: {
      queries: {
        retry: false,
      }
    }
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        {children}
        <SessionExpiredModal />
      </SessionProvider>
    </QueryClientProvider>
  );
}