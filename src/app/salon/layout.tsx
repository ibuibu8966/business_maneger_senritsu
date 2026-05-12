"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/salon/members", label: "サロン生一覧" },
  { href: "/salon/settings", label: "サロン・コース設定" },
  { href: "/salon", label: "サブスク管理" },
  { href: "/salon/payment-checks", label: "決済確認" },
]

export default function SalonLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="h-full flex flex-col">
      <div className="h-[53px] border-b px-4 overflow-x-auto">
        <nav className="flex gap-2 h-full items-center min-w-max">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/salon"
                ? pathname === "/salon"
                : pathname.startsWith(tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  )
}
