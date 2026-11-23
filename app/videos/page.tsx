import { Suspense } from "react";
import { VideosView } from "./VideosView";

export const metadata = { title: "Lesson videos" };

export default function Page() {
  return (
    <Suspense>
      <VideosView />
    </Suspense>
  );
}
