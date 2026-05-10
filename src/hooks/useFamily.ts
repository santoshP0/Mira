import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import { FamilyMember, Invite } from '../types';
import { INVITE_TTL_MINUTES } from '../constants/config';
import { addMinutes } from 'date-fns';

export function useFamilyMembers(familyId: string | undefined) {
  return useQuery({
    queryKey: ['family-members', familyId],
    enabled: !!familyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('family_members')
        .select('*, profile:profiles(*)')
        .eq('family_id', familyId!);
      if (error) throw error;
      return data as (FamilyMember & { profile: any })[];
    },
  });
}

export function useCreateFamily() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ name, userId }: { name: string; userId: string }) => {
      const { data: family, error: familyErr } = await supabase
        .from('families')
        .insert({ name, created_by: userId })
        .select()
        .single();
      if (familyErr) throw familyErr;

      const { error: memberErr } = await supabase.from('family_members').insert({
        family_id: family.id,
        user_id: userId,
        role: 'caregiver',
      });
      if (memberErr) throw memberErr;

      return family;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
}

export function useGenerateInvite() {
  return useMutation({
    mutationFn: async ({ familyId, createdBy }: { familyId: string; createdBy: string }) => {
      const token = Math.random().toString(36).substring(2, 10).toUpperCase();
      const expiresAt = addMinutes(new Date(), INVITE_TTL_MINUTES).toISOString();

      const { data, error } = await supabase
        .from('invites')
        .insert({ token, family_id: familyId, created_by: createdBy, expires_at: expiresAt })
        .select()
        .single();
      if (error) throw error;
      return data as Invite;
    },
  });
}

export function useAcceptInvite() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({
      token,
      userId,
      role,
    }: {
      token: string;
      userId: string;
      role: 'caregiver' | 'family' | 'elder';
    }) => {
      const { data: invite, error: inviteErr } = await supabase
        .from('invites')
        .select('*')
        .eq('token', token)
        .is('used_at', null)
        .gt('expires_at', new Date().toISOString())
        .single();

      if (inviteErr || !invite) throw new Error('Invite not found or expired');

      const { error: memberErr } = await supabase.from('family_members').insert({
        family_id: invite.family_id,
        user_id: userId,
        role,
      });
      if (memberErr) throw memberErr;

      await supabase
        .from('invites')
        .update({ used_at: new Date().toISOString(), used_by: userId })
        .eq('token', token);

      const { data: family } = await supabase
        .from('families')
        .select('*')
        .eq('id', invite.family_id)
        .single();

      return family;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['family-members'] });
    },
  });
}

export function useRemoveMember() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ familyId, userId }: { familyId: string; userId: string }) => {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('family_id', familyId)
        .eq('user_id', userId);
      if (error) throw error;
      return familyId;
    },
    onSuccess: (familyId) => {
      qc.invalidateQueries({ queryKey: ['family-members', familyId] });
    },
  });
}
