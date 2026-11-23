import { Suspense } from "react";
import { VideosView } from "./VideosView";

export const metadata = { title: "Video Finder" };

export default function Page() {
  return (
    <Suspense>
      <VideosView />
    </Suspense>
  );
}
