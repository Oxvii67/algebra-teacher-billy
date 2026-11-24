import { Suspense } from "react";
import { PageIntro } from "@/components/shell/PageIntro";
import { pageMeta } from "@/lib/pageMeta";
import { SavedView } from "./SavedView";

export const metadata = pageMeta("/history/view", "Saved solution", "A saved worked solution.", { index: false });

export default function Page() {
  return (
    <Suspense fallback={<PageIntro title="Saved solution" body="Opening your saved work." />}>
      <SavedView />
    </Suspense>
  );
}
