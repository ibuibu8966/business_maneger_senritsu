"use client"

import * as React from "react"
import { Moon, Sun, Monitor, Check } from "lucide-react"
import { useTheme } from "next-themes"

import { cn } from "@/lib/utils"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type ThemeValue = "light" | "dark" | "system"

const ITEMS: { value: ThemeValue; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { value: "light", label: "ライト", icon: Sun },
  { value: "dark", label: "ダーク", icon: Moon },
  { value: "system", label: "システム", icon: Monitor },
]

export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  const handleSelect = async (value: ThemeValue) => {
    setTheme(value)
    try {
      await fetch("/api/user/theme", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ theme: value }),
      })
    } catch {
      // 永続化失敗時はクライアント側の変更だけ残す
    }
  }

  const current = (mounted ? theme : "system") as ThemeValue
  const CurrentIcon = ITEMS.find((i) => i.value === current)?.icon ?? Monitor

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "w-full flex items-center gap-2 px-3 py-2 rounded-md text-sm",
          "text-muted-foreground hover:bg-accent hover:text-accent-foreground",
          "transition-colors outline-none focus-visible:ring-2 focus-visible:ring-ring"
        )}
        aria-label="テーマを切り替え"
      >
        <CurrentIcon className="h-4 w-4" />
        <span className="truncate">テーマ</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" side="top" sideOffset={8} className="min-w-[160px]">
        {ITEMS.map((item) => {
          const Icon = item.icon
          const selected = current === item.value
          return (
            <DropdownMenuItem
              key={item.value}
              onClick={() => handleSelect(item.value)}
              className="flex items-center gap-2"
            >
              <Icon className="h-4 w-4" />
              <span className="flex-1">{item.label}</span>
              {selected && <Check className="h-4 w-4" />}
            </DropdownMenuItem>
          )
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
