"use client";

import { useEffect } from "react";

const isTouchLike = () =>
  window.matchMedia("(pointer: coarse)").matches || navigator.maxTouchPoints > 0;

export default function ViewportFix() {
  useEffect(() => {
    const meta = document.querySelector<HTMLMetaElement>('meta[name="viewport"]');
    if (!meta) return;

    const canonical = meta.getAttribute("content") ?? "width=device-width, initial-scale=1";
    let rotatedInFullscreen = false;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const refresh = () => {
      if (canonical.includes("initial-scale=1")) {
        meta.setAttribute(
          "content",
          canonical.replace("initial-scale=1", "initial-scale=1.0000001")
        );
      }
      requestAnimationFrame(() => meta.setAttribute("content", canonical));
    };

    const scheduleRefresh = () => {
      clearTimeout(timer);
      timer = setTimeout(refresh, 120);
    };

    const onFullscreenChange = () => {
      const rotated = rotatedInFullscreen;
      rotatedInFullscreen = false;
      if (!document.fullscreenElement && rotated) scheduleRefresh();
    };

    const onOrientation = () => {
      if (document.fullscreenElement) {
        rotatedInFullscreen = true;
        return;
      }
      if (isTouchLike()) scheduleRefresh();
    };

    window.addEventListener("orientationchange", onOrientation);
    window.screen.orientation?.addEventListener("change", onOrientation);
    document.addEventListener("fullscreenchange", onFullscreenChange);

    return () => {
      clearTimeout(timer);
      window.removeEventListener("orientationchange", onOrientation);
      window.screen.orientation?.removeEventListener("change", onOrientation);
      document.removeEventListener("fullscreenchange", onFullscreenChange);
    };
  }, []);

  return null;
}
