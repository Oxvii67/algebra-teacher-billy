"use client";

import { useEffect, useRef, useState } from "react";
import { Play } from "lucide-react";
import { EMBED_ORIGIN, embedUrl, isVideoId } from "@/lib/videos";

const SAVE_EVERY_S = 5;
/** Closer to the end than this counts as finished. */
const END_MARGIN_S = 10;

export function clock(s: number): string {
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(Math.floor(s % 60)).padStart(2, "0");
  return h ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

/** Click-to-load privacy-enhanced YouTube embed. Nothing loads from YouTube until the student presses play. */
export function VideoEmbed({
  id,
  title,
  autoLoad = false,
  startAt = 0,
  onPosition,
}: {
  id: string;
  title: string;
  autoLoad?: boolean;
  /** Seconds to resume from, read once when the player opens. */
  startAt?: number;
  /** Reports where the student is, and 0 once the video is finished. */
  onPosition?: (seconds: number) => void;
}) {
  const [on, setOn] = useState(autoLoad);
  const [start] = useState(() => Math.max(0, Math.floor(startAt)));
  const frame = useRef<HTMLIFrameElement>(null);
  const report = useRef(onPosition);
  report.current = onPosition;
  const track = !!onPosition;

  useEffect(() => {
    if (!on || !track) return;
    let saved = start;
    let latest = start;
    const onMessage = (e: MessageEvent) => {
      if (e.origin !== EMBED_ORIGIN || e.source !== frame.current?.contentWindow || typeof e.data !== "string") return;
      try {
        const { info } = JSON.parse(e.data) as { info?: { currentTime?: number; duration?: number } | null };
        if (typeof info?.currentTime !== "number") return;
        const done = !!info.duration && info.duration - info.currentTime < END_MARGIN_S;
        // The player reports 0 before it has seeked to the resume point.
        if (info.currentTime === 0 && latest > 0) return;
        latest = done ? 0 : info.currentTime;
        if (Math.abs(latest - saved) < SAVE_EVERY_S) return;
        saved = latest;
        report.current?.(latest);
      } catch {
        /* not a player message */
      }
    };
    window.addEventListener("message", onMessage);
    return () => {
      window.removeEventListener("message", onMessage);
      if (latest !== saved) report.current?.(latest);
    };
  }, [on, track, start]);

  if (!isVideoId(id)) return null;
  const src = `${embedUrl(id)}&autoplay=1${start ? `&start=${start}` : ""}${track ? "&enablejsapi=1" : ""}`;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-black">
      {on ? (
        <iframe
          ref={frame}
          src={src}
          title={title}
          // Asks the player to report its position.
          onLoad={track ? () => frame.current?.contentWindow?.postMessage(JSON.stringify({ event: "listening", id, channel: "widget" }), EMBED_ORIGIN) : undefined}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" onClick={() => setOn(true)} className="group absolute inset-0 h-full w-full" aria-label={start ? `Resume ${title} at ${clock(start)}` : `Play ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" loading="lazy" />
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white">
              <Play className="h-6 w-6 translate-x-0.5" />
            </span>
            {start > 0 && <span className="num rounded bg-black/75 px-2 py-0.5 text-xs text-white">Resume at {clock(start)}</span>}
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-sm font-medium text-white">{title}</span>
        </button>
      )}
    </div>
  );
}
