import { Suspense } from "react";
import { PageIntro } from "@/components/shell/PageIntro";
import { pageMeta } from "@/lib/pageMeta";
import { StudioView } from "./StudioView";

export const metadata = pageMeta("/studio", "Solve a problem", "Enter any math problem by photo, drawing or keyboard and see every step worked out and checked, from Algebra 1 to AP Calculus.");

export default function StudioPage() {
  return (
    <Suspense fallback={<PageIntro title="Solve a problem" body="One problem at a time. Add a screenshot, draw it, or use the keypad." />}>
      <StudioView />
    </Suspense>
  );
}
