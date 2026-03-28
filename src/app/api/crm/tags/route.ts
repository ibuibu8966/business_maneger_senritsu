import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { CrmTagUseCase } from "@/use-cases/crm-tag.use-case"

export async function GET() {
  try {
    const data = await CrmTagUseCase.list()
    return NextResponse.json(data)
  } catch {
    return NextResponse.json({ error: "CRMタグの取得に失敗しました" }, { status: 500 })
  }
}

const createSchema = z.object({ name: z.string().min(1), color: z.string().optional() })

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const data = createSchema.parse(body)
    const r = await CrmTagUseCase.create(data)
    return NextResponse.json(r, { status: 201 })
  } catch (e) {
    if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
    return NextResponse.json({ error: "CRMタグの作成に失敗しました" }, { status: 500 })
  }
}
