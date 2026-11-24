import { Suspense } from "react";
import { PageIntro } from "@/components/shell/PageIntro";
import { pageMeta } from "@/lib/pageMeta";
import { LoginForm } from "./LoginForm";

export const metadata = pageMeta("/login", "Sign in", "Sign in to sync your saved problems, practice tests and progress across devices.", { index: false });

export default function LoginPage() {
  return (
    <Suspense fallback={<PageIntro title="Sign in" body="Sync your saved work across devices." />}>
      <LoginForm />
    </Suspense>
  );
}
