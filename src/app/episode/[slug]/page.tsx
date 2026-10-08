import {
  getEpisodeHtml,
  getVideoMirrors,
  getAnimeDetail,
  getHomeHtml,
} from "@/lib/sokuja/client";
import {
  parseEpisodeDetail,
  parseAnimeDetail,
  parseHome,
} from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodePlayer from "./EpisodePlayer";
import BackButton from "@/components/BackButton";
import SectionTitle from "@/components/SectionTitle";
import CommentSection from "@/components/CommentSection";

// Thumbnail episode terbaru (diambil dari halaman home, di-cache 5 menit)
let thumbCache: { at: number; map: Record<string, string> } | null = null;
async function getEpisodeThumbs(): Promise<Record<string, string>> {
  if (thumbCache && Date.now() - thumbCache.at < 5 * 60_000)
    return thumbCache.map;
  try {
    const html = await getHomeHtml();
    const home: any = parseHome(html);
    const map: Record<string, string> = {};
    (home.data?.latest || []).forEach((l: any) => {
      if (l?.slug && l?.thumbnail) map[l.slug] = l.thumbnail;
    });
    thumbCache = { at: Date.now(), map };
    return map;
  } catch (_) {
    return thumbCache?.map || {};
  }
}

// Thumbnail asli tiap episode (og:image halaman episode) — untuk yang tak ada di home
let epThumbCache: Record<string, string> = {};
function extractOgImage(html: string): string | null {
  const m =
    html.match(
      /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
    ) ||
    html.match(
      /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
    );
  return m ? m[1] : null;
}
async function getEpisodeThumbMap(
  slugs: string[],
): Promise<Record<string, string>> {
  const out: Record<string, string> = {};
  const missing: string[] = [];
  slugs.forEach((s) => {
    if (!s) return;
    if (epThumbCache[s]) out[s] = epThumbCache[s];
    else missing.push(s);
  });
  if (missing.length) {
    await Promise.all(
      missing.map(async (slug) => {
        try {
          const html = await getEpisodeHtml(slug);
          const img = extractOgImage(html);
          if (img) {
            out[slug] = img;
            epThumbCache[slug] = img;
          }
        } catch (_) {}
      }),
    );
  }
  return out;
}

function sortByQuality(list: any[]) {
  return [...list].sort((a, b) => {
    const q = (x: any) =>
      parseInt(String(x?.quality || "").replace(/\D/g, ""), 10) || 0;
    return q(b) - q(a);
  });
}

const BULAN = [
  "Januari",
  "Februari",
  "Maret",
  "April",
  "Mei",
  "Juni",
  "Juli",
  "Agustus",
  "September",
  "Oktober",
  "November",
  "Desember",
];

function formatTanggal(value: unknown): string {
  const raw = String(value).slice(0, 10); // format YYYY-MM-DD
  const m = raw.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return raw; // kalau formatnya beda, tampilkan apa adanya
  const [, y, mo, d] = m;
  return `${parseInt(d, 10)} ${BULAN[parseInt(mo, 10) - 1]} ${y}`;
}

export default async function EpisodeDetail({
  params,
}: {
  params: { slug: string };
}) {
  try {
    const html = await getEpisodeHtml(params.slug);
    const result = parseEpisodeDetail(html, params.slug);

    if (result.status !== "success" || !result.data) {
      return notFound();
    }

    const ep = result.data as any;

    // Mirrors dari API worker (langsung, tanpa iframe)
    let mirrors: any[] = (ep.mirrors || []).map((m: any) => ({ ...m }));
    if (ep.episodeId) {
      try {
        const mirrorsJson: any = await getVideoMirrors(String(ep.episodeId));
        const apiMirrors =
          mirrorsJson?.mirrors || mirrorsJson?.data?.mirrors || [];
        if (apiMirrors.length) {
          mirrors = apiMirrors
            .map((m: any) => ({
              url: m.embedUrl || m.url || "",
              server: m.serverName || m.server || "SOKUJA",
              quality: m.quality || "auto",
              type: m.embedType || m.type || "mp4",
            }))
            .filter((m: any) => !!m.url);
        }
      } catch (_) {
        // fallback ke mirror hasil scrape
      }
    }

    const animeSlug = ep.anime?.slug || ep.series?.slug || null;
    const animeHref = animeSlug ? `/anime/${animeSlug}` : "/";

    // Detail anime: banner, sinopsis, genre, daftar episode
    let anime: any = null;
    if (animeSlug) {
      try {
        const detail = await getAnimeDetail(animeSlug);
        const parsed: any = parseAnimeDetail(detail.html, detail.slug);
        if (parsed.status === "success" && parsed.data) anime = parsed.data;
      } catch (_) {}
    }

    const banner = anime?.poster || ep.series?.poster || ep.thumbnail || null;
    const synopsis = anime?.synopsis || ep.series?.synopsis || null;
    const genres: string[] = anime?.genres?.length
      ? anime.genres
      : ep.series?.genres || [];

    const [homeThumbs] = await Promise.all([getEpisodeThumbs()]);
    const epNumber = (x: any) => {
      const n = parseInt(String(x?.number ?? ""), 10);
      return isNaN(n) ? -1 : n;
    };
    const allEpisodes: any[] = [...(anime?.episodes || [])]
      .sort((a: any, b: any) => epNumber(b) - epNumber(a))
      .slice(0, 8);

    // Thumbnail asli tiap episode (bukan banner anime): gabung home + og:image per episode
    const ownThumb: Record<string, string> = { ...homeThumbs };
    if (ep.slug && ep.thumbnail) ownThumb[ep.slug] = ep.thumbnail;
    const needThumbs = allEpisodes
      .map((e: any) => e.slug)
      .filter((s: string) => s && !ownThumb[s]);
    if (needThumbs.length) {
      const fetched = await getEpisodeThumbMap(needThumbs);
      Object.assign(ownThumb, fetched);
    }
    const thumbMap = ownThumb;

    const prevSlug = ep.navigation?.prev?.slug || null;
    const nextSlug = ep.navigation?.next?.slug || null;
    const downloads = sortByQuality(ep.downloads || []);
    const comments: any[] = ep.comments || [];

    return (
      <div className="space-y-6">
        {/* Bar atas: kembali + ke halaman anime */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <BackButton href={animeHref} label="Kembali" />
          {animeSlug && (
            <Link
              href={animeHref}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-sm font-semibold text-zinc-300 hover:text-white transition-colors"
            >
              Semua Episode
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          )}
        </div>

        {/* Judul + meta (tanggal & views mentok kanan) */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="min-w-0 space-y-2">
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {ep.title}
            </h1>
          </div>

          <div className="flex flex-wrap items-center justify-end gap-2 shrink-0 w-full sm:w-auto">
            {ep.uploadDate && (
              <span className="text-xs text-zinc-400">
                {formatTanggal(ep.uploadDate)}
              </span>
            )}
            {ep.views ? (
              <span className="text-xs text-zinc-400">
                {typeof ep.views === "number"
                  ? ep.views.toLocaleString("id-ID")
                  : ep.views}{" "}
                views
              </span>
            ) : null}
          </div>
        </div>

        {/* Player */}
        <EpisodePlayer
          mirrors={mirrors}
          thumbnail={ep.thumbnail}
          title={ep.title}
          hasDownloads={downloads.length > 0}
        />

        {/* Navigasi episode */}
        <div className="grid grid-cols-2 gap-3">
          {prevSlug ? (
            <Link
              href={`/episode/${prevSlug}`}
              className="flex items-center gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-colors group"
            >
              <svg
                className="w-5 h-5 shrink-0 text-zinc-500 group-hover:text-[#00A2E9] transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Sebelumnya
                </span>
                <span className="block text-sm font-semibold text-zinc-200 truncate">
                  Episode sebelumnya
                </span>
              </span>
            </Link>
          ) : (
            <div />
          )}

          {nextSlug ? (
            <Link
              href={`/episode/${nextSlug}`}
              className="flex items-center justify-end gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-900 transition-colors group text-right"
            >
              <span className="min-w-0">
                <span className="block text-[10px] font-bold uppercase tracking-wider text-zinc-500">
                  Selanjutnya
                </span>
                <span className="block text-sm font-semibold text-zinc-200 truncate">
                  Episode berikutnya
                </span>
              </span>
              <svg
                className="w-5 h-5 shrink-0 text-zinc-500 group-hover:text-[#00A2E9] transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </Link>
          ) : (
            <div />
          )}
        </div>

        {/* Download */}
        {downloads.length > 0 && (
          <section className="space-y-4">
            <SectionTitle
              barColor="bg-[#00A2E9]"
              extra={
                <span className="text-[11px] font-bold px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                  {downloads.length} link
                </span>
              }
            >
              Link Download
            </SectionTitle>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {downloads.map((dl: any, i: number) => (
                <a
                  key={i}
                  href={dl.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center justify-between gap-3 p-3.5 rounded-xl bg-zinc-950 border border-zinc-800 hover:border-[#00A2E9]/60 hover:bg-[#00A2E9]/10 transition-all"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-zinc-900 group-hover:bg-[#00A2E9] text-zinc-400 group-hover:text-white flex items-center justify-center transition-colors">
                      <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
                        />
                      </svg>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-extrabold text-white">
                        {dl.quality || "Default"}
                      </p>
                      <p className="text-[11px] text-zinc-500 truncate">
                        Klik untuk mengunduh
                      </p>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 shrink-0 text-zinc-600 group-hover:text-[#00A2E9] transition-colors"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 5l7 7-7 7"
                    />
                  </svg>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Banner anime (bg blur + poster kecil di kiri) + sinopsis */}
        <section className="relative rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950">
          <div className="absolute inset-0">
            {banner && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={banner}
                alt=""
                className="w-full h-full object-cover blur-xl opacity-30"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/85 to-zinc-950/30" />
          </div>

          <div className="relative z-10 p-4 sm:p-6 flex flex-col sm:flex-row gap-4 sm:gap-6 items-start sm:items-end">
            <div className="w-28 sm:w-36 shrink-0 rounded-xl overflow-hidden border-2 border-zinc-800 shadow-2xl bg-zinc-900 aspect-[3/4]">
              {banner && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={banner}
                  alt={anime?.title || ep.title}
                  className="w-full h-full object-cover"
                />
              )}
            </div>

            <div className="flex-1 min-w-0 space-y-2.5 pb-1">
              <h2 className="text-xl sm:text-3xl font-extrabold text-white tracking-tight line-clamp-2">
                {anime?.title || ep.series?.title || ep.anime?.title || ""}
              </h2>
              <div className="flex flex-wrap gap-2">
                {genres.slice(0, 8).map((g: string, i: number) => (
                  <Link
                    key={i}
                    href={`/genre/${String(g).toLowerCase().replace(/ /g, "-")}`}
                    className="px-2.5 py-1 bg-zinc-800/80 border border-zinc-700 text-zinc-300 text-xs font-semibold rounded-md uppercase tracking-wider backdrop-blur transition-colors hover:bg-[#00A2E9] hover:border-[#00A2E9] hover:text-white"
                  >
                    {g}
                  </Link>
                ))}
              </div>
            </div>
          </div>

          <div className="relative z-10 px-4 sm:px-6 pb-4 sm:pb-6 space-y-3">
            <SectionTitle barColor="bg-[#00A2E9]">Sinopsis</SectionTitle>
            <p className="text-sm sm:text-base leading-relaxed text-zinc-300 whitespace-pre-wrap">
              {synopsis || "Sinopsis belum tersedia."}
            </p>
            {animeSlug && (
              <Link
                href={animeHref}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#00A2E9] hover:text-white transition-colors"
              >
                Lihat detail anime
                <svg
                  className="w-4 h-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </Link>
            )}
          </div>
        </section>

        {/* Episode lainnya */}
        {allEpisodes.length > 0 && (
          <section className="space-y-4">
            <SectionTitle
              barColor="bg-[#00A2E9]"
              extra={
                <span className="text-[11px] font-bold px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                  {anime?.episodeCount || allEpisodes.length} Episode
                </span>
              }
            >
              Episode Lainnya
            </SectionTitle>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
              {allEpisodes.map((e: any, i: number) => {
                const thumb = thumbMap[e.slug] || null;
                return (
                  <Link
                    key={e.slug || i}
                    href={`/episode/${e.slug}`}
                    className="group block"
                  >
                    {/* Gambar: radius hanya atas */}
                    <div className="relative w-full aspect-video rounded-t-xl overflow-hidden bg-zinc-900 border border-zinc-800 border-b-0">
                      {thumb ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={thumb}
                          alt={e.title}
                          loading="lazy"
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-zinc-900">
                          <svg
                            className="w-8 h-8 text-zinc-700"
                            fill="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path d="M8 5.14v14l11-7-11-7z" />
                          </svg>
                        </div>
                      )}
                      <span className="absolute inset-0 bg-black/30 group-hover:bg-black/10 transition-colors" />
                      {/* Nomor episode menimpa gambar, pojok kanan bawah */}
                      <span className="absolute right-1.5 bottom-1.5 px-2 py-0.5 rounded-md bg-black/75 text-white text-[11px] font-extrabold backdrop-blur">
                        EP {e.number || i + 1}
                      </span>
                    </div>

                    {/* Konten: radius hanya bawah */}
                    <div className="rounded-b-xl border border-zinc-800 border-t-0 bg-zinc-900/60 px-3 py-2.5 group-hover:bg-zinc-900 transition-colors">
                      <p className="text-sm font-bold text-white leading-tight line-clamp-1">
                        Episode {e.number || i + 1}
                      </p>
                      <p className="text-[11px] text-zinc-400 mt-1 truncate">
                        {anime?.title ||
                          ep.series?.title ||
                          ep.anime?.title ||
                          ""}
                      </p>
                      <p className="text-[10px] text-zinc-500 mt-1.5">
                        {e.released && e.released !== "Tersedia"
                          ? e.released
                          : "Tersedia"}
                      </p>
                    </div>
                  </Link>
                );
              })}
            </div>
          </section>
        )}

        {/* Komentar */}
        {comments.length > 0 && (
          <section className="space-y-4">
            <SectionTitle
              barColor="bg-[#00A2E9]"
              extra={
                <span className="text-[11px] font-bold px-2.5 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                  {ep.commentCount || comments.length} Komentar
                </span>
              }
            >
              Komentar
            </SectionTitle>
            <CommentSection comments={comments} meta={ep.commentMeta} />
          </section>
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
