import { getGenreHtml } from "@/lib/sokuja/client";
import { parseAnimeFilter } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function GenreDetail({ params }: { params: { slug: string } }) {
  try {
    const html = await getGenreHtml(params.slug, 1);
    const result = parseAnimeFilter(html, { status: '', type: '', order: 'update', page: 1 });
    
    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const animeList = result.data.list || [];

    return (
      <div className="space-y-8">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2 capitalize">Genre: {params.slug.replace(/-/g, ' ')}</h1>
            <p className="text-zinc-400">Menampilkan daftar anime untuk genre ini.</p>
          </div>
          <Link href="/genre" className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-300 transition-colors">
            &larr; Semua Genre
          </Link>
        </div>

        {animeList.length === 0 ? (
          <div className="text-center py-20 text-zinc-500">Tidak ada anime yang ditemukan.</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
            {animeList.map((item: any, idx: number) => (
              <Link href={`/anime/${item.slug}`} key={idx} className="group block">
                <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 mb-2 border border-zinc-800 group-hover:border-zinc-500 transition-colors">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={item.thumbnail} alt={item.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                  <div className="absolute top-2 left-2">
                     <span className="text-xs font-bold text-black bg-white px-2 py-1 rounded backdrop-blur-sm shadow-sm">
                      {item.score || 'N/A'}
                    </span>
                  </div>
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
