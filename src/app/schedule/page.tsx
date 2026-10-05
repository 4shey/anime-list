import { getScheduleHtml } from "@/lib/sokuja/client";
// Assume parseSchedule is in parser.ts based on structure
import { parseSchedule } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Schedule() {
  try {
    const html = await getScheduleHtml();
    const result = parseSchedule(html);
    
    if (result.status !== 'success' || !result.data) {
      return notFound();
    }

    let scheduleDays: any[] = [];
    const data = result.data as any;
    if (Array.isArray(data)) {
      scheduleDays = data;
    } else if (data.schedule && Array.isArray(data.schedule)) {
      scheduleDays = data.schedule;
    } else if (data.schedule) {
      scheduleDays = Object.entries(data.schedule).map(([day, anime]) => ({ day, anime }));
    } else {
      scheduleDays = Object.entries(data).map(([day, anime]) => ({ day, anime }));
    }

    return (
      <div className="space-y-8">
        <div className="bg-zinc-950 border border-zinc-800 rounded-2xl p-8">
          <h1 className="text-3xl font-extrabold text-white mb-2">Jadwal Rilis Anime</h1>
          <p className="text-zinc-400">Daftar anime ongoing berdasarkan hari rilis.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
          {scheduleDays.map((dayObj: any, i: number) => (
            <div key={i} className="bg-zinc-950 border border-zinc-800 rounded-2xl p-6">
              <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2 border-b border-zinc-800 pb-2">
                <span className="w-1.5 h-5 bg-white rounded-sm inline-block"></span>
                {dayObj.day}
              </h2>
              <ul className="space-y-3">
                {dayObj.anime.map((anime: any, idx: number) => (
                  <li key={idx}>
                    <Link href={`/anime/${anime.slug}`} className="group flex items-start gap-3">
                      <div className="w-12 h-16 flex-shrink-0 bg-zinc-800 rounded-md overflow-hidden">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={anime.thumbnail || ''} alt={anime.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" loading="lazy" />
                      </div>
                      <div>
                        <h3 className="text-sm font-medium text-zinc-300 group-hover:text-white line-clamp-2 transition-colors">
                          {anime.title}
                        </h3>
                        <p className="text-xs text-zinc-500 mt-1">{anime.time || '-'}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    );
  } catch (error) {
    console.error(error);
    return notFound(); // fall back
  }
}
