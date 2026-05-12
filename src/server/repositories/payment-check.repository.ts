import { prisma } from "@/lib/prisma"

export class PaymentCheckRepository {
  static async findMany(params: { year: number; month: number; isConfirmed?: boolean }) {
    return prisma.paymentCheck.findMany({
      where: {
        year: params.year,
        month: params.month,
        subscription: { status: "ACTIVE" },
        ...(params.isConfirmed !== undefined && { isConfirmed: params.isConfirmed }),
      },
      include: {
        subscription: {
          include: {
            contact: { select: { id: true, name: true, discordId: true } },
            course: { include: { salon: { select: { id: true, name: true } } } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  static async upsert(data: { subscriptionId: string; year: number; month: number; isConfirmed: boolean; confirmedBy: string; discordRoleAssigned?: boolean; hasNote?: boolean }) {
    // If discordRoleAssigned is provided, update the subscription
    if (data.discordRoleAssigned !== undefined) {
      await prisma.subscription.update({
        where: { id: data.subscriptionId },
        data: { discordRoleAssigned: data.discordRoleAssigned },
      })
    }
    return prisma.paymentCheck.upsert({
      where: { subscriptionId_year_month: { subscriptionId: data.subscriptionId, year: data.year, month: data.month } },
      create: { subscriptionId: data.subscriptionId, year: data.year, month: data.month, isConfirmed: data.isConfirmed, confirmedBy: data.confirmedBy, confirmedAt: data.isConfirmed ? new Date() : null, ...(data.hasNote !== undefined && { hasNote: data.hasNote }) },
      update: { isConfirmed: data.isConfirmed, confirmedBy: data.confirmedBy, confirmedAt: data.isConfirmed ? new Date() : null, ...(data.hasNote !== undefined && { hasNote: data.hasNote }) },
      include: {
        subscription: {
          include: {
            contact: { select: { id: true, name: true, discordId: true } },
            course: { include: { salon: { select: { id: true, name: true } } } },
          },
        },
      },
    })
  }

  static async generateForMonth(year: number, month: number) {
    const activeSubscriptions = await prisma.subscription.findMany({ where: { status: "ACTIVE" } })
    const existing = await prisma.paymentCheck.findMany({ where: { year, month }, select: { subscriptionId: true } })
    const existingIds = new Set(existing.map(e => e.subscriptionId))
    const toCreate = activeSubscriptions.filter(s => !existingIds.has(s.id))
    if (toCreate.length > 0) {
      await prisma.paymentCheck.createMany({
        data: toCreate.map(s => ({
          subscriptionId: s.id, year, month,
          ...(s.isExempt && { isConfirmed: true, confirmedBy: "免除", confirmedAt: new Date() }),
        })),
      })
    }
    return toCreate.length
  }
}
