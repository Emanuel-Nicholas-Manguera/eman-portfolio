-- Store aggregate counts only. Public visitors can increment known counters,
-- while reads reuse the CMS owner's MFA-gated access policy.
create table public.portfolio_activity_daily (
  activity_day date not null,
  event_key text not null check (event_key in ('page_view', 'experience', 'projects', 'contact')),
  total bigint not null check (total > 0),
  primary key (activity_day, event_key)
);

alter table public.portfolio_activity_daily enable row level security;
revoke all on public.portfolio_activity_daily from public, anon, authenticated;
grant select on public.portfolio_activity_daily to authenticated;
create policy owner_read_activity on public.portfolio_activity_daily
  for select to authenticated using ((select private.is_cms_owner()));

-- This schema is outside the Data API and separate from the CMS private schema.
create schema portfolio_analytics_private;
revoke all on schema portfolio_analytics_private from public, anon, authenticated;
grant usage on schema portfolio_analytics_private to anon;

create function portfolio_analytics_private.increment_activity(activity_key text)
returns void language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null
    or current_setting('role', true) is distinct from 'anon' then
    raise exception 'Anonymous portfolio visitor required' using errcode = '42501';
  end if;

  if activity_key is null or activity_key not in ('page_view', 'experience', 'projects', 'contact') then
    raise exception 'Unknown portfolio activity' using errcode = '22023';
  end if;

  insert into public.portfolio_activity_daily as activity (activity_day, event_key, total)
  values ((now() at time zone 'Asia/Manila')::date, activity_key, 1)
  on conflict (activity_day, event_key) do update set total = activity.total + 1;
end;
$$;
revoke all on function portfolio_analytics_private.increment_activity(text) from public, anon, authenticated;
grant execute on function portfolio_analytics_private.increment_activity(text) to anon;

create function public.record_portfolio_activity(activity_key text)
returns void language sql security invoker set search_path = '' as $$
  select portfolio_analytics_private.increment_activity(activity_key);
$$;
revoke all on function public.record_portfolio_activity(text) from public, anon, authenticated;
grant execute on function public.record_portfolio_activity(text) to anon;
