-- 008: お子さまプロフィール（生年月日・メモ）
alter table children add column if not exists birth_date date;
alter table children add column if not exists profile_note text;
