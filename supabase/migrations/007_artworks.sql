-- 007: お絵描きアルバムのクラウド同期
create table if not exists artworks (
  id          text primary key,
  family_id   uuid not null references families(id) on delete cascade,
  child_id    text not null,
  date        date not null,
  image_url   text not null,
  title       text,
  caption     text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger artworks_updated_at
  before update on artworks
  for each row execute function update_updated_at();

alter table artworks enable row level security;

create policy "artworks_all" on artworks for all
  using (family_id = my_family_id())
  with check (family_id = my_family_id());

create index if not exists artworks_family_date on artworks(family_id, date desc);
