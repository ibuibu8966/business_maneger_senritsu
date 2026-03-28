import {
  SelectGroup,
  SelectItem,
  SelectLabel,
} from "@/components/ui/select"
import type { AccountDetailDTO } from "@/types/dto"

const ACCOUNT_GROUP_LABELS: Record<string, string> = {
  "internal-bank": "社内銀行",
  "internal-securities": "社内証券",
  "external-bank": "社外銀行",
  "external-securities": "社外証券",
}

const GROUP_ORDER = ["internal-bank", "internal-securities", "external-bank", "external-securities"]

/**
 * 口座をグループ分けしてSelectItem群を返す
 * @param value - "id" なら a.id を value に、"name" なら a.name を value にする
 */
export function AccountSelectItems({
  accounts,
  value = "id",
}: {
  accounts: AccountDetailDTO[]
  value?: "id" | "name"
}) {
  const grouped = new Map<string, AccountDetailDTO[]>()
  for (const a of accounts) {
    const key = `${a.ownerType}-${a.accountType}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(a)
  }

  return (
    <>
      {GROUP_ORDER.map((key) => {
        const items = grouped.get(key)
        if (!items || items.length === 0) return null
        return (
          <SelectGroup key={key}>
            <SelectLabel>{ACCOUNT_GROUP_LABELS[key]}</SelectLabel>
            {items.map((a) => (
              <SelectItem key={a.id} value={value === "id" ? a.id : a.name}>
                {a.name}
              </SelectItem>
            ))}
          </SelectGroup>
        )
      })}
    </>
  )
}
