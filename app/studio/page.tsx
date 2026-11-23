import { Suspense } from "react";
import { StudioView } from "./StudioView";

export const metadata = { title: "Solve a problem" };

export default function StudioPage() {
  return (
    <Suspense>
      <StudioView />
    </Suspense>
  );
}
