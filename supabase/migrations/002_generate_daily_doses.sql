-- Function called by cron or app to generate dose_log rows for today
create or replace function generate_daily_doses(target_date date default current_date)
returns void language plpgsql security definer as $$
declare
  med record;
  scheduled_time text;
  scheduled_ts timestamptz;
  day_abbr text;
begin
  -- Map JS day-of-week to our abbreviations
  day_abbr := lower(to_char(target_date, 'Dy')); -- 'Mon', 'Tue', etc.

  for med in
    select * from medicines
    where (end_date is null or end_date >= target_date)
      and start_date <= target_date
  loop
    -- Check if this medicine is scheduled for the target day
    if med.schedule->'days' ? day_abbr then
      -- Iterate over scheduled times
      for scheduled_time in
        select jsonb_array_elements_text(med.schedule->'times')
      loop
        scheduled_ts := (target_date::text || ' ' || scheduled_time)::timestamptz;

        -- Insert only if not already existing
        insert into dose_logs (medicine_id, family_id, for_user_id, scheduled_at, status)
        values (med.id, med.family_id, med.for_user_id, scheduled_ts, 'pending')
        on conflict do nothing;
      end loop;
    end if;
  end loop;
end;
$$;

-- Index for fast escalation queries
create index if not exists idx_dose_logs_pending_scheduled
  on dose_logs (scheduled_at, status)
  where status = 'pending';

create index if not exists idx_dose_logs_family
  on dose_logs (family_id, scheduled_at);
