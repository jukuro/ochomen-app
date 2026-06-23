-- 005: お帳面 sections（先生/保護者ブロック）をクラウド同期
alter table entries
  add column if not exists sections jsonb not null default '[]'::jsonb;
