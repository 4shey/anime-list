import { getAnimeDetail } from "@/lib/sokuja/client";
import { parseAnimeDetail } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import AnimeCard from "@/components/AnimeCard";
import SectionTitle from "@/components/SectionTitle";
import BackButton from "@/components/BackButton";
import CommentSection from "@/components/CommentSection";
import EpisodeList from "@/components/EpisodeList";

export default async function AnimeDetail({ params }: { params: { slug: string } }) {
  try {
    const { html, slug } = await getAnimeDetail(params.slug);
    const result = parseAnimeDetail(html, slug);
    
    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const anime = result.data;

    const infoItems = [
      { label: 'Status', value: anime.status },
      { label: 'Tipe', value: anime.type },
      { label: 'Tahun', value: anime.year },
      { label: 'Musim', value: anime.season },
      { label: 'Episode', value: anime.episodeCount || anime.totalEpisodes || '?' },
      { label: 'Durasi', value: anime.duration },
      { label: 'Subtitle', value: anime.subtitle || 'Sub' },
      { label: 'Fansub', value: anime.fansub },
      { label: 'Studio', value: anime.studio },
      { label: 'Sutradara', value: anime.director },
      { label: 'Produser', value: anime.producer }
    ].filter(item => item.value !== null && item.value !== undefined && item.value !== '');

    return (
      <div className="space-y-8">
        {/* Bar atas: kembali */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton href="/anime" label="Kembali" />
        </div>

        {/* Hero Header */}
        <div className="relative rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800">
          {/* Blurred background image */}
          <div className="absolute inset-0">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={anime.poster || ''} alt={anime.title} className="w-full h-full object-cover blur-xl opacity-30" />
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/80 to-zinc-950/20" />
          </div>

          {/* Content */}
          <div className="relative z-10 p-5 sm:p-6 md:p-8 flex flex-col md:flex-row gap-6 md:gap-8 items-start md:items-end">
            {/* Small Poster */}
            <div className="w-32 sm:w-40 md:w-56 shrink-0 rounded-xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-zinc-900 aspect-[3/4]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={anime.poster || ''} alt={anime.title} className="w-full h-full object-cover" />
            </div>

            {/* Info Right */}
            <div className="flex-1 space-y-3 pb-2 w-full">
              {/* Breadcrumb */}
              <div className="flex flex-wrap items-center gap-2 text-[10px] sm:text-xs text-zinc-400 font-bold uppercase tracking-wider mb-2">
                <Link href="/" className="hover:text-[#00A2E9] transition-colors">Home</Link>
                <span>/</span>
                <Link href="/anime" className="hover:text-[#00A2E9] transition-colors">Anime</Link>
                <span>/</span>
                <span className="text-zinc-300 line-clamp-1">{anime.title}</span>
              </div>

              {/* Titles */}
              <div>
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">{anime.title}</h1>
                {anime.altTitle && <p className="text-xs sm:text-sm text-zinc-400 mt-1">{anime.altTitle}</p>}
              </div>

              {/* Rating */}
              <div className="flex items-center gap-2 pt-2">
                <span className="flex items-center gap-1 text-black font-bold bg-yellow-400 px-2 py-1 rounded text-sm shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
                  </svg>
                  {anime.score || 'N/A'}
                </span>
                <span className="text-zinc-400 text-sm font-semibold">/ 10</span>
              </div>

              {/* Genres */}
              <div className="flex flex-wrap gap-2 pt-3">
                {anime.genres?.map((g: string, i: number) => (
                  <Link key={i} href={`/genre/${g.toLowerCase().replace(/ /g, '-')}`} className="px-2.5 py-1 bg-zinc-800/80 hover:bg-[#00A2E9] hover:border-[#00A2E9] hover:text-white transition-colors backdrop-blur border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-md uppercase tracking-wider">
                    {g}
                  </Link>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Informasi Anime: satu card polos, nilai ditonjolkan, tanpa garis pemisah */}
        <section>
          <SectionTitle barColor="bg-[#00A2E9]">Informasi Anime</SectionTitle>
          <dl className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-950 p-5 sm:p-6">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-x-5 gap-y-6">
              {infoItems.map((item, i) => {
                const isLong = String(item.value).length > 18;
                const isAccent =
                  item.label === 'Studio' ||
                  item.label === 'Fansub' ||
                  (item.label === 'Status' && /ongoing|tayang|berjalan/i.test(String(item.value)));

                return (
                  <div key={i} className="min-w-0">
                    <dt className="text-[10px] font-bold uppercase tracking-wider text-zinc-500 mb-1.5">{item.label}</dt>
                    <dd className={`break-words leading-snug ${
                      isLong
                        ? 'text-sm font-medium text-zinc-400'
                        : `text-base sm:text-lg font-bold tracking-tight ${isAccent ? 'text-[#00A2E9]' : 'text-white'}`
                    }`}>
                      {item.value}
                    </dd>
                  </div>
                );
              })}
            </div>
          </dl>
        </section>

        {/* Sinopsis: tanpa container, lebar penuh */}
        <section>
          <SectionTitle>Sinopsis {anime.title}</SectionTitle>
          <p className="mt-4 text-zinc-300 text-sm sm:text-base leading-relaxed whitespace-pre-wrap">
            {anime.synopsis || 'Sinopsis belum tersedia.'}
          </p>
        </section>

        {/* Daftar Episode: card lebar penuh, tanpa scroll internal */}
        <section className="bg-zinc-950 border border-zinc-800 rounded-2xl p-5 sm:p-6">
          <div className="mb-6">
            <SectionTitle
              barColor="bg-[#00A2E9]"
              extra={
                <span className="text-xs font-bold px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                  {anime.episodeCount || anime.totalEpisodes} Episode
                </span>
              }
            >
              Daftar Episode
            </SectionTitle>
          </div>

          <EpisodeList episodes={anime.episodes} />
        </section>

        {/* Komentar */}
        {anime.comments && anime.comments.length > 0 && (
          <section className="space-y-4">
            <SectionTitle
              barColor="bg-[#00A2E9]"
              extra={
                <span className="text-xs font-bold px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                  {anime.commentCount || anime.comments.length} Komentar
                </span>
              }
            >
              Komentar
            </SectionTitle>
            <CommentSection comments={anime.comments} meta={anime.commentMeta} />
          </section>
        )}

        {/* Anime Terkait: grid lebar penuh, tanpa panah & tanpa Lihat Semua */}
        {anime.relatedAnime?.length > 0 && (
          <section>
            <SectionTitle>Anime Terkait</SectionTitle>
            <div className="mt-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-4">
              {anime.relatedAnime.map((rel: any, i: number) => (
                <AnimeCard key={i} item={rel} />
              ))}
            </div>
          </section>
        )}
      </div>

    );
  } catch (error: any) {
    console.error(error);
    // Tampilkan halaman error yang ramah alih-alih crash
    return (
      <div className="min-h-[60vh] flex flex-col items-center justify-center text-center space-y-4 p-8">
        <div className="w-16 h-16 rounded-full bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-2">
          <svg className="w-8 h-8 text-zinc-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>
        <h1 className="text-2xl font-extrabold text-white">Anime Tidak Ditemukan</h1>
        <p className="text-zinc-400 text-sm max-w-md">
          Halaman anime ini tidak tersedia atau terjadi kesalahan saat mengambil data dari server.
        </p>
        <div className="flex gap-3 pt-2">
          <Link href="/" className="px-5 py-2.5 bg-[#00A2E9] text-white font-bold rounded-lg text-sm hover:bg-[#0090d0] transition-colors">
            Kembali ke Beranda
          </Link>
          <Link href="/anime" className="px-5 py-2.5 bg-zinc-800 text-zinc-300 font-bold rounded-lg text-sm hover:bg-zinc-700 transition-colors">
            Daftar Anime
          </Link>
        </div>
      </div>
    );
  }
}
