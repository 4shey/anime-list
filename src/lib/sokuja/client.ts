import * as cheerio from 'cheerio';

const WORKER_URL = 'https://otakuproxy.azizkalimorgo.workers.dev';
const API_KEY = 'e1d31716fcc84a54bb39da93c0bb4db911a9126459af4dd3922895e888f5ec78';

const SOKUJA_BASE = 'https://x6.sokuja.uk';

const headers = {
  'X-API-Key': API_KEY,
  'Accept': 'text/html',
};

async function fetchHtmlFromWorker(path: string) {
  const url = `${WORKER_URL}/proxy/html/${encodeURIComponent(path)}`;
  const res = await fetch(url, { 
    headers: { 'X-API-Key': API_KEY },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`Worker error: ${res.status}`);
  return res.text();
}

async function fetchHtmlFromWorkerSafe(path: string): Promise<string | null> {
  try {
    return await fetchHtmlFromWorker(path);
  } catch (_) {
    return null;
  }
}

async function fetchJsonFromWorker(path: string) {
  const url = `${WORKER_URL}/proxy/api/${encodeURIComponent(path)}`;
  const res = await fetch(url, { 
    headers: { 'X-API-Key': API_KEY },
    cache: 'no-store'
  });
  if (!res.ok) throw new Error(`Worker error: ${res.status}`);
  return res.json();
}

export async function getHomeHtml(page = 1) {
  return fetchHtmlFromWorker(page > 1 ? `/page/${page}/` : '/');
}

export async function getAnimeListHtml(params: {
  status?: string;
  type?: string;
  order?: string;
  page?: number;
} = {}) {
  const { status = '', type = '', order = 'update', page = 1 } = params;
  const qs = new URLSearchParams();
  if (status) qs.set('status', status.toLowerCase());
  if (type) qs.set('type', type.toLowerCase());
  if (order) qs.set('order', order);
  if (page > 1) qs.set('page', String(page));
  return fetchHtmlFromWorker(`/anime/?${qs.toString()}`);
}

export async function getOngoingHtml(page = 1) {
  return fetchHtmlFromWorker(`/anime/?status=ongoing&order=update${page > 1 ? `&page=${page}` : ''}`);
}

export async function getCompletedHtml(page = 1) {
  return fetchHtmlFromWorker(`/anime/?status=completed&order=update${page > 1 ? `&page=${page}` : ''}`);
}

export async function getGenreHtml(slug: string, page = 1) {
  return fetchHtmlFromWorker(`/genre/${slug}/${page > 1 ? `?page=${page}` : ''}`);
}

export async function getSearchHtml(keyword: string, page = 1) {
  return fetchHtmlFromWorker(`/?s=${encodeURIComponent(keyword)}${page > 1 ? `&page=${page}` : ''}`);
}

export async function getScheduleHtml() {
  return fetchHtmlFromWorker('/jadwal-rilis-anime/');
}

const SUBTITLE_SUFFIX = '-subtitle-indonesia';

export function normalizeAnimeSlug(raw: string): string {
  if (!raw) return '';
  let s = raw;
  try {
    s = decodeURIComponent(raw);
  } catch (_) {}
  s = s.trim().split('?')[0].split('#')[0].replace(/\\/g, '/');
  const fromPath = s.match(/(?:^|\/)anime\/([^/]+)\/?$/);
  if (fromPath) s = fromPath[1];
  s = s.replace(/^\/+/, '').replace(/\/+$/, '');
  if (s.toLowerCase().startsWith('anime/')) s = s.slice('anime/'.length);
  return s;
}

function isAnimeDetailHtml(html: string | null): boolean {
  if (!html) return false;
  if (/"@type"\s*:\s*"TVSeries"/.test(html)) return true;
  if (/<h1[\s>]/i.test(html) && /Informasi Anime/.test(html)) return true;
  if (/<h1[\s>]/i.test(html) && /Daftar Episode/i.test(html)) return true;
  return false;
}

function slugSimilarity(a: string, b: string): number {
  const norm = (s: string) => s.toLowerCase().replace(new RegExp(`${SUBTITLE_SUFFIX}$`), '').split('-').filter(Boolean);
  const ta = norm(a);
  const tb = new Set(norm(b));
  if (!ta.length) return 0;
  let hit = 0;
  for (const t of ta) if (tb.has(t)) hit++;
  return hit / ta.length;
}

async function resolveViaSearch(baseSlug: string): Promise<string | null> {
  const query = baseSlug
    .toLowerCase()
    .replace(new RegExp(`${SUBTITLE_SUFFIX}$`), '')
    .replace(/-/g, ' ')
    .trim();
  if (!query) return null;

  const html = await fetchHtmlFromWorkerSafe(`/?s=${encodeURIComponent(query)}`);
  if (!html) return null;

  const $ = cheerio.load(html);
  let bestSlug = '';
  let bestScore = -1;

  $('a[href*="/anime/"]').each((_, el) => {
    const href = $(el).attr('href') || '';
    if (href.includes('?') || /\/anime\/(list-mode|genre|ongoing|completed)\/?$/i.test(href)) return;
    const slug = href.replace(/^https?:\/\/[^/]+/, '').replace(/^\/anime\/|\/$/g, '');
    if (!slug || !/^[a-z0-9][a-z0-9-]*$/i.test(slug)) return;
    const score = slugSimilarity(baseSlug, slug);
    if (score > bestScore) {
      bestScore = score;
      bestSlug = slug;
    }
  });

  return bestScore >= 0.6 ? bestSlug : null;
}

export type AnimeDetailHtml = { html: string; slug: string };

export async function getAnimeDetail(rawSlug: string): Promise<AnimeDetailHtml> {
  const base = normalizeAnimeSlug(rawSlug);
  if (!base) throw new Error('Slug anime kosong');

  const candidates = base.toLowerCase().endsWith(SUBTITLE_SUFFIX)
    ? [base, base.slice(0, -SUBTITLE_SUFFIX.length)]
    : [`${base}${SUBTITLE_SUFFIX}`, base];

  for (const candidate of candidates) {
    const html = await fetchHtmlFromWorkerSafe(`/anime/${candidate}/`);
    if (isAnimeDetailHtml(html)) return { html: html as string, slug: candidate };
  }

  const resolved = await resolveViaSearch(base);
  if (resolved && !candidates.includes(resolved)) {
    const html = await fetchHtmlFromWorkerSafe(`/anime/${resolved}/`);
    if (isAnimeDetailHtml(html)) return { html: html as string, slug: resolved };
  }

  throw new Error(`Anime '${base}' tidak ditemukan di SOKUJA`);
}

export async function getDetailHtml(slug: string) {
  return (await getAnimeDetail(slug)).html;
}

export async function getEpisodeHtml(slug: string) {
  return fetchHtmlFromWorker(`/${slug}/`);
}

export async function getVideoMirrors(episodeId: string) {
  return fetchJsonFromWorker(`/api/video-mirrors?e=${episodeId}`);
}

export function getProxyStreamUrl(targetUrl: string) {
  return `https://rino-eosin.vercel.app/api/proxy/stream/${encodeURIComponent(targetUrl)}`;
}

/** Ambil halaman komentar dari SOKUJA (cursor pagination) — untuk tombol "Muat Lebih Banyak". */
export async function getComments(params: {
  episodeId?: number | null;
  animeId?: number | null;
  cursor?: number | null;
  limit?: number;
}) {
  const qs = new URLSearchParams();
  if (params.episodeId) qs.set('episodeId', String(params.episodeId));
  if (params.animeId) qs.set('animeId', String(params.animeId));
  qs.set('limit', String(params.limit || 10));
  if (params.cursor != null) qs.set('cursor', String(params.cursor));

  try {
    return await fetchJsonFromWorker(`/api/comments/?${qs.toString()}`);
  } catch (_) {
    const res = await fetch(`${SOKUJA_BASE}/api/comments/?${qs.toString()}`, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', 'Accept': 'application/json' },
      cache: 'no-store'
    });
    if (!res.ok) throw new Error(`Comments error: ${res.status}`);
    return res.json();
  }
}
