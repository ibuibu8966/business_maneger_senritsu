/**
 * CRM系APIのZodバリデーションスキーマ
 * Controller から分離して責務を明確化
 */
import { z } from "zod"

// ========== Contact ==========

export const createContactSchema = z.object({
  name: z.string().min(1),
  realName: z.string().optional(),
  nicknames: z.array(z.string()).optional(),
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

export const updateContactSchema = createContactSchema.partial().extend({
  isArchived: z.boolean().optional(),
})

// ========== Salon ==========

export const createSalonSchema = z.object({ name: z.string().min(1) })
export const updateSalonSchema = z.object({ name: z.string().optional(), isActive: z.boolean().optional() })

// ========== Course ==========

export const createCourseSchema = z.object({
  salonId: z.string(),
  name: z.string().min(1),
  monthlyFee: z.number().int().optional(),
  discordRoleName: z.string().optional(),
})
export const updateCourseSchema = z.object({
  name: z.string().optional(),
  monthlyFee: z.number().int().optional(),
  discordRoleName: z.string().optional(),
  isActive: z.boolean().optional(),
})

// ========== Subscription ==========

export const createSubscriptionSchema = z.object({
  contactId: z.string(),
  courseId: z.string(),
  paymentMethod: z.enum(["memberpay", "robotpay", "paypal", "univpay", "other"]),
  paymentServiceId: z.string().optional(),
  startDate: z.string(),
  isExempt: z.boolean().optional(),
})
export const updateSubscriptionSchema = z.object({
  paymentMethod: z.enum(["memberpay", "robotpay", "paypal", "univpay", "other"]).optional(),
  paymentServiceId: z.string().optional(),
  discordRoleAssigned: z.boolean().optional(),
  isExempt: z.boolean().optional(),
  status: z.enum(["active", "cancelled"]).optional(),
  endDate: z.string().nullable().optional(),
})

// ========== PaymentCheck ==========

export const upsertPaymentCheckSchema = z.object({
  subscriptionId: z.string(),
  year: z.number().int(),
  month: z.number().int().min(1).max(12),
  isConfirmed: z.boolean(),
  confirmedBy: z.string(),
  discordRoleAssigned: z.boolean().optional(),
})

// ========== Partner ==========

export const createPartnerSchema = z.object({
  name: z.string().min(1),
  memo: z.string().optional(),
  tags: z.array(z.string()).optional(),
})
export const updatePartnerSchema = z.object({
  name: z.string().optional(),
  memo: z.string().optional(),
  businessDescription: z.string().optional(),
  needs: z.string().optional(),
  relationshipPlan: z.string().optional(),
  tags: z.array(z.string()).optional(),
  isArchived: z.boolean().optional(),
})
export const partnerContactSchema = z.object({ contactId: z.string(), role: z.string().optional() })
export const partnerBusinessSchema = z.object({ businessId: z.string() })

// ========== Ticket ==========

export const createTicketSchema = z.object({
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
export const updateTicketSchema = z.object({
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
export const createCommentSchema = z.object({
  content: z.string().min(1),
  authorId: z.string(),
})
