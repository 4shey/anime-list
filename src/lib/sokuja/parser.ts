import * as cheerio from 'cheerio';

const SOKUJA_BASE = 'https://x6.sokuja.uk';

function cleanImageUrl(img: string): string {
  if (!img) return '';
  const match = img.match(/url=([^&]+)/);
  if (match) {
    const decoded = decodeURIComponent(match[1]);
    return decoded.startsWith('http') ? decoded : `${SOKUJA_BASE}${decoded.startsWith('/') ? '' : '/'}${decoded}`;
  }
  return img.startsWith('http') ? img : `${SOKUJA_BASE}${img.startsWith('/') ? '' : '/'}${img}`;
}

function extractRscPayload(html: string): string {
  const chunks = html.split('self.__next_f.push([1,');
  let full = '';
  for (let i = 1; i < chunks.length; i++) {
    let c = chunks[i];
    const end = c.lastIndexOf('])');
    if (end !== -1) c = c.slice(0, end);
    try { full += JSON.parse(c); } catch (_) {}
  }
  return full;
}

function extractJsonLd(html: string): any[] {
  const $ = cheerio.load(html);
  const results: any[] = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    try { results.push(JSON.parse($(el).html() || '{}')); } catch (_) {}
  });
  return results;
}

/** Komentar SOKUJA selalu berada di satu-satunya container `divide-y` di halaman. */
function extractComments($: cheerio.CheerioAPI) {
  const heading = $('h2, h3').filter((_, el) => /^komentar/i.test($(el).text().trim())).first();
  const countMatch = heading.text().match(/\((\d+)\)/);
  const count = countMatch ? parseInt(countMatch[1], 10) : 0;

  const parseBlock = (el: any) => {
    const $el = $(el);
    const author = $el.find('span.text-sm.font-medium').first().text().trim();
    const body = $el.find('div.mt-1').first().text().trim();
    const time = $el.find('span.text-xs').first().text().trim() || null;
    const badge = $el.find('span.rounded').first().text().trim() || null;
    return {
      author: author || 'Anonim',
      avatar: (author || '?').trim().charAt(0).toUpperCase(),
      badge,
      time,
      body,
      replies: [] as any[]
    };
  };

  const items: any[] = [];
  const container = $('div').filter((_, el) => {
    const cl = ($(el).attr('class') || '').split(/\s+/);
    return cl.includes('divide-y');
  }).last();

  if (container.length) {
    container.children('div').each((_, child) => {
      // Balasan berada di dalam container `ml-6 border-l` (bisa bersarang) — hitung tingkatnya
      const blocks: { el: any; depth: number }[] = [];
      $(child).find('div.py-3').each((_i, block) => {
        let depth = 0;
        let p: any = block.parent;
        while (p && p !== child) {
          if (/\bml-6\b/.test($(p).attr('class') || '')) depth++;
          p = p.parent;
        }
        blocks.push({ el: block, depth });
      });
      if (!blocks.length) return;

      const stack: { list: any[]; depth: number }[] = [{ list: items, depth: -1 }];
      blocks.forEach(b => {
        while (stack.length > 1 && stack[stack.length - 1].depth >= b.depth) stack.pop();
        const node = parseBlock(b.el);
        stack[stack.length - 1].list.push(node);
        stack.push({ list: node.replies, depth: b.depth });
      });
    });
  }

  return { count: count || items.length, items };
}

/** Meta pagination komentar dari payload RSC (untuk tombol "Muat Lebih Banyak"). */
export function extractCommentMeta(html: string) {
  const i = html.indexOf('nextCursor');
  if (i < 0) return null;
  const win = html.slice(Math.max(0, i - 350), i + 500);
  const get = (re: RegExp) => {
    const m = win.match(re);
    return m ? m[1] : null;
  };
  const cursor = get(/\\?"nextCursor\\?":(null|\d+)/);
  const hasMore = get(/\\?"hasMore\\?":(true|false)/);
  const total = get(/\\?"totalComments\\?":(\d+)/);
  if (cursor === null || hasMore === null) return null;
  const epId = get(/\\?"episodeId\\?":(\d+)/);
  const anId = get(/\\?"animeId\\?":(\d+)/);
  return {
    episodeId: epId ? parseInt(epId, 10) : null,
    animeId: anId ? parseInt(anId, 10) : null,
    nextCursor: cursor === 'null' ? null : parseInt(cursor, 10),
    hasMore: hasMore === 'true',
    totalComments: total ? parseInt(total, 10) : null
  };
}

export function parseHome(html: string) {
  const $ = cheerio.load(html);
  const rsc = extractRscPayload(html);

  const latest: any[] = [];
  const epRegex = /href":"\/([^"]+-episode-[^"]+)".*?"src":"([^"]+)","alt":"([^"]+)".*?children":\["EP ","([^"]+)"\]/g;
  let m;
  while ((m = epRegex.exec(rsc)) !== null) {
    const slug = m[1].replace(/^\/|\/$/g, '');
    if (!latest.some(e => e.slug === slug)) {
      latest.push({
        title: `${m[3].trim()} Episode ${m[4]}`,
        slug,
        episodeNumber: parseInt(m[4], 10),
        url: `https://x6.sokuja.uk/${slug}/`,
        thumbnail: cleanImageUrl(m[2])
      });
    }
  }

  let popular: any[] = [];
  const popMatch = rsc.match(/"weekly":\s*(\[[^\]]+\])/);
  if (popMatch) {
    try {
      popular = JSON.parse(popMatch[1]).map((item: any, idx: number) => ({
        rank: idx + 1,
        id: item.id,
        title: item.title,
        type: item.type || 'TV',
        status: item.status || 'Ongoing',
        year: item.year || null,
        score: item.score ? parseFloat(item.score) : null,
        views: item.viewCount || 0,
        slug: item.slug,
        url: `https://x6.sokuja.uk/anime/${item.slug}/`,
        thumbnail: cleanImageUrl(item.thumbnailUrl || item.coverUrl)
      }));
    } catch (_) {}
  }

  const $home = cheerio.load(html);
  const seasons: any[] = [];
  $home('aside button span.font-medium, a[href*="/season/"]').each((_, el) => {
    const text = $home(el).text().trim();
    if (text && /^\d{4}$/.test(text)) {
      seasons.push({ year: parseInt(text, 10), url: `https://x6.sokuja.uk/season/${text}/` });
    }
  });

  return {
    status: 'success',
    author: 'Z-SCRAPE',
    message: 'Home data OK',
    timestamp: new Date().toISOString(),
    data: {
      totalLatest: latest.length,
      latest: latest.slice(0, 18),
      popular: popular.slice(0, 10),
      seasons: seasons.slice(0, 10)
    }
  };
}

export function parseAnimeDetail(html: string, slug: string) {
  const $ = cheerio.load(html);
  const jsonLd = extractJsonLd(html);
  const meta = jsonLd.find(d => d['@type'] === 'TVSeries') || {};

  const title = $('h1').text().replace('Subtitle Indonesia', '').trim() || meta.name || slug;
  const altTitle = meta.alternateName || $('p.text-sm.text-gray-400').first().text().trim() || null;
  const score = meta.aggregateRating?.ratingValue || $('span.text-2xl.font-bold').first().text().trim() || null;
  const ratingCount = meta.aggregateRating?.ratingCount || null;
  const poster = meta.image || $('img[alt="' + title + '"]').attr('src') || $('img').eq(1).attr('src') || null;
  const synopsis = meta.description || $('div.prose p').text().trim() || null;
  const rawGenres: any = meta.genre || $('a[href*="/genre/"]').map((_, el) => $(el).text().trim()).get();
  const genres: string[] = (Array.isArray(rawGenres) ? rawGenres : [rawGenres])
    .filter((g: any) => typeof g === 'string' && g.trim().length > 0);

  const info: Record<string, string> = {};
  $('dl div').each((_, el) => {
    const key = $(el).find('dt').text().trim().toLowerCase();
    const val = $(el).find('dd').text().trim();
    if (key && val) info[key] = val;
  });

  const cast: any[] = [];
  $('a[href*="/cast/"]').each((_, el) => {
    const name = $(el).text().trim();
    const slug = $(el).attr('href')?.replace(/^\/cast\/|\/$/g, '');
    if (name && slug && !cast.some(c => c.slug === slug)) {
      cast.push({ name, slug, url: `https://x6.sokuja.uk/cast/${slug}/` });
    }
  });

  // --- Kumpulkan episode: episode milik anime ini vs episode anime lain ---
  const EPISODE_SELECTOR = 'a[href*="-episode-"], a[href*="-subtitle-indonesia"]';
  const EXCLUDE_PATHS = /\/(anime|genre|cast|studio|tag|category|season|page|director|character)\//;
  const SUBTITLE_SUFFIX = '-subtitle-indonesia';

  const toPath = (href: string) =>
    href.replace(/^https?:\/\/[^/]+/, '').split(/[?#]/)[0].replace(/^\/+|\/+$/g, '');

  const prefixOf = (epSlug: string) => {
    const m = epSlug.match(/^(.+?)-episode-/);
    if (m) return m[1];
    return epSlug.replace(/-subtitle-indonesia$/i, '').replace(/-subtitle$/i, '');
  };

  const animeSlug = toPath(slug);
  const ownPrefix = animeSlug.replace(/-subtitle-indonesia$/i, '').toLowerCase();

  const buildEpisode = ($el: any, epSlug: string) => {
    const spans = $el.find('span');
    const epTitle = (spans.length ? spans.eq(0).text() : $el.text()).trim().replace(/\s+/g, ' ') || epSlug;
    const epTime = spans.length > 1
      ? spans.eq(1).text().trim()
      : ($el.find('span.text-xs, span.text-gray-400, time').first().text().trim() || 'Tersedia');
    const numFromSlug = epSlug.match(/episode-(\d+)/i);
    const numFromTitle = epTitle.match(/episode\s*(\d+)/i);
    const numMatch = numFromSlug || numFromTitle;
    return {
      number: numMatch ? parseInt(numMatch[1], 10) : 0,
      title: epTitle,
      slug: epSlug,
      url: `https://x6.sokuja.uk/${epSlug}/`,
      released: epTime || 'Tersedia'
    };
  };

  // Section "Daftar Episode" (h2) -> naik maksimal 3 tingkat sampai berisi link episode
  const epHeading = $('h2, h3').filter((_, el) => /^daftar episode/i.test($(el).text().trim())).first();
  let episodeSection: any = null;
  if (epHeading.length) {
    let node: any = epHeading;
    for (let i = 0; i < 3; i++) {
      const parent = node.parent();
      if (!parent.length) break;
      node = parent;
      if (node.find(EPISODE_SELECTOR).length > 0) {
        episodeSection = node;
        break;
      }
    }
  }

  const ownRoot = episodeSection && episodeSection.length
    ? episodeSection
    : ($('main').length ? $('main') : $('body'));

  const scopeEl = ownRoot && ownRoot.length ? ownRoot[0] : null;
  const isInsideOwnScope = (el: any) => {
    let cur = el;
    while (cur) {
      if (cur === scopeEl) return true;
      cur = cur.parent;
    }
    return false;
  };

  // Episode asli (dari section Daftar Episode / main)
  const episodes: any[] = [];
  ownRoot.find(EPISODE_SELECTOR).each((_i: number, el: any) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (EXCLUDE_PATHS.test(href)) return;
    const epSlug = toPath(href);
    if (!epSlug || episodes.some(e => e.slug === epSlug)) return;
    episodes.push(buildEpisode($el, epSlug));
  });
  episodes.sort((a, b) => a.number - b.number);

  // Lengkapi dari payload RSC: halaman SOKUJA biasanya hanya me-render ~50 episode pertama
  // di DOM, sedangkan daftar lengkapnya ikut terkirim di script RSC.
  const rscPayload = extractRscPayload(html);
  if (rscPayload) {
    const rscRe = /"slug":"([^"]*-episode-\d+[^"]*)","title":"([^"]*)","episodeNumber":(\d+)/g;
    let rscMatch: RegExpExecArray | null;
    while ((rscMatch = rscRe.exec(rscPayload)) !== null) {
      const epSlug = rscMatch[1].replace(/^\/+|\/+$/g, '');
      if (prefixOf(epSlug).toLowerCase() !== ownPrefix) continue;
      if (episodes.some(e => e.slug === epSlug)) continue;
      episodes.push({
        number: parseInt(rscMatch[3], 10),
        title: rscMatch[2] || `${title} Episode ${rscMatch[3]}`,
        slug: epSlug,
        url: `https://x6.sokuja.uk/${epSlug}/`,
        released: 'Tersedia'
      });
    }
    episodes.sort((a, b) => a.number - b.number);
  }

  // Total episode sebenarnya dari heading "Daftar Episode (N)"
  const countMatch = epHeading.length ? epHeading.text().match(/\((\d+)\)/) : null;
  const episodeCount = countMatch ? parseInt(countMatch[1], 10) : episodes.length;

  // Episode anime lain (sidebar Komentar Terbaru, dll) -> dikelompokkan per anime
  const otherTitles: Record<string, string> = {};
  const otherGroups: Record<string, any[]> = {};
  $(EPISODE_SELECTOR).each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (EXCLUDE_PATHS.test(href)) return;
    if (isInsideOwnScope(el)) return;
    const epSlug = toPath(href);
    if (!epSlug) return;
    const prefix = prefixOf(epSlug);
    if (!prefix || prefix.toLowerCase() === ownPrefix) return;
    if (episodes.some(e => e.slug === epSlug)) return;

    if (!otherGroups[prefix]) otherGroups[prefix] = [];
    if (otherGroups[prefix].some(e => e.slug === epSlug)) return;

    const label = $el.text().trim().replace(/\s+/g, ' ');
    if (!otherTitles[prefix]) {
      otherTitles[prefix] = label.replace(/\s*Ep(?:isode)?\s*\d+.*$/i, '').trim()
        || prefix.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    }

    const ep = buildEpisode($el, epSlug);
    if (!ep.number) {
      const num = label.match(/Ep(?:isode)?\s*(\d+)/i);
      ep.number = num ? parseInt(num[1], 10) : otherGroups[prefix].length + 1;
      ep.title = label;
    }
    otherGroups[prefix].push(ep);
  });

  const otherEpisodeGroups = Object.entries(otherGroups).map(([prefix, eps]) => ({
    animeSlug: prefix,
    title: otherTitles[prefix] || prefix,
    totalEpisodes: eps.length,
    episodes: eps
  }));

  // Anime Terkait: kartu poster dari section "Anime Terkait" (hanya yang punya gambar)
  const relatedAnime: any[] = [];
  const terkaitHeading = $('h2, h3').filter((_, el) => /^anime terkait/i.test($(el).text().trim())).first();
  if (terkaitHeading.length) {
    terkaitHeading.parent().find('a[href*="/anime/"]').each((_, el) => {
      const $a = $(el);
      const href = $a.attr('href') || '';
      if (href.includes('?')) return;
      const relSlug = toPath(href).replace(/^anime\//, '');
      if (!relSlug || relSlug === 'list-mode') return;
      if (relSlug.replace(/-subtitle-indonesia$/i, '').toLowerCase() === ownPrefix) return;
      if (relatedAnime.some(a => a.slug === relSlug)) return;

      const img = $a.find('img').first();
      const rawImg = img.attr('src') || (img.attr('srcset') || '').split(' ')[0] || '';
      const thumbnail = cleanImageUrl(rawImg);
      if (!thumbnail) return;

      const spans = $a.find('span').map((_i, s) => $(s).text().trim()).get();
      const type = spans.find(t => /^(TV|Movie|OVA|ONA|Special|Music)$/i.test(t));
      const scoreText = spans.find(t => t.includes('★'));
      const scoreMatch = scoreText?.match(/(\d+(?:\.\d+)?)/);
      const yearMatch = $a.find('p').first().text().match(/\d{4}/);

      relatedAnime.push({
        title: $a.find('h3').first().text().trim() || img.attr('alt')?.trim() || relSlug,
        slug: relSlug,
        url: `https://x6.sokuja.uk/anime/${relSlug}/`,
        thumbnail,
        ...(type ? { type } : {}),
        ...(scoreMatch ? { score: parseFloat(scoreMatch[1]) } : {}),
        ...(yearMatch ? { year: parseInt(yearMatch[0], 10) } : {})
      });
    });
  }

  const comments = extractComments($);

  return {
    status: 'success',
    author: 'Z-SCRAPE',
    message: `Detail anime '${title}' OK`,
    timestamp: new Date().toISOString(),
    data: {
      title,
      altTitle,
      slug: animeSlug.replace(/^anime\//, ''),
      url: `https://x6.sokuja.uk/anime/${animeSlug.replace(/^anime\//, '')}/`,
      poster: cleanImageUrl(poster),
      score: score ? parseFloat(score) : null,
      ratingCount,
      status: info['status'] || 'Ongoing',
      type: info['tipe'] || 'TV',
      year: info['tahun'] || null,
      season: info['musim'] || null,
      studio: info['studio'] || null,
      director: info['sutradara'] || null,
      producer: info['produser'] || null,
      fansub: info['fansub'] || 'SOKUJA.NET',
      duration: info['durasi'] || null,
      subtitle: info['subtitle'] || 'Sub',
      genres: [...new Set(genres)],
      synopsis,
      cast,
      totalEpisodes: episodes.length,
      episodeCount,
      episodes,
      hasEpisodeSection: !!episodeSection,
      otherEpisodeGroups,
      relatedAnime,
      comments: comments.items,
      commentCount: comments.count,
      commentMeta: extractCommentMeta(html)
    }
  };
}

export function parseEpisodeDetail(html: string, slug: string) {
  const $ = cheerio.load(html);
  const jsonLd = extractJsonLd(html);
  const meta = jsonLd.find(d => d['@type'] === 'TVEpisode') || {};

  const title = $('h1').text().replace('Subtitle Indonesia', '').trim() || meta.name || slug;
  const animeTitle = meta.partOfSeries?.name || $('nav a[href*="/anime/"]').text().trim() || null;
  const animeUrl = meta.partOfSeries?.url || $('nav a[href*="/anime/"]').attr('href') || null;
  const animeSlug = animeUrl ? animeUrl.replace(/.*\/anime\/|\/$/g, '') : null;
  const uploadDate = meta.uploadDate || $('span:contains("202")').first().text().trim() || null;
  const views = meta.interactionStatistic?.userInteractionCount || $('span:contains("views")').text().trim() || null;
  const thumbnail = meta.thumbnailUrl || $('img[fetchpriority="high"]').attr('src') || null;

  const epIdMatch = html.match(/episodeId[^\d]{1,10}(\d+)/i);
  const episodeId = epIdMatch ? parseInt(epIdMatch[1], 10) : null;

  // Will be populated from API separately (Vercel episode route fetches mirrors via worker proxy/api)

  // Fallback scrape from HTML
  const scraped = scrapeStreamsFromHtml(html);
  const seen = new Set();
  const mirrors2 = scraped.filter(s => {
    if (!s.url) return false;
    const key = s.url.split('?')[0];
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  // Download links
  const downloads: any[] = [];
  $('a[href*="sokuja.id/x.php"], a:contains("Download")').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href');
    const quality = $el.find('span').text().trim() || $el.text().trim();
    if (href && (href.includes('x.php') || href.includes('http'))) {
      downloads.push({ quality: quality.replace(/Download/i, '').trim() || 'Default', link: href });
    }
  });

  const prevSlug = $('a:contains("Episode Sebelumnya")').attr('href')?.replace(/^\/|\/$/g, '') || null;
  const nextSlug = $('a:contains("Episode Selanjutnya")').attr('href')?.replace(/^\/|\/$/g, '') || null;

  // Kartu "Informasi Series" (poster + sinopsis + genre anime) — cadangan bila fetch halaman anime gagal
  const infoHeading = $('h2').filter((_, el) => /informasi\s*series/i.test($(el).text())).first();
  let infoCard: any = null;
  if (infoHeading.length) {
    let node: any = infoHeading;
    for (let i = 0; i < 4 && node.length; i++) {
      node = node.parent();
      if (node.find('a[href*="/anime/"]').length && node.find('p').length) {
        infoCard = node;
        break;
      }
    }
  }

  const seriesPosterRaw = infoCard
    ? (infoCard.find('a[href*="/anime/"] img').first().attr('src') ||
       (infoCard.find('a[href*="/anime/"] img').first().attr('srcset') || '').split(' ')[0] || '')
    : '';
  const seriesSynopsis = infoCard
    ? (infoCard.find('p').first().text().trim() || meta.description || null)
    : (meta.description || null);
  const seriesGenres: string[] = infoCard
    ? infoCard.find('a[href*="/genre/"]').map((_: number, g: any) => $(g).text().trim()).get().filter(Boolean)
    : [];
  const comments = extractComments($);

  return {
    status: 'success',
    author: 'Z-SCRAPE',
    message: `Episode '${title}' OK`,
    timestamp: new Date().toISOString(),
    data: {
      title,
      slug: slug.replace(/^\/|\/$/g, ''),
      episodeId: episodeId,
      anime: { title: animeTitle, slug: animeSlug, url: animeSlug ? `https://x6.sokuja.uk/anime/${animeSlug}/` : null },
      series: {
        title: animeTitle,
        slug: animeSlug,
        poster: seriesPosterRaw ? cleanImageUrl(seriesPosterRaw) : null,
        synopsis: seriesSynopsis,
        genres: [...new Set(seriesGenres)]
      },
      thumbnail: cleanImageUrl(thumbnail),
      uploadDate,
      views: typeof views === 'number' ? views : (views ? parseInt(views.replace(/\D/g, '')) || null : null),
      navigation: {
        prev: prevSlug ? { slug: prevSlug, url: `https://x6.sokuja.uk/${prevSlug}/` } : null,
        next: nextSlug ? { slug: nextSlug, url: `https://x6.sokuja.uk/${nextSlug}/` } : null,
        allEpisodes: animeSlug ? `https://x6.sokuja.uk/anime/${animeSlug}/` : null
      },
      mirrors: mirrors2,
      downloads,
      comments: comments.items,
      commentCount: comments.count,
      commentMeta: extractCommentMeta(html)
    }
  };
}

function scrapeStreamsFromHtml(html: string) {
  const $ = cheerio.load(html);
  const streams: any[] = [];
  const patterns = [
    /"url"\s*:\s*"([^"]+\.(m3u8|mp4)[^"]*)"/gi,
    /"file"\s*:\s*"([^"]+\.(m3u8|mp4)[^"]*)"/gi,
    /"src"\s*:\s*"([^"]+\.(m3u8|mp4)[^"]*)"/gi,
    /source\s*:\s*["']([^"']+\.(m3u8|mp4)[^"']*)["']/gi,
    /video\s*:\s*["']([^"']+\.(m3u8|mp4)[^"']*)["']/gi,
    /https?:\/\/[^\s"']+\.(m3u8|mp4)/gi
  ];

  $('script').each((_, el) => {
    const content = $(el).html() || '';
    patterns.forEach(pattern => {
      let match;
      while ((match = pattern.exec(content)) !== null) {
        const url = match[1] || match[0];
        if (url && url.startsWith('http') && !url.includes('google')) {
          streams.push({
            url,
            quality: url.includes('1080') ? '1080p' : url.includes('720') ? '720p' : url.includes('480') ? '480p' : 'auto',
            type: url.includes('.m3u8') ? 'hls' : 'mp4',
            server: 'Scraped',
            source: 'html'
          });
        }
      }
    });
  });
  return streams;
}

export function parseAnimeFilter(html: string, filters: { status: string; type: string; order: string; page: number }) {
  const $ = cheerio.load(html);
  const list: any[] = [];

  $('main a[href*="/anime/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (href === '/anime/' || href === '/anime/list-mode/') return;
    const slug = href.replace(/^\/anime\/|\/$/g, '');
    const title = $el.find('p, h3, div.text-sm').first().text().trim() || $el.attr('title') || '';
    const img = $el.find('img').attr('src') || $el.find('img').attr('srcset') || '';
    const typeTag = $el.find('span:contains("TV"), span:contains("Movie"), span:contains("OVA"), span:contains("ONA"), span:contains("Special")').first().text().trim() || 'TV';
    const scoreEl = $el.find('span:contains("★"), span[class*="score"]').text().replace('★', '').trim();
    if (slug && title && !list.some(a => a.slug === slug)) {
      list.push({ title, slug, url: `https://x6.sokuja.uk/anime/${slug}/`, type: typeTag, score: scoreEl || null, thumbnail: cleanImageUrl(img) });
    }
  });

  // Coba ambil total anime dari halaman (contoh: "771 anime ditemukan")
  const totalText = $('main p, main span, main div').filter((_, el) => /\d+\s*anime ditemukan/i.test($(el).text())).first().text();
  const totalMatch = totalText.match(/(\d+)/);
  const totalAnime = totalMatch ? parseInt(totalMatch[1]) : list.length;

  // Coba ambil total halaman dari pagination
  const lastPageLink = $('a[href*="page="]').last().attr('href');
  const lastPageMatch = lastPageLink?.match(/page=(\d+)/);
  const totalPages = lastPageMatch ? parseInt(lastPageMatch[1]) : Math.ceil(totalAnime / 24);

  return {
    status: 'success',
    author: 'Z-SCRAPE',
    message: 'Filter OK',
    timestamp: new Date().toISOString(),
    data: { filters: { status: filters.status, type: filters.type, order: filters.order, page: filters.page }, total: totalAnime, totalPages, list }
  };
}

export function parseSchedule(html: string) {
  const $ = cheerio.load(html);
  const schedule: Record<string, any[]> = {};
  const days = ['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random / Belum Pasti', 'Libur', 'Hiatus', 'Sudah Selesai (END)'];

  $('main h2').each((_, el) => {
    const day = $(el).text().trim();
    if (!['Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu', 'Minggu', 'Random / Belum Pasti', 'Libur', 'Hiatus', 'Sudah Selesai (END)'].includes(day)) return;
    const container = $(el).parent().parent();
    const animes: any[] = [];
    container.find('a[href*="/anime/"]').each((_, a) => {
      const $a = $(a);
      const href = $a.attr('href') || '';
      const slug = href.replace(/^\/anime\/|\/$/g, '');
      const title = $a.find('h3').text().trim() || $a.text().replace(/\d{2}:\d{2}\s*WIB/i, '').replace(/TV|Movie/i, '').trim();
      const img = $a.find('img').attr('src') || '';
      const timeMatch = $a.text().match(/(\d{2}:\d{2}\s*WIB)/i);
      const time = timeMatch ? timeMatch[1] : ($a.find('span.text-primary').text().trim() || 'TBA');
      if (slug && title && !animes.some(item => item.slug === slug)) {
        animes.push({ title, slug, url: `https://x6.sokuja.uk/anime/${slug}/`, time, thumbnail: cleanImageUrl(img) });
      }
    });
    if (animes.length > 0) schedule[day] = animes;
  });

  return { status: 'success', author: 'Z-SCRAPE', message: 'Schedule OK', timestamp: new Date().toISOString(), data: { schedule } };
}

export function parseGenres(html: string) {
  const $ = cheerio.load(html);
  const genres: any[] = [];

  $('main a[href*="/genre/"], footer a[href*="/genre/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    const slug = href.replace(/^\/genre\/|\/$/g, '');
    const name = $el.text().trim();
    if (slug && name && !genres.some(g => g.slug === slug)) {
      genres.push({ name, slug, url: `https://x6.sokuja.uk/genre/${slug}/` });
    }
  });

  return { status: 'success', author: 'Z-SCRAPE', message: 'Genres OK', timestamp: new Date().toISOString(), data: { total: genres.length, genres } };
}

export function parseAnimeByGenre(html: string, genreSlug: string, page: number) {
  const $ = cheerio.load(html);
  const list: any[] = [];

  $('main a[href*="/anime/"]').each((_, el) => {
    const $el = $(el);
    const href = $el.attr('href') || '';
    if (href === '/anime/' || href === '/anime/list-mode/') return;
    const slug = href.replace(/^\/anime\/|\/$/g, '');
    const title = $el.find('p, h3, div.text-sm').first().text().trim() || $el.text().trim();
    const img = $el.find('img').attr('src') || '';
    const typeTag = $el.find('span:contains("TV"), span:contains("Movie")').text().trim() || 'TV';
    if (slug && title && !list.some(a => a.slug === slug)) {
      list.push({ title, slug, url: `https://x6.sokuja.uk/anime/${slug}/`, type: typeTag, thumbnail: cleanImageUrl(img) });
    }
  });

  return { status: 'success', author: 'Z-SCRAPE', message: 'Genre OK', timestamp: new Date().toISOString(), data: { genre: genreSlug, page, total: list.length, list } };
}

export function parseAnimeListMode(html: string) {
  const $ = cheerio.load(html);
  const catalog: Record<string, any[]> = {};

  $('div.space-y-6 > div, div[id]').each((_, section) => {
    const letter = $(section).find('h2, span.text-xl, div.font-bold').first().text().trim() || '#';
    const items: any[] = [];
    $(section).find('a[href*="/anime/"]').each((_, a) => {
      const $a = $(a);
      const title = $a.text().trim();
      const href = $a.attr('href') || '';
      const slug = href.replace(/^\/anime\/|\/$/g, '');
      if (slug && title) items.push({ title, slug, url: `https://x6.sokuja.uk/anime/${slug}/` });
    });
    if (items.length > 0) catalog[letter] = items;
  });

  return { status: 'success', author: 'Z-SCRAPE', message: 'A-Z OK', timestamp: new Date().toISOString(), data: { alphabet: Object.keys(catalog), catalog } };
}