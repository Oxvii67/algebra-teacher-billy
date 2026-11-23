import { Suspense } from "react";
import { CalculatorPage } from "./CalculatorPage";

export const metadata = { title: "Graphing calculator" };

export default function Page() {
  return (
    <Suspense>
      <CalculatorPage />
    </Suspense>
  );
}
