# Weather Dashboard SPA - 要件定義書

## 1. プロジェクト概要

| 項目 | 内容 |
|------|------|
| プロジェクト名 | Weather Dashboard |
| 種別 | Single Page Application（1ページ完結） |
| 目的 | 都市と指標を選択し、時系列天気情報をチャート表示する |
| データソース | Open-Meteo Forecast API（APIキー不要・非商用無償） |

---

## 2. 技術スタック選定理由

| 技術 | 選定理由 |
|------|----------|
| **Next.js 16 (App Router)** | React最新のServer Components対応。App Routerによるファイルベースルーティングとlayout/pageの分離が明確 |
| **TypeScript** | 型安全性による実行時エラー防止。APIレスポンスの型定義でデータ構造を自己文書化 |
| **Tailwind CSS v4** | ユーティリティファーストでCSS肥大化を防止。デザイントークンの一貫性を保証 |
| **Recharts** | React専用設計で宣言的にチャートを記述可能。Composableなコンポーネント構成が設計思想と合致 |
| **Lucide React** | 軽量・Tree-shakeable。必要なアイコンのみバンドルされる |

---

## 3. アーキテクチャ設計

### 3.1 レイヤー構成（責任分離）

```
src/
├── types/          ← 【型定義層】全体で共有する型・定数
│   └── index.ts        APIレスポンス型、都市データ、指標定義
│
├── lib/            ← 【データ取得層】外部APIとの通信を抽象化
│   └── api.ts          Open-Meteo API呼び出し（fetch + 型変換）
│
├── hooks/          ← 【状態管理層】ビジネスロジックとUIの橋渡し
│   ├── useWeatherData.ts   データ取得＋キャッシュ＋ローディング状態
│   └── useLocalStorage.ts  永続化ロジック（選択状態の保持）
│
├── components/     ← 【表示層】UIコンポーネント（純粋な描画責任）
│   ├── Header.tsx          アプリヘッダー
│   ├── CitySelector.tsx    都市選択（セレクトボックス）
│   ├── MetricSelector.tsx  指標選択（チェックボックス群）
│   ├── PeriodSelector.tsx  期間選択（セグメントコントロール）
│   ├── UnitToggle.tsx      単位切替（°C/°F等）
│   ├── WeatherChart.tsx    チャート描画（Recharts）
│   ├── CurrentWeather.tsx  現在天気サマリーカード
│   └── LoadingSkeleton.tsx ローディングUI
│
└── app/            ← 【ページ層】コンポーネントの組み立てとレイアウト
    ├── layout.tsx      HTMLメタ・フォント・テーマ
    ├── page.tsx        メインページ（状態のリフトアップ先）
    └── globals.css     グローバルスタイル（Liquid Glassテーマ）
```

### 3.2 設計原則

| 原則 | 適用箇所 |
|------|----------|
| **単一責任原則 (SRP)** | 各コンポーネントは1つの責任のみ持つ。例：`CitySelector`は都市選択UIのみ、データ取得は行わない |
| **関心の分離** | 型定義→API→Hooks→Components→Page の各層が独立。変更の影響範囲が限定される |
| **依存性の方向** | 上位層（page）→下位層（types）への一方向依存。componentsはhooksを知らない |
| **Props Down, Events Up** | 親から子へはpropsでデータを渡し、子から親へはコールバックでイベントを通知 |
| **Composition over Inheritance** | コンポーネントは継承ではなく合成で組み立てる |

### 3.3 データフロー

```
[ユーザー操作]
    ↓ コールバック (onChange)
[page.tsx] ← 状態管理の中心（useState / useLocalStorage）
    ↓ props
[useWeatherData] ← city, metrics, period を受け取りAPIコール
    ↓ fetch
[lib/api.ts] ← Open-Meteo APIへリクエスト
    ↓ JSON
[useWeatherData] ← レスポンスを整形してキャッシュ
    ↓ data / isLoading / error
[page.tsx] ← 取得結果を各コンポーネントへ配布
    ↓ props
[WeatherChart] [CurrentWeather] ← 描画のみ
```

---

## 4. 機能要件

### 4.1 都市選択
- 5都市を候補として提供：東京・大阪・札幌・福岡・那覇
- 各都市に緯度・経度・タイムゾーンを紐づけ
- セレクトボックスで選択

### 4.2 指標選択（複数選択可）
| 指標 | APIパラメータ | 単位 |
|------|--------------|------|
| 気温 | `temperature_2m` | °C / °F |
| 体感温度 | `apparent_temperature` | °C / °F |
| 降水量 | `precipitation` | mm |
| 湿度 | `relative_humidity_2m` | % |
| 風速 | `wind_speed_10m` | km/h / mph |
| 雲量 | `cloud_cover` | % |

### 4.3 期間選択
- 3日間 / 7日間 / 14日間（セグメントコントロール）

### 4.4 単位切替
- 温度：°C ↔ °F
- 風速：km/h ↔ mph

### 4.5 チャート表示
- 折れ線グラフで時系列描画
- 複数指標の重ね描き対応（多系列）
- ツールチップでホバー時の詳細表示
- レスポンシブ対応

### 4.6 現在天気カード
- 現在時刻に最も近いデータを表示
- 天気コード → アイコンへの変換

### 4.7 永続化
- 最後に選択した都市・指標・期間・単位をlocalStorageに保存
- 再訪問時に復元

---

## 5. 非機能要件

| 要件 | 対応方法 |
|------|----------|
| パフォーマンス | 選択変更時のみfetch。useCallbackでハンドラのメモ化。キャッシュキーによる重複リクエスト防止 |
| アクセシビリティ | セマンティックHTML、aria-label、キーボード操作対応、フォーカストラップ |
| レスポンシブ | モバイル・タブレット・デスクトップの3ブレークポイント対応 |
| エラーハンドリング | API失敗時のユーザーフレンドリーなエラー表示。リトライ機能 |
| UX | ローディングスケルトン、スムーズなトランジション |

---

## 6. デザインコンセプト：Liquid Glass

macOS/iOS のLiquid Glass UIに着想を得た、ガラスモーフィズム（Glassmorphism）ベースのデザイン。

- **背景**: グラデーションメッシュ（時間帯に応じた色変化）
- **カード**: `backdrop-filter: blur()` + 半透明背景 + 微細なボーダー
- **インタラクション**: hover時の微細な光沢シフト、スムーズなトランジション
- **カラー**: 青〜紫のグラデーションベースに、指標ごとのアクセントカラー
