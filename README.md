# Runbike Reaction Test SPA

React + TypeScript + Vite で作ったランバイク用反応テストSPAです。

## 起動

```bash
npm install
npm run dev
```

表示されたURLをブラウザで開いてください。

スマートフォンなど同一LAN上の端末からアクセスする場合:

```bash
npm run dev -- --host 0.0.0.0
```

## 仕様

- 1秒間隔で1/2/3音目
- 4音目の0〜200ms前にGO画面へランダム遷移
- GO前のタップはフライング
- GO後〜4音目前のタップは反応時間を測定
- 4音目後のタップも別扱いで記録
- フライング時は予約中のGO/4音目をキャンセル
- 各試行終了後は「次へ」を押すまで停止
- 10試行で平均・中央値・最速・最遅・フライング回数を表示

## ビルド

```bash
npm run build
npm run preview
```
