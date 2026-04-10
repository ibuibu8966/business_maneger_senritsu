"use client"

import { useState, useEffect } from "react"
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
import { Label } from "@/components/ui/label"
// Native <select> used instead of Radix Select
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ArrowLeft,
  Pencil,
  Check,
  X,
  Archive,
  ArchiveRestore,
  Plus,
} from "lucide-react"
import { useTickets, useCreateTicket } from "@/hooks/use-crm"
import { useEmployees } from "@/hooks/use-schedule"
import { toast } from "sonner"
import { cn } from "@/lib/utils"
import {
  usePartner,
  useUpdatePartner,
  useAddPartnerContact,
  useAddPartnerBusiness,
  useContacts,
} from "@/hooks/use-crm"
import { useBusinesses } from "@/hooks/use-lending"
import { CardSkeleton } from "@/components/skeletons/card-skeleton"
import type { PartnerDTO } from "@/types/dto"

interface Props {
  partnerId: string
}

export function PartnerDetailView({ partnerId }: Props) {
  const router = useRouter()
  const { data: partner, isLoading } = usePartner(partnerId)
  const { data: contacts = [] } = useContacts()
  const { data: businesses = [] } = useBusinesses()

  const updatePartnerMutation = useUpdatePartner()
  const addContactMutation = useAddPartnerContact()
  const addBusinessMutation = useAddPartnerBusiness()

  // --- Inline Edit ---
  const [editing, setEditing] = useState(false)
  const [editName, setEditName] = useState("")
  const [editMemo, setEditMemo] = useState("")
  const [editBusinessDescription, setEditBusinessDescription] = useState("")
  const [editNeeds, setEditNeeds] = useState("")
  const [editRelationshipPlan, setEditRelationshipPlan] = useState("")

  useEffect(() => {
    if (partner) {
      setEditName(partner.name)
      setEditMemo(partner.memo)
      setEditBusinessDescription(partner.businessDescription ?? "")
      setEditNeeds(partner.needs ?? "")
      setEditRelationshipPlan(partner.relationshipPlan ?? "")
    }
  }, [partner])

  const startEditing = () => setEditing(true)
  const cancelEditing = () => {
    setEditName(partner?.name ?? "")
    setEditMemo(partner?.memo ?? "")
    setEditBusinessDescription(partner?.businessDescription ?? "")
    setEditNeeds(partner?.needs ?? "")
    setEditRelationshipPlan(partner?.relationshipPlan ?? "")
    setEditing(false)
  }
  const saveEditing = () => {
    updatePartnerMutation.mutate(
      { id: partnerId, data: { name: editName, memo: editMemo, businessDescription: editBusinessDescription, needs: editNeeds, relationshipPlan: editRelationshipPlan } },
      {
        onSuccess: () => {
          toast.success("保存しました")
          setEditing(false)
        },
        onError: () => toast.error("保存に失敗しました"),
      },
    )
  }

  // --- Add Contact Dialog ---
  const [addContactOpen, setAddContactOpen] = useState(false)
  const [addContactId, setAddContactId] = useState("")
  const [addContactRole, setAddContactRole] = useState("")

  const handleAddContact = () => {
    if (!addContactId) return
    addContactMutation.mutate(
      { partnerId, data: { contactId: addContactId, role: addContactRole } },
      {
        onSuccess: () => {
          toast.success("担当者を追加しました")
          setAddContactOpen(false)
          setAddContactId("")
          setAddContactRole("")
        },
        onError: () => toast.error("担当者の追加に失敗しました"),
      },
    )
  }

  // --- Add Business Dialog ---
  const [addBusinessOpen, setAddBusinessOpen] = useState(false)
  const [addBusinessId, setAddBusinessId] = useState("")

  // --- Tickets ---
  const { data: allTickets = [] } = useTickets({ isArchived: false })
  const partnerTickets = allTickets.filter(t => t.partnerId === partnerId)
  const createTicketMutation = useCreateTicket()
  const { data: employees = [] } = useEmployees()

  const [addTicketOpen, setAddTicketOpen] = useState(false)
  const [addTicketTitle, setAddTicketTitle] = useState("")
  const [addTicketAssigneeId, setAddTicketAssigneeId] = useState("")
  const [addTicketTool, setAddTicketTool] = useState("LINE")
  const [addTicketPriority, setAddTicketPriority] = useState("中")
  const [addTicketContent, setAddTicketContent] = useState("")
  const [addTicketContactId, setAddTicketContactId] = useState("")

  const handleAddTicket = () => {
    if (!addTicketTitle || !addTicketAssigneeId) return
    const toolMap: Record<string, string> = { "電話": "phone", "対面": "in_person" }
    const priorityMap: Record<string, string> = { "高": "high", "中": "medium", "低": "low" }
    createTicketMutation.mutate({
      title: addTicketTitle, partnerId, contactId: addTicketContactId || null,
      assigneeId: addTicketAssigneeId, tool: toolMap[addTicketTool] ?? addTicketTool.toLowerCase(), priority: priorityMap[addTicketPriority] ?? addTicketPriority,
      content: addTicketContent,
    }, {
      onSuccess: () => {
        toast.success("チケットを追加しました")
        setAddTicketOpen(false)
        setAddTicketTitle("")
        setAddTicketAssigneeId("")
        setAddTicketContent("")
        setAddTicketContactId("")
      },
      onError: () => toast.error("チケットの追加に失敗しました"),
    })
  }

  const handleAddBusiness = () => {
    if (!addBusinessId) return
    addBusinessMutation.mutate(
      { partnerId, data: { businessId: addBusinessId } },
      {
        onSuccess: () => {
          toast.success("事業を追加しました")
          setAddBusinessOpen(false)
          setAddBusinessId("")
        },
        onError: () => toast.error("事業の追加に失敗しました"),
      },
    )
  }

  // --- Loading ---
  if (isLoading) {
    return (
      <div className="p-4 space-y-4 overflow-auto">
        <CardSkeleton count={1} />
      </div>
    )
  }

  if (!partner) {
    return (
      <div className="p-4">
        <p className="text-muted-foreground">パートナーが見つかりません</p>
        <Button
          variant="ghost"
          className="mt-2"
          onClick={() => router.push("/crm/partners")}
        >
          <ArrowLeft className="h-4 w-4 mr-1" />
          戻る
        </Button>
      </div>
    )
  }

  // Filter out contacts already linked
  const linkedContactIds = new Set(partner.contacts.map((c) => c.contactId))
  const availableContacts = contacts.filter((c) => !linkedContactIds.has(c.id))

  // Filter out businesses already linked
  const linkedBusinessIds = new Set(partner.businesses.map((b) => b.businessId))
  const availableBusinesses = businesses.filter(
    (b) => !linkedBusinessIds.has(b.id),
  )

  return (
    <div className="p-4 space-y-4 overflow-auto">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push("/crm/partners")}
            className="h-7 gap-1"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            戻る
          </Button>
          <h2 className="text-lg font-bold">{partner.name}</h2>
          {partner.isArchived && (
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
            const next = !partner.isArchived
            updatePartnerMutation.mutate(
              { id: partnerId, data: { isArchived: next } },
              {
                onSuccess: () =>
                  toast.success(
                    next
                      ? "アーカイブしました"
                      : "アーカイブを解除しました",
                  ),
                onError: () => toast.error("操作に失敗しました"),
              },
            )
          }}
        >
          {partner.isArchived ? (
            <ArchiveRestore className="h-3.5 w-3.5" />
          ) : (
            <Archive className="h-3.5 w-3.5" />
          )}
          {partner.isArchived ? "アーカイブ解除" : "アーカイブ"}
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
                disabled={updatePartnerMutation.isPending}
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
        <CardContent className="p-3 pt-0 space-y-3">
          <div>
            <p className="text-xs text-muted-foreground mb-1">パートナー名</p>
            {editing ? (
              <Input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="パートナー名"
                className="text-sm h-8"
              />
            ) : (
              <p className="text-sm font-medium">{partner.name}</p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">メモ</p>
            {editing ? (
              <Textarea
                value={editMemo}
                onChange={(e) => setEditMemo(e.target.value)}
                placeholder="メモを入力..."
                className="text-sm min-h-[80px]"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {partner.memo || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">事業内容</p>
            {editing ? (
              <Textarea
                value={editBusinessDescription}
                onChange={(e) => setEditBusinessDescription(e.target.value)}
                placeholder="どういう事業をしているか..."
                className="text-sm min-h-[80px]"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {partner.businessDescription || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">要望</p>
            {editing ? (
              <Textarea
                value={editNeeds}
                onChange={(e) => setEditNeeds(e.target.value)}
                placeholder="何を望んでいるか..."
                className="text-sm min-h-[80px]"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {partner.needs || "-"}
              </p>
            )}
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">今後の付き合い方</p>
            {editing ? (
              <Textarea
                value={editRelationshipPlan}
                onChange={(e) => setEditRelationshipPlan(e.target.value)}
                placeholder="今後どういう付き合いをしたいか..."
                className="text-sm min-h-[80px]"
              />
            ) : (
              <p className="text-sm whitespace-pre-wrap">
                {partner.relationshipPlan || "-"}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* 担当者カード */}
      <Card>
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">担当者</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAddContactOpen(true)}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            担当者追加
          </Button>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>役割</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partner.contacts.map((c) => (
                <TableRow key={c.contactId}>
                  <TableCell className="text-sm">
                    <Link
                      href={`/crm/contacts/${c.contactId}`}
                      className="text-blue-600 hover:underline"
                    >
                      {c.contactName}
                    </Link>
                  </TableCell>
                  <TableCell className="text-sm">
                    {c.role || "-"}
                  </TableCell>
                </TableRow>
              ))}
              {partner.contacts.length === 0 && (
                <TableRow>
                  <TableCell
                    colSpan={2}
                    className="text-center text-sm text-muted-foreground py-6"
                  >
                    担当者なし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 事業カード */}
      <Card>
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">関連事業</CardTitle>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setAddBusinessOpen(true)}
            className="h-7 text-xs gap-1"
          >
            <Plus className="h-3.5 w-3.5" />
            事業追加
          </Button>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>事業名</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partner.businesses.map((b) => (
                <TableRow key={b.businessId}>
                  <TableCell className="text-sm font-medium">
                    {b.businessName}
                  </TableCell>
                </TableRow>
              ))}
              {partner.businesses.length === 0 && (
                <TableRow>
                  <TableCell className="text-center text-sm text-muted-foreground py-6">
                    関連事業なし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* チケットカード */}
      <Card>
        <CardHeader className="p-3 pb-1 flex flex-row items-center justify-between">
          <CardTitle className="text-sm font-medium">チケット</CardTitle>
          <Button size="sm" variant="ghost" onClick={() => setAddTicketOpen(true)} className="h-7 text-xs gap-1">
            <Plus className="h-3.5 w-3.5" />チケット追加
          </Button>
        </CardHeader>
        <CardContent className="p-3 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>タイトル</TableHead>
                <TableHead>担当者</TableHead>
                <TableHead>優先度</TableHead>
                <TableHead>ステータス</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {partnerTickets.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="text-sm font-medium">{t.title}</TableCell>
                  <TableCell className="text-sm">{t.assigneeName}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs",
                      t.priority === "high" && "border-red-300 text-red-700",
                      t.priority === "medium" && "border-yellow-300 text-yellow-700",
                    )}>
                      {t.priority === "high" ? "高" : t.priority === "medium" ? "中" : "低"}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={cn("text-xs",
                      t.status === "open" && "border-gray-300 dark:border-gray-600",
                      t.status === "waiting" && "border-yellow-300 text-yellow-700 dark:border-yellow-700 dark:text-yellow-300",
                      t.status === "in_progress" && "border-blue-300 text-blue-700 dark:border-blue-700 dark:text-blue-300",
                      t.status === "completed" && "border-emerald-300 text-emerald-700 dark:border-emerald-700 dark:text-emerald-300",
                    )}>
                      {t.status === "open" ? "未着手" : t.status === "waiting" ? "確認待ち" : t.status === "in_progress" ? "対応中" : "完了"}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
              {partnerTickets.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                    チケットなし
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* 担当者追加ダイアログ */}
      <Dialog open={addContactOpen} onOpenChange={setAddContactOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>担当者追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">担当者</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addContactId} onChange={(e) => setAddContactId(e.target.value)}>
                <option value="">担当者を選択...</option>
                {availableContacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">役割</Label>
              <Input
                value={addContactRole}
                onChange={(e) => setAddContactRole(e.target.value)}
                placeholder="例: 営業担当"
                className="text-sm h-8 mt-1"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddContactOpen(false)}
                className="h-7 text-xs"
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleAddContact}
                disabled={!addContactId || addContactMutation.isPending}
                className="h-7 text-xs"
              >
                追加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* 事業追加ダイアログ */}
      <Dialog open={addBusinessOpen} onOpenChange={setAddBusinessOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>事業追加</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">事業</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addBusinessId} onChange={(e) => setAddBusinessId(e.target.value)}>
                <option value="">事業を選択...</option>
                {availableBusinesses.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button
                size="sm"
                variant="outline"
                onClick={() => setAddBusinessOpen(false)}
                className="h-7 text-xs"
              >
                キャンセル
              </Button>
              <Button
                size="sm"
                onClick={handleAddBusiness}
                disabled={!addBusinessId || addBusinessMutation.isPending}
                className="h-7 text-xs"
              >
                追加
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* チケット追加ダイアログ */}
      <Dialog open={addTicketOpen} onOpenChange={setAddTicketOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader><DialogTitle>チケット追加</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div>
              <Label className="text-xs">タイトル *</Label>
              <Input value={addTicketTitle} onChange={(e) => setAddTicketTitle(e.target.value)} className="h-8 text-sm mt-1" />
            </div>
            <div>
              <Label className="text-xs">担当者 *</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addTicketAssigneeId} onChange={(e) => setAddTicketAssigneeId(e.target.value)}>
                <option value="">担当者を選択...</option>
                {employees.filter(e => e.isActive).map(e => (
                  <option key={e.id} value={e.id}>{e.name}</option>
                ))}
              </select>
            </div>
            <div>
              <Label className="text-xs">連絡先（任意）</Label>
              <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addTicketContactId} onChange={(e) => setAddTicketContactId(e.target.value)}>
                <option value="">なし</option>
                {partner.contacts.map(c => (
                  <option key={c.contactId} value={c.contactId}>{c.contactName}</option>
                ))}
              </select>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">ツール</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addTicketTool} onChange={(e) => setAddTicketTool(e.target.value)}>
                  <option value="LINE">LINE</option>
                  <option value="Telegram">Telegram</option>
                  <option value="Discord">Discord</option>
                  <option value="電話">電話</option>
                  <option value="Zoom">Zoom</option>
                  <option value="対面">対面</option>
                </select>
              </div>
              <div>
                <Label className="text-xs">優先度</Label>
                <select className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring mt-1" value={addTicketPriority} onChange={(e) => setAddTicketPriority(e.target.value)}>
                  <option value="高">高</option>
                  <option value="中">中</option>
                  <option value="低">低</option>
                </select>
              </div>
            </div>
            <div>
              <Label className="text-xs">内容</Label>
              <Textarea value={addTicketContent} onChange={(e) => setAddTicketContent(e.target.value)} className="text-sm min-h-[56px] mt-1" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setAddTicketOpen(false)} className="h-7 text-xs">キャンセル</Button>
              <Button size="sm" onClick={handleAddTicket} disabled={!addTicketTitle || !addTicketAssigneeId || createTicketMutation.isPending} className="h-7 text-xs">追加</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
