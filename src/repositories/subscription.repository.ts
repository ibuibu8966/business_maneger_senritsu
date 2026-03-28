import { prisma } from "@/lib/prisma"

export class SubscriptionRepository {
  static async findMany(params: { contactId?: string; courseId?: string; status?: "ACTIVE" | "CANCELLED"; discordRoleAssigned?: boolean }) {
    return prisma.subscription.findMany({
      where: {
        ...(params.contactId && { contactId: params.contactId }),
        ...(params.courseId && { courseId: params.courseId }),
        ...(params.status && { status: params.status }),
        ...(params.discordRoleAssigned !== undefined && { discordRoleAssigned: params.discordRoleAssigned }),
      },
      include: {
        contact: { select: { id: true, name: true } },
        course: { include: { salon: { select: { id: true, name: true } } } },
      },
      orderBy: { startDate: "desc" },
    })
  }

  static async create(data: {
    contactId: string; courseId: string; paymentMethod: "MEMBERPAY" | "ROBOTPAY" | "PAYPAL" | "UNIVPAY" | "OTHER"
    paymentServiceId?: string; startDate: Date; isExempt?: boolean
  }) {
    return prisma.subscription.create({
      data: { ...data, paymentServiceId: data.paymentServiceId ?? "" },
      include: { contact: { select: { id: true, name: true } }, course: { include: { salon: { select: { id: true, name: true } } } } },
    })
  }

  static async update(id: string, data: {
    paymentMethod?: "MEMBERPAY" | "ROBOTPAY" | "PAYPAL" | "UNIVPAY" | "OTHER"
    paymentServiceId?: string; discordRoleAssigned?: boolean; isExempt?: boolean; status?: "ACTIVE" | "CANCELLED"; endDate?: Date | null
  }) {
    return prisma.subscription.update({
      where: { id }, data,
      include: { contact: { select: { id: true, name: true } }, course: { include: { salon: { select: { id: true, name: true } } } } },
    })
  }
}
