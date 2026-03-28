import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { PartnerDetailView } from "@/features/crm/components/partner-detail-view"
import { PartnerRepository } from "@/repositories/partner.repository"

export default async function PartnerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = new QueryClient()

  await queryClient.prefetchQuery({
    queryKey: queryKeys.partners.detail(id),
    queryFn: async () => {
      const p = await PartnerRepository.findById(id)
      if (!p) return null
      return {
        id: p.id,
        name: p.name,
        memo: p.memo ?? "",
        isArchived: p.isArchived,
        contacts: p.partnerContacts.map((pc) => ({
          contactId: pc.contact.id,
          contactName: pc.contact.name,
          role: pc.role ?? "",
        })),
        businesses: p.partnerBusinesses.map((pb) => ({
          businessId: pb.business.id,
          businessName: pb.business.name,
        })),
      }
    },
  })

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <PartnerDetailView partnerId={id} />
    </HydrationBoundary>
  )
}
