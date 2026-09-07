const assert = require("node:assert/strict")
const {
  calculateFloorRiseAmount,
  calculateUnitPrice,
  getFloorRiseSteps,
  parseSkippedFloors,
  validateFloorRiseInputs,
} = require("../utils/unitPricing")

const base = {
  baseRate: 1000,
  floorRisePerSqft: 50,
  riseFromFloor: 1,
  reraArea: 900,
}

assert.deepEqual(parseSkippedFloors("2,5"), [2, 5])
assert.deepEqual(parseSkippedFloors("[3,4]"), [3, 4])

assert.equal(getFloorRiseSteps({ floorNumber: 1, riseFromFloor: 1 }), 0)
assert.equal(getFloorRiseSteps({ floorNumber: 2, riseFromFloor: 1 }), 1)
assert.equal(getFloorRiseSteps({ floorNumber: 3, riseFromFloor: 1 }), 2)
assert.equal(getFloorRiseSteps({ floorNumber: 3, riseFromFloor: 1, skippedFloors: [2] }), 2)
assert.equal(getFloorRiseSteps({ floorNumber: 6, riseFromFloor: 1, skippedFloors: [3, 4] }), 5)
assert.equal(getFloorRiseSteps({ floorNumber: 2, riseFromFloor: 3 }), 0)
assert.equal(getFloorRiseSteps({ floorNumber: 3, riseFromFloor: 3 }), 0)
assert.equal(getFloorRiseSteps({ floorNumber: 4, riseFromFloor: 3 }), 1)

assert.equal(calculateFloorRiseAmount({ ...base, floorRiseEnabled: false, floorNumber: 3 }).floorRiseFlag, 0)
assert.equal(calculateFloorRiseAmount({ ...base, floorRiseEnabled: false, floorNumber: 3 }).floorRiseAmount, 0)
assert.equal(calculateFloorRiseAmount({ ...base, floorNumber: 2 }).floorRiseAmount, 45000)
assert.equal(calculateFloorRiseAmount({ ...base, floorNumber: 3 }).floorRiseAmount, 90000)
assert.equal(calculateFloorRiseAmount({ ...base, floorNumber: 1 }).floorRiseAmount, 0)
assert.equal(calculateFloorRiseAmount({ ...base, floorNumber: 0 }).floorRiseAmount, 0)
assert.equal(calculateFloorRiseAmount({ ...base, floorNumber: 3, skippedFloors: [2] }).floorRiseAmount, 90000)
assert.equal(calculateFloorRiseAmount({ ...base, floorNumber: 5, skippedFloors: [3, 4] }).floorRiseAmount, 180000)
assert.equal(
  validateFloorRiseInputs({ ...base, floorNumber: 3, baseRate: -1 }),
  "Enter Base Rate."
)
assert.equal(
  validateFloorRiseInputs({ ...base, floorNumber: 3, applicableFloorFrom: 2 }),
  "Base Floor for Floor Rise cannot be before Applicable Floor From."
)

assert.equal(
  validateFloorRiseInputs({ ...base, floorNumber: 3, skippedFloors: [1] }),
  "Base Floor for Floor Rise cannot be a skipped floor."
)

assert.equal(
  calculateFloorRiseAmount({
    baseRate: 1025.5,
    floorRisePerSqft: 0,
    riseFromFloor: 1,
    floorNumber: 2,
    reraArea: 897.25,
  }).floorRiseAmount,
  0
)

assert.equal(
  calculateUnitPrice({
    floorPlan: {
      baseRate: 1000,
      floorRiseEnabled: true,
      floorRisePerSqft: 50,
      baseFloorForFloorRise: 1,
      carpet: 900,
      skippedFloors: "2",
    },
    floorNumber: 3,
  }).floorRiseAmount,
  90000
)

assert.equal(
  calculateUnitPrice({
    floorPlan: {
      baseRate: 1000,
      floorRiseEnabled: true,
      floorRisePerSqft: 50,
      baseFloorForFloorRise: 1,
      carpet: 1050,
      skippedFloors: "2",
    },
    floorNumber: 3,
  }).finalPrice,
  1155000
)

console.log("unit pricing tests passed")
