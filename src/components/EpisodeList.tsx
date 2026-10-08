'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';

const PAGE_SIZE = 50;

function epNum(ep: any) {
  const n = parseInt(String(ep?.number ?? ''), 10);
  return isNaN(n) ? -1 : n;
}

function pageRange(current: number, total: number) {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages = new Set<number>([1, total, current, current - 1, current + 1]);
  if (current <= 3) [2, 3, 4].forEach(p => pages.add(p));
  if (current >= total - 2) [total - 3, total - 2, total - 1].forEach(p => pages.add(p));
  const sorted = [...pages].filter(p => p >= 1 && p <= total).sort((a, b) => a - b);
  const out: (number | '…')[] = [];
  let prev = 0;
  sorted.forEach(p => {
    if (prev && p - prev > 1) out.push('…');
    out.push(p);
    prev = p;
  });
  return out;
}

export default function EpisodeList({ episodes }: { episodes?: any[] | null }) {
  const sorted = useMemo(
    () => [...(episodes || [])].sort((a, b) => epNum(b) - epNum(a)),
    [episodes]
  );
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const [page, setPage] = useState(1);

  const go = (p: number) => {
    const next = Math.min(Math.max(1, p), totalPages);
    if (next === page) return;
    setPage(next);
  };

  if (!sorted.length) {
    return (
      <div className="p-8 text-center text-zinc-500 bg-zinc-900/30 rounded-xl border border-zinc-800/50">
        Belum ada episode yang dirilis.
      </div>
    );
  }

  const start = (page - 1) * PAGE_SIZE;
  const slice = sorted.slice(start, start + PAGE_SIZE);
  const btnCls = (active: boolean, disabled = false) =>
    `min-w-[38px] h-9 px-3 rounded-lg text-sm font-bold border transition-colors ${
      active
        ? 'bg-[#00A2E9] border-[#00A2E9] text-white'
        : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white'
    } ${disabled ? 'opacity-40 pointer-events-none' : ''}`;

  return (
    <div className="space-y-5">
      <div className="grid gap-2">
        {slice.map((ep: any, i: number) => (
          <Link
            href={`/episode/${ep.slug}`}
            key={ep.slug || i}
            className="flex items-center justify-between p-3.5 rounded-xl bg-zinc-900/50 hover:bg-[#00A2E9]/10 border border-zinc-800/50 hover:border-[#00A2E9]/30 transition-all group"
          >
            <div className="flex items-center gap-4 min-w-0">
              <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-800 group-hover:bg-[#00A2E9] text-zinc-400 group-hover:text-white flex items-center justify-center font-extrabold text-sm transition-colors">
                {ep.number}
              </div>
              <div className="min-w-0">
                <h3 className="text-zinc-200 group-hover:text-white font-semibold text-sm transition-colors line-clamp-1">
                  {ep.title}
                </h3>
                <span className="text-[10px] text-zinc-500 font-medium uppercase tracking-wider">{ep.released}</span>
              </div>
            </div>
            <div className="hidden sm:flex items-center justify-center w-8 h-8 shrink-0 rounded-full bg-zinc-800 group-hover:bg-[#00A2E9] text-zinc-400 group-hover:text-white transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 ml-0.5">
                <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
              </svg>
            </div>
          </Link>
        ))}
      </div>

      {totalPages > 1 && (
        <div className="flex flex-wrap items-center justify-center gap-1.5 pt-1">
          <button type="button" onClick={() => go(page - 1)} disabled={page === 1} className={btnCls(false, page === 1)} aria-label="Halaman sebelumnya">
            ‹
          </button>
          {pageRange(page, totalPages).map((p, i) =>
            p === '…' ? (
              <span key={`e${i}`} className="min-w-[24px] text-center text-sm text-zinc-500">
                …
              </span>
            ) : (
              <button key={p} type="button" onClick={() => go(p)} className={btnCls(p === page)}>
                {p}
              </button>
            )
          )}
          <button type="button" onClick={() => go(page + 1)} disabled={page === totalPages} className={btnCls(false, page === totalPages)} aria-label="Halaman berikutnya">
            ›
          </button>
        </div>
      )}
    </div>
  );
}
