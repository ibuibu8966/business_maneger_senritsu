"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const tabs = [
  { href: "/business", label: "事業・プロジェクト" },
  { href: "/business/issues", label: "課題一覧" },
  { href: "/business/tasks", label: "タスク一覧" },
  { href: "/business/templates", label: "テンプレート" },
]

export default function BusinessLayout({
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
              tab.href === "/business"
                ? pathname === "/business"
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
      <div className="flex-1 overflow-hidden">{children}</div>
    </div>
  )
}
