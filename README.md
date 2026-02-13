# Weather Dashboard

都市と気象指標を選択して、時系列の天気情報を折れ線グラフで表示する SPA（Single Page Application）です。
チャート上のデータポイントにホバーすると、背景の空が天気と昼夜に連動してリアルタイムに変化します。

**デプロイ:** https://weather-dashboard-psi-liart.vercel.app/
 ※pw:admin

---

## 技術スタック

| 技術 | バージョン | 選定理由 |
|------|-----------|----------|
| **Next.js** | 16 (App Router) | `layout.tsx` / `page.tsx` の分離で責任が明確。Turbopack による高速ビルド |
| **TypeScript** | 5 | API レスポンスを型定義し、データ構造を自己文書化。実行時エラーを型エラーで事前検知 |
| **Tailwind CSS** | v4 | ユーティリティファーストで CSS の肥大化を防止。`glass-card` 等のカスタムクラスで一貫したデザイントークンを実現 |
| **Recharts** | 最新 | React の Composable パターンで `<LineChart><Line /></LineChart>` と宣言的にチャートを記述可能 |
| **Lucide React** | 最新 | Tree-shakeable で必要なアイコンのみバンドルされる軽量アイコンライブラリ |

---

## 機能一覧

### 基本機能

| 機能 | 説明 | 操作UI |
|------|------|--------|
| **都市選択** | 東京・大阪・札幌・福岡・那覇の5都市 | セレクトボックス |
| **指標選択** | 気温・体感温度・降水量・湿度・風速・雲量（複数選択可） | チェックボックス |
| **期間切替** | 48時間（hourly） / 7日間（hourly） | トグル |
| **単位切替** | °C/km/h と °F/mph | トグルスイッチ |
| **チャート表示** | 選択した指標を折れ線グラフで重ね描き | Recharts |
| **現在天気カード** | 現在の気温・体感温度・湿度・風速・降水量・天気アイコン | カード |

### 拡張機能

| 機能 | 説明 |
|------|------|
| **動的空背景** | 現在の天気コード（WMO）と時間帯（昼/夜）に応じて背景グラデーションが変化 |
| **チャートホバー連動** | チャート上のデータポイントにマウスを乗せると、その時点の天気・時刻で空背景がリアルタイムに変化。夜の時間帯（18:00〜6:00）では背景が暗転し星が瞬き、雨の時間帯では雨が降り始める |
| **天気エフェクト** | 雨（2層のアニメーション）、雪（2層の降雪アニメーション）、星（明滅アニメーション）を CSS-only で実装 |
| **降水量連動の雨速度** | 降水量に応じて雨アニメーションの速度が3段階に変化（0〜2mm: しとしと / 2〜5mm: 強い雨 / 5mm超: 激しい雨）。チャートホバー時はその時点の降水量で速度が連動。降水量0mmの場合は天気コードに関わらず雨エフェクトを非表示 |
| **天気インジケーター** | ヘッダー下に現在の天気・昼夜・ホバー中の時刻をバッジで表示。天気に応じたアイコンカラー変化 |
| **ツールチップ天気表示** | チャートホバー時のツールチップに、その時点の天気（晴れ/雨/曇り等）と昼/夜を表示 |
| **パスワード認証** | Next.js Middleware によるサイト全体のパスワード保護。Liquid Glass デザインのログインページ |
| **localStorage 永続化** | 都市・指標・期間・単位の選択状態をブラウザに保存。再訪問時に復元 |
| **スケルトンローディング** | スピナーではなく最終レイアウトを予告するスケルトン UI |
| **エラーハンドリング** | API 失敗時にリトライボタン付きのエラー画面を表示 |

---

## アーキテクチャ

### レイヤー構成と責任分離

```
src/
├── types/index.ts            【型定義層】
│   データの「形」を定義する辞書。
│   都市・指標・天気コードの定数もここに集約。
│   UI の見た目や取得方法は一切知らない。
│
├── lib/api.ts                【通信層】
│   Open-Meteo API との唯一の接点。
│   エンドポイント URL、パラメータ構築、5分間のインメモリキャッシュを担当。
│   React を一切 import しない純粋な関数。
│
├── hooks/
│   ├── useWeatherData.ts     【データ管理層】
│   │   取得 → 整形 → 状態化のパイプライン。
│   │   AbortController でステールレスポンスを防止。
│   │
│   └── useLocalStorage.ts    【永続化層】
│       useState と同じインターフェースで localStorage を透過的に永続化。
│       SSR 環境（localStorage が存在しない）にも対応。
│
├── components/               【表示層】
│   各コンポーネントは props を受け取って描画するだけ。
│   データ取得や状態管理のロジックを持たない。
│
├── middleware.ts             【認証層】
│   全ルートをインターセプトし、未認証なら /login にリダイレクト。
│
└── app/
    ├── globals.css           【テーマ層】Liquid Glass のユーティリティクラス定義
    ├── layout.tsx            【シェル層】HTML メタ・フォント
    ├── page.tsx              【統合層】状態管理の中心。全コンポーネントの司令塔
    ├── login/page.tsx        【認証UI】パスワード入力画面
    └── api/auth/route.ts     【認証API】パスワード検証 + クッキー発行
```

### データフロー

```
[ユーザー操作] ──onChange──→ [page.tsx: 状態管理]
                                  │
                    ┌─────────────┼─────────────┐
                    ↓ props       ↓ props       ↓ props
              [useWeatherData]  [各セレクタ]  [SkyBackground]
                    │
                    ↓ fetch
              [lib/api.ts] ──→ Open-Meteo API
                    │
                    ↓ JSON → 整形 → キャッシュ
              [useWeatherData]
                    │
           ┌────────┴────────┐
           ↓ data            ↓ currentWeather
    [WeatherChart]     [CurrentWeather]
           │
           ↓ onPointHover
    [page.tsx] ──→ [SkyBackground] ← 空が変わる
```

---

## 各ファイルの詳細

### `src/types/index.ts` — 型定義と定数

| 定義 | 内容 | 設計意図 |
|------|------|----------|
| `CityId` / `City` / `CITIES` | 5都市のID・名前・緯度経度・タイムゾーン | マスターデータを一箇所に集約。都市追加時はここだけ修正 |
| `MetricId` / `MetricDefinition` / `METRICS` | 6指標のID・ラベル・単位・チャート色・アイコン | 指標の追加・色変更がここだけで完結する（OCP: 開放閉鎖原則） |
| `ViewMode` / `VIEW_MODE_CONFIG` | `"48h"` / `"7d"` と API の `forecast_days` のマッピング | UI の値と API パラメータの変換ロジックを型で表現 |
| `OpenMeteoHourlyResponse` | API レスポンスの型 | YAGNI 原則でアプリが使うフィールドのみ定義 |
| `ChartDataPoint` | チャート1点のデータ。`time`, `timestamp`, `hour`, `weather_code` + 動的指標値 | Recharts が期待する行指向フォーマット。`hour` と `weather_code` はホバー連動用 |
| `HoveredPointInfo` | チャートホバー時に SkyBackground に渡す `{ weatherCode, hour, precipitation? }` | コンポーネント間の契約を型で明示。降水量で雨速度を連動 |
| `WEATHER_CODE_MAP` | WMO天気コード → 日本語ラベル + アイコン名 | 20種類の天気コードを網羅 |
| `weatherCodeToSkyCondition()` | 天気コード → 7分類（clear/cloudy/overcast/rain/snow/thunder/fog） | 空背景の決定ロジックを型定義層に置くことで、コンポーネントから切り離す |

### `src/lib/api.ts` — API通信

| 関数/変数 | 責任 | 設計意図 |
|-----------|------|----------|
| `cache` (Map) | 同一パラメータでの重複リクエスト防止 | TTL 5分。SWR/React Query は依存追加の割にこの規模では過剰と判断 |
| `buildCacheKey()` | パラメータからキャッシュキーを生成 | metrics をソートして順序違いで別キーになるのを防止 |
| `buildRequestUrl()` | Open-Meteo API の URL を組み立て | `hourly` パラメータにユーザー選択指標 + `weather_code` + `precipitation` を常に含める（ホバー連動・雨速度連動用） |
| `fetchWeatherData()` | 公開 API。キャッシュ → fetch → キャッシュ保存 | 指標未選択時は API コールせず空データを返す（無駄なリクエスト排除） |

**単位変換を API 側に委譲している理由:**
Open-Meteo は `temperature_unit=fahrenheit`, `wind_speed_unit=mph` パラメータをサポートしています。クライアント側で `°C × 9/5 + 32` を計算すると浮動小数点の誤差が生じるため、API が返す値をそのまま表示する設計にしています。

### `src/hooks/useWeatherData.ts` — データ取得フック

| 処理 | 内容 | 設計意図 |
|------|------|----------|
| `metricsKey` | `JSON.stringify([...metrics].sort())` で配列の参照安定化 | 配列の中身が同じなら `useEffect` を再実行しない |
| `AbortController` | パラメータ変更時に前のリクエストをキャンセル | ステール（古い）レスポンスが state に反映されるのを防止 |
| `isCancelled` フラグ | キャンセル後の state 更新を防止 | メモリリーク防止 |
| `transformToChartData()` | API レスポンスを Recharts の行指向形式に変換 | 各ポイントに `hour`・`weather_code`・`precipitation` を付与し、ホバー連動・雨速度連動を可能にする |

### `src/hooks/useLocalStorage.ts` — localStorage 永続化フック

```ts
const [cityId, setCityId] = useLocalStorage<CityId>("wd-city", "tokyo");
// useState と全く同じインターフェース。裏で localStorage に自動保存。
```

| 考慮点 | 対応 |
|--------|------|
| SSR 環境 | `useEffect` 内でのみ `localStorage.getItem` を呼び、サーバー側では `initialValue` を返す |
| プライベートブラウジング | `try-catch` で localStorage 無効時もエラーなく動作を継続 |
| 外部ライブラリ不使用 | 20行程度で実装でき、仕様を完全に把握できるため自作 |

### `src/components/` — UIコンポーネント

全コンポーネントが **Controlled Component パターン**（`value` + `onChange`）で統一されています。
状態は親（`page.tsx`）が管理し、コンポーネントは描画と変更通知のみ担当します。

| コンポーネント | ファイル | 責任 | 注目ポイント |
|---------------|---------|------|-------------|
| `Header` | `Header.tsx` | アプリのブランディング表示 | 状態を持たない純粋な Presentational Component |
| `CitySelector` | `CitySelector.tsx` | 都市選択 | ネイティブ `<select>` を使用。カスタムドロップダウンはキーボード操作の再実装が必要なため避けた |
| `MetricSelector` | `MetricSelector.tsx` | 指標の複数選択 | 色付きドットがチャートの線色と一致し視覚的一貫性を確保。最低1つの選択を維持するバリデーション |
| `PeriodSelector` | `PeriodSelector.tsx` | 48h/7d 切替 | セグメントコントロール + スライドアニメーション。内部的には `role="radiogroup"` |
| `UnitToggle` | `UnitToggle.tsx` | °C↔°F, km/h↔mph | `role="switch"` で実装しアクセシビリティを確保 |
| `WeatherChart` | `WeatherChart.tsx` | 折れ線グラフ描画 | カスタム Tooltip 内の `useEffect` でホバー中のデータポイントの `weather_code` + `hour` + `precipitation` を親に通知。ツールチップに天気・昼夜情報も表示 |
| `CurrentWeather` | `CurrentWeather.tsx` | 現在天気カード | WMO天気コード → アイコン + 日本語ラベルに変換 |
| `SkyBackground` | `SkyBackground.tsx` | 動的空背景 | 天気7種 x 昼夜2 = 14パターンのグラデーション。ホバー中は300ms、非ホバー時は2000msのトランジション。降水量に応じた雨速度の3段階制御 |
| `SkyIndicator` | `SkyIndicator.tsx` | 天気状態バッジ | 天気アイコン + ラベル + 昼/夜 + ホバー中の時刻を表示。晴れの夜は月アイコンに自動切替 |
| `LoadingSkeleton` | `LoadingSkeleton.tsx` | スケルトンUI | スピナーではなく最終レイアウトの形を予告し、知覚的な待ち時間を短縮 |
| `ErrorDisplay` | `ErrorDisplay.tsx` | エラー表示 | リトライボタンで再取得を促す |

### `src/app/page.tsx` — メインページ（司令塔）

このファイルが全体の統合ポイントです。

```
page.tsx が管理する4つの状態:
├── cityId      → CitySelector, useWeatherData, CurrentWeather
├── metrics     → MetricSelector, useWeatherData, WeatherChart
├── viewMode    → PeriodSelector, useWeatherData
└── unitSystem  → UnitToggle, useWeatherData, WeatherChart, CurrentWeather

追加の状態:
└── hoveredPoint → WeatherChart(onPointHover) → SkyBackground, SkyIndicator
```

全てのイベントハンドラを `useCallback` でメモ化し、子コンポーネントの不要な再レンダリングを防止しています。

### `src/app/globals.css` — Liquid Glass テーマ

| クラス/定義 | 内容 |
|------------|------|
| `.glass-card` | `backdrop-filter: blur(14px)` + 半透明背景 + 微細なボーダー + 上辺ハイライト。macOS Liquid Glass を再現 |
| `.sky-stars` | radial-gradient で星を散布し、`twinkle` アニメーションで明滅 |
| `.sky-rain-layer-{1,2}` | 2層の雨アニメーション。手前は太く速く、奥は細く遅い。`animation-duration` は SkyBackground からインラインで降水量に応じて動的に制御 |
| `.sky-snow-layer-{1,2}` | 大粒（ゆっくり大きく揺れ）+ 小粒（速く細かく揺れ）の2層構成 |
| `select option` | `<option>` はOS ネイティブ描画のため、ダーク背景を明示的に指定 |

---

## デザインコンセプト：Liquid Glass

macOS/iOS の Liquid Glass UI に着想を得た、ガラスモーフィズムベースのデザインです。

- **背景:** 天気連動の動的グラデーション（14パターン + エフェクト）
- **カード:** `backdrop-filter: blur()` + 半透明背景 + 微細なボーダーで「すりガラス」の質感
- **インタラクション:** hover 時のボーダー強化、スムーズなトランジション
- **天気エフェクト:** CSS-only のアニメーション（Canvas 不使用 → バンドルサイズ増加なし）

### 空背景のパターン一覧

| 天気 | 昼間 | 夜間 | エフェクト |
|------|------|------|-----------|
| 快晴 | 青空グラデーション | 紺〜深紫 | 夜間のみ星の明滅 |
| 一部曇り | やや霞んだ青 | 暗めの紺灰 | 夜間のみ星（弱） |
| 曇り | グレー系 | 暗いグレー | なし |
| 雨 | 暗い青灰 | 漆黒に近い | 2層の雨（降水量で速度変化） |
| 雪 | 明るいグレー | 紺灰 | 2層の降雪 |
| 雷雨 | 暗紫 | 漆黒 | 2層の強雨（降水量で速度変化） |
| 霧 | 霞んだグレー | 暗グレー | 霧オーバーレイ |

---

## セットアップ

```bash
# クローン
git clone https://github.com/harukikbb8-max/weather-dashboard.git
cd weather-dashboard

# 依存インストール
npm install

# 開発サーバー起動
npm run dev

# ビルド
npm run build
```

API キーは不要です（Open-Meteo は非商用無償利用可能）。

---

## 設計判断ログ

| 判断 | 理由 |
|------|------|
| Next.js App Router 採用 | `layout.tsx` でメタ情報を分離でき、ページとレイアウトの責任が明確 |
| Recharts 選定 | React Composable パターンで宣言的記述が可能。D3.js の命令的コードを避けられる |
| カスタムフックで副作用を分離 | コンポーネントから `useEffect` + `fetch` を排除。テスタビリティ向上 |
| ネイティブ `<select>` を使用 | カスタムドロップダウンはキーボード操作・スクリーンリーダー対応の再実装が必要。ネイティブ要素の a11y を活用 |
| 単位変換を API 側に委譲 | クライアント側の浮動小数点変換誤差を排除 |
| インメモリキャッシュ（Map） | SWR/React Query は依存追加の割にこの規模では過剰。自前 Map で仕様を完全把握可能 |
| AbortController でリクエスト管理 | パラメータ変更時にステールレスポンスが state に反映されるのを防止 |
| スケルトン UI（スピナーではなく） | 最終レイアウトを予告でき知覚的待ち時間を短縮する UX パターン |
| 天気エフェクトを CSS-only で実装 | Canvas/JS アニメーション不使用。GPU 合成レイヤーで 60fps を維持しつつバンドルサイズ増加なし |
| hourly エンドポイントで統一 | daily は指標名が異なる（`temperature_2m_max` 等）ため、指標定義の二重管理を回避 |
| Tooltip 経由でホバー情報を通知 | Recharts v3 の `onMouseMove` は payload 構造がバージョンで異なる。Tooltip の `payload` は描画と同じデータを保証するため最も信頼性が高い |
| 降水量で雨アニメーション速度を制御 | 降水量を3段階（0〜2mm / 2〜5mm / 5mm超）で判定し `animation-duration` をインラインで動的に設定。チャートホバー時はその時点の降水量で連動。降水量0mmなら天気コードに関わらず雨エフェクトを非表示にし、実データに忠実な演出 |
| Next.js Middleware で認証 | Edge Runtime で全ルートをインターセプト。httpOnly クッキーで認証状態を管理し、XSS によるトークン窃取を防止 |
