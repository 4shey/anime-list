import { NextRequest, NextResponse } from 'next/server';
import { getComments } from '@/lib/sokuja/client';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const episodeId = p.get('episodeId');
  const animeId = p.get('animeId');
  const cursor = p.get('cursor');
  const limit = p.get('limit');

  if (!episodeId && !animeId) {
    return NextResponse.json({ error: 'episodeId atau animeId wajib diisi' }, { status: 400 });
  }

  try {
    const data = await getComments({
      episodeId: episodeId ? parseInt(episodeId, 10) : null,
      animeId: animeId ? parseInt(animeId, 10) : null,
      cursor: cursor && cursor !== 'null' ? parseInt(cursor, 10) : null,
      limit: limit ? parseInt(limit, 10) : 10
    });
    return NextResponse.json(data, { headers: { 'Cache-Control': 'no-store' } });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || 'Gagal memuat komentar' }, { status: 502 });
  }
}
