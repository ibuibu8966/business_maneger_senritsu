import { NextRequest, NextResponse } from "next/server"
import { requireRole } from "@/lib/auth-guard"
import { getSupabaseAdmin, STORAGE_BUCKET } from "@/lib/supabase"
import { logger } from "@/lib/logger"

const MAX_FILE_SIZE = 10 * 1024 * 1024 // 10MB
const ALLOWED_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/gif",
  "image/webp",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", // xlsx
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document", // docx
  "text/csv",
]

export async function POST(req: NextRequest) {
  try {
    const { error } = await requireRole("master_admin", "admin")
    if (error) return error

    const formData = await req.formData()
    const file = formData.get("file") as File | null
    if (!file) {
      return NextResponse.json({ error: "ファイルが選択されていません" }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: "ファイルサイズは10MB以下にしてください" }, { status: 400 })
    }

    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json({ error: "対応していないファイル形式です" }, { status: 400 })
    }

    // ユニークなファイル名を生成（衝突防止）
    const ext = file.name.split(".").pop() ?? "bin"
    const safeName = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`
    const storagePath = `business/${safeName}`

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const { error: uploadError } = await getSupabaseAdmin().storage
      .from(STORAGE_BUCKET)
      .upload(storagePath, buffer, {
        contentType: file.type,
        upsert: false,
      })

    if (uploadError) {
      logger.error("Supabase Storage upload error:", uploadError)
      return NextResponse.json({ error: "ファイルのアップロードに失敗しました" }, { status: 500 })
    }

    // 公開URLを取得
    const { data: urlData } = getSupabaseAdmin().storage
      .from(STORAGE_BUCKET)
      .getPublicUrl(storagePath)

    return NextResponse.json({
      url: urlData.publicUrl,
      name: file.name,
      storagePath,
    })
  } catch (e) {
    logger.error("Upload error:", e)
    return NextResponse.json({ error: "アップロードに失敗しました" }, { status: 500 })
  }
}
