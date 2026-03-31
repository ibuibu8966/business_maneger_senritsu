import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { ContactRepository } from "@/repositories/contact.repository"
import { SalonRepository } from "@/repositories/salon.repository"
import { SubscriptionRepository } from "@/repositories/subscription.repository"
import { PaymentCheckRepository } from "@/repositories/payment-check.repository"
import { PartnerRepository } from "@/repositories/partner.repository"
import { TicketRepository } from "@/repositories/ticket.repository"
import { ContactMeetingRepository } from "@/repositories/contact-meeting.repository"

// Zodスキーマ
const createContactSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["salon_member", "partner_contact"]),
  occupation: z.string().optional(),
  age: z.number().int().nullable().optional(),
  interests: z.string().optional(),
  mindset: z.string().optional(),
  lineId: z.string().optional(),
  discordId: z.string().optional(),
  email: z.string().optional(),
  phone: z.string().optional(),
  memo: z.string().optional(),
  memberpayId: z.string().optional(),
  robotpayId: z.string().optional(),
  paypalId: z.string().optional(),
  nextMeetingDate: z.string().nullable().optional(),
  isFinalMeeting: z.boolean().optional(),
  tags: z.array(z.string()).optional(),
})

const updateContactSchema = createContactSchema.partial().extend({
  isArchived: z.boolean().optional(),
})

const createSalonSchema = z.object({ name: z.string().min(1) })
const updateSalonSchema = z.object({ name: z.string().optional(), isActive: z.boolean().optional() })

const createCourseSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1),
  monthlyFee: z.number().int().optional(),
  discordRoleName: z.string().optional(),
})
const updateCourseSchema = z.object({
  name: z.string().optional(),
  monthlyFee: z.number().int().optional(),
  discordRoleName: z.string().optional(),
  isActive: z.boolean().optional(),
})

const createSubscriptionSchema = z.object({
  contactId: z.string(),
  courseId: z.string(),
  paymentMethod: z.enum(["memberpay", "robotpay", "paypal", "univpay", "other"]),
  paymentServiceId: z.string().optional(),
  startDate: z.string(),
  isExempt: z.boolean().optional(),
})
const updateSubscriptionSchema = z.object({
  paymentMethod: z.enum(["memberpay", "robotpay", "paypal", "univpay", "other"]).optional(),
  paymentServiceId: z.string().optional(),
  discordRoleAssigned: z.boolean().optional(),
  isExempt: z.boolean().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
  endDate: z.string().nullable().optional(),
})

const upsertPaymentCheckSchema = z.object({
  subscriptionId: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  isConfirmed: z.boolean(),
  confirmedBy: z.string(),
  discordRoleAssigned: z.boolean().optional(),
})

const createPartnerSchema = z.object({ name: z.string().min(1), memo: z.string().optional(), tags: z.array(z.string()).optional() })
const updatePartnerSchema = z.object({ name: z.string().optional(), memo: z.string().optional(), businessDescription: z.string().optional(), needs: z.string().optional(), relationshipPlan: z.string().optional(), tags: z.array(z.string()).optional(), isArchived: z.boolean().optional() })
const partnerContactSchema = z.object({ contactId: z.string(), role: z.string().optional() })
const partnerBusinessSchema = z.object({ businessId: z.string() })

const createTicketSchema = z.object({
  title: z.string().min(1),
  contactId: z.string().nullable().optional(),
  partnerId: z.string().nullable().optional(),
  assigneeId: z.string(),
  tool: z.enum(["line", "telegram", "discord", "phone", "zoom", "in_person"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  content: z.string().optional(),
  memo: z.string().optional(),
  dueDate: z.string().nullable().optional(),
})
const updateTicketSchema = z.object({
  title: z.string().optional(),
  assigneeId: z.string().optional(),
  tool: z.enum(["line", "telegram", "discord", "phone", "zoom", "in_person"]).optional(),
  priority: z.enum(["high", "medium", "low"]).optional(),
  status: z.enum(["open", "waiting", "in_progress", "completed"]).optional(),
  content: z.string().optional(),
  memo: z.string().optional(),
  dueDate: z.string().nullable().optional(),
  isArchived: z.boolean().optional(),
})
const createCommentSchema = z.object({
  content: z.string().min(1),
  authorId: z.string(),
})

// ===== ContactController =====
export class ContactController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const type = url.searchParams.get("type")?.toUpperCase() as "SALON_MEMBER" | "PARTNER_CONTACT" | undefined
      const isArchived = url.searchParams.has("isArchived") ? url.searchParams.get("isArchived") === "true" : undefined
      const data = await ContactRepository.findMany({ type: type || undefined, isArchived })
      return NextResponse.json(data.map(c => ({
        id: c.id, name: c.name, type: c.type.toLowerCase(), occupation: c.occupation,
        age: c.age, interests: c.interests, mindset: c.mindset, lineId: c.lineId,
        discordId: c.discordId, email: c.email, phone: c.phone, memo: c.memo,
        memberpayId: c.memberpayId, robotpayId: c.robotpayId, paypalId: c.paypalId,
        nextMeetingDate: c.nextMeetingDate?.toISOString() ?? null,
        lastMeetingDate: c.lastMeetingDate?.toISOString() ?? c.meetings?.[0]?.date?.toISOString() ?? null,
        isFinalMeeting: c.isFinalMeeting, tags: c.tags,
        isArchived: c.isArchived, createdAt: c.createdAt.toISOString(),
      })))
    } catch { return NextResponse.json({ error: "連絡先の取得に失敗しました" }, { status: 500 }) }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const c = await ContactRepository.findById(id)
      if (!c) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json(c)
    } catch { return NextResponse.json({ error: "連絡先の取得に失敗しました" }, { status: 500 }) }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createContactSchema.parse(body)
      const r = await ContactRepository.create({ ...data, type: data.type.toUpperCase() as "SALON_MEMBER" | "PARTNER_CONTACT", memberpayId: data.memberpayId, robotpayId: data.robotpayId, paypalId: data.paypalId, nextMeetingDate: data.nextMeetingDate ? new Date(data.nextMeetingDate) : null, isFinalMeeting: data.isFinalMeeting, tags: data.tags })
      return NextResponse.json({ ...r, type: r.type.toLowerCase(), createdAt: r.createdAt.toISOString(), memberpayId: r.memberpayId, robotpayId: r.robotpayId, paypalId: r.paypalId, nextMeetingDate: null, lastMeetingDate: null, isFinalMeeting: r.isFinalMeeting, tags: r.tags }, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "連絡先の登録に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateContactSchema.parse(body)
      const updateData: Record<string, unknown> = { ...data }
      if (data.type) updateData.type = data.type.toUpperCase()
      if (data.nextMeetingDate) updateData.nextMeetingDate = new Date(data.nextMeetingDate)
      if (data.nextMeetingDate === null) updateData.nextMeetingDate = null
      const r = await ContactRepository.update(id, updateData as Parameters<typeof ContactRepository.update>[1])
      return NextResponse.json({ ...r, type: r.type.toLowerCase(), createdAt: r.createdAt.toISOString(), memberpayId: r.memberpayId ?? "", robotpayId: r.robotpayId ?? "", paypalId: r.paypalId ?? "", nextMeetingDate: r.nextMeetingDate?.toISOString() ?? null, lastMeetingDate: r.lastMeetingDate?.toISOString() ?? null, isFinalMeeting: r.isFinalMeeting, tags: r.tags })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "連絡先の更新に失敗しました" }, { status: 500 })
    }
  }
}

// ===== SalonController =====
export class SalonController {
  static async list(_req: NextRequest) {
    try {
      const data = await SalonRepository.findMany()
      return NextResponse.json(data.map(s => ({
        id: s.id, name: s.name, isActive: s.isActive,
        courses: s.courses.map(c => ({ id: c.id, salonId: s.id, salonName: s.name, name: c.name, monthlyFee: c.monthlyFee, discordRoleName: c.discordRoleName, isActive: c.isActive })),
      })))
    } catch { return NextResponse.json({ error: "サロンの取得に失敗しました" }, { status: 500 }) }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createSalonSchema.parse(body)
      const r = await SalonRepository.create(data)
      return NextResponse.json(r, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "サロンの登録に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateSalonSchema.parse(body)
      const r = await SalonRepository.update(id, data)
      return NextResponse.json(r)
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "サロンの更新に失敗しました" }, { status: 500 })
    }
  }

  static async createCourse(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createCourseSchema.parse(body)
      const r = await SalonRepository.createCourse(data)
      return NextResponse.json({ id: r.id, salonId: r.salonId, salonName: r.salon.name, name: r.name, monthlyFee: r.monthlyFee, discordRoleName: r.discordRoleName, isActive: r.isActive }, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "コースの登録に失敗しました" }, { status: 500 })
    }
  }

  static async updateCourse(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = updateCourseSchema.parse(body)
      const r = await SalonRepository.updateCourse(id, data)
      return NextResponse.json({ id: r.id, salonId: r.salonId, salonName: r.salon.name, name: r.name, monthlyFee: r.monthlyFee, discordRoleName: r.discordRoleName, isActive: r.isActive })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "コースの更新に失敗しました" }, { status: 500 })
    }
  }
}

// ===== SubscriptionController =====
export class SubscriptionController {
  static async list(req: NextRequest) {
    try {
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
    } catch { return NextResponse.json({ error: "サブスクリプションの取得に失敗しました" }, { status: 500 }) }
  }

  static async create(req: NextRequest) {
    try {
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
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "サブスクリプションの登録に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
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
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "サブスクリプションの更新に失敗しました" }, { status: 500 })
    }
  }
}

// ===== PaymentCheckController =====
export class PaymentCheckController {
  static async list(req: NextRequest) {
    try {
      const url = new URL(req.url)
      const year = parseInt(url.searchParams.get("year") ?? new Date().getFullYear().toString())
      const month = parseInt(url.searchParams.get("month") ?? (new Date().getMonth() + 1).toString())
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
      })))
    } catch { return NextResponse.json({ error: "決済確認の取得に失敗しました" }, { status: 500 }) }
  }

  static async upsert(req: NextRequest) {
    try {
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
      })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "決済確認の更新に失敗しました" }, { status: 500 })
    }
  }

  static async generate(req: NextRequest) {
    try {
      const body = await req.json()
      const { year, month } = z.object({ year: z.number().int(), month: z.number().int().min(1).max(12) }).parse(body)
      const count = await PaymentCheckRepository.generateForMonth(year, month)
      return NextResponse.json({ generated: count })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "決済確認の生成に失敗しました" }, { status: 500 })
    }
  }
}

// ===== PartnerController =====
export class PartnerController {
  static async list(req: NextRequest) {
    try {
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
    } catch { return NextResponse.json({ error: "取引先の取得に失敗しました" }, { status: 500 }) }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
      const p = await PartnerRepository.findById(id)
      if (!p) return NextResponse.json({ error: "Not found" }, { status: 404 })
      return NextResponse.json({
        id: p.id, name: p.name, memo: p.memo,
        businessDescription: p.businessDescription, needs: p.needs, relationshipPlan: p.relationshipPlan,
        tags: p.tags, isArchived: p.isArchived,
        contacts: p.partnerContacts.map(pc => ({ contactId: pc.contact.id, contactName: pc.contact.name, role: pc.role })),
        businesses: p.partnerBusinesses.map(pb => ({ businessId: pb.business.id, businessName: pb.business.name })),
      })
    } catch { return NextResponse.json({ error: "取引先の取得に失敗しました" }, { status: 500 }) }
  }

  static async create(req: NextRequest) {
    try {
      const body = await req.json()
      const data = createPartnerSchema.parse(body)
      const r = await PartnerRepository.create(data)
      return NextResponse.json({
        id: r.id, name: r.name, memo: r.memo, businessDescription: r.businessDescription ?? "", needs: r.needs ?? "", relationshipPlan: r.relationshipPlan ?? "", tags: r.tags, isArchived: r.isArchived, contacts: [], businesses: [],
      }, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "取引先の登録に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
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
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "取引先の更新に失敗しました" }, { status: 500 })
    }
  }

  static async addContact(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = partnerContactSchema.parse(body)
      await PartnerRepository.addContact(id, data.contactId, data.role)
      return NextResponse.json({ success: true }, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "担当者の追加に失敗しました" }, { status: 500 })
    }
  }

  static async addBusiness(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = partnerBusinessSchema.parse(body)
      await PartnerRepository.addBusiness(id, data.businessId)
      return NextResponse.json({ success: true }, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "事業の追加に失敗しました" }, { status: 500 })
    }
  }
}

// ===== TicketController =====
export class TicketController {
  static async list(req: NextRequest) {
    try {
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
    } catch { return NextResponse.json({ error: "チケットの取得に失敗しました" }, { status: 500 }) }
  }

  static async getById(_req: NextRequest, id: string) {
    try {
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
    } catch { return NextResponse.json({ error: "チケットの取得に失敗しました" }, { status: 500 }) }
  }

  static async create(req: NextRequest) {
    try {
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
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "チケットの登録に失敗しました" }, { status: 500 })
    }
  }

  static async update(req: NextRequest, id: string) {
    try {
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
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "チケットの更新に失敗しました" }, { status: 500 })
    }
  }

  static async addComment(req: NextRequest, id: string) {
    try {
      const body = await req.json()
      const data = createCommentSchema.parse(body)
      const r = await TicketRepository.addComment({ ticketId: id, ...data })
      return NextResponse.json({
        id: r.id, ticketId: r.ticketId, content: r.content,
        authorId: r.author.id, authorName: r.author.name, createdAt: r.createdAt.toISOString(),
      }, { status: 201 })
    } catch (e) {
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "コメントの追加に失敗しました" }, { status: 500 })
    }
  }
}

// ===== ContactMeetingController =====
export class ContactMeetingController {
  static async list(_req: NextRequest, contactId: string) {
    try {
      const data = await ContactMeetingRepository.findByContactId(contactId)
      return NextResponse.json(data.map(m => ({
        id: m.id, contactId: m.contactId, date: m.date.toISOString(),
        summary: m.summary, createdAt: m.createdAt.toISOString(),
      })))
    } catch { return NextResponse.json({ error: "面談メモの取得に失敗しました" }, { status: 500 }) }
  }

  static async create(req: NextRequest, contactId: string) {
    try {
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
      if (e instanceof z.ZodError) return NextResponse.json({ errors: e.issues }, { status: 400 })
      return NextResponse.json({ error: "面談メモの登録に失敗しました" }, { status: 500 })
    }
  }
}
