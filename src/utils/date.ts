import { format, isToday, isTomorrow, parseISO, startOfDay, endOfDay, addMinutes } from 'date-fns';
import { DAY_JS_MAP } from '../constants/config';

export function formatTime(isoString: string): string {
  return format(parseISO(isoString), 'h:mm a');
}

export function formatDate(isoString: string): string {
  const date = parseISO(isoString);
  if (isToday(date)) return 'Today';
  if (isTomorrow(date)) return 'Tomorrow';
  return format(date, 'MMM d');
}

export function formatRelative(isoString: string): string {
  const date = parseISO(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMin = Math.floor(diffMs / 60000);

  if (diffMin < 1) return 'just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  return format(date, 'MMM d');
}

export function todayScheduledAt(timeStr: string): string {
  const [hours, minutes] = timeStr.split(':').map(Number);
  const date = new Date();
  date.setHours(hours, minutes, 0, 0);
  return date.toISOString();
}

export function isScheduledForToday(schedule: { times: string[]; days: string[] }): boolean {
  const todayDay = new Date().getDay();
  return schedule.days.some((d) => DAY_JS_MAP[d] === todayDay);
}

export function getStartOfDay(): string {
  return startOfDay(new Date()).toISOString();
}

export function getEndOfDay(): string {
  return endOfDay(new Date()).toISOString();
}

export function minutesOverdue(scheduledAt: string): number {
  const diff = Date.now() - parseISO(scheduledAt).getTime();
  return Math.floor(diff / 60000);
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}
