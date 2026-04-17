/**
 * 共通 Prisma select 定数
 * リレーションで「idとname」程度だけ欲しい箇所で使い回す。重複記述を防ぐ
 */

export const idNameSelect = { id: true, name: true } as const

export const userMinimalSelect = { id: true, name: true, email: true } as const
