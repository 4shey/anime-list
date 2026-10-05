import { parseAnimeFilter } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

// Since getGenreHtml('movie') returns 404, we'll fetch from the filter endpoint directly
const API_KEY = 'e1d31716fcc84a54bb39da93c0bb4db911a9126459af4dd3922895e888f5ec78';
const WORKER_URL = 'https://otakuproxy.azizkalimorgo.workers.dev';

async function fetchMoviesHtml() {
  const url = `${WORKER_URL}/proxy/html/${encodeURIComponent('/anime/?type=movie&order=update')}`;
  const res = await fetch(url, { headers: { 'X-API-Key': API_KEY }, cache: 'no-store' });
  if (!res.ok) return null;
  return res.text();
}

export default async function Movies() {
  try {
    const html = await fetchMoviesHtml();
    if (!html) return notFound();
    const result = parseAnimeFilter(html, { status: '', type: 'movie', order: 'update', page: 1 });
    
    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const movies = result.data.list || [];

    return (
      <div className="space-y-8">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-extrabold text-white mb-2">Anime Movies</h1>
            <p className="text-zinc-400">Daftar film anime layar lebar.</p>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {movies.map((item: any, idx: number) => (
            <Link href={`/anime/${item.slug}`} key={idx} className="group block">
              <div className="relative aspect-[3/4] rounded-xl overflow-hidden bg-zinc-900 mb-2 border border-zinc-800 group-hover:border-zinc-500 transition-colors">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={item.thumbnail} alt={item.title} className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" loading="lazy" />
                <div className="absolute top-2 left-2">
                   <span className="text-xs font-bold text-black bg-white px-2 py-1 rounded backdrop-blur-sm">
                    {item.score || 'Movie'}
                  </span>
                </div>
              </div>
              <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white line-clamp-2 transition-colors">
                {item.title}
              </h3>
            </Link>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
