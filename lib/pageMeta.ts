import type { Metadata } from "next";
import { SITE_NAME } from "@/lib/site";

/** Each page names itself as canonical. Without this, pages inherit the home page's and drop out of search. */
export function pageMeta(path: string, title: string, description: string, opts: { index?: boolean } = {}): Metadata {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: { type: "website", siteName: SITE_NAME, locale: "en_US", url: path, title, description },
    ...(opts.index === false ? { robots: { index: false, follow: true } } : {}),
  };
}
