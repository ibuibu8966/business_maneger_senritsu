"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useMyBadgeCounts } from "@/hooks/use-my-badge-counts"

const tabs = [
  { href: "/business", label: "事業・プロジェクト", countKey: null },
  { href: "/business/issues", label: "課題一覧", countKey: "issues" as const },
  { href: "/business/tasks", label: "タスク一覧", countKey: "tasks" as const },
  { href: "/business/tasks/missed-log", label: "未達成ログ", countKey: null },
  { href: "/business/templates", label: "テンプレート", countKey: null },
]

export default function BusinessLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()
  const { myTasks, myIssues } = useMyBadgeCounts()

  const counts: Record<string, number> = {
    tasks: myTasks,
    issues: myIssues,
  }

  return (
    <div className="h-full flex flex-col">
      <div className="h-[53px] border-b px-4 overflow-x-auto">
        <nav className="flex gap-2 h-full items-center min-w-max">
          {tabs.map((tab) => {
            const isActive =
              tab.href === "/business"
                ? pathname === "/business"
                : tab.href === "/business/tasks"
                ? pathname === "/business/tasks"
                : pathname.startsWith(tab.href)
            const count = tab.countKey ? counts[tab.countKey] : 0
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "relative px-3 py-1.5 text-sm rounded-md transition-colors whitespace-nowrap",
                  isActive
                    ? "bg-secondary text-secondary-foreground font-medium"
                    : "text-muted-foreground hover:text-foreground hover:bg-muted"
                )}
              >
                {tab.label}
                {count > 0 && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                    {count > 99 ? "99+" : count}
                  </span>
                )}
              </Link>
            )
          })}
        </nav>
      </div>
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
