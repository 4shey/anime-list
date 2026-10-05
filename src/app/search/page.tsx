import { getSearchHtml } from "@/lib/sokuja/client";
import { parseAnimeFilter } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function SearchPage({
  searchParams,
}: {
  searchParams: { q?: string };
}) {
  const query = searchParams.q || "";

  try {
    let animeList: any[] = [];

    if (query) {
      const html = await getSearchHtml(query, 1);
      const result = parseAnimeFilter(html, { status: '', type: '', order: 'update', page: 1 });
      if (result.status === 'success' && result.data) {
        animeList = result.data.list || [];
      }
    }

    return (
      <div className="space-y-8 max-w-6xl mx-auto">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-3xl font-extrabold text-white mb-6">Pencarian Anime</h1>
          
          <form action="/search" method="GET" className="flex gap-2">
            <input 
              type="text" 
              name="q" 
              defaultValue={query} 
              placeholder="Ketik judul anime..." 
              className="flex-1 bg-zinc-900 border border-zinc-800 text-white rounded-lg px-4 py-3 focus:outline-none focus:border-zinc-500 transition-colors"
            />
            <button type="submit" className="bg-white text-black font-bold px-6 py-3 rounded-lg hover:bg-zinc-200 transition-colors">
              Cari
            </button>
          </form>

          {query && (
            <p className="mt-6 text-zinc-400">
              Menampilkan hasil untuk: <span className="text-white font-bold">&quot;{query}&quot;</span>
            </p>
          )}
        </div>

        {query && animeList.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Tidak ada anime yang ditemukan untuk pencarian ini.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {animeList.map((item: any, idx: number) => (
              <Link href={`/anime/${item.slug}`} key={idx} className="group block">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 mb-2 border border-zinc-800 group-hover:border-zinc-500 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnail} alt={item.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                </div>
                <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white line-clamp-2 transition-colors">
                  {item.title}
                </h3>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
