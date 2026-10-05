import Link from "next/link";
import { getHomeHtml } from "@/lib/sokuja/client";
import { parseHome } from "@/lib/sokuja/parser";
import Image from "next/image";

export default async function Home() {
  const html = await getHomeHtml();
  const { data } = parseHome(html);

  const latest = data.latest || [];
  const popular = data.popular || [];
  
  // Use the first popular anime for trending section if available
  const trending = popular.length > 0 ? popular[0] : null;

  return (
    <div className="space-y-12">
      {/* Hero Section / Trending */}
      {trending && (
        <section className="relative w-full h-[400px] md:h-[500px] rounded-2xl overflow-hidden bg-zinc-900 border border-zinc-800 flex items-end">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img 
            src={trending.thumbnail} 
            alt={trending.title} 
            className="absolute inset-0 w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/60 to-transparent z-10" />
          <div className="absolute inset-0 bg-gradient-to-r from-zinc-950 via-zinc-950/40 to-transparent z-10" />
          <div className="relative z-20 p-8 md:p-12 w-full max-w-3xl">
            <span className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full mb-4 inline-block">TRENDING</span>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white mb-2 tracking-tight line-clamp-2">{trending.title}</h1>
            <div className="flex items-center gap-4 text-sm text-zinc-300 mb-6">
              <span className="font-semibold text-white">{trending.score} / 10</span>
              <span>{trending.type}</span>
              <span>{trending.status}</span>
            </div>
            <Link 
              href={`/anime/${trending.slug}`}
              className="inline-block bg-white text-black hover:bg-zinc-200 px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Lihat Detail
            </Link>
          </div>
        </section>
      )}

      <div className="flex flex-col lg:flex-row gap-8">
        {/* Main Content: Latest Episodes */}
        <div className="flex-1 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <span className="w-2 h-6 bg-white rounded-sm inline-block"></span>
              Episode Terbaru
            </h2>
            <Link href="/ongoing" className="text-sm text-zinc-400 hover:text-white transition-colors">
              Lihat Semua &rarr;
            </Link>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {latest.map((item: any, idx: number) => (
              <Link href={`/episode/${item.slug}`} key={idx} className="group block">
                <div className="relative aspect-[16/9] rounded-xl overflow-hidden bg-zinc-900 mb-2 border border-zinc-800 group-hover:border-zinc-500 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnail} alt={item.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <div className="absolute top-2 left-2">
                     <span className="text-xs font-bold text-black bg-white px-2 py-1 rounded backdrop-blur-sm shadow-lg">
                      EP {item.episodeNumber}
                    </span>
                  </div>
                </div>
                <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white line-clamp-2 transition-colors" title={item.title}>
                  {item.title}
                </h3>
              </Link>
            ))}
          </div>
        </div>

        {/* Sidebar: Top Anime */}
        <aside className="w-full lg:w-80 space-y-6">
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <span className="w-2 h-6 bg-zinc-500 rounded-sm inline-block"></span>
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
                      <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
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
