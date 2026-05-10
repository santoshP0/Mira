import { useEffect, useState } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { DoseLog, DoseStatus } from '../types';
import { getStartOfDay, getEndOfDay } from '../utils/date';

function useIsAppActive(): boolean {
  const [isActive, setIsActive] = useState(AppState.currentState === 'active');
  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => setIsActive(s === 'active'));
    return () => sub.remove();
  }, []);
  return isActive;
}

export function useTodayDoses(familyId: string | undefined, forUserId?: string) {
  const isActive = useIsAppActive();

  return useQuery({
    queryKey: ['doses', 'today', familyId, forUserId],
    enabled: !!familyId,
    // Only poll when the app is in the foreground (saves battery).
    // Real-time subscriptions handle live updates while active.
    refetchInterval: isActive ? 30_000 : false,
    staleTime: 15_000,
    queryFn: async () => {
      let query = supabase
        .from('dose_logs')
        .select('*, medicine:medicines(name, dose, photo_url, criticality), handler:profiles!handling_by(name)')
        .eq('family_id', familyId!)
        .gte('scheduled_at', getStartOfDay())
        .lte('scheduled_at', getEndOfDay())
        .order('scheduled_at', { ascending: true });

      if (forUserId) query = query.eq('for_user_id', forUserId);

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as DoseLog[];
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

    // Optimistic update — UI responds immediately, rolls back on error.
    onMutate: async ({ doseId, status, familyId, respondedBy }) => {
      await qc.cancelQueries({ queryKey: ['doses', 'today', familyId] });
      const snapshot = qc.getQueryData<DoseLog[]>(['doses', 'today', familyId]);

      qc.setQueryData<DoseLog[]>(['doses', 'today', familyId], (prev) =>
        prev?.map((d) =>
          d.id === doseId
            ? { ...d, status, responded_at: new Date().toISOString(), responded_by: respondedBy }
            : d
        ) ?? []
      );

      return { snapshot };
    },

    onError: (_err, { familyId }, context) => {
      if (context?.snapshot) {
        qc.setQueryData(['doses', 'today', familyId], context.snapshot);
      }
    },

    onSettled: (_data, _err, { familyId }) => {
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

    onMutate: async ({ doseId, userId, familyId }) => {
      await qc.cancelQueries({ queryKey: ['doses', 'today', familyId] });
      const snapshot = qc.getQueryData<DoseLog[]>(['doses', 'today', familyId]);

      qc.setQueryData<DoseLog[]>(['doses', 'today', familyId], (prev) =>
        prev?.map((d) => (d.id === doseId ? { ...d, handling_by: userId } : d)) ?? []
      );

      return { snapshot };
    },

    onError: (_err, { familyId }, context) => {
      if (context?.snapshot) qc.setQueryData(['doses', 'today', familyId], context.snapshot);
    },

    onSettled: (_data, _err, { familyId }) => {
      qc.invalidateQueries({ queryKey: ['doses', 'today', familyId] });
    },
  });
}

export function useActivityFeed(familyId: string | undefined) {
  return useQuery({
    queryKey: ['activity', familyId],
    enabled: !!familyId,
    staleTime: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('dose_logs')
        .select('*, medicine:medicines(name, dose), responder:profiles!responded_by(name)')
        .eq('family_id', familyId!)
        .neq('status', 'pending')
        .order('responded_at', { ascending: false, nullsFirst: false })
        .limit(50);
      if (error) throw error;
      return (data ?? []) as (DoseLog & { medicine: any; responder: any })[];
    },
  });
}
