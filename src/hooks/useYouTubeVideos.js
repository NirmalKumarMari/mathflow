import { useQuery } from "@tanstack/react-query";

export function useYouTubeVideos(youtubeVideosUrl) {
  return useQuery({
    queryKey: ["youtubeVideos", youtubeVideosUrl],
    queryFn: async () => {
      if (!youtubeVideosUrl) return [];
      const res = await fetch(youtubeVideosUrl);
      const data = await res.json();
      return data.videos || [];
    },
    enabled: !!youtubeVideosUrl,
    staleTime: Infinity,
  });
}

export function getVideosForTopic(allVideos, topic) {
  if (!topic) return [];
  const fromTopic = topic.youtube_videos || [];
  const fromJson = allVideos.filter(v =>
    v.topic_id === topic.id ||
    v.topic_name?.toLowerCase() === topic.name?.toLowerCase()
  ).map(v => v.youtube_id || v.video_id || v.url);
  return [...new Set([...fromTopic, ...fromJson])].filter(Boolean);
}