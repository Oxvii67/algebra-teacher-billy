import { pageMeta } from "@/lib/pageMeta";
import { HistoryView } from "@/app/history/HistoryView";

export const metadata = pageMeta("/binder", "Binder", "Your saved problems, folders and practice tests.", { index: false });

export default function BinderPage() {
  return <HistoryView />;
}
