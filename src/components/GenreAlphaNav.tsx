"use client";

import { useEffect, useRef } from "react";

export default function GenreAlphaNav({ letters }: { letters: string[] }) {
  const scrollToSection = (letter: string) => {
    const el = document.getElementById(`section-${letter}`);
    if (el) {
      const offset = 80;
      const top = el.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top, behavior: "smooth" });
    }
  };

  return (
    <div className="flex flex-wrap gap-1.5">
      {letters.map(letter => (
        <button
          key={letter}
          onClick={() => scrollToSection(letter)}
          className="w-7 h-7 flex items-center justify-center rounded-md bg-zinc-800 text-zinc-300 hover:bg-[#00A2E9] hover:text-white font-bold text-xs transition-all"
        >
          {letter}
        </button>
      ))}
    </div>
  );
}
