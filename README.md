# おたより帳 (ochomen-app)

幼稚園・保育園のお便りをスキャン → AI が自動でやること・予定を抽出してくれる家族向け管理アプリです。

---

## 機能概要

- 書類を撮影するだけで AI (Gemini 2.5 Flash) がタイトル・カテゴリー・やること・期日を自動抽出
- 複数書類を一括スキャン、失敗時の自動リトライ対応
- オフラインファースト（ローカル保存）+ Supabase でクラウド同期・家族共有
- ホーム / タイムライン / 買い物 / カレンダー の 4 タブ UI
- 日記・音声入力・マイルストーン管理

---

## クイックスタート

### 1. 依存パッケージのインストール

```bash
npm install
```

### 2. 環境変数を設定

```bash
cp .env.local.example .env.local
```

`.env.local` を開いて以下の値を設定します（詳細は次のセクション参照）。

### 3. 開発サーバー起動

```bash
npm run dev
```

[http://localhost:3000](http://localhost:3000) をブラウザで開く。

---

## 環境変数の設定

### Gemini API Key（OCR・AI 機能）

1. [Google AI Studio](https://aistudio.google.com/app/apikey) にアクセス
2. 「API キーを作成」→ キーをコピー
3. `.env.local` に記載：

```
GEMINI_API_KEY=AIzaSy...
```

> キーを設定しない場合、スキャン時に「APIキーが設定されていません」エラーになります。

### Supabase（クラウド同期・家族共有） ※任意

Supabase を設定しない場合も、ローカルストレージだけで動作します。

#### セットアップ手順

**① Supabase プロジェクトを作成**

1. [https://app.supabase.com](https://app.supabase.com) でサインイン
2. 「New project」→ プロジェクト名・パスワード・リージョン（`ap-northeast-1` 推奨）を設定

**② API キーを取得**

プロジェクト → `Settings` → `API` から：

| 項目 | 変数名 |
|---|---|
| Project URL | `NEXT_PUBLIC_SUPABASE_URL` |
| `anon` `public` キー | `NEXT_PUBLIC_SUPABASE_ANON_KEY` |

`.env.local` に記載：

```
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIs...
```

**③ データベーステーブルを作成**

`supabase/migrations/001_initial.sql` の内容を Supabase の **SQL Editor** に貼り付けて実行します。

> `Table Editor` > `SQL Editor` > 新規クエリを開いて貼り付け → `Run`

作成されるテーブル：
- `families` / `family_members` — 家族グループ管理
- `children` — 子どもプロフィール
- `entries` — スキャン書類
- `todos` — やること・予定
- `kindergartens` / `categories` — 幼稚園・カテゴリーマスター

**④ アプリからログイン**

アプリ右上の設定（⚙️）→「アカウント設定」→ メールアドレスとパスワードでサインアップ。

---

## ディレクトリ構成

```
src/
├── app/
│   ├── page.tsx            # メインUIコンポーネント（全タブ・状態管理）
│   ├── globals.css         # Tailwind + カラーパレット + アニメーション
│   ├── layout.tsx          # フォント・メタデータ設定
│   ├── ocrStructurizer.ts  # Gemini Vision API 呼び出しロジック
│   └── api/
│       ├── scan-image/     # 書類スキャン・OCR エンドポイント
│       ├── diary-enrich/   # 日記 AI 補完エンドポイント
│       ├── milestone-parse/ # マイルストーン解析
│       └── structure-ocr/  # OCR テキスト構造化（Gemini + 正規表現フォールバック）
├── components/
│   ├── BatchScanModal.tsx  # まとめスキャンモーダル
│   ├── EntryCard.tsx       # 書類カード（一覧・全画面詳細）
│   ├── TodoRow.tsx         # タスク行コンポーネント
│   ├── SettingsModal.tsx   # 設定・Supabase 認証 UI
│   ├── Toast.tsx           # 非侵襲的トースト通知
│   ├── ConfirmModal.tsx    # 削除確認カスタムモーダル
│   └── Onboarding.tsx      # 初回セットアップウィザード
├── lib/
│   ├── types.ts            # 共通型定義
│   ├── appState.ts         # ローカルストレージ永続化
│   ├── supabaseSync.ts     # オフラインファースト Supabase 同期
│   ├── ocrAnalysis.ts      # OCR 解析クライアント関数
│   ├── ocrTodoExtractor.ts # 正規表現フォールバック抽出
│   ├── imageCompress.ts    # 画像圧縮・回転ユーティリティ
│   ├── ids.ts              # ローカル ID 生成
│   └── dates.ts            # 日付フォーマット・比較
└── supabase/
    └── migrations/
        └── 001_initial.sql # DB スキーマ・RLS ポリシー定義
```

---

## 開発コマンド

```bash
npm run dev      # 開発サーバー起動（Turbopack）
npm run build    # 本番ビルド
npm run lint     # ESLint チェック
```

---

## 技術スタック

| カテゴリ | 使用技術 |
|---|---|
| フレームワーク | Next.js 16 (App Router) + React 19 |
| 言語 | TypeScript |
| スタイリング | Tailwind CSS v4 |
| AI / OCR | Google Gemini 2.5 Flash (`@google/genai`) |
| DB / 認証 | Supabase (`@supabase/supabase-js`) |
| アイコン | lucide-react |

---

## トラブルシューティング

| 症状 | 原因 | 対処 |
|---|---|---|
| スキャンが「APIキー未設定」エラー | `GEMINI_API_KEY` が未設定 | `.env.local` に設定して再起動 |
| 2件目のスキャンが失敗する | Gemini レート制限 | アプリが自動リトライ（5秒待機）します |
| 同期ボタンが出ない | Supabase 未設定 | ローカルのみで動作します（同期不要なら設定不要） |
| ログイン後にデータが表示されない | DB テーブル未作成 | `001_initial.sql` を SQL Editor で実行してください |
