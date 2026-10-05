import { getGenreHtml } from "@/lib/sokuja/client";
import { parseGenres } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function GenreList() {
  try {
    const html = await getGenreHtml('', 1);
    const result = parseGenres(html);
    
    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const genres = Array.isArray(result.data) ? result.data : (result.data?.genres || []);

    return (
      <div className="space-y-8 max-w-5xl mx-auto">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8 text-center">
          <h1 className="text-3xl font-extrabold text-white mb-2">Daftar Genre</h1>
          <p className="text-zinc-400">Jelajahi anime berdasarkan genre kesukaanmu.</p>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {genres.map((g: any, i: number) => (
            <Link 
              href={`/genre/${g.slug}`} 
              key={i}
              className="bg-zinc-950 hover:bg-white text-zinc-300 hover:text-black border border-zinc-800 rounded-xl p-4 text-center font-bold transition-colors shadow-sm"
            >
              {g.name}
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
