"use client";

import { useEffect } from "react";
import { useAuth } from "@clerk/nextjs";

export function MobileAuthRequired() {
  const { isLoaded, userId } = useAuth();

  useEffect(() => {
    if (!isLoaded) return;
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "WEB_AUTH_STATUS", userId: userId ?? null }),
    );
  }, [isLoaded, userId]);

  return (
    <main className="flex min-h-dvh items-center justify-center px-6 text-center">
      <p role="status">Loading your account…</p>
    </main>
  );
}
