# Sokuja API & Frontend Documentation (z-scrape-api)

Dokumen ini berisi informasi mengenai arsitektur, panduan *development*, serta dokumentasi endpoint API Sokuja Scraper (`z-scrape-api`) untuk mempermudah pengembangan Frontend yang digabung (Monolith Next.js).

## 📌 Arsitektur Proyek
- **Framework**: Next.js 14 (App Router)
- **Scraper**: Cheerio (Server-side rendering HTML dari `x6.sokuja.uk`)
- **Backend API**: Tersedia di folder `src/app/api`
- **Frontend**: Dikembangkan di `src/app` (seperti `page.tsx`, `layout.tsx`)
- **Worker**: Cloudflare worker (di folder `cf-worker`) untuk *offloading* atau *proxying* khusus.

*Karena Frontend digabungkan di proyek ini, disarankan untuk melakukan Data Fetching menggunakan React Server Components secara langsung memanggil logika scraper di `src/lib/sokuja` tanpa harus melakukan HTTP `fetch` ke `/api/` internal (mengurangi overhead).*

---

## 📡 Daftar Endpoint API (Untuk Penggunaan Klien Eksternal / API Route)

Base URL: `http://localhost:3000/api` (saat mode development)

### 1. Home (Beranda)
- **Endpoint:** `GET /api/anime/home`
- **Deskripsi:** Mengambil data anime terbaru, populer, dan daftar musim (season) di halaman utama.

**Contoh Response JSON:**
```json
{
  "status": "success",
  "author": "Z-SCRAPE",
  "message": "Home data OK",
  "timestamp": "2026-10-05T11:45:00.000Z",
  "data": {
    "totalLatest": 18,
    "latest": [
      {
        "title": "Bleach: Sennen Kessen-hen - Soukoku-tan Episode 13",
        "slug": "bleach-sennen-kessen-hen-soukoku-tan-episode-13",
        "episodeNumber": 13,
        "url": "https://x6.sokuja.uk/bleach-sennen-kessen-hen-soukoku-tan-episode-13/",
        "thumbnail": "https://x6.sokuja.uk/wp-content/uploads/2026/thumbnail.jpg"
      }
    ],
    "popular": [
      {
        "rank": 1,
        "id": 1234,
        "title": "One Piece",
        "type": "TV",
        "status": "Ongoing",
        "year": 2026,
        "score": 8.9,
        "views": 150000,
        "slug": "one-piece",
        "url": "https://x6.sokuja.uk/anime/one-piece/",
        "thumbnail": "https://x6.sokuja.uk/wp-content/uploads/onepiece.jpg"
      }
    ],
    "seasons": [
      { "year": 2026, "url": "https://x6.sokuja.uk/season/2026/" },
      { "year": 2025, "url": "https://x6.sokuja.uk/season/2025/" }
    ]
  }
}
```

### 2. Anime Detail
- **Endpoint:** `GET /api/anime/detail?slug={anime_slug}`
- **Parameter:** `slug` (contoh: `one-piece`)
- **Deskripsi:** Mengambil detail lengkap anime beserta daftar episodenya.

**Contoh Response JSON:**
```json
{
  "status": "success",
  "author": "Z-SCRAPE",
  "message": "Detail anime 'One Piece' OK",
  "timestamp": "2026-10-05T11:46:00.000Z",
  "data": {
    "title": "One Piece",
    "altTitle": "Wan Pisu",
    "slug": "one-piece",
    "url": "https://x6.sokuja.uk/anime/one-piece/",
    "poster": "https://x6.sokuja.uk/wp-content/uploads/onepiece-poster.jpg",
    "score": 8.9,
    "ratingCount": 45000,
    "status": "Ongoing",
    "type": "TV",
    "year": "1999",
    "season": "Fall",
    "studio": "Toei Animation",
    "director": "Tatsuya Nagamine",
    "producer": "Fuji TV",
    "fansub": "SOKUJA.NET",
    "genres": ["Action", "Adventure", "Fantasy"],
    "synopsis": "Gol D. Roger dikenal sebagai Raja Bajak Laut...",
    "cast": [
      { "name": "Mayumi Tanaka", "slug": "mayumi-tanaka", "url": "https://x6.sokuja.uk/cast/mayumi-tanaka/" }
    ],
    "totalEpisodes": 1,
    "episodeCount": 1,
    "episodes": [
      {
        "number": 1100,
        "title": "Episode 1100",
        "slug": "one-piece-episode-1100",
        "url": "https://x6.sokuja.uk/one-piece-episode-1100/",
        "released": "Tersedia"
      }
    ],
    "otherEpisodeGroups": [
      {
        "animeSlug": "overgeared",
        "title": "Overgeared",
        "totalEpisodes": 1,
        "episodes": [
          { "number": 1, "title": "Overgeared Ep 1", "slug": "overgeared-episode-1-subtitle-indonesia", "url": "https://x6.sokuja.uk/overgeared-episode-1-subtitle-indonesia/", "released": "Tersedia" }
        ]
      }
    ],
    "relatedAnime": [
      {
        "title": "Black Clover",
        "slug": "black-clover-subtitle-indonesia",
        "url": "https://x6.sokuja.uk/anime/black-clover-subtitle-indonesia/",
        "thumbnail": "https://x6.sokuja.uk/uploads/2026/09/black-clover.webp",
        "type": "TV",
        "score": 8.2,
        "year": 2026
      }
    ]
  }
}
```

**Catatan Resolver Slug:**
- `episodes` diambil dari section `Daftar Episode`, **ditambah** daftar lengkap dari payload RSC (SOKUJA biasanya hanya me-render ±50 episode pertama di DOM) → tanpa batas `slice`.
- `episodeCount` = angka total dari heading "Daftar Episode (N)"; `totalEpisodes` = jumlah episode yang benar-benar tersedia di payload.
- `otherEpisodeGroups` berisi episode anime lain yang ikut muncul di halaman (sidebar *Komentar Terbaru*), dikelompokkan per anime — **hanya untuk konsumen API**, tidak dirender di UI.
- `relatedAnime` diambil dari section **"Anime Terkait"** di SOKUJA (kartu poster + badge type/skor/tahun). Hanya item **yang punya `thumbnail`** yang disertakan. Di UI dirender sebagai grid poster `AnimeCard` (lebar konten penuh, tanpa panah/tombol "Lihat Semua", klik → `/anime/{slug}`).
- Slug anime bisa disertai atau tanpa suffix `-subtitle-indonesia`; `getAnimeDetail()` mencoba keduanya lalu fallback ke pencarian SOKUJA sebelum mengembalikan "tidak ditemukan".

### 3. Episode Detail (Streaming & Download)
- **Endpoint:** `GET /api/anime/episode?slug={episode_slug}`
- **Parameter:** `slug` (contoh: `one-piece-episode-1100`)
- **Deskripsi:** Mengambil link streaming video (m3u8/mp4) dan link download dari suatu episode.

**Contoh Response JSON:**
```json
{
  "status": "success",
  "author": "Z-SCRAPE",
  "message": "Episode 'One Piece Episode 1100' OK",
  "timestamp": "2026-10-05T11:47:00.000Z",
  "data": {
    "title": "One Piece Episode 1100",
    "slug": "one-piece-episode-1100",
    "episodeId": 98765,
    "anime": {
      "title": "One Piece",
      "slug": "one-piece",
      "url": "https://x6.sokuja.uk/anime/one-piece/"
    },
    "thumbnail": "https://x6.sokuja.uk/wp-content/uploads/eps1100.jpg",
    "uploadDate": "2026-10-05",
    "views": 15000,
    "navigation": {
      "prev": { "slug": "one-piece-episode-1099", "url": "https://x6.sokuja.uk/one-piece-episode-1099/" },
      "next": { "slug": "one-piece-episode-1101", "url": "https://x6.sokuja.uk/one-piece-episode-1101/" },
      "allEpisodes": "https://x6.sokuja.uk/anime/one-piece/"
    },
    "mirrors": [
      {
        "url": "https://stream.server.com/video.m3u8",
        "server": "Server 1"
      }
    ],
    "downloads": [
      {
        "quality": "1080p",
        "link": "https://sokuja.id/x.php?id=..."
      }
    ]
  }
}
```

### 4. Daftar Anime Lengkap / Filter (Estimasi Berdasarkan Struktur)
- **Endpoint:**
  - `GET /api/anime/completed` (Anime Tamat)
  - `GET /api/anime/ongoing` (Anime Ongoing)
  - `GET /api/anime/schedule` (Jadwal Rilis)
  - `GET /api/anime/search?q={query}` (Pencarian Anime)
  - `GET /api/genres` (Daftar Genre)

*(Catatan: Endpoint lain memiliki struktur JSON standar yang mengembalikan array of anime list mirip dengan object `latest` atau `popular` di Home.)*

---

## 🎨 Arsitektur Frontend & Rute UI (Web Pages)

Frontend web dikembangkan langsung di folder `src/app` menggunakan **Next.js App Router (React Server Components)**. Seluruh komponen didesain dengan konsep **Grayscale/Monokrom** menggunakan **Tailwind CSS**, dan data di-render langsung dari logika `src/lib/sokuja` untuk kecepatan maksimal (tanpa HTTP overhead).

### Daftar Halaman (Pages):

1. **Beranda (Home) - `/`**
   - **Tampilan**: Menampilkan "Trending Anime" dengan gambar latar gelap, grid "Episode Terbaru", dan sidebar "Anime Populer".
   - **Data Source**: `getHomeHtml()` → `parseHome()`

2. **Detail Anime - `/anime/[slug]`**
   - **Tampilan**: Informasi detail anime (skor, studio, genre, sinopsis) beserta daftar rincian semua episode yang *scrollable*.
   - **Data Source**: `getDetailHtml(slug)` → `parseAnimeDetail()`

3. **Nonton Episode - `/episode/[slug]`**
   - **Tampilan**: *Video player* besar di atas, navigasi episode sebelumnya/selanjutnya, serta daftar link unduhan (*download*) berbagai resolusi.
   - **Data Source**: `getEpisodeHtml(slug)` → `parseEpisodeDetail()`

4. **Daftar Genre - `/genre`**
   - **Tampilan**: Kumpulan kotak grid minimalis yang menampilkan semua nama genre anime.
   - **Data Source**: `getGenreHtml('', 1)` → `parseGenres()`

5. **Anime Movies - `/movies`**
   - **Tampilan**: Daftar film layar lebar dalam bentuk grid.
   - **Data Source**: `getGenreHtml('movie', 1)` → `parseAnimeFilter()`

6. **Jadwal Rilis - `/schedule`**
   - **Tampilan**: Blok-blok kartu berdasarkan hari (Senin - Minggu) berisi daftar rilis harian.
   - **Data Source**: `getScheduleHtml()` → `parseSchedule()`

### Styling
- Menggunakan `tailwindcss` dengan file kustomisasi di `tailwind.config.ts`.
- Skema warna difokuskan pada `zinc-950`, `zinc-900`, putih dan abu-abu (tanpa aksen neon).
- Konfigurasi root dan navigasi ada di `src/app/layout.tsx`.
