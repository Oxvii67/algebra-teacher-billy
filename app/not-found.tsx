import Link from "next/link";

export const metadata = { title: "Page not found" };

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl py-16 text-center">
      <p className="num text-sm text-muted">404</p>
      <h1 className="page-title mt-2">This page does not exist</h1>
      <p className="mt-3 text-muted">The link is broken or the page moved. Start from a problem instead.</p>
      <div className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/studio" className="btn-primary">
          Solve a problem
        </Link>
        <Link href="/" className="btn-ghost">
          Go to the home page
        </Link>
      </div>
    </div>
  );
}
