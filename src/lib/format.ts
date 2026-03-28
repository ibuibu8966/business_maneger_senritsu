export function formatCurrency(amount: number): string {
  return `¥${(amount ?? 0).toLocaleString()}`
}

export function formatDate(dateStr: string): string {
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

export function formatMonth(monthStr: string): string {
  const [year, month] = monthStr.split("-")
  return `${year}年${parseInt(month)}月`
}

export function formatProfitRate(rate: number): string {
  return `${rate.toFixed(1)}%`
}
