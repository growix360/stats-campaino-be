export interface CampaignStatsSnapshot {
  sent: number
  delivered: number
  uniqueOpens: number
  totalOpens: number
  uniqueClicks: number
  totalClicks: number
}

export interface CampaignStatsTargets {
  sent?: number
  delivered?: number
  uniqueOpens?: number
  totalOpens?: number
  uniqueClicks?: number
  totalClicks?: number
}

export interface CampaignStatsLimits {
  maxDelivered: number
  maxUniqueOpens: number
  maxTotalOpens: number | null
  maxUniqueClicks: number
  maxTotalClicks: number | null
}

export interface EligibilityPools {
  sentFromSource: number
  deliverableSent: number
  openableDelivered: number
  repeatableOpens: number
  clickableOpened: number
  repeatableClicks: number
}

export type EmailSource = "default_csv" | "upload" | "none"
