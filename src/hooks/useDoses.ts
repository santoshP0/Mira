import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { DoseLog, DoseStatus } from '../types';
import { getStartOfDay, getEndOfDay } from '../utils/date';

export function useTodayDoses(familyId: string | undefined, forUserId?: string) {
  return useQuery({
    queryKey: ['doses', 'today', familyId, forUserId],
    enabled: !!familyId,
    refetchInterval: 30000,
    queryFn: async () => {
      let query = supabase
        .from('dose_logs')
        .select(
          '*, medicine:medicines(name, dose, photo_url, criticality), handler:profiles!handling_by(name)'
        )
        .eq('family_id', familyId!)
        .gte('scheduled_at', getStartOfDay())
        .lte('scheduled_at', getEndOfDay())
        .order('scheduled_at', { ascending: true });

      if (forUserId) query = query.eq('for_user_id', forUserId);

      const { data, error } = await query;
      if (error) throw error;
      return data as DoseLog[];
    },
  });
}

export function useRespondToDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      doseId,
      status,
      respondedBy,
      familyId,
    }: {
      doseId: string;
      status: DoseStatus;
      respondedBy: string;
      familyId: string;
    }) => {
      const { data, error } = await supabase
        .from('dose_logs')
        .update({
          status,
          responded_at: new Date().toISOString(),
          responded_by: respondedBy,
        })
        .eq('id', doseId)
        .select()
        .single();
      if (error) throw error;
      return { data, familyId };
    },
    onSuccess: ({ familyId }) => {
      qc.invalidateQueries({ queryKey: ['doses', 'today', familyId] });
    },
  });
}

export function useHandleDose() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      doseId,
      userId,
      familyId,
    }: {
      doseId: string;
      userId: string;
      familyId: string;
    }) => {
      const { data, error } = await supabase
        .from('dose_logs')
        .update({ handling_by: userId })
        .eq('id', doseId)
        .select()
        .single();
      if (error) throw error;
      return { data, familyId };
    },
    onSuccess: ({ familyId }) => {
      qc.invalidateQueries({ queryKey: ['doses', 'today', familyId] });
    },
  });
}

export function useActivityFeed(familyId: string | undefined) {
  return useQuery({
    queryKey: ['activity', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dose_logs')
        .select(
          '*, medicine:medicines(name, dose), responder:profiles!responded_by(name)'
        )
        .eq('family_id', familyId!)
        .neq('status', 'pending')
        .order('responded_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return data as (DoseLog & { medicine: any; responder: any })[];
    },
  });
}
