import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/api/apiClient";

export function useSubjects() {
  const queryClient = useQueryClient();

  const { data: subjects = [], isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const user = await api.auth.me();
      return api.entities.Subject.filter({ created_by_id: user.id }, "-created_date");
    },
  });

  const createSubject = useMutation({
    mutationFn: (data) => api.entities.Subject.create(data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const updateSubject = useMutation({
    mutationFn: ({ id, data }) => api.entities.Subject.update(id, data),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const deleteSubject = useMutation({
    mutationFn: (id) => api.entities.Subject.delete(id),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["subjects"] }),
  });

  return { subjects, isLoading, createSubject, updateSubject, deleteSubject };
}