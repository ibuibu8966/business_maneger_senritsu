import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  fetchBusinesses,
  fetchAccountDetails,
  fetchAccountById,
  fetchAccountSummary,
  fetchAccountTransactions,
  fetchLendings,
  createAccountDetail,
  updateAccountDetail,
  createAccountTransaction,
  updateAccountTransaction,
  createLendingRecord,
  updateLendingRecord,
  createLendingPayment,
  fetchAccountTags,
  createAccountTag,
  updateAccountTag,
  deleteAccountTag,
} from "@/lib/api"

// --- Query Hooks ---

export function useBusinesses() {
  return useQuery({
    queryKey: queryKeys.businesses.all,
    queryFn: fetchBusinesses,
  })
}

export function useAccountDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.accountDetails.detail(id),
    queryFn: () => fetchAccountById(id),
    enabled: !!id,
  })
}

export function useAccountDetails(params?: {
  ownerType?: string
  accountType?: string
  isArchived?: boolean
  isActive?: boolean
}) {
  return useQuery({
    queryKey: queryKeys.accountDetails.all,
    queryFn: () => fetchAccountDetails(params),
  })
}

export function useAccountSummary() {
  return useQuery({
    queryKey: queryKeys.accountSummary.all,
    queryFn: fetchAccountSummary,
  })
}

export function useAccountTransactions(params?: {
  accountId?: string
  type?: string
  dateFrom?: string
  dateTo?: string
  isArchived?: boolean
}) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.accountTransactions.list(keyParams),
    queryFn: () => fetchAccountTransactions(params),
  })
}

export function useLendings(params?: {
  accountId?: string
  type?: string
  status?: string
  isArchived?: boolean
}) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.lendings.list(keyParams),
    queryFn: () => fetchLendings(params),
  })
}

// --- Mutation Hooks ---

export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAccountDetail(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountSummary.all })
    },
  })
}

export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAccountDetail(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountSummary.all })
    },
  })
}

export function useCreateAccountTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createAccountTransaction(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accountTransactions.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountSummary.all })
    },
  })
}

export function useUpdateAccountTransaction() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateAccountTransaction(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accountTransactions.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountSummary.all })
      qc.invalidateQueries({ queryKey: queryKeys.lendings.all })
    },
  })
}

export function useCreateLending() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createLendingRecord(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lendings.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountSummary.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountTransactions.all })
    },
  })
}

export function useUpdateLending() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateLendingRecord(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lendings.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountSummary.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountTransactions.all })
    },
  })
}

export function useCreateLendingPayment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createLendingPayment(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.lendings.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountSummary.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountTransactions.all })
    },
  })
}

// --- タグ ---

export function useAccountTags() {
  return useQuery({
    queryKey: queryKeys.accountTags.all,
    queryFn: fetchAccountTags,
  })
}

export function useCreateAccountTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; color?: string }) => createAccountTag(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accountTags.all })
    },
  })
}

export function useUpdateAccountTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name?: string; color?: string } }) =>
      updateAccountTag(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accountTags.all })
      // タグ名変更時は口座・取引のタグも変わるため
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountTransactions.all })
    },
  })
}

export function useDeleteAccountTag() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteAccountTag(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.accountTags.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.accountTransactions.all })
    },
  })
}
