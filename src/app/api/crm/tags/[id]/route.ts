import { NextRequest, NextResponse } from "next/server"
import { CrmTagUseCase } from "@/server/use-cases/crm-tag.use-case"
import { requireRole } from "@/lib/auth-guard"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { error } = await requireRole("master_admin", "admin")
    if (error) return error
    const { id } = await params
    await CrmTagUseCase.delete(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "CRMタグの削除に失敗しました" }, { status: 500 })
  }
}
