import { Check } from "lucide-react";

/** Says where work on this page is kept, next to the work itself. */
export function SavedNote({ children }: { children: React.ReactNode }) {
  return (
    <p className="flex items-center gap-1.5 text-[13px] text-muted">
      <Check className="h-3.5 w-3.5 shrink-0 text-success" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}
