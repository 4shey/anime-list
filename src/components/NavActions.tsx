"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useRef } from "react";

const MENU_LINKS = [
  { href: "/", label: "Home" },
  { href: "/anime", label: "Anime" },
  { href: "/anime?type=movie", label: "Movies" },
  { href: "/anime?status=ongoing", label: "Ongoing" },
  { href: "/anime?status=completed", label: "Completed" },
  { href: "/genre", label: "Genre" },
  { href: "/schedule", label: "Jadwal" }
];

export default function NavActions() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const [query, setQuery] = useState("");
  const [panel, setPanel] = useState<"search" | "menu" | null>(null);

  useEffect(() => {
    setQuery(searchParams.get("q") || "");
  }, [searchParams]);

  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (query.trim()) {
      setPanel(null);
      router.push(`/search?q=${encodeURIComponent(query.trim())}`);
    }
  };

  const searchIcon = (
    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
      <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
    </div>
  );

  const inputCls =
    "w-full pl-10 pr-20 py-2.5 bg-zinc-900 border border-zinc-800 rounded-full text-sm text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-[#00A2E9] focus:ring-1 focus:ring-[#00A2E9] transition-all";

  return (
    <div ref={wrapRef} className="relative flex items-center gap-2">
      {/* Desktop: form pencarian */}
      <form onSubmit={handleSubmit} className="relative hidden md:block w-64 lg:w-80">
        {searchIcon}
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari anime..."
          className={inputCls.replace("pr-20", "pr-4")}
        />
      </form>

      {/* Mobile: tombol cari */}
      <button
        type="button"
        onClick={() => setPanel((p) => (p === "search" ? null : "search"))}
        aria-label="Cari anime"
        aria-expanded={panel === "search"}
        className={`md:hidden p-2 rounded-lg border transition-colors ${
          panel === "search"
            ? "border-[#00A2E9] bg-[#00A2E9]/10 text-[#00A2E9]"
            : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-700"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
      </button>

      {/* Mobile: tombol menu */}
      <button
        type="button"
        onClick={() => setPanel((p) => (p === "menu" ? null : "menu"))}
        aria-label="Buka menu"
        aria-expanded={panel === "menu"}
        className={`md:hidden p-2 rounded-lg border transition-colors ${
          panel === "menu"
            ? "border-[#00A2E9] bg-[#00A2E9]/10 text-[#00A2E9]"
            : "border-zinc-800 bg-zinc-900 text-zinc-300 hover:text-white hover:border-zinc-700"
        }`}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          {panel === "menu" ? (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          ) : (
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
          )}
        </svg>
      </button>

      {/* Panel pencarian mobile */}
      {panel === "search" && (
        <div className="md:hidden fixed left-0 right-0 top-16 z-50 bg-zinc-950 border-b border-zinc-800 px-4 py-3 shadow-2xl">
          <form onSubmit={handleSubmit} className="relative">
            {searchIcon}
            <input
              type="text"
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari anime..."
              className={inputCls}
            />
            <button
              type="submit"
              className="absolute right-1.5 top-1/2 -translate-y-1/2 px-3.5 py-1.5 rounded-full bg-[#00A2E9] hover:bg-[#0090d0] text-white text-xs font-bold transition-colors"
            >
              Cari
            </button>
          </form>
        </div>
      )}

      {/* Panel menu mobile */}
      {panel === "menu" && (
        <div className="md:hidden absolute right-0 top-full mt-2 w-56 bg-zinc-950 border border-zinc-800 rounded-xl py-2 shadow-2xl">
          {MENU_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setPanel(null)}
              className="block px-4 py-2.5 text-sm font-medium text-zinc-300 hover:text-white hover:bg-zinc-900 transition-colors"
            >
              {l.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
