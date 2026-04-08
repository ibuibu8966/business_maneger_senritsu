/**
 * LINE Messaging API でEmployee個人にメッセージを送信
 *
 * 環境変数 LINE_CHANNEL_ACCESS_TOKEN が必要
 * （業務管理くんのMessaging APIチャネルのチャネルアクセストークン）
 */

import { logger } from "./logger"

export async function pushLineMessage(
  lineUserId: string,
  text: string
): Promise<{ ok: boolean; error?: string }> {
  const token = process.env.LINE_CHANNEL_ACCESS_TOKEN
  if (!token) {
    return { ok: false, error: "LINE_CHANNEL_ACCESS_TOKEN not set" }
  }
  try {
    const res = await fetch("https://api.line.me/v2/bot/message/push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        to: lineUserId,
        messages: [{ type: "text", text: text.slice(0, 4900) }],
      }),
    })
    if (!res.ok) {
      const errText = await res.text()
      logger.error(`LINE push failed: ${res.status}`, errText)
      return { ok: false, error: `${res.status}: ${errText}` }
    }
    return { ok: true }
  } catch (e) {
    logger.error("LINE push error", e)
    return { ok: false, error: String(e) }
  }
}
