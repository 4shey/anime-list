import { getScheduleHtml } from "@/lib/sokuja/client";
import { parseSchedule } from "@/lib/sokuja/parser";
import Link from "next/link";
import { notFound } from "next/navigation";

export default async function Schedule() {
  try {
    const html = await getScheduleHtml();
    const result = parseSchedule(html);

    if (result.status !== "success" || !result.data) {
      return notFound();
    }

    const ORDERED_DAYS = [
      "Senin",
      "Selasa",
      "Rabu",
      "Kamis",
      "Jumat",
      "Sabtu",
      "Minggu",
      "Random / Belum Pasti",
      "Libur",
      "Hiatus",
      "Sudah Selesai (END)",
    ];

    const data = result.data as any;
    const scheduleMap = data.schedule || {};

    // Hanya tampilkan hari yang memiliki data anime
    const scheduleDays = ORDERED_DAYS.map((day) => ({
      day,
      anime: scheduleMap[day] || [],
    })).filter((dayObj) => dayObj.anime.length > 0);

    return (
      <div className="space-y-10">
        <div className="border-b border-zinc-800/60 pb-4">
          <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
            <span className="w-1.5 h-6 bg-[#00A2E9] rounded-sm inline-block"></span>
            Jadwal Rilis Anime
          </h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {scheduleDays.map((dayObj: any, i: number) => (
            <div
              key={i}
              className="bg-zinc-950/50 border border-zinc-800/50 rounded-2xl p-6 flex flex-col"
            >
              <h2 className="text-xl font-bold text-white mb-5 flex items-center gap-2 border-b border-zinc-800/80 pb-3">
                <span className="w-1.5 h-5 bg-[#00A2E9] rounded-sm inline-block"></span>
                {dayObj.day}
              </h2>

              <ul className="space-y-1">
                {dayObj.anime.map((anime: any, idx: number) => (
                  <li key={idx}>
                    <Link
                      href={`/anime/${anime.slug}`}
                      className="group flex items-start gap-3 p-2 -mx-2 rounded-xl hover:bg-zinc-900/80 transition-colors"
                    >
                      <div className="w-12 h-[68px] flex-shrink-0 bg-zinc-800 rounded-lg overflow-hidden border border-zinc-700/40">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={anime.thumbnail || ""}
                          alt={anime.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0 pt-0.5">
                        <span className="text-[10px] font-bold text-[#00A2E9] mb-1 tracking-wide">
                          {anime.time || "TBA"}
                        </span>
                        <h3 className="text-sm font-semibold text-zinc-300 group-hover:text-white line-clamp-2 transition-colors leading-snug">
                          {anime.title}
                        </h3>
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
