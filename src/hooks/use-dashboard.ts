import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  fetchAuditLogs,
  fetchDashboardLayout,
  updateDashboardLayout,
} from "@/lib/api"

export function useDashboardLayout() {
  return useQuery({
    queryKey: queryKeys.dashboardLayout.all,
    queryFn: fetchDashboardLayout,
  })
}

export function useUpdateDashboardLayout() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (layout: unknown[]) => updateDashboardLayout(layout),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.dashboardLayout.all })
    },
  })
}

export function useAuditLogs(params?: { entityType?: string; limit?: number }) {
  return useQuery({
    queryKey: queryKeys.auditLogs.all,
    queryFn: () => fetchAuditLogs(params),
  })
}
