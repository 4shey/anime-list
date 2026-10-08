import Link from "next/link";

interface AnimeCardProps {
  item: any;
  isEpisode?: boolean;
  aspectRatio?: string;
}

export default function AnimeCard({ item, isEpisode = false, aspectRatio = "aspect-[3/4]" }: AnimeCardProps) {
  // Tentukan label kiri atas (Tipe atau Episode)
  let topLeftLabel = '';
  if (item.episodeNumber) {
    topLeftLabel = `EP ${item.episodeNumber}`;
  } else if (item.type) {
    topLeftLabel = item.type;
  } else {
    topLeftLabel = 'TV'; // Fallback
  }

  return (
    <Link href={isEpisode ? `/episode/${item.slug}` : `/anime/${item.slug}`} className="group block">
      <div className={`relative ${aspectRatio} rounded-xl overflow-hidden bg-zinc-900 mb-2.5 border border-zinc-800 group-hover:border-zinc-500 transition-colors shadow-sm`}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img 
          src={item.thumbnail} 
          alt={item.title} 
          className="object-cover w-full h-full group-hover:scale-105 transition-transform duration-300" 
          loading="lazy" 
        />
        
        {/* Kiri Atas: Tipe atau Episode */}
        <div className="absolute top-2 left-2">
          <span className="text-[10px] font-bold text-white bg-[#00A2E9] px-2 py-0.5 rounded uppercase tracking-wide">
            {topLeftLabel}
          </span>
        </div>

        {/* Kanan Atas: Rating / Score */}
        {!isEpisode && (item.score || item.score === 0 || item.score === null) && (
          <div className="absolute top-2 right-2">
            <span className="flex items-center gap-1 text-[10px] font-bold text-black bg-yellow-400 px-1.5 py-0.5 rounded shadow-sm">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M10.868 2.884c-.321-.772-1.415-.772-1.736 0l-1.83 4.401-4.753.381c-.833.067-1.171 1.107-.536 1.651l3.62 3.102-1.106 4.637c-.194.813.691 1.456 1.405 1.02L10 15.591l4.069 2.485c.713.436 1.598-.207 1.404-1.02l-1.106-4.637 3.62-3.102c.635-.544.297-1.584-.536-1.65l-4.752-.382-1.831-4.401z" clipRule="evenodd" />
              </svg>
              {item.score || "?"}
            </span>
          </div>
        )}
      </div>
      <h3 className="text-xs sm:text-sm font-semibold text-zinc-300 group-hover:text-white line-clamp-2 transition-colors leading-snug" title={item.title}>
        {item.title}
      </h3>
    </Link>
  );
}
