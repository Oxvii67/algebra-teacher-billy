import { Suspense } from "react";
import { PageIntro } from "@/components/shell/PageIntro";
import { pageMeta } from "@/lib/pageMeta";
import { VideosView } from "./VideosView";

export const metadata = pageMeta("/videos", "Lesson videos", "Find the right math video lesson for the skill you are missing, across 72 topics.");

export default function Page() {
  return (
    <Suspense fallback={<PageIntro title="Lesson videos" body="Find the lesson for the skill you are missing." />}>
      <VideosView />
    </Suspense>
  );
}
