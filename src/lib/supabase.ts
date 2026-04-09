import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let _client: SupabaseClient | null = null

// サーバーサイド専用（Service Role Key使用）— 遅延初期化
export function getSupabaseAdmin(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!url || !key) {
      throw new Error("NEXT_PUBLIC_SUPABASE_URL と SUPABASE_SERVICE_ROLE_KEY を.envに設定してください")
    }
    _client = createClient(url, key)
  }
  return _client
}

export const STORAGE_BUCKET = "attachments"
