/**
 * Mira Escalation Engine — Cloudflare Worker
 *
 * Deploy with: wrangler deploy
 * Cron trigger: runs every minute (* * * * *)
 *
 * Required secrets (wrangler secret put):
 *   SUPABASE_URL
 *   SUPABASE_SERVICE_KEY   (service_role key — bypasses RLS)
 *   FCM_SERVER_KEY         (Firebase Cloud Messaging server key)
 */

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  FCM_SERVER_KEY: string;
}

interface DoseLogRow {
  id: string;
  medicine_id: string;
  family_id: string;
  for_user_id: string;
  scheduled_at: string;
  status: string;
  handling_by: string | null;
  medicine: {
    name: string;
    dose: string | null;
    criticality: string;
    for_user_id: string;
  };
  family: {
    quiet_hours_start: string;
    quiet_hours_end: string;
  };
}

interface DeviceRow {
  fcm_token: string;
  user_id: string;
}

interface FamilyMemberRow {
  user_id: string;
  role: string;
}

const SECOND_NUDGE_MIN = 10;
const FAMILY_ALERT_MIN = 15;
const MARK_MISSED_MIN = 30;

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
  const now = new Date();
  const cutoff = new Date(now.getTime() - SECOND_NUDGE_MIN * 60 * 1000).toISOString();

  const doses = await supabaseQuery<DoseLogRow>(env, `
    /rest/v1/dose_logs?select=id,medicine_id,family_id,for_user_id,scheduled_at,status,handling_by,medicine:medicines(name,dose,criticality),family:families(quiet_hours_start,quiet_hours_end)&status=eq.pending&scheduled_at=lt.${cutoff}&limit=100
  `);

  for (const dose of doses) {
    try {
      await processDose(dose, now, env);
    } catch (err) {
      console.error(`Error processing dose ${dose.id}:`, err);
    }
  }

  const hours = now.getUTCHours();
  const minutes = now.getUTCMinutes();
  if (hours === 0 && minutes < 5) {
    await triggerGenerateDoses(env);
  }
}

async function processDose(dose: DoseLogRow, now: Date, env: Env) {
  const scheduled = new Date(dose.scheduled_at);
  const minsLate = (now.getTime() - scheduled.getTime()) / 60000;
  const isHighCrit = dose.medicine?.criticality === 'high';

  if (!isHighCrit && isQuietHours(now, dose.family?.quiet_hours_start, dose.family?.quiet_hours_end)) {
    return;
  }

  if (minsLate >= MARK_MISSED_MIN) {
    await markMissed(dose, env);
  } else if (minsLate >= FAMILY_ALERT_MIN) {
    await alertFamily(dose, env);
  } else if (minsLate >= SECOND_NUDGE_MIN) {
    await nudgeElder(dose, env);
  }
}

function isQuietHours(now: Date, start?: string, end?: string): boolean {
  if (!start || !end) return false;

  const [sh, sm] = start.split(':').map(Number);
  const [eh, em] = end.split(':').map(Number);
  const currentMinutes = now.getUTCHours() * 60 + now.getUTCMinutes();
  const startMinutes = sh * 60 + sm;
  const endMinutes = eh * 60 + em;

  if (startMinutes > endMinutes) {
    return currentMinutes >= startMinutes || currentMinutes < endMinutes;
  }
  return currentMinutes >= startMinutes && currentMinutes < endMinutes;
}

async function nudgeElder(dose: DoseLogRow, env: Env) {
  const token = await getDeviceToken(dose.for_user_id, env);
  if (!token) return;

  await sendPush(env, [token], {
    title: "Reminder 💊",
    body: `Don't forget your ${dose.medicine.name}${dose.medicine.dose ? ` (${dose.medicine.dose})` : ''}`,
    data: { doseId: dose.id, type: 'reminder' },
  });
}

async function alertFamily(dose: DoseLogRow, env: Env) {
  await supabasePatch(env, `/rest/v1/dose_logs?id=eq.${dose.id}`, { status: 'escalated' });

  const members = await supabaseQuery<FamilyMemberRow>(
    env,
    `/rest/v1/family_members?family_id=eq.${dose.family_id}&role=neq.elder&select=user_id,role`
  );

  const userIds = members.map((m) => m.user_id);
  const tokens = await getDeviceTokensForUsers(userIds, env);
  if (tokens.length === 0) return;

  const elderName = await getProfileName(dose.for_user_id, env);

  await sendPush(env, tokens, {
    title: `⚠️ ${elderName} hasn't taken their medicine`,
    body: `${dose.medicine.name} was due ${Math.round((Date.now() - new Date(dose.scheduled_at).getTime()) / 60000)} minutes ago`,
    data: { doseId: dose.id, type: 'family_alert', familyId: dose.family_id },
  });
}

async function markMissed(dose: DoseLogRow, env: Env) {
  await supabasePatch(env, `/rest/v1/dose_logs?id=eq.${dose.id}`, { status: 'missed' });

  const members = await supabaseQuery<FamilyMemberRow>(
    env,
    `/rest/v1/family_members?family_id=eq.${dose.family_id}&role=eq.caregiver&select=user_id,role`
  );

  const tokens = await getDeviceTokensForUsers(members.map((m) => m.user_id), env);
  if (tokens.length === 0) return;

  const elderName = await getProfileName(dose.for_user_id, env);

  await sendPush(env, tokens, {
    title: `❌ ${elderName} missed their medicine`,
    body: `${dose.medicine.name} has been logged as missed.`,
    data: { doseId: dose.id, type: 'missed', familyId: dose.family_id },
  });
}

async function getDeviceToken(userId: string, env: Env): Promise<string | null> {
  const rows = await supabaseQuery<DeviceRow>(
    env,
    `/rest/v1/devices?user_id=eq.${userId}&select=fcm_token&limit=1`
  );
  return rows[0]?.fcm_token ?? null;
}

async function getDeviceTokensForUsers(userIds: string[], env: Env): Promise<string[]> {
  if (userIds.length === 0) return [];
  const filter = userIds.map((id) => `user_id.eq.${id}`).join(',');
  const rows = await supabaseQuery<DeviceRow>(
    env,
    `/rest/v1/devices?or=(${filter})&select=fcm_token`
  );
  return rows.map((r) => r.fcm_token);
}

async function getProfileName(userId: string, env: Env): Promise<string> {
  const rows = await supabaseQuery<{ name: string }>(
    env,
    `/rest/v1/profiles?id=eq.${userId}&select=name&limit=1`
  );
  return rows[0]?.name ?? 'Your family member';
}

async function triggerGenerateDoses(env: Env) {
  await fetch(`${env.SUPABASE_URL}/rest/v1/rpc/generate_daily_doses`, {
    method: 'POST',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({}),
  });
}

async function supabaseQuery<T>(env: Env, path: string): Promise<T[]> {
  const url = `${env.SUPABASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Supabase query failed: ${res.status} ${text}`);
  }
  return res.json() as Promise<T[]>;
}

async function supabasePatch(env: Env, path: string, body: Record<string, unknown>) {
  const url = `${env.SUPABASE_URL}${path}`;
  await fetch(url, {
    method: 'PATCH',
    headers: {
      apikey: env.SUPABASE_SERVICE_KEY,
      Authorization: `Bearer ${env.SUPABASE_SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(body),
  });
}

async function sendPush(
  env: Env,
  tokens: string[],
  notification: { title: string; body: string; data?: Record<string, string> }
) {
  if (tokens.length === 0) return;

  const messages = tokens.map((token) => ({
    to: token,
    notification: { title: notification.title, body: notification.body },
    data: notification.data ?? {},
    android: { priority: 'high' as const },
    apns: { headers: { 'apns-priority': '10' } },
  }));

  await Promise.allSettled(
    messages.map((msg) =>
      fetch('https://fcm.googleapis.com/fcm/send', {
        method: 'POST',
        headers: {
          Authorization: `key=${env.FCM_SERVER_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(msg),
      })
    )
  );
}
