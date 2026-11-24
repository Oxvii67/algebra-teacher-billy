import { COURSES, type Course, type CuratedVideo, VIDEO_TOPICS, type VideoTopic } from "./videos.data";

export { COURSES, VIDEO_TOPICS };
export type { Course, CuratedVideo, VideoTopic };

export interface VideoMatch extends CuratedVideo {
  topic: string;
  topicSlug: string;
}

function norm(s: string): string {
  return ` ${s.toLowerCase().replace(/[^a-z0-9^{}()\-+ ]+/g, " ").replace(/\s+/g, " ")} `;
}

export function scoreTopic(topic: VideoTopic, query: string): number {
  const q = norm(query);
  let score = 0;
  if (q.includes(norm(topic.name).trim())) score += 10;
  for (const kw of topic.keywords) {
    const k = kw.toLowerCase();
    if (q.includes(k)) score += k.length > 6 ? 4 : 2;
  }
  for (const word of topic.name.toLowerCase().split(/\s+/)) {
    if (word.length > 4 && q.includes(word)) score += 1;
  }
  return score;
}

export function rankTopics(query: string, limit = 3): VideoTopic[] {
  return VIDEO_TOPICS.map((t) => ({ t, s: scoreTopic(t, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.t);
}

/** Best single lesson for a skill. Khan Academy first, then the others. */
export function bestVideoFor(query: string): VideoMatch | null {
  const [topic] = rankTopics(query, 1);
  if (!topic) return null;
  const v = topic.videos.find((x) => x.channel === "Khan Academy") ?? topic.videos[0];
  return v ? { ...v, topic: topic.name, topicSlug: topic.slug } : null;
}

export function videosForSlug(slug: string): VideoMatch[] {
  const t = VIDEO_TOPICS.find((x) => x.slug === slug);
  return t ? t.videos.map((v) => ({ ...v, topic: t.name, topicSlug: t.slug })) : [];
}

export const EMBED_ORIGIN = "https://www.youtube-nocookie.com";

export function embedUrl(id: string): string {
  return `${EMBED_ORIGIN}/embed/${encodeURIComponent(id)}?rel=0&modestbranding=1`;
}

export function isVideoId(id: string): boolean {
  return /^[A-Za-z0-9_-]{11}$/.test(id);
}
