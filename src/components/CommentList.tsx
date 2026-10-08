export interface CommentItem {
  id?: number;
  parentId?: number | null;
  author: string;
  avatar?: string;
  badge?: string | null;
  time?: string | null;
  body: string;
  replies?: CommentItem[];
}

function Avatar({ item }: { item: CommentItem }) {
  return (
    <div className="w-8 h-8 sm:w-9 sm:h-9 shrink-0 rounded-full bg-zinc-800 border border-zinc-700 text-zinc-300 flex items-center justify-center text-xs sm:text-sm font-bold">
      {(item.avatar || item.author?.charAt(0) || '?').toUpperCase()}
    </div>
  );
}

function Head({ item }: { item: CommentItem }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-sm font-semibold text-white">{item.author}</span>
      {item.badge && (
        <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#00A2E9]/15 text-[#00A2E9] border border-[#00A2E9]/30">
          {item.badge}
        </span>
      )}
      {item.time && <span className="text-xs text-zinc-500">{item.time}</span>}
    </div>
  );
}

function CommentNode({ item, root = false }: { item: CommentItem; root?: boolean }) {
  return (
    <div className={root ? 'py-4' : 'py-3'}>
      <div className="flex gap-3">
        <Avatar item={item} />
        <div className="min-w-0 flex-1">
          <Head item={item} />
          <p className="mt-1.5 text-sm text-zinc-300 whitespace-pre-wrap break-words leading-relaxed">
            {item.body}
          </p>
        </div>
      </div>

      {item.replies && item.replies.length > 0 && (
        <div className="ml-4 sm:ml-6 mt-2 border-l border-zinc-800 pl-3 sm:pl-4">
          {item.replies.map((r, i) => (
            <CommentNode key={i} item={r} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function CommentList({ comments }: { comments?: CommentItem[] | null }) {
  if (!comments || comments.length === 0) {
    return (
      <div className="border border-zinc-800 rounded-2xl bg-zinc-950 p-6 text-center text-sm text-zinc-500">
        Belum ada komentar.
      </div>
    );
  }

  return (
    <div className="border border-zinc-800 rounded-2xl bg-zinc-950 px-4 sm:px-5">
      <div className="divide-y divide-zinc-800/70">
        {comments.map((c, i) => (
          <CommentNode key={i} item={c} root />
        ))}
      </div>
    </div>
  );
}
