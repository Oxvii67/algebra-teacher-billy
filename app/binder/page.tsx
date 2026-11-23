import { HistoryView } from "@/app/history/HistoryView";

export const metadata = { title: "Binder", alternates: { canonical: "/binder" } };

export default function BinderPage() {
  return <HistoryView />;
}
