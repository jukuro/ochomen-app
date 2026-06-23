# Supabase 本番セットアップ手順

家族共有・クラウドバックアップを有効にするための手順です。

## 1. Supabase プロジェクト作成

1. [Supabase Dashboard](https://supabase.com/dashboard) で新規プロジェクトを作成
2. **Settings → API** から以下を控える:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`（サーバーのみ・公開禁止）

## 2. スキーマ適用

**SQL Editor** で次の順に実行:

1. `supabase/migrations/001_initial.sql`
2. `supabase/migrations/002_plan_stripe_rls.sql`
3. `supabase/migrations/004_text_ids_and_progress.sql`（**書類・XP同期に必須**）
4. `supabase/migrations/005_entry_sections.sql`（**お帳面 sections 同期**）
5. `supabase/migrations/006_diaries.sql`（**成長日記同期**）
6. `supabase/migrations/007_artworks.sql`（**お絵描きアルバム同期**）
7. `supabase/migrations/008_child_profile.sql`（**お子さまプロフィール**）
8. `supabase/migrations/009_grandparents_share.sql`（**祖父母共有フラグ**）

または CLI:

```bash
cd ochomen-app
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 3. 認証 URL の設定（重要）

Supabase Dashboard → **Authentication → URL Configuration**

| 項目 | 設定値 |
|---|---|
| **Site URL** | `https://ochomen-app.vercel.app` |
| **Redirect URLs** | `https://ochomen-app.vercel.app/**` |

`localhost:3000` のままだと、確認メールのリンクが **別アプリ（Terrace J 等）** に飛びます。  
ローカル開発用に使う場合のみ `http://localhost:3000/**` を追加してください。

## 4. Vercel 環境変数

Production に追加:

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | クライアント同期 |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント同期 |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe Webhook → plan 更新 |

追加後 **Redeploy** が必要です。

## 5. 動作確認

1. 本番アプリ → 設定 → クラウド同期
2. 新規登録（メール + パスワード）
3. 「今すぐクラウドへ送る」でデータが Supabase に反映されるか確認
4. 別端末で同じアカウントにログイン → 「クラウドから取り込む」

## 6. Stripe 連携（任意）

Premium 購入時に Supabase の `families.plan` を更新するには:

- Vercel に `SUPABASE_SERVICE_ROLE_KEY` を設定
- Stripe Dashboard → Webhooks で以下イベントを登録:
  - `checkout.session.completed`
  - `customer.subscription.updated`
  - `customer.subscription.deleted`
- エンドポイント: `https://ochomen-app.vercel.app/api/stripe/webhook`
- 設定画面で一度「今すぐクラウドへ送る」を実行すると `stripe_customer_id` が families に保存され、Webhook と紐付く

## トラブルシュート

| 症状 | 対処 |
|---|---|
| ログイン後も同期されない | 002 マイグレーション未適用（RLS）の可能性 |
| 設定に「未設定」と出る | Vercel env 未設定 or 再デプロイ前 |
| 確認メールが localhost / 別アプリに飛ぶ | Site URL を `https://ochomen-app.vercel.app` に変更 |
