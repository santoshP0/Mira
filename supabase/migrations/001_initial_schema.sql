-- Enable required extensions
create extension if not exists "uuid-ossp";

-- ─────────────────────────────────────────────
-- PROFILES (extends auth.users)
-- ─────────────────────────────────────────────
create table profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  photo_url text,
  phone text,
  preferred_language text default 'en',
  created_at timestamptz default now()
);

alter table profiles enable row level security;

create policy "Users can view their own profile"
  on profiles for select using (auth.uid() = id);

create policy "Users can update their own profile"
  on profiles for update using (auth.uid() = id);

create policy "Users can insert their own profile"
  on profiles for insert with check (auth.uid() = id);

-- ─────────────────────────────────────────────
-- FAMILIES
-- ─────────────────────────────────────────────
create table families (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_by uuid references profiles on delete set null,
  quiet_hours_start time default '23:00',
  quiet_hours_end time default '06:00',
  created_at timestamptz default now()
);

alter table families enable row level security;

-- ─────────────────────────────────────────────
-- FAMILY_MEMBERS
-- ─────────────────────────────────────────────
create table family_members (
  family_id uuid references families on delete cascade,
  user_id uuid references profiles on delete cascade,
  role text check (role in ('elder', 'caregiver', 'family')) not null,
  joined_at timestamptz default now(),
  primary key (family_id, user_id)
);

alter table family_members enable row level security;

-- Helper: check if the calling user is a member of a given family
create or replace function is_family_member(fid uuid)
returns boolean language sql security definer as $$
  select exists (
    select 1 from family_members
    where family_id = fid and user_id = auth.uid()
  );
$$;

-- Families: members can see their family
create policy "Family members can view family"
  on families for select using (is_family_member(id));

create policy "Family members can update family"
  on families for update using (is_family_member(id));

create policy "Authenticated users can create families"
  on families for insert with check (auth.uid() = created_by);

-- Family members: members can see other members
create policy "Family members can view members"
  on family_members for select using (is_family_member(family_id));

create policy "Authenticated users can join families"
  on family_members for insert with check (auth.uid() = user_id);

create policy "Members can remove themselves; admins can remove others"
  on family_members for delete using (
    auth.uid() = user_id
    or exists (
      select 1 from family_members fm
      join families f on f.id = fm.family_id
      where fm.family_id = family_id
        and fm.user_id = auth.uid()
        and fm.role = 'caregiver'
        and f.created_by = auth.uid()
    )
  );

-- Also allow family members to read each other's profiles
create policy "Family members can view each other's profiles"
  on profiles for select using (
    auth.uid() = id
    or exists (
      select 1 from family_members fm1
      join family_members fm2 on fm1.family_id = fm2.family_id
      where fm1.user_id = auth.uid() and fm2.user_id = id
    )
  );

-- ─────────────────────────────────────────────
-- INVITES
-- ─────────────────────────────────────────────
create table invites (
  token text primary key,
  family_id uuid references families on delete cascade,
  created_by uuid references profiles on delete set null,
  expires_at timestamptz not null,
  used_at timestamptz,
  used_by uuid references profiles on delete set null
);

alter table invites enable row level security;

create policy "Family members can create invites"
  on invites for insert with check (is_family_member(family_id));

create policy "Family members can view invites"
  on invites for select using (is_family_member(family_id) or true);

create policy "Anyone can update invite (accept)"
  on invites for update using (true);

-- ─────────────────────────────────────────────
-- MEDICINES
-- ─────────────────────────────────────────────
create table medicines (
  id uuid primary key default gen_random_uuid(),
  family_id uuid references families on delete cascade,
  for_user_id uuid references profiles on delete cascade,
  name text not null,
  dose text,
  photo_url text,
  schedule jsonb not null,
  start_date date not null,
  end_date date,
  criticality text default 'normal' check (criticality in ('normal', 'high')),
  created_by uuid references profiles on delete set null,
  created_at timestamptz default now()
);

alter table medicines enable row level security;

create policy "Family members can view medicines"
  on medicines for select using (is_family_member(family_id));

create policy "Caregivers can manage medicines"
  on medicines for insert with check (is_family_member(family_id));

create policy "Caregivers can update medicines"
  on medicines for update using (is_family_member(family_id));

create policy "Caregivers can delete medicines"
  on medicines for delete using (is_family_member(family_id));

-- ─────────────────────────────────────────────
-- DOSE_LOGS
-- ─────────────────────────────────────────────
create table dose_logs (
  id uuid primary key default gen_random_uuid(),
  medicine_id uuid references medicines on delete cascade,
  family_id uuid references families on delete cascade,
  for_user_id uuid references profiles on delete cascade,
  scheduled_at timestamptz not null,
  status text default 'pending' check (status in ('pending', 'taken', 'skipped', 'missed', 'escalated')),
  responded_at timestamptz,
  responded_by uuid references profiles on delete set null,
  handling_by uuid references profiles on delete set null,
  notes text
);

alter table dose_logs enable row level security;

create policy "Family members can view dose logs"
  on dose_logs for select using (is_family_member(family_id));

create policy "Family members can insert dose logs"
  on dose_logs for insert with check (is_family_member(family_id));

create policy "Family members can update dose logs"
  on dose_logs for update using (is_family_member(family_id));

-- ─────────────────────────────────────────────
-- DEVICES (FCM tokens)
-- ─────────────────────────────────────────────
create table devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles on delete cascade,
  fcm_token text not null,
  platform text check (platform in ('ios', 'android')),
  updated_at timestamptz default now(),
  unique (user_id)
);

alter table devices enable row level security;

create policy "Users can manage their own devices"
  on devices for all using (auth.uid() = user_id);

-- ─────────────────────────────────────────────
-- REALTIME
-- ─────────────────────────────────────────────
alter publication supabase_realtime add table dose_logs;
alter publication supabase_realtime add table family_members;
