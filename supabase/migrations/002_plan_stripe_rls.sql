-- ============================================================
-- 002: Stripe 連携フィールド + 初回家族作成 RLS 修正
-- ============================================================

-- プラン・Stripe 顧客 ID（Webhook 同期用）
alter table families
  add column if not exists plan text not null default 'free'
    check (plan in ('free', 'premium')),
  add column if not exists stripe_customer_id text;

create unique index if not exists families_stripe_customer_id_idx
  on families(stripe_customer_id)
  where stripe_customer_id is not null;

-- 初回ログイン時: 認証済みユーザーが家族を作成できる
drop policy if exists "families_insert" on families;
create policy "families_insert" on families for insert
  with check (auth.uid() is not null);

-- 初回メンバー登録: まだ家族に属していないユーザーは自分を紐付け可能
drop policy if exists "family_members_insert" on family_members;
create policy "family_members_insert" on family_members for insert
  with check (
    user_id = auth.uid()
    and (
      family_id = my_family_id()
      or not exists (
        select 1 from family_members fm where fm.user_id = auth.uid()
      )
    )
  );
