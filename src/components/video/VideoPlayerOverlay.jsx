import React, { useEffect, useRef, useState } from "react";
import { Maximize2, Minimize2, X } from "lucide-react";

function extractVideoId(videoId) {
  let id = videoId;
  if (videoId.includes("youtube.com/watch?v=")) {
    id = videoId.split("v=")[1]?.split("&")[0];
  } else if (videoId.includes("youtu.be/")) {
    id = videoId.split("youtu.be/")[1]?.split("?")[0];
  }
  return id;
}

/**
 * In-app floating video player (picture-in-picture style corner window)
 * that can be expanded to fullscreen. Never redirects away from the app.
 */
export default function VideoPlayerOverlay({ videoId, title, onClose }) {
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  useEffect(() => {
    const handler = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", handler);
    return () => document.removeEventListener("fullscreenchange", handler);
  }, []);

  if (!videoId) return null;
  const id = extractVideoId(videoId);

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  return (
    <div
      ref={containerRef}
      className={`fixed z-50 bg-black shadow-2xl overflow-hidden border border-border ${
        isFullscreen ? "inset-0 rounded-none" : "bottom-4 right-4 w-72 sm:w-96 rounded-xl"
      }`}
    >
      <div
        className={isFullscreen ? "w-full h-full" : ""}
        style={!isFullscreen ? { paddingBottom: "56.25%", position: "relative" } : undefined}
      >
        <div className="absolute top-0 right-0 z-10 flex gap-1 p-1.5">
          <button
            onClick={toggleFullscreen}
            className="w-7 h-7 rounded-md bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-md bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
        <iframe
          className={isFullscreen ? "w-full h-full" : "absolute top-0 left-0 w-full h-full"}
          src={`https://www.youtube.com/embed/${id}?autoplay=1`}
          title={title || "Video lesson"}
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}