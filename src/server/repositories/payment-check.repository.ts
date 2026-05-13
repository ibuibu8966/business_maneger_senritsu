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

  static async importCsv(params: {
    year: number
    month: number
    rows: { memberId: string; courseName: string }[]
    dryRun: boolean
    confirmedBy: string
  }) {
    const { year, month, rows, dryRun, confirmedBy } = params

    const uniqueRows = Array.from(
      new Map(rows.map((r) => [`${r.memberId}__${r.courseName}`, r])).values()
    )

    const matched: { subscriptionId: string; memberId: string; contactName: string; courseName: string }[] = []
    const unmatched: { memberId: string; courseName: string; reason: string }[] = []
    const duplicates: { subscriptionId: string; memberId: string; contactName: string; courseName: string }[] = []

    for (const row of uniqueRows) {
      const sub = await prisma.subscription.findFirst({
        where: {
          paymentServiceId: row.memberId,
          course: { name: row.courseName },
          status: "ACTIVE",
        },
        include: { contact: { select: { name: true } }, course: { select: { name: true } } },
      })

      if (!sub) {
        unmatched.push({
          memberId: row.memberId,
          courseName: row.courseName,
          reason: "subscription_not_found",
        })
        continue
      }

      const existing = await prisma.paymentCheck.findUnique({
        where: {
          subscriptionId_year_month: { subscriptionId: sub.id, year, month },
        },
        select: { isConfirmed: true },
      })

      if (existing?.isConfirmed) {
        duplicates.push({
          subscriptionId: sub.id,
          memberId: row.memberId,
          contactName: sub.contact.name,
          courseName: sub.course.name,
        })
        continue
      }

      if (!dryRun) {
        await prisma.paymentCheck.upsert({
          where: {
            subscriptionId_year_month: { subscriptionId: sub.id, year, month },
          },
          create: {
            subscriptionId: sub.id,
            year,
            month,
            isConfirmed: true,
            confirmedBy,
            confirmedAt: new Date(),
          },
          update: {
            isConfirmed: true,
            confirmedBy,
            confirmedAt: new Date(),
          },
        })
      }

      matched.push({
        subscriptionId: sub.id,
        memberId: row.memberId,
        contactName: sub.contact.name,
        courseName: sub.course.name,
      })
    }

    return {
      matched,
      unmatched,
      duplicates,
      upserted: dryRun ? 0 : matched.length,
    }
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
