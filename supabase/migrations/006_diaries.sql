-- 006: 成長日記のクラウド同期
create table if not exists diaries (
  id             text primary key,
  family_id      uuid not null references families(id) on delete cascade,
  child_id       text not null,
  date           date not null,
  raw_memo       text not null default '',
  content        text not null default '',
  image_url      text,
  stretch_level  text check (stretch_level in ('raw', 'light', 'deep')),
  tags           jsonb not null default '[]'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger diaries_updated_at
  before update on diaries
  for each row execute function update_updated_at();

alter table diaries enable row level security;

create policy "diaries_all" on diaries for all
  using (family_id = my_family_id())
  with check (family_id = my_family_id());

create index if not exists diaries_family_date on diaries(family_id, date desc);
