create table if not exists public.page_view_events (
  id uuid primary key default gen_random_uuid(),
  source text not null default 'product_site' check (source in ('product_site')),
  path text not null default '/',
  locale text,
  referrer text,
  user_agent text,
  viewed_at timestamptz not null default now()
);

create index if not exists page_view_events_viewed_at_idx
  on public.page_view_events (viewed_at desc);

create index if not exists page_view_events_source_viewed_at_idx
  on public.page_view_events (source, viewed_at desc);

create or replace view public.daily_page_view_metrics as
select
  (viewed_at at time zone 'utc')::date as metric_date,
  source,
  path,
  count(*) as view_count
from public.page_view_events
group by 1, 2, 3;

alter table public.page_view_events enable row level security;
