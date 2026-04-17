"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { useSession, signOut } from "next-auth/react"
import {
  LayoutDashboard,
  CalendarDays,
  Building2,
  Users,
  Wallet,
  UserCog,
  LogOut,
  Store,
  CheckSquare,
  AlertCircle,
} from "lucide-react"
import { cn } from "@/lib/utils"
import { useMyBadgeCounts } from "@/hooks/use-my-badge-counts"
import { ThemeToggle } from "@/components/layout/theme-toggle"

const menuItems = [
  { href: "/dashboard", label: "ダッシュボード", icon: LayoutDashboard, roles: ["master_admin", "admin", "employee"] },
  { href: "/schedule", label: "スケジュール", icon: CalendarDays, roles: ["master_admin", "admin", "employee"] },
  { href: "/salon", label: "サロン管理", icon: Store, roles: ["master_admin", "admin"] },
  { href: "/balance", label: "貸借・口座", icon: Wallet, roles: ["master_admin", "admin"] },
  { href: "/business", label: "事業管理", icon: Building2, roles: ["master_admin", "admin", "employee"] },
  { href: "/business/tasks", label: "タスク", icon: CheckSquare, roles: ["master_admin", "admin", "employee"] },
  { href: "/business/issues", label: "課題", icon: AlertCircle, roles: ["master_admin", "admin", "employee"] },
  { href: "/crm", label: "顧客・取引先管理", icon: Users, roles: ["master_admin", "admin"] },
  { href: "/users", label: "ユーザー管理", icon: UserCog, roles: ["master_admin", "admin"] },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const { total } = useMyBadgeCounts()

  return (
    <aside className="w-56 border-r bg-card flex flex-col">
      <div className="h-[53px] px-4 border-b flex items-center">
        <h1 className="text-sm font-bold tracking-tight">業務管理システム</h1>
      </div>
      <nav className="flex-1 p-2 space-y-0.5">
        {menuItems.filter((item) => {
          const role = session?.user?.role
          return role ? item.roles.includes(role) : true
        }).map((item) => {
          const isActive = item.href === "/business"
            ? pathname === "/business" || pathname === "/business/"
            : pathname.startsWith(item.href)
          const badgeCount = item.href === "/business" ? total : 0
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch={false}
              className={cn(
                "relative flex items-center gap-2.5 px-3 py-2 rounded-md text-sm transition-colors",
                isActive
                  ? "bg-primary text-primary-foreground"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
              {badgeCount > 0 && (
                <span className="ml-auto min-w-[18px] h-[18px] flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-1 leading-none">
                  {badgeCount > 99 ? "99+" : badgeCount}
                </span>
              )}
            </Link>
          )
        })}
      </nav>

      {session?.user && (
        <div className="border-t p-3 space-y-2">
          <ThemeToggle />
          <div className="flex items-center justify-between">
            <Link href="/profile" prefetch={false} className="min-w-0 flex-1 hover:opacity-80">
              <p className="text-sm font-medium truncate">{session.user.name}</p>
              <p className="text-xs text-muted-foreground truncate">{session.user.email}</p>
            </Link>
            <button
              onClick={() => signOut({ callbackUrl: "/login" })}
              className="ml-2 p-1.5 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
              title="ログアウト"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </aside>
  )
}
