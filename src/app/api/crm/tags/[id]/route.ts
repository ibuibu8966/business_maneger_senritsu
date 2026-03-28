import { NextRequest, NextResponse } from "next/server"
import { CrmTagUseCase } from "@/use-cases/crm-tag.use-case"

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    await CrmTagUseCase.delete(id)
    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: "CRMタグの削除に失敗しました" }, { status: 500 })
  }
}
