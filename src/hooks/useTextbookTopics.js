import { useQuery } from "@tanstack/react-query";

/**
 * Resolves the topic list for a textbook: uses embedded `topics` if present,
 * otherwise fetches and parses the textbook's `syllabus_url` JSON.
 */
export function useTextbookTopics(book) {
  const { data: topics = [], isLoading } = useQuery({
    queryKey: ["textbookTopics", book?.id],
    queryFn: async () => {
      if (book?.topics?.length) return book.topics;
      if (book?.syllabus_url) {
        const res = await fetch(book.syllabus_url);
        const data = await res.json();
        const syllabusTopics = data.syllabus?.topics || data.topics || [];
        return syllabusTopics.map(t => ({
          id: t.id || (t.name || "").toLowerCase().replace(/\s+/g, "_"),
          name: t.name,
          subtopics: t.subtopics || [],
          description: t.description || "",
          difficulty: t.difficulty || "beginner",
        }));
      }
      return [];
    },
    enabled: !!book,
    staleTime: Infinity,
  });
  return { topics, isLoading };
}