"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function IrregularCompleteDialog({
  open,
  onOpenChange,
  taskTitle,
  onConfirm,
  title = "不定期タスクの完了",
  description,
  hideFinishedOption = false,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  taskTitle: string
  onConfirm: (payload: { nextDate: string | null; finished: boolean }) => void
  title?: string
  description?: string
  hideFinishedOption?: boolean
}) {
  const [nextDate, setNextDate] = useState("")
  const [finished, setFinished] = useState(false)

  const handleConfirm = () => {
    if (finished) {
      onConfirm({ nextDate: null, finished: true })
    } else if (nextDate) {
      onConfirm({ nextDate, finished: false })
    }
    setNextDate("")
    setFinished(false)
  }

  const handleCancel = () => {
    setNextDate("")
    setFinished(false)
    onOpenChange(false)
  }

  const canConfirm = finished || !!nextDate

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) handleCancel() }}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <p className="text-sm text-muted-foreground">
            {description ?? `「${taskTitle}」を完了します。次回の生成日を選んでください。`}
          </p>
          <div>
            <Label className="text-xs">次の生成日</Label>
            <Input
              type="date"
              value={nextDate}
              onChange={(e) => { setNextDate(e.target.value); setFinished(false) }}
              className="h-8 text-sm"
              disabled={finished}
            />
          </div>
          {!hideFinishedOption && (
            <div className="flex items-center gap-2">
              <input
                id="irregular-finished"
                type="checkbox"
                checked={finished}
                onChange={(e) => { setFinished(e.target.checked); if (e.target.checked) setNextDate("") }}
                className="h-4 w-4"
              />
              <Label htmlFor="irregular-finished" className="text-sm cursor-pointer">
                次は生成しない（このタスクを完了する）
              </Label>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={handleCancel}>キャンセル</Button>
          <Button onClick={handleConfirm} disabled={!canConfirm}>確定</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
