import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import { queryKeys } from "@/lib/query-keys"
import {
  fetchBusinessDetails, fetchBusinessById, createBusiness, updateBusiness, deleteBusiness,
  fetchProjects, fetchProjectById, createProject, updateProject, deleteProject,
  fetchBusinessTasks, createBusinessTask, updateBusinessTask, deleteBusinessTask, reorderBusinessTasks,
  fetchBusinessIssues, createBusinessIssue, updateBusinessIssue, deleteBusinessIssue, addBusinessIssueNote,
  fetchBusinessMemos, createBusinessMemo, deleteBusinessMemo,
  addTaskChecklistItem, updateTaskChecklistItem, deleteTaskChecklistItem,
  fetchChecklistTemplates, createChecklistTemplate, updateChecklistTemplate, deleteChecklistTemplate, applyChecklistTemplate,
} from "@/lib/api"

// ========== Businesses ==========

export function useBusinessDetails() {
  return useQuery({
    queryKey: queryKeys.businessDetails.all,
    queryFn: fetchBusinessDetails,
  })
}

export function useBusinessDetail(id: string) {
  return useQuery({
    queryKey: queryKeys.businessDetails.detail(id),
    queryFn: () => fetchBusinessById(id),
    enabled: !!id,
  })
}

export function useCreateBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createBusiness(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessDetails.all })
    },
  })
}

export function useUpdateBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateBusiness(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.projects.all })
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
      qc.invalidateQueries({ queryKey: queryKeys.businessIssues.all })
    },
  })
}

export function useDeleteBusiness() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBusiness(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessDetails.all })
      qc.invalidateQueries({ queryKey: queryKeys.projects.all })
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

// ========== Projects ==========

export function useProjects(params?: { businessId?: string }) {
  const keyParams: Record<string, string> | undefined = params?.businessId
    ? { businessId: params.businessId }
    : undefined

  return useQuery({
    queryKey: queryKeys.projects.list(keyParams),
    queryFn: () => fetchProjects(params),
  })
}

export function useProject(id: string) {
  return useQuery({
    queryKey: queryKeys.projects.detail(id),
    queryFn: () => fetchProjectById(id),
    enabled: !!id,
  })
}

export function useCreateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createProject(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useUpdateProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateProject(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

export function useDeleteProject() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.projects.all })
    },
  })
}

// ========== Business Tasks ==========

export function useBusinessTasks(params?: { projectId?: string; assigneeId?: string; contactId?: string; issueId?: string }) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.businessTasks.list(keyParams),
    queryFn: () => fetchBusinessTasks(params),
  })
}

export function useCreateBusinessTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createBusinessTask(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

export function useUpdateBusinessTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateBusinessTask(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

export function useDeleteBusinessTask() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBusinessTask(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

export function useReorderBusinessTasks() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { taskIds: string[]; employeeId?: string }) =>
      reorderBusinessTasks(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

// ========== Business Issues ==========

export function useBusinessIssues(params?: { projectId?: string; status?: string; priority?: string }) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.businessIssues.list(keyParams),
    queryFn: () => fetchBusinessIssues(params),
  })
}

export function useCreateBusinessIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createBusinessIssue(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessIssues.all })
    },
  })
}

export function useUpdateBusinessIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateBusinessIssue(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessIssues.all })
    },
  })
}

export function useDeleteBusinessIssue() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBusinessIssue(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessIssues.all })
    },
  })
}

export function useAddBusinessIssueNote() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ issueId, data }: { issueId: string; data: { date: string; content: string; author?: string } }) =>
      addBusinessIssueNote(issueId, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessIssues.all })
    },
  })
}

// ========== Business Memos ==========

export function useBusinessMemos(params?: { businessId?: string; projectId?: string; issueId?: string }) {
  const keyParams: Record<string, string> | undefined = params
    ? Object.fromEntries(
        Object.entries(params)
          .filter(([, v]) => v !== undefined)
          .map(([k, v]) => [k, String(v)])
      )
    : undefined

  return useQuery({
    queryKey: queryKeys.businessMemos.list(keyParams),
    queryFn: () => fetchBusinessMemos(params),
    enabled: !!(params?.businessId || params?.projectId),
  })
}

export function useCreateBusinessMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { businessId?: string; projectId?: string; issueId?: string; date: string; content: string; author?: string }) =>
      createBusinessMemo(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessMemos.all })
    },
  })
}

export function useDeleteBusinessMemo() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteBusinessMemo(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessMemos.all })
    },
  })
}

// ========== Task Checklist ==========

export function useAddTaskChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { taskId: string; title: string; sortOrder?: number }) =>
      addTaskChecklistItem(data.taskId, { title: data.title, sortOrder: data.sortOrder }),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

export function useUpdateTaskChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, itemId, data }: { taskId: string; itemId: string; data: { title?: string; checked?: boolean; sortOrder?: number } }) =>
      updateTaskChecklistItem(taskId, itemId, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

export function useDeleteTaskChecklistItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, itemId }: { taskId: string; itemId: string }) =>
      deleteTaskChecklistItem(taskId, itemId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}

// ========== Checklist Templates ==========

export function useChecklistTemplates(businessId?: string) {
  const keyParams: Record<string, string> | undefined = businessId
    ? { businessId }
    : undefined

  return useQuery({
    queryKey: queryKeys.checklistTemplates.list(keyParams),
    queryFn: () => fetchChecklistTemplates(businessId),
  })
}

export function useCreateChecklistTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: { name: string; businessId?: string; items: { title: string; sortOrder: number }[] }) =>
      createChecklistTemplate(data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checklistTemplates.all })
    },
  })
}

export function useUpdateChecklistTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: { name: string; businessId?: string | null; items: { title: string; sortOrder: number }[] } }) =>
      updateChecklistTemplate(id, data),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checklistTemplates.all })
    },
  })
}

export function useDeleteChecklistTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteChecklistTemplate(id),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.checklistTemplates.all })
    },
  })
}

export function useApplyChecklistTemplate() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ taskId, templateId }: { taskId: string; templateId: string }) =>
      applyChecklistTemplate(taskId, templateId),
    onSettled: () => {
      qc.invalidateQueries({ queryKey: queryKeys.businessTasks.all })
    },
  })
}
