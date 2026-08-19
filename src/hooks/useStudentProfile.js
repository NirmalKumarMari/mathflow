import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/apiClient";

export function useStudentProfile() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.StudentProfile.filter({ created_by_id: user.id });
    },
  });

  const profile = profiles?.[0] || null;

  const createProfile = useMutation({
    mutationFn: (data) => api.entities.StudentProfile.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studentProfile"] }),
  });

  const updateProfile = useMutation({
    mutationFn: (data) => api.entities.StudentProfile.update(profile.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studentProfile"] }),
  });

  return { profile, isLoading, createProfile, updateProfile };
}

export function useTopicMasteries() {
  const queryClient = useQueryClient();

  const { data: masteries = [], isLoading } = useQuery({
    queryKey: ["topicMasteries"],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.TopicMastery.filter({ created_by_id: user.id });
    },
  });

  const upsertMastery = useMutation({
    mutationFn: async ({ topic, subtopic, updates }) => {
      const existing = masteries.find(m => m.topic === topic && (!subtopic || m.subtopic === subtopic));
      if (existing) {
        return api.entities.TopicMastery.update(existing.id, updates);
      } else {
        return api.entities.TopicMastery.create({ topic, subtopic, ...updates });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topicMasteries"] }),
  });

  return { masteries, isLoading, upsertMastery };
}

export function useStudyGuides(subjectId) {
  const queryClient = useQueryClient();

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["studyGuides", subjectId],
    queryFn: async () => {
      const user = await api.auth.me();
      const filter = { created_by_id: user.id };
      if (subjectId) filter.subject_id = subjectId;
      return api.entities.StudyGuide.filter(filter, "-created_date");
    },
  });

  const latestGuide = guides?.[0] || null;

  const createGuide = useMutation({
    mutationFn: (data) => api.entities.StudyGuide.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studyGuides"] }),
  });

  const updateGuide = useMutation({
    mutationFn: ({ id, data }) => api.entities.StudyGuide.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studyGuides"] }),
  });

  return { guides, latestGuide, isLoading, createGuide, updateGuide };
}