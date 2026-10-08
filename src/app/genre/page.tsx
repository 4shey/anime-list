import { getGenreHtml } from "@/lib/sokuja/client";
import { parseGenres } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import GenreAlphaNav from "@/components/GenreAlphaNav";

// Membersihkan nama genre dari kode angka seperti "battle-123" → "Battle"
function cleanGenreName(name: string): string {
  return name.replace(/\s*\d+$/, '').trim();
}

export default async function GenreList() {
  try {
    const html = await getGenreHtml('', 1);
    const result = parseGenres(html);

    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const rawGenres = Array.isArray(result.data) ? result.data : (result.data?.genres || []);

    // Bersihkan nama dan deduplikasi
    const genres: { name: string; slug: string }[] = [];
    const seen = new Set<string>();
    for (const g of rawGenres) {
      const cleaned = cleanGenreName(g.name);
      if (cleaned && !seen.has(g.slug)) {
        seen.add(g.slug);
        genres.push({ name: cleaned, slug: g.slug });
      }
    }

    // Kelompokkan per huruf awal
    const grouped: Record<string, { name: string; slug: string }[]> = {};
    for (const g of genres) {
      const letter = g.name[0].toUpperCase();
      if (!grouped[letter]) grouped[letter] = [];
      grouped[letter].push(g);
    }

    const sortedLetters = Object.keys(grouped).sort();

    return (
      <div className="space-y-8">
        {/* Header */}
        <div className="border-b border-zinc-800/60 pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight">
            <span className="inline-block w-1.5 h-6 bg-[#00A2E9] rounded-sm mr-2.5 align-middle"></span>
            Daftar Genre
          </h1>
          <p className="text-zinc-400 text-xs mt-2 ml-4">
            {genres.length} genre ditemukan
          </p>
        </div>

        {/* Alpha Nav */}
        <div className="mb-6">
          <GenreAlphaNav letters={sortedLetters} />
        </div>

        {/* Genre Sections per huruf */}
        <div className="space-y-8">
          {sortedLetters.map(letter => (
            <div key={letter} id={`section-${letter}`} className="scroll-mt-20">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-7 h-7 flex items-center justify-center rounded-md bg-[#00A2E9] text-white font-bold text-sm flex-shrink-0">
                  {letter}
                </span>
                <div className="flex-1 h-px bg-zinc-800"></div>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-8 gap-2">
                {grouped[letter].map((g, i) => (
                  <Link
                    key={i}
                    href={`/genre/${g.slug}`}
                    className="group bg-zinc-900/60 hover:bg-[#00A2E9] border border-zinc-800/80 hover:border-[#00A2E9] rounded-lg px-2 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white transition-all text-center line-clamp-1 shadow-sm"
                    title={g.name}
                  >
                    {g.name}
                  </Link>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
