import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";

export function useSubjects() {
  const queryClient = useQueryClient();

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const user = await base44.auth.me();
      return base44.entities.Subject.filter({ created_by_id: user.id }, "-created_date");
    },
  });

  const createSubject = useMutation({
    mutationFn: (data) => base44.entities.Subject.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const deleteSubject = useMutation({
    mutationFn: (id) => base44.entities.Subject.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  return { subjects, isLoading, createSubject, deleteSubject };
}