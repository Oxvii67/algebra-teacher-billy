import { LoaderCircle } from "lucide-react";

/** Heading and summary sent with the page itself, so it reads correctly before any script has run. */
export function PageIntro({ title, body }: { title: string; body: string }) {
  return (
    <div className="space-y-6">
      <header>
        <h1 className="page-title">{title}</h1>
        <p className="mt-2 text-muted">{body}</p>
      </header>
      <p className="flex items-center gap-2 text-sm text-muted" role="status">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden="true" /> Loading
      </p>
      <noscript>
        <p>This tool needs JavaScript. Turn it on in your browser settings and reload the page.</p>
      </noscript>
    </div>
  );
}
