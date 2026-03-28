"use client"

import { useState } from "react"
import { useSession } from "next-auth/react"
import { Button } from "@/components/ui/button"
import {
  useEmployees,
  useDeleteEmployee,
} from "@/hooks/use-schedule"
import type { EmployeeDTO } from "@/types/dto"
import { toast } from "sonner"
import { Plus, Pencil, Trash2 } from "lucide-react"
import { EmployeeModal } from "./employee-modal"

const ROLE_LABELS: Record<string, { label: string; className: string }> = {
  master_admin: {
    label: "マスター管理者",
    className: "text-xs px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 font-medium",
  },
  admin: {
    label: "管理者",
    className: "text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium",
  },
  employee: {
    label: "従業員",
    className: "text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground",
  },
}

export function EmployeeTable() {
  const { data: session } = useSession()
  const myRole = (session?.user as { role?: string } | undefined)?.role
  const { data: employees = [], isLoading } = useEmployees()
  const deleteMutation = useDeleteEmployee()

  const [modalOpen, setModalOpen] = useState(false)
  const [editTarget, setEditTarget] = useState<EmployeeDTO | null>(null)

  const openCreate = () => {
    setEditTarget(null)
    setModalOpen(true)
  }

  const openEdit = (emp: EmployeeDTO) => {
    setEditTarget(emp)
    setModalOpen(true)
  }

  const handleDelete = (emp: EmployeeDTO) => {
    if (!confirm(`「${emp.name}」を削除してよろしいですか？`)) return
    deleteMutation.mutate(emp.id, {
      onSuccess: () => toast.success("従業員を削除しました"),
      onError: () => toast.error("削除に失敗しました"),
    })
  }

  const canEditTarget = (emp: EmployeeDTO) => {
    if (emp.role === "master_admin" && myRole !== "master_admin") return false
    return true
  }

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">ユーザー管理</h2>
        <Button size="sm" onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1" />
          従業員追加
        </Button>
      </div>

      <div className="rounded-md border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50">
              <th className="px-4 py-2.5 text-left font-medium">名前</th>
              <th className="px-4 py-2.5 text-left font-medium">色</th>
              <th className="px-4 py-2.5 text-left font-medium">メール</th>
              <th className="px-4 py-2.5 text-left font-medium">ロール</th>
              <th className="px-4 py-2.5 text-right font-medium">操作</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  読み込み中...
                </td>
              </tr>
            ) : employees.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  従業員が登録されていません
                </td>
              </tr>
            ) : (
              employees.map((emp) => {
                const roleInfo = ROLE_LABELS[emp.role] ?? ROLE_LABELS.employee
                return (
                  <tr key={emp.id} className="border-b last:border-0 hover:bg-muted/30">
                    <td className="px-4 py-2.5 font-medium">{emp.name}</td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-4 h-4 rounded-full border"
                          style={{ backgroundColor: emp.color }}
                        />
                        <span className="text-muted-foreground text-xs">{emp.color}</span>
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-muted-foreground">
                      {emp.email ?? "—"}
                    </td>
                    <td className="px-4 py-2.5">
                      <span className={roleInfo.className}>{roleInfo.label}</span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      {canEditTarget(emp) && (
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0"
                            onClick={() => openEdit(emp)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive"
                            onClick={() => handleDelete(emp)}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      <EmployeeModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        employee={editTarget}
        myRole={myRole}
      />
    </div>
  )
}
