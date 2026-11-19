import { describe, expect, it } from "@jest/globals"
import ApiError from "../utils/ApiError"
import {
  buildLimits,
  computeDeltas,
  resolveTargets,
  validateEligibility,
  validateEventDeltas,
  validateFunnel,
  validateMonotonicIncrease,
  validateStatsUpdate,
} from "../utils/statsValidation"
import { CampaignStatsSnapshot } from "../types/stats"

const baseCurrent: CampaignStatsSnapshot = {
  sent: 10,
  delivered: 5,
  uniqueOpens: 2,
  totalOpens: 3,
  uniqueClicks: 1,
  totalClicks: 1,
}

describe("statsValidation", () => {
  it("resolves omitted targets from current values", () => {
    const resolved = resolveTargets(baseCurrent, { sent: 20 })
    expect(resolved).toEqual({
      ...baseCurrent,
      sent: 20,
    })
  })

  it("computes deltas correctly", () => {
    const resolved = resolveTargets(baseCurrent, {
      sent: 20,
      delivered: 10,
      uniqueOpens: 5,
      totalOpens: 8,
      uniqueClicks: 3,
      totalClicks: 4,
    })
    expect(computeDeltas(baseCurrent, resolved)).toEqual({
      sent: 10,
      delivered: 5,
      uniqueOpens: 3,
      totalOpens: 5,
      uniqueClicks: 2,
      totalClicks: 3,
    })
  })

  it("rejects decreasing targets", () => {
    expect(() => validateMonotonicIncrease(baseCurrent, { delivered: 4 })).toThrow(ApiError)
  })

  it("rejects funnel violations", () => {
    expect(() =>
      validateFunnel({
        sent: 10,
        delivered: 11,
        uniqueOpens: 2,
        totalOpens: 3,
        uniqueClicks: 1,
        totalClicks: 1,
      }),
    ).toThrow("sent (10) must be >= delivered (11)")
  })

  it("accepts valid full update", () => {
    const result = validateStatsUpdate({
      current: baseCurrent,
      targets: {
        sent: 20,
        delivered: 15,
        uniqueOpens: 10,
        totalOpens: 12,
        uniqueClicks: 8,
        totalClicks: 9,
      },
      pools: {
        sentFromSource: 20,
        deliverableSent: 15,
        openableDelivered: 10,
        repeatableOpens: 9,
        clickableOpened: 8,
        repeatableClicks: 8,
      },
      maxIncrease: 10000,
    })

    expect(result.deltas.sent).toBe(10)
    expect(result.resolved.delivered).toBe(15)
  })

  it("allows total opens and clicks to exceed unique counts", () => {
    const result = validateStatsUpdate({
      current: {
        sent: 100,
        delivered: 100,
        uniqueOpens: 0,
        totalOpens: 0,
        uniqueClicks: 0,
        totalClicks: 0,
      },
      targets: {
        uniqueOpens: 10,
        totalOpens: 50,
        uniqueClicks: 5,
        totalClicks: 25,
      },
      pools: {
        sentFromSource: 0,
        deliverableSent: 0,
        openableDelivered: 100,
        repeatableOpens: 10,
        clickableOpened: 10,
        repeatableClicks: 5,
      },
      maxIncrease: 10000,
    })

    expect(result.resolved.totalOpens).toBe(50)
    expect(result.resolved.totalClicks).toBe(25)
  })

  it("requires each new unique event to also increase its total", () => {
    expect(() =>
      validateEventDeltas({
        sent: 0,
        delivered: 0,
        uniqueOpens: 10,
        totalOpens: 5,
        uniqueClicks: 0,
        totalClicks: 0,
      }),
    ).toThrow("totalOpens increase (5) must be >= uniqueOpens increase (10)")
  })

  it("reports repeat totals as unbounded when eligible recipients exist", () => {
    expect(
      buildLimits(baseCurrent, {
        sentFromSource: 0,
        deliverableSent: 5,
        openableDelivered: 3,
        repeatableOpens: 2,
        clickableOpened: 1,
        repeatableClicks: 1,
      }),
    ).toMatchObject({
      maxTotalOpens: null,
      maxTotalClicks: null,
    })
  })

  it("rejects when eligibility pool is insufficient", () => {
    expect(() =>
      validateEligibility(
        {
          sent: 0,
          delivered: 10,
          uniqueOpens: 0,
          totalOpens: 0,
          uniqueClicks: 0,
          totalClicks: 0,
        },
        {
          sentFromSource: 0,
          deliverableSent: 5,
          openableDelivered: 0,
          repeatableOpens: 0,
          clickableOpened: 0,
          repeatableClicks: 0,
        },
      ),
    ).toThrow("Cannot add 10 delivered")
  })
})
