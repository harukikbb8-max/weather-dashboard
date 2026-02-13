# Weather Dashboard - タスク進捗管理書

## プロジェクト情報

| 項目 | 内容 |
|------|------|
| 開始日 | 2026-02-12 |
| フレームワーク | Next.js 16 + TypeScript |
| ステータス | ✅ 完了 |

---

## タスク一覧

### Phase 1: 基盤構築

| # | タスク | 担当ファイル | ステータス | 備考 |
|---|--------|-------------|-----------|------|
| 1 | 要件定義書・進捗管理書の作成 | `REQUIREMENTS.md`, `PROGRESS.md` | ✅ 完了 | 設計意図を文書化 |
| 2 | 型定義・定数の定義 | `src/types/index.ts` | ✅ 完了 | APIレスポンス型、都市データ、指標メタデータ、WMO天気コード |
| 3 | API通信層の実装 | `src/lib/api.ts` | ✅ 完了 | Open-Meteo Forecast API + インメモリキャッシュ（TTL 5分） |

### Phase 2: ロジック層

| # | タスク | 担当ファイル | ステータス | 備考 |
|---|--------|-------------|-----------|------|
| 4 | useWeatherDataフック | `src/hooks/useWeatherData.ts` | ✅ 完了 | AbortController + メトリクスキー安定化 |
| 5 | useLocalStorageフック | `src/hooks/useLocalStorage.ts` | ✅ 完了 | SSR対応 + 遅延初期化 |

### Phase 3: UIコンポーネント

| # | タスク | 担当ファイル | ステータス | 備考 |
|---|--------|-------------|-----------|------|
| 6 | Header | `src/components/Header.tsx` | ✅ 完了 | Liquid Glass ヘッダー |
| 7 | CitySelector | `src/components/CitySelector.tsx` | ✅ 完了 | ネイティブselect + カスタムスタイル |
| 8 | MetricSelector | `src/components/MetricSelector.tsx` | ✅ 完了 | チェックボックス群 + カラードット |
| 9 | PeriodSelector | `src/components/PeriodSelector.tsx` | ✅ 完了 | セグメントコントロール + スライドアニメーション |
| 10 | UnitToggle | `src/components/UnitToggle.tsx` | ✅ 完了 | トグルスイッチ（ARIA role=switch） |
| 11 | WeatherChart | `src/components/WeatherChart.tsx` | ✅ 完了 | Recharts + カスタムツールチップ + 多系列対応 |
| 12 | CurrentWeather | `src/components/CurrentWeather.tsx` | ✅ 完了 | WMO天気コード → アイコン変換 |
| 13 | LoadingSkeleton | `src/components/LoadingSkeleton.tsx` | ✅ 完了 | チャート＆カード用スケルトン |
| 14 | ErrorDisplay | `src/components/ErrorDisplay.tsx` | ✅ 完了 | エラー表示 + リトライボタン |

### Phase 4: 統合・仕上げ

| # | タスク | 担当ファイル | ステータス | 備考 |
|---|--------|-------------|-----------|------|
| 15 | グローバルCSS（Liquid Glass） | `src/app/globals.css` | ✅ 完了 | メッシュグラデーション + glass-card + スクロールバー |
| 16 | レイアウト設定 | `src/app/layout.tsx` | ✅ 完了 | lang="ja" + Geist フォント + メタデータ |
| 17 | メインページ組み立て | `src/app/page.tsx` | ✅ 完了 | 状態リフトアップ + useCallback メモ化 |
| 18 | ビルド検証 | - | ✅ 完了 | `next build` 成功確認済み |

---

## 設計判断ログ

| 日付 | 判断内容 | 理由 |
|------|----------|------|
| 2026-02-12 | Next.js App Router採用 | Server Componentsとの親和性。layoutでメタ情報を分離でき責任が明確 |
| 2026-02-12 | Recharts選定 | React Composableパターンで宣言的記述が可能。D3ベースだが低レベルAPI不要 |
| 2026-02-12 | カスタムフックでデータ取得を分離 | コンポーネントから副作用を排除。テスタビリティ向上 |
| 2026-02-12 | Liquid Glassデザイン採用 | macOS最新のデザイン言語。backdrop-filterで現代的なUI |
| 2026-02-12 | localStorageをフックで抽象化 | 直接アクセスを散在させず、単一のフックに責任を集約 |
| 2026-02-12 | ネイティブ`<select>`を使用 | カスタムドロップダウンはキーボード操作の再実装が必要。ネイティブ要素のa11yを活用 |
| 2026-02-12 | 単位変換をAPI側に委譲 | クライアント側の浮動小数点変換誤差を排除。Open-Meteoのtemperature_unit/wind_speed_unitを活用 |
| 2026-02-12 | インメモリキャッシュ（Mapベース） | SWR/React Queryは依存追加の割にこの規模では過剰。自前Mapで十分かつ仕様を完全把握可能 |
| 2026-02-12 | AbortController でリクエスト管理 | パラメータ変更時にステールレスポンスがstateに反映されるのを防止 |
| 2026-02-12 | スケルトンUIを採用（スピナーではなく） | 最終レイアウトを予告でき知覚的待ち時間を短縮するUXパターン |
| 2026-02-12 | 期間を48h/7dトグルに変更 | 3/7/14日の3択は過剰。48h(hourly詳細)と7d(3h間引き)の2択がユースケースに合致 |
| 2026-02-12 | 両モードともhourlyエンドポイント統一 | dailyエンドポイントは指標名が異なる(temperature_2m_max等)ため、指標定義の二重管理を回避 |
| 2026-02-12 | 天気連動の動的空背景を追加 | CSS-onlyグラデーション+アニメーション。Canvas不使用でバンドルサイズ増加なし |
| 2026-02-12 | 空背景は2秒のtransitionで切替 | 急激な変化はUXを損なう。ゆるやかな遷移で「天気の移り変わり」を表現 |
| 2026-02-13 | 降水量に応じた雨アニメーション速度の3段階制御を追加 | 0〜2mm（しとしと）/ 2〜5mm（強い雨）/ 5mm超（激しい雨）。チャートホバー時もその時点の降水量で連動。CSSの `animation` をインラインで丸ごと指定し shorthand 競合を回避 |

---

## レビュー観点チェックリスト

- [x] 各ファイルの責任が明確で、1つのファイルが1つのことだけ行っている
- [x] 型定義がAPIレスポンスを正確に反映している
- [x] エラーハンドリングがユーザーフレンドリー（リトライ機能付き）
- [x] 選択変更時のみAPIコールが発生する（useEffectの依存配列で制御）
- [x] localStorageの永続化が正しく動作する（SSR対応済み）
- [x] レスポンシブデザインが対応（モバイル: 1カラム / デスクトップ: サイドバー+メイン）
- [x] アクセシビリティ（role属性、aria-label、セマンティックHTML）
- [x] `next build` がエラーなく成功する

---

## ファイル責任マップ

```
src/
├── types/index.ts           ← 【型定義層】データの「形」を定義する辞書
│                                誰が使う: 全ファイル
│                                何を知る: APIの形式、都市・指標の定義
│                                何を知らない: UIの見た目、取得方法
│
├── lib/api.ts               ← 【通信層】外部世界との唯一の接点
│                                誰が使う: useWeatherData
│                                何を知る: エンドポイントURL、パラメータ構築、キャッシュ
│                                何を知らない: UIの状態、React
│
├── hooks/
│   ├── useWeatherData.ts    ← 【データ管理層】取得 → 整形 → 状態化のパイプライン
│   │                            誰が使う: page.tsx
│   │                            何を知る: いつフェッチし、どう整形するか
│   │                            何を知らない: UIの見た目
│   │
│   └── useLocalStorage.ts   ← 【永続化層】localStorageをuseStateに見せかける
│                                誰が使う: page.tsx
│                                何を知る: localStorage API
│                                何を知らない: 何のデータを保存するか
│
├── components/
│   ├── Header.tsx           ← ブランディング表示
│   ├── CitySelector.tsx     ← 都市選択 → onChange でIDを通知
│   ├── MetricSelector.tsx   ← 指標選択 → onChange でID配列を通知
│   ├── PeriodSelector.tsx   ← 期間選択 → onChange で日数を通知
│   ├── UnitToggle.tsx       ← 単位切替 → onChange でシステムを通知
│   ├── WeatherChart.tsx     ← data配列を受け取り折れ線グラフを描画
│   ├── CurrentWeather.tsx   ← current応答を受け取り現在天気を描画
│   ├── LoadingSkeleton.tsx  ← ローディング中のプレースホルダー
│   └── ErrorDisplay.tsx     ← エラーメッセージ + リトライボタン
│
└── app/
    ├── globals.css          ← グローバルテーマ（Liquid Glassユーティリティ）
    ├── layout.tsx           ← HTMLシェル + メタデータ
    └── page.tsx             ← 【統合層】状態管理 + コンポーネント配置
                                 ここが全体の「司令塔」
```
