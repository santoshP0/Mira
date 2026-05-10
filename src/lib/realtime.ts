import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { supabase } from './supabase';

export function useRealtimeDoses(familyId: string | undefined) {
  const qc = useQueryClient();

  useEffect(() => {
    if (!familyId) return;

    const channel = supabase
      .channel(`dose_logs:${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'dose_logs',
          filter: `family_id=eq.${familyId}`,
        },
        () => {
          qc.invalidateQueries({ queryKey: ['doses', 'today', familyId] });
          qc.invalidateQueries({ queryKey: ['activity', familyId] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [familyId, qc]);
}
