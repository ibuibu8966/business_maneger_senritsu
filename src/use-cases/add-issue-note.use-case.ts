import { BusinessIssueRepository } from "@/repositories/business-issue.repository"

export class AddIssueNote {
  static async execute(data: {
    issueId: string
    date: string
    content: string
    author?: string
  }) {
    return BusinessIssueRepository.addNote(data.issueId, {
      date: new Date(data.date),
      content: data.content,
      author: data.author ?? "",
    })
  }
}
