import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useStudentProfile() {
  const queryClient = useQueryClient();

  const { data: profiles, isLoading } = useQuery({
    queryKey: ["studentProfile"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.StudentProfile.filter({ created_by_id: user.id });
    },
  });

  const profile = profiles?.[0] || null;

  const createProfile = useMutation({
    mutationFn: (data) => base44.entities.StudentProfile.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studentProfile"] }),
  });

  const updateProfile = useMutation({
    mutationFn: (data) => base44.entities.StudentProfile.update(profile.id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studentProfile"] }),
  });

  return { profile, isLoading, createProfile, updateProfile };
}

export function useTopicMasteries() {
  const queryClient = useQueryClient();

  const { data: masteries = [], isLoading } = useQuery({
    queryKey: ["topicMasteries"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.TopicMastery.filter({ created_by_id: user.id });
    },
  });

  const upsertMastery = useMutation({
    mutationFn: async ({ topic, subtopic, updates }) => {
      const existing = masteries.find(m => m.topic === topic && (!subtopic || m.subtopic === subtopic));
      if (existing) {
        return base44.entities.TopicMastery.update(existing.id, updates);
      } else {
        return base44.entities.TopicMastery.create({ topic, subtopic, ...updates });
      }
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["topicMasteries"] }),
  });

  return { masteries, isLoading, upsertMastery };
}

export function useStudyGuides() {
  const queryClient = useQueryClient();

  const { data: guides = [], isLoading } = useQuery({
    queryKey: ["studyGuides"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.StudyGuide.filter({ created_by_id: user.id }, "-created_date");
    },
  });

  const latestGuide = guides?.[0] || null;

  const createGuide = useMutation({
    mutationFn: (data) => base44.entities.StudyGuide.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studyGuides"] }),
  });

  const updateGuide = useMutation({
    mutationFn: ({ id, data }) => base44.entities.StudyGuide.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["studyGuides"] }),
  });

  return { guides, latestGuide, isLoading, createGuide, updateGuide };
}