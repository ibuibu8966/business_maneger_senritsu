import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  fetchContacts, fetchContactById, createContact, updateContact,
  fetchSalons, createSalon, updateSalon, createCourse, updateCourse,
  fetchSubscriptions, createSubscription, updateSubscription,
  fetchPaymentChecks, upsertPaymentCheck, generatePaymentChecks,
  fetchPartners, fetchPartnerById, createPartner, updatePartner,
  addPartnerContact, addPartnerBusiness,
  fetchTickets, fetchTicketById, createTicket, updateTicket, addTicketComment,
  fetchContactMeetings, createContactMeeting,
  fetchCrmTags, createCrmTag, deleteCrmTag,
} from "@/lib/api"

// ========== Contacts ==========

export function useContacts(params?: { type?: string; isArchived?: boolean }) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.contacts.list(keyParams),
    queryFn: () => fetchContacts(params),
  })
}

export function useContact(id: string) {
  return useQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: () => fetchContactById(id),
    enabled: !!id,
  })
}

export function useCreateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createContact(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
    },
  })
}

export function useUpdateContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateContact(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
    },
  })
}

// ========== Salons ==========

export function useSalons() {
  return useQuery({
    queryKey: queryKeys.salons.all,
    queryFn: fetchSalons,
  })
}

export function useCreateSalon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createSalon(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salons.all })
    },
  })
}

export function useUpdateSalon() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateSalon(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salons.all })
    },
  })
}

export function useCreateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createCourse(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salons.all })
    },
  })
}

export function useUpdateCourse() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateCourse(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.salons.all })
    },
  })
}

// ========== Subscriptions ==========

export function useSubscriptions(params?: { contactId?: string; courseId?: string; status?: string }) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.subscriptions.list(keyParams),
    queryFn: () => fetchSubscriptions(params),
  })
}

export function useCreateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createSubscription(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all })
    },
  })
}

export function useUpdateSubscription() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateSubscription(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.subscriptions.all })
    },
  })
}

// ========== Payment Checks ==========

export function usePaymentChecks(params?: { year?: number; month?: number; isConfirmed?: boolean }) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.paymentChecks.list(keyParams),
    queryFn: () => fetchPaymentChecks(params),
  })
}

export function useUpsertPaymentCheck() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => upsertPaymentCheck(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentChecks.all })
    },
  })
}

export function useGeneratePaymentChecks() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { year: number; month: number }) => generatePaymentChecks(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.paymentChecks.all })
    },
  })
}

// ========== Partners ==========

export function usePartners() {
  return useQuery({
    queryKey: queryKeys.partners.all,
    queryFn: fetchPartners,
  })
}

export function usePartner(id: string) {
  return useQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: () => fetchPartnerById(id),
    enabled: !!id,
  })
}

export function useCreatePartner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createPartner(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}

export function useUpdatePartner() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updatePartner(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}

export function useAddPartnerContact() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: string; data: { contactId: string; role?: string } }) =>
      addPartnerContact(partnerId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}

export function useAddPartnerBusiness() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ partnerId, data }: { partnerId: string; data: { businessId: string } }) =>
      addPartnerBusiness(partnerId, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}

// ========== Tickets ==========

export function useTickets(params?: { status?: string; priority?: string; assigneeId?: string; isArchived?: boolean }) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.tickets.list(keyParams),
    queryFn: () => fetchTickets(params),
  })
}

export function useTicket(id: string) {
  return useQuery({
    queryKey: queryKeys.tickets.detail(id),
    queryFn: () => fetchTicketById(id),
    enabled: !!id,
  })
}

export function useCreateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createTicket(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all })
    },
  })
}

export function useUpdateTicket() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateTicket(id, data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.all })
    },
  })
}

export function useAddTicketComment() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ ticketId, data }: { ticketId: string; data: { content: string; authorId: string } }) =>
      addTicketComment(ticketId, data),
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.tickets.detail(vars.ticketId) })
    },
  })
}

// ========== Contact Meetings ==========

export function useContactMeetings(contactId: string) {
  return useQuery({
    queryKey: queryKeys.contactMeetings.list(contactId),
    queryFn: () => fetchContactMeetings(contactId),
    enabled: !!contactId,
  })
}

export function useCreateContactMeeting() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ contactId, data }: { contactId: string; data: { date: string; summary: string } }) =>
      createContactMeeting(contactId, data),
    onSettled: (_d, _e, vars) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.contactMeetings.list(vars.contactId) })
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.detail(vars.contactId) })
    },
  })
}

// ========== CRM Tags ==========

export function useCrmTags() {
  return useQuery({
    queryKey: queryKeys.crmTags.all,
    queryFn: fetchCrmTags,
  })
}

export function useCreateCrmTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => createCrmTag(data),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crmTags.all })
    },
  })
}

export function useDeleteCrmTag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteCrmTag(id),
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.crmTags.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.contacts.all })
      queryClient.invalidateQueries({ queryKey: queryKeys.partners.all })
    },
  })
}
