import { redirect } from "next/navigation";

/** The history page became the Binder. Old links and bookmarks land there. */
export default function HistoryPage() {
  redirect("/binder");
}
