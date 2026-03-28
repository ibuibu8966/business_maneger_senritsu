import { prisma } from "@/lib/prisma"
import type { AccountTagDTO } from "@/types/dto"

function toDTO(r: { id: string; name: string; color: string }): AccountTagDTO {
  return { id: r.id, name: r.name, color: r.color }
}

export class AccountTagUseCase {
  /** 一覧取得 */
  static async list(): Promise<AccountTagDTO[]> {
    const rows = await prisma.accountTag.findMany({ orderBy: { name: "asc" } })
    return rows.map(toDTO)
  }

  /** 作成 */
  static async create(data: { name: string; color?: string }): Promise<AccountTagDTO> {
    const r = await prisma.accountTag.create({
      data: { name: data.name, color: data.color ?? "" },
    })
    return toDTO(r)
  }

  /** 更新（名前変更時は全レコードも更新） */
  static async update(id: string, data: { name?: string; color?: string }): Promise<AccountTagDTO> {
    return await prisma.$transaction(async (tx) => {
      const current = await tx.accountTag.findUniqueOrThrow({ where: { id } })

      const r = await tx.accountTag.update({
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
      const tag = await tx.accountTag.findUniqueOrThrow({ where: { id } })
      await removeTagName(tx, tag.name)
      await tx.accountTag.delete({ where: { id } })
    })
  }
}

// --- ヘルパー ---

type Tx = Parameters<Parameters<typeof prisma.$transaction>[0]>[0]

/** 旧タグ名 → 新タグ名に一括置換 */
async function replaceTagName(tx: Tx, oldName: string, newName: string) {
  // Account
  const accounts = await tx.account.findMany({ where: { tags: { has: oldName } } })
  for (const a of accounts) {
    await tx.account.update({
      where: { id: a.id },
      data: { tags: a.tags.map((t) => (t === oldName ? newName : t)) },
    })
  }
  // AccountTransaction
  const txns = await tx.accountTransaction.findMany({ where: { tags: { has: oldName } } })
  for (const t of txns) {
    await tx.accountTransaction.update({
      where: { id: t.id },
      data: { tags: t.tags.map((tag) => (tag === oldName ? newName : tag)) },
    })
  }
}

/** タグ名を全レコードから除去 */
async function removeTagName(tx: Tx, name: string) {
  const accounts = await tx.account.findMany({ where: { tags: { has: name } } })
  for (const a of accounts) {
    await tx.account.update({
      where: { id: a.id },
      data: { tags: a.tags.filter((t) => t !== name) },
    })
  }
  const txns = await tx.accountTransaction.findMany({ where: { tags: { has: name } } })
  for (const t of txns) {
    await tx.accountTransaction.update({
      where: { id: t.id },
      data: { tags: t.tags.filter((tag) => tag !== name) },
    })
  }
}
