import { getEpisodeHtml, getVideoMirrors, getProxyStreamUrl } from "@/lib/sokuja/client";
import { parseEpisodeDetail } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";
import EpisodePlayer from "./EpisodePlayer";

export default async function EpisodeDetail({ params }: { params: { slug: string } }) {
  try {
    const html = await getEpisodeHtml(params.slug);
    const result = parseEpisodeDetail(html, params.slug);
    
    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    const ep = result.data as any;

    // Fetch mirrors dari API worker jika ada episodeId
    let mirrors = (ep.mirrors || []).map((m: any) => ({
      ...m,
      url: m.url ? getProxyStreamUrl(m.url) : '',
    }));
    if (ep.episodeId) {
      try {
        const mirrorsJson: any = await getVideoMirrors(String(ep.episodeId));
        const apiMirrors = mirrorsJson?.mirrors || mirrorsJson?.data?.mirrors || [];
        if (apiMirrors.length) {
          mirrors = apiMirrors.map((m: any) => {
            const rawUrl = m.embedUrl || m.url || '';
            return {
              url: rawUrl ? getProxyStreamUrl(rawUrl) : '',
              server: m.serverName || m.server || 'SOKUJA',
              quality: m.quality || 'auto',
              type: m.embedType || 'hls',
            };
          });
        }
      } catch (_) {
        // fallback to scraped mirrors (already proxied above)
      }
    }

    // Extract navigation slugs safely
    const prevSlug = ep.navigation?.prev?.slug || null;
    const nextSlug = ep.navigation?.next?.slug || null;
    const animeSlug = ep.anime?.slug || null;

    return (
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Top Info */}
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-4">
            <div>
              <h1 className="text-2xl font-bold text-white mb-2">{ep.title}</h1>
              {ep.anime?.title && animeSlug && (
                <Link href={`/anime/${animeSlug}`} className="text-zinc-400 hover:text-white text-sm transition-colors flex items-center gap-2">
                  &larr; Kembali ke {ep.anime.title}
                </Link>
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              {ep.uploadDate && (
                <span className="text-xs px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                  {ep.uploadDate}
                </span>
              )}
              {ep.views && (
                <span className="text-xs px-3 py-1 bg-zinc-900 border border-zinc-800 rounded-md text-zinc-400">
                  {typeof ep.views === 'number' ? ep.views.toLocaleString() : ep.views} views
                </span>
              )}
            </div>
          </div>

          {/* Navigation Prev/Next */}
          <div className="flex items-center justify-between pt-4 border-t border-zinc-800">
            {prevSlug ? (
              <Link href={`/episode/${prevSlug}`} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-white font-medium transition-colors">
                &larr; Eps Sebelumnya
              </Link>
            ) : <div />}
            
            {animeSlug && (
              <Link href={`/anime/${animeSlug}`} className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg text-sm text-zinc-300 font-medium transition-colors">
                Semua Eps
              </Link>
            )}

            {nextSlug ? (
              <Link href={`/episode/${nextSlug}`} className="px-4 py-2 bg-white hover:bg-zinc-200 border border-white rounded-lg text-sm text-black font-bold transition-colors">
                Eps Selanjutnya &rarr;
              </Link>
            ) : <div />}
          </div>
        </div>

        {/* Video Player — delegated to client component for interactivity */}
        <EpisodePlayer mirrors={mirrors} thumbnail={ep.thumbnail} />

        {/* Download Section */}
        {ep.downloads && ep.downloads.length > 0 && (
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <span className="w-1.5 h-5 bg-zinc-500 rounded-sm inline-block"></span>
              Link Download
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
              {ep.downloads.map((dl: any, i: number) => (
                <a 
                  key={i} 
                  href={dl.link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center justify-center gap-2 p-3 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-xl text-sm font-medium text-white transition-colors"
                >
                  <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"></path>
                  </svg>
                  {dl.quality || 'Download'}
                </a>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound();
  }
}
