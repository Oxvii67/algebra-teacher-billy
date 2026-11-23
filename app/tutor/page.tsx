import { Suspense } from "react";
import { TutorView } from "./TutorView";

export const metadata = { title: "Teacher Chat" };

export default function Page() {
  return (
    <Suspense>
      <TutorView />
    </Suspense>
  );
}
