import { getSearchHtml } from "@/lib/sokuja/client";
import { parseAnimeFilter } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/AnimeCard";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string; page?: string };
}) {
  const query = searchParams.q || "";
  const page = Number(searchParams.page) || 1;

  try {
    let animeList: any[] = [];
    let total = 0;
    let tp = 1;

    if (query) {
      const html = await getSearchHtml(query, page);
      const result = parseAnimeFilter(html, { status: '', type: '', order: 'update', page });
      if (result.status === 'success' && result.data) {
        const data = result.data as any;
        animeList = data.list || [];
        total = data.total || 0;
        const totalPages = data.totalPages;

        const safeTotal = Number(total) || animeList.length;
        tp = Math.max(1, Number(totalPages) || Math.ceil(safeTotal / 24));
      }
    }

    const buildUrl = (p: number) => {
      return `/search?q=${encodeURIComponent(query)}${p > 1 ? `&page=${p}` : ''}`;
    };

    const getPaginationItems = (): (number | string)[] => {
      if (tp <= 7) return Array.from({ length: tp }, (_, i) => i + 1);
      if (page <= 4) return [1, 2, 3, 4, 5, '...', tp];
      if (page >= tp - 3) return [1, '...', tp - 4, tp - 3, tp - 2, tp - 1, tp];
      return [1, '...', page - 1, page, page + 1, '...', tp];
    };

    return (
      <div className="space-y-8">
        {/* Header (Konsisten dengan halaman lain) */}
        <div className="border-b border-zinc-800/60 pb-4">
          {query ? (
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <span className="inline-block w-1.5 h-6 bg-[#00A2E9] rounded-sm mr-2.5 align-middle"></span>
              Hasil pencarian untuk <span className="text-white font-bold">&quot;{query}&quot;</span>
            </h1>
          ) : (
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
              <span className="inline-block w-1.5 h-6 bg-[#00A2E9] rounded-sm mr-2.5 align-middle"></span>
              Ketik judul anime di kotak pencarian untuk menemukan anime yang kamu cari
            </h1>
          )}
        </div>

        {/* Input Search untuk Mobile (karena nav search dihidden di mobile) */}
        <div className="md:hidden mb-6">
          <form action="/search" method="GET" className="relative w-full">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <svg className="w-4 h-4 text-zinc-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
            <input
              type="text"
              name="q"
              defaultValue={query}
              placeholder="Cari anime..."
              className="block w-full pl-10 pr-4 py-3 bg-zinc-900 border border-zinc-800 text-white rounded-xl text-sm placeholder-zinc-500 focus:outline-none focus:border-[#00A2E9] focus:ring-1 focus:ring-[#00A2E9] transition-all"
            />
          </form>
        </div>

        {/* Hasil Pencarian */}
        {query && animeList.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold">Tidak ada anime yang ditemukan</p>
            <p className="text-sm mt-1">Coba gunakan kata kunci lain</p>
          </div>
        ) : (
          query && (
            <>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
                {animeList.map((item: any, idx: number) => (
                  <AnimeCard key={idx} item={item} />
                ))}
              </div>

              {/* Pagination */}
              {tp > 1 && (
                <div className="flex items-center justify-center gap-2 pt-6 border-t border-zinc-800/50 flex-wrap">
                  {page > 1 && (
                    <Link href={buildUrl(page - 1)} className="px-4 h-10 flex items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors mr-1">
                      Sebelumnya
                    </Link>
                  )}
                  {getPaginationItems().map((item, idx) => (
                    item === '...' ? (
                      <span key={`el-${idx}`} className="text-zinc-500 font-bold px-1">...</span>
                    ) : (
                      <Link
                        key={`p-${item}`}
                        href={buildUrl(item as number)}
                        className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${page === item ? 'bg-[#00A2E9] text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                      >
                        {item}
                      </Link>
                    )
                  ))}
                  {page < tp && (
                    <Link href={buildUrl(page + 1)} className="px-4 h-10 flex items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors ml-1">
                      Selanjutnya
                    </Link>
                  )}
                </div>
              )}
            </>
          )
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
