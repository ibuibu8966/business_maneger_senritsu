"use client"

import { useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Plus, Pencil } from "lucide-react"
import type { SalonDTO, SalonCourseDTO } from "@/types/dto"
import { useSalons, useCreateSalon, useUpdateSalon, useCreateCourse, useUpdateCourse } from "@/hooks/use-crm"
import { formatCurrency } from "@/lib/format"

export function SalonSettings() {
  const { data: salons = [], isLoading } = useSalons()
  const createSalonMutation = useCreateSalon()
  const updateSalonMutation = useUpdateSalon()
  const createCourseMutation = useCreateCourse()
  const updateCourseMutation = useUpdateCourse()

  const [salonModalOpen, setSalonModalOpen] = useState(false)
  const [editingSalon, setEditingSalon] = useState<SalonDTO | null>(null)
  const [courseModalOpen, setCourseModalOpen] = useState(false)
  const [editingCourse, setEditingCourse] = useState<SalonCourseDTO | null>(null)
  const [targetSalonId, setTargetSalonId] = useState("")

  const handleSaveSalon = (data: { name: string; isActive: boolean }) => {
    if (editingSalon) {
      updateSalonMutation.mutate({ id: editingSalon.id, data })
    } else {
      createSalonMutation.mutate(data)
    }
    setSalonModalOpen(false)
    setEditingSalon(null)
  }

  const handleSaveCourse = (data: { salonId: string; name: string; monthlyFee: number; discordRoleName: string; isActive: boolean }) => {
    if (editingCourse) {
      updateCourseMutation.mutate({ id: editingCourse.id, data })
    } else {
      createCourseMutation.mutate(data)
    }
    setCourseModalOpen(false)
    setEditingCourse(null)
  }

  if (isLoading) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">サロン・コース設定</h2>
        <Button size="sm" onClick={() => { setEditingSalon(null); setSalonModalOpen(true) }}>
          <Plus className="h-4 w-4 mr-1" />サロン追加
        </Button>
      </div>

      {salons.map((salon) => (
        <Card key={salon.id}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CardTitle className="text-base">{salon.name}</CardTitle>
                <Badge variant={salon.isActive ? "default" : "secondary"} className="text-xs">
                  {salon.isActive ? "有効" : "無効"}
                </Badge>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => { setEditingSalon(salon); setSalonModalOpen(true) }}>
                  <Pencil className="h-3.5 w-3.5 mr-1" />編集
                </Button>
                <Button variant="outline" size="sm" onClick={() => { setTargetSalonId(salon.id); setEditingCourse(null); setCourseModalOpen(true) }}>
                  <Plus className="h-3.5 w-3.5 mr-1" />コース追加
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {salon.courses.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>コース名</TableHead>
                    <TableHead>月額</TableHead>
                    <TableHead>Discordロール</TableHead>
                    <TableHead>状態</TableHead>
                    <TableHead className="w-10"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {salon.courses.map((course) => (
                    <TableRow key={course.id}>
                      <TableCell className="text-sm font-medium">{course.name}</TableCell>
                      <TableCell className="text-sm">{formatCurrency(course.monthlyFee)}</TableCell>
                      <TableCell className="text-sm">{course.discordRoleName || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={course.isActive ? "default" : "secondary"} className="text-xs">
                          {course.isActive ? "有効" : "無効"}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Button variant="ghost" size="icon" className="h-7 w-7"
                          onClick={() => { setTargetSalonId(salon.id); setEditingCourse(course); setCourseModalOpen(true) }}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <p className="text-sm text-muted-foreground py-4 text-center">コースがありません</p>
            )}
          </CardContent>
        </Card>
      ))}

      {salons.length === 0 && (
        <p className="text-center text-muted-foreground py-8">サロンがありません</p>
      )}

      {/* サロンダイアログ */}
      <SalonModal
        open={salonModalOpen}
        onOpenChange={(open) => { setSalonModalOpen(open); if (!open) setEditingSalon(null) }}
        salon={editingSalon}
        onSave={handleSaveSalon}
      />

      {/* コースダイアログ */}
      <CourseModal
        open={courseModalOpen}
        onOpenChange={(open) => { setCourseModalOpen(open); if (!open) setEditingCourse(null) }}
        course={editingCourse}
        salonId={targetSalonId}
        onSave={handleSaveCourse}
      />
    </div>
  )
}

function SalonModal({
  open, onOpenChange, salon, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  salon: SalonDTO | null
  onSave: (data: { name: string; isActive: boolean }) => void
}) {
  const [name, setName] = useState("")
  const [isActive, setIsActive] = useState(true)

  const handleOpenChange = (open: boolean) => {
    if (open && salon) {
      setName(salon.name)
      setIsActive(salon.isActive)
    } else if (open) {
      setName("")
      setIsActive(true)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{salon ? "サロン編集" : "新規サロン"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">サロン名 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <Button onClick={() => onSave({ name, isActive })} disabled={!name}>
            {salon ? "更新" : "登録"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}

function CourseModal({
  open, onOpenChange, course, salonId, onSave,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  course: SalonCourseDTO | null
  salonId: string
  onSave: (data: { salonId: string; name: string; monthlyFee: number; discordRoleName: string; isActive: boolean }) => void
}) {
  const [name, setName] = useState("")
  const [monthlyFee, setMonthlyFee] = useState("")
  const [discordRoleName, setDiscordRoleName] = useState("")
  const [isActive, setIsActive] = useState(true)

  const handleOpenChange = (open: boolean) => {
    if (open && course) {
      setName(course.name)
      setMonthlyFee(String(course.monthlyFee))
      setDiscordRoleName(course.discordRoleName)
      setIsActive(course.isActive)
    } else if (open) {
      setName(""); setMonthlyFee(""); setDiscordRoleName(""); setIsActive(true)
    }
    onOpenChange(open)
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{course ? "コース編集" : "新規コース"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label className="text-xs">コース名 *</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">月額</Label>
            <Input type="number" value={monthlyFee} onChange={(e) => setMonthlyFee(e.target.value)} className="h-8 text-sm" />
          </div>
          <div>
            <Label className="text-xs">Discordロール名</Label>
            <Input value={discordRoleName} onChange={(e) => setDiscordRoleName(e.target.value)} className="h-8 text-sm" placeholder="例: エキスパート" />
          </div>
          <Button
            onClick={() => onSave({ salonId, name, monthlyFee: Number(monthlyFee) || 0, discordRoleName, isActive })}
            disabled={!name}
          >
            {course ? "更新" : "登録"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
