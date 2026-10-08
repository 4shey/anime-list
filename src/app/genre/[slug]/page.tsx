import { getGenreHtml } from "@/lib/sokuja/client";
import { parseAnimeFilter } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/AnimeCard";

function formatGenreName(slug: string): string {
  return slug
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase());
}

export default async function GenreDetail({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: { page?: string };
}) {
  const page = Number(searchParams.page) || 1;
  const genreName = formatGenreName(params.slug);

  try {
    const html = await getGenreHtml(params.slug, page);
    const result = parseAnimeFilter(html, { status: '', type: '', order: 'update', page });

    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const { list, total, totalPages } = result.data as any;
    const tp: number = Math.max(1, Number(totalPages) || Math.ceil((Number(total) || list.length) / 24));

    const buildUrl = (p: number) => {
      return `/genre/${params.slug}${p > 1 ? `?page=${p}` : ''}`;
    };

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
            <div className="flex items-center gap-2 text-[10px] text-zinc-500 mb-2 uppercase font-bold tracking-wider ml-4">
              <Link href="/genre" className="hover:text-[#00A2E9] transition-colors">Genre</Link>
              <span>/</span>
              <span className="text-zinc-400">{genreName}</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
              <span className="w-1.5 h-6 bg-[#00A2E9] rounded-sm inline-block"></span>
              Anime Genre {genreName}
            </h1>
            {total > 0 && (
              <p className="text-zinc-400 text-xs mt-2 ml-4">{Number(total).toLocaleString()} anime ditemukan</p>
            )}
          </div>
          <Link
            href="/genre"
            className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-300 transition-colors flex items-center gap-2"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
            </svg>
            Semua Genre
          </Link>
        </div>

        {/* Anime Grid */}
        {list.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-zinc-500">
            <svg className="w-16 h-16 mb-4 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <p className="text-lg font-semibold">Tidak ada anime ditemukan</p>
          </div>
        ) : (
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
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
