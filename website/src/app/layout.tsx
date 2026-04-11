import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import ThemeProvider from "@/components/ThemeProvider";
import { DEFAULT_SEASON_YEAR } from "@/lib/season";

const ACTIVE_SEASON_YEAR = String(DEFAULT_SEASON_YEAR);

export const metadata: Metadata = {
  title: `F1 ${ACTIVE_SEASON_YEAR} Predictions | AI-Powered Race Forecasts`,
  description:
    `AI and machine learning-powered Formula 1 ${ACTIVE_SEASON_YEAR} season predictions. ` +
    "Race classifications, championship standings, pit strategy simulations, " +
    "and professional visualizations for every Grand Prix.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dark" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{const t=localStorage.getItem('f1-theme');if(t)document.documentElement.setAttribute('data-theme',t)}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-screen w-full flex flex-col antialiased" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <ThemeProvider>
          <div className="racing-stripe" />
          <Navbar />
          <main className="flex-1 w-full">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
