/**
 * contact-detail-view の型定義
 */
import type { ContactDTO, SubscriptionDTO } from "@/types/dto"

export interface PartnerAffiliation {
  partnerId: string
  partnerName: string
  role: string
}

export interface ContactDetailData extends ContactDTO {
  subscriptions: SubscriptionDTO[]
  partnerAffiliations: PartnerAffiliation[]
}
