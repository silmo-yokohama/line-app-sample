# 環境構成・ステージング構築手順・開発フロー

## 使用する管理コンソール

本ドキュメントの手順では以下の管理コンソールを使用する。役割が異なるため混同しないこと。

| コンソール | URL | 主な操作 |
|---|---|---|
| **LINE Developers** | https://developers.line.biz/console/ | チャネル作成、LIFF 登録、Webhook URL 設定、トークン取得 |
| **LINE Official Account Manager** | https://manager.line.biz/ | 応答メッセージ OFF、リッチメニュー作成、アカウント設定 |
| **AWS マネジメントコンソール** | https://console.aws.amazon.com/ | S3、CloudFront、Lambda、API Gateway、IAM 等 |

---

## 1. 環境一覧

| 環境 | 用途 | フロントエンド | バックエンド API | LINE Messaging API チャネル |
|---|---|---|---|---|
| **dev** | ローカル開発 | `https://localhost:5173` | ローカル（直接実行 or ngrok） | 開発用チャネル |
| **staging** | 結合テスト・レビュー | AWS S3 + CloudFront | AWS Lambda + API Gateway | 開発用チャネル（dev と共用） |
| **production** | 本番公開 | AWS S3 + CloudFront | AWS Lambda + API Gateway | 本番用チャネル |

---

## 2. LINE チャネル構成

```
プロバイダー（My Provider）
│
├── LINE ログインチャネル（LIFF Sample）    ※ 1つで全環境共用
│   ├── LIFF: Chat Form (production) → https://{prod-cloudfront-domain}
│   ├── LIFF: Chat Form (staging)    → https://{stg-cloudfront-domain}
│   └── LIFF: Chat Form (dev)        → https://localhost:5173
│
├── Messaging API チャネル（本番用）       ※ production 専用
│   ├── Bot 名: Chat Form Bot
│   ├── Webhook URL: https://{prod-api-gateway}/webhook
│   └── 月 200 通（無料プラン）
│
└── Messaging API チャネル（開発用）       ※ dev + staging 共用
    ├── Bot 名: Chat Form Bot (Dev)
    ├── Webhook URL: https://{stg-api-gateway}/webhook
    └── 月 200 通（無料プラン）
```

**なぜこの構成か:**
- LIFF は 1 チャネルに複数登録でき、環境変数で LIFF ID を切り替えられるため 1 チャネルで十分
- Messaging API は Webhook URL を 1 つしか設定できないため、本番と開発系で 2 チャネル必要
- 開発用チャネルの Webhook URL はステージングを向ける（ローカルでは Webhook 受信不要なケースが大半）

---

## 3. 環境変数の管理

### 3.1 環境変数一覧

| 変数名 | dev | staging | production |
|---|---|---|---|
| `VITE_LIFF_ID` | dev 用 LIFF ID | staging 用 LIFF ID | production 用 LIFF ID |
| `LINE_CHANNEL_SECRET` | 開発用チャネルの値 | 開発用チャネルの値 | 本番用チャネルの値 |
| `LINE_CHANNEL_ACCESS_TOKEN` | 開発用チャネルの値 | 開発用チャネルの値 | 本番用チャネルの値 |

### 3.2 設定場所

| 環境 | フロントエンド（VITE_LIFF_ID） | バックエンド（SECRET / TOKEN） |
|---|---|---|
| dev | `src/.env.local`（Git 管理外） | `src/.env.local` |
| staging | GitHub Actions で `vite build` 時に注入 | AWS Systems Manager Parameter Store |
| production | GitHub Actions で `vite build` 時に注入 | AWS Systems Manager Parameter Store |

---

## 4. AWS 構成の詳細

### 4.1 アーキテクチャ（staging / production 共通）

```
Route 53（任意: カスタムドメイン）
  │
  ▼
CloudFront (CDN)
  ├── デフォルト: S3 (SPA 配信)
  └── /api/*: API Gateway へのオリジン
        ├── POST /api/webhook  → Lambda (webhook handler)
        └── POST /api/complete → Lambda (push message handler)

S3 Bucket
  └── dist/ の中身（index.html, assets/）

Lambda
  ├── webhook 関数
  └── complete 関数

Systems Manager Parameter Store
  ├── /{env}/line-channel-secret
  └── /{env}/line-channel-access-token
```

### 4.2 命名規則

staging と production で同じ構成を作るため、リソース名にプレフィックスをつける。

| リソース | staging | production |
|---|---|---|
| S3 バケット | `line-app-sample-stg` | `line-app-sample-prod` |
| CloudFront ディストリビューション | stg 用 | prod 用 |
| API Gateway | `line-app-sample-stg-api` | `line-app-sample-prod-api` |
| Lambda（webhook） | `line-app-sample-stg-webhook` | `line-app-sample-prod-webhook` |
| Lambda（complete） | `line-app-sample-stg-complete` | `line-app-sample-prod-complete` |
| SSM パラメータ | `/stg/line-channel-secret` | `/prod/line-channel-secret` |

---

## 5. ステージング環境の構築手順

### 5.1 LINE の準備

#### 5.1.1 開発用 Messaging API チャネルの作成

現在の「Sample ChatBot」チャネルを開発用として使うか、新規に作成する。
ここでは新規作成する手順を記載する。

**LINE Developers コンソール**（https://developers.line.biz/console/）:

1. 同じプロバイダーで **「新規チャネル作成」→「Messaging API」**
2. チャネル名: `Chat Form Bot (Dev)`
3. 作成後、**「チャネル基本設定」** タブで Channel Secret を取得
4. **「Messaging API設定」** タブで Channel Access Token（長期）を発行・取得

**LINE Official Account Manager**（https://manager.line.biz/）:

5. 作成した `Chat Form Bot (Dev)` のアカウントを選択
6. 左メニュー **「応答設定」** → **「応答メッセージ」を OFF**
7. （任意）リッチメニューを作成する場合は左メニュー **「リッチメニュー」** から設定

#### 5.1.2 ステージング用 LIFF アプリの追加

**LINE Developers コンソール**:

1. LINE ログインチャネル（LIFF Sample）→ **「LIFF」タブ**
2. **「追加」** をクリック
3. 以下を設定:

| 項目 | 値 |
|---|---|
| LIFF アプリ名 | `Chat Form (staging)` |
| サイズ | Full |
| エンドポイント URL | `https://example.com`（CloudFront デプロイ後に変更） |
| Scope | `profile` にチェック |

4. LIFF ID をメモ

### 5.2 AWS の構築

#### 5.2.1 S3 バケットの作成

1. AWS コンソール → S3 → **「バケットを作成」**
2. バケット名: `line-app-sample-stg`
3. リージョン: `ap-northeast-1`（東京）
4. 「パブリックアクセスをすべてブロック」: **ON のまま**（CloudFront 経由でアクセスするため）
5. **「バケットを作成」**

#### 5.2.2 SPA のビルドとアップロード

```bash
cd src

# staging 用の LIFF ID でビルド
VITE_LIFF_ID={staging用LIFF ID} npm run build

# S3 にアップロード
aws s3 sync dist/ s3://line-app-sample-stg --delete
```

#### 5.2.3 CloudFront ディストリビューションの作成

1. AWS コンソール → CloudFront → **「ディストリビューションを作成」**
2. オリジンドメイン: `line-app-sample-stg.s3.ap-northeast-1.amazonaws.com`
3. S3 バケットアクセス: **「Origin access control settings (recommended)」** を選択
   - OAC を新規作成
4. デフォルトルートオブジェクト: `index.html`
5. **「ディストリビューションを作成」**
6. 作成後、表示される **S3 バケットポリシーをコピーして S3 に適用**

#### 5.2.4 SPA 用のエラーページ設定

SPA はすべてのパスを `index.html` で処理する必要がある。

1. CloudFront → 作成したディストリビューション → **「エラーページ」タブ**
2. **「カスタムエラーレスポンスを作成」**:
   - HTTP エラーコード: `403`
   - エラーレスポンスをカスタマイズ: はい
   - レスポンスページのパス: `/index.html`
   - HTTP レスポンスコード: `200`
3. 同様に HTTP エラーコード `404` でも作成

#### 5.2.5 Lambda 関数の作成

現在の API（`src/api/webhook.ts`, `src/api/complete.ts`）は Vercel 用のハンドラー形式になっている。Lambda 用に書き換えが必要。

**webhook 関数:**

1. AWS コンソール → Lambda → **「関数の作成」**
2. 関数名: `line-app-sample-stg-webhook`
3. ランタイム: Node.js 20.x
4. **「関数の作成」**

**complete 関数:**

1. 同様に `line-app-sample-stg-complete` を作成

**環境変数の設定（両関数共通）:**

Lambda 関数の設定 → 環境変数 で以下を設定:

| Key | Value |
|---|---|
| `LINE_CHANNEL_SECRET` | 開発用チャネルの Channel Secret |
| `LINE_CHANNEL_ACCESS_TOKEN` | 開発用チャネルの Channel Access Token |

> より安全にするには、Systems Manager Parameter Store に格納し Lambda 内で取得する方式を推奨。

**デプロイパッケージの作成:**

```bash
# プロジェクトルートで
mkdir -p lambda/webhook lambda/complete

# 依存パッケージのインストール（Lambda 用）
cd lambda/webhook
npm init -y
npm install @line/bot-sdk

# webhook.ts を Lambda 形式に書き換えて配置（後述 5.3）
# zip にパッケージング
zip -r function.zip .

# AWS CLI でアップロード
aws lambda update-function-code \
  --function-name line-app-sample-stg-webhook \
  --zip-file fileb://function.zip
```

complete 関数も同様に作成・デプロイする。

#### 5.2.6 API Gateway の作成

1. AWS コンソール → API Gateway → **「REST API」→「構築」**
2. API 名: `line-app-sample-stg-api`
3. リソースを作成:
   - `/webhook` → POST メソッド → Lambda `line-app-sample-stg-webhook` を統合
   - `/complete` → POST メソッド → Lambda `line-app-sample-stg-complete` を統合
4. **「API をデプロイ」** → ステージ名: `v1`
5. 呼び出し URL をメモ（例: `https://xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com/v1`）

#### 5.2.7 CloudFront に API Gateway オリジンを追加

1. CloudFront → ディストリビューション → **「オリジン」タブ → 「オリジンを作成」**
2. オリジンドメイン: `xxxxxxxxxx.execute-api.ap-northeast-1.amazonaws.com`
3. オリジンパス: `/v1`
4. プロトコル: HTTPS のみ
5. **「オリジンを作成」**

**ビヘイビアの追加:**

1. **「ビヘイビア」タブ → 「ビヘイビアを作成」**
2. パスパターン: `/api/*`
3. オリジン: 上で作成した API Gateway オリジン
4. ビューワープロトコルポリシー: HTTPS only
5. 許可された HTTP メソッド: GET, HEAD, OPTIONS, PUT, POST, PATCH, DELETE
6. キャッシュポリシー: CachingDisabled
7. オリジンリクエストポリシー: AllViewerExceptHostHeader
8. **「ビヘイビアを作成」**

> **注意**: API Gateway のパスは `/webhook` と `/complete` だが、CloudFront のビヘイビアでは `/api/*` でマッチさせる。フロントエンドのリクエスト（`/api/complete`）が API Gateway の `/complete` に対応するように、CloudFront のオリジンパスまたは API Gateway のリソースパスで調整すること。

### 5.3 Lambda ハンドラーのコード変更

現在の Vercel 形式を Lambda 形式に書き換える。

**変更前（Vercel）:**
```typescript
import type { VercelRequest, VercelResponse } from "@vercel/node";

export default async function handler(req: VercelRequest, res: VercelResponse) {
  // ...
  return res.status(200).json({ status: "ok" });
}
```

**変更後（Lambda）:**
```typescript
import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";

export async function handler(event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> {
  const body = JSON.parse(event.body || "{}");
  const signature = event.headers["x-line-signature"] || "";
  // ...
  return {
    statusCode: 200,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ status: "ok" }),
  };
}
```

ロジック本体（署名検証、メッセージ送信）はそのまま使える。リクエスト/レスポンスのインターフェースのみ変更。

### 5.4 LINE 設定の更新

**LINE Developers コンソール**:

1. **LIFF（staging）のエンドポイント URL** を CloudFront のドメインに変更
   - 例: `https://d1234567890.cloudfront.net`
2. **開発用 Messaging API チャネルの Webhook URL** を設定
   - 例: `https://d1234567890.cloudfront.net/api/webhook`
3. **「検証」** ボタンで成功を確認

### 5.5 動作確認

1. LINE アプリで開発用 Bot（Chat Form Bot (Dev)）を友だち追加
2. `https://liff.line.me/{staging用LIFF ID}` をトークで送信してタップ
3. チャットフォームが表示され、回答できることを確認
4. 完了時に Bot からお礼メッセージが届くことを確認

---

## 6. Git ブランチ戦略

```
main (= production デプロイ対象)
  └── staging (= staging デプロイ対象)
        └── feature/xxx（作業ブランチ）
```

```bash
# staging ブランチの作成（初回のみ）
git checkout -b staging
git push origin staging
```

---

## 7. CI/CD（GitHub Actions）

### 7.1 概要

| トリガー | 対象ブランチ | デプロイ先 |
|---|---|---|
| Push / Merge | `staging` | AWS staging 環境 |
| Push / Merge | `main` | AWS production 環境 |

### 7.2 ワークフローで行うこと

```
1. npm install
2. VITE_LIFF_ID を環境に応じて設定し npm run build
3. dist/ を S3 にアップロード（aws s3 sync）
4. CloudFront のキャッシュ無効化（aws cloudfront create-invalidation）
5. Lambda 関数のコードを更新（aws lambda update-function-code）
```

### 7.3 GitHub Secrets に登録する値

| Secret 名 | 内容 |
|---|---|
| `AWS_ACCESS_KEY_ID` | デプロイ用 IAM ユーザーのアクセスキー |
| `AWS_SECRET_ACCESS_KEY` | デプロイ用 IAM ユーザーのシークレットキー |
| `STG_VITE_LIFF_ID` | staging 用 LIFF ID |
| `PROD_VITE_LIFF_ID` | production 用 LIFF ID |
| `STG_CLOUDFRONT_DISTRIBUTION_ID` | staging CloudFront のディストリビューション ID |
| `PROD_CLOUDFRONT_DISTRIBUTION_ID` | production CloudFront のディストリビューション ID |

---

## 8. 普段の開発フロー

### 8.1 新機能の開発

```
1. staging ブランチから feature ブランチを切る
   $ git checkout staging
   $ git checkout -b feature/add-text-input

2. ローカルで開発・動作確認
   $ cd src && npm run dev
   - https://localhost:5173 で UI 確認
   - LIFF (dev) でスマホ確認が必要な場合は LINE アプリから開く

3. コミット・Push
   $ git add .
   $ git commit -m "feat: add text input question type"
   $ git push origin feature/add-text-input

4. Pull Request を staging ブランチに作成
   - コードレビュー

5. レビュー通過後、staging にマージ
   - GitHub Actions が staging AWS にデプロイ
   - staging 用 LIFF + 開発用 Bot で結合テスト

6. staging で問題なければ main にマージ（本番リリース）
   - GitHub Actions が production AWS にデプロイ
   - 本番用 LIFF + 本番用 Bot で最終確認
```

### 8.2 ブランチとデプロイの対応

| ブランチ | デプロイ先 | LINE 環境 | 確認方法 |
|---|---|---|---|
| `feature/*` | なし（ローカルのみ） | dev 用 LIFF | `https://localhost:5173` |
| `staging` | AWS staging | staging 用 LIFF + 開発用 Bot | LINE アプリから staging 用 LIFF を開く |
| `main` | AWS production | production 用 LIFF + 本番用 Bot | LINE アプリから本番 LIFF を開く |

### 8.3 Webhook のデバッグ

ローカル環境では LINE Platform から直接 Webhook を受信できない。以下の方法で対応する。

**方法 1: staging 環境を使う（推奨）**

staging にデプロイした Lambda で動作確認する。

**方法 2: ngrok を使う（即時確認が必要な場合）**

```bash
# ターミナル 1: ローカルで API サーバーを起動（要別途実装 or express 等で簡易サーバー）
node api-server.js

# ターミナル 2: ngrok でトンネル
ngrok http 3000
```

ngrok の URL を開発用 Messaging API チャネルの Webhook URL に一時的に設定する。

### 8.4 環境切替の早見表

| やりたいこと | コマンド・操作 |
|---|---|
| ローカルで UI 開発 | `cd src && npm run dev` |
| staging にデプロイ | `staging` ブランチに Push（GitHub Actions） |
| 本番にリリース | `main` ブランチにマージ（GitHub Actions） |
| LINE 設定変更 | LINE Developers コンソール or LINE Official Account Manager |
| 環境変数変更（dev） | `src/.env.local` を編集 |
| 環境変数変更（staging） | AWS Parameter Store or Lambda 環境変数 |
| 環境変数変更（production） | AWS Parameter Store or Lambda 環境変数 |
| S3 に手動デプロイ | `aws s3 sync dist/ s3://{bucket} --delete` |
| CloudFront キャッシュクリア | `aws cloudfront create-invalidation --distribution-id {id} --paths "/*"` |

---

## 9. 料金に関する注意

### LINE プラットフォーム

| サービス | 料金 |
|---|---|
| LINE Developers コンソール / LIFF | 無料 |
| Messaging API（Webhook 受信 / Reply API） | 無料・通数制限なし |
| Messaging API（Push API） | **無料プランで月 200 通/チャネル** |

Push API の通数はチャネル単位でカウントされるため、本番用・開発用それぞれ月 200 通まで無料。

**出典:**
- [LINE 公式アカウント料金プラン](https://www.lycbiz.com/jp/service/line-official-account/plan/)
- [Messaging API 概要](https://developers.line.biz/ja/docs/messaging-api/overview/)

### AWS

本番・ステージング 2 環境の規模が小さい場合、無料枠内で収まる可能性がある。

| サービス | 無料枠 | 備考 |
|---|---|---|
| S3 | 5 GB ストレージ / 月 | SPA の成果物は数 MB |
| CloudFront | 1 TB 転送 / 月 | 12ヶ月間。サンプル利用なら十分 |
| Lambda | 100 万リクエスト / 月 | 永久無料枠 |
| API Gateway | 100 万リクエスト / 月 | 12ヶ月間 |
| Systems Manager Parameter Store | 標準パラメータ無料 | |
