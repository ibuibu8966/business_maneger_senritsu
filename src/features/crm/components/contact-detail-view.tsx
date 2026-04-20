"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
// Native <select> used instead of Radix Select
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Archive,
  ArchiveRestore,
  Plus,
} from "lucide-react"
import { toast } from "sonner"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { useContact, useUpdateContact, useCreateSubscription, useUpdateSubscription, useSalons, useContactMeetings, useCreateContactMeeting } from "@/hooks/use-crm"
import { useBusinessTasks } from "@/hooks/use-business"
import {
  TASK_STATUS_CONFIG,
  PRIORITY_CONFIG,
  TOOL_CONFIG,
  type TaskStatus,
  type Priority,
  type TicketTool,
} from "@/features/business/components/mock-data"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import { TableSkeleton } from "@/components/skeletons/table-skeleton"
import type { ContactDTO, SubscriptionDTO } from "@/types/dto"

import type { PartnerAffiliation, ContactDetailData } from "./contact-detail/types"
import { METHOD_LABELS, STATUS_LABELS, TYPE_LABELS, TYPE_TO_API, METHOD_TO_API } from "./contact-detail/constants"

// --- Component ---

interface Props {
  contactId: string
}

export function ContactDetailView({ contactId }: Props) {
  const router = useRouter()
  const { data: rawData, isLoading } = useContact(contactId)
  const contact = rawData as ContactDetailData | undefined
  const updateContactMutation = useUpdateContact()

  // Edit state
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editRealName, setEditRealName] = useState("")
  const [editNicknamesInput, setEditNicknamesInput] = useState("")
  const [editType, setEditType] = useState("")
  const [editOccupation, setEditOccupation] = useState("")
  const [editAge, setEditAge] = useState("")
  const [editEmail, setEditEmail] = useState("")
  const [editPhone, setEditPhone] = useState("")
  const [editLineId, setEditLineId] = useState("")
  const [editDiscordId, setEditDiscordId] = useState("")
  const [editInterests, setEditInterests] = useState("")
  const [editMindset, setEditMindset] = useState("")
  const [editMemo, setEditMemo] = useState("")
  const [editMemberpayId, setEditMemberpayId] = useState("")
  const [editRobotpayId, setEditRobotpayId] = useState("")
  const [editPaypalId, setEditPaypalId] = useState("")
  const [editNextMeetingDate, setEditNextMeetingDate] = useState("")

  // --- Add Subscription Dialog ---
  const [addSubOpen, setAddSubOpen] = useState(false)
  const [addSubCourseId, setAddSubCourseId] = useState("")
  const [addSubMethod, setAddSubMethod] = useState("その他")
  const [addSubStartDate, setAddSubStartDate] = useState("")
  const createSubMutation = useCreateSubscription()
  const { data: salons = [] } = useSalons()

  const allCourses = salons.flatMap(s => s.courses.filter(c => c.isActive).map(c => ({ ...c, salonName: s.name })))

  const handleAddSub = () => {
    if (!addSubCourseId) return
    createSubMutation.mutate({
      contactId, courseId: addSubCourseId, paymentMethod: METHOD_TO_API[addSubMethod] ?? addSubMethod, startDate: addSubStartDate || new Date().toISOString().split("T")[0],
    }, {
      onSuccess: () => {
        toast.success("サブスクを追加しました")
        setAddSubOpen(false)
        setAddSubCourseId("")
        setAddSubMethod("その他")
        setAddSubStartDate("")
      },
      onError: () => toast.error("サブスクの追加に失敗しました"),
    })
  }

  // --- タスク取得（この顧客に紐づくもの） ---
  const { data: contactTasks = [] } = useBusinessTasks({ contactId })

  // --- Meeting Notes ---
  const { data: meetings = [] } = useContactMeetings(contactId)
  const createMeetingMutation = useCreateContactMeeting()
  const [addMeetingOpen, setAddMeetingOpen] = useState(false)
  const [addMeetingDate, setAddMeetingDate] = useState("")
  const [addMeetingSummary, setAddMeetingSummary] = useState("")

  // --- Subscription inline edit ---
  const updateSubMutation = useUpdateSubscription()
  const [subEditId, setSubEditId] = useState<string | null>(null)
  const [subEditField, setSubEditField] = useState<string | null>(null)
  const [subEditValue, setSubEditValue] = useState("")

  const startSubEdit = (id: string, field: string, value: string) => {
    setSubEditId(id)
    setSubEditField(field)
    setSubEditValue(value)
  }

  const cancelSubEdit = () => {
    setSubEditId(null)
    setSubEditField(null)
    setSubEditValue("")
  }

  const handleSubSelectChange = (value: string) => {
    if (!subEditId || !subEditField) return
    let data: Record<string, unknown> = {}
    if (subEditField === "isExempt") {
      data = { isExempt: value === "exempt" }
    } else if (subEditField === "discordRoleAssigned") {
      data = { discordRoleAssigned: value === "assigned" }
    } else {
      data = { [subEditField]: value }
    }
    updateSubMutation.mutate({ id: subEditId, data })
    cancelSubEdit()
  }

  const handleSubTextSave = () => {
    if (!subEditId || !subEditField) return
    updateSubMutation.mutate({ id: subEditId, data: { [subEditField]: subEditValue || null } })
    cancelSubEdit()
  }

  const isSubEditing = (id: string, field: string) => subEditId === id && subEditField === field

  const SubInlineSelect = ({ id, field, value, items }: { id: string; field: string; value: string; items: { id: string; label: string }[] }) => (
    <select
      autoFocus
      className="flex h-8 rounded-md border border-input bg-transparent px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
      value={value}
      onChange={(e) => handleSubSelectChange(e.target.value)}
      onBlur={() => { setTimeout(() => cancelSubEdit(), 150) }}
    >
      {items.map(item => (
        <option key={item.id} value={item.id}>{item.label}</option>
      ))}
    </select>
  )

  const handleAddMeeting = () => {
    if (!addMeetingDate) return
    createMeetingMutation.mutate({
      contactId, data: { date: addMeetingDate, summary: addMeetingSummary },
    }, {
      onSuccess: () => {
        toast.success("面談メモを追加しました")
        setAddMeetingOpen(false)
        setAddMeetingDate("")
        setAddMeetingSummary("")
      },
      onError: () => toast.error("面談メモの追加に失敗しました"),
    })
  }

  useEffect(() => {
    if (contact) {
      setEditName(contact.name)
      setEditRealName(contact.realName ?? "")
      setEditNicknamesInput((contact.nicknames ?? []).join(", "))
      setEditType(TYPE_LABELS[contact.type] ?? contact.type)
      setEditOccupation(contact.occupation ?? "")
      setEditAge(contact.age != null ? String(contact.age) : "")
      setEditEmail(contact.email ?? "")
      setEditPhone(contact.phone ?? "")
      setEditLineId(contact.lineId ?? "")
      setEditDiscordId(contact.discordId ?? "")
      setEditInterests(contact.interests ?? "")
      setEditMindset(contact.mindset ?? "")
      setEditMemo(contact.memo ?? "")
      setEditMemberpayId(contact.memberpayId ?? "")
      setEditRobotpayId(contact.robotpayId ?? "")
      setEditPaypalId(contact.paypalId ?? "")
      setEditNextMeetingDate(contact.nextMeetingDate ? contact.nextMeetingDate.split("T")[0] : "")
    }
  }, [contact])

  const startEditing = () => setEditing(true)

  const cancelEditing = () => {
    if (contact) {
      setEditName(contact.name)
      setEditRealName(contact.realName ?? "")
      setEditNicknamesInput((contact.nicknames ?? []).join(", "))
      setEditType(TYPE_LABELS[contact.type] ?? contact.type)
      setEditOccupation(contact.occupation ?? "")
      setEditAge(contact.age != null ? String(contact.age) : "")
      setEditEmail(contact.email ?? "")
      setEditPhone(contact.phone ?? "")
      setEditLineId(contact.lineId ?? "")
      setEditDiscordId(contact.discordId ?? "")
      setEditInterests(contact.interests ?? "")
      setEditMindset(contact.mindset ?? "")
      setEditMemo(contact.memo ?? "")
      setEditMemberpayId(contact.memberpayId ?? "")
      setEditRobotpayId(contact.robotpayId ?? "")
      setEditPaypalId(contact.paypalId ?? "")
      setEditNextMeetingDate(contact.nextMeetingDate ? contact.nextMeetingDate.split("T")[0] : "")
    }
    setEditing(false)
  }

  const saveEditing = () => {
    const nicknames = editNicknamesInput
      .split(/[,、,\n]/)
      .map((s) => s.trim())
      .filter(Boolean)
    updateContactMutation.mutate(
      {
        id: contactId,
        data: {
          name: editName,
          realName: editRealName,
          nicknames,
          type: TYPE_TO_API[editType] ?? editType,
          occupation: editOccupation,
          age: editAge ? Number(editAge) : null,
          email: editEmail,
          phone: editPhone,
          lineId: editLineId,
          discordId: editDiscordId,
          interests: editInterests,
          mindset: editMindset,
          memo: editMemo,
          memberpayId: editMemberpayId,
          robotpayId: editRobotpayId,
          paypalId: editPaypalId,
          nextMeetingDate: editNextMeetingDate || null,
        },
      },
      {
        onSuccess: () => {
          toast.success("保存しました")
          setEditing(false)
        },
        onError: () => toast.error("保存に失敗しました"),
      },
    )
  }

  if (isLoading) {
    return (
      <div className="p-4 space-y-4 overflow-auto">
        <CardSkeleton count={1} />
        <TableSkeleton rows={5} columns={6} />
        <TableSkeleton rows={3} columns={6} />
      </div>
    )
  }

  if (!contact) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">連絡先が見つかりません</p>
        <Button
          variant="ghost"
          className="mt-2"
          onClick={() => router.push("/crm/contacts")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/contacts")}
            className="h-7 gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            戻る
          </Button>
          <h2 className="text-lg font-bold">{contact.name}</h2>
          <Badge variant="outline" className="text-xs">
            {TYPE_LABELS[contact.type] ?? contact.type}
          </Badge>
          {contact.isArchived && (
            <Badge
              variant="outline"
              className="text-xs text-muted-foreground"
            >
              アーカイブ済み
            </Badge>
          )}
        </div>
        <Button
          size="sm"
          variant="outline"
          className="h-7 text-xs gap-1"
          onClick={() => {
            const next = !contact.isArchived
            updateContactMutation.mutate(
              { id: contactId, data: { isArchived: next } },
              {
                onSuccess: () =>
                  toast.success(
                    next ? "アーカイブしました" : "アーカイブを解除しました",
                  ),
                onError: () => toast.error("操作に失敗しました"),
              },
            )
          }}
        >
          {contact.isArchived ? (
            <ArchiveRestore className="h-3.5 w-3.5" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
          {contact.isArchived ? "アーカイブ解除" : "アーカイブ"}
        </Button>
      </div>

      {/* 基本情報カード */}
      <Card>
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">基本情報</CardTitle>
          {!editing ? (
            <Button
              size="sm"
              variant="ghost"
              onClick={startEditing}
              className="h-7 text-xs gap-1"
            >
              <Pencil className="h-3.5 w-3.5" />
              編集
            </Button>
          ) : (
            <div className="flex gap-1">
              <Button
                size="sm"
                variant="ghost"
                onClick={saveEditing}
                className="h-7 text-xs gap-1"
                disabled={updateContactMutation.isPending}
              >
                <Check className="h-3.5 w-3.5" />
                保存
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={cancelEditing}
                className="h-7 text-xs gap-1"
              >
                <X className="h-3.5 w-3.5" />
                取消
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <div className="grid grid-cols-3 gap-3 mb-3">
            {/* 名前（表示用） */}
            <div>
              <p className="text-xs text-muted-foreground">名前（表示用）</p>
              {editing ? (
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.name}</p>
              )}
            </div>
            {/* 本名 */}
            <div>
              <p className="text-xs text-muted-foreground">本名</p>
              {editing ? (
                <Input
                  value={editRealName}
                  onChange={(e) => setEditRealName(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.realName || "-"}</p>
              )}
            </div>
            {/* ニックネーム */}
            <div>
              <p className="text-xs text-muted-foreground">ニックネーム（カンマ区切り）</p>
              {editing ? (
                <Input
                  value={editNicknamesInput}
                  onChange={(e) => setEditNicknamesInput(e.target.value)}
                  placeholder="例: kuma, くまさん"
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{(contact.nicknames ?? []).length > 0 ? (contact.nicknames ?? []).join(", ") : "-"}</p>
              )}
            </div>
            {/* 種別 */}
            <div>
              <p className="text-xs text-muted-foreground">種別</p>
              {editing ? (
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={editType} onChange={(e) => setEditType(e.target.value)}>
                  <option value="サロン生">サロン生</option>
                  <option value="取引先">取引先</option>
                </select>
              ) : (
                <p className="text-sm font-medium">
                  {TYPE_LABELS[contact.type] ?? contact.type}
                </p>
              )}
            </div>
            {/* 職業 */}
            <div>
              <p className="text-xs text-muted-foreground">職業</p>
              {editing ? (
                <Input
                  value={editOccupation}
                  onChange={(e) => setEditOccupation(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">
                  {contact.occupation || "-"}
                </p>
              )}
            </div>
            {/* 年齢 */}
            <div>
              <p className="text-xs text-muted-foreground">年齢</p>
              {editing ? (
                <Input
                  type="number"
                  value={editAge}
                  onChange={(e) => setEditAge(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">
                  {contact.age != null ? `${contact.age}歳` : "-"}
                </p>
              )}
            </div>
            {/* メール */}
            <div>
              <p className="text-xs text-muted-foreground">メール</p>
              {editing ? (
                <Input
                  type="email"
                  value={editEmail}
                  onChange={(e) => setEditEmail(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.email || "-"}</p>
              )}
            </div>
            {/* 電話 */}
            <div>
              <p className="text-xs text-muted-foreground">電話</p>
              {editing ? (
                <Input
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.phone || "-"}</p>
              )}
            </div>
            {/* LINE ID */}
            <div>
              <p className="text-xs text-muted-foreground">ライン名</p>
              {editing ? (
                <Input
                  value={editLineId}
                  onChange={(e) => setEditLineId(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.lineId || "-"}</p>
              )}
            </div>
            {/* Discord ID */}
            <div>
              <p className="text-xs text-muted-foreground">Discord ID</p>
              {editing ? (
                <Input
                  value={editDiscordId}
                  onChange={(e) => setEditDiscordId(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">
                  {contact.discordId || "-"}
                </p>
              )}
            </div>
            {/* メンバーペイID */}
            <div>
              <p className="text-xs text-muted-foreground">メンバーペイID</p>
              {editing ? (
                <Input
                  value={editMemberpayId}
                  onChange={(e) => setEditMemberpayId(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.memberpayId || "-"}</p>
              )}
            </div>
            {/* ロボットペイID */}
            <div>
              <p className="text-xs text-muted-foreground">ロボットペイID</p>
              {editing ? (
                <Input
                  value={editRobotpayId}
                  onChange={(e) => setEditRobotpayId(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.robotpayId || "-"}</p>
              )}
            </div>
            {/* PayPal ID */}
            <div>
              <p className="text-xs text-muted-foreground">PayPal ID</p>
              {editing ? (
                <Input
                  value={editPaypalId}
                  onChange={(e) => setEditPaypalId(e.target.value)}
                  className="h-8 text-sm mt-1"
                />
              ) : (
                <p className="text-sm font-medium">{contact.paypalId || "-"}</p>
              )}
            </div>
          </div>

          {/* interests / mindset / memo */}
          <div className="grid grid-cols-3 gap-3 pt-2 border-t">
            <div>
              <p className="text-xs text-muted-foreground mb-1">興味・関心</p>
              {editing ? (
                <Textarea
                  value={editInterests}
                  onChange={(e) => setEditInterests(e.target.value)}
                  className="text-sm min-h-[56px]"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {contact.interests || "-"}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">考え方</p>
              {editing ? (
                <Textarea
                  value={editMindset}
                  onChange={(e) => setEditMindset(e.target.value)}
                  className="text-sm min-h-[56px]"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {contact.mindset || "-"}
                </p>
              )}
            </div>
            <div>
              <p className="text-xs text-muted-foreground mb-1">メモ</p>
              {editing ? (
                <Textarea
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  className="text-sm min-h-[56px]"
                />
              ) : (
                <p className="text-sm whitespace-pre-wrap">
                  {contact.memo || "-"}
                </p>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* サブスクリプション */}
      <Card>
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">サブスクリプション</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setAddSubOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />追加
          </Button>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>コース</TableHead>
                <TableHead>サロン</TableHead>
                <TableHead>決済方法</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>免除</TableHead>
                <TableHead>Discordロール</TableHead>
                <TableHead>開始日</TableHead>
                <TableHead>終了日</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contact.subscriptions?.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="text-sm font-medium">
                    {s.courseName}
                  </TableCell>
                  <TableCell className="text-sm">{s.salonName}</TableCell>
                  <TableCell className="text-sm" onDoubleClick={() => startSubEdit(s.id, "paymentMethod", s.paymentMethod)}>
                    {isSubEditing(s.id, "paymentMethod") ? (
                      <SubInlineSelect id={s.id} field="paymentMethod" value={s.paymentMethod} items={[
                        { id: "memberpay", label: "メンバーペイ" },
                        { id: "robotpay", label: "ロボットペイ" },
                        { id: "paypal", label: "PayPal" },
                        { id: "univpay", label: "UnivaPay" },
                        { id: "other", label: "その他" },
                      ]} />
                    ) : (
                      METHOD_LABELS[s.paymentMethod] ?? s.paymentMethod
                    )}
                  </TableCell>
                  <TableCell onDoubleClick={() => startSubEdit(s.id, "status", s.status)}>
                    {isSubEditing(s.id, "status") ? (
                      <SubInlineSelect id={s.id} field="status" value={s.status} items={[
                        { id: "active", label: "有効" },
                        { id: "cancelled", label: "解約" },
                      ]} />
                    ) : (
                      <Badge variant="outline" className={cn("text-xs", s.status === "active" && "border-emerald-300 dark:border-emerald-700 text-emerald-700 dark:text-emerald-300", s.status === "cancelled" && "border-red-300 dark:border-red-700 text-red-700 dark:text-red-300")}>
                        {STATUS_LABELS[s.status] ?? s.status}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell onDoubleClick={() => startSubEdit(s.id, "isExempt", s.isExempt ? "exempt" : "not_exempt")}>
                    {isSubEditing(s.id, "isExempt") ? (
                      <SubInlineSelect id={s.id} field="isExempt" value={s.isExempt ? "exempt" : "not_exempt"} items={[
                        { id: "exempt", label: "免除" },
                        { id: "not_exempt", label: "-" },
                      ]} />
                    ) : (
                      s.isExempt ? <Badge variant="outline" className="text-xs text-amber-600 dark:text-amber-400 border-amber-300 dark:border-amber-700">免除</Badge> : <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.discordRoleAssigned ? (
                      <Badge
                        variant="outline"
                        className="text-xs border-blue-300 dark:border-blue-700 text-blue-700 dark:text-blue-300"
                      >
                        {s.discordRoleName || "付与済み"}
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(s.startDate)}
                  </TableCell>
                  <TableCell className="text-sm">
                    {s.endDate ? formatDate(s.endDate) : "-"}
                  </TableCell>
                </TableRow>
              ))}
              {(!contact.subscriptions ||
                contact.subscriptions.length === 0) && (
                <TableRow>
                  <TableCell
                    colSpan={8}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    サブスクリプションなし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* タスク（この顧客に紐づくもの） */}
      <Card>
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">タスク</CardTitle>
          <Link href="/business/tasks">
            <Button size="sm" variant="ghost" className="h-7 text-xs gap-1 cursor-pointer">
              タスク画面で追加 →
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイトル</TableHead>
                <TableHead>プロジェクト</TableHead>
                <TableHead>ツール</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>ステータス</TableHead>
                <TableHead>期限</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {contactTasks.map((t: any) => {
                const st = TASK_STATUS_CONFIG[t.status as TaskStatus]
                const pri = PRIORITY_CONFIG[t.priority as Priority]
                return (
                  <TableRow key={t.id}>
                    <TableCell className="text-sm font-medium">
                      {t.title}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.projectName ?? "-"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.tool && TOOL_CONFIG[t.tool as TicketTool] ? TOOL_CONFIG[t.tool as TicketTool].emoji + " " + TOOL_CONFIG[t.tool as TicketTool].label : "-"}
                    </TableCell>
                    <TableCell>
                      {pri && (
                        <Badge variant="outline" className={cn("text-xs", pri.className)}>
                          {pri.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      {st && (
                        <Badge variant="outline" className={cn("text-xs", st.className)}>
                          {st.label}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {t.deadline ?? "-"}
                    </TableCell>
                  </TableRow>
                )
              })}
              {contactTasks.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    タスクなし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 取引先所属 */}
      {contact.partnerAffiliations &&
        contact.partnerAffiliations.length > 0 && (
          <Card>
            <CardHeader className="p-3 pb-1">
              <CardTitle className="text-sm font-medium">所属取引先</CardTitle>
            </CardHeader>
            <CardContent className="p-3 pt-0">
              <div className="flex flex-wrap gap-2">
                {contact.partnerAffiliations.map((pa) => (
                  <Link
                    key={pa.partnerId}
                    href={`/crm/partners/${pa.partnerId}`}
                  >
                    <Badge
                      variant="outline"
                      className="text-xs cursor-pointer hover:bg-accent"
                    >
                      {pa.partnerName}
                      {pa.role && (
                        <span className="ml-1 text-muted-foreground">
                          ({pa.role})
                        </span>
                      )}
                    </Badge>
                  </Link>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

      {/* 面談メモ */}
      <Card>
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">面談メモ</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setAddMeetingOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />面談追加
          </Button>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          {/* 次回面談予定 */}
          <div className="mb-3 flex items-start justify-between">
            <div>
              <p className="text-xs text-muted-foreground">次回面談予定</p>
              {editing ? (
                <Input
                  type="date"
                  value={editNextMeetingDate}
                  onChange={(e) => setEditNextMeetingDate(e.target.value)}
                  className="h-8 text-sm mt-1 w-48"
                />
              ) : (
                <p className="text-sm font-medium">
                  {contact.nextMeetingDate ? formatDate(contact.nextMeetingDate) : "未定"}
                </p>
              )}
            </div>
            <div className="flex items-center gap-2">
              <Label htmlFor="final-meeting" className="text-xs text-muted-foreground">最終面談（次回不要）</Label>
              <Switch
                id="final-meeting"
                checked={!!contact.isFinalMeeting}
                onCheckedChange={(checked) => {
                  updateContactMutation.mutate({ id: contact.id, data: { isFinalMeeting: checked } })
                }}
              />
            </div>
          </div>
          {/* 面談履歴 */}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-32">日付</TableHead>
                <TableHead>要約</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {meetings.map((m) => (
                <TableRow key={m.id}>
                  <TableCell className="text-sm">{formatDate(m.date)}</TableCell>
                  <TableCell className="text-sm whitespace-pre-wrap">{m.summary || "-"}</TableCell>
                </TableRow>
              ))}
              {meetings.length === 0 && (
                <TableRow>
                  <TableCell colSpan={2} className="text-center text-sm text-muted-foreground py-6">
                    面談記録なし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* サブスク追加ダイアログ */}
      <Dialog open={addSubOpen} onOpenChange={setAddSubOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>サブスクリプション追加</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">コース</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addSubCourseId} onChange={(e) => setAddSubCourseId(e.target.value)}>
                <option value="">コースを選択...</option>
                {allCourses.map(c => (
                  <option key={c.id} value={c.id}>{c.salonName} - {c.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">決済方法</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addSubMethod} onChange={(e) => setAddSubMethod(e.target.value)}>
                <option value="メンバーペイ">メンバーペイ</option>
                <option value="ロボットペイ">ロボットペイ</option>
                <option value="PayPal">PayPal</option>
                <option value="UnivaPay">UnivaPay</option>
                <option value="その他">その他</option>
              </select>
            </div>
            <div>
              <Label className="text-xs">開始日</Label>
              <Input type="date" value={addSubStartDate} onChange={(e) => setAddSubStartDate(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setAddSubOpen(false)} className="h-7 text-xs">キャンセル</Button>
              <Button size="sm" onClick={handleAddSub} disabled={!addSubCourseId || createSubMutation.isPending} className="h-7 text-xs">追加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>


      {/* 面談メモ追加ダイアログ */}
      <Dialog open={addMeetingOpen} onOpenChange={setAddMeetingOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>面談メモ追加</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">面談日 *</Label>
              <Input type="date" value={addMeetingDate} onChange={(e) => setAddMeetingDate(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">要約</Label>
              <Textarea value={addMeetingSummary} onChange={(e) => setAddMeetingSummary(e.target.value)} className="text-sm min-h-[80px] mt-1" placeholder="面談の要約を入力..." />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setAddMeetingOpen(false)} className="h-7 text-xs">キャンセル</Button>
              <Button size="sm" onClick={handleAddMeeting} disabled={!addMeetingDate || createMeetingMutation.isPending} className="h-7 text-xs">追加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
