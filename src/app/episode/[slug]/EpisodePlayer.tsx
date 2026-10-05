'use client';

import { useState } from 'react';

interface Mirror {
  url: string;
  server: string;
  quality?: string;
  type?: string;
}

export default function EpisodePlayer({ mirrors, thumbnail }: { mirrors: Mirror[]; thumbnail?: string }) {
  const [activeIdx, setActiveIdx] = useState(0);

  const activeMirror = mirrors[activeIdx] || null;

  return (
    <div className="space-y-4">
      {/* Server Selector */}
      {mirrors.length > 1 && (
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-4">
          <p className="text-xs text-zinc-500 mb-3 font-medium uppercase tracking-wider">Ganti Server</p>
          <div className="flex flex-wrap gap-2">
            {mirrors.map((m, i) => (
              <button
                key={i}
                onClick={() => setActiveIdx(i)}
                className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all border ${
                  i === activeIdx
                    ? 'bg-white text-black border-white'
                    : 'bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500 hover:text-white'
                }`}
              >
                {m.server || `Server ${i + 1}`}
                {m.quality && m.quality !== 'auto' && (
                  <span className={`ml-1.5 text-xs ${i === activeIdx ? 'text-zinc-600' : 'text-zinc-500'}`}>
                    {m.quality}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Video Player */}
      <div className="relative aspect-video w-full bg-black rounded-2xl overflow-hidden border border-zinc-800 shadow-2xl">
        {activeMirror ? (
          <iframe
            key={activeIdx}
            src={activeMirror.url}
            className="w-full h-full border-none"
            allowFullScreen
            allow="autoplay; fullscreen; picture-in-picture"
          />
        ) : (
          <div className="flex flex-col items-center justify-center h-full text-zinc-600 gap-3">
            {thumbnail ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt="thumbnail" className="absolute inset-0 w-full h-full object-cover opacity-20" />
            ) : null}
            <div className="relative z-10 flex flex-col items-center gap-3">
              <svg className="w-14 h-14 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <p className="text-zinc-500 text-sm">Stream tidak tersedia. Gunakan link download di bawah.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
