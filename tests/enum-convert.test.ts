import { describe, it, expect } from "vitest"
import {
  toDbEnum,
  toApiEnum,
  TASK_STATUS_API_TO_DB,
  TASK_STATUS_DB_TO_API,
} from "@/lib/enum-convert"

describe("enum-convert", () => {
  it("toDbEnum: UI小文字 → DB大文字", () => {
    expect(toDbEnum("salon_member")).toBe("SALON_MEMBER")
    expect(toDbEnum("active")).toBe("ACTIVE")
    expect(toDbEnum("memberpay")).toBe("MEMBERPAY")
  })

  it("toApiEnum: DB大文字 → UI小文字", () => {
    expect(toApiEnum("SALON_MEMBER")).toBe("salon_member")
    expect(toApiEnum("ACTIVE")).toBe("active")
    expect(toApiEnum("PARTNER_CONTACT")).toBe("partner_contact")
  })

  it("TaskStatus は特殊変換（ハイフン ↔ アンダースコア）", () => {
    expect(TASK_STATUS_API_TO_DB["in-progress"]).toBe("IN_PROGRESS")
    expect(TASK_STATUS_DB_TO_API["IN_PROGRESS"]).toBe("in-progress")
    expect(TASK_STATUS_API_TO_DB["todo"]).toBe("TODO")
    expect(TASK_STATUS_DB_TO_API["DONE"]).toBe("done")
  })
})
