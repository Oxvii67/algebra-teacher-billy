import type { Metadata, Viewport } from "next";
import "./globals.css";
import "katex/dist/katex.min.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Notice } from "@/components/shell/Notice";
import { DataProvider } from "@/lib/data/DataProvider";
import { themeBootScript } from "@/lib/themes";

export const metadata: Metadata = {
  title: { default: "Algebra Teacher AI", template: "%s | Algebra Teacher AI" },
  description: "A strict, step-by-step Algebra 2 and AP math teacher with verified solutions.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript() }} />
      </head>
      <body>
        <ThemeProvider>
          <DataProvider>
            <AppShell>{children}</AppShell>
            <Notice />
          </DataProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
