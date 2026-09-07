const toNumberOrNull = (value) => {
  if (value === "" || value === null || value === undefined) return null
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

const roundMoney = (value) => Number((Number(value) || 0).toFixed(2))

const parseSkippedFloors = (value) => {
  if (Array.isArray(value)) {
    return Array.from(new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item))))
      .sort((a, b) => a - b)
  }

  if (value === null || value === undefined || value === "") return []

  const text = String(value).trim()
  if (!text) return []

  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text)
      return parseSkippedFloors(parsed)
    } catch {
      return []
    }
  }

  return parseSkippedFloors(text.split(",").map((item) => item.trim()))
}

const getRateBasisArea = (floorPlan = {}, basis = floorPlan.rateBasis || "On Carpet") => {
  if (basis === "On Built-up") return toNumberOrNull(floorPlan.builtupArea)
  if (basis === "On Saleable") return toNumberOrNull(floorPlan.saleable)
  return toNumberOrNull(floorPlan.carpet)
}

const getFloorRiseSteps = ({ floorNumber, riseFromFloor, skippedFloors = [] }) => {
  const floor = Number(floorNumber)
  const startFloor = Number(riseFromFloor)

  if (!Number.isFinite(floor) || !Number.isFinite(startFloor)) return 0
  if (floor <= startFloor) return 0

  return Math.max(0, Math.trunc(floor) - Math.trunc(startFloor))
}

const validateFloorRiseInputs = ({
  floorRiseEnabled = true,
  baseRate,
  floorRisePerSqft,
  floorNumber,
  riseFromFloor,
  reraArea,
  skippedFloors = [],
  applicableFloorFrom = null,
  applicableFloorTo = null,
}) => {
  if (toNumberOrNull(baseRate) === null || Number(baseRate) < 0) return "Enter Base Rate."
  if (toNumberOrNull(reraArea) === null || Number(reraArea) <= 0) return "RERA Area is required for floor-rise calculation."
  if (!floorRiseEnabled) return null
  if (toNumberOrNull(floorRisePerSqft) === null || Number(floorRisePerSqft) < 0) return "Enter Floor Rise / Sqft."
  if (!Number.isInteger(Number(riseFromFloor)) || Number(riseFromFloor) < 1) return "Select Base Floor for Floor Rise."
  if (applicableFloorFrom !== null && Number(riseFromFloor) < Number(applicableFloorFrom)) {
    return "Base Floor for Floor Rise cannot be before Applicable Floor From."
  }
  if (applicableFloorTo !== null && Number(riseFromFloor) > Number(applicableFloorTo)) {
    return "Base Floor for Floor Rise cannot exceed Applicable Floor To."
  }
  if (!Number.isInteger(Number(floorNumber)) || Number(floorNumber) < 1) return "Unit floor number is required."
  if (parseSkippedFloors(skippedFloors).includes(Number(riseFromFloor))) {
    return "Base Floor for Floor Rise cannot be a skipped floor."
  }
  return null
}

const calculateFloorRiseAmount = ({
  floorRiseEnabled = true,
  baseRate,
  floorRisePerSqft,
  floorNumber,
  riseFromFloor,
  reraArea,
  skippedFloors = [],
}) => {
  const rate = toNumberOrNull(baseRate) ?? 0
  const riseRate = toNumberOrNull(floorRisePerSqft) ?? 0
  const area = toNumberOrNull(reraArea) ?? 0
  const floorRiseFlag = floorRiseEnabled === true ? 1 : 0
  const floorRiseSteps = getFloorRiseSteps({ floorNumber, riseFromFloor, skippedFloors })

  return {
    floorRiseFlag,
    floorRiseSteps,
    floorRisePerSqftTotal: riseRate * floorRiseSteps * floorRiseFlag,
    effectiveRate: rate + (riseRate * floorRiseFlag),
    floorRiseAmount: roundMoney(riseRate * floorRiseSteps * area * floorRiseFlag),
  }
}

const calculateUnitPrice = ({ floorPlan = {}, floorNumber }) => {
  const baseRate = toNumberOrNull(floorPlan.baseRate) ?? 0
  const floorRisePerSqft = toNumberOrNull(floorPlan.floorRisePerSqft) ?? 0
  const legacyFloorRiseEnabled =
    toNumberOrNull(floorPlan.floorRisePerSqft) !== null &&
    toNumberOrNull(floorPlan.baseFloorForFloorRise) !== null
  const floorRiseEnabled =
    typeof floorPlan.floorRiseEnabled === "boolean" ? floorPlan.floorRiseEnabled : legacyFloorRiseEnabled
  const riseFromFloor =
    toNumberOrNull(floorPlan.baseFloorForFloorRise) ??
    toNumberOrNull(floorPlan.applicableFloorFrom) ??
    1
  const reraArea = getRateBasisArea(floorPlan, "On Carpet")
  const skippedFloors = parseSkippedFloors(floorPlan.skippedFloors)
  const validationMessage = validateFloorRiseInputs({
    floorRiseEnabled,
    baseRate,
    floorRisePerSqft,
    floorNumber,
    riseFromFloor,
    reraArea,
    skippedFloors,
    applicableFloorFrom: floorPlan.applicableFloorFrom,
    applicableFloorTo: floorPlan.applicableFloorTo,
  })
  const basePriceAtBaseFloor = reraArea ? roundMoney(baseRate * reraArea) : 0
  const floorRise = validationMessage
    ? { floorRiseFlag: floorRiseEnabled ? 1 : 0, floorRiseSteps: 0, floorRisePerSqftTotal: 0, effectiveRate: baseRate, floorRiseAmount: 0 }
    : calculateFloorRiseAmount({
        floorRiseEnabled,
        baseRate,
        floorRisePerSqft,
        floorNumber,
        riseFromFloor,
        reraArea,
        skippedFloors,
      })
  const effectiveRate = floorRise.effectiveRate
  const finalPrice = roundMoney(basePriceAtBaseFloor + (floorRiseEnabled ? floorRise.floorRiseAmount : 0))

  return {
    baseRate,
    effectiveRate,
    reraArea: reraArea ?? 0,
    rateBasis: "On Carpet",
    basePriceAtBaseFloor,
    floorRiseEnabled,
    floorRisePerSqft,
    riseFromFloor,
    floorNumber: toNumberOrNull(floorNumber),
    floorRiseFlag: floorRise.floorRiseFlag,
    floorRiseSteps: floorRise.floorRiseSteps,
    riseSteps: floorRise.floorRiseSteps,
    floorRisePerSqftTotal: floorRise.floorRisePerSqftTotal,
    floorRiseAmount: floorRise.floorRiseAmount,
    floorRiseCalculatedAmount: floorRise.floorRiseAmount,
    calculatedUnitPrice: finalPrice,
    finalPrice,
    validationMessage,
  }
}

module.exports = {
  calculateFloorRiseAmount,
  calculateUnitPrice,
  getFloorRiseSteps,
  parseSkippedFloors,
  roundMoney,
  validateFloorRiseInputs,
}
