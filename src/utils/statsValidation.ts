import httpStatus from "http-status"
import ApiError from "./ApiError"
import {
  CampaignStatsSnapshot,
  CampaignStatsTargets,
  EligibilityPools,
} from "../types/stats"

export const STATS_FIELDS = [
  "sent",
  "delivered",
  "uniqueOpens",
  "totalOpens",
  "uniqueClicks",
  "totalClicks",
] as const

export type StatsField = (typeof STATS_FIELDS)[number]

export const resolveTargets = (
  current: CampaignStatsSnapshot,
  targets: CampaignStatsTargets,
): CampaignStatsSnapshot => ({
  sent: targets.sent ?? current.sent,
  delivered: targets.delivered ?? current.delivered,
  uniqueOpens: targets.uniqueOpens ?? current.uniqueOpens,
  totalOpens: targets.totalOpens ?? current.totalOpens,
  uniqueClicks: targets.uniqueClicks ?? current.uniqueClicks,
  totalClicks: targets.totalClicks ?? current.totalClicks,
})

export const computeDeltas = (
  current: CampaignStatsSnapshot,
  resolved: CampaignStatsSnapshot,
): CampaignStatsSnapshot => ({
  sent: resolved.sent - current.sent,
  delivered: resolved.delivered - current.delivered,
  uniqueOpens: resolved.uniqueOpens - current.uniqueOpens,
  totalOpens: resolved.totalOpens - current.totalOpens,
  uniqueClicks: resolved.uniqueClicks - current.uniqueClicks,
  totalClicks: resolved.totalClicks - current.totalClicks,
})

export const hasAnyTarget = (targets: CampaignStatsTargets): boolean =>
  STATS_FIELDS.some((field) => targets[field] !== undefined)

export const validateMonotonicIncrease = (
  current: CampaignStatsSnapshot,
  targets: CampaignStatsTargets,
): void => {
  for (const field of STATS_FIELDS) {
    const target = targets[field]
    if (target !== undefined && target < current[field]) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `${field} target (${target}) cannot be less than current (${current[field]})`,
      )
    }
  }
}

export const validateFunnel = (stats: CampaignStatsSnapshot): void => {
  const rules: { check: boolean; message: string }[] = [
    {
      check: stats.sent >= stats.delivered,
      message: `sent (${stats.sent}) must be >= delivered (${stats.delivered})`,
    },
    {
      check: stats.delivered >= stats.uniqueOpens,
      message: `delivered (${stats.delivered}) must be >= uniqueOpens (${stats.uniqueOpens})`,
    },
    {
      check: stats.uniqueOpens >= stats.uniqueClicks,
      message: `uniqueOpens (${stats.uniqueOpens}) must be >= uniqueClicks (${stats.uniqueClicks})`,
    },
    {
      check: stats.totalOpens >= stats.uniqueOpens,
      message: `totalOpens (${stats.totalOpens}) must be >= uniqueOpens (${stats.uniqueOpens})`,
    },
    {
      check: stats.totalClicks >= stats.uniqueClicks,
      message: `totalClicks (${stats.totalClicks}) must be >= uniqueClicks (${stats.uniqueClicks})`,
    },
  ]

  for (const rule of rules) {
    if (!rule.check) {
      throw new ApiError(httpStatus.BAD_REQUEST, rule.message)
    }
  }

  for (const field of STATS_FIELDS) {
    if (stats[field] < 0) {
      throw new ApiError(httpStatus.BAD_REQUEST, `${field} cannot be negative`)
    }
  }
}

export const validateDeltaLimits = (
  deltas: CampaignStatsSnapshot,
  maxIncrease: number,
): void => {
  for (const field of STATS_FIELDS) {
    if (deltas[field] > maxIncrease) {
      throw new ApiError(
        httpStatus.BAD_REQUEST,
        `${field} increase (${deltas[field]}) exceeds maximum allowed per request (${maxIncrease})`,
      )
    }
  }
}

export const validateEventDeltas = (deltas: CampaignStatsSnapshot): void => {
  if (deltas.totalOpens < deltas.uniqueOpens) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `totalOpens increase (${deltas.totalOpens}) must be >= uniqueOpens increase (${deltas.uniqueOpens})`,
    )
  }

  if (deltas.totalClicks < deltas.uniqueClicks) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `totalClicks increase (${deltas.totalClicks}) must be >= uniqueClicks increase (${deltas.uniqueClicks})`,
    )
  }
}

const validateBoundedDelta = (delta: number, pool: number, label: string): void => {
  if (delta > pool) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot add ${delta} ${label}: only ${pool} eligible record(s) available`,
    )
  }
}

const validateRepeatDelta = (delta: number, pool: number, label: string): void => {
  if (delta > 0 && pool === 0) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      `Cannot add ${delta} ${label}: no eligible record(s) available for repeat events`,
    )
  }
}

export const validateEligibility = (
  deltas: CampaignStatsSnapshot,
  pools: EligibilityPools,
): void => {
  const repeatOpenDelta = Math.max(0, deltas.totalOpens - deltas.uniqueOpens)
  const repeatClickDelta = Math.max(0, deltas.totalClicks - deltas.uniqueClicks)

  validateBoundedDelta(deltas.sent, pools.sentFromSource, "sent")
  validateBoundedDelta(deltas.delivered, pools.deliverableSent, "delivered")
  validateBoundedDelta(deltas.uniqueOpens, pools.openableDelivered, "uniqueOpens")
  validateRepeatDelta(repeatOpenDelta, pools.repeatableOpens, "repeat opens")
  validateBoundedDelta(deltas.uniqueClicks, pools.clickableOpened, "uniqueClicks")
  validateRepeatDelta(repeatClickDelta, pools.repeatableClicks, "repeat clicks")
}

export const buildProjectedPools = (
  dbPools: Omit<EligibilityPools, "sentFromSource">,
  deltas: CampaignStatsSnapshot,
  sentFromSource: number,
): EligibilityPools => ({
  sentFromSource,
  deliverableSent: dbPools.deliverableSent + deltas.sent,
  openableDelivered: dbPools.openableDelivered + deltas.delivered,
  repeatableOpens:
    dbPools.repeatableOpens + deltas.uniqueOpens > 0
      ? dbPools.repeatableOpens + deltas.uniqueOpens
      : 0,
  clickableOpened: dbPools.clickableOpened + deltas.uniqueOpens,
  repeatableClicks:
    dbPools.repeatableClicks + deltas.uniqueClicks > 0
      ? dbPools.repeatableClicks + deltas.uniqueClicks
      : 0,
})

export const validateStatsUpdate = (payload: {
  current: CampaignStatsSnapshot
  targets: CampaignStatsTargets
  pools: EligibilityPools
  maxIncrease: number
}): { resolved: CampaignStatsSnapshot; deltas: CampaignStatsSnapshot } => {
  if (!hasAnyTarget(payload.targets)) {
    throw new ApiError(httpStatus.BAD_REQUEST, "At least one stats target field is required")
  }

  if (payload.current.sent === 0 && payload.targets.sent === undefined) {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      "Campaign has no sent emails. Provide a sent target to add recipients first.",
    )
  }

  validateMonotonicIncrease(payload.current, payload.targets)

  const resolved = resolveTargets(payload.current, payload.targets)
  validateFunnel(resolved)

  const deltas = computeDeltas(payload.current, resolved)
  validateDeltaLimits(deltas, payload.maxIncrease)
  validateEventDeltas(deltas)
  validateEligibility(deltas, payload.pools)

  return { resolved, deltas }
}

export const buildLimits = (
  current: CampaignStatsSnapshot,
  pools: EligibilityPools,
): {
  maxDelivered: number
  maxUniqueOpens: number
  maxTotalOpens: number | null
  maxUniqueClicks: number
  maxTotalClicks: number | null
} => ({
  maxDelivered: current.delivered + pools.deliverableSent,
  maxUniqueOpens: current.uniqueOpens + pools.openableDelivered,
  maxTotalOpens: pools.repeatableOpens > 0 ? null : current.totalOpens,
  maxUniqueClicks: current.uniqueClicks + pools.clickableOpened,
  maxTotalClicks: pools.repeatableClicks > 0 ? null : current.totalClicks,
})
