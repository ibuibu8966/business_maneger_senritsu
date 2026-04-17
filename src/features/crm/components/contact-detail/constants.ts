/**
 * contact-detail-view で使うラベル/変換マップ
 */

export const METHOD_LABELS: Record<string, string> = {
  memberpay: "メンバーペイ",
  robotpay: "ロボットペイ",
  paypal: "PayPal",
  univpay: "UnivaPay",
  other: "その他",
}

export const STATUS_LABELS: Record<string, string> = {
  active: "アクティブ",
  cancelled: "解約済み",
}

export const TYPE_LABELS: Record<string, string> = {
  salon_member: "サロン生",
  partner_contact: "取引先",
}

export const TYPE_TO_API: Record<string, string> = {
  サロン生: "salon_member",
  取引先: "partner_contact",
}

export const METHOD_TO_API: Record<string, string> = {
  メンバーペイ: "memberpay",
  ロボットペイ: "robotpay",
  PayPal: "paypal",
  UnivaPay: "univpay",
  その他: "other",
}
