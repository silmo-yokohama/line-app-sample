# Line App Sample

LINE公式アカウントのリッチメニューから起動するLIFFアプリ（チャット風ステップフォーム）。

## 技術スタック
- React + Vite + TypeScript（SPA）
- @line/liff (LIFF SDK)
- @line/bot-sdk (Messaging API / Vercel Serverless Function)
- Tailwind CSS
- Vercel (デプロイ先: SPA + Serverless Functions)

## 開発ルール
- 質問データは `src/data/questions.json` で管理（コードに直接書かない）
- 環境変数は `.env.local` で管理（Git管理外）。クライアント公開は `VITE_` プレフィックス
- モバイルファースト・スマホ縦画面を前提としたUI設計
- デザインはパステルピンク基調のポップ調
- UI実装にはClaude CodeのFrontend-Designスキル（`/frontend-design`）を使用する