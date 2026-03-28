import { prisma } from "@/lib/prisma"

export class ContactMeetingRepository {
  static async findByContactId(contactId: string) {
    return prisma.contactMeeting.findMany({
      where: { contactId },
      orderBy: { date: "desc" },
      take: 20,
    })
  }

  static async create(data: { contactId: string; date: Date; summary: string }) {
    return prisma.contactMeeting.create({ data })
  }
}
