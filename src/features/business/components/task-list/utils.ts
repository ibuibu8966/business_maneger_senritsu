/**
 * task-list-view のヘルパー関数
 */
import type { ProjectNode } from "../mock-data"

/** プロジェクトの祖先IDを全部返す（自動展開用） */
export function getAncestorIds(projectId: string, allProjects: ProjectNode[]): string[] {
  const ids: string[] = []
  let current = allProjects.find((p) => p.id === projectId)
  while (current?.parentId) {
    ids.push(current.parentId)
    current = allProjects.find((p) => p.id === current!.parentId)
  }
  return ids
}
