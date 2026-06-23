-- 009: 祖父母共有フラグ（日記・お絵描き）
alter table diaries add column if not exists share_with_grandparents boolean not null default false;
alter table artworks add column if not exists share_with_grandparents boolean not null default false;
