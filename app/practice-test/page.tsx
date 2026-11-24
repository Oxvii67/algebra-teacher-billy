import { Suspense } from "react";
import { PageIntro } from "@/components/shell/PageIntro";
import { pageMeta } from "@/lib/pageMeta";
import { PracticeTestView } from "./PracticeTestView";

export const metadata = pageMeta("/practice-test", "Practice test", "Describe a test or paste your homework and get a graded practice test on the same skills, with worked solutions.");

export default function Page() {
  return (
    <Suspense fallback={<PageIntro title="Practice test" body="Tell Billy what to test you on, paste up to 10 homework problems, or both." />}>
      <PracticeTestView />
    </Suspense>
  );
}
