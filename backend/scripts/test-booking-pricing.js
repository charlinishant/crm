const assert = require("node:assert/strict")
const { calculateBookingPrice } = require("../utils/bookingPricing")

const unitItem = {
  floor: 3,
  unit: {
    carpet: 900,
    saleable: 1000,
    floor: {
      baseRate: 1000,
      floorRiseEnabled: true,
      floorRisePerSqft: 50,
      baseFloorForFloorRise: 1,
      carpet: 900,
    },
  },
}

const result = calculateBookingPrice({
  unitItem,
  data: {
    parkingRequired: true,
    parkingCharges: 100000,
    gstPercent: 5,
    stampDutyPercent: 6,
    registrationAmount: 30000,
    legalDocumentationCharges: 15000,
    infrastructureDevelopmentCharges: 20000,
    societyFormationCharges: 10000,
    otherExpenses: [
      { name: "Admin", chargeType: "Fixed", amount: 5000 },
      { name: "Amenity", amount: 10000 },
    ],
  },
})

assert.equal(result.calculatedUnitPrice, 990000)
assert.equal(result.floorRiseCalculatedAmount, 90000)
assert.equal(result.riseSteps, 2)
assert.equal(result.agreementValue, 1000000)
assert.equal(result.parkingCharges, 100000)
assert.equal(result.fixedOtherCharges, 75000)
assert.equal(result.percentageCharges, 110000)
assert.equal(result.otherExpenseTotal, 15000)
assert.equal(result.allInclusiveAmount, 1200000)

console.log("booking pricing tests passed")
