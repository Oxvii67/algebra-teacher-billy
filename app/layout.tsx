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

const SITE_URL = "https://www.algebrateacher.xyz";
const SITE_TITLE = "Algebra Teacher Billy — Free Step-by-Step AI Math Tutor & Practice Tests";
const SITE_DESCRIPTION =
  "Algebra Teacher Billy is a free AI math tutor for Algebra 1, Algebra 2, Precalculus, and AP students. Enter any problem to get every step worked out and verified, build auto-graded practice tests, graph functions with sliders, and find the right video lesson for the skill you need to fix first.";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: { default: SITE_TITLE, template: "%s | Algebra Teacher Billy" },
  description: SITE_DESCRIPTION,
  applicationName: "Algebra Teacher Billy",
  keywords: [
    "algebra tutor",
    "AI math tutor",
    "step-by-step math solver",
    "Algebra 2 help",
    "AP math",
    "practice tests",
    "graphing calculator",
    "free math help",
  ],
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    url: SITE_URL,
    siteName: "Algebra Teacher Billy",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
  robots: { index: true, follow: true },
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
