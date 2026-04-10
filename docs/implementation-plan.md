# 実装計画書: LINE チャット風ステップフォーム（LIFF アプリ）

## 0. 本ドキュメントについて

本書は [要件定義書](requirements.md) に基づき、実装の順序・各フェーズの成果物・ファイル単位の作業内容を定義する。

### フェーズ間の依存関係

各フェーズの依存関係を以下に示す。矢印は「右側が左側に依存する」ことを意味する。

```
フェーズ1 (型定義・データ)
  ├──▶ フェーズ2 (フローエンジン) ──▶ フェーズ4 (状態管理) ──┐
  └──▶ フェーズ3 (LIFF認証)  ─────────────────────────────┤
                                                          ├──▶ フェーズ5 (UI) ──▶ フェーズ6 (画面統合)
                                                          │
  フェーズ7 (Webhook) ※独立して並行実施可能 ──────────────┤
                                                          └──▶ フェーズ8 (デプロイ)
```

**並行実施が可能な組み合わせ**:
- フェーズ 2 と フェーズ 3（共にフェーズ 1 のみに依存）
- フェーズ 7（他フェーズと独立。フロントエンドのコードに依存しない）

### 対応する要件定義書の要件 ID との関係

各作業には要件定義書の ID（F-xxx / NF-xxx）を紐付けている。
全要件がいずれかのフェーズでカバーされていることを末尾のトレーサビリティマトリクスで保証する。

---

## 1. 実装フェーズ一覧

| フェーズ | 名称 | 概要 | 主な成果物 |
|---|---|---|---|
| 1 | 型定義・データ層 | TypeScript 型と質問 JSON を作成 | types/index.ts, questions.json |
| 2 | 質問フローエンジン | JSON を解釈し次の質問を決定するロジック | questionEngine.ts |
| 3 | LIFF 認証・初期化 | LIFF SDK の初期化とログイン処理 | useLiff.ts, liff.ts |
| 4 | 状態管理・永続化 | localStorage による回答の保存・復元 | useLocalStorage.ts, useChatForm.ts |
| 5 | UI コンポーネント実装 | チャット風 UI の全コンポーネント | components/*.tsx |
| 6 | 画面統合 | コンポーネントを組み合わせてメイン画面を構築 | App.tsx |
| 7 | Webhook Bot | LINE Messaging API の Webhook 処理 | api/webhook.ts |
| 8 | Vercel デプロイ・LINE 連携 | デプロイと LINE 設定の反映 | vercel.json, LINE 設定 |

---

## 2. フェーズ詳細

---

### フェーズ 1: 型定義・データ層

**目的**: アプリ全体で使用する TypeScript 型と、質問定義データを作成する。後続フェーズの全てがこの型定義に依存するため、最初に確定させる。

**対応要件**: F-027, F-028, F-029

#### 作業 1-1: TypeScript 型定義の作成

**ファイル**: `src/types/index.ts`

以下の型を定義する。

```typescript
// 選択肢
type Option = {
  value: string;
  label: string;
};

// 条件分岐ルール
type Condition = {
  if: { equals?: string; includes?: string };
  then: string;
};

// 次の質問の決定ルール
type NextRule = {
  default: string;            // デフォルトの次の質問 ID（最終質問の場合は省略可）
  conditions?: Condition[];   // 条件分岐（省略可）
};

// 質問
type Question = {
  id: string;
  text: string;
  type: "single" | "multiple";
  options: Option[];
  next?: NextRule;            // 省略時は最終質問
};

// 完了時設定
type CompletionConfig = {
  message: string;            // 完了画面の表示メッセージ
  lineMessage: string;        // LINE トークに送信するメッセージ
};

// 質問定義全体
type QuestionnaireData = {
  questions: Question[];
  completion: CompletionConfig;
};

// ユーザーの回答（1問分）
type Answer = {
  questionId: string;
  values: string[];           // 単一選択でも配列（統一的に扱うため）
};

// チャットメッセージ（UI表示用）
type ChatMessage = {
  id: string;
  role: "bot" | "user";
  text: string;
  timestamp: number;
};
```

**完了条件**: `tsc --noEmit` でエラーがないこと。

#### 作業 1-2: サンプル質問データの作成

**ファイル**: `src/data/questions.json`

要件 F-029 に基づき、汎用デモとして **7問** の質問セットを作成する。
条件分岐は 2箇所に設定し、フローが分かれることをデモする。

**質問フロー図**:

```
q1 (年代) ──────────────────────────────▶ q2 (趣味・複数選択)
                                           │
                                    ┌──────┴──────┐
                              sports を含む    それ以外
                                    │             │
                                    ▼             ▼
                              q3a (スポーツ種目)  q3b (休日の過ごし方)
                                    │             │
                                    └──────┬──────┘
                                           ▼
                                    q4 (SNS 利用頻度)
                                           │
                                    ┌──────┴──────┐
                              daily          それ以外
                                    │             │
                                    ▼             ▼
                              q5a (よく使うSNS)  q5b (情報収集方法)
                                    │             │
                                    └──────┬──────┘
                                           ▼
                                    q6 (満足度)
                                           │
                                           ▼
                                        完了
```

**完了条件**: JSON が `QuestionnaireData` 型としてパースできること。全ての `next` の参照先 ID が実在すること。

---

### フェーズ 2: 質問フローエンジン

**目的**: 質問データの JSON を読み込み、回答に基づいて次の質問を決定するロジックを実装する。UI から独立した純粋なロジック層。

**対応要件**: F-011, F-012, NF-011

#### 作業 2-1: フローエンジンの実装

**ファイル**: `src/lib/questionEngine.ts`

**責務**:
- `getFirstQuestion()`: 最初の質問を返す
- `getNextQuestion(currentQuestionId, answer)`: 回答に基づき次の質問を返す。条件分岐を評価し、マッチする条件があればその `then` を、なければ `default` を返す。全問完了時は `null` を返す
- `getQuestionById(id)`: 指定 ID の質問を返す
- `getCompletionConfig()`: 完了時設定を返す
- `getTotalQuestionCount()`: 質問の総数を返す（進捗表示用。分岐があるため最大数を返す）

**条件分岐の評価ルール**:
- `equals`: 単一選択の回答値が完全一致
- `includes`: 複数選択の回答値配列に指定値が含まれる
- `conditions` は配列の先頭から評価し、最初にマッチしたものを採用する

**完了条件**: 以下のケースを手動またはテストで確認する。
- 分岐なし（default のみ）で次の質問に遷移する
- 条件一致で分岐先に遷移する
- 条件不一致で default に遷移する
- 最終質問で null が返る

---

### フェーズ 3: LIFF 認証・初期化

**目的**: LIFF SDK を初期化し、LINE ログインとプロフィール取得を行う。LIFF 外（外部ブラウザ）での動作も考慮する。

**対応要件**: F-018, F-019, F-020, NF-008

#### 作業 3-1: LIFF ユーティリティの作成

**ファイル**: `src/lib/liff.ts`

**責務**:
- `initializeLiff(liffId)`: LIFF SDK を初期化し、未ログインならログイン画面にリダイレクトする
- `getLiffProfile()`: ユーザーのプロフィール（displayName, pictureUrl）を取得する
- `sendLineMessage(text)`: `liff.sendMessages()` でトークにメッセージを送信する。LIFF 外の場合はスキップし、戻り値で送信成否を返す
- `closeLiff()`: `liff.closeWindow()` で LIFF ウィンドウを閉じる。LIFF 外の場合はスキップ
- `isInLiff()`: LIFF 内で動作しているかを返す

**LIFF 外ブラウザ対応**（要件 リスク#2 への対策）:
- `liff.isInClient()` で判定し、LIFF 外ではメッセージ送信をスキップ
- ログインは `liff.login()` で LINE ログイン画面にリダイレクト

#### 作業 3-2: useLiff フックの作成

**ファイル**: `src/hooks/useLiff.ts`

**責務**:
- `useLiff()` フック: LIFF 初期化・ログイン・プロフィール取得をまとめて管理する
- 戻り値: `{ isReady, isLoggedIn, isInLiff, profile, error }`
- 初期化中は `isReady: false` → ローディング画面表示の判断に使用（リスク#5 対策）

**完了条件**: 外部ブラウザで `npm run dev` → LIFF 初期化エラーが発生するが、アプリがクラッシュせずエラー表示されること。

---

### フェーズ 4: 状態管理・永続化

**目的**: ユーザーの回答データをメモリ上で管理し、localStorage との同期を行う。途中離脱からの復元を実現する。

**対応要件**: F-015, F-016, F-017

#### 作業 4-1: useLocalStorage フックの作成

**ファイル**: `src/hooks/useLocalStorage.ts`

**責務**:
- `useLocalStorage<T>(key, initialValue)`: localStorage と同期する汎用フック
- 値の読み書き時に JSON シリアライズ / デシリアライズを行う
- localStorage が利用できない環境ではメモリのみで動作する（フォールバック）

#### 作業 4-2: useChatForm フックの作成

**ファイル**: `src/hooks/useChatForm.ts`

**責務**: チャットフォームの全状態を管理するメインのフック。

**管理する状態**:
- `messages: ChatMessage[]` — 画面に表示するメッセージ一覧
- `answers: Answer[]` — ユーザーの回答一覧（localStorage に保存）
- `currentQuestion: Question | null` — 現在表示中の質問
- `isCompleted: boolean` — 全問回答完了フラグ
- `isTyping: boolean` — Bot のタイピング中フラグ

**提供するアクション**:
- `handleAnswer(values: string[])` — ユーザーの回答を処理する。回答メッセージを追加し、次の質問を取得して Bot メッセージを追加する
- `handleBack()` — 前の質問に戻る（Should 要件 F-014）
- `resetForm()` — 全データをクリアして最初からやり直す

**回答処理フロー**（`handleAnswer` の内部動作）:
```
1. ユーザーの選択内容を ChatMessage として追加
2. Answer を answers 配列に追加 → localStorage に保存
3. isTyping を true にする（タイピングアニメーション開始）
4. 500ms 待機（体感的な「考え中」演出）
5. questionEngine で次の質問を取得
6. 次の質問がある場合:
   → Bot の質問メッセージを ChatMessage として追加
   → currentQuestion を更新
7. 次の質問がない場合:
   → isCompleted を true にする
8. isTyping を false にする
```

**復元処理フロー**（初期化時）:
```
1. localStorage から answers を読み込む
2. answers が存在する場合:
   → 保存済みの回答を元に messages を再構築
   → 最後の回答の次の質問を currentQuestion にセット
3. answers が空の場合:
   → 最初の質問を表示
```

**完了条件**:
- 質問に回答すると次の質問が表示される
- ブラウザをリロードすると、localStorage から回答が自動復元され、最後に回答した質問の次の質問から再開できる（例: 3問目まで回答済みならリロード後に4問目が表示される）
- 全問回答後に `isCompleted` が true になる
- `resetForm()` 呼び出し後に localStorage がクリアされ、最初の質問から再開される

---

### フェーズ 5: UI コンポーネント実装

**目的**: チャット風フォームの UI コンポーネントを実装する。Frontend-Design スキルを使用して高品質なデザインを実現する。

**対応要件**: F-001〜F-010, F-013, F-021〜F-023, NF-003〜NF-007

**デザイン共通ルール**:
- カラーパレット・タイポグラフィは要件定義書セクション 7 に従う
- 全コンポーネントで Frontend-Design スキル（`/frontend-design`）を使用する
- タッチターゲットは最低 44px（NF-005）
- アニメーションは 300ms ease-out を基本とする（NF-006）

#### 作業 5-1: ChatHeader コンポーネント

**ファイル**: `src/components/ChatHeader.tsx`

**対応要件**: F-001

**props**:
- `title: string` — アプリタイトル
- `currentStep: number` — 現在の質問番号
- `totalSteps: number` — 質問の総数
- `userProfile?: { displayName: string; pictureUrl?: string }` — ユーザープロフィール

**表示内容**:
- アプリタイトル（左寄せ）
- プログレスバー（currentStep / totalSteps）
- ユーザーアイコン（右寄せ、取得できた場合）

#### 作業 5-2: MessageBubble コンポーネント

**ファイル**: `src/components/MessageBubble.tsx`

**対応要件**: F-002, F-003, F-007, F-009

**props**:
- `message: ChatMessage` — 表示するメッセージ
- `animate?: boolean` — フェードインアニメーションを適用するか

**表示ルール**:
- `role: "bot"` → 左寄せ、白背景（#FFFFFF）、シャドウ付き
- `role: "user"` → 右寄せ、薄ピンク背景（#FFD6E0）
- `animate: true` の場合、フェードイン + スライドアップ（300ms ease-out）

#### 作業 5-3: OptionButtons コンポーネント

**ファイル**: `src/components/OptionButtons.tsx`

**対応要件**: F-004, F-005, F-006, F-010

**props**:
- `options: Option[]` — 選択肢一覧
- `type: "single" | "multiple"` — 選択方式
- `onSubmit: (values: string[]) => void` — 選択確定時のコールバック

**動作**:
- `single`: タップ即確定（1つ選んだ時点で `onSubmit` が呼ばれる）
- `multiple`: チェックボックス的に複数選択 → 「決定」ボタンで確定
- タップ時にスケール縮小（0.95）+ 背景色変化のアニメーション（F-010）
- 複数選択時は選択中の項目にチェックマークとアクティブスタイルを付与

#### 作業 5-4: TypingIndicator コンポーネント

**ファイル**: `src/components/TypingIndicator.tsx`

**対応要件**: F-009

**表示内容**:
- Bot アイコン + ドット 3 つのパルスアニメーション
- Bot メッセージと同じ左寄せ配置

#### 作業 5-5: CompletionScreen コンポーネント

**ファイル**: `src/components/CompletionScreen.tsx`

**対応要件**: F-013, F-021, F-022, F-023

**props**:
- `completionConfig: CompletionConfig` — 完了時設定
- `answers: Answer[]` — ユーザーの回答一覧（サマリー表示用）
- `questions: Question[]` — 質問一覧（回答テキスト変換用）
- `onSendMessage: () => Promise<void>` — LINE メッセージ送信
- `onClose: () => void` — LIFF ウィンドウを閉じる

**表示内容**:
- 完了メッセージ（completionConfig.message）
- 回答サマリー（質問テキストと選択した回答のラベルを一覧表示）
- 「LINE に送信」ボタン → `onSendMessage` を実行
- 「閉じる」ボタン → `onClose` を実行

**動作フロー**:
```
1. 完了画面が表示される
2. ユーザーが「LINE に送信」をタップ
3. liff.sendMessages() でお礼メッセージを送信
4. 送信成功 → 「送信しました」表示 + localStorage クリア
5. 送信失敗（LIFF 外など）→ 「LINE アプリ内から開いてください」表示
6. 「閉じる」をタップ → liff.closeWindow()
```

#### 作業 5-6: ChatForm コンポーネント（統合）

**ファイル**: `src/components/ChatForm.tsx`

**対応要件**: F-002, F-008, F-014

**責務**: 上記の子コンポーネントを組み合わせてチャット画面を構成する。

**構成**:
```
<ChatForm>
  <ChatHeader />
  <MessageArea>           ← スクロール可能なメッセージ表示エリア
    <MessageBubble />     ← 複数の Bot/User メッセージ
    <TypingIndicator />   ← タイピング中のみ表示
  </MessageArea>
  <OptionButtons />       ← 現在の質問の選択肢（最下部に固定 or メッセージ末尾）
</ChatForm>
```

**自動スクロール**（F-008）:
- 新しいメッセージが追加されたら `scrollIntoView({ behavior: "smooth" })` で最下部にスクロール
- `useRef` + `useEffect` で実装

**完了条件**（LIFF なしのスタンドアロン動作確認）:

本フェーズの確認は **外部ブラウザ（`npm run dev`）** で行う。LIFF 認証はモック状態（フェーズ 6 で統合）のため、フォーム UI 単体の動作を確認する。

- [ ] Bot の質問が吹き出し形式で左寄せ表示される
- [ ] 単一選択: 選択肢をタップすると即確定し、ユーザー吹き出しが右寄せで追加される
- [ ] 複数選択: 複数選択後「決定」ボタンで確定される
- [ ] 条件分岐: 回答内容に応じて表示される次の質問が変わる（フロー図の通り）
- [ ] 自動スクロール: メッセージ追加時に最下部にスムーズスクロールする
- [ ] タイピングインジケーター: 回答後〜次の質問表示の間にドットアニメーションが表示される
- [ ] 全問回答後に完了画面（完了メッセージ + 回答サマリー）が表示される
- [ ] プログレスバーが進捗に応じて更新される
- [ ] ボタンのタッチターゲットが 44px 以上ある（開発者ツールで計測）

---

### フェーズ 6: 画面統合

**目的**: LIFF 初期化・認証とチャットフォームを統合し、アプリ全体の状態遷移を管理する。

**前提**: フェーズ 3（LIFF 認証）、フェーズ 4（状態管理）、フェーズ 5（UI）が完了していること。

**対応要件**: F-018, F-020, NF-001

#### 作業 6-1: App.tsx の実装

**ファイル**: `src/App.tsx`（既存ファイルを上書き）

**画面の状態遷移**:
```
                ┌────────────┐
                │ ローディング │
                │  (LIFF 初期化中)
                └──────┬─────┘
                       │ isReady = true
                       ▼
               ┌───────────────┐
               │ ログイン要求   │  ← 未ログイン時
               │ (自動リダイレクト)
               └───────┬───────┘
                       │ isLoggedIn = true
                       ▼
               ┌───────────────┐
               │  チャットフォーム │
               └───────┬───────┘
                       │ isCompleted = true
                       ▼
               ┌───────────────┐
               │   完了画面     │
               └───────────────┘
```

**ローディング画面**:
- パステルピンク背景 + スピナーまたはパルスアニメーション
- 「読み込み中...」テキスト
- LIFF 初期化エラー時はエラーメッセージを表示

**完了条件**（LIFF 統合後の確認）:
- [ ] 外部ブラウザ: LIFF 初期化エラーが画面上に表示され、アプリがクラッシュしない
- [ ] 外部ブラウザ: ローディング画面が一瞬表示された後、エラーまたはフォームが表示される
- [ ] `npm run build` がエラーなく成功する
- [ ] ビルド成果物（dist/）が生成される

---

### フェーズ 7: Webhook Bot

**目的**: LINE Messaging API の Webhook を受信する Serverless Function を実装する。

**対応要件**: F-024, F-025, F-026, NF-009, NF-010

**並行実施**: 本フェーズはフロントエンド（フェーズ 1〜6）と独立しているため、並行して実施できる。

#### 作業 7-1: Vercel Serverless Function の作成

**ファイル**: `src/api/webhook.ts`

> **重要**: Vercel Serverless Functions は **Vercel が認識するルートディレクトリ直下の `api/` ディレクトリ** に配置する必要がある。本計画では Vercel のルートディレクトリを **`src`** に設定するため、ファイルの実体は `src/api/webhook.ts` となる。Vercel から見ると `api/webhook.ts` として認識される。フロントエンドの Vite ビルドからは除外する。

**Vite ビルドからの除外**:
- `api/` ディレクトリは Vite のソースコードではないため、`tsconfig.json` の `exclude` に `"api"` を追加する

**処理フロー**:
```
1. POST リクエストを受信
2. X-Line-Signature ヘッダーでリクエストの署名を検証（F-026, NF-009）
   → 検証失敗: 400 を返す
3. イベントをループ処理
   → follow イベント（友だち追加）: ウェルカムメッセージを送信（F-025）
   → その他: 何もしない
4. 200 を返す
```

**署名検証の実装**:
- `@line/bot-sdk` の `validateSignature` を使用
- `LINE_CHANNEL_SECRET` 環境変数を使用（`process.env.LINE_CHANNEL_SECRET`）

**環境変数について**: Webhook で使用する `LINE_CHANNEL_SECRET` と `LINE_CHANNEL_ACCESS_TOKEN` は Vercel の環境変数として設定する（フェーズ 8 作業 8-2）。ローカルでの動作確認は Vercel CLI（`vercel dev`）で行うことで `.env.local` の値が読み込まれる。

**ウェルカムメッセージ**:
```
こんにちは！
チャットフォームをお試しいただきありがとうございます。
画面下部のメニューからフォームを開いてみてください。
```

**依存パッケージの追加**:
- `@line/bot-sdk` を `src/package.json` の `dependencies` に追加

**完了条件**:
- `curl -X POST http://localhost:3000/api/webhook` で署名なしリクエストを送り、400 が返ること（`vercel dev` で確認）
- LINE Developers コンソールの Webhook URL 検証で「成功」と表示されること（フェーズ 8 デプロイ後に実施）

---

### フェーズ 8: Vercel デプロイ・LINE 連携

**目的**: Vercel にデプロイし、LINE の LIFF エンドポイント URL と Webhook URL を設定して、LINE アプリ内から動作確認する。

**対応要件**: NF-001（パフォーマンス確認）

#### 作業 8-1: Vercel 設定ファイルの作成

**ファイル**: `src/vercel.json`（Vercel のルートディレクトリを `src` に設定する前提のため `src/` 配下に配置）

```json
{
  "buildCommand": "npm run build",
  "outputDirectory": "dist",
  "rewrites": [
    { "source": "/((?!api/).*)", "destination": "/index.html" }
  ]
}
```

#### 作業 8-2: 環境変数の設定（Vercel）

Vercel ダッシュボードで以下の環境変数を設定する。

| 変数名 | 値の取得元 |
|---|---|
| `VITE_LIFF_ID` | LINE Developers → LINE ログインチャネル → LIFF → LIFF ID |
| `LINE_CHANNEL_SECRET` | LINE Developers → Messaging API チャネル → チャネル基本設定 |
| `LINE_CHANNEL_ACCESS_TOKEN` | LINE Developers → Messaging API チャネル → Messaging API 設定 |

#### 作業 8-3: Vercel プロジェクト設定

Vercel ダッシュボードまたは初回デプロイ時に、以下を設定する。

| 設定項目 | 値 |
|---|---|
| Root Directory | `src` |
| Build Command | `npm run build` |
| Output Directory | `dist` |

#### 作業 8-4: デプロイ実行

```bash
npx vercel --prod
```

#### 作業 8-5: LINE Developers コンソールの設定更新

デプロイ後の Vercel URL（例: `https://line-app-sample-xxx.vercel.app`）を以下に設定する。

| 設定箇所 | 値 |
|---|---|
| LIFF エンドポイント URL | `https://{vercel-domain}` |
| Messaging API Webhook URL | `https://{vercel-domain}/api/webhook` |
| Webhook の利用 | **ON** にする |

#### 作業 8-6: 動作確認チェックリスト

**外部ブラウザ（PC）での確認**:
- [ ] `https://{vercel-domain}` にアクセスできる
- [ ] LIFF 初期化エラーが表示されるがクラッシュしない

**LINE アプリ内での確認**:
- [ ] リッチメニューから LIFF アプリが Full モードで開く
- [ ] LINE ログインが実行され、プロフィールが取得できる
- [ ] 質問が順番に表示される
- [ ] 単一選択が動作する
- [ ] 複数選択 →「決定」ボタンが動作する
- [ ] 条件分岐で質問フローが変わる
- [ ] 途中でアプリを閉じ、再度開くと回答が復元される
- [ ] 全問回答後に完了画面が表示される
- [ ] 「LINE に送信」でお礼メッセージがトークに送信される
- [ ] 「閉じる」で LIFF ウィンドウが閉じる
- [ ] 友だち追加時にウェルカムメッセージが届く

---

## 3. ファイル作成・変更一覧

フェーズごとに作成または変更するファイルの一覧。

| フェーズ | 操作 | ファイルパス | 説明 |
|---|---|---|---|
| 1 | 新規 | `src/types/index.ts` | TypeScript 型定義 |
| 1 | 新規 | `src/data/questions.json` | サンプル質問データ（7問） |
| 2 | 新規 | `src/lib/questionEngine.ts` | 質問フロー制御エンジン |
| 3 | 新規 | `src/lib/liff.ts` | LIFF ユーティリティ |
| 3 | 新規 | `src/hooks/useLiff.ts` | LIFF 初期化フック |
| 4 | 新規 | `src/hooks/useLocalStorage.ts` | localStorage 同期フック |
| 4 | 新規 | `src/hooks/useChatForm.ts` | フォーム状態管理フック |
| 5 | 新規 | `src/components/ChatHeader.tsx` | ヘッダー |
| 5 | 新規 | `src/components/MessageBubble.tsx` | メッセージ吹き出し |
| 5 | 新規 | `src/components/OptionButtons.tsx` | 選択肢ボタン群 |
| 5 | 新規 | `src/components/TypingIndicator.tsx` | タイピングインジケーター |
| 5 | 新規 | `src/components/CompletionScreen.tsx` | 完了画面 |
| 5 | 新規 | `src/components/ChatForm.tsx` | チャットフォーム統合 |
| 6 | 変更 | `src/App.tsx` | ルートコンポーネント更新 |
| 6 | 変更 | `src/index.css` | グローバルスタイル追加（カスタムアニメーション等） |
| 7 | 新規 | `src/api/webhook.ts` | Webhook Serverless Function（Vercel ルートディレクトリ = `src`） |
| 7 | 変更 | `src/package.json` | @line/bot-sdk を dependencies に追加 |
| 7 | 変更 | `src/tsconfig.json` | exclude に `"api"` を追加 |
| 8 | 新規 | `src/vercel.json` | Vercel デプロイ設定（Vercel ルートディレクトリ = `src`） |

---

## 4. 要件トレーサビリティマトリクス

全要件が実装計画でカバーされていることを示す。

### 機能要件

| 要件 ID | 要件概要 | 対応フェーズ | 対応ファイル |
|---|---|---|---|
| F-001 | ヘッダーにタイトル・進捗表示 | 5 | ChatHeader.tsx |
| F-002 | メッセージエリアに対話表示 | 5, 6 | ChatForm.tsx, MessageBubble.tsx |
| F-003 | Bot メッセージを吹き出し表示 | 5 | MessageBubble.tsx |
| F-004 | Bot メッセージ下に選択肢表示 | 5 | OptionButtons.tsx |
| F-005 | 単一選択をサポート | 5 | OptionButtons.tsx |
| F-006 | 複数選択をサポート | 5 | OptionButtons.tsx |
| F-007 | ユーザー回答を吹き出し表示 | 5 | MessageBubble.tsx |
| F-008 | 自動スクロール | 5 | ChatForm.tsx |
| F-009 | タイピングアニメーション | 5 | TypingIndicator.tsx |
| F-010 | ボタンタップアニメーション | 5 | OptionButtons.tsx |
| F-011 | JSON 定義で質問を順番表示 | 2 | questionEngine.ts |
| F-012 | 条件分岐で次の質問決定 | 2 | questionEngine.ts |
| F-013 | 全問完了後に完了画面表示 | 5, 6 | CompletionScreen.tsx, App.tsx |
| F-014 | 回答の戻りをサポート | 4 | useChatForm.ts |
| F-015 | 回答を localStorage に保存 | 4 | useLocalStorage.ts, useChatForm.ts |
| F-016 | 再起動時に回答復元 | 4 | useChatForm.ts |
| F-017 | 完了後に保存データクリア | 4, 5 | useChatForm.ts, CompletionScreen.tsx |
| F-018 | LIFF ログイン | 3 | useLiff.ts, liff.ts |
| F-019 | プロフィール取得・表示 | 3, 5 | useLiff.ts, ChatHeader.tsx |
| F-020 | 未ログイン時リダイレクト | 3 | liff.ts |
| F-021 | 完了画面に回答サマリー | 5 | CompletionScreen.tsx |
| F-022 | LINE トークにお礼メッセージ送信 | 3, 5 | liff.ts, CompletionScreen.tsx |
| F-023 | LIFF ウィンドウを閉じる導線 | 3, 5 | liff.ts, CompletionScreen.tsx |
| F-024 | Webhook 受信の Serverless Function | 7 | src/api/webhook.ts |
| F-025 | 友だち追加時ウェルカムメッセージ | 7 | src/api/webhook.ts |
| F-026 | Webhook 署名検証 | 7 | src/api/webhook.ts |
| F-027 | JSON で質問定義 | 1 | questions.json, types/index.ts |
| F-028 | JSON 内に条件分岐ルール定義 | 1 | questions.json, types/index.ts |
| F-029 | サンプル質問セット | 1 | questions.json |

### 非機能要件

| 要件 ID | 要件概要 | 対応フェーズ | 実現方法 |
|---|---|---|---|
| NF-001 | 初回表示 3 秒以内 | 6, 8 | Vite の軽量バンドル + ローディング画面 |
| NF-002 | 質問遷移 300ms 以内 | 4 | クライアント側で即時処理（API 通信なし） |
| NF-003 | モバイルファースト | 5 | 全コンポーネントでスマホ縦画面前提の設計 |
| NF-004 | パステルピンク・ポップ調 | 5 | カラーパレットの適用 |
| NF-005 | タッチターゲット 44px 以上 | 5 | OptionButtons, ボタン系の最小サイズ指定 |
| NF-006 | スムーズなアニメーション | 5 | CSS transition / keyframe animation |
| NF-007 | LIFF Full モード最適化 | 5, 6 | viewport 設定 + 全画面レイアウト |
| NF-008 | LIFF ユーザー認証 | 3 | liff.login() |
| NF-009 | Webhook 署名検証 | 7 | @line/bot-sdk validateSignature |
| NF-010 | 環境変数で秘密情報管理 | 7, 8 | .env.local + Vercel 環境変数 |
| NF-011 | JSON 編集のみで質問変更可 | 1, 2 | questions.json + questionEngine |
| NF-012 | コンポーネント責務分離 | 5 | 1ファイル1責務の設計 |
