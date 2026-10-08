import Link from "next/link";
import { getHomeHtml, getOngoingHtml, getCompletedHtml } from "@/lib/sokuja/client";
import { parseHome, parseAnimeFilter } from "@/lib/sokuja/parser";
import HeroSlider from "@/components/HeroSlider";
import HorizontalScroll from "@/components/HorizontalScroll";
import AnimeCard from "@/components/AnimeCard";

export default async function Home({ searchParams }: { searchParams: { page?: string } }) {
  const currentPage = Number(searchParams.page) || 1;

  const [homeHtml, ongoingHtml, completedHtml] = await Promise.all([
    getHomeHtml(currentPage),
    getOngoingHtml(1),
    getCompletedHtml(1)
  ]);

  const { data } = parseHome(homeHtml);
  const { data: ongoingData } = parseAnimeFilter(ongoingHtml, { status: 'ongoing', type: 'all', order: 'update', page: 1 });
  const { data: completedData } = parseAnimeFilter(completedHtml, { status: 'completed', type: 'all', order: 'update', page: 1 });

  const latest = data.latest || [];
  const popular = data.popular || [];
  const ongoingItems = ongoingData.list || [];
  const completedItems = completedData.list || [];

  // Use the top 5 popular anime for trending section slider
  const trendingItems = popular.slice(0, 5);

  return (
    <div className="space-y-12">
      {/* Hero Section / Trending */}
      {trendingItems.length > 0 && <HeroSlider items={trendingItems} />}

      <div className="flex flex-col xl:flex-row gap-8">
        {/* Main Content */}
        <div className="flex-1 min-w-0 space-y-14">

          {/* Section: Update Terbaru */}
          <section className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                <span className="w-2 h-6 bg-white rounded-sm inline-block"></span>
                Update Terbaru
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {latest.map((item: any, idx: number) => (
                <AnimeCard key={idx} item={item} isEpisode={true} aspectRatio="aspect-[16/9]" />
              ))}
            </div>

            {/* Pagination for Update Terbaru */}
            <div className="flex items-center justify-center gap-2 mt-8 pt-6 border-t border-zinc-800/50 flex-wrap">
              {currentPage > 1 && (
                <Link href={`/?page=${currentPage - 1}`} className="px-4 h-10 flex items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors mr-1">
                  Sebelumnya
                </Link>
              )}
              
              {(() => {
                const totalPages = 34; // Sesuaikan dengan total halaman dari API Sokuja
                if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
                if (currentPage <= 4) return [1, 2, 3, 4, 5, '...', totalPages];
                if (currentPage >= totalPages - 3) return [1, '...', totalPages - 4, totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
                return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
              })().map((item, idx) => (
                item === '...' ? (
                  <span key={`ellipsis-${idx}`} className="text-zinc-500 font-bold px-1">...</span>
                ) : (
                  <Link 
                    key={`page-${item}`}
                    href={`/?page=${item}`} 
                    className={`w-10 h-10 flex items-center justify-center rounded-lg text-sm font-bold transition-colors ${currentPage === item ? 'bg-[#00A2E9] text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'}`}
                  >
                    {item}
                  </Link>
                )
              ))}
              
              {currentPage < 34 && (
                <Link href={`/?page=${currentPage + 1}`} className="px-4 h-10 flex items-center justify-center rounded-lg bg-zinc-800 text-sm font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-colors ml-1">
                  Selanjutnya
                </Link>
              )}
            </div>
          </section>

          {/* Section: Ongoing Series */}
          {ongoingItems.length > 0 && (
            <section className="space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span className="w-2 h-6 bg-blue-500 rounded-sm inline-block"></span>
                  Ongoing Series
                </h2>
                <Link href="/schedule" className="text-sm text-zinc-400 hover:text-white transition-colors">
                  Lihat Jadwal
                </Link>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                {ongoingItems.slice(0, 8).map((item: any, idx: number) => (
                  <AnimeCard key={idx} item={item} />
                ))}
              </div>
            </section>
          )}

          {/* Section: Anime Completed */}
          {completedItems.length > 0 && (
            <section className="pt-2 overflow-hidden">
              <HorizontalScroll items={completedItems} title="Anime Completed" linkAll="/anime?status=completed" />
            </section>
          )}

        </div>

        {/* Sidebar: Top Anime */}
        <aside className="w-full xl:w-80 space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 bg-yellow-400 rounded-sm inline-block"></span>
            Populer
          </h2>
          <div className="space-y-4">
            {popular.map((item: any, idx: number) => (
              <Link href={`/anime/${item.slug}`} key={idx} className="group flex gap-4 p-2 rounded-xl hover:bg-zinc-900 transition-colors border border-transparent hover:border-zinc-800">
                <div className="w-16 h-24 flex-shrink-0 rounded-lg overflow-hidden bg-zinc-800">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnail} alt={item.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <div className="flex flex-col justify-center flex-1 min-w-0">
                  <span className="text-xs font-bold text-zinc-500 mb-1">#{item.rank}</span>
                  <h3 className="text-sm font-bold text-zinc-200 group-hover:text-white line-clamp-2 mb-1 transition-colors" title={item.title}>
                    {item.title}
                  </h3>
                  <div className="flex items-center gap-3 text-xs text-zinc-400">
                    <span className="flex items-center gap-1">
                      <svg className="w-3 h-3 text-yellow-400" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {item.score || '-'}
                    </span>
                    <span>{item.type}</span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}
