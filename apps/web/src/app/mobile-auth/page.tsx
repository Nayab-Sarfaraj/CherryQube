"use client";

import { useAuth, useClerk } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useMemo, useRef, useState } from "react";
import { safeMobileReturnPath } from "./return-path";

declare global {
  interface Window {
    ReactNativeWebView?: { postMessage(message: string): void };
  }
}

function nativeMessage(type: "REQUEST_AUTH") {
  window.ReactNativeWebView?.postMessage(JSON.stringify({ type }));
}

function MobileAuthContent() {
  const { isLoaded, isSignedIn } = useAuth();
  const { client, setActive } = useClerk();
  const params = useSearchParams();
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

  const redemptionStarted = useRef(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!ticket || !client || !setActive) return;
    if (redemptionStarted.current) return;
    redemptionStarted.current = true;

    void (async () => {
      try {
        if (isSignedIn) await setActive({ session: null });
        const result = await client.signIn.create({
          strategy: "ticket",
          ticket,
        });
        if (!result.createdSessionId) throw new Error("Ticket not accepted");
        await setActive({ session: result.createdSessionId });
        window.location.replace(target);
      } catch {
        setError("This sign-in link expired. Return to the app and try again.");
      }
    })();
  }, [client, isLoaded, isSignedIn, setActive, target, ticket]);

  const displayError =
    error ||
    (isLoaded && !ticket
      ? "This sign-in link expired. Return to the app and try again."
      : "");

  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-6 text-center">
      <div>
        <h1 className="font-display text-3xl">Signing you in…</h1>
        <p className="mt-3">You can return to the app in a moment.</p>
        {displayError && (
          <div className="mt-4 space-y-3">
            <p role="alert" className="text-red-800">
              {displayError}
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

function MobileAuthFallback() {
  return (
    <main className="mx-auto flex min-h-dvh max-w-md items-center px-6 text-center">
      <div>
        <h1 className="font-display text-3xl">Signing you in…</h1>
        <p className="mt-3">You can return to the app in a moment.</p>
      </div>
    </main>
  );
}

export default function MobileAuthPage() {
  return (
    <Suspense fallback={<MobileAuthFallback />}>
      <MobileAuthContent />
    </Suspense>
  );
}

export const dynamic = "force-dynamic";
