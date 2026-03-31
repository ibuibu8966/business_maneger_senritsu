"use client"

import { useState, useMemo } from "react"
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Search } from "lucide-react"
import type { SubscriptionDTO } from "@/types/dto"
import { useContacts, useSubscriptions, useCrmTags, useUpdateContact, useCreateCrmTag } from "@/hooks/use-crm"
import { cn } from "@/lib/utils"
import { TagSelect } from "@/features/lending/components/tag-select"
import { ContactDetailView } from "@/features/crm/components/contact-detail-view"

export function SalonMemberList() {
  const [search, setSearch] = useState("")
  const [selectedId, setSelectedId] = useState<string | null>(null)

  const { data: contacts = [], isLoading: loadingContacts } = useContacts({ type: "salon_member" })
  const { data: subscriptions = [], isLoading: loadingSubs } = useSubscriptions()
  const { data: crmTags = [] } = useCrmTags()
  const updateMutation = useUpdateContact()
  const createTagMutation = useCreateCrmTag()

  const rows = useMemo(() => {
    // サブスクをcontactIdでグループ化（activeを優先）
    const subMap = new Map<string, SubscriptionDTO>()
    for (const s of subscriptions) {
      const existing = subMap.get(s.contactId)
      if (!existing || (s.status === "active" && existing.status !== "active")) {
        subMap.set(s.contactId, s)
      }
    }

    return contacts
      .filter((c) => !c.isArchived)
      .filter((c) => {
        if (!search) return true
        return c.name.includes(search)
      })
      .map((c) => ({
        ...c,
        salonName: subMap.get(c.id)?.salonName ?? "-",
      }))
  }, [contacts, subscriptions, search])

  if (loadingContacts || loadingSubs) return <div className="p-4 text-muted-foreground">読み込み中...</div>

  return (
    <div className="flex h-full">
      {/* 左: テーブル */}
      <div className={cn("flex flex-col h-full", selectedId ? "flex-1 min-w-0" : "w-full")}>
        {/* フィルター */}
        <div className="px-4 py-3 border-b flex items-center gap-3">
          <div className="relative">
            <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="名前で検索"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="h-8 text-sm pl-8 w-60"
            />
          </div>
          <span className="text-xs text-muted-foreground">{rows.length}件</span>
        </div>

        {/* テーブル */}
        <div className="flex-1 overflow-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>名前</TableHead>
                <TableHead>サロン</TableHead>
                <TableHead>次回面談</TableHead>
                <TableHead>最終面談</TableHead>
                <TableHead>タグ</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => (
                <TableRow
                  key={r.id}
                  className={cn("cursor-pointer", selectedId === r.id && "bg-accent")}
                  onClick={() => setSelectedId(selectedId === r.id ? null : r.id)}
                >
                  <TableCell className="text-sm font-medium">{r.name}</TableCell>
                  <TableCell className="text-sm">{r.salonName}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.nextMeetingDate ? new Date(r.nextMeetingDate).toLocaleDateString("ja-JP") : "-"}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {r.lastMeetingDate ? new Date(r.lastMeetingDate).toLocaleDateString("ja-JP") : "-"}
                    {r.isFinalMeeting && (
                      <Badge variant="outline" className="ml-1 text-xs text-orange-600 border-orange-300">最終</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <TagSelect
                      allTags={crmTags}
                      selectedTags={r.tags ?? []}
                      onToggle={(tagName) => {
                        const currentTags = r.tags ?? []
                        const newTags = currentTags.includes(tagName)
                          ? currentTags.filter((t) => t !== tagName)
                          : [...currentTags, tagName]
                        updateMutation.mutate({ id: r.id, data: { tags: newTags } })
                      }}
                      onCreate={(name) => createTagMutation.mutate({ name })}
                      size="compact"
                    />
                  </TableCell>
                </TableRow>
              ))}
              {rows.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                    データがありません
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* 右: 詳細パネル */}
      {selectedId && (
        <div className="w-[520px] border-l overflow-y-auto">
          <div className="sticky top-0 bg-background z-10 px-4 py-2 border-b flex items-center justify-between">
            <h3 className="text-sm font-bold">詳細</h3>
            <button
              onClick={() => setSelectedId(null)}
              className="text-muted-foreground hover:text-foreground text-lg cursor-pointer"
            >
              &times;
            </button>
          </div>
          <ContactDetailView contactId={selectedId} />
        </div>
      )}
    </div>
  )
}
