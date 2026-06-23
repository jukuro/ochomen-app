-- ============================================================
-- 004: ローカルID互換（text）+ 端末間 XP/ポイント同期
-- ============================================================

alter table families
  add column if not exists user_progress jsonb not null default '{}'::jsonb,
  add column if not exists points_wallet jsonb not null default '{}'::jsonb;

-- entries.id / todos / children は entry_* や c1 など text ID を許容
alter table todos drop constraint if exists todos_original_entry_id_fkey;

alter table entries alter column id drop default;
alter table entries alter column id type text using id::text;

alter table todos alter column id drop default;
alter table todos alter column id type text using id::text;
alter table todos alter column original_entry_id type text using original_entry_id::text;

alter table children alter column id drop default;
alter table children alter column id type text using id::text;

-- uuid[] → text[] は ::text[] で要素ごと変換（サブクエリ不可）
alter table entries
  alter column child_ids type text[]
  using coalesce(child_ids::text[], '{}'::text[]);

alter table todos drop constraint if exists todos_original_entry_id_fkey;
alter table todos
  add constraint todos_original_entry_id_fkey
  foreign key (original_entry_id) references entries(id) on delete cascade;
