import { getAnimeListHtml } from "@/lib/sokuja/client";
import { parseAnimeFilter } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/AnimeCard";

const STATUS_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'ongoing', label: 'Ongoing' },
  { value: 'completed', label: 'Completed' },
  { value: 'upcoming', label: 'Upcoming' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Semua' },
  { value: 'tv', label: 'TV' },
  { value: 'movie', label: 'Movie' },
  { value: 'ova', label: 'OVA' },
  { value: 'ona', label: 'ONA' },
  { value: 'special', label: 'Special' },
];

const ORDER_OPTIONS = [
  { value: 'update', label: 'Terbaru Update' },
  { value: 'popular', label: 'Terpopuler' },
];

export default async function AnimePage({ searchParams }: {
  searchParams: { status?: string; type?: string; order?: string; page?: string }
}) {
  const status = searchParams.status || '';
  const type = searchParams.type || '';
  const order = searchParams.order || 'update';
  const page = Number(searchParams.page) || 1;

  try {
    const html = await getAnimeListHtml({ status, type, order, page });
    const result = parseAnimeFilter(html, { status, type, order, page });

    if (result.status !== 'success') return notFound();

    const { list, total, totalPages } = result.data as any;
    const safeTotal = Number(total) || (list?.length || 0);
    const tp: number = Math.max(1, Number(totalPages) || Math.ceil(safeTotal / 24));

    // Build URL helper
    const buildUrl = (overrides: Record<string, string | number>) => {
      const params = new URLSearchParams();
      const merged = { status, type, order, page, ...overrides };
      if (merged.status) params.set('status', String(merged.status));
      if (merged.type) params.set('type', String(merged.type));
      if (merged.order && merged.order !== 'update') params.set('order', String(merged.order));
      if (Number(merged.page) > 1) params.set('page', String(merged.page));
      const qs = params.toString();
      return `/anime${qs ? `?${qs}` : ''}`;
    };

    // Pagination logic — sama persis dengan home
    const getPaginationItems = (): (number | string)[] => {
      if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
      if (page <= 4) return [1, 2, 3, 4, 5, '...', tp];
      if (page >= tp - 3) return [1, '...', tp - 4, tp - 3, tp - 2, tp - 1, tp];
      return [1, '...', page - 1, page, page + 1, '...', tp];
    };

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800/60 pb-4 flex items-center justify-between flex-wrap gap-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#00A2E9] rounded-sm inline-block"></span>
              Daftar Anime
            </h1>
            {total > 0 && (
              <p className="text-zinc-400 text-xs mt-2 ml-4">{total.toLocaleString()} anime ditemukan</p>
            )}
          </div>
        </div>

        {/* Filter Bar */}
        <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-2xl p-5 space-y-4">
          <div className="flex flex-wrap gap-6">
            {/* Status */}
            <div className="flex flex-col gap-2 min-w-[120px]">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Status</span>
              <div className="flex flex-wrap gap-2">
                {STATUS_OPTIONS.map(opt => (
                  <Link
                    key={opt.value}
                    href={buildUrl({ status: opt.value, page: 1 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${status === opt.value ? 'bg-[#00A2E9] text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Type */}
            <div className="flex flex-col gap-2 min-w-[120px]">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Tipe</span>
              <div className="flex flex-wrap gap-2">
                {TYPE_OPTIONS.map(opt => (
                  <Link
                    key={opt.value}
                    href={buildUrl({ type: opt.value, page: 1 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${type === opt.value ? 'bg-[#00A2E9] text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>

            {/* Order */}
            <div className="flex flex-col gap-2 min-w-[120px]">
              <span className="text-xs font-bold text-zinc-500 uppercase tracking-wider">Urutkan</span>
              <div className="flex flex-wrap gap-2">
                {ORDER_OPTIONS.map(opt => (
                  <Link
                    key={opt.value}
                    href={buildUrl({ order: opt.value, page: 1 })}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${order === opt.value ? 'bg-[#00A2E9] text-white' : 'bg-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-700'}`}
                  >
                    {opt.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          {/* Reset */}
          {(status || type || order !== 'update') && (
            <div className="pt-2 border-t border-zinc-800/50">
              <Link href="/anime" className="text-xs text-zinc-500 hover:text-red-400 transition-colors font-semibold">
                ✕ Reset Filter
              </Link>
            </div>
          )}
        </div>

        {/* Anime Grid */}
        {list.length > 0 ? (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
              {list.map((item: any, idx: number) => (
                <AnimeCard key={idx} item={item} />
              ))}
            </div>

            {/* Pagination */}
            {tp > 1 && (
              <div className="flex items-center justify-center gap-2 pt-6 border-t border-zinc-800/50 flex-wrap">
                {page > 1 && (
                  <Link href={buildUrl({ page: page - 1 })} className="px-4 h-10 flex items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors mr-1">
                    Sebelumnya
                  </Link>
                )}
                {getPaginationItems().map((item, idx) => (
                  item === '...' ? (
                    <span key={`el-${idx}`} className="text-zinc-500 font-bold px-1">...</span>
                  ) : (
                    <Link
                      key={`p-${item}`}
                      href={buildUrl({ page: item as number })}
                      className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${page === item ? 'bg-[#00A2E9] text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                    >
                      {item}
                    </Link>
                  )
                ))}
                {page < tp && (
                  <Link href={buildUrl({ page: page + 1 })} className="px-4 h-10 flex items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors ml-1">
                    Selanjutnya
                  </Link>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold">Tidak ada anime ditemukan</p>
            <p className="text-sm mt-1">Coba ubah atau reset filter</p>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
