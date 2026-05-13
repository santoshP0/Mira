import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { Medicine } from '../types';

export function useMedicines(familyId: string | undefined) {
  return useQuery({
    queryKey: ['medicines', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('medicines')
        .select('*, profile:profiles!for_user_id(name, photo_url)')
        .eq('family_id', familyId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Medicine[];
    },
  });
}

export function useAddMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (medicine: Omit<Medicine, 'id' | 'created_at' | 'profile'>) => {
      const { data, error } = await supabase.from('medicines').insert(medicine).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['medicines', data.family_id] });
    },
  });
}

export function useUpdateMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Medicine> & { id: string }) => {
      const { data, error } = await supabase
        .from('medicines')
        .update(updates)
        .eq('id', id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['medicines', data.family_id] });
    },
  });
}

export function useDeleteMedicine() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, familyId }: { id: string; familyId: string }) => {
      const { error } = await supabase.from('medicines').delete().eq('id', id);
      if (error) throw error;
      return familyId;
    },
    onSuccess: (familyId) => {
      qc.invalidateQueries({ queryKey: ['medicines', familyId] });
    },
  });
}
