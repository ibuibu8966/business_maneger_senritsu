"use client"

import { useState, useRef } from "react"
import Papa from "papaparse"
import { useSession } from "next-auth/react"
import { toast } from "sonner"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Upload, FileText, AlertCircle, CheckCircle2, Loader2 } from "lucide-react"
import { useImportPaymentChecksCsv } from "@/hooks/use-crm"
import type { ImportCsvResult } from "@/lib/api"

const UPDATE_SUFFIX = " 更新決済"

type ParsedRow = { memberId: string; courseName: string; rawProduct: string }

export function CsvImportDialog({
  open,
  onOpenChange,
  year,
  month,
}: {
  open: boolean
  onOpenChange: (v: boolean) => void
  year: number
  month: number
}) {
  const { data: session } = useSession()
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [fileName, setFileName] = useState<string>("")
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([])
  const [skippedNonUpdate, setSkippedNonUpdate] = useState<number>(0)
  const [preview, setPreview] = useState<ImportCsvResult | null>(null)
  const [showUnmatchedDetail, setShowUnmatchedDetail] = useState(false)
  const [parseError, setParseError] = useState<string>("")

  const importMutation = useImportPaymentChecksCsv()

  const resetState = () => {
    setFileName("")
    setParsedRows([])
    setSkippedNonUpdate(0)
    setPreview(null)
    setShowUnmatchedDetail(false)
    setParseError("")
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const handleOpenChange = (v: boolean) => {
    if (!v) resetState()
    onOpenChange(v)
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    setParseError("")
    setPreview(null)

    Papa.parse<Record<string, string>>(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const rows: ParsedRow[] = []
        let skipped = 0
        for (const r of result.data) {
          const product = (r["商品"] ?? "").trim()
          const memberId = (r["会員ID"] ?? "").trim()
          const status = (r["支払い状況"] ?? "").trim()
          if (!product || !memberId) continue
          if (!product.endsWith(UPDATE_SUFFIX)) { skipped++; continue }
          if (status && status !== "支払い済み") { skipped++; continue }
          rows.push({
            memberId,
            courseName: product.slice(0, -UPDATE_SUFFIX.length).trim(),
            rawProduct: product,
          })
        }
        if (rows.length === 0) {
          setParseError("取込対象の行が見つかりません（『更新決済』『支払い済み』の行）")
          return
        }
        setParsedRows(rows)
        setSkippedNonUpdate(skipped)
        runPreview(rows)
      },
      error: (err) => {
        setParseError(`CSVパースに失敗: ${err.message}`)
      },
    })
  }

  const runPreview = (rows: ParsedRow[]) => {
    importMutation.mutate(
      {
        year,
        month,
        rows: rows.map((r) => ({ memberId: r.memberId, courseName: r.courseName })),
        dryRun: true,
        confirmedBy: session?.user?.name ?? "",
      },
      {
        onSuccess: (data) => setPreview(data),
        onError: () => toast.error("プレビュー取得に失敗しました"),
      }
    )
  }

  const handleExecute = () => {
    importMutation.mutate(
      {
        year,
        month,
        rows: parsedRows.map((r) => ({ memberId: r.memberId, courseName: r.courseName })),
        dryRun: false,
        confirmedBy: session?.user?.name ?? "",
      },
      {
        onSuccess: (data) => {
          toast.success(`${data.upserted}件の決済確認を取り込みました`)
          handleOpenChange(false)
        },
        onError: () => toast.error("取込実行に失敗しました"),
      }
    )
  }

  const isLoading = importMutation.isPending

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>CSV取込 — 対象: {year}年{month}月</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          {/* ファイル選択 */}
          <div className="flex items-center gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
              id="csv-file-input"
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading}
            >
              <Upload className="h-3.5 w-3.5 mr-1" />
              ファイルを選択
            </Button>
            {fileName && (
              <span className="text-sm text-muted-foreground flex items-center gap-1">
                <FileText className="h-3.5 w-3.5" />
                {fileName}
              </span>
            )}
          </div>

          {parseError && (
            <div className="text-sm text-red-600 dark:text-red-400 flex items-center gap-1">
              <AlertCircle className="h-4 w-4" />
              {parseError}
            </div>
          )}

          {/* プレビュー */}
          {isLoading && !preview && (
            <div className="text-sm text-muted-foreground flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              プレビュー解析中...
            </div>
          )}

          {preview && (
            <div className="space-y-3 border-t pt-4">
              <div className="text-sm font-medium">プレビュー（マッチング結果）</div>

              <div className="text-sm space-y-2">
                <div className="text-xs text-muted-foreground">
                  CSV対象行: {parsedRows.length}件
                  {skippedNonUpdate > 0 && ` （※「更新決済/支払い済み」以外で${skippedNonUpdate}件スキップ）`}
                </div>
                <div className="flex items-center gap-2 text-green-700 dark:text-green-300">
                  <CheckCircle2 className="h-4 w-4" />
                  マッチング成功: {preview.matched.length}件
                </div>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <CheckCircle2 className="h-4 w-4" />
                  既に確認済み: {preview.duplicates.length}件
                </div>
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-300">
                  <AlertCircle className="h-4 w-4" />
                  マッチング不可: {preview.unmatched.length}件
                  {preview.unmatched.length > 0 && (
                    <button
                      type="button"
                      onClick={() => setShowUnmatchedDetail((v) => !v)}
                      className="text-xs underline ml-1"
                    >
                      {showUnmatchedDetail ? "閉じる" : "詳細"}
                    </button>
                  )}
                </div>
              </div>

              {showUnmatchedDetail && preview.unmatched.length > 0 && (
                <div className="bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 rounded p-2 max-h-48 overflow-y-auto">
                  <table className="text-xs w-full">
                    <thead>
                      <tr className="text-left text-muted-foreground">
                        <th className="pr-2 pb-1">会員ID</th>
                        <th className="pr-2 pb-1">商品名（コース名）</th>
                        <th className="pb-1">理由</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.unmatched.map((u, i) => (
                        <tr key={i}>
                          <td className="pr-2 py-0.5 font-mono">{u.memberId}</td>
                          <td className="pr-2 py-0.5">{u.courseName}</td>
                          <td className="py-0.5 text-muted-foreground">
                            会員ID×コースのSubscription(ACTIVE)が見つからない
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* アクション */}
          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={isLoading}>
              キャンセル
            </Button>
            <Button
              onClick={handleExecute}
              disabled={!preview || preview.matched.length === 0 || isLoading}
            >
              {isLoading && <Loader2 className="h-3.5 w-3.5 mr-1 animate-spin" />}
              取込実行 {preview && preview.matched.length > 0 && `(${preview.matched.length}件)`}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
