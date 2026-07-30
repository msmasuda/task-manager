# Reservation Manager

企業・店舗向けの予約、担当者アサイン、対応状況管理を行うWebアプリです。

美容室、クリニック、自動車整備、法律・会計相談など、時間枠を使ってサービスを提供する複数業種に対応します。顧客自身によるWeb予約と、スタッフによる電話・店頭予約の登録に対応し、予約状況をカレンダーとカンバンで管理します。

Phase 1のアプリケーション基盤を実装済みです。確定した仕様と詳細設計は [docs/design.md](docs/design.md) を参照してください。

## MVP

- 1企業による複数店舗の管理
- 店舗スタッフの招待、所属、権限管理
- 公開予約ページとスタッフによる代理登録
- サービスメニュー、所要時間、料金目安の管理
- 店舗営業時間、休業日、スタッフ勤務時間の管理
- スタッフが対応可能なサービスの設定
- 設備・部屋・作業ベイなどの共有リソース管理
- 空き枠検索と二重予約防止
- 担当者指名、手動アサイン、自動アサイン
- 未アサイン予約の管理
- 日・週カレンダーと対応状況カンバン
- 顧客台帳と予約履歴
- 予約確認・変更・キャンセルメール
- 操作履歴

決済、SMS、Googleカレンダー連携、回数券、電子カルテ・診療記録などの業種固有機能はMVPの対象外です。

## 技術構成

- Next.js（App Router、TypeScript）
- React
- Prisma ORM
- PostgreSQL（Vercel Marketplace経由のPrisma Postgres）
- Auth.js（スタッフ認証・セッション管理）
- Argon2id（パスワードハッシュ）
- Resend（認証・招待・予約メール）
- Tailwind CSS
- dnd-kit（カンバンのドラッグ＆ドロップ）
- Zod（入力検証）
- Vitest / React Testing Library / Playwright
- Vercel（ホスティング、Preview、Production）

依存パッケージのバージョンは、実装開始時の安定版を固定して使用します。

## 開発ステータス

1. [x] 要件・基本設計
2. [x] Next.jsプロジェクト初期化
3. [ ] DB・スタッフ認証基盤（一部実装済み）
4. [ ] 企業・店舗・スタッフ・サービス設定
5. [ ] 予約枠計算・予約管理
6. [ ] 公開予約ページ・メール
7. [ ] カレンダー・カンバン・自動アサイン
8. [ ] テスト・Vercelデプロイ

## ローカル開発

### 必要な環境

- Node.js 22.12以上
- npm 11以上
- Docker（ローカルPostgreSQLを利用する場合）

### セットアップ

```bash
npm install
cp .env.example .env
docker compose up -d
npm run db:migrate
npm run dev
```

`http://localhost:3000` でランディングページ、`http://localhost:3000/app` で管理画面の現在の実装を確認できます。

### 品質チェック

```bash
npm run lint
npm run typecheck
npm test
npm run build
```

### Prisma

```bash
npm run db:generate
npm run db:migrate
npm run db:studio
```

Prisma 7の接続設定は `prisma.config.ts`、データモデルは `prisma/schema.prisma` にあります。アプリ実行時は `DATABASE_URL`、migration実行時は `DIRECT_URL` を使用します。

## 現在の実装

- Next.js 16 App Router / React 19 / TypeScript
- Tailwind CSS 4
- Prisma 7による予約・店舗・顧客・スタッフ・設備のデータモデル
- Prisma Postgres向けの接続基盤
- レスポンシブなランディングページと管理ダッシュボード
- テナント・店舗アクセスの認可ロジック
- 予約ステータス遷移
- 予約入力のサーバー向けバリデーション
- Vitestによる単体テスト

認証、DBマイグレーション、実データによる予約画面は次の実装フェーズです。

## 環境変数

`.env.example` を参照してください。本番の秘密値をGitへコミットしないでください。
