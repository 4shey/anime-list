'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface Mirror {
  url: string;
  server: string;
  quality?: string;
  type?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

type MenuKey = 'settings' | 'speed' | null;

const TAP_DELAY = 300;
const SEEK_STEP = 10;

function clamp(n: number, min: number, max: number) {
  if (!isFinite(n)) return min;
  return Math.min(Math.max(n, min), max);
}

function normalizeQuality(q?: string) {
  const m = (q || '').match(/(\d{3,4})/);
  return m ? `${m[1]}p` : (q || 'auto').toLowerCase();
}

function proxyUrl(url: string) {
  return `/api/proxy/stream/${encodeURIComponent(url)}`;
}

function fmt(sec: number) {
  if (!isFinite(sec) || sec < 0) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

export default function EpisodePlayer({
  mirrors,
  thumbnail,
  title,
  hasDownloads,
}: {
  mirrors: Mirror[];
  thumbnail?: string | null;
  title?: string;
  hasDownloads?: boolean;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const hideTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [started, setStarted] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [buffering, setBuffering] = useState(false);
  const [current, setCurrent] = useState(0);
  const [duration, setDuration] = useState(0);
  const [rate, setRate] = useState(1);
  const [openMenu, setOpenMenu] = useState<MenuKey>(null);
  const openMenuRef = useRef<MenuKey>(null);
  const setMenu = (m: MenuKey) => {
    openMenuRef.current = m;
    setOpenMenu(m);
  };
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [usingProxy, setUsingProxy] = useState(false);
  const [failed, setFailed] = useState(false);

  const pendingSeek = useRef<number | null>(null);
  const pendingPlay = useRef(false);

  const tapInfo = useRef<{ t: number; side: 'l' | 'r' } | null>(null);
  const tapTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tapCtx = useRef<{ controlsOn: boolean; openMenu: MenuKey } | null>(null);
  const [skipAcc, setSkipAcc] = useState<{ dir: 1 | -1; amount: number } | null>(null);
  const skipAccRef = useRef<{ dir: 1 | -1; amount: number } | null>(null);
  const skipTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const servers = useMemo(() => {
    const seen: string[] = [];
    mirrors.forEach(m => {
      const s = m.server || 'SOKUJA';
      if (!seen.includes(s)) seen.push(s);
    });
    return seen;
  }, [mirrors]);

  const [activeServer, setActiveServer] = useState<string>(() => mirrors[0]?.server || 'SOKUJA');

  const qualities = useMemo(() => {
    const seen: string[] = [];
    mirrors.forEach(m => {
      const q = normalizeQuality(m.quality);
      if (!seen.includes(q)) seen.push(q);
    });
    return seen.sort((a, b) => parseInt(a, 10) - parseInt(b, 10));
  }, [mirrors]);

  const [activeQuality, setActiveQuality] = useState<string>(() =>
    mirrors.length ? normalizeQuality(mirrors[mirrors.length - 1].quality) : 'auto'
  );

  const activeMirror = useMemo(() => {
    if (!mirrors.length) return null;
    return (
      mirrors.find(m => (m.server || 'SOKUJA') === activeServer && normalizeQuality(m.quality) === activeQuality) ||
      mirrors.find(m => normalizeQuality(m.quality) === activeQuality) ||
      mirrors.find(m => (m.server || 'SOKUJA') === activeServer) ||
      mirrors[mirrors.length - 1]
    );
  }, [mirrors, activeServer, activeQuality]);

  const rawSrc = activeMirror?.url || '';
  const src = usingProxy ? proxyUrl(rawSrc) : rawSrc;

  /* ---------- efek global ---------- */
  useEffect(() => {
    const onFs = () => setFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);
    return () => document.removeEventListener('fullscreenchange', onFs);
  }, []);

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      const el = e.target as HTMLElement;
      if (!el.closest('[data-menu]')) setMenu(null);
    };
    document.addEventListener('mousedown', onClick);
    return () => document.removeEventListener('mousedown', onClick);
  }, []);

  useEffect(() => {
    const v = videoRef.current;
    if (v) v.setAttribute('referrerpolicy', 'no-referrer');
  }, []);

  // Ganti sumber video (ganti resolusi/server) sambil mempertahankan posisi & status play
  useEffect(() => {
    const v = videoRef.current;
    if (!v || !started || !src) return;
    if (v.getAttribute('src') === src) return;
    v.setAttribute('referrerpolicy', 'no-referrer');
    v.src = src;
    v.load();
    const onLoaded = () => {
      if (pendingSeek.current != null && isFinite(pendingSeek.current)) {
        try { v.currentTime = pendingSeek.current; } catch (_) {}
        pendingSeek.current = null;
      }
      v.playbackRate = rate;
      if (pendingPlay.current) {
        pendingPlay.current = false;
        v.play().catch(() => setPlaying(false));
      }
    };
    v.addEventListener('loadedmetadata', onLoaded, { once: true });
    return () => v.removeEventListener('loadedmetadata', onLoaded);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, started]);

  /* ---------- kontrol ---------- */
  const flashControls = () => {
    setControlsVisible(true);
    if (hideTimer.current) clearTimeout(hideTimer.current);
    hideTimer.current = setTimeout(() => {
      if (videoRef.current && !videoRef.current.paused && !openMenuRef.current) setControlsVisible(false);
    }, 2800);
  };

  const seekTo = (t: number) => {
    const v = videoRef.current;
    if (!v || !isFinite(t)) return;
    const target = clamp(t, 0, duration || v.duration || 0);
    v.currentTime = target;
    setCurrent(target);
    return target;
  };

  const controlsOn = controlsVisible || !playing || !!openMenu;
  const pe = controlsOn ? 'pointer-events-auto' : 'pointer-events-none';

  /* Skip ±10 detik (tombol panah tengah & double tap) — teks mengakumulasi saat di-spam (+10, +20, ...) */
  const lastSkipAt = useRef(0);
  const doSkip = (dir: 1 | -1) => {
    const v = videoRef.current;
    if (!v) return;
    const now = Date.now();
    const prev = skipAccRef.current;
    const amount =
      prev && prev.dir === dir && now - lastSkipAt.current < 1100 ? prev.amount + SEEK_STEP : SEEK_STEP;
    lastSkipAt.current = now;
    skipAccRef.current = { dir, amount };
    setSkipAcc({ dir, amount });
    if (skipTimer.current) clearTimeout(skipTimer.current);
    skipTimer.current = setTimeout(() => {
      skipAccRef.current = null;
      setSkipAcc(null);
    }, 1400);
    seekTo(v.currentTime + dir * SEEK_STEP);
    if (controlsOn) flashControls();
  };

  /* Klik area kosong video: toggle semua overlay; double tap kiri/kanan = skip ±10 */
  const onVideoClick = (e: React.MouseEvent<HTMLVideoElement>) => {
    if (!started) return;
    const rect = containerRef.current?.getBoundingClientRect();
    const side: 'l' | 'r' = rect && e.clientX - rect.left < rect.width / 2 ? 'l' : 'r';
    const now = Date.now();
    const prev = tapInfo.current;
    if (prev && prev.side === side && now - prev.t < TAP_DELAY) {
      if (tapTimer.current) clearTimeout(tapTimer.current);
      tapTimer.current = null;
      tapInfo.current = null;
      doSkip(side === 'r' ? 1 : -1);
      return;
    }
    tapInfo.current = { t: now, side };
    tapCtx.current = { controlsOn: controlsVisible || !playing, openMenu };
    if (tapTimer.current) clearTimeout(tapTimer.current);
    tapTimer.current = setTimeout(() => {
      tapTimer.current = null;
      tapInfo.current = null;
      const ctx = tapCtx.current;
      const wasOn = ctx ? ctx.controlsOn || !!ctx.openMenu : controlsOn;
      if (ctx && ctx.openMenu) {
        setMenu(null);
        flashControls();
        return;
      }
      // Saat paused kontrol selalu tampil (tombol play hanya di tengah)
      if (wasOn && playing) {
        setControlsVisible(false);
        setMenu(null);
      } else {
        flashControls();
      }
    }, TAP_DELAY);
  };

  const start = () => {
    if (!activeMirror) return;
    setStarted(true);
    setPlaying(true);
    pendingPlay.current = true;
    flashControls();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    if (!started) return start();
    if (v.paused) {
      pendingPlay.current = true;
      v.play().catch(() => setPlaying(false));
    } else {
      v.pause();
    }
    flashControls();
  };

  const changeQuality = (q: string) => {
    const v = videoRef.current;
    pendingSeek.current = v && !isNaN(v.currentTime) ? v.currentTime : null;
    pendingPlay.current = !!(v && !v.paused);
    setActiveQuality(q);
    setUsingProxy(false);
    setMenu(null);
    flashControls();
  };

  const changeServer = (s: string) => {
    const v = videoRef.current;
    pendingSeek.current = v && !isNaN(v.currentTime) ? v.currentTime : null;
    pendingPlay.current = !!(v && !v.paused);
    setActiveServer(s);
    setUsingProxy(false);
    setMenu(null);
    flashControls();
  };

  const changeRate = (r: number) => {
    setRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
    setMenu(null);
    flashControls();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
    setMenu(null);
    flashControls();
  };

  const handleVideoError = () => {
    const v = videoRef.current;
    // Aborted (ganti resolusi/server) bukan kegagalan nyata
    if (v?.error && v.error.code === 1) return;
    if (!rawSrc || usingProxy) {
      setFailed(true);
      setPlaying(false);
      return;
    }
    setUsingProxy(true);
  };

  /* ---------- render ---------- */
  const qualityButtons = (
    <div className="flex flex-wrap items-center justify-center gap-2">
      {qualities.map(q => (
        <button
          key={q}
          type="button"
          onClick={() => (started ? changeQuality(q) : setActiveQuality(q))}
          className={`min-w-[62px] px-3.5 py-2 rounded-lg text-xs sm:text-sm font-bold border backdrop-blur transition-colors ${
            q === activeQuality
              ? 'bg-[#00A2E9] border-[#00A2E9] text-white shadow-[0_0_18px_rgba(0,162,233,.5)]'
              : 'bg-black/55 border-white/25 text-white/85 hover:bg-black/75 hover:border-white/50 hover:text-white'
          }`}
        >
          {q === 'auto' ? 'Auto' : q}
        </button>
      ))}
    </div>
  );

  if (!activeMirror) {
    return (
      <div className="relative w-full aspect-video rounded-2xl overflow-hidden border border-zinc-800 bg-zinc-950 flex flex-col items-center justify-center gap-3 p-6 text-center">
        {thumbnail && (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={thumbnail} alt="" className="absolute inset-0 w-full h-full object-cover opacity-15" />
        )}
        <div className="relative z-10 flex flex-col items-center gap-3">
          <svg className="w-12 h-12 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <p className="text-zinc-400 text-sm font-medium">Streaming tidak tersedia.</p>
          {hasDownloads && <p className="text-zinc-500 text-xs">Gunakan link download di bawah.</p>}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Pilih server (bila lebih dari 1) */}
      {servers.length > 1 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 mr-1">Server</span>
          {servers.map(s => (
            <button
              key={s}
              type="button"
              onClick={() => (started ? changeServer(s) : setActiveServer(s))}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold border transition-colors ${
                s === activeServer
                  ? 'bg-white text-black border-white'
                  : 'bg-zinc-900 border-zinc-800 text-zinc-300 hover:border-zinc-600 hover:text-white'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      )}

      {/* Area video */}
      <div
        ref={containerRef}
        onPointerMove={e => {
          if (e.pointerType === 'mouse') flashControls();
        }}
        className={`group relative w-full overflow-hidden bg-black border border-zinc-800 shadow-2xl ${
          fullscreen ? 'h-screen' : 'rounded-2xl aspect-video'
        }`}
      >
        {/* Poster sebelum diputar */}
        {!started && (
          <>
            {thumbnail && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={thumbnail} alt={title || ''} className="absolute inset-0 w-full h-full object-cover" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/30 to-black/50" />

            {/* Play + pilih resolusi menimpa gambar episode */}
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-4 sm:gap-5 px-4">
              <button
                type="button"
                onClick={start}
                aria-label="Putar video"
                className="group/play"
              >
                <span className="flex w-20 h-20 sm:w-24 sm:h-24 rounded-full bg-[#00A2E9] group-hover/play:bg-[#0090d0] items-center justify-center shadow-[0_10px_45px_rgba(0,162,233,.55)] transition-transform duration-200 group-hover/play:scale-105">
                  <svg className="w-9 h-9 sm:w-10 sm:h-10 text-white ml-1.5" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                </span>
              </button>
              {qualityButtons}
            </div>
          </>
        )}

        {/* Video */}
        <video
          ref={videoRef}
          poster={thumbnail || undefined}
          playsInline
          preload="metadata"
          className={`absolute inset-0 z-0 w-full h-full object-contain ${started ? '' : 'opacity-0 pointer-events-none'}`}
          onClick={onVideoClick}
          onPlay={() => { setPlaying(true); flashControls(); }}
          onPause={() => { setPlaying(false); setControlsVisible(true); }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
          onDurationChange={e => setDuration(e.currentTarget.duration || 0)}
          onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
          onEnded={() => setPlaying(false)}
          onError={handleVideoError}
        />

        {failed && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-black/80 text-center px-6">
            <p className="text-white font-semibold text-sm">Video gagal dimuat.</p>
            <p className="text-zinc-400 text-xs">Coba ganti resolusi/server atau gunakan link download.</p>
          </div>
        )}

        {buffering && started && !failed && (
          <div className="absolute inset-0 z-40 flex items-center justify-center pointer-events-none">
            <span className="w-12 h-12 rounded-full border-4 border-white/20 border-t-[#00A2E9] animate-spin" />
          </div>
        )}

        {/* Overlay tengah: play/pause + panah mundur/maju 10 (hanya saat kontrol tampil) */}
        {started && !failed && (
          <div
            className={`pointer-events-none absolute inset-0 z-20 flex items-center justify-center transition-opacity duration-300 ${
              controlsOn ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="flex items-center gap-5 pointer-events-none">
              <button
                type="button"
                onClick={() => doSkip(-1)}
                aria-label="Mundur 10 detik"
                className={`relative w-14 h-14 rounded-full bg-black/45 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-[#00A2E9] transition-colors ${
                  controlsOn ? pe : 'pointer-events-none'
                }`}
              >
                <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white pt-0.5">10</span>
              </button>

              <button
                type="button"
                onClick={togglePlay}
                aria-label={playing ? 'Jeda' : 'Putar'}
                className={`w-16 h-16 rounded-full bg-black/45 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-[#00A2E9] transition-colors ${
                  controlsOn ? pe : 'pointer-events-none'
                }`}
              >
                {playing ? (
                  <svg className="w-7 h-7 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                  </svg>
                ) : (
                  <svg className="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5.14v14l11-7-11-7z" />
                  </svg>
                )}
              </button>

              <button
                type="button"
                onClick={() => doSkip(1)}
                aria-label="Maju 10 detik"
                className={`relative w-14 h-14 rounded-full bg-black/45 backdrop-blur border border-white/15 flex items-center justify-center hover:bg-[#00A2E9] transition-colors ${
                  controlsOn ? pe : 'pointer-events-none'
                }`}
              >
                <svg className="w-9 h-9 text-white" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 5V1l5 5-5 5V7c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6h2c0 4.42-3.58 8-8 8s-8-3.58-8-8 3.58-8 8-8z" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white pt-0.5">10</span>
              </button>
            </div>
          </div>
        )}

        {/* Teks akumulasi skip (+10/+20/...) di bawah panah — tampil walau overlay tengah disembunyikan */}
        {skipAcc && started && !failed && (
          <div className="absolute inset-0 z-20 pointer-events-none">
            <span
              className={`absolute top-[calc(50%+36px)] ${
                skipAcc.dir === -1 ? 'left-[calc(50%-80px)]' : 'left-[calc(50%+80px)]'
              } -translate-x-1/2 rounded-lg bg-black/70 border border-white/15 px-2 py-0.5 text-white text-xs font-extrabold tabular-nums backdrop-blur`}
            >
              {skipAcc.dir === 1 ? '+' : '-'}
              {skipAcc.amount} detik
            </span>
          </div>
        )}

        {/* Kontrol */}
        {started && !failed && (
          <div
            className={`pointer-events-none absolute inset-x-0 bottom-0 z-30 transition-opacity duration-300 ${
              controlsOn ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="pointer-events-none h-28 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

            <div className="pointer-events-none absolute inset-x-0 bottom-0 px-2 sm:px-3 pb-2">
              <div className="flex items-center justify-end gap-2 mb-1.5">
                {/* Kanan: setting, kecepatan, maksimalkan (dari kanan: maksimalkan, kecepatan, setting) */}
                <div className={`flex items-center gap-2 ${pe}`}>
                  {/* Setting (resolusi) */}
                  <div className="relative" data-menu>
                    <button
                      type="button"
                      onClick={() => { setMenu(openMenu === 'settings' ? null : 'settings'); setControlsVisible(true); }}
                      aria-label="Pengaturan"
                      aria-expanded={openMenu === 'settings'}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        openMenu === 'settings' ? 'bg-[#00A2E9] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      </svg>
                    </button>

                    {openMenu === 'settings' && (
                      <div className="absolute bottom-11 right-0 w-52 rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden z-30">
                        <div className="p-2 max-h-[60vh] overflow-y-auto">
                          <p className="px-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Resolusi</p>
                          <div className="space-y-1">
                            {qualities.map(q => (
                              <button
                                key={q}
                                type="button"
                                onClick={() => changeQuality(q)}
                                className={`w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold transition-colors ${
                                  q === activeQuality
                                    ? 'bg-[#00A2E9] text-white'
                                    : 'text-zinc-300 hover:bg-zinc-800'
                                }`}
                              >
                                {q === 'auto' ? 'Auto' : q}
                                {q === activeQuality && (
                                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                  </svg>
                                )}
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Kecepatan */}
                  <div className="relative" data-menu>
                    <button
                      type="button"
                      onClick={() => { setMenu(openMenu === 'speed' ? null : 'speed'); setControlsVisible(true); }}
                      aria-label="Kecepatan"
                      aria-expanded={openMenu === 'speed'}
                      className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                        openMenu === 'speed' ? 'bg-[#00A2E9] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                      }`}
                    >
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l4-4" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.93 19.07a10 10 0 1114.14 0" />
                      </svg>
                    </button>

                    {openMenu === 'speed' && (
                      <div className="absolute bottom-11 right-0 w-44 rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden z-30">
                        <div className="p-2">
                          <p className="px-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Kecepatan</p>
                          <div className="grid grid-cols-3 gap-1">
                            {SPEEDS.map(s => (
                              <button
                                key={s}
                                type="button"
                                onClick={() => changeRate(s)}
                                className={`px-2 py-1.5 rounded-lg text-[11px] font-bold transition-colors ${
                                  s === rate ? 'bg-[#00A2E9] text-white' : 'bg-zinc-800 text-zinc-300 hover:bg-zinc-700'
                                }`}
                              >
                                {s}x
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Maksimalkan / minimalkan (paling kanan) — aksi langsung */}
                  <button
                    type="button"
                    onClick={toggleFullscreen}
                    aria-label={fullscreen ? 'Minimalkan layar' : 'Maksimalkan layar'}
                    className="w-9 h-9 rounded-lg flex items-center justify-center bg-white/10 hover:bg-white/20 text-white transition-colors"
                  >
                    {fullscreen ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15H4.5M9 15V19.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                      </svg>
                    ) : (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              {/* Baris 2: durasi (current / total) — rata kanan, di atas progress */}
              <div className={`flex items-center justify-end mb-1 ${pe}`}>
                <span className="text-[11px] font-semibold text-white/85 tabular-nums">
                  {fmt(current)} / {fmt(duration)}
                </span>
              </div>

              {/* Progress — paling bawah */}
              <input
                type="range"
                min={0}
                max={duration || 0}
                step={0.1}
                value={current}
                onChange={e => {
                  const v = videoRef.current;
                  const t = parseFloat(e.target.value);
                  setCurrent(t);
                  if (v && isFinite(t)) v.currentTime = t;
                  flashControls();
                }}
                className={`block w-full h-1.5 accent-[#00A2E9] cursor-pointer ${pe}`}
                aria-label="Posisi video"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
