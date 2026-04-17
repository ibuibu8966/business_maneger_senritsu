/**
 * API共通エラーハンドラ
 * Prismaの既知エラー（P2025, P2002 等）とZodを統一的に処理
 * メッセージは日本語で統一
 */
import { NextResponse } from "next/server"
import { Prisma } from "@/generated/prisma/client"
import { z } from "zod"
import { logger } from "@/lib/logger"

type Options = {
  /** 例: 「連絡先」「事業」「プロジェクト」などリソース名 */
  resource: string
  /** 例: "取得" / "登録" / "更新" / "削除" */
  action: "取得" | "登録" | "作成" | "更新" | "削除" | "実行"
}

export function handleApiError(e: unknown, opts: Options): NextResponse {
  // Zod バリデーションエラー
  if (e instanceof z.ZodError) {
    return NextResponse.json({ errors: e.issues }, { status: 400 })
  }

  // Prisma 既知エラー
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    switch (e.code) {
      case "P2025":
        // レコードが見つからない
        return NextResponse.json(
          { error: `${opts.resource}が見つかりません` },
          { status: 404 },
        )
      case "P2002": {
        // ユニーク制約違反
        const target = Array.isArray(e.meta?.target) ? e.meta?.target.join(", ") : (e.meta?.target ?? "")
        return NextResponse.json(
          { error: `${opts.resource}の重複エラー（${target}）` },
          { status: 409 },
        )
      }
      case "P2003":
        // 外部キー制約違反
        return NextResponse.json(
          { error: `${opts.resource}の参照整合性エラー：関連データがあるため${opts.action}できません` },
          { status: 409 },
        )
    }
  }

  // その他は 500
  logger.error(`${opts.resource}の${opts.action}に失敗しました`, e)
  return NextResponse.json(
    { error: `${opts.resource}の${opts.action}に失敗しました` },
    { status: 500 },
  )
}
