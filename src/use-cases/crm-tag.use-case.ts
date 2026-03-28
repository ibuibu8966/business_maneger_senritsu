import { prisma } from "@/lib/prisma"
import type { CrmTagDTO } from "@/types/dto"

function toDTO(r: { id: string; name: string; color: string }): CrmTagDTO {
  return { id: r.id, name: r.name, color: r.color }
}

export class CrmTagUseCase {
  /** 一覧取得 */
  static async list(): Promise<CrmTagDTO[]> {
    const rows = await prisma.crmTag.findMany({ orderBy: { name: "asc" } })
    return rows.map(toDTO)
  }

  /** 作成 */
  static async create(data: { name: string; color?: string }): Promise<CrmTagDTO> {
    const r = await prisma.crmTag.create({
      data: { name: data.name, color: data.color ?? "" },
    })
    return toDTO(r)
  }

  /** 更新（名前変更時は全レコードも更新） */
  static async update(id: string, data: { name?: string; color?: string }): Promise<CrmTagDTO> {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.crmTag.findUniqueOrThrow({ where: { id } })

      const r = await tx.crmTag.update({
        where: { id },
        data: {
          ...(data.name !== undefined && { name: data.name }),
          ...(data.color !== undefined && { color: data.color }),
        },
      })

      // タグ名が変更された場合、全レコードの tags 配列を更新
      if (data.name && data.name !== current.name) {
        await replaceTagName(tx, current.name, data.name)
      }

      return toDTO(r)
    })
  }

  /** 削除（全レコードからも除去） */
  static async delete(id: string): Promise<void> {
    await prisma.$transaction(async (tx) => {
      const tag = await tx.crmTag.findUniqueOrThrow({ where: { id } })
      await removeTagName(tx, tag.name)
      await tx.crmTag.delete({ where: { id } })
    })
  }
}

// --- ヘルパー ---

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/** 旧タグ名 → 新タグ名に一括置換 */
async function replaceTagName(tx: Tx, oldName: string, newName: string) {
  const contacts = await tx.contact.findMany({ where: { tags: { has: oldName } } })
  for (const c of contacts) {
    await tx.contact.update({
      where: { id: c.id },
      data: { tags: c.tags.map((t) => (t === oldName ? newName : t)) },
    })
  }
  const partners = await tx.partner.findMany({ where: { tags: { has: oldName } } })
  for (const p of partners) {
    await tx.partner.update({
      where: { id: p.id },
      data: { tags: p.tags.map((t) => (t === oldName ? newName : t)) },
    })
  }
}

/** タグ名を全レコードから除去 */
async function removeTagName(tx: Tx, name: string) {
  const contacts = await tx.contact.findMany({ where: { tags: { has: name } } })
  for (const c of contacts) {
    await tx.contact.update({
      where: { id: c.id },
      data: { tags: c.tags.filter((t) => t !== name) },
    })
  }
  const partners = await tx.partner.findMany({ where: { tags: { has: name } } })
  for (const p of partners) {
    await tx.partner.update({
      where: { id: p.id },
      data: { tags: p.tags.filter((t) => t !== name) },
    })
  }
}
