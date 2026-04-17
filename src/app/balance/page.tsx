import { Suspense } from "react"
import {
  dehydrate,
  HydrationBoundary,
  QueryClient,
} from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import { GetAccountDetails } from "@/server/use-cases/get-account-details.use-case"
import { GetAccountTransactions } from "@/server/use-cases/get-account-transactions.use-case"
import { GetLendings } from "@/server/use-cases/get-lendings.use-case"
import { BalanceDashboard } from "@/features/lending/components/balance-dashboard"

export default async function BalancePage() {
  const queryClient = new QueryClient()

  await Promise.all([
    queryClient.prefetchQuery({
      queryKey: queryKeys.accountDetails.all,
      queryFn: () => GetAccountDetails.execute(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.accountSummary.all,
      queryFn: () => GetAccountDetails.getSummary(),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.accountTransactions.list(undefined),
      queryFn: () => GetAccountTransactions.execute({}),
    }),
    queryClient.prefetchQuery({
      queryKey: queryKeys.lendings.list(undefined),
      queryFn: () => GetLendings.execute(),
    }),
  ])

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <Suspense>
        <BalanceDashboard />
      </Suspense>
    </HydrationBoundary>
  )
}
