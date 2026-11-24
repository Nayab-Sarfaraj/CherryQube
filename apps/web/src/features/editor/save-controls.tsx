"use client";
import { useEffect, useRef, useState } from "react";
import type { ExportQuality } from "@greetings/shared";
import { BillingPanel } from "../billing/billing-panel";
import { ExportQualityOptions } from "../billing/export-quality";
import { CreatorResultLink } from "../results/creator-result-link";
import { AppSignInButton, useAppAuth } from "@/components/auth/app-auth";
import Link from "next/link";
import type { SaveInput } from "./use-invitations";
import { useExportCreation } from "./use-export-creation";

type Props = {
  input: SaveInput;
  photo?: string;
  initialId?: string;
  invalid: boolean;
  embed?: boolean;
  onExportRequested?: (invitationId: string, renderId: string) => void;
};

function Controls({
  input,
  photo,
  initialId,
  invalid,
  embed,
  onExportRequested,
}: Props) {
  const { isLoaded, isSignedIn } = useAppAuth();
  const paidExportsEnabled =
    process.env.NEXT_PUBLIC_ENABLE_PAID_EXPORTS === "true";
  const [quality, setQuality] = useState<ExportQuality>("free");
  const exportedRenderId = useRef<string | null>(null);

  useEffect(() => {
    if (!paidExportsEnabled) return;
    const timer = setTimeout(() => {
      if (
        new URLSearchParams(window.location.search).get("checkout") ===
        "success"
      )
        setQuality("hd");
    }, 0);
    return () => clearTimeout(timer);
  }, [paidExportsEnabled]);

  const { saveDraft, exportVideo, job, busy, savedId, prepareDraft } =
    useExportCreation(input, photo, initialId, quality);

  useEffect(() => {
    if (
      !embed ||
      !isLoaded ||
      isSignedIn ||
      new URLSearchParams(window.location.search).get("nativeSession") !== "1"
    )
      return;
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "AUTH_EXPIRED" }),
    );
  }, [embed, isLoaded, isSignedIn]);
  useEffect(() => {
    if (
      embed &&
      exportVideo.data &&
      exportedRenderId.current !== exportVideo.data.id
    ) {
      exportedRenderId.current = exportVideo.data.id;
      onExportRequested?.(exportVideo.data.invitationId, exportVideo.data.id);
    }
  }, [embed, exportVideo.data, onExportRequested]);

  function requestNativeAuthentication() {
    localStorage.setItem(
      `draft:${input.templateId}`,
      JSON.stringify({
        fields: { ...input.props, photoUrl: undefined },
        contactMethod: input.hostContact?.method ?? "email",
        contactValue: input.hostContact?.value ?? "",
      }),
    );
    window.ReactNativeWebView?.postMessage(
      JSON.stringify({ type: "REQUEST_AUTH" }),
    );
  }

  if (!isLoaded) return <p role="status">Loading account…</p>;

  if (!isSignedIn && embed)
    return (
      <button
        type="button"
        onClick={requestNativeAuthentication}
        className="rounded-full bg-accent px-6 py-3 font-medium text-white transition hover:opacity-90 focus-visible:outline-4 focus-visible:outline-accent"
      >
        Sign in to save or export
      </button>
    );

  if (!isSignedIn)
    return (
      <AppSignInButton mode="modal">
        <button
          type="button"
          className="rounded-full bg-accent px-6 py-3 font-medium text-white transition hover:opacity-90 focus-visible:outline-4 focus-visible:outline-accent"
        >
          Sign in to save or export
        </button>
      </AppSignInButton>
    );
  return (
    <section aria-label="Save and export" className="mt-6 space-y-3">
      {paidExportsEnabled ? (
        <ExportQualityOptions
          quality={quality}
          onChange={setQuality}
          disabled={busy}
        />
      ) : (
        <p className="text-sm opacity-80">
          Exports are generated in 720p with a watermark.
        </p>
      )}
      <div className="flex flex-wrap gap-3">
        <button
          type="button"
          disabled={invalid || busy}
          onClick={() => saveDraft.mutate()}
          className="rounded-full border px-6 py-3 disabled:opacity-50"
        >
          {saveDraft.isPending ? "Saving…" : "Save draft"}
        </button>
        <button
          type="button"
          disabled={
            invalid ||
            busy ||
            job.data?.status === "submission_uncertain"
          }
          onClick={() => exportVideo.mutate()}
          className="rounded-full bg-accent px-6 py-3 text-white disabled:opacity-50"
        >
          {exportVideo.isPending
            ? "Preparing video…"
            : paidExportsEnabled && quality === "hd"
              ? "Export HD video"
              : "Export video"}
        </button>
        <Link href="/dashboard" className="px-4 py-3 underline">
          Your creations
        </Link>
      </div>
      {saveDraft.isSuccess && <p role="status">Draft saved.</p>}
      {(saveDraft.error || exportVideo.error || job.error) && (
        <p role="alert">
          {(saveDraft.error || exportVideo.error || job.error)?.message}
        </p>
      )}
      {job.data && (
        <div aria-live="polite">
          {job.data.status === "queued" && <p>Your video is queued.</p>}
          {job.data.status === "rendering" && <p>Rendering your video…</p>}
          {job.data.status === "submission_uncertain" && (
            <div role="status" className="space-y-1">
              <p>We could not confirm this export. Do not retry; it is being recovered.</p>
              <p className="text-xs opacity-75">Recovery reference: {job.data.id}</p>
            </div>
          )}
          {job.data.status === "failed" && (
            <p role="alert">{job.data.error} Use Export video to retry.</p>
          )}
          {job.data.status === "ready" && job.data.fileUrl && (
            <>
              <video
                src={job.data.fileUrl}
                poster={job.data.posterUrl}
                controls
                className="max-h-96 w-full"
              />
              <a
                href={`${job.data.fileUrl}?download=1`}
                download
                className="underline"
              >
                Download video
              </a>
              {savedId && (
                <CreatorResultLink key={job.data.id} invitationId={savedId} />
              )}
            </>
          )}
        </div>
      )}
      {paidExportsEnabled && !embed && (
        <BillingPanel prepareDraft={prepareDraft} disabled={invalid || busy} />
      )}
    </section>
  );
}
export function SaveControls(props: Props) {
  return <Controls {...props} />;
}
