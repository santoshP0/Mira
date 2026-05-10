/**
 * Mira Escalation Engine — Cloudflare Worker
 *
 * Deploy with: wrangler deploy
 * Cron trigger: runs every minute (* * * * *)
 *
 * Required secrets (wrangler secret put):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY   (service_role key — bypasses RLS)
 *
 * Push notifications go through Expo's push API — no FCM server key needed.
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
}

interface DoseLogRow {
  id: string;
  medicine_id: string;
  family_id: string;
  for_user_id: string;
  scheduled_at: string;
  status: string;
  handling_by: string | null;
  medicine: { name: string; dose: string | null; criticality: string };
  family: { quiet_hours_start: string; quiet_hours_end: string };
}

interface DeviceRow { fcm_token: string; user_id: string; }
interface FamilyMemberRow { user_id: string; role: string; }

const SECOND_NUDGE_MIN = 10;
const FAMILY_ALERT_MIN = 15;
const MARK_MISSED_MIN  = 30;

export default {
  async scheduled(_event: ScheduledEvent, env: Env, ctx: ExecutionContext) {
    ctx.waitUntil(runEscalations(env));
  },
  async fetch(request: Request, env: Env): Promise<Response> {
    if (new URL(request.url).pathname === '/run') {
      await runEscalations(env);
      return new Response('Escalation run complete', { status: 200 });
    }
    return new Response('Mira Escalation Worker', { status: 200 });
  },
};

async function runEscalations(env: Env) {
  const now    = new Date();
  const cutoff = new Date(now.getTime() - SECOND_NUDGE_MIN * 60 * 1000).toISOString();

  // Fetch BOTH 'pending' AND 'escalated' doses past the earliest threshold.
  // Previously only 'pending' was fetched — this caused markMissed to never run
  // because alertFamily sets status='escalated' before the 30-min threshold.
  const doses = await supabaseQuery<DoseLogRow>(env,
    `/rest/v1/dose_logs?select=id,medicine_id,family_id,for_user_id,scheduled_at,status,handling_by,medicine:medicines(name,dose,criticality),family:families(quiet_hours_start,quiet_hours_end)&status=in.(pending,escalated)&scheduled_at=lt.${cutoff}&limit=100`
  );

  for (const dose of doses) {
    try { await processDose(dose, now, env); }
    catch (err) { console.error(`Error processing dose ${dose.id}:`, err); }
  }

  const hours = now.getUTCHours(), minutes = now.getUTCMinutes();
  if (hours === 0 && minutes < 5) await triggerGenerateDoses(env);
}

async function processDose(dose: DoseLogRow, now: Date, env: Env) {
  const minsLate  = (now.getTime() - new Date(dose.scheduled_at).getTime()) / 60000;
  const isHighCrit = dose.medicine?.criticality === 'high';

  if (!isHighCrit && isQuietHours(now, dose.family?.quiet_hours_start, dose.family?.quiet_hours_end)) return;

  // Status gate prevents duplicate escalation at each level.
  if      (minsLate >= MARK_MISSED_MIN  && dose.status === 'escalated') await markMissed(dose, env);
  else if (minsLate >= FAMILY_ALERT_MIN && dose.status === 'pending')   await alertFamily(dose, env);
  else if (minsLate >= SECOND_NUDGE_MIN && dose.status === 'pending')   await nudgeElder(dose, env);
}

function isQuietHours(now: Date, start?: string, end?: string): boolean {
  if (!start || !end) return false;
  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const cur   = now.getUTCHours() * 60 + now.getUTCMinutes();
  const begin = sh * 60 + sm;
  const finish = eh * 60 + em;
  return begin > finish ? (cur >= begin || cur < finish) : (cur >= begin && cur < finish);
}

async function nudgeElder(dose: DoseLogRow, env: Env) {
  const token = await getDeviceToken(dose.for_user_id, env);
  if (!token) return;
  await sendPush(env, [token], {
    title: 'Medicine Reminder',
    body: `Time to take ${dose.medicine.name}${dose.medicine.dose ? ` (${dose.medicine.dose})` : ''}`,
    data: { doseId: dose.id, type: 'reminder' },
    channelId: 'mira-reminders',
  });
}

async function alertFamily(dose: DoseLogRow, env: Env) {
  await supabasePatch(env, `/rest/v1/dose_logs?id=eq.${dose.id}`, { status: 'escalated' });

  const members = await supabaseQuery<FamilyMemberRow>(env,
    `/rest/v1/family_members?family_id=eq.${dose.family_id}&role=neq.elder&select=user_id,role`);

  const tokens = await getDeviceTokensForUsers(members.map((m) => m.user_id), env);
  if (tokens.length === 0) return;

  const elderName = await getProfileName(dose.for_user_id, env);
  const minsLate  = Math.round((Date.now() - new Date(dose.scheduled_at).getTime()) / 60000);

  await sendPush(env, tokens, {
    title: `${elderName} hasn't taken their medicine`,
    body:  `${dose.medicine.name} was due ${minsLate} minute${minsLate !== 1 ? 's' : ''} ago`,
    data:  { doseId: dose.id, type: 'family_alert', familyId: dose.family_id },
    channelId: 'mira-alerts',
  });
}

async function markMissed(dose: DoseLogRow, env: Env) {
  await supabasePatch(env, `/rest/v1/dose_logs?id=eq.${dose.id}`, { status: 'missed' });

  const members = await supabaseQuery<FamilyMemberRow>(env,
    `/rest/v1/family_members?family_id=eq.${dose.family_id}&role=eq.caregiver&select=user_id,role`);

  const tokens = await getDeviceTokensForUsers(members.map((m) => m.user_id), env);
  if (tokens.length === 0) return;

  const elderName = await getProfileName(dose.for_user_id, env);

  await sendPush(env, tokens, {
    title: `${elderName} missed their medicine`,
    body:  `${dose.medicine.name} has been logged as missed.`,
    data:  { doseId: dose.id, type: 'missed', familyId: dose.family_id },
    channelId: 'mira-alerts',
  });
}

async function getDeviceToken(userId: string, env: Env): Promise<string | null> {
  const rows = await supabaseQuery<DeviceRow>(env, `/rest/v1/devices?user_id=eq.${userId}&select=fcm_token&limit=1`);
  return rows[0]?.fcm_token ?? null;
}

async function getDeviceTokensForUsers(userIds: string[], env: Env): Promise<string[]> {
  if (userIds.length === 0) return [];
  const filter = userIds.map((id) => `user_id.eq.${id}`).join(',');
  const rows   = await supabaseQuery<DeviceRow>(env, `/rest/v1/devices?or=(${filter})&select=fcm_token`);
  return rows.map((r) => r.fcm_token).filter(Boolean);
}

async function getProfileName(userId: string, env: Env): Promise<string> {
  const rows = await supabaseQuery<{ name: string }>(env, `/rest/v1/profiles?id=eq.${userId}&select=name&limit=1`);
  return rows[0]?.name ?? 'Your family member';
}

async function triggerGenerateDoses(env: Env) {
  const res = await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/generate_daily_doses`, {
    method: 'POST',
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({}),
  });
  if (!res.ok) console.error('generate_daily_doses failed:', await res.text());
}

async function supabaseQuery<T>(env: Env, path: string): Promise<T[]> {
  const res = await fetch(`${env.SUPABASE_URL}${path.trim()}`, {
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, Accept: 'application/json' },
  });
  if (!res.ok) throw new Error(`Supabase query failed: ${res.status} ${await res.text()}`);
  return res.json() as Promise<T[]>;
}

async function supabasePatch(env: Env, path: string, body: Record<string, unknown>) {
  const res = await fetch(`${env.SUPABASE_URL}${path}`, {
    method: 'PATCH',
    headers: { apikey: env.SUPABASE_SERVICE_KEY, Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error('supabasePatch failed:', path, await res.text());
}

// Send via Expo Push API — handles iOS (APNs) and Android (FCM) transparently.
async function sendPush(
  _env: Env,
  tokens: string[],
  notification: { title: string; body: string; data?: Record<string, string>; channelId?: string }
) {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token, sound: 'default', title: notification.title, body: notification.body,
    data: notification.data ?? {}, priority: 'high', channelId: notification.channelId ?? 'mira-reminders',
  }));

  const chunks: typeof messages[] = [];
  for (let i = 0; i < messages.length; i += 100) chunks.push(messages.slice(i, i + 100));

  const results = await Promise.allSettled(
    chunks.map((chunk) => fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: { Accept: 'application/json', 'Accept-Encoding': 'gzip, deflate', 'Content-Type': 'application/json' },
      body: JSON.stringify(chunk),
    }))
  );

  for (const r of results) {
    if (r.status === 'rejected') console.error('Push send failed:', r.reason);
  }
}
