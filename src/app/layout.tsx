import type { Metadata } from "next";
import { Geist, Instrument_Serif } from "next/font/google";
import { preloaderDecisionScript } from "@/components/preloader/Preloader";
import { site } from "@/lib/site";
import { themeScript } from "@/lib/theme";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const instrumentSerif = Instrument_Serif({
  variable: "--font-instrument-serif",
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
});

export const metadata: Metadata = {
  title: { default: `${site.name} — ${site.tagline}`, template: `%s · ${site.name}` },
  description: "Cafés, restaurants, boutiques and hidden gems across Nepal, handpicked and photographed.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    // suppressHydrationWarning: the inline scripts set data-theme / a class before hydration
    <html lang="en" suppressHydrationWarning className={`${geistSans.variable} ${instrumentSerif.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col">
        {/* Raw HTML, not a React <script>: the browser runs it while parsing (before
            first paint), and React never re-creates it on client re-renders. */}
        <div hidden dangerouslySetInnerHTML={{ __html: `<script>${themeScript};${preloaderDecisionScript}</script>` }} />

        {children}
      </body>
    </html>
  );
}
