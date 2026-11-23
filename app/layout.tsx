import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Plus_Jakarta_Sans } from "next/font/google";
import "katex/dist/katex.min.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/shell/AppShell";
import { Notice } from "@/components/shell/Notice";
import { DataProvider } from "@/lib/data/DataProvider";
import { themeBootScript } from "@/lib/themes";
import { SITE_URL } from "@/lib/site";

const head = Plus_Jakarta_Sans({ subsets: ["latin"], variable: "--font-head", display: "swap" });
const body = Inter({ subsets: ["latin"], variable: "--font-body", display: "swap" });
const code = JetBrains_Mono({ subsets: ["latin"], variable: "--font-code", display: "swap" });

const SITE_TITLE = "Algebra Teacher Billy: Free Step-by-Step Math Tutor, Algebra 1 to AP Calculus";
const SITE_DESCRIPTION =
  "Algebra Teacher Billy is a free AI math tutor for every course from pre-algebra through AP Precalculus, AP Calculus AB and BC, and AP Statistics. Enter any problem to get every step worked out and verified, build auto-graded practice tests, graph functions with sliders, and find the right video lesson for the skill you need to fix first.";

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
    "AP Precalculus help",
    "AP Calculus tutor",
    "AP Statistics help",
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
    <html lang="en" suppressHydrationWarning className={`${head.variable} ${body.variable} ${code.variable}`}>
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
