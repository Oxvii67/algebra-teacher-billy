"use client";

import { useState } from "react";
import { Play } from "lucide-react";
import { embedUrl, isVideoId } from "@/lib/videos";

/** Click-to-load privacy-enhanced YouTube embed. Nothing loads from YouTube until the student presses play. */
export function VideoEmbed({ id, title, autoLoad = false }: { id: string; title: string; autoLoad?: boolean }) {
  const [on, setOn] = useState(autoLoad);
  if (!isVideoId(id)) return null;
  return (
    <div className="relative aspect-video w-full overflow-hidden rounded-lg border border-line bg-black">
      {on ? (
        <iframe
          src={`${embedUrl(id)}&autoplay=1`}
          title={title}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          referrerPolicy="strict-origin-when-cross-origin"
        />
      ) : (
        <button type="button" onClick={() => setOn(true)} className="group absolute inset-0 h-full w-full" aria-label={`Play ${title}`}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" className="h-full w-full object-cover opacity-80 transition-opacity group-hover:opacity-100" loading="lazy" />
          <span className="absolute inset-0 flex items-center justify-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white">
              <Play className="h-6 w-6 translate-x-0.5" />
            </span>
          </span>
          <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-3 text-left text-sm font-medium text-white">{title}</span>
        </button>
      )}
    </div>
  );
}
