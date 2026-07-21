

-- pgcrypto for password hashing
create extension if not exists pgcrypto;

-- Extend hazards status to include 'rejected'
alter table public.hazards
  drop constraint if exists hazards_status_check;

alter table public.hazards
  add constraint hazards_status_check
    check (status in ('reported', 'under_review', 'verified', 'repaired', 'rejected'));

-- Admin config table (single row)
create table if not exists public.admin_config (
  id int primary key default 1,
  username text not null unique,
  password_hash text not null,
  created_at timestamptz default now(),
  constraint single_row check (id = 1)
);

alter table public.admin_config enable row level security;

create policy "Deny all direct access to admin_config"
  on public.admin_config for all using (false);

-- Insert default admin credentials (change password after setup)
insert into public.admin_config (id, username, password_hash)
values (1, '[EMAIL_ADDRESS]', crypt('xxxxxxx', gen_salt('bf')))
on conflict (id) do nothing;

-- Gov accounts table
create table if not exists public.gov_accounts (
  id uuid primary key default uuid_generate_v4(),
  dept_name text not null,
  username text not null unique,
  password_hash text not null,
  map_access text not null default 'road_only'
    check (map_access in ('road_only', 'infrastructure', 'full')),
  can_edit boolean not null default false,
  can_remove boolean not null default false,
  area_bounds geography(polygon, 4326),
  area_label text,
  is_active boolean not null default true,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

alter table public.gov_accounts enable row level security;

create policy "Deny all direct access to gov_accounts"
  on public.gov_accounts for all using (false);

-- ============================================================
-- ADMIN RPCs (all security definer = run as DB owner)
-- ============================================================

-- 1. Admin login
create or replace function public.admin_login(
  p_username text,
  p_password text
) returns boolean as $$
declare
  v_hash text;
begin
  select password_hash into v_hash
  from public.admin_config
  where username = p_username;
  if v_hash is null then
    return false;
  end if;
  return v_hash = crypt(p_password, v_hash);
end;
$$ language plpgsql security definer;

grant execute on function public.admin_login to anon, authenticated;

-- 2. Get all hazards (admin view, no filter)
create or replace function public.admin_get_all_hazards()
returns table (
  id uuid,
  type varchar,
  location text,
  severity_score int,
  status varchar,
  source varchar,
  confidence_score float,
  image_url text,
  confirmation_count int,
  created_at timestamptz,
  updated_at timestamptz,
  lat float,
  lon float
) as $$
begin
  return query
  select
    h.id,
    h.type,
    st_astext(h.location::geometry) as location,
    h.severity_score,
    h.status,
    h.source,
    h.confidence_score,
    h.image_url,
    h.confirmation_count,
    h.created_at,
    h.updated_at,
    st_y(h.location::geometry) as lat,
    st_x(h.location::geometry) as lon
  from public.hazards h
  order by h.created_at desc;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_get_all_hazards to anon, authenticated;

-- 3. Approve hazard (set verified)
create or replace function public.admin_approve_hazard(p_hazard_id uuid)
returns void as $$
begin
  update public.hazards
  set status = 'verified', updated_at = now()
  where id = p_hazard_id;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_approve_hazard to anon, authenticated;

-- 4. Reject hazard (set rejected)
create or replace function public.admin_reject_hazard(p_hazard_id uuid)
returns void as $$
begin
  update public.hazards
  set status = 'rejected', updated_at = now()
  where id = p_hazard_id;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_reject_hazard to anon, authenticated;

-- 5. Update hazard fields
create or replace function public.admin_update_hazard(
  p_hazard_id uuid,
  p_type varchar,
  p_severity int,
  p_status varchar
) returns void as $$
begin
  update public.hazards
  set
    type = p_type,
    severity_score = p_severity,
    status = p_status,
    updated_at = now()
  where id = p_hazard_id;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_update_hazard to anon, authenticated;

-- 6. Get all gov accounts
create or replace function public.admin_get_all_gov_accounts()
returns table (
  id uuid,
  dept_name text,
  username text,
  map_access text,
  can_edit boolean,
  can_remove boolean,
  area_label text,
  area_bounds text,
  is_active boolean,
  created_at timestamptz
) as $$
begin
  return query
  select
    g.id,
    g.dept_name,
    g.username,
    g.map_access,
    g.can_edit,
    g.can_remove,
    g.area_label,
    case when g.area_bounds is not null then st_asgeojson(g.area_bounds::geometry) else null end as area_bounds,
    g.is_active,
    g.created_at
  from public.gov_accounts g
  order by g.created_at desc;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_get_all_gov_accounts to anon, authenticated;

-- 7. Create gov account
create or replace function public.admin_create_gov_account(
  p_dept_name text,
  p_username text,
  p_password text,
  p_map_access text,
  p_can_edit boolean,
  p_can_remove boolean,
  p_area_label text default null,
  p_area_geojson text default null
) returns uuid as $$
declare
  v_id uuid;
  v_bounds geography;
begin
  if p_area_geojson is not null then
    v_bounds := st_geomfromgeojson(p_area_geojson)::geography;
  end if;
  insert into public.gov_accounts (
    dept_name, username, password_hash,
    map_access, can_edit, can_remove,
    area_label, area_bounds
  ) values (
    p_dept_name, p_username, crypt(p_password, gen_salt('bf')),
    p_map_access, p_can_edit, p_can_remove,
    p_area_label, v_bounds
  ) returning id into v_id;
  return v_id;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_create_gov_account to anon, authenticated;

-- 8. Update gov account
create or replace function public.admin_update_gov_account(
  p_gov_id uuid,
  p_dept_name text,
  p_map_access text,
  p_can_edit boolean,
  p_can_remove boolean,
  p_is_active boolean,
  p_area_label text default null,
  p_area_geojson text default null
) returns void as $$
declare
  v_bounds geography;
begin
  if p_area_geojson is not null then
    v_bounds := st_geomfromgeojson(p_area_geojson)::geography;
  end if;
  update public.gov_accounts set
    dept_name = p_dept_name,
    map_access = p_map_access,
    can_edit = p_can_edit,
    can_remove = p_can_remove,
    is_active = p_is_active,
    area_label = p_area_label,
    area_bounds = coalesce(v_bounds, area_bounds),
    updated_at = now()
  where id = p_gov_id;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_update_gov_account to anon, authenticated;

-- 9. Delete gov account
create or replace function public.admin_delete_gov_account(p_gov_id uuid)
returns void as $$
begin
  delete from public.gov_accounts where id = p_gov_id;
end;
$$ language plpgsql security definer;

grant execute on function public.admin_delete_gov_account to anon, authenticated;
