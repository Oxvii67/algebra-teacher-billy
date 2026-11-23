"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Play, Search } from "lucide-react";
import { MathText } from "@/components/math/Math";
import { VideoEmbed } from "@/components/video/VideoEmbed";
import { VIDEO_TOPICS, type VideoMatch, videosForSlug } from "@/lib/videos";

const CHANNELS = ["All", "Khan Academy", "The Organic Chemistry Tutor", "3Blue1Brown"] as const;

export function VideosView() {
  const params = useSearchParams();
  const [query, setQuery] = useState(params.get("q") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [advice, setAdvice] = useState("");
  const [results, setResults] = useState<VideoMatch[] | null>(null);
  const [youtube, setYoutube] = useState<VideoMatch[]>([]);
  const [playing, setPlaying] = useState<VideoMatch | null>(null);
  const [channel, setChannel] = useState<(typeof CHANNELS)[number]>("All");
  const [topic, setTopic] = useState<string | null>(null);

  const search = async (q: string) => {
    const text = q.trim();
    if (!text) return;
    setBusy(true);
    setError(null);
    setTopic(null);
    try {
      const res = await fetch("/api/videos", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ query: text }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Search failed.");
      setAdvice(data.advice);
      setResults(data.curated);
      setYoutube(data.youtube ?? []);
      setPlaying(data.curated[0] ?? data.youtube?.[0] ?? null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  useEffect(() => {
    const q = params.get("q");
    if (q) void search(q);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const browse = useMemo(() => (topic ? videosForSlug(topic) : null), [topic]);
  const list = (browse ?? results ?? []).filter((v) => channel === "All" || v.channel === channel);

  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">Lesson videos</h1>
        <p className="mt-1 text-muted">Name the skill you are stuck on, or paste the problem. Billy points you to the lesson to watch first.</p>
      </header>

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          void search(query);
        }}
      >
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted" />
          <input
            className="input pl-9"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="e.g. why do I get extraneous solutions with logs"
            maxLength={300}
          />
        </div>
        <button className="btn-primary" disabled={busy || !query.trim()}>
          {busy ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />} Find
        </button>
      </form>
      {error && <p className="text-sm text-danger">{error}</p>}

      {playing && (
        <section className="grid gap-4 lg:grid-cols-[1fr_320px]">
          <div>
            <VideoEmbed key={playing.id} id={playing.id} title={playing.title} autoLoad />
            <div className="mt-2">
              <div className="font-semibold">{playing.title}</div>
              <div className="text-sm text-muted">
                {playing.channel} - {playing.topic}
              </div>
            </div>
          </div>
          {advice && !topic && (
            <div className="card h-fit p-4">
              <div className="label mb-1">Billy&apos;s note</div>
              <MathText text={advice} className="text-sm" />
            </div>
          )}
        </section>
      )}

      {(results || browse) && (
        <section className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="mr-2 font-semibold">{browse ? VIDEO_TOPICS.find((t) => t.slug === topic)?.name : "Matching lessons"}</h2>
            {CHANNELS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setChannel(c)}
                className={`rounded-full border px-3 py-1 text-xs ${channel === c ? "border-accent bg-accent text-accent-fg" : "border-line hover:bg-surface-2"}`}
              >
                {c}
              </button>
            ))}
          </div>
          {list.length === 0 ? (
            <p className="text-sm text-muted">No curated lesson matches that yet. Try naming the skill, such as &quot;factoring trinomials&quot;.</p>
          ) : (
            <VideoGrid videos={list} playing={playing} onPlay={setPlaying} />
          )}
          {youtube.length > 0 && !browse && (
            <>
              <h3 className="pt-2 font-semibold">More from YouTube</h3>
              <VideoGrid videos={youtube} playing={playing} onPlay={setPlaying} />
            </>
          )}
        </section>
      )}

      <section className="space-y-3">
        <h2 className="font-semibold">Browse by topic</h2>
        <div className="flex flex-wrap gap-2">
          {VIDEO_TOPICS.map((t) => (
            <button
              key={t.slug}
              type="button"
              onClick={() => {
                setTopic(t.slug);
                const v = videosForSlug(t.slug);
                setPlaying(v[0] ?? null);
              }}
              className={`rounded-lg border px-3 py-1.5 text-sm ${topic === t.slug ? "border-accent bg-surface-2" : "border-line hover:bg-surface-2"}`}
            >
              {t.name}
            </button>
          ))}
        </div>
      </section>
    </div>
  );
}

function VideoGrid({ videos, playing, onPlay }: { videos: VideoMatch[]; playing: VideoMatch | null; onPlay: (v: VideoMatch) => void }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {videos.map((v) => (
        <button
          key={v.id}
          type="button"
          onClick={() => {
            onPlay(v);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
          className={`card overflow-hidden text-left transition-colors hover:border-accent ${playing?.id === v.id ? "border-accent ring-2 ring-accent/40" : ""}`}
        >
          <div className="relative aspect-video bg-black">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://i.ytimg.com/vi/${v.id}/mqdefault.jpg`} alt="" className="h-full w-full object-cover" loading="lazy" />
            <span className="absolute bottom-1.5 right-1.5 rounded bg-black/75 p-1 text-white">
              <Play className="h-3.5 w-3.5" />
            </span>
          </div>
          <div className="p-2.5">
            <div className="line-clamp-2 text-sm font-medium">{v.title}</div>
            <div className="mt-0.5 text-xs text-muted">{v.channel}</div>
          </div>
        </button>
      ))}
    </div>
  );
}
