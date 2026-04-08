"use client"

import * as React from "react"
import { useSession } from "next-auth/react"
import { useTheme } from "next-themes"

/**
 * ログイン後、DBに保存されたthemePreferenceを取得してnext-themesに反映する。
 * ログインユーザごとにテーマ設定を永続化するための同期コンポーネント。
 */
export function ThemeSync() {
  const { status } = useSession()
  const { setTheme } = useTheme()
  const hasSyncedRef = React.useRef(false)

  React.useEffect(() => {
    if (status !== "authenticated" || hasSyncedRef.current) return
    hasSyncedRef.current = true

    fetch("/api/user/theme")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.theme) setTheme(data.theme)
      })
      .catch(() => {
        // ネットワークエラー時は何もしない（next-themesのlocalStorage値を使う）
      })
  }, [status, setTheme])

  // ログアウト時にフラグをリセットして再ログイン時に再同期できるようにする
  React.useEffect(() => {
    if (status === "unauthenticated") {
      hasSyncedRef.current = false
    }
  }, [status])

  return null
}
