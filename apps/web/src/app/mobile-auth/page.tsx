"use client";

import { useSignIn } from "@clerk/nextjs/legacy";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { safeMobileReturnPath } from "./return-path";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

function nativeMessage(type: "AUTH_HANDOFF_COMPLETE" | "REQUEST_AUTH") {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type }));
}

export default function MobileAuthPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const params = useSearchParams();
  const router = useRouter();
  const [error, setError] = useState("");
  const ticket = params.get("ticket");
  const returnPath = useMemo(
    () => safeMobileReturnPath(params.get("returnTo")),
    [params],
  );
  const target = useMemo(() => {
    const url = new URL(returnPath, "https://cherryqube.invalid");
    url.searchParams.set("embed", "1");
    url.searchParams.set("nativeSession", "1");
    return `${url.pathname}${url.search}${url.hash}`;
  }, [returnPath]);

  useEffect(() => {
    if (!ticket || !isLoaded || !signIn || !setActive) return;
    window.history.replaceState(null, "", target);
    let cancelled = false;
    void (async () => {
      try {
        const result = await signIn.create({ strategy: "ticket", ticket });
        if (!result.createdSessionId) throw new Error("Ticket not accepted");
        await setActive({ session: result.createdSessionId });
        if (!cancelled) {
          nativeMessage("AUTH_HANDOFF_COMPLETE");
          router.replace(target);
        }
      } catch {
        if (!cancelled)
          setError(
            "This sign-in link expired. Return to the app and try again.",
          );
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isLoaded, router, setActive, signIn, target, ticket]);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-6 text-center">
      <div>
        <h1 className="font-display text-3xl">Signing you in…</h1>
        <p className="mt-3">You can return to the app in a moment.</p>
        {error && (
          <div className="mt-4 space-y-3">
            <p role="alert" className="text-red-800">
              {error}
            </p>
            <button
              type="button"
              className="rounded-full bg-accent px-5 py-2 font-medium text-white"
              onClick={() => nativeMessage("REQUEST_AUTH")}
            >
              Retry in the app
            </button>
          </div>
        )}
      </div>
    </main>
  );
}

export const dynamic = "force-dynamic";
