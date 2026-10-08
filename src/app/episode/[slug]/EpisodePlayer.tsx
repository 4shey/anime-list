'use client';

import { useEffect, useMemo, useRef, useState } from 'react';

export interface Mirror {
  url: string;
  server: string;
  quality?: string;
  type?: string;
}

const SPEEDS = [0.5, 0.75, 1, 1.25, 1.5, 2];

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
  const [volume, setVolume] = useState(1);
  const [muted, setMuted] = useState(false);
  const [rate, setRate] = useState(1);
  const [showSettings, setShowSettings] = useState(false);
  const [fullscreen, setFullscreen] = useState(false);
  const [controlsVisible, setControlsVisible] = useState(true);
  const [usingProxy, setUsingProxy] = useState(false);
  const [failed, setFailed] = useState(false);

  const pendingSeek = useRef<number | null>(null);
  const pendingPlay = useRef(false);

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
      if (!el.closest('[data-settings]')) setShowSettings(false);
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
      if (videoRef.current && !videoRef.current.paused && !showSettings) setControlsVisible(false);
    }, 2800);
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
    setShowSettings(false);
    flashControls();
  };

  const changeServer = (s: string) => {
    const v = videoRef.current;
    pendingSeek.current = v && !isNaN(v.currentTime) ? v.currentTime : null;
    pendingPlay.current = !!(v && !v.paused);
    setActiveServer(s);
    setUsingProxy(false);
    setShowSettings(false);
    flashControls();
  };

  const changeVolume = (val: number) => {
    const v = videoRef.current;
    setVolume(val);
    setMuted(val === 0);
    if (v) {
      v.volume = val;
      v.muted = val === 0;
    }
    flashControls();
  };

  const toggleMute = () => {
    const v = videoRef.current;
    const next = !muted;
    setMuted(next);
    if (v) v.muted = next;
    flashControls();
  };

  const changeRate = (r: number) => {
    setRate(r);
    if (videoRef.current) videoRef.current.playbackRate = r;
    setShowSettings(false);
    flashControls();
  };

  const toggleFullscreen = () => {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else el.requestFullscreen?.().catch(() => {});
    setShowSettings(false);
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

  const volumePercent = Math.round((muted ? 0 : volume) * 100);

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
        onMouseMove={flashControls}
        onTouchStart={flashControls}
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
          onClick={togglePlay}
          onPlay={() => { setPlaying(true); flashControls(); }}
          onPause={() => { setPlaying(false); setControlsVisible(true); }}
          onWaiting={() => setBuffering(true)}
          onPlaying={() => setBuffering(false)}
          onTimeUpdate={e => setCurrent(e.currentTarget.currentTime)}
          onDurationChange={e => setDuration(e.currentTarget.duration || 0)}
          onLoadedMetadata={e => setDuration(e.currentTarget.duration || 0)}
          onVolumeChange={e => {
            setVolume(e.currentTarget.volume);
            setMuted(e.currentTarget.muted);
          }}
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
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span className="w-12 h-12 rounded-full border-4 border-white/20 border-t-[#00A2E9] animate-spin" />
          </div>
        )}

        {/* Kontrol */}
        {started && !failed && (
          <div
            className={`absolute inset-x-0 bottom-0 transition-opacity duration-300 ${
              controlsVisible || !playing || showSettings ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <div className="pointer-events-none h-28 bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

            <div className="absolute inset-x-0 bottom-0 px-2 sm:px-3 pb-2">
              {/* Progress */}
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
                className="w-full h-1.5 mb-2 accent-[#00A2E9] cursor-pointer"
                aria-label="Posisi video"
              />

              <div className="flex items-center justify-between gap-3">
                {/* Kiri: play/pause + volume */}
                <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                  <button
                    type="button"
                    onClick={togglePlay}
                    aria-label={playing ? 'Jeda' : 'Putar'}
                    className="w-9 h-9 shrink-0 rounded-full bg-white/10 hover:bg-[#00A2E9] text-white flex items-center justify-center transition-colors backdrop-blur"
                  >
                    {playing ? (
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4 ml-0.5" fill="currentColor" viewBox="0 0 24 24">
                        <path d="M8 5.14v14l11-7-11-7z" />
                      </svg>
                    )}
                  </button>

                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      type="button"
                      onClick={toggleMute}
                      aria-label="Suara"
                      className="w-8 h-8 shrink-0 rounded-lg text-white/90 hover:text-white flex items-center justify-center transition-colors"
                    >
                      {muted || volume === 0 ? (
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l4-4m0 0l-4-4m4 4H9" />
                        </svg>
                      ) : (
                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3A4.5 4.5 0 0014 8.5v7a4.49 4.49 0 002.5-3.5zM14 3.23v2.06a7 7 0 010 13.42v2.06a9 9 0 000-17.54z" />
                        </svg>
                      )}
                    </button>

                    <input
                      type="range"
                      min={0}
                      max={1}
                      step={0.01}
                      value={muted ? 0 : volume}
                      onChange={e => changeVolume(parseFloat(e.target.value))}
                      className="w-16 sm:w-24 h-1.5 accent-[#00A2E9] cursor-pointer"
                      aria-label="Volume"
                    />
                    <span className="text-[11px] font-bold text-white/80 tabular-nums w-9">{volumePercent}%</span>
                  </div>

                  <span className="text-[11px] font-semibold text-white/70 tabular-nums hidden sm:inline">
                    {fmt(current)} / {fmt(duration)}
                  </span>
                </div>

                {/* Kanan: settings */}
                <div className="flex items-center gap-2 relative" data-settings>
                  <button
                    type="button"
                    onClick={() => { setShowSettings(s => !s); setControlsVisible(true); }}
                    aria-label="Pengaturan"
                    className={`w-9 h-9 rounded-lg flex items-center justify-center transition-colors ${
                      showSettings ? 'bg-[#00A2E9] text-white' : 'bg-white/10 hover:bg-white/20 text-white'
                    }`}
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </button>

                  {/* Dropdown ke atas */}
                  {showSettings && (
                    <div className="absolute bottom-11 right-0 w-56 rounded-xl border border-zinc-700 bg-zinc-900/95 backdrop-blur-md shadow-2xl overflow-hidden z-30">
                      <div className="p-2 space-y-3 max-h-[60vh] overflow-y-auto">
                        <div>
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

                        <div>
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

                        <div>
                          <p className="px-1 mb-1 text-[10px] font-bold uppercase tracking-wider text-zinc-500">Tampilan</p>
                          <button
                            type="button"
                            onClick={toggleFullscreen}
                            className="w-full flex items-center justify-between px-2.5 py-2 rounded-lg text-xs font-semibold text-zinc-300 hover:bg-zinc-800 transition-colors"
                          >
                            {fullscreen ? 'Minimalkan' : 'Maksimalkan layar'}
                            {fullscreen ? (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 9V4.5M9 9H4.5M9 9L3.75 3.75M15 9h4.5M15 9V4.5M15 9l5.25-5.25M9 15H4.5M9 15V19.5M9 15l-5.25 5.25M15 15h4.5M15 15v4.5m0-4.5l5.25 5.25" />
                              </svg>
                            ) : (
                              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />
                              </svg>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
