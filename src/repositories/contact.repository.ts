import { prisma } from "@/lib/prisma"

export class ContactRepository {
  static async findMany(params: { type?: "SALON_MEMBER" | "PARTNER_CONTACT"; isArchived?: boolean }) {
    return prisma.contact.findMany({
      where: {
        ...(params.type && { type: params.type }),
        isArchived: params.isArchived ?? false,
      },
      include: {
        meetings: { orderBy: { date: "desc" }, take: 1, select: { date: true } },
      },
      orderBy: { createdAt: "desc" },
    })
  }

  static async findById(id: string) {
    return prisma.contact.findUnique({
      where: { id },
      include: {
        subscriptions: {
          include: {
            course: { include: { salon: true } },
            paymentChecks: { orderBy: [{ year: "desc" }, { month: "desc" }], take: 12 },
          },
        },
        tickets: {
          include: { assignee: { select: { id: true, name: true } } },
          orderBy: { createdAt: "desc" },
          take: 10,
        },
        partnerContacts: {
          include: { partner: true },
        },
        meetings: {
          orderBy: { date: "desc" },
          take: 20,
        },
      },
    })
  }

  static async create(data: {
    name: string; type: "SALON_MEMBER" | "PARTNER_CONTACT"
    occupation?: string; age?: number | null; interests?: string; mindset?: string
    lineId?: string; discordId?: string; email?: string; phone?: string; memo?: string
    memberpayId?: string; robotpayId?: string; paypalId?: string; nextMeetingDate?: Date | null
    isFinalMeeting?: boolean; tags?: string[]
  }) {
    return prisma.contact.create({ data: { ...data, occupation: data.occupation ?? "", interests: data.interests ?? "", mindset: data.mindset ?? "", lineId: data.lineId ?? "", discordId: data.discordId ?? "", email: data.email ?? "", phone: data.phone ?? "", memo: data.memo ?? "", memberpayId: data.memberpayId ?? "", robotpayId: data.robotpayId ?? "", paypalId: data.paypalId ?? "", isFinalMeeting: data.isFinalMeeting ?? false, tags: data.tags ?? [] } })
  }

  static async update(id: string, data: {
    name?: string; type?: "SALON_MEMBER" | "PARTNER_CONTACT"
    occupation?: string; age?: number | null; interests?: string; mindset?: string
    lineId?: string; discordId?: string; email?: string; phone?: string; memo?: string; isArchived?: boolean
    memberpayId?: string; robotpayId?: string; paypalId?: string; nextMeetingDate?: Date | null
    lastMeetingDate?: Date | null; isFinalMeeting?: boolean; tags?: string[]
  }) {
    return prisma.contact.update({ where: { id }, data })
  }
}
