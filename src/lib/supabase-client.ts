import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _browserClient: SupabaseClient | null = null

/**
 * クライアント側で使う Supabase（Realtime用）
 * ブラウザのみで動作。Service Role Key ではなく Anon Key を使う。
 */
export function getSupabaseBrowser(): SupabaseClient {
  if (typeof window === "undefined") {
    throw new Error("getSupabaseBrowser は browser 専用です")
  }
  if (!_browserClient) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    if (!url || !anonKey) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL と NEXT_PUBLIC_SUPABASE_ANON_KEY を.envに設定してください")
    }
    _browserClient = createClient(url, anonKey, {
      realtime: { params: { eventsPerSecond: 10 } },
    })
  }
  return _browserClient
}
