import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { requireRole } from "@/lib/auth-guard"
import { handleApiError } from "@/server/lib/error-response"
import { ContactRepository } from "@/server/repositories/contact.repository"
import { SalonRepository } from "@/server/repositories/salon.repository"
import { SubscriptionRepository } from "@/server/repositories/subscription.repository"
import { PaymentCheckRepository } from "@/server/repositories/payment-check.repository"
import { PartnerRepository } from "@/server/repositories/partner.repository"
import { TicketRepository } from "@/server/repositories/ticket.repository"
import { ContactMeetingRepository } from "@/server/repositories/contact-meeting.repository"
import {
  createContactSchema,
  updateContactSchema,
  createSalonSchema,
  updateSalonSchema,
  createCourseSchema,
  updateCourseSchema,
  createSubscriptionSchema,
  updateSubscriptionSchema,
  upsertPaymentCheckSchema,
  createPartnerSchema,
  updatePartnerSchema,
  partnerContactSchema,
  partnerBusinessSchema,
  createTicketSchema,
  updateTicketSchema,
  createCommentSchema,
  importCsvPaymentCheckSchema,
} from "@/server/schemas/crm.schema"

// ===== ContactController =====
export class ContactController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const type = url.searchParams.get("type")?.toUpperCase() as "SALON_MEMBER" | "PARTNER_CONTACT" | undefined
      const isArchived = url.searchParams.has("isArchived") ? url.searchParams.get("isArchived") === "true" : undefined
      const data = await ContactRepository.findMany({ type: type || undefined, isArchived })
      return NextResponse.json(data.map(c => ({
        id: c.id, name: c.name, realName: c.realName, nicknames: c.nicknames,
        type: c.type.toLowerCase(), occupation: c.occupation,
        age: c.age, interests: c.interests, mindset: c.mindset, lineId: c.lineId,
        discordId: c.discordId, email: c.email, phone: c.phone, memo: c.memo,
        memberpayId: c.memberpayId, robotpayId: c.robotpayId, paypalId: c.paypalId,
        nextMeetingDate: c.nextMeetingDate?.toISOString() ?? null,
        lastMeetingDate: c.lastMeetingDate?.toISOString() ?? null,
        isFinalMeeting: c.isFinalMeeting, tags: c.tags,
        isArchived: c.isArchived, createdAt: c.createdAt.toISOString(),
      })))
    } catch (e) { return handleApiError(e, { resource: "連絡先", action: "取得" }) }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const c = await ContactRepository.findById(id)
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({
        id: c.id,
        name: c.name,
        realName: c.realName,
        nicknames: c.nicknames,
        type: c.type.toLowerCase(),
        occupation: c.occupation,
        age: c.age,
        interests: c.interests,
        mindset: c.mindset,
        lineId: c.lineId,
        discordId: c.discordId,
        email: c.email,
        phone: c.phone,
        memo: c.memo,
        memberpayId: c.memberpayId,
        robotpayId: c.robotpayId,
        paypalId: c.paypalId,
        nextMeetingDate: c.nextMeetingDate?.toISOString() ?? null,
        lastMeetingDate: c.lastMeetingDate?.toISOString() ?? null,
        isFinalMeeting: c.isFinalMeeting,
        tags: c.tags,
        isArchived: c.isArchived,
        createdAt: c.createdAt.toISOString(),
        subscriptions: c.subscriptions.map((s) => ({
          id: s.id,
          contactId: s.contactId,
          contactName: c.name,
          courseId: s.courseId,
          courseName: s.course.name,
          salonName: s.course.salon.name,
          paymentMethod: s.paymentMethod.toLowerCase(),
          paymentServiceId: s.paymentServiceId,
          startDate: s.startDate.toISOString(),
          endDate: s.endDate?.toISOString() ?? null,
          status: s.status.toLowerCase(),
          isExempt: s.isExempt,
          discordRoleAssigned: s.discordRoleAssigned,
          discordRoleName: s.course.discordRoleName,
          paymentChecks: s.paymentChecks,
        })),
        partnerAffiliations: c.partnerContacts.map((pc) => ({
          partnerId: pc.partnerId,
          partnerName: pc.partner.name,
          role: pc.role ?? "",
        })),
      })
    } catch (e) { return handleApiError(e, { resource: "連絡先", action: "取得" }) }
  }

  static async create(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createContactSchema.parse(body)
      const r = await ContactRepository.create({ ...data, type: data.type.toUpperCase() as "SALON_MEMBER" | "PARTNER_CONTACT", memberpayId: data.memberpayId, robotpayId: data.robotpayId, paypalId: data.paypalId, nextMeetingDate: data.nextMeetingDate ? new Date(data.nextMeetingDate) : null, isFinalMeeting: data.isFinalMeeting, tags: data.tags })
      return NextResponse.json({ ...r, type: r.type.toLowerCase(), createdAt: r.createdAt.toISOString(), memberpayId: r.memberpayId, robotpayId: r.robotpayId, paypalId: r.paypalId, nextMeetingDate: null, lastMeetingDate: null, isFinalMeeting: r.isFinalMeeting, tags: r.tags }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "連絡先", action: "登録" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateContactSchema.parse(body)
      const updateData: Record<string, unknown> = { ...data }
      if (data.type) updateData.type = data.type.toUpperCase()
      if (data.nextMeetingDate) updateData.nextMeetingDate = new Date(data.nextMeetingDate)
      if (data.nextMeetingDate === null) updateData.nextMeetingDate = null
      const r = await ContactRepository.update(id, updateData as Parameters<typeof ContactRepository.update>[1])
      return NextResponse.json({ ...r, type: r.type.toLowerCase(), createdAt: r.createdAt.toISOString(), memberpayId: r.memberpayId ?? "", robotpayId: r.robotpayId ?? "", paypalId: r.paypalId ?? "", nextMeetingDate: r.nextMeetingDate?.toISOString() ?? null, lastMeetingDate: r.lastMeetingDate?.toISOString() ?? null, isFinalMeeting: r.isFinalMeeting, tags: r.tags })
    } catch (e) {
      return handleApiError(e, { resource: "連絡先", action: "更新" })
    }
  }
}

// ===== SalonController =====
export class SalonController {
  static async list(_req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await SalonRepository.findMany()
      return NextResponse.json(data.map(s => ({
        id: s.id, name: s.name, isActive: s.isActive,
        courses: s.courses.map(c => ({ id: c.id, salonId: s.id, salonName: s.name, name: c.name, monthlyFee: c.monthlyFee, discordRoleName: c.discordRoleName, isActive: c.isActive })),
      })))
    } catch (e) { return handleApiError(e, { resource: "サロン", action: "取得" }) }
  }

  static async create(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createSalonSchema.parse(body)
      const r = await SalonRepository.create(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "サロン", action: "登録" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateSalonSchema.parse(body)
      const r = await SalonRepository.update(id, data)
      return NextResponse.json(r)
    } catch (e) {
      return handleApiError(e, { resource: "サロン", action: "更新" })
    }
  }

  static async createCourse(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createCourseSchema.parse(body)
      const r = await SalonRepository.createCourse(data)
      return NextResponse.json({ id: r.id, salonId: r.salonId, salonName: r.salon.name, name: r.name, monthlyFee: r.monthlyFee, discordRoleName: r.discordRoleName, isActive: r.isActive }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "コース", action: "登録" })
    }
  }

  static async updateCourse(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateCourseSchema.parse(body)
      const r = await SalonRepository.updateCourse(id, data)
      return NextResponse.json({ id: r.id, salonId: r.salonId, salonName: r.salon.name, name: r.name, monthlyFee: r.monthlyFee, discordRoleName: r.discordRoleName, isActive: r.isActive })
    } catch (e) {
      return handleApiError(e, { resource: "コース", action: "更新" })
    }
  }
}

// ===== SubscriptionController =====
export class SubscriptionController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const params = {
        contactId: url.searchParams.get("contactId") ?? undefined,
        courseId: url.searchParams.get("courseId") ?? undefined,
        status: url.searchParams.get("status")?.toUpperCase() as "ACTIVE" | "CANCELLED" | undefined,
        discordRoleAssigned: url.searchParams.has("discordRoleAssigned") ? url.searchParams.get("discordRoleAssigned") === "true" : undefined,
      }
      const data = await SubscriptionRepository.findMany(params)
      return NextResponse.json(data.map(s => ({
        id: s.id, contactId: s.contact.id, contactName: s.contact.name,
        courseId: s.course.id, courseName: s.course.name, salonName: s.course.salon.name,
        paymentMethod: s.paymentMethod.toLowerCase(), paymentServiceId: s.paymentServiceId,
        discordRoleAssigned: s.discordRoleAssigned, isExempt: s.isExempt, discordRoleName: s.course.discordRoleName,
        status: s.status.toLowerCase(), startDate: s.startDate.toISOString().split("T")[0],
        endDate: s.endDate ? s.endDate.toISOString().split("T")[0] : null,
      })))
    } catch (e) { return handleApiError(e, { resource: "購読", action: "取得" }) }
  }

  static async create(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createSubscriptionSchema.parse(body)
      const r = await SubscriptionRepository.create({
        contactId: data.contactId, courseId: data.courseId,
        paymentMethod: data.paymentMethod.toUpperCase() as "MEMBERPAY" | "ROBOTPAY" | "PAYPAL" | "UNIVPAY" | "OTHER",
        paymentServiceId: data.paymentServiceId, startDate: new Date(data.startDate), isExempt: data.isExempt,
      })
      return NextResponse.json({
        id: r.id, contactId: r.contact.id, contactName: r.contact.name,
        courseId: r.course.id, courseName: r.course.name, salonName: r.course.salon.name,
        paymentMethod: r.paymentMethod.toLowerCase(), paymentServiceId: r.paymentServiceId,
        discordRoleAssigned: r.discordRoleAssigned, isExempt: r.isExempt, discordRoleName: r.course.discordRoleName,
        status: r.status.toLowerCase(), startDate: r.startDate.toISOString().split("T")[0], endDate: null,
      }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "購読", action: "登録" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateSubscriptionSchema.parse(body)
      const updateData: Record<string, unknown> = { ...data }
      if (data.paymentMethod) updateData.paymentMethod = data.paymentMethod.toUpperCase()
      if (data.status) updateData.status = data.status.toUpperCase()
      if (data.endDate) updateData.endDate = new Date(data.endDate)
      if (data.endDate === null) updateData.endDate = null
      const r = await SubscriptionRepository.update(id, updateData as Parameters<typeof SubscriptionRepository.update>[1])
      return NextResponse.json({
        id: r.id, contactId: r.contact.id, contactName: r.contact.name,
        courseId: r.course.id, courseName: r.course.name, salonName: r.course.salon.name,
        paymentMethod: r.paymentMethod.toLowerCase(), paymentServiceId: r.paymentServiceId,
        discordRoleAssigned: r.discordRoleAssigned, isExempt: r.isExempt, discordRoleName: r.course.discordRoleName,
        status: r.status.toLowerCase(), startDate: r.startDate.toISOString().split("T")[0],
        endDate: r.endDate ? r.endDate.toISOString().split("T")[0] : null,
      })
    } catch (e) {
      return handleApiError(e, { resource: "購読", action: "更新" })
    }
  }
}

// ===== PaymentCheckController =====
export class PaymentCheckController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const yearRaw = parseInt(url.searchParams.get("year") ?? new Date().getFullYear().toString())
      const monthRaw = parseInt(url.searchParams.get("month") ?? (new Date().getMonth() + 1).toString())
      if (isNaN(yearRaw) || isNaN(monthRaw) || monthRaw < 1 || monthRaw > 12) {
        return NextResponse.json({ error: "Invalid year or month parameter" }, { status: 400 })
      }
      const year = yearRaw
      const month = monthRaw
      const isConfirmed = url.searchParams.has("isConfirmed") ? url.searchParams.get("isConfirmed") === "true" : undefined
      const data = await PaymentCheckRepository.findMany({ year, month, isConfirmed })
      return NextResponse.json(data.map(p => ({
        id: p.id, subscriptionId: p.subscriptionId,
        contactName: p.subscription.contact.name,
        discordId: p.subscription.contact.discordId ?? "",
        courseName: p.subscription.course.name,
        salonName: p.subscription.course.salon.name,
        paymentServiceId: p.subscription.paymentServiceId ?? "",
        discordRoleName: p.subscription.course.discordRoleName ?? "",
        discordRoleAssigned: p.subscription.discordRoleAssigned,
        isExempt: p.subscription.isExempt,
        paymentMethod: p.subscription.paymentMethod.toLowerCase(),
        year: p.year, month: p.month, isConfirmed: p.isConfirmed,
        confirmedBy: p.confirmedBy, confirmedAt: p.confirmedAt?.toISOString() ?? null,
        hasNote: p.hasNote,
      })))
    } catch (e) { return handleApiError(e, { resource: "決済確認", action: "取得" }) }
  }

  static async upsert(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = upsertPaymentCheckSchema.parse(body)
      const r = await PaymentCheckRepository.upsert(data)
      return NextResponse.json({
        id: r.id, subscriptionId: r.subscriptionId,
        contactName: r.subscription.contact.name,
        discordId: r.subscription.contact.discordId ?? "",
        courseName: r.subscription.course.name,
        salonName: r.subscription.course.salon.name,
        paymentServiceId: r.subscription.paymentServiceId ?? "",
        discordRoleName: r.subscription.course.discordRoleName ?? "",
        discordRoleAssigned: r.subscription.discordRoleAssigned,
        isExempt: r.subscription.isExempt,
        paymentMethod: r.subscription.paymentMethod.toLowerCase(),
        year: r.year, month: r.month, isConfirmed: r.isConfirmed,
        confirmedBy: r.confirmedBy, confirmedAt: r.confirmedAt?.toISOString() ?? null,
        hasNote: r.hasNote,
      })
    } catch (e) {
      return handleApiError(e, { resource: "決済確認", action: "更新" })
    }
  }

  static async generate(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const { year, month } = z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }).parse(body)
      const count = await PaymentCheckRepository.generateForMonth(year, month)
      return NextResponse.json({ generated: count })
    } catch (e) {
      return handleApiError(e, { resource: "決済確認", action: "実行" })
    }
  }

  static async importCsv(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const { year, month, rows, dryRun, confirmedBy } = importCsvPaymentCheckSchema.parse(body)
      const result = await PaymentCheckRepository.importCsv({
        year,
        month,
        rows,
        dryRun,
        confirmedBy: confirmedBy ? `${confirmedBy} (CSV取込)` : "CSV取込",
      })
      return NextResponse.json(result)
    } catch (e) {
      return handleApiError(e, { resource: "決済確認", action: "実行" })
    }
  }
}

// ===== PartnerController =====
export class PartnerController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const isArchived = url.searchParams.has("isArchived") ? url.searchParams.get("isArchived") === "true" : undefined
      const data = await PartnerRepository.findMany({ isArchived })
      return NextResponse.json(data.map(p => ({
        id: p.id, name: p.name, memo: p.memo,
        businessDescription: p.businessDescription, needs: p.needs, relationshipPlan: p.relationshipPlan,
        tags: p.tags, isArchived: p.isArchived,
        contacts: p.partnerContacts.map(pc => ({ contactId: pc.contact.id, contactName: pc.contact.name, role: pc.role })),
        businesses: p.partnerBusinesses.map(pb => ({ businessId: pb.business.id, businessName: pb.business.name })),
      })))
    } catch (e) { return handleApiError(e, { resource: "取引先", action: "取得" }) }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const p = await PartnerRepository.findById(id)
      if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({
        id: p.id, name: p.name, memo: p.memo,
        businessDescription: p.businessDescription, needs: p.needs, relationshipPlan: p.relationshipPlan,
        tags: p.tags, isArchived: p.isArchived,
        contacts: p.partnerContacts.map(pc => ({ contactId: pc.contact.id, contactName: pc.contact.name, role: pc.role })),
        businesses: p.partnerBusinesses.map(pb => ({ businessId: pb.business.id, businessName: pb.business.name })),
      })
    } catch (e) { return handleApiError(e, { resource: "取引先", action: "取得" }) }
  }

  static async create(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createPartnerSchema.parse(body)
      const r = await PartnerRepository.create(data)
      return NextResponse.json({
        id: r.id, name: r.name, memo: r.memo, businessDescription: r.businessDescription ?? "", needs: r.needs ?? "", relationshipPlan: r.relationshipPlan ?? "", tags: r.tags, isArchived: r.isArchived, contacts: [], businesses: [],
      }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "取引先", action: "登録" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updatePartnerSchema.parse(body)
      const r = await PartnerRepository.update(id, data)
      return NextResponse.json({
        id: r.id, name: r.name, memo: r.memo,
        businessDescription: r.businessDescription, needs: r.needs, relationshipPlan: r.relationshipPlan,
        tags: r.tags, isArchived: r.isArchived,
        contacts: r.partnerContacts.map(pc => ({ contactId: pc.contact.id, contactName: pc.contact.name, role: pc.role })),
        businesses: r.partnerBusinesses.map(pb => ({ businessId: pb.business.id, businessName: pb.business.name })),
      })
    } catch (e) {
      return handleApiError(e, { resource: "取引先", action: "更新" })
    }
  }

  static async addContact(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = partnerContactSchema.parse(body)
      await PartnerRepository.addContact(id, data.contactId, data.role)
      return NextResponse.json({ success: true }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "取引先の担当者", action: "登録" })
    }
  }

  static async addBusiness(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = partnerBusinessSchema.parse(body)
      await PartnerRepository.addBusiness(id, data.businessId)
      return NextResponse.json({ success: true }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "取引先の事業", action: "登録" })
    }
  }
}

// ===== TicketController =====
export class TicketController {
  static async list(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const url = new URL(req.url)
      const params = {
        contactId: url.searchParams.get("contactId") ?? undefined,
        assigneeId: url.searchParams.get("assigneeId") ?? undefined,
        status: url.searchParams.get("status")?.toUpperCase() as "OPEN" | "WAITING" | "IN_PROGRESS" | "COMPLETED" | undefined,
        priority: url.searchParams.get("priority")?.toUpperCase() as "HIGH" | "MEDIUM" | "LOW" | undefined,
        isArchived: url.searchParams.has("isArchived") ? url.searchParams.get("isArchived") === "true" : undefined,
      }
      const data = await TicketRepository.findMany(params)
      return NextResponse.json(data.map(t => ({
        id: t.id, title: t.title, contactId: t.contact?.id ?? null, contactName: t.contact?.name ?? null,
        partnerId: t.partner?.id ?? null, partnerName: t.partner?.name ?? null,
        assigneeId: t.assignee.id, assigneeName: t.assignee.name,
        tool: t.tool.toLowerCase(), priority: t.priority.toLowerCase(), status: t.status.toLowerCase(),
        content: t.content, memo: t.memo,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
        isArchived: t.isArchived, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
      })))
    } catch (e) { return handleApiError(e, { resource: "チケット", action: "取得" }) }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const t = await TicketRepository.findById(id)
      if (!t) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({
        id: t.id, title: t.title, contactId: t.contact?.id ?? null, contactName: t.contact?.name ?? null,
        partnerId: t.partner?.id ?? null, partnerName: t.partner?.name ?? null,
        assigneeId: t.assignee.id, assigneeName: t.assignee.name,
        tool: t.tool.toLowerCase(), priority: t.priority.toLowerCase(), status: t.status.toLowerCase(),
        content: t.content, memo: t.memo,
        dueDate: t.dueDate ? t.dueDate.toISOString().split("T")[0] : null,
        isArchived: t.isArchived, createdAt: t.createdAt.toISOString(), updatedAt: t.updatedAt.toISOString(),
        comments: t.comments.map(c => ({
          id: c.id, ticketId: c.ticketId, content: c.content,
          authorId: c.author.id, authorName: c.author.name, createdAt: c.createdAt.toISOString(),
        })),
      })
    } catch (e) { return handleApiError(e, { resource: "チケット", action: "取得" }) }
  }

  static async create(req: NextRequest) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createTicketSchema.parse(body)
      const r = await TicketRepository.create({
        title: data.title, contactId: data.contactId ?? null, partnerId: data.partnerId ?? null, assigneeId: data.assigneeId,
        tool: data.tool?.toUpperCase() as "LINE" | "TELEGRAM" | "DISCORD" | "PHONE" | "ZOOM" | "IN_PERSON" | undefined,
        priority: data.priority?.toUpperCase() as "HIGH" | "MEDIUM" | "LOW" | undefined,
        dueDate: data.dueDate ? new Date(data.dueDate) : null,
        content: data.content, memo: data.memo,
      })
      return NextResponse.json({
        id: r.id, title: r.title, contactId: r.contact?.id ?? null, contactName: r.contact?.name ?? null,
        partnerId: r.partner?.id ?? null, partnerName: r.partner?.name ?? null,
        assigneeId: r.assignee.id, assigneeName: r.assignee.name,
        tool: r.tool.toLowerCase(), priority: r.priority.toLowerCase(), status: r.status.toLowerCase(),
        content: r.content, memo: r.memo,
        dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
        isArchived: r.isArchived, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "チケット", action: "登録" })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = updateTicketSchema.parse(body)
      const updateData: Record<string, unknown> = { ...data }
      if (data.tool) updateData.tool = data.tool.toUpperCase()
      if (data.priority) updateData.priority = data.priority.toUpperCase()
      if (data.status) updateData.status = data.status.toUpperCase()
      if (data.content !== undefined) updateData.content = data.content
      if (data.memo !== undefined) updateData.memo = data.memo
      if (data.dueDate) updateData.dueDate = new Date(data.dueDate)
      if (data.dueDate === null) updateData.dueDate = null
      const r = await TicketRepository.update(id, updateData as Parameters<typeof TicketRepository.update>[1])
      return NextResponse.json({
        id: r.id, title: r.title, contactId: r.contact?.id ?? null, contactName: r.contact?.name ?? null,
        partnerId: r.partner?.id ?? null, partnerName: r.partner?.name ?? null,
        assigneeId: r.assignee.id, assigneeName: r.assignee.name,
        tool: r.tool.toLowerCase(), priority: r.priority.toLowerCase(), status: r.status.toLowerCase(),
        content: r.content, memo: r.memo,
        dueDate: r.dueDate ? r.dueDate.toISOString().split("T")[0] : null,
        isArchived: r.isArchived, createdAt: r.createdAt.toISOString(), updatedAt: r.updatedAt.toISOString(),
      })
    } catch (e) {
      return handleApiError(e, { resource: "チケット", action: "更新" })
    }
  }

  static async addComment(req: NextRequest, id: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const data = createCommentSchema.parse(body)
      const r = await TicketRepository.addComment({ ticketId: id, ...data })
      return NextResponse.json({
        id: r.id, ticketId: r.ticketId, content: r.content,
        authorId: r.author.id, authorName: r.author.name, createdAt: r.createdAt.toISOString(),
      }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "チケットコメント", action: "登録" })
    }
  }
}

// ===== ContactMeetingController =====
export class ContactMeetingController {
  static async list(_req: NextRequest, contactId: string) {
    try {
      const { error } = await requireRole("master_admin", "admin", "employee")
      if (error) return error
      const data = await ContactMeetingRepository.findByContactId(contactId)
      return NextResponse.json(data.map(m => ({
        id: m.id, contactId: m.contactId, date: m.date.toISOString(),
        summary: m.summary, createdAt: m.createdAt.toISOString(),
      })))
    } catch (e) { return handleApiError(e, { resource: "面談メモ", action: "取得" }) }
  }

  static async create(req: NextRequest, contactId: string) {
    try {
      const { error } = await requireRole("master_admin", "admin")
      if (error) return error
      const body = await req.json()
      const schema = z.object({ date: z.string(), summary: z.string().optional() })
      const data = schema.parse(body)
      const r = await ContactMeetingRepository.create({
        contactId, date: new Date(data.date), summary: data.summary ?? "",
      })

      // 面談メモ追加後、nextMeetingDate / lastMeetingDate を自動再計算
      const now = new Date()
      const allMeetings = await ContactMeetingRepository.findByContactId(contactId)
      const futureMeetings = allMeetings
        .filter(m => m.date > now)
        .sort((a, b) => a.date.getTime() - b.date.getTime())
      const pastMeetings = allMeetings
        .filter(m => m.date <= now)
        .sort((a, b) => b.date.getTime() - a.date.getTime())
      await ContactRepository.update(contactId, {
        nextMeetingDate: futureMeetings[0]?.date ?? null,
        lastMeetingDate: pastMeetings[0]?.date ?? null,
      })

      return NextResponse.json({
        id: r.id, contactId: r.contactId, date: r.date.toISOString(),
        summary: r.summary, createdAt: r.createdAt.toISOString(),
      }, { status: 201 })
    } catch (e) {
      return handleApiError(e, { resource: "面談メモ", action: "登録" })
    }
  }
}
