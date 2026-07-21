-- Gov Panel RPCs
-- Run in Supabase SQL Editor

create or replace function public.gov_login(
  p_username text,
  p_password text
) returns json as $$
declare
  v_id uuid;
  v_hash text;
  v_result json;
begin
  select id, password_hash into v_id, v_hash
  from public.gov_accounts
  where username = p_username and is_active = true;
  if v_id is null or v_hash != crypt(p_password, v_hash) then
    return null;
  end if;
  select json_build_object(
    'id', g.id,
    'dept_name', g.dept_name,
    'username', g.username,
    'map_access', g.map_access,
    'can_edit', g.can_edit,
    'can_remove', g.can_remove,
    'area_label', g.area_label,
    'area_geojson', case when g.area_bounds is not null
      then st_asgeojson(g.area_bounds::geometry) else null end
  ) into v_result
  from public.gov_accounts g
  where g.id = v_id;
  return v_result;
end;
$$ language plpgsql security definer;

grant execute on function public.gov_login to anon, authenticated;

create or replace function public.gov_get_hazards(p_gov_id uuid)
returns table (
  id uuid, type varchar, severity_score int, status varchar,
  source varchar, image_url text, confirmation_count int,
  created_at timestamptz, lat float, lon float
) as $$
begin
  if not exists (
    select 1 from public.gov_accounts g
    where g.id = p_gov_id and g.is_active = true
  ) then return; end if;
  return query
  select
    h.id, h.type, h.severity_score, h.status, h.source, h.image_url,
    h.confirmation_count, h.created_at,
    st_y(h.location::geometry)::float as lat,
    st_x(h.location::geometry)::float as lon
  from public.hazards h
  where h.status != 'rejected'
  order by h.created_at desc;
end;
$$ language plpgsql security definer;

grant execute on function public.gov_get_hazards to anon, authenticated;

create or replace function public.gov_update_hazard_status(
  p_gov_id uuid,
  p_hazard_id uuid,
  p_status varchar
) returns void as $$
declare v_can_edit boolean;
begin
  select can_edit into v_can_edit
  from public.gov_accounts where id = p_gov_id and is_active = true;
  if not coalesce(v_can_edit, false) then
    raise exception 'Permission denied: edit access required';
  end if;
  update public.hazards
  set status = p_status, updated_at = now()
  where id = p_hazard_id;
end;
$$ language plpgsql security definer;

grant execute on function public.gov_update_hazard_status to anon, authenticated;

create or replace function public.gov_remove_hazard(
  p_gov_id uuid,
  p_hazard_id uuid
) returns void as $$
declare v_can_remove boolean;
begin
  select can_remove into v_can_remove
  from public.gov_accounts where id = p_gov_id and is_active = true;
  if not coalesce(v_can_remove, false) then
    raise exception 'Permission denied: remove access required';
  end if;
  update public.hazards
  set status = 'rejected', updated_at = now()
  where id = p_hazard_id;
end;
$$ language plpgsql security definer;

grant execute on function public.gov_remove_hazard to anon, authenticated;
