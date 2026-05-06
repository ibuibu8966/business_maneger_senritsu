import type { AccountDetailDTO } from "@/types/dto"

const ACCOUNT_GROUP_LABELS: Record<string, string> = {
  "internal-bank": "社内銀行",
  "internal-securities": "社内証券",
  "external-bank": "社外銀行",
  "external-securities": "社外証券",
}

const GROUP_ORDER = ["internal-bank", "internal-securities", "external-bank", "external-securities"]

/**
 * 口座をグループ分けしてoptgroup/option群を返す
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
    if (a.isVirtual) continue
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
          <optgroup key={key} label={ACCOUNT_GROUP_LABELS[key]}>
            {items.map((a) => (
              <option key={a.id} value={value === "id" ? a.id : a.name}>
                {a.name}
              </option>
            ))}
          </optgroup>
        )
      })}
    </>
  )
}
