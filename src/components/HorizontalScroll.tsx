"use client";

import { useRef } from "react";
import Link from "next/link";
import AnimeCard from "@/components/AnimeCard";

interface Anime {
  title: string;
  thumbnail: string;
  slug: string;
  type?: string;
  score?: number | string | null;
}

export default function HorizontalScroll({ items, title, linkAll }: { items: Anime[], title: string, linkAll: string }) {
  const scrollRef = useRef<HTMLDivElement>(null);

  const scroll = (direction: "left" | "right") => {
    if (scrollRef.current) {
      const { scrollLeft, clientWidth } = scrollRef.current;
      const scrollTo = direction === "left" ? scrollLeft - clientWidth + 100 : scrollLeft + clientWidth - 100;
      scrollRef.current.scrollTo({ left: scrollTo, behavior: "smooth" });
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
          <span className="w-2 h-6 bg-zinc-400 rounded-sm inline-block"></span>
          {title}
        </h2>
        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-2">
            <button onClick={() => scroll("left")} className="p-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
              </svg>
            </button>
            <button onClick={() => scroll("right")} className="p-2 rounded-full bg-zinc-800 text-white hover:bg-zinc-700 transition">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
              </svg>
            </button>
          </div>
          <Link href={linkAll} className="text-sm text-zinc-400 hover:text-white transition-colors">
            Lihat Semua
          </Link>
        </div>
      </div>

      <div
        ref={scrollRef}
        className="flex gap-4 overflow-x-auto pb-4 snap-x snap-mandatory scroll-pl-4 md:scroll-pl-0 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
      >
        {items.map((item, idx) => (
          <div key={idx} className="group flex-none w-[140px] sm:w-[160px] md:w-[180px] lg:w-[200px] block snap-start">
            <AnimeCard item={item} />
          </div>
        ))}
      </div>
    </div>
  );
}
