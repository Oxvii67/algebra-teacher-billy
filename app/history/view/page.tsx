import { Suspense } from "react";
import { SavedView } from "./SavedView";

export const metadata = { title: "Saved Solution" };

export default function Page() {
  return (
    <Suspense>
      <SavedView />
    </Suspense>
  );
}
