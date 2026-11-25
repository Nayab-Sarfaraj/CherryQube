"use client";

import { useCallback, useRef, useState } from "react";

type Props = {
  src: string;
  poster?: string;
  title: string;
};

export function PublicVideo({ src, poster, title }: Props) {
  const video = useRef<HTMLVideoElement>(null);
  const [muted, setMuted] = useState(true);
  const [playing, setPlaying] = useState(true);
  const enableSound = useCallback(() => setMuted(false), []);
  const togglePlayback = useCallback(() => {
    if (video.current?.paused) void video.current.play();
    else video.current?.pause();
  }, []);
  const restart = useCallback(() => {
    if (!video.current) return;
    video.current.currentTime = 0;
    void video.current.play();
  }, []);

  return (
    <div className="relative">
      <video
        key={src}
        ref={video}
        src={src}
        poster={poster}
        autoPlay
        loop
        muted={muted}
        playsInline
        preload="metadata"
        aria-label={
          muted ? `${title}. Tap to turn on sound.` : `${title}. Sound is on.`
        }
        className="block aspect-[9/16] w-full cursor-pointer rounded-2xl bg-ink object-contain focus-visible:outline-4 focus-visible:outline-accent"
        onClick={enableSound}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            enableSound();
          }
        }}
        onPause={() => setPlaying(false)}
        onPlay={() => setPlaying(true)}
        role="button"
        tabIndex={0}
      />
      <div className="absolute bottom-3 left-3 flex gap-2">
        <button
          type="button"
          onClick={togglePlayback}
          className="rounded-full bg-paper/95 px-4 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur focus-visible:outline-4 focus-visible:outline-accent"
        >
          {playing ? "Pause" : "Play"}
        </button>
        <button
          type="button"
          onClick={restart}
          className="rounded-full bg-paper/95 px-4 py-2 text-sm font-medium text-ink shadow-sm backdrop-blur focus-visible:outline-4 focus-visible:outline-accent"
        >
          Restart
        </button>
      </div>
    </div>
  );
}
