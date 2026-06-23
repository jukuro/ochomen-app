-- Apple Calendar 購読用 ICS スナップショット（token URL で公開読み取り）
create table if not exists public.calendar_feed_snapshots (
  token text primary key,
  ics_body text not null,
  updated_at timestamptz not null default now()
);

create index if not exists calendar_feed_snapshots_updated_at_idx
  on public.calendar_feed_snapshots (updated_at desc);

alter table public.calendar_feed_snapshots enable row level security;

-- サービスロール経由の API のみが読み書き（anon 直接アクセス不可）
drop policy if exists "calendar_feed_no_public_access" on public.calendar_feed_snapshots;
create policy "calendar_feed_no_public_access"
  on public.calendar_feed_snapshots
  for all
  using (false)
  with check (false);
