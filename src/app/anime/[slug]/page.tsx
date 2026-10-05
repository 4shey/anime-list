import { getDetailHtml } from "@/lib/sokuja/client";
import { parseAnimeDetail } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function AnimeDetail({ params }: { params: { slug: string } }) {
  try {
    const html = await getDetailHtml(params.slug);
    const result = parseAnimeDetail(html, params.slug);
    
    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const anime = result.data;

    return (
      <div className="space-y-8">
        {/* Header / Info Section */}
        <div className="flex flex-col md:flex-row gap-8 bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <div className="w-full md:w-64 flex-shrink-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img 
              src={anime.poster || ''} 
              alt={anime.title} 
              className="w-full rounded-xl object-cover border border-zinc-800 shadow-xl"
            />
          </div>
          
          <div className="flex-1 space-y-4">
            <div>
              <h1 className="text-3xl font-extrabold text-white tracking-tight mb-1">{anime.title}</h1>
              {anime.altTitle && <p className="text-zinc-400">{anime.altTitle}</p>}
            </div>

            <div className="flex flex-wrap gap-2 py-2">
              <span className="px-3 py-1 bg-white text-black text-xs font-bold rounded-full">
                ★ {anime.score || 'N/A'}
              </span>
              <span className="px-3 py-1 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-full">
                {anime.status}
              </span>
              <span className="px-3 py-1 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-full">
                {anime.type}
              </span>
              <span className="px-3 py-1 border border-zinc-700 text-zinc-300 text-xs font-medium rounded-full">
                {anime.year || 'Unknown Year'}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-y-2 text-sm text-zinc-400">
              <p><strong className="text-zinc-200">Studio:</strong> {anime.studio || '-'}</p>
              <p><strong className="text-zinc-200">Musim:</strong> {anime.season || '-'}</p>
              <p><strong className="text-zinc-200">Produser:</strong> {anime.producer || '-'}</p>
              <p><strong className="text-zinc-200">Fansub:</strong> {anime.fansub || '-'}</p>
            </div>

            <div className="pt-2">
              <strong className="text-zinc-200 text-sm block mb-2">Genre:</strong>
              <div className="flex flex-wrap gap-2">
                {anime.genres?.map((g: any, i: number) => (
                  <span key={i} className="px-3 py-1 bg-zinc-900 border border-zinc-800 text-zinc-300 text-xs rounded-md">
                    {g}
                  </span>
                ))}
              </div>
            </div>

            <div className="pt-2">
              <strong className="text-zinc-200 text-sm block mb-2">Sinopsis:</strong>
              <p className="text-zinc-400 text-sm leading-relaxed whitespace-pre-wrap">
                {anime.synopsis || 'Sinopsis belum tersedia.'}
              </p>
            </div>
          </div>
        </div>

        {/* Episode List */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span className="w-1.5 h-5 bg-white rounded-sm inline-block"></span>
              Daftar Episode
            </h2>
            <span className="text-xs font-medium px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-full text-zinc-400">
              {anime.totalEpisodes} Episode
            </span>
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-2 custom-scrollbar">
            {anime.episodes?.map((ep: any, i: number) => (
              <Link 
                href={`/episode/${ep.slug}`} 
                key={i}
                className="flex items-center justify-between p-4 rounded-xl bg-zinc-900/50 hover:bg-zinc-800 border border-transparent hover:border-zinc-700 transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded bg-white text-black flex items-center justify-center font-bold text-sm">
                    {ep.number}
                  </div>
                  <div>
                    <h3 className="text-zinc-200 group-hover:text-white font-medium transition-colors">
                      {ep.title}
                    </h3>
                  </div>
                </div>
                <span className="text-xs text-zinc-500">{ep.released}</span>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
