import type { Metadata, Viewport } from "next";
import { Archivo, Atkinson_Hyperlegible_Next } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Notice } from "@/components/shell/Notice";
import { DataProvider } from "@/lib/data/DataProvider";
import { themeBootScript } from "@/lib/themes";

const head = Archivo({ subsets: ["latin"], axes: ["wdth"], variable: "--font-head", display: "swap" });
const body = Atkinson_Hyperlegible_Next({ subsets: ["latin"], variable: "--font-body", display: "swap", adjustFontFallback: false });

export const metadata: Metadata = {
  title: { default: "Algebra Teacher Billy", template: "%s | Algebra Teacher Billy" },
  description: "Algebra Teacher Billy works every Algebra 2 and AP problem line by line, checks the answer by plugging it back in, and shows you the skill to fix first.",
  applicationName: "Algebra Teacher Billy",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={`${head.variable} ${body.variable}`}>
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
