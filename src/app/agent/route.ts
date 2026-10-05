/**
 * GET /agent
 *
 * Machine-readable API manifest for AI agents and developer tooling.
 * Contains: architecture overview, route definitions, parameters,
 * response schemas, usage examples, and system behavior details.
 *
 * Static JSON response — no Node.js runtime required, safe for Edge.
 */

const MANIFEST = {
  name: 'Z-SCRAPE Sokuja API',
  version: '1.0.0',
  description:
    'Public REST API providing structured anime data scraped from sokuja.uk. Covers latest releases, ongoing/completed anime, genres, search, schedule, anime detail, and episode streaming/download links. No API key or authentication required.',
  baseUrl: 'https://rino-eosin.vercel.app',
  language: 'id',

  auth: {
    required: false,
    note: 'All Vercel endpoints are publicly accessible (CORS: *). An API key is used exclusively for internal server-to-server communication (Vercel → Cloudflare Worker via X-API-Key header). Clients must never call the Worker directly.'
  },

  architecture: {
    summary:
      'Vercel acts as the primary scraper (fetches raw HTML and parses it with Cheerio). The Cloudflare Worker serves as a proxy/mirror layer only (bypasses Cloudflare protection and Vercel IP blocks on the origin).',
    flow: [
      '1. The client (e.g., a mobile app) calls https://rino-eosin.vercel.app/api/* only.',
      '2. Vercel fetches raw HTML from the Worker endpoint /proxy/html/* (the Worker forwards the request to sokuja.uk with browser-like headers).',
      '3. Vercel parses the HTML using Cheerio and returns structured JSON to the client.',
      '4. For video streaming: Vercel calls the Worker at /proxy/api/api/video-mirrors?e={episodeId} to retrieve direct MP4 URLs hosted on storages.sokuja.uk.',
      '5. The client plays the MP4 URL directly (supports HTTP Range/seek). The /api/proxy/stream/* endpoint is a fallback for cases where direct access fails.'
    ],
    components: {
      vercel: 'Next.js 14 App Router (Node.js runtime). Handles scraping, /tmp file caching, and AniList enrichment on the detail endpoint.',
      worker: 'Single-file Cloudflare Worker (cf-worker/index.js). Contains no scraping logic — only 3 proxies: /proxy/html/*, /proxy/api/*, /proxy/stream/*, and a /health check. Private; requires X-API-Key.',
      workerUrl: 'https://otakuproxy.azizkalimorgo.workers.dev'
    }
  },

  conventions: {
    envelopes: [
      {
        name: 'sokuja',
        usedBy: 'Most Vercel endpoints (/api/anime/*, /api/genres)',
        shape: '{ status: "success", author: "Z-SCRAPE", message: string, timestamp: ISOString, data: object }'
      },
      {
        name: 'worker',
        usedBy: 'Internal Worker endpoints (not intended for public clients)',
        shape: '{ creator: "Z-SCRAPE", statusCode: 200, ok: true, message: string, data: object, pagination?: object }'
      }
    ],
    errors: '{ status: "error", author: "Z-SCRAPE", message: string, timestamp: ISOString } with appropriate HTTP status codes (400 for validation errors, 404 for not found, 500 for upstream failures).',
    slugs: {
      anime: 'Anime slugs do NOT include the "-subtitle-indonesia" suffix when calling Vercel detail endpoints — the route appends it automatically. Example: "tensei-shitara-slime-datta-ken-season-4". Follow the example in each route definition.',
      episode: 'Episode slugs MUST include the "-subtitle-indonesia" suffix. Example: "tensei-shitara-slime-datta-ken-season-4-episode-24-subtitle-indonesia". Pass them as-is.'
    },
    caching: 'Vercel responses are edge-cached (s-maxage=300, stale-while-revalidate=600). List data is fresh within ~5 minutes. Avoid aggressive polling.',
    rateLimit: 'The Worker enforces a limit of 100 requests/minute per IP (server-to-server only, not client-facing). Use cached responses; do not spam.'
  },

  routes: [
    {
      path: '/api/anime/home',
      method: 'GET',
      description: 'Returns homepage data: up to 18 latest episode releases, top 10 weekly popular anime, and an archive of available seasons.',
      params: [],
      example: 'GET /api/anime/home',
      response: 'data: { totalLatest, latest[{title, slug, episodeNumber, url, thumbnail}], popular[{rank, title, type, status, year, score, views, slug, thumbnail}], seasons[{year}] }'
    },
    {
      path: '/api/anime/ongoing',
      method: 'GET',
      description: 'Returns a paginated list of currently airing anime.',
      params: [{ name: 'page', in: 'query', required: false, default: 1, example: '?page=2' }],
      example: 'GET /api/anime/ongoing?page=1',
      response: 'data: { total, list[{title, slug, url, type, thumbnail}] }'
    },
    {
      path: '/api/anime/completed',
      method: 'GET',
      description: 'Returns a paginated list of completed (finished) anime series.',
      params: [{ name: 'page', in: 'query', required: false, default: 1, example: '?page=2' }],
      example: 'GET /api/anime/completed?page=1',
      response: 'data: { total, list[{title, slug, url, type, thumbnail}] }'
    },
    {
      path: '/api/anime/genre',
      method: 'GET',
      description: 'Returns a paginated list of anime filtered by a specific genre slug.',
      params: [
        { name: 'slug', in: 'query', required: true, example: '?slug=action' },
        { name: 'page', in: 'query', required: false, default: 1 }
      ],
      example: 'GET /api/anime/genre?slug=action&page=1',
      response: 'data: { filters, total, list[{title, slug, url, type, thumbnail}] }'
    },
    {
      path: '/api/anime/search',
      method: 'GET',
      description: 'Searches for anime by keyword. Returns a paginated list of matching results.',
      params: [
        { name: 'q', in: 'query', required: true, example: '?q=one+piece' },
        { name: 'page', in: 'query', required: false, default: 1 }
      ],
      example: 'GET /api/anime/search?q=one+piece',
      response: 'data: { filters, total, list[{title, slug, url, type, thumbnail}] }'
    },
    {
      path: '/api/anime/schedule',
      method: 'GET',
      description: 'Returns the weekly anime release schedule, grouped by day (Monday through Sunday).',
      params: [],
      example: 'GET /api/anime/schedule',
      response: 'data: { schedule: { Senin: [{title, slug, url, time, thumbnail}], ... } }'
    },
    {
      path: '/api/anime/filter',
      method: 'GET',
      description: 'Returns a filtered and paginated list of anime based on status, type, and sort order.',
      params: [
        { name: 'status', in: 'query', required: false, default: 'ongoing', example: 'ongoing|completed' },
        { name: 'type', in: 'query', required: false, default: '', example: 'tv|movie' },
        { name: 'order', in: 'query', required: false, default: 'update', example: 'update' },
        { name: 'page', in: 'query', required: false, default: 1 }
      ],
      example: 'GET /api/anime/filter?status=ongoing&type=tv&order=update&page=1',
      response: 'data: { filters, total, list[{title, slug, url, type, thumbnail}] }'
    },
    {
      path: '/api/anime/list-mode',
      method: 'GET',
      description: 'Returns a full A–Z catalog of all available anime titles.',
      params: [],
      example: 'GET /api/anime/list-mode',
      response: 'data: { alphabet: ["A", ...], catalog: { A: [{title, slug, url}], ... } }'
    },
    {
      path: '/api/genres',
      method: 'GET',
      description: 'Returns a list of all available anime genres.',
      params: [],
      example: 'GET /api/genres',
      response: 'data: { total, genres[{name, slug, url}] }'
    },
    {
      path: '/api/anime/detail/{slug}',
      method: 'GET',
      description: 'Returns full anime metadata including the episode list. Data is enriched with AniList (English/Romaji/Native titles, clean synopsis, score, studios, staff, characters, and related works).',
      params: [{ name: 'slug', in: 'path', required: true, example: 'tensei-shitara-slime-datta-ken-season-4' }],
      example: 'GET /api/anime/detail/tensei-shitara-slime-datta-ken-season-4',
      response: 'data: { title, titleRomaji, titleEnglish, titleNative, poster, synopsis, genres[], score, status, type, year, season, studio, cast[], totalEpisodes, episodes[{number, title, slug, url}], anilist:{id, score, status, totalEpisodes, coverImage, bannerImage, studios[], staff[], characters[], relations[], externalLinks[]} }',
      notes: 'If no AniList match is found, the anilist field will be null. Sokuja data is always returned regardless.'
    },
    {
      path: '/api/anime/episode/{slug}',
      method: 'GET',
      description: 'Returns episode detail including direct MP4 stream URLs (480p/720p/1080p), download links, and prev/next navigation.',
      params: [{ name: 'slug', in: 'path', required: true, example: 'tensei-shitara-slime-datta-ken-season-4-episode-24-subtitle-indonesia' }],
      example: 'GET /api/anime/episode/tensei-shitara-slime-datta-ken-season-4-episode-24-subtitle-indonesia',
      response: 'data: { title, slug, episodeId, anime{title, slug, url}, thumbnail, uploadDate, views, navigation{prev, next, allEpisodes}, mirrors[{id, server, quality, type, url, source, direct}], downloads[{quality, link}] }',
      notes: 'mirrors[].url points to a direct MP4 file on storages.sokuja.uk — play it directly in a media player with HTTP Range support for seeking. downloads[].link points to sokuja.id mirror servers.'
    },
    {
      path: '/api/proxy/stream/{encodedTargetUrl}',
      method: 'GET',
      description: 'Fallback video proxy via the Cloudflare Worker (forwards Range headers). Use only when a direct MP4 URL is inaccessible from the client.',
      params: [{ name: 'encodedTargetUrl', in: 'path', required: true, example: '/api/proxy/stream/https%3A%2F%2Fstorages.sokuja.uk%2F...%2Fvideo-720p-xxx.mp4' }],
      example: 'GET /api/proxy/stream/https%3A%2F%2Fstorages.sokuja.uk%2F...mp4 (include Range header for seeking)',
      response: 'Binary video/mp4 stream with Accept-Ranges and Content-Range headers. Not JSON.'
    }
  ],

  playerGuide: {
    for: 'Android apps (ExoPlayer/Media3) or web-based video players',
    steps: [
      '1. Call GET /api/anime/episode/{slug} to retrieve the mirrors[] array.',
      '2. Select the desired quality (start with 480p for faster initial load, upgrade to 720p/1080p as needed).',
      '3. Play mirrors[].url directly, passing Referer: https://x6.sokuja.uk/ and a browser-like User-Agent header.',
      '4. Enable disk caching on the player (~500MB) for instant seeking and reduced bandwidth usage.',
      '5. On 403/404: fall back to GET /api/proxy/stream/{encodeURIComponent(mirrors[].url)} and forward the Range header.',
      '6. Prefetch: while the user browses a list, prefetch detail and episode data for the next 3 items in the background.'
    ]
  },

  quickstart: [
    'curl https://rino-eosin.vercel.app/api/anime/home',
    'curl "https://rino-eosin.vercel.app/api/anime/search?q=one+piece"',
    'curl https://rino-eosin.vercel.app/api/anime/detail/tensei-shitara-slime-datta-ken-season-4',
    'curl https://rino-eosin.vercel.app/api/anime/episode/tensei-shitara-slime-datta-ken-season-4-episode-24-subtitle-indonesia'
  ],

  workerEndpointsInternal: {
    note: 'For server-side use only (requires X-API-Key header). Do NOT call these from client applications.',
    endpoints: [
      'GET /health -> { status: "ok", timestamp }',
      'GET /proxy/html/{encodedPath} -> Raw HTML from sokuja.uk (bypasses Cloudflare protection)',
      'GET /proxy/api/{encodedPath} -> Internal sokuja.uk JSON API (e.g. /api/video-mirrors?e=10854)',
      'GET /proxy/stream/{encodedUrl} -> Binary video stream with Range support'
    ]
  }
};

export async function GET() {
  return Response.json(MANIFEST, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400'
    }
  });
}
