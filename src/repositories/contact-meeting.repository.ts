import { prisma } from "@/lib/prisma"

export class ContactMeetingRepository {
  static async findByContactId(contactId: string) {
    return prisma.contactMeeting.findMany({
      where: { contactId },
      orderBy: { date: "desc" },
      take: 20,
    })
  }

  static async findByDateRange(from: Date, to: Date) {
    return prisma.contactMeeting.findMany({
      where: { date: { gte: from, lt: to } },
      include: { contact: { select: { id: true, name: true, type: true, isFinalMeeting: true } } },
      orderBy: { date: "asc" },
    })
  }

  static async create(data: { contactId: string; date: Date; summary: string }) {
    return prisma.contactMeeting.create({ data })
  }
}
