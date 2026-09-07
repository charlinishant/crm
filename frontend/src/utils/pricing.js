export const parseSkippedFloors = (value) => {
  if (Array.isArray(value)) {
    return [...new Set(value.map((item) => Number(item)).filter((item) => Number.isInteger(item)))].sort((a, b) => a - b);
  }
  if (value === null || value === undefined || value === "") return [];
  const text = String(value).trim();
  if (!text) return [];
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      return parseSkippedFloors(JSON.parse(text));
    } catch {
      return [];
    }
  }
  return parseSkippedFloors(text.split(",").map((item) => item.trim()));
};

export const getFloorRiseSteps = ({ floorNumber, riseFromFloor, skippedFloors = [] }) => {
  const floor = Number(floorNumber);
  const startFloor = Number(riseFromFloor);
  if (!Number.isFinite(floor) || !Number.isFinite(startFloor) || floor <= startFloor) return 0;
  return Math.max(0, Math.trunc(floor) - Math.trunc(startFloor));
};

export const calculateFloorRiseAmount = ({ floorRiseEnabled = true, baseRate, floorRisePerSqft, floorNumber, riseFromFloor, reraArea, skippedFloors = [] }) => {
  const rate = Number(baseRate) || 0;
  const riseRate = Number(floorRisePerSqft) || 0;
  const area = Number(reraArea) || 0;
  const floorRiseFlag = floorRiseEnabled === true ? 1 : 0;
  const floorRiseSteps = getFloorRiseSteps({ floorNumber, riseFromFloor, skippedFloors });
  const floorRiseAmount = Number((riseRate * floorRiseSteps * area * floorRiseFlag).toFixed(2));
  return {
    floorRiseFlag,
    floorRiseSteps,
    riseSteps: floorRiseSteps,
    floorRiseCalculatedAmount: floorRiseAmount,
    floorRiseAmount,
    calculatedUnitPrice: Number(((rate * area) + (floorRiseEnabled ? floorRiseAmount : 0)).toFixed(2)),
  };
};

export const toSafeNumber = (value, fallback = 0) => {
  if (value === "" || value === null || value === undefined) return fallback;
  const number = Number(String(value).replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : fallback;
};

export const normalizeOtherExpenses = (rows = []) =>
  (Array.isArray(rows) ? rows : [])
    .map((row, index) => ({
      id: row?.id || `expense-${index}`,
      name: String(row?.name || row?.expenseName || "").trim(),
      amount: toSafeNumber(row?.amount, 0),
      sortOrder: Number.isInteger(Number(row?.sortOrder)) ? Number(row.sortOrder) : index,
    }))
    .filter((row) => row.name || row.amount > 0);

export const calculateBookingPricing = ({
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
  const safeReraArea = toSafeNumber(reraArea);
  const safeBaseRate = toSafeNumber(baseRate);
  const safeClosingRate = closingRate === "" || closingRate === null || closingRate === undefined
    ? safeBaseRate
    : toSafeNumber(closingRate);
  const safeParkingAmount = toSafeNumber(parkingAmount);
  const safeGstPercent = gstPercent === "" || gstPercent === null || gstPercent === undefined ? 5 : toSafeNumber(gstPercent, 5);
  const safeStampDutyPercent = stampDutyPercent === "" || stampDutyPercent === null || stampDutyPercent === undefined ? 6 : toSafeNumber(stampDutyPercent, 6);
  const safeLegalCharges = toSafeNumber(legalCharges);
  const safeRegistrationCharges = toSafeNumber(registrationCharges);
  const normalizedExpenses = normalizeOtherExpenses(otherExpenses);
  const totalFlatPrice = Number((safeReraArea * safeClosingRate).toFixed(2));
  const agreementValue = Number((totalFlatPrice + safeParkingAmount).toFixed(2));
  const gstAmount = Number((agreementValue * safeGstPercent / 100).toFixed(2));
  const stampDutyAmount = Number((agreementValue * safeStampDutyPercent / 100).toFixed(2));
  const otherExpenseTotal = Number(normalizedExpenses.reduce((total, row) => total + row.amount, 0).toFixed(2));
  const totalTaxes = Number((gstAmount + stampDutyAmount).toFixed(2));
  const totalAllInclusiveCost = Number((
    agreementValue + gstAmount + stampDutyAmount + safeLegalCharges + safeRegistrationCharges + otherExpenseTotal
  ).toFixed(2));

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
  };
};
