"use client";

import { asRecord, createLive, createSession } from "./store";
import { COURSES, type Course, isVideoId, VIDEO_TOPICS, type VideoMatch } from "@/lib/videos";

export const CHANNELS = ["All", "Khan Academy", "The Organic Chemistry Tutor", "3Blue1Brown"] as const;
export type ChannelFilter = (typeof CHANNELS)[number];

export interface VideosSession {
  query: string;
  /** The search the results below belong to. */
  searched: string;
  advice: string;
  results: VideoMatch[] | null;
  youtube: VideoMatch[];
  playing: VideoMatch | null;
  channel: ChannelFilter;
  topic: string | null;
  course: Course | "all";
  showAll: boolean;
  /** Seconds watched per video id, most recent last. */
  positions: Record<string, number>;
}

const MAX_POSITIONS = 50;

function isVideo(v: unknown): v is VideoMatch {
  const r = asRecord(v);
  return typeof r.id === "string" && isVideoId(r.id) && typeof r.title === "string";
}

const videos = (v: unknown): VideoMatch[] => (Array.isArray(v) ? v.filter(isVideo) : []);

export const videosSession = createSession<VideosSession>({
  name: "videos",
  initial: { query: "", searched: "", advice: "", results: null, youtube: [], playing: null, channel: "All", topic: null, course: "all", showAll: false, positions: {} },
  revive: (raw) => {
    const r = asRecord(raw);
    const str = (v: unknown) => (typeof v === "string" ? v : "");
    return {
      query: str(r.query),
      searched: str(r.searched),
      advice: str(r.advice),
      results: Array.isArray(r.results) ? videos(r.results) : null,
      youtube: videos(r.youtube),
      playing: isVideo(r.playing) ? r.playing : null,
      channel: CHANNELS.find((c) => c === r.channel) ?? "All",
      topic: VIDEO_TOPICS.some((t) => t.slug === r.topic) ? (r.topic as string) : null,
      course: COURSES.find((c) => c.id === r.course)?.id ?? "all",
      showAll: r.showAll === true,
      positions: Object.fromEntries(Object.entries(asRecord(r.positions)).filter((e): e is [string, number] => isVideoId(e[0]) && typeof e[1] === "number" && e[1] > 0)),
    };
  },
  merge: (a, g) => ({ ...g, positions: { ...a.positions, ...g.positions } }),
});

/** Remembers where a video was left. Zero (watched to the end) starts it over next time. */
export function rememberPosition(id: string, seconds: number) {
  videosSession.set((s) => {
    const { [id]: _old, ...rest } = s.positions;
    const entries = Object.entries(rest).slice(-(MAX_POSITIONS - 1));
    return { ...s, positions: Object.fromEntries(seconds > 0 ? [...entries, [id, Math.floor(seconds)]] : entries) };
  });
}

export const videosLive = createLive<{ busy: boolean; error: string | null }>({ busy: false, error: null });
