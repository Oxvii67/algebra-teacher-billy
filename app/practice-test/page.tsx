import { Suspense } from "react";
import { PracticeTestView } from "./PracticeTestView";

export const metadata = { title: "Practice Test" };

export default function Page() {
  return (
    <Suspense>
      <PracticeTestView />
    </Suspense>
  );
}
