import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import NextTopLoader from "nextjs-toploader";
import NavActions from "@/components/NavActions";
import { Suspense } from "react";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JMK48 - Sokuja Scraper",
  icons: {
    icon: "https://x6.sokuja.uk/favicon.ico",
    shortcut: "https://x6.sokuja.uk/favicon.ico",
    apple: "https://x6.sokuja.uk/favicon.ico",
  },
  description: "Streaming anime subtitle Indonesia gratis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id">
      <body className={`${inter.className} min-h-screen flex flex-col`}>
        <NextTopLoader color="#00A2E9" showSpinner={false} />
        {/* Navbar */}
        <nav className="sticky top-0 z-50 bg-zinc-950/80 backdrop-blur-md border-b border-zinc-800">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <div className="flex-shrink-0">
                <Link
                  href="/"
                  className="flex items-center gap-2 text-xl font-bold tracking-tighter text-white"
                >
                  <img
                    src="https://x6.sokuja.uk/favicon.ico"
                    alt="JMK48"
                    className="w-7 h-7 object-contain"
                  />
                  JMK48
                </Link>
              </div>

              {/* Desktop Menu */}
              <div className="hidden md:block">
                <div className="ml-10 flex items-baseline space-x-8">
                  <Link
                    href="/"
                    className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Home
                  </Link>
                  <Link
                    href="/anime"
                    className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Anime
                  </Link>
                  <Link
                    href="/anime?type=movie"
                    className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Movies
                  </Link>
                  <Link
                    href="/anime?status=ongoing"
                    className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Ongoing
                  </Link>
                  <Link
                    href="/anime?status=completed"
                    className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Completed
                  </Link>
                  <Link
                    href="/genre"
                    className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Genre
                  </Link>
                  <Link
                    href="/schedule"
                    className="text-zinc-300 hover:text-white px-3 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    Jadwal
                  </Link>
                </div>
              </div>

              {/* Search Box */}
              <div className="flex-1 flex justify-end ml-10">
                <Suspense fallback={null}>
                  <NavActions />
                </Suspense>
              </div>
            </div>
          </div>
        </nav>

        {/* Main Content */}
        <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          {children}
        </main>

        {/* Footer */}
        <footer className="border-t border-zinc-900 bg-zinc-950 mt-auto">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center text-zinc-500 text-sm">
            <p>JMK48 - Sokuja Scraper.</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
