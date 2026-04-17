import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { GetAccountDetails } from "@/server/use-cases/get-account-details.use-case"
import { GetAccountTransactions } from "@/server/use-cases/get-account-transactions.use-case"
import { GetLendings } from "@/server/use-cases/get-lendings.use-case"
import { AccountDetailView } from "@/features/lending/components/account-detail-view"

export default async function AccountDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.accountDetails.detail(id),
      queryFn: () => GetAccountDetails.executeOne(id),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.accountTransactions.list({ accountId: id }),
      queryFn: () => GetAccountTransactions.execute({ accountId: id }),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.lendings.list({ accountId: id }),
      queryFn: () => GetLendings.execute({ accountId: id }),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <AccountDetailView accountId={id} />
    </HydrationBoundary>
  )
}
