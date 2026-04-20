# business-manager 開発ルール

## ダークモード（必須）

新機能・UI変更時は必ずダークモード表示を確認すること。

### クラス指定ルール
`bg-{color}-{50|100|200}` や `text-{color}-{600-900}` 等の静的Tailwindカラーを使う時は、必ず `dark:` プレフィックス付きのクラスを同時に指定する。

例：
```tsx
// NG
className="bg-blue-100 text-blue-800 border-blue-300"

// OK
className="bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-200 border-blue-300 dark:border-blue-700"
```

### ダーク対応の定型パターン
- `bg-{color}-50` → `dark:bg-{color}-950/40`
- `bg-{color}-100` → `dark:bg-{color}-900/40`
- `text-{color}-600` → `dark:text-{color}-400`
- `text-{color}-700` → `dark:text-{color}-300`
- `text-{color}-800` → `dark:text-{color}-200`
- `text-{color}-900` → `dark:text-{color}-100`
- `border-{color}-200` → `dark:border-{color}-800`
- `border-{color}-300` → `dark:border-{color}-700`

`bg-background` / `text-foreground` / `bg-muted` など CSS 変数ベースのクラスは自動でダーク対応される。可能なら CSS 変数ベースを優先。

### 動作確認
実装後は必ずライト・ダーク両方で画面を目視確認してから完了扱いにする。トグルは画面右上テーマスイッチ。

---

## トースト通知

ユーザーが明示的に押す「保存」「削除」等のボタンには、成功・失敗のトースト通知を必ず実装する。

```tsx
import { toast } from "sonner"

mutation.mutate(data, {
  onSuccess: () => toast.success("保存しました"),
  onError: () => toast.error("保存に失敗しました"),
})
```

押しても反応のないUIは絶対に作らない。
