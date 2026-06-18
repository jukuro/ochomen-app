-- ============================================================
-- おたより帳 (ochomen-app) Supabase Initial Schema
-- Run via: supabase db push  or  Supabase Dashboard SQL editor
-- ============================================================

-- ── Extensions ──────────────────────────────────────────────
create extension if not exists "uuid-ossp";

-- ── Families ────────────────────────────────────────────────
-- One family = one household. A user can belong to one family.
create table if not exists families (
  id         uuid primary key default gen_random_uuid(),
  name       text not null default '我が家',
  created_at timestamptz not null default now()
);

-- ── Family Members ──────────────────────────────────────────
-- Links Supabase auth.users to a family with a display name.
create table if not exists family_members (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid not null references families(id) on delete cascade,
  user_id      uuid not null references auth.users(id) on delete cascade,
  display_name text not null,
  role         text not null default 'parent' check (role in ('parent', 'viewer')),
  created_at   timestamptz not null default now(),
  unique(family_id, user_id)
);

-- ── Children ────────────────────────────────────────────────
create table if not exists children (
  id        uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name      text not null,
  avatar    text not null default '👦',
  color     text not null default 'bg-blue-500',
  dot_color text not null default 'bg-blue-500',
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

-- ── Kindergartens ────────────────────────────────────────────
create table if not exists kindergartens (
  id        uuid primary key default gen_random_uuid(),
  family_id uuid not null references families(id) on delete cascade,
  name      text not null,
  created_at timestamptz not null default now()
);

-- ── Categories ───────────────────────────────────────────────
create table if not exists categories (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  name       text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  unique(family_id, name)
);

-- ── Entries (お帳面・お便り) ──────────────────────────────────
create table if not exists entries (
  id         uuid primary key default gen_random_uuid(),
  family_id  uuid not null references families(id) on delete cascade,
  child_ids  uuid[] not null default '{}',
  category   text not null,
  date       date not null,
  ocr_text   text not null default '',
  image_url  text,
  title      text,
  is_read    boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── Todos (やること・買い物・予定) ───────────────────────────
create table if not exists todos (
  id                uuid primary key default gen_random_uuid(),
  family_id         uuid not null references families(id) on delete cascade,
  original_entry_id uuid references entries(id) on delete cascade,
  task              text not null,
  due_date          date,
  is_completed      boolean not null default false,
  assigned_to       text not null default '共通',
  type              text not null default 'todo'
                      check (type in ('todo', 'shopping', 'event')),
  reminder_at       text not null default 'none'
                      check (reminder_at in ('none', 'today', '1day', '3day')),
  reason            text,
  hidden_from_list  boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

-- ── Updated-at trigger ───────────────────────────────────────
create or replace function update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger entries_updated_at
  before update on entries
  for each row execute function update_updated_at();

create trigger todos_updated_at
  before update on todos
  for each row execute function update_updated_at();

-- ── Row Level Security ───────────────────────────────────────
alter table families         enable row level security;
alter table family_members   enable row level security;
alter table children         enable row level security;
alter table kindergartens    enable row level security;
alter table categories       enable row level security;
alter table entries          enable row level security;
alter table todos            enable row level security;

-- Helper: returns the family_id of the calling user
create or replace function my_family_id()
returns uuid language sql stable security definer as $$
  select family_id from family_members
  where user_id = auth.uid()
  limit 1;
$$;

-- families: can see / modify own family
create policy "families_select" on families for select
  using (id = my_family_id());
create policy "families_update" on families for update
  using (id = my_family_id());

-- family_members: can see own family's members
create policy "family_members_select" on family_members for select
  using (family_id = my_family_id());
create policy "family_members_insert" on family_members for insert
  with check (family_id = my_family_id());
create policy "family_members_delete" on family_members for delete
  using (family_id = my_family_id() and user_id = auth.uid());

-- children / kindergartens / categories / entries / todos: same family
create policy "children_all" on children for all
  using (family_id = my_family_id())
  with check (family_id = my_family_id());

create policy "kindergartens_all" on kindergartens for all
  using (family_id = my_family_id())
  with check (family_id = my_family_id());

create policy "categories_all" on categories for all
  using (family_id = my_family_id())
  with check (family_id = my_family_id());

create policy "entries_all" on entries for all
  using (family_id = my_family_id())
  with check (family_id = my_family_id());

create policy "todos_all" on todos for all
  using (family_id = my_family_id())
  with check (family_id = my_family_id());

-- ── Indexes ───────────────────────────────────────────────────
create index if not exists entries_family_date on entries(family_id, date desc);
create index if not exists todos_family_due    on todos(family_id, due_date);
create index if not exists todos_entry         on todos(original_entry_id);
