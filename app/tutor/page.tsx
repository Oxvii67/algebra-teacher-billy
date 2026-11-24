import { Suspense } from "react";
import { PageIntro } from "@/components/shell/PageIntro";
import { pageMeta } from "@/lib/pageMeta";
import { TutorView } from "./TutorView";

export const metadata = pageMeta("/tutor", "Ask Billy", "Ask any math question and get a full step-by-step answer. Argue with a right answer and Billy shows you why it holds.");

export default function Page() {
  return (
    <Suspense fallback={<PageIntro title="Ask Billy" body="Ask any math question. Argue with a right answer and he will show you exactly where you are wrong." />}>
      <TutorView />
    </Suspense>
  );
}
