# LINE チャット風ステップフォーム（LIFF アプリ）

LINE 公式アカウントのリッチメニューから起動する、チャット風 UI のステップフォームアプリです。
Bot との対話形式で質問に回答し、完了時に LINE トークへお礼メッセージが送信されます。

## 特徴

- チャット風 UI でユーザーフレンドリーなフォーム体験
- 条件分岐付きの質問フロー（JSON で定義）
- 回答の途中保存・復元（localStorage）
- LIFF ログインによるユーザー認証
- パステルピンクのポップなデザイン
- モバイルファースト・高品質 UX

## 技術スタック

| カテゴリ | 技術 |
|---|---|
| フレームワーク | React + Vite |
| 言語 | TypeScript |
| LINE SDK | @line/liff, @line/bot-sdk |
| スタイリング | Tailwind CSS |
| UI 実装 | Claude Code Frontend-Design スキル |
| デプロイ | Vercel（SPA + Serverless Functions） |

## 前提条件

- Node.js 18 以上
- LINE Developers アカウント
- LINE 公式アカウント（Messaging API チャネル）

## セットアップ

### 1. リポジトリのクローン

```bash
git clone <repository-url>
cd line-app-sample
```

### 2. 依存パッケージのインストール

```bash
npm install
```

### 3. LINE Developers コンソールの設定

1. [LINE Developers](https://developers.line.biz/) にログイン
2. プロバイダーを作成（または既存のものを選択）
3. **Messaging API チャネル** を作成
4. チャネル設定から以下を取得:
   - チャネルシークレット
   - チャネルアクセストークン（長期）を発行
5. **LIFF アプリ** を追加:
   - サイズ: `Full`
   - エンドポイント URL: `https://{your-vercel-domain}`（デプロイ後に設定）
   - Scope: `profile` にチェック
6. LIFF ID をメモ

### 4. 環境変数の設定

`.env.local` を作成:

```env
VITE_LIFF_ID=your-liff-id
LINE_CHANNEL_SECRET=your-channel-secret
LINE_CHANNEL_ACCESS_TOKEN=your-channel-access-token
```

### 5. 開発サーバーの起動

```bash
npm run dev
```

http://localhost:5173 でアプリが起動します。

> **Note**: LIFF の全機能をテストするには LINE アプリ内からアクセスする必要があります。開発中は外部ブラウザモードで基本的な UI・ロジックの確認が可能です。

### 6. Vercel へのデプロイ

```bash
npx vercel
```

デプロイ後、Vercel の URL を LINE Developers コンソールの以下に設定:

- **LIFF エンドポイント URL**: `https://{your-vercel-domain}`
- **Webhook URL**: `https://{your-vercel-domain}/api/webhook`

### 7. リッチメニューの設定

LINE Official Account Manager で リッチメニューを作成し、アクションに LIFF URL を設定:

```
https://liff.line.me/{your-liff-id}
```

## 質問データのカスタマイズ

質問は `src/data/questions.json` で定義されています。

```json
{
  "questions": [
    {
      "id": "q1",
      "text": "質問テキスト",
      "type": "single",
      "options": [
        { "value": "a", "label": "選択肢A" }
      ],
      "next": {
        "default": "q2",
        "conditions": [
          { "if": { "equals": "a" }, "then": "q3" }
        ]
      }
    }
  ]
}
```

| フィールド | 説明 |
|---|---|
| `id` | 質問の一意識別子 |
| `text` | Bot が表示する質問テキスト |
| `type` | `"single"`（単一選択）または `"multiple"`（複数選択） |
| `options` | 選択肢の配列 |
| `next.default` | デフォルトの次の質問 ID |
| `next.conditions` | 条件分岐ルール（省略可） |

## ディレクトリ構成

```
├── api/
│   └── webhook.ts              # LINE Webhook（Vercel Serverless Function）
├── src/
│   ├── App.tsx                 # ルートコンポーネント
│   ├── main.tsx                # エントリーポイント
│   ├── components/             # UI コンポーネント
│   ├── data/questions.json     # 質問定義
│   ├── hooks/                  # カスタムフック
│   ├── lib/                    # ユーティリティ
│   └── types/                  # 型定義
├── index.html                  # Vite エントリー HTML
└── vite.config.ts
```

## 制約事項

- `liff.sendMessages()` は LINE アプリ内でのみ動作します
- localStorage による回答保存は端末に依存します（端末変更で消失）
- 本サンプルではデータベースは使用していません

## ライセンス

MIT
