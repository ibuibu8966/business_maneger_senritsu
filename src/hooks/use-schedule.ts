import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  fetchScheduleEvents,
  createScheduleEvent,
  updateScheduleEvent,
  deleteScheduleEvent,
  updateEventParticipants,
  fetchEmployees,
  createEmployee,
  updateEmployee,
  deleteEmployee,
} from "@/lib/api"

export const scheduleKeys = {
  events: {
    all: ["scheduleEvents"] as const,
    list: (params?: Record<string, string | undefined>) => ["scheduleEvents", params] as const,
  },
  employees: {
    all: ["employees"] as const,
  },
}

export function useScheduleEvents(params?: {
  startFrom?: string
  startTo?: string
  employeeId?: string
  eventType?: string
}) {
  return useQuery({
    queryKey: scheduleKeys.events.list(params as Record<string, string | undefined>),
    queryFn: () => fetchScheduleEvents(params),
  })
}

export function useEmployees() {
  return useQuery({
    queryKey: scheduleKeys.employees.all,
    queryFn: fetchEmployees,
  })
}

export function useCreateScheduleEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createScheduleEvent(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.events.all })
    },
  })
}

export function useUpdateScheduleEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateScheduleEvent(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.events.all })
    },
  })
}

export function useDeleteScheduleEvent() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteScheduleEvent(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.events.all })
    },
  })
}

export function useUpdateEventParticipants() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, participantIds }: { id: string; participantIds: string[] }) =>
      updateEventParticipants(id, participantIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.events.all })
    },
  })
}

export function useCreateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) => createEmployee(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.employees.all })
    },
  })
}

export function useUpdateEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Record<string, unknown> }) =>
      updateEmployee(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.employees.all })
    },
  })
}

export function useDeleteEmployee() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => deleteEmployee(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: scheduleKeys.employees.all })
    },
  })
}
