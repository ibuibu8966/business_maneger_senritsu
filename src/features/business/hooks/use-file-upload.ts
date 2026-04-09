"use client"

import { useRef } from "react"
import { toast } from "sonner"

interface UploadResult {
  url: string
  name: string
  storagePath: string
}

export function useFileUpload(onUploaded: (result: UploadResult) => void) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  const openFilePicker = () => {
    if (!inputRef.current) {
      const input = document.createElement("input")
      input.type = "file"
      input.accept = ".pdf,.jpg,.jpeg,.png,.gif,.webp,.xlsx,.docx,.csv"
      input.style.display = "none"
      input.addEventListener("change", async () => {
        const file = input.files?.[0]
        if (!file) return

        if (file.size > 10 * 1024 * 1024) {
          toast.error("ファイルサイズは10MB以下にしてください")
          return
        }

        const formData = new FormData()
        formData.append("file", file)

        toast.loading("アップロード中...", { id: "upload" })

        try {
          const res = await fetch("/api/upload", { method: "POST", body: formData })
          const data = await res.json()

          if (!res.ok) {
            toast.error(data.error ?? "アップロードに失敗しました", { id: "upload" })
            return
          }

          toast.success("アップロード完了", { id: "upload" })
          onUploaded(data)
        } catch {
          toast.error("アップロードに失敗しました", { id: "upload" })
        }

        // リセット（同じファイルを再選択可能に）
        input.value = ""
      })
      document.body.appendChild(input)
      inputRef.current = input
    }
    inputRef.current.click()
  }

  return { openFilePicker }
}
