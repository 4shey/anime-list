"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";

interface Anime {
  title: string;
  thumbnail: string;
  slug: string;
  score: string;
  type: string;
  status: string;
}

export default function HeroSlider({ items }: { items: Anime[] }) {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex + 1) % items.length);
  }, [items.length]);

  const prevSlide = useCallback(() => {
    setCurrentIndex((prevIndex) => (prevIndex === 0 ? items.length - 1 : prevIndex - 1));
  }, [items.length]);

  useEffect(() => {
    if (items.length <= 1) return;
    const interval = setInterval(nextSlide, 3000);
    return () => clearInterval(interval);
  }, [items.length, nextSlide]);

  if (!items || items.length === 0) return null;

  const currentItem = items[currentIndex];

  return (
    <section className="relative w-full h-[260px] sm:h-[350px] md:h-[500px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-end group">
      {/* Background Image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        key={currentItem.slug} // Adding key forces a re-render/fade if we add CSS animations later
        src={currentItem.thumbnail}
        alt={currentItem.title}
        className="absolute inset-0 w-full h-full object-cover opacity-60 animate-in fade-in duration-500"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent z-10" />
      <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent z-10" />

      {/* Content */}
      <div className="relative z-20 p-5 sm:p-8 md:p-12 w-full max-w-3xl">
        <div className="flex flex-wrap items-center gap-3 text-xs md:text-sm text-zinc-100 mb-4">
          {/* Badge Bintang & Score */}
          <span className="flex items-center gap-1 font-bold text-black bg-yellow-400 px-2.5 py-1 rounded-md shadow-sm">
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
            </svg>
            {currentItem.score || "-"}
          </span>
          {/* Badge Type & Status */}
          <span className="bg-zinc-800/90 backdrop-blur-md border border-zinc-700 px-2.5 py-1 rounded-md font-semibold tracking-wide uppercase text-[10px] md:text-xs">
            {currentItem.type}
          </span>
          <span className="bg-zinc-800/90 backdrop-blur-md border border-zinc-700 px-2.5 py-1 rounded-md font-semibold tracking-wide uppercase text-[10px] md:text-xs">
            {currentItem.status}
          </span>
        </div>
        <Link href={`/anime/${currentItem.slug}`}>
          <h1
            className="text-xl sm:text-2xl md:text-4xl font-extrabold text-white hover:text-[#00A2E9] mb-2 md:mb-3 tracking-tight line-clamp-1 transition-colors"
            title={currentItem.title}
          >
            {currentItem.title}
          </h1>
        </Link>
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={prevSlide}
            className="absolute left-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
          </button>
          <button
            onClick={nextSlide}
            className="absolute right-4 top-1/2 -translate-y-1/2 z-30 p-3 bg-black/50 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-white hover:text-black backdrop-blur-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
            </svg>
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-4 right-4 sm:bottom-6 sm:right-8 md:bottom-8 md:right-12 z-30 flex items-center gap-2">
          {items.map((_, idx) => (
            <button
              key={idx}
              onClick={() => setCurrentIndex(idx)}
              className={`h-2 rounded-full transition-all duration-300 ${idx === currentIndex ? "w-8 bg-white" : "w-2 bg-zinc-500/50 hover:bg-zinc-400"}`}
              aria-label={`Go to slide ${idx + 1}`}
            />
          ))}
        </div>
      )}
    </section>
  );
}
