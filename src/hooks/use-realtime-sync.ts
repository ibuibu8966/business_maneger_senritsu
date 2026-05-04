"use client"

import { useEffect } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { getSupabaseBrowser } from "@/lib/supabase-client"

/**
 * 指定テーブルの変更を Supabase Realtime で監視し、
 * 変更があったら指定の React Query キーを invalidate する。
 *
 * 使い方:
 *   useRealtimeSync({
 *     channel: "business-tasks",
 *     tables: ["BusinessTask", "TaskAssignee", "TaskUserSortOrder"],
 *     queryKeys: [["business-tasks"], ["projects"]],
 *   })
 */
export function useRealtimeSync({
  channel,
  tables,
  queryKeys,
  enabled = true,
}: {
  channel: string
  tables: string[]
  queryKeys: (string | readonly string[])[]
  enabled?: boolean
}) {
  const queryClient = useQueryClient()

  useEffect(() => {
    if (!enabled) return
    if (typeof window === "undefined") return
    // ANON_KEY 未設定なら何もしない（ローカル開発時の対応）
    if (!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
      console.warn("[useRealtimeSync] NEXT_PUBLIC_SUPABASE_ANON_KEY 未設定のため Realtime 同期は無効です")
      return
    }

    const supabase = getSupabaseBrowser()
    const ch = supabase.channel(channel)

    tables.forEach((table) => {
      ch.on(
        "postgres_changes" as never,
        { event: "*", schema: "public", table },
        () => {
          queryKeys.forEach((key) => {
            queryClient.invalidateQueries({ queryKey: Array.isArray(key) ? key : [key] })
          })
        }
      )
    })

    ch.subscribe((status) => {
      if (status === "SUBSCRIBED") {
        console.log(`[Realtime] ${channel} subscribed:`, tables.join(", "))
      }
    })

    return () => {
      supabase.removeChannel(ch)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channel, tables.join(","), enabled])
}
