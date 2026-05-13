export const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL ?? 'https://your-project.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ?? 'your-anon-key';

export const ESCALATION_INTERVALS = {
  FIRST_REMINDER_DELAY: 0,
  SECOND_REMINDER_DELAY: 10,
  FAMILY_ALERT_DELAY: 15,
  MARK_MISSED_DELAY: 30,
};

export const INVITE_TTL_MINUTES = 10;

export const DAYS_OF_WEEK = ['mon', 'tue', 'wed', 'thu', 'fri', 'sat', 'sun'] as const;
export const DAYS_LABELS: Record<string, string> = {
  mon: 'Mon',
  tue: 'Tue',
  wed: 'Wed',
  thu: 'Thu',
  fri: 'Fri',
  sat: 'Sat',
  sun: 'Sun',
};

export const DAY_JS_MAP: Record<string, number> = {
  sun: 0,
  mon: 1,
  tue: 2,
  wed: 3,
  thu: 4,
  fri: 5,
  sat: 6,
};
