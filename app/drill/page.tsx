import { pageMeta } from "@/lib/pageMeta";
import { DrillView } from "./DrillView";

export const metadata = pageMeta("/drill", "Spot the mistake", "One worked math problem, one wrong line, 60 seconds to find it.");

export default function Page() {
  return <DrillView />;
}
