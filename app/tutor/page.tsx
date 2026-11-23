import { Suspense } from "react";
import { TutorView } from "./TutorView";

export const metadata = { title: "Ask Billy" };

export default function Page() {
  return (
    <Suspense>
      <TutorView />
    </Suspense>
  );
}
