import { Suspense } from "react";
import { PageIntro } from "@/components/shell/PageIntro";
import { pageMeta } from "@/lib/pageMeta";
import { CalculatorPage } from "./CalculatorPage";

export const metadata = pageMeta("/calculator", "Graphing calculator", "Free graphing calculator with sliders for every constant, marked roots and turning points, tables and PNG export.");

export default function Page() {
  return (
    <Suspense fallback={<PageIntro title="Graphing calculator" body="Type an equation such as y = x^2 - 4. Extra letters become sliders." />}>
      <CalculatorPage />
    </Suspense>
  );
}
