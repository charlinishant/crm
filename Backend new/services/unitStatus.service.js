const UNIT_STATUS = {
  Available: "Available",
  Held: "Held",
  Blocked: "Blocked",
  Booked: "Booked",
  Registered: "Registered",
  Possession_Given: "Possession_Given",
  Cancelled: "Cancelled",
  Refuge: "Refuge",
  Investor: "Investor",
}

const normalizeUnitStatus = (value, fallback = UNIT_STATUS.Available) => {
  const normalized = String(value || fallback).trim().toLowerCase().replace(/[\s-]+/g, "_")
  const aliases = {
    available: UNIT_STATUS.Available,
    selected: UNIT_STATUS.Available,
    held: UNIT_STATUS.Held,
    hold: UNIT_STATUS.Held,
    blocked: UNIT_STATUS.Blocked,
    block: UNIT_STATUS.Blocked,
    booked: UNIT_STATUS.Booked,
    sold: UNIT_STATUS.Booked,
    unavailable: UNIT_STATUS.Booked,
    registered: UNIT_STATUS.Registered,
    possession_given: UNIT_STATUS.Possession_Given,
    cancelled: UNIT_STATUS.Cancelled,
    canceled: UNIT_STATUS.Cancelled,
    refuge: UNIT_STATUS.Refuge,
    investor: UNIT_STATUS.Investor,
  }

  return aliases[normalized] || fallback
}

const adminOnlyTargets = new Set([UNIT_STATUS.Blocked, UNIT_STATUS.Refuge, UNIT_STATUS.Investor])
const adminOnlySources = new Set([UNIT_STATUS.Blocked, UNIT_STATUS.Refuge, UNIT_STATUS.Investor])

const transitionTable = {
  [UNIT_STATUS.Available]: new Set([
    UNIT_STATUS.Held,
    UNIT_STATUS.Blocked,
    UNIT_STATUS.Refuge,
    UNIT_STATUS.Investor,
  ]),
  [UNIT_STATUS.Held]: new Set([UNIT_STATUS.Booked, UNIT_STATUS.Available]),
  [UNIT_STATUS.Booked]: new Set([UNIT_STATUS.Registered, UNIT_STATUS.Cancelled]),
  [UNIT_STATUS.Registered]: new Set([UNIT_STATUS.Possession_Given, UNIT_STATUS.Cancelled]),
  [UNIT_STATUS.Cancelled]: new Set([UNIT_STATUS.Available]),
  [UNIT_STATUS.Blocked]: new Set([UNIT_STATUS.Available]),
  [UNIT_STATUS.Refuge]: new Set([UNIT_STATUS.Available]),
  [UNIT_STATUS.Investor]: new Set([UNIT_STATUS.Available]),
}

const hasCancellationReason = (context = {}) =>
  Boolean(
    context.reason ||
      context.cancellationReason ||
      context.bookingCancellationReason ||
      context.statusReason ||
      context.note
  )

const assertUnitStatusTransition = (fromStatus, toStatus, context = {}) => {
  const from = normalizeUnitStatus(fromStatus)
  const to = normalizeUnitStatus(toStatus)

  if (from === to) {
    if (from === UNIT_STATUS.Booked && context.action === "confirm-booking") {
      const error = new Error("Illegal unit status transition: Booked -> Booked")
      error.statusCode = 409
      throw error
    }

    return to
  }

  const allowedTargets = transitionTable[from] || new Set()
  if (!allowedTargets.has(to)) {
    const error = new Error(`Illegal unit status transition: ${from} -> ${to}`)
    error.statusCode = 409
    throw error
  }

  if ((from === UNIT_STATUS.Booked || from === UNIT_STATUS.Registered) && to === UNIT_STATUS.Cancelled && (!context.approved || !hasCancellationReason(context))) {
    const error = new Error("Cancellation requires approver approval and a reason")
    error.statusCode = 400
    throw error
  }

  if (from === UNIT_STATUS.Cancelled && to === UNIT_STATUS.Available && !context.approved) {
    const error = new Error("Cancelled units can return to Available only after approval")
    error.statusCode = 403
    throw error
  }

  if ((from === UNIT_STATUS.Available && adminOnlyTargets.has(to)) || (adminOnlySources.has(from) && to === UNIT_STATUS.Available)) {
    if (context.actorRole && context.actorRole !== "ADMIN") {
      const error = new Error(`${from} -> ${to} is allowed for admin users only`)
      error.statusCode = 403
      throw error
    }
  }

  return to
}

module.exports = {
  UNIT_STATUS,
  normalizeUnitStatus,
  assertUnitStatusTransition,
}
