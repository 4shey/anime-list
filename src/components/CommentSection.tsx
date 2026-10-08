'use client';

import { useState } from 'react';
import CommentList, { CommentItem } from './CommentList';

export interface CommentMeta {
  episodeId?: number | null;
  animeId?: number | null;
  nextCursor?: number | null;
  hasMore?: boolean;
  totalComments?: number | null;
}

function relTime(iso?: string | null): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (isNaN(t)) return null;
  const min = Math.floor((Date.now() - t) / 60000);
  if (min < 1) return 'baru saja';
  if (min < 60) return `${min} menit lalu`;
  const h = Math.floor(min / 60);
  if (h < 24) return `${h} jam lalu`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d} hari lalu`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w} minggu lalu`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo} bulan lalu`;
  return `${Math.floor(d / 365)} tahun lalu`;
}

function toComment(c: any): CommentItem {
  const name = c?.authorName || c?.user?.name || c?.user?.username || 'Anonim';
  const role = String(c?.authorType || '').toLowerCase();
  const badge = c?.isAdminReply || role === 'admin' ? 'Admin' : role === 'member' ? 'Anggota' : null;
  return {
    id: typeof c?.id === 'number' ? c.id : undefined,
    parentId: typeof c?.parentId === 'number' ? c.parentId : null,
    author: name,
    avatar: name.trim().charAt(0).toUpperCase(),
    badge,
    time: relTime(c?.createdAt),
    body: String(c?.content || ''),
    replies: []
  };
}

const key = (c: CommentItem) => `${c.author}|${c.body}`;

export default function CommentSection({
  comments,
  meta
}: {
  comments?: CommentItem[] | null;
  meta?: CommentMeta | null;
}) {
  const [items, setItems] = useState<CommentItem[]>(() => comments || []);
  const [cursor, setCursor] = useState<number | null>(() => meta?.nextCursor ?? null);
  const [hasMore, setHasMore] = useState<boolean>(() => !!meta?.hasMore);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const targetId = meta?.episodeId ? `episodeId=${meta.episodeId}` : meta?.animeId ? `animeId=${meta.animeId}` : null;

  const loadMore = async () => {
    if (loading || !hasMore || !targetId) return;
    setLoading(true);
    setError(null);
    try {
      const qs = `${targetId}&limit=10${cursor != null ? `&cursor=${cursor}` : ''}`;
      const res = await fetch(`/api/comments?${qs}`, { cache: 'no-store' });
      if (!res.ok) throw new Error('Gagal memuat komentar lama.');
      const data = await res.json();
      const list: any[] = Array.isArray(data.comments) ? data.comments : [];

      setItems(prev => {
        const next: CommentItem[] = prev.map(c => ({ ...c, replies: [...(c.replies || [])] }));
        const byId = new Map<number, CommentItem>();
        const walk = (arr: CommentItem[]) => {
          arr.forEach(c => {
            if (typeof c.id === 'number') byId.set(c.id, c);
            if (c.replies?.length) walk(c.replies);
          });
        };
        walk(next);
        const keys = new Set(next.map(key));

        list.forEach(raw => {
          const node = toComment(raw);
          if (!node.body && !node.author) return;
          const dup = (typeof node.id === 'number' && byId.has(node.id)) || keys.has(key(node));
          if (dup) return;
          keys.add(key(node));
          const parent = node.parentId != null ? byId.get(node.parentId) : null;
          if (parent) {
            parent.replies = parent.replies || [];
            parent.replies.push(node);
          } else {
            next.push(node);
          }
          if (typeof node.id === 'number') byId.set(node.id, node);
        });
        return next;
      });

      setCursor(typeof data.nextCursor === 'number' ? data.nextCursor : null);
      setHasMore(!!data.hasMore);
    } catch (e: any) {
      setError(e?.message || 'Gagal memuat komentar lama.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <CommentList comments={items} />
      {hasMore && targetId && (
        <div className="mt-4">
          <button
            type="button"
            onClick={loadMore}
            disabled={loading}
            className="rounded-md bg-zinc-800 px-4 py-2 text-sm text-zinc-200 hover:bg-zinc-700 transition-colors disabled:cursor-not-allowed disabled:opacity-60"
          >
            {loading ? 'Memuat...' : 'Muat Lebih Banyak'}
          </button>
          {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
        </div>
      )}
    </div>
  );
}
