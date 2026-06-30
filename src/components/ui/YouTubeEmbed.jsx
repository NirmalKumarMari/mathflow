import React from "react";

export default function YouTubeEmbed({ videoId, title }) {
  if (!videoId) return null;

  // Extract video ID from full URL if needed
  let id = videoId;
  if (videoId.includes("youtube.com/watch?v=")) {
    id = videoId.split("v=")[1]?.split("&")[0];
  } else if (videoId.includes("youtu.be/")) {
    id = videoId.split("youtu.be/")[1]?.split("?")[0];
  }

  return (
    <div className="relative w-full overflow-hidden rounded-xl border border-border bg-black" style={{ paddingBottom: "56.25%" }}>
      <iframe
        className="absolute top-0 left-0 w-full h-full"
        src={`https://www.youtube.com/embed/${id}`}
        title={title || "YouTube video"}
        frameBorder="0"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
      />
    </div>
  );
}