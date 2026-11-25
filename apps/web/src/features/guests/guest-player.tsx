"use client";
import dynamic from "next/dynamic";
import { Component, type ReactNode } from "react";
import type { VideoProps } from "@greetings/remotion/schema";
const Preview = dynamic(() => import("../editor/preview"), {
  ssr: false,
  loading: () => (
    <div
      className="aspect-[9/16] w-full rounded-2xl bg-ink/10 animate-pulse flex items-center justify-center text-sm text-ink/60"
      aria-hidden="true"
    />
  ),
});

function Fallback({
  videoUrl,
  posterUrl,
}: {
  videoUrl?: string;
  posterUrl?: string;
}) {
  return videoUrl ? (
    <video
      src={videoUrl}
      poster={posterUrl}
      controls
      autoPlay
      muted
      playsInline
      className="mx-auto max-h-[75vh] w-full rounded-xl bg-ink"
    />
  ) : (
    <div role="alert" className="rounded-xl border border-ink/20 p-8">
      The live invitation could not be opened. Please ask the host for the
      shared invitation video.
    </div>
  );
}

class PlayerBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

export function GuestPlayer({
  templateId,
  props,
  videoUrl,
  posterUrl,
}: {
  templateId: string;
  props: VideoProps;
  videoUrl?: string;
  posterUrl?: string;
}) {
  return (
    <PlayerBoundary
      fallback={<Fallback videoUrl={videoUrl} posterUrl={posterUrl} />}
    >
      <Preview templateId={templateId} props={props} />
    </PlayerBoundary>
  );
}
