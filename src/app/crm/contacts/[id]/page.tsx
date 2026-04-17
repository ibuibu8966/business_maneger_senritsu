import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { ContactDetailView } from "@/features/crm/components/contact-detail-view"
import { ContactRepository } from "@/server/repositories/contact.repository"

export default async function ContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: queryKeys.contacts.detail(id),
    queryFn: async () => {
      const c = await ContactRepository.findById(id)
      if (!c) return null
      return {
        id: c.id,
        name: c.name,
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
        isArchived: c.isArchived,
        createdAt: c.createdAt.toISOString(),
        subscriptions: c.subscriptions.map((s) => ({
          id: s.id,
          contactId: c.id,
          contactName: c.name,
          courseId: s.course.id,
          courseName: s.course.name,
          salonName: s.course.salon.name,
          paymentMethod: s.paymentMethod.toLowerCase(),
          paymentServiceId: s.paymentServiceId ?? "",
          discordRoleAssigned: s.discordRoleAssigned,
          discordRoleName: s.course.discordRoleName ?? "",
          status: s.status.toLowerCase(),
          startDate: s.startDate.toISOString().split("T")[0],
          endDate: s.endDate ? s.endDate.toISOString().split("T")[0] : null,
        })),
        partnerAffiliations: c.partnerContacts.map((pc) => ({
          partnerId: pc.partner.id,
          partnerName: pc.partner.name,
          role: pc.role ?? "",
        })),
      }
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <ContactDetailView contactId={id} />
    </HydrationBoundary>
  )
}
