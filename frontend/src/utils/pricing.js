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
  const skippedBeforeTarget = parseSkippedFloors(skippedFloors).filter((skipped) => skipped > startFloor && skipped < floor).length;
  return Math.max(0, Math.trunc(floor) - Math.trunc(startFloor) - skippedBeforeTarget);
};

export const calculateFloorRiseAmount = ({ baseRate, floorRisePerSqft, floorNumber, riseFromFloor, reraArea, skippedFloors = [] }) => {
  const rate = Number(baseRate) || 0;
  const riseRate = Number(floorRisePerSqft) || 0;
  const area = Number(reraArea) || 0;
  const floorRiseSteps = getFloorRiseSteps({ floorNumber, riseFromFloor, skippedFloors });
  return {
    floorRiseSteps,
    floorRiseAmount: Number(((rate + riseRate) * floorRiseSteps * area).toFixed(2)),
  };
};
