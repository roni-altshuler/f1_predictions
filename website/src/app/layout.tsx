import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "F1 2026 Predictions | Race-by-Race Grand Prix Forecasts",
  description:
    "Machine learning-powered Formula 1 2026 season predictions. " +
    "Race classifications, driver standings, constructor championships, " +
    "and FastF1-powered visualizations for every Grand Prix.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="min-h-screen w-full flex flex-col antialiased">
        <div className="racing-stripe" />
        <Navbar />
        <main className="flex-1 w-full">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
