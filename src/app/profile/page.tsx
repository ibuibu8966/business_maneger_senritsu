"use client"

import { Suspense, useEffect, useState } from "react"
import { useSession } from "next-auth/react"
import { useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Loader2, Check, X } from "lucide-react"

type MeResponse = {
  id: string
  name: string
  email: string | null
  lineUserId: string | null
}

export default function ProfilePage() {
  return (
    <Suspense fallback={<div className="p-6"><Loader2 className="w-5 h-5 animate-spin" /></div>}>
      <ProfilePageInner />
    </Suspense>
  )
}

function ProfilePageInner() {
  const { data: session } = useSession()
  const search = useSearchParams()
  const [me, setMe] = useState<MeResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)
  const [messageType, setMessageType] = useState<"success" | "error" | null>(null)

  // クエリパラメータでフラッシュメッセージ
  useEffect(() => {
    if (search.get("line_connected") === "1") {
      setMessage("LINE連携が完了しました")
      setMessageType("success")
    } else {
      const err = search.get("line_error")
      if (err) {
        setMessage(`LINE連携に失敗しました: ${err}`)
        setMessageType("error")
      }
    }
  }, [search])

  const fetchMe = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/employees/me")
      if (res.ok) {
        const data: MeResponse = await res.json()
        setMe(data)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session?.user?.id) fetchMe()
  }, [session?.user?.id])

  const handleConnect = () => {
    window.location.href = "/api/auth/line-login/start"
  }

  const handleDisconnect = async () => {
    if (!confirm("LINE連携を解除しますか？")) return
    const res = await fetch("/api/auth/line-login/disconnect", { method: "POST" })
    if (res.ok) {
      setMessage("LINE連携を解除しました")
      setMessageType("success")
      fetchMe()
    } else {
      setMessage("解除に失敗しました")
      setMessageType("error")
    }
  }

  if (!session) {
    return <div className="p-6">ログインが必要です</div>
  }

  return (
    <div className="p-6 max-w-2xl">
      <h1 className="text-xl font-semibold mb-6">プロフィール</h1>

      {message && (
        <div
          className={`mb-4 p-3 rounded-md text-sm flex items-center gap-2 ${
            messageType === "success"
              ? "bg-green-50 text-green-700 border border-green-200"
              : "bg-red-50 text-red-700 border border-red-200"
          }`}
        >
          {messageType === "success" ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
          {message}
        </div>
      )}

      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin" />
      ) : me ? (
        <div className="space-y-6">
          <div>
            <div className="text-xs text-muted-foreground mb-1">名前</div>
            <div className="text-sm">{me.name}</div>
          </div>
          <div>
            <div className="text-xs text-muted-foreground mb-1">メールアドレス</div>
            <div className="text-sm">{me.email ?? "（未設定）"}</div>
          </div>

          <div className="border-t pt-6">
            <h2 className="text-base font-semibold mb-3">LINE通知連携</h2>
            <p className="text-xs text-muted-foreground mb-4">
              連携すると、朝8:30に今日のタスク一覧、実行時刻10分前と開始時刻にリマインドがLINEに届きます。
            </p>
            {me.lineUserId ? (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-md text-sm text-green-700">
                  <Check className="w-4 h-4" />
                  連携済み（ID末尾: ...{me.lineUserId.slice(-6)}）
                </div>
                <Button variant="outline" size="sm" onClick={handleDisconnect}>
                  連携解除
                </Button>
              </div>
            ) : (
              <Button onClick={handleConnect} className="bg-[#06C755] hover:bg-[#05a647] text-white">
                LINEで連携する
              </Button>
            )}
          </div>
        </div>
      ) : (
        <div className="text-sm text-muted-foreground">情報を取得できませんでした</div>
      )}
    </div>
  )
}
