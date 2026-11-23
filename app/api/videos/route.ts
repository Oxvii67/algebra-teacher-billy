import { errorResponse, generateJson } from "@/lib/server/ai";
import { rankTopics, VIDEO_TOPICS, type VideoMatch, videosForSlug } from "@/lib/videos";

export const runtime = "nodejs";
export const maxDuration = 30;

interface TopicPick {
  slugs: string[];
  searchQuery: string;
  advice: string;
}

interface YtItem {
  id: { videoId?: string };
  snippet: { title: string; channelTitle: string };
}

async function youtubeSearch(key: string, q: string): Promise<VideoMatch[]> {
  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.search = new URLSearchParams({
    part: "snippet",
    type: "video",
    maxResults: "8",
    safeSearch: "strict",
    videoEmbeddable: "true",
    relevanceLanguage: "en",
    q,
    key,
  }).toString();
  const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) return [];
  const data = (await res.json()) as { items?: YtItem[] };
  return (data.items ?? [])
    .filter((i) => i.id.videoId)
    .map((i) => ({
      id: i.id.videoId!,
      title: decodeEntities(i.snippet.title),
      channel: i.snippet.channelTitle as VideoMatch["channel"],
      topic: "YouTube search",
      topicSlug: "youtube",
    }));
}

function decodeEntities(s: string): string {
  return s.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { query?: string };
    const query = String(body.query ?? "").trim().slice(0, 300);
    if (!query) return Response.json({ error: "Type a topic or paste a problem." }, { status: 400 });

    const slugs = VIDEO_TOPICS.map((t) => t.slug);
    let pick: TopicPick | null = null;
    const gemini = process.env.GEMINI_API_KEY;
    if (gemini) {
      try {
        pick = await generateJson<TopicPick>(gemini, {
          system:
            "You map a math student's request (any course from pre-algebra through AP Calculus BC and AP Statistics) to lesson topics. Choose 1 to 3 slugs from the allowed list, most relevant first, including the foundational skill if the student seems to be missing one. searchQuery is a short YouTube search phrase for the exact skill. advice is one or two direct sentences, no emojis, no apologies, telling the student which video to watch first and why. Use $math$ for any math.",
          contents: [{ text: `Allowed slugs: ${slugs.join(", ")}\nStudent request: ${query}` }],
          schema: {
            type: "object",
            properties: {
              slugs: { type: "array", items: { type: "string", enum: slugs } },
              searchQuery: { type: "string" },
              advice: { type: "string" },
            },
            required: ["slugs", "searchQuery", "advice"],
          },
          temperature: 0.2,
          // Picking a topic needs no long reasoning, and this route stops at 30s (maxDuration).
          thinkingBudget: 0,
          budgetMs: 22_000,
          quick: true,
        });
      } catch {
        pick = null; // keyword ranking below still finds lessons
      }
    }

    const chosen = (pick?.slugs ?? []).filter((s) => slugs.includes(s));
    const fallback = rankTopics(query, 3).map((t) => t.slug);
    const finalSlugs = [...new Set([...chosen, ...fallback])].slice(0, 3);
    const curated = finalSlugs.flatMap(videosForSlug);

    let youtube: VideoMatch[] = [];
    const ytKey = process.env.YOUTUBE_API_KEY;
    if (ytKey) {
      try {
        const seen = new Set(curated.map((v) => v.id));
        youtube = (await youtubeSearch(ytKey, `${pick?.searchQuery || query} algebra lesson`)).filter((v) => !seen.has(v.id));
      } catch {
        youtube = [];
      }
    }

    return Response.json({
      advice: pick?.advice ?? (curated.length ? "Start with the first lesson below, then work the matching problems by hand." : ""),
      topics: finalSlugs,
      curated,
      youtube,
      youtubeEnabled: Boolean(ytKey),
    });
  } catch (err) {
    return errorResponse(err);
  }
}
