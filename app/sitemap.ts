import type { MetadataRoute } from "next";

const SITE_URL = "https://www.algebrateacher.xyz";

const routes: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1, changeFrequency: "weekly" },
  { path: "/studio", priority: 0.9, changeFrequency: "weekly" },
  { path: "/practice-test", priority: 0.8, changeFrequency: "weekly" },
  { path: "/calculator", priority: 0.8, changeFrequency: "monthly" },
  { path: "/videos", priority: 0.7, changeFrequency: "monthly" },
  { path: "/tutor", priority: 0.7, changeFrequency: "monthly" },
  { path: "/drill", priority: 0.6, changeFrequency: "monthly" },
  { path: "/cheat-sheet", priority: 0.6, changeFrequency: "yearly" },
  { path: "/privacy", priority: 0.2, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.2, changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date();
  return routes.map(({ path, priority, changeFrequency }) => ({
    url: path === "/" ? SITE_URL : `${SITE_URL}${path}`,
    lastModified,
    changeFrequency,
    priority,
  }));
}
