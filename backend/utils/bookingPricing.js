const { calculateUnitPrice, roundMoney } = require("./unitPricing")

const toNumberOrZero = (value) => {
  const number = Number(value)
  return Number.isFinite(number) && number >= 0 ? number : 0
}

const toBoolean = (value) => value === true || value === "true" || value === "Yes" || value === "1" || value === 1

const normalizeOtherExpenses = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({
      id: row?.id,
      name: String(row?.name || row?.expenseName || "").trim(),
      amount: toNumberOrZero(row?.amount),
      sortOrder: Number.isInteger(Number(row?.sortOrder)) ? Number(row.sortOrder) : index,
    }))
    .filter((row) => row.name || row.amount > 0)

const calculateBookingPricing = ({
  reraArea,
  baseRate,
  closingRate,
  parkingAmount,
  gstPercent = 5,
  stampDutyPercent = 6,
  legalCharges = 0,
  registrationCharges = 0,
  otherExpenses = [],
}) => {
  const safeReraArea = toNumberOrZero(reraArea)
  const safeBaseRate = toNumberOrZero(baseRate)
  const safeClosingRate = closingRate === "" || closingRate === null || closingRate === undefined
    ? safeBaseRate
    : toNumberOrZero(closingRate)
  const safeParkingAmount = toNumberOrZero(parkingAmount)
  const safeGstPercent = gstPercent === "" || gstPercent === null || gstPercent === undefined ? 5 : toNumberOrZero(gstPercent)
  const safeStampDutyPercent = stampDutyPercent === "" || stampDutyPercent === null || stampDutyPercent === undefined ? 6 : toNumberOrZero(stampDutyPercent)
  const safeLegalCharges = toNumberOrZero(legalCharges)
  const safeRegistrationCharges = toNumberOrZero(registrationCharges)
  const normalizedExpenses = normalizeOtherExpenses(otherExpenses)
  const totalFlatPrice = roundMoney(safeReraArea * safeClosingRate)
  const agreementValue = roundMoney(totalFlatPrice + safeParkingAmount)
  const gstAmount = roundMoney(agreementValue * safeGstPercent / 100)
  const stampDutyAmount = roundMoney(agreementValue * safeStampDutyPercent / 100)
  const otherExpenseTotal = roundMoney(normalizedExpenses.reduce((total, row) => total + row.amount, 0))
  const totalTaxes = roundMoney(gstAmount + stampDutyAmount)
  const totalAllInclusiveCost = roundMoney(
    agreementValue + gstAmount + stampDutyAmount + safeLegalCharges + safeRegistrationCharges + otherExpenseTotal
  )

  return {
    reraArea: safeReraArea,
    baseRate: safeBaseRate,
    closingRate: safeClosingRate,
    parkingAmount: safeParkingAmount,
    gstPercent: safeGstPercent,
    stampDutyPercent: safeStampDutyPercent,
    legalCharges: safeLegalCharges,
    registrationCharges: safeRegistrationCharges,
    otherExpenses: normalizedExpenses,
    totalFlatPrice,
    agreementValue,
    gstAmount,
    stampDutyAmount,
    otherExpenseTotal,
    totalTaxes,
    taxTotalAt11Percent: totalTaxes,
    totalAllInclusiveCost,
  }
}

const calculateBookingPrice = ({ unitItem, data = {} }) => {
  const unit = unitItem?.unit || {}
  const floor = unit.floor || {}
  const unitPricing = calculateUnitPrice({ floorPlan: floor, floorNumber: unitItem?.floor })
  const parkingCharges = toNumberOrZero(data.parkingAmount ?? data.parkingCharges)
  const parkingRequired = parkingCharges > 0 || toBoolean(data.parkingRequired)
  const transactionPricing = calculateBookingPricing({
    reraArea: unitPricing.reraArea,
    baseRate: unitPricing.baseRate,
    closingRate: data.closingRate ?? data.closingBaseRate ?? unitPricing.baseRate,
    parkingAmount: parkingCharges,
    gstPercent: data.gstPercent ?? 5,
    stampDutyPercent: data.stampDutyPercent ?? 6,
    legalCharges: data.legalCharges ?? data.legalDocumentationCharges,
    registrationCharges: data.registrationCharges ?? data.registrationAmount,
    otherExpenses: data.otherExpenses ?? data.customOtherCharges,
  })
  const agreementValue = transactionPricing.agreementValue
  const fixedOtherCharges = [
    transactionPricing.registrationCharges,
    transactionPricing.legalCharges,
    data.infrastructureDevelopmentCharges,
    data.societyFormationCharges,
    data.clubMembershipCharges,
    data.sinkingFundCorpus,
  ].reduce((total, value) => total + toNumberOrZero(value), 0)
  const allInclusiveAmount = roundMoney(
    agreementValue + fixedOtherCharges + transactionPricing.otherExpenseTotal + transactionPricing.gstAmount + transactionPricing.stampDutyAmount
  )

  return {
    ...transactionPricing,
    basePriceAtBaseFloor: unitPricing.basePriceAtBaseFloor,
    floorRiseCalculatedAmount: unitPricing.floorRiseCalculatedAmount,
    calculatedUnitPrice: unitPricing.calculatedUnitPrice,
    floorRiseEnabled: unitPricing.floorRiseEnabled,
    floorRisePerSqft: unitPricing.floorRiseEnabled ? unitPricing.floorRisePerSqft : null,
    baseFloorForFloorRise: unitPricing.floorRiseEnabled ? unitPricing.riseFromFloor : null,
    floorNumber: unitPricing.floorNumber,
    riseSteps: unitPricing.riseSteps,
    parkingCharges,
    fixedOtherCharges: roundMoney(fixedOtherCharges),
    percentageCharges: transactionPricing.totalTaxes,
    discountAmount: 0,
    allInclusiveAmount,
    soldPrice: toNumberOrZero(data.soldPrice || data.totalPrice) || allInclusiveAmount,
    unitPricing,
  }
}

module.exports = {
  calculateBookingPrice,
  calculateBookingPricing,
  normalizeOtherExpenses,
}
