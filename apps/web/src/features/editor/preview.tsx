"use client";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { Player, type PlayerRef } from "@remotion/player";
import {
  GreetingComposition,
  durationInFrames,
  getTemplate,
  type VideoProps,
} from "@greetings/remotion";
import { FPS, VIDEO_SIZE } from "@greetings/shared";

const emptySubscribe = () => () => {};
function subscribeReducedMotion(callback: () => void) {
  const query = window.matchMedia("(prefers-reduced-motion: reduce)");
  query.addEventListener("change", callback);
  return () => query.removeEventListener("change", callback);
}

export default function Preview({
  templateId,
  props,
}: {
  templateId: string;
  props: VideoProps;
}) {
  const template = getTemplate(templateId)!;
  const player = useRef<PlayerRef>(null);
  const [muted, setMuted] = useState(true);

  const isMounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );

  const reducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    () => window.matchMedia("(prefers-reduced-motion: reduce)").matches,
    () => false,
  );

  const [playing, setPlaying] = useState(true);

  useEffect(() => {
    const p = player.current;
    if (!p) return;
    const onPlay = () => setPlaying(true);
    const onPause = () => setPlaying(false);
    p.addEventListener("play", onPlay);
    p.addEventListener("pause", onPause);
    return () => {
      p.removeEventListener("play", onPlay);
      p.removeEventListener("pause", onPause);
    };
  }, []);

  if (!isMounted) {
    return (
      <div
        className="aspect-[9/16] w-full rounded-2xl bg-ink/10 animate-pulse flex items-center justify-center text-sm text-ink/60"
        aria-hidden="true"
      />
    );
  }

  return (
    <div>
      <Player
        ref={player}
        component={GreetingComposition}
        inputProps={props}
        durationInFrames={durationInFrames(template)}
        fps={FPS}
        compositionWidth={VIDEO_SIZE.width}
        compositionHeight={VIDEO_SIZE.height}
        initialFrame={Math.min(30, durationInFrames(template) - 1)}
        autoPlay={!reducedMotion}
        loop={!reducedMotion}
        initiallyMuted
        acknowledgeRemotionLicense
        style={{ width: "100%", aspectRatio: "9 / 16" }}
      />
      <div className="mt-3 flex gap-3">
        <button
          type="button"
          onClick={() => {
            if (playing) player.current?.pause();
            else player.current?.play();
            setPlaying(!playing);
          }}
          className="rounded-full border border-ink px-5 py-2"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={() => player.current?.seekTo(0)}
          className="rounded-full border border-ink px-5 py-2"
        >
          Restart
        </button>
        <button
          type="button"
          onClick={() => {
            if (muted) player.current?.unmute();
            else player.current?.mute();
            setMuted(!muted);
          }}
          className="rounded-full border border-ink px-5 py-2"
        >
          Sound
        </button>
      </div>
    </div>
  );
}
