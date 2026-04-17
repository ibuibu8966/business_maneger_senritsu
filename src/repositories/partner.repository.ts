import { prisma } from "@/lib/prisma"
import { idNameSelect } from "@/lib/prisma-selects"

export class PartnerRepository {
  static async findMany(params: { isArchived?: boolean } = {}) {
    return prisma.partner.findMany({
      where: { isArchived: params.isArchived ?? false },
      include: {
        partnerContacts: { include: { contact: { select: idNameSelect } } },
        partnerBusinesses: { include: { business: { select: idNameSelect } } },
      },
      orderBy: { name: "asc" },
    })
  }

  static async findById(id: string) {
    return prisma.partner.findUnique({
      where: { id },
      include: {
        partnerContacts: { include: { contact: { select: idNameSelect } } },
        partnerBusinesses: { include: { business: { select: idNameSelect } } },
      },
    })
  }

  static async create(data: { name: string; memo?: string; tags?: string[] }) {
    return prisma.partner.create({
      data: { name: data.name, memo: data.memo ?? "", tags: data.tags ?? [] },
      include: { partnerContacts: { include: { contact: { select: idNameSelect } } }, partnerBusinesses: { include: { business: { select: idNameSelect } } } },
    })
  }

  static async update(id: string, data: { name?: string; memo?: string; businessDescription?: string; needs?: string; relationshipPlan?: string; tags?: string[]; isArchived?: boolean }) {
    return prisma.partner.update({
      where: { id }, data,
      include: { partnerContacts: { include: { contact: { select: idNameSelect } } }, partnerBusinesses: { include: { business: { select: idNameSelect } } } },
    })
  }

  static async addContact(partnerId: string, contactId: string, role?: string) {
    return prisma.partnerContact.create({ data: { partnerId, contactId, role: role ?? "" } })
  }

  static async removeContact(partnerId: string, contactId: string) {
    return prisma.partnerContact.delete({ where: { partnerId_contactId: { partnerId, contactId } } })
  }

  static async addBusiness(partnerId: string, businessId: string) {
    return prisma.partnerBusiness.create({ data: { partnerId, businessId } })
  }

  static async removeBusiness(partnerId: string, businessId: string) {
    return prisma.partnerBusiness.delete({ where: { partnerId_businessId: { partnerId, businessId } } })
  }
}
