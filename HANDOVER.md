# おたより帳（ochomen-app）引継ぎ資料

**作成日:** 2026年6月22日  
**対象読者:** 開発・運用を引き継ぐ担当者  
**本番URL:** https://ochomen-app.vercel.app

---

## 1. プロジェクト概要

| 項目 | 内容 |
|---|---|
| 製品名 | おたより帳（アプリ内表記） / お帳面（PWA・メタデータ） |
| 目的 | 保育園・幼稚園のプリントを撮影 → AI がやること・予定・買い物を抽出 → 家族で共有・実行 |
| ターゲット | 乳幼児〜学童の子どもを持つ保護者 |
| リポジトリ | https://github.com/jukuro/ochomen-app.git |
| 作業ディレクトリ | `B:\Alshyl\06_総務\20260514_scanお帳面\ochomen-app` |
| 仕様の正本 | `../deep-research-report (2).md`（方針変更は `PROGRESS.md` / 本資料を優先） |

### コア価値の流れ

```
撮影（OCR） → 構造化（Gemini） → タスク/カレンダー/買い物 → 思い出・成長記録 → 家族共有
```

---

## 2. 本番・外部サービス

| サービス | URL / 名称 | 備考 |
|---|---|---|
| **Vercel 本番** | https://ochomen-app.vercel.app | プロジェクト名 `ochomen-app`（`jukurog31-7573s-projects`） |
| **GitHub** | `jukuro/ochomen-app` | **main とローカルに大きな差分あり**（後述） |
| **Supabase** | ダッシュボードで管理 | `NEXT_PUBLIC_SUPABASE_*` で接続 |
| **Stripe** | ダッシュボード | プレミアム ¥480/月（`STRIPE_PRICE_ID`） |
| **Google Cloud** | OAuth クライアント `ochomen-app-web-v2` | **Web アプリケーション**型。Calendar API 有効化済み |
| **Gemini API** | Google AI Studio | スキャン・日記・キャラ生成に使用 |

### 削除済み・使わないもの

- 旧 Vercel プロジェクト `ochomen-app-bf36` — 2026/6/22 削除済み
- GitHub 連携は本番 Vercel から切断。**デプロイは CLI のみ**

---

## 3. Git 状態（重要）

**2026/6/22 時点、ローカルに大量の未コミット変更があります。**

- ブランチ: `main`（`origin/main` 追従）
- 最新コミット: `b3028ea feat: ochomen timeline, calendar swipe, OCR fixes, and deploy alignment`
- その後の実装（Push 通知、Google カレンダー、PWA、全画面カレンダー、リロード修正など）は **ほぼすべて未コミット**

### 引継ぎ時に推奨する作業

1. ローカル変更の内容確認: `git status` / `git diff`
2. 動作確認後、論理単位でコミット & `git push`
3. （任意）Vercel を GitHub 連携に戻し CI デプロイを再構築

**コミット前に `.env.local` を含めないこと**（`.gitignore` 確認済み想定）。

---

## 4. 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | Next.js **16.2.9**（App Router / Turbopack） |
| UI | React 19, Tailwind CSS v4, lucide-react |
| 言語 | TypeScript |
| AI / OCR | Google Gemini 2.5 Flash（`@google/genai`） |
| DB / 認証 | Supabase（`@supabase/supabase-js`） |
| 決済 | Stripe |
| 永続化（ローカル） | localStorage（オフラインファースト） |
| PWA | `manifest.json` + `public/sw.js`（通知専用） |

### 開発上の注意

- **Next.js 16** は従来版と API が異なる。変更前に `node_modules/next/dist/docs/` を参照（`AGENTS.md` 参照）
- **ローカルビルド**は日本語パス（`06_総務` 等）で失敗することがある → **Vercel 上ビルドは成功**
- PowerShell では `&&` より `Set-Location; コマンド` を使用

---

## 5. ディレクトリ構成（主要）

```
ochomen-app/
├── src/app/
│   ├── page.tsx              # ★ メイン UI（4000行超・全タブ・状態管理）
│   ├── layout.tsx            # フォント・PWA メタ・ReloadRecovery
│   ├── error.tsx             # エラー時の日本語 UI
│   ├── globals.css           # デザイントークン
│   └── api/                  # サーバー API（下表参照）
├── src/components/           # UI コンポーネント（50+）
├── src/lib/                  # ビジネスロジック・永続化・同期
├── public/
│   ├── manifest.json         # PWA
│   └── sw.js                 # Service Worker（通知・v2）
├── supabase/migrations/      # 001〜010 SQL
├── docs/                     # Supabase 手順、UI/UX 提案
├── PROGRESS.md               # 開発進捗表（内部）
├── HANDOVER.md               # 本資料
└── .env.local.example        # 環境変数テンプレート
```

### API ルート一覧

| パス | 用途 |
|---|---|
| `POST /api/scan-image` | 書類 OCR・構造化 |
| `POST /api/structure-ocr` | OCR テキスト再構造化 |
| `POST /api/diary-enrich` | 日記 AI 補完 |
| `POST /api/characterize-child` | 子ども AI キャラ生成 |
| `GET/POST /api/stripe/*` | Checkout / Portal / Verify / Session / Webhook |
| `GET /api/calendar/google/auth` | Google OAuth 開始 |
| `GET /api/calendar/google/callback` | OAuth コールバック |
| `GET /api/calendar/google/claim` | トークン取得（リダイレクト後） |
| `POST /api/calendar/google/sync` | 双方向同期 |
| `DELETE /api/calendar/google/delete` | 連携解除 |
| `GET /api/calendar/feed/[token]` | Apple カレンダー購読用 .ics |

---

## 6. アーキテクチャ

### 6.1 データ永続化

```
[ユーザー操作]
    ↓
localStorage（即時保存・オフライン可）
    ↓（Supabase 設定 & ログイン時）
pushToSupabase / pullFromSupabase（supabaseSync.ts）
    ↓
Supabase（families, entries, todos, diaries, artworks 等）
```

- **正:** 1 Supabase アカウント = 1 家族（複数端末同期）
- **ローカルのみ**でも全機能利用可（クラウド同期・Stripe Webhook 連携除く）

### 6.2 画面構成（5 タブ）

| タブ | ID | 主な内容 |
|---|---|---|
| きょう | `home` | 今日のやること、スキャン、子キャラ |
| 思い出 | `memories` | 書類 / お帳面 / 日記 / お絵描き / 年表 |
| 予定 | `calendar` | **全画面カレンダー**（月/週/日、カレンダー⇔リスト） |
| 買い物 | `shopping` | 買い物リスト |
| わが家 | `family` | 設定入口、ポイント、祖父母共有、デジタルブック |

サブ画面: `grandparents`（じぃじ・ばぁば）、`book_order`（デジタルブック）

### 6.3 プレミアム機能

- Stripe サブスクリプション（`currentPlan: "premium"`）
- **テスト用バイパス:** `NEXT_PUBLIC_PREMIUM_BYPASS=true`（Vercel 本番で有効中）
  - 設定・PremiumModal から「動作確認用（課金なし）」切替可
  - **本番リリース前に `false` に戻すこと**

---

## 7. 環境変数

テンプレート: `.env.local.example`  
**Vercel Production にも同値を設定し、変更後は Redeploy 必須。**

### 必須（コア機能）

| 変数 | 用途 |
|---|---|
| `GEMINI_API_KEY` | OCR・AI 全般 |

### Supabase（クラウド同期）

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | クライアント |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | クライアント |
| `SUPABASE_SERVICE_ROLE_KEY` | Stripe Webhook → `families.plan` 更新 |

### Stripe

| 変数 | 用途 |
|---|---|
| `STRIPE_SECRET_KEY` | 決済 API |
| `STRIPE_WEBHOOK_SECRET` | Webhook 署名 |
| `STRIPE_PRICE_ID` | 月額プラン price ID |

### Google カレンダー

| 変数 | 用途 |
|---|---|
| `GOOGLE_CLIENT_ID` | OAuth |
| `GOOGLE_CLIENT_SECRET` | OAuth |
| `NEXT_PUBLIC_SITE_URL` | `https://ochomen-app.vercel.app` |
| `NEXT_PUBLIC_GOOGLE_CALENDAR_ENABLED` | `true` |
| `GOOGLE_OAUTH_REDIRECT_URI` | （任意）`https://ochomen-app.vercel.app/api/calendar/google/callback` |

**Google Cloud 設定メモ:**

- クライアント種別は **「ウェブアプリケーション」**（Desktop 不可）
- リダイレクト URI は上記と **完全一致**
- OAuth 同意画面は **Testing** モード → 未確認アプリ警告は正常。テストユーザー登録必要
- スコープ: `https://www.googleapis.com/auth/calendar.events`

### その他

| 変数 | 用途 |
|---|---|
| `NEXT_PUBLIC_PREMIUM_BYPASS` | 課金なしプレミアムテスト（本番リリース前は false 推奨） |
| `NEXT_PUBLIC_APPLE_CALENDAR_FEED_ENABLED` | Apple 購読フィード |
| `APP_INTERNAL_KEY` / `NEXT_PUBLIC_APP_KEY` | API 直接呼び出しガード（任意） |

---

## 8. デプロイ手順

### 本番デプロイ（現行運用）

```powershell
Set-Location "B:\Alshyl\06_総務\20260514_scanお帳面\ochomen-app"
npx vercel --prod --yes
```

- エイリアス: https://ochomen-app.vercel.app
- 環境変数変更後も **必ず再デプロイ**

### ローカル開発

```powershell
npm install
cp .env.local.example .env.local   # 値を編集
npm run dev
```

→ http://localhost:3000

---

## 9. Supabase マイグレーション

**SQL Editor で 001 → 010 の順に適用**（詳細: `docs/SUPABASE-SETUP.md`）

| ファイル | 内容 |
|---|---|
| `001_initial.sql` | 基本テーブル・RLS |
| `002_plan_stripe_rls.sql` | プラン・Stripe 連携 |
| `004_text_ids_and_progress.sql` | テキスト ID・XP 同期 |
| `005_entry_sections.sql` | お帳面 sections |
| `006_diaries.sql` | 成長日記 |
| `007_artworks.sql` | お絵描き |
| `008_child_profile.sql` | 子プロフィール |
| `009_grandparents_share.sql` | 祖父母共有フラグ |
| `010_calendar_feeds.sql` | Apple カレンダーフィード |

### Auth URL（必須）

| 項目 | 値 |
|---|---|
| Site URL | `https://ochomen-app.vercel.app` |
| Redirect URLs | `https://ochomen-app.vercel.app/**` |

---

## 10. 機能実装状況サマリー

詳細は `PROGRESS.md` を参照。要点のみ:

| 領域 | 状態 |
|---|---|
| コア（スキャン〜検索） | ✅ 完了 |
| UX（5 タブ・全画面書類・スワイプ等） | ✅ 完了 |
| お帳面タブ・sections | ✅ 完了 |
| 思い出（日記・お絵描き・年表） | ✅ 完了 |
| 子ども AI キャラ・XP・ポイントショップ | ✅ 完了 |
| Stripe プレミアム | ✅ 稼働（バイパス併用中） |
| Supabase クラウド同期 | ✅ 本番稼働 |
| Push 通知（Premium） | ✅ SW + 設定連携 |
| Google / Apple カレンダー | ✅ Google 双方向 + Apple .ics |
| PWA ホーム画面追加 | ✅ 設定に UI |
| デジタルブック外部印刷 API | ❌ 業者待ち |
| 家族招待（複数アカウント） | ⚠️ 準備中 |
| GitHub CI | ⚠️ 未連携（CLI デプロイ） |

---

## 11. 直近の変更（2026/6/22 夕方）

### 11.1 更新（リロード）エラー対策

**症状:** 更新すると「This page couldn't load / Reload to try again」が出ることがある（特に PWA・モバイル）

**対応内容:**

| ファイル | 変更 |
|---|---|
| `public/sw.js` | v2。`skipWaiting` / `clients.claim` 廃止。ページ遷移は network-first |
| `reminderNotifications.ts` | SW 登録は **通知許可済み** のみ。`updateViaCache: "none"` |
| `NotificationBootstrap.tsx` | Premium + 通知 ON のときだけ SW 登録 |
| `ReloadRecovery.tsx` | チャンク不一致時に 1 回自動再読み込み |
| `error.tsx` | 日本語エラー UI |
| `page.tsx` | 初期化 8 秒タイムアウトで hydrated 保証 |

**引継ぎ先への確認手順:**

1. 本番 URL を開き、ブラウザ/PWA で更新を数回試す
2. まだ出る場合 → アプリを完全終了 → 再開、またはキャッシュ無視リロード
3. 端末種別（iOS Safari / Android Chrome / PWA）を記録して追加調査

### 11.2 予定タブ＝全画面カレンダーのみ

**以前:** 小さな月カレンダー → 日付タップで全画面拡大  
**現在:** 「予定」タブ選択で **即全画面**（月/週/日、カレンダー⇔リスト切替）  
**閉じる:** 右上 × → 「きょう」タブへ

実装: `page.tsx` で `currentScreen === "calendar"` 時に全画面 UI を表示。インライン月カレンダーは削除。

### 11.3 その他（同日以前の主要追加）

- Google カレンダー OAuth・双方向同期（`manual` entry の todo 表示バグ修正含む）
- Premium バイパス（テスト用）
- ホーム画面に追加（PWA install）
- 祖父母共有件数表示、BookOrderView コンポーネント化

---

## 12. トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| スキャン失敗「APIキー未設定」 | `GEMINI_API_KEY` 未設定 | Vercel env + Redeploy |
| スキャン失敗「無料枠上限」 | Gemini 月次クォータ枯渇 | 別 API キー or 有料化。6/25 頃リセット（時期は要確認） |
| スキャン 429 | レート制限 | アプリが 5 秒後リトライ（クォータ枯渇時は即停止） |
| Google 連携 `redirect_uri_mismatch` | OAuth URI 不一致 | Web クライアント + 本番 URL 完全一致 |
| Google 連携後イベントが出ない | `manual` entry 除外バグ | **修正済**（要最新デプロイ） |
| Google「未確認アプリ」警告 | OAuth Testing モード | テストユーザー追加 or 本番公開申請 |
| 更新でページ読み込み失敗 | SW / チャンク不一致 | 11.1 参照。完全再起動 |
| Supabase 確認メールが localhost | Site URL 誤設定 | `docs/SUPABASE-SETUP.md` 参照 |
| ローカル `npm run build` 失敗 | 日本語パス | Vercel でビルド |
| プレミアムが課金なしで使える | `PREMIUM_BYPASS=true` | リリース前に false |

---

## 13. 未着手・次の優先候補

| 優先 | 項目 | 状態 |
|---|---|---|
| 1 | 未コミット変更の Git 整理 & push | ⚠️ **最優先（引継ぎ）** |
| 2 | `PREMIUM_BYPASS` 本番 OFF | リリース前 |
| 3 | Google OAuth 本番公開（Verification） | Testing 解除 |
| 4 | Gemini API 有料化 | ユーザー増加前 |
| 5 | 外部印刷 API（デジタルブック） | 業者待ち |
| 6 | 行事 → 思い出提案 AI | 部分（月次サマリーのみ） |
| 7 | 家族招待（複数 Supabase アカウント） | 準備中 |
| 8 | GitHub ↔ Vercel CI 再連携 | 未 |

---

## 14. 主要ファイル早見表

| 用途 | ファイル |
|---|---|
| メイン UI・全状態 | `src/app/page.tsx` |
| ローカル永続化 | `src/lib/appState.ts` |
| Supabase 同期 | `src/lib/supabaseSync.ts` |
| OCR クライアント | `src/lib/ocrAnalysis.ts` |
| Gemini サーバー | `src/app/api/scan-image/route.ts` |
| 設定 UI | `src/components/SettingsModal.tsx` |
| カレンダー外部同期 UI | `src/components/CalendarSyncSection.tsx` |
| 通知 | `src/lib/reminderNotifications.ts`, `NotificationBootstrap.tsx` |
| プレミアム | `src/components/PremiumModal.tsx`, `src/lib/premiumBypass.ts` |
| 進捗管理 | `PROGRESS.md` |

---

## 15. 引継ぎチェックリスト

- [ ] 本番 URL にアクセスし、5 タブが動作する
- [ ] スキャン 1 枚が成功する（Gemini キー有効）
- [ ] 設定 → Supabase ログイン → クラウド送受信
- [ ] 予定タブ → 全画面カレンダー表示、× で きょう に戻る
- [ ] 更新（リロード）でエラーが出ないか確認
- [ ] Vercel 環境変数一覧をダッシュボードで確認
- [ ] Supabase マイグレーション 001〜010 適用済みか確認
- [ ] Google Cloud OAuth クライアント・テストユーザー確認
- [ ] Stripe Webhook エンドポイント生存確認
- [ ] `git status` で未コミット量を把握し、バックアップ / コミット計画
- [ ] `PREMIUM_BYPASS` の本番方針を決定

---

## 16. 関連ドキュメント

| ファイル | 内容 |
|---|---|
| `README.md` | クイックスタート・環境変数概要 |
| `PROGRESS.md` | 機能別進捗表（6/18 ロードマップ照合） |
| `docs/SUPABASE-SETUP.md` | Supabase 本番セットアップ |
| `docs/UI-UX-IMPROVEMENT-PROPOSAL.md` | UI/UX フェーズ計画 |
| `../deep-research-report (2).md` | 製品仕様書・収益化計画 |
| `.env.local.example` | 環境変数テンプレート |

---

## 17. 連絡・判断が必要な事項

1. **Git:** 大量の未コミット変更をどう main に反映するか（一括 / 分割 PR）
2. **プレミアムバイパス:** ベータ終了タイミング
3. **Gemini:** 無料枠 vs 有料 API の運用方針
4. **Google OAuth:** Verification 申請の要否
5. **デジタルブック:** 外部印刷 API ベンダー選定
6. **リロードエラー:** 修正後も再発する場合の端末情報収集

---

*本資料は 2026年6月22日時点の開発セッション内容に基づく。デプロイ後の URL・env・Git 状態は引継ぎ時に再確認すること。*
