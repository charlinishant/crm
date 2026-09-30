const assert = require("assert");

// Test helpers replicating the exact logic in InventoryDrilldownBrowser.jsx

const normalizeUnitStatus = (status, unit) => {
  const rawPurpose = String(
    unit?.propertyPurpose ||
      unit?.unitStream ||
      unit?.floorPlanUnitStream ||
      unit?.floor?.unitStream ||
      ""
  ).toLowerCase();
  if (rawPurpose.includes("rehab")) return "rehab";

  const val = String(status || "available").toLowerCase();
  if (
    [
      "booked",
      "sold",
      "registered",
      "possession_given",
      "possession",
      "unavailable",
    ].includes(val)
  ) {
    return "sold";
  }
  if (val === "held") return "held";
  if (
    [
      "blocked",
      "block",
      "investor",
      "refuge",
      "cancelled",
    ].includes(val)
  ) {
    return "blocked";
  }
  if (["available", "vacant"].includes(val)) {
    return "available";
  }
  return "available";
};

const getTowerDisplayName = (tower, project) => {
  if (!tower) return "";
  const tName = String(tower.name || "").trim();
  const pName = String(project?.name || "").trim();
  if (tower.wingCode && String(tower.wingCode).trim()) {
    return `Wing ${String(tower.wingCode).trim()}`;
  }
  if (tName && pName && tName.toLowerCase() === pName.toLowerCase()) {
    return "Tower A";
  }
  if (/^[A-Z0-9]$/i.test(tName)) {
    return `Tower ${tName}`;
  }
  return tName || `Tower #${tower.id}`;
};

const getUnitConfiguration = (unit) => {
  const name = String(unit?.name || "").trim().toUpperCase();
  const rawConfig = String(unit?.configurationLabel || "").trim();
  const rawFpName = String(unit?.floorPlanName || "").trim();
  const rawType = String(unit?.unitType || "").trim();
  const rawBedrooms = unit?.bedrooms;

  // Check for Shop / Commercial
  if (
    name.startsWith("SH-") ||
    name.startsWith("SHOP") ||
    rawType.toLowerCase().includes("commercial") ||
    rawType.toLowerCase().includes("retail") ||
    rawConfig.toLowerCase().includes("shop") ||
    rawFpName.toLowerCase().includes("shop")
  ) {
    return "Shop";
  }

  // Check for Office
  if (
    name.startsWith("OFC") ||
    name.startsWith("OFFICE") ||
    rawConfig.toLowerCase().includes("office") ||
    rawFpName.toLowerCase().includes("office")
  ) {
    return "Office";
  }

  // If configurationLabel is explicit like "1 BHK", "2 BHK", "3 BHK", "4 BHK", "1 RK", "Penthouse", "Studio", "Duplex"
  if (rawConfig && !rawConfig.toUpperCase().startsWith("FP-")) {
    return rawConfig;
  }

  // If bedrooms is known
  if (rawBedrooms && Number(rawBedrooms) > 0) {
    return `${rawBedrooms} BHK`;
  }

  // Check floorPlanName
  if (rawFpName) {
    const bhkMatch = rawFpName.match(/(\d+)\s*(?:BHK|bhk)/i);
    if (bhkMatch) {
      return `${bhkMatch[1]} BHK`;
    }
    const rkMatch = rawFpName.match(/(\d+)\s*(?:RK|rk)/i);
    if (rkMatch) {
      return `${rkMatch[1]} RK`;
    }
    if (rawFpName.toLowerCase().includes("shop")) return "Shop";
    if (rawFpName.toLowerCase().includes("office")) return "Office";
    if (!rawFpName.toUpperCase().startsWith("FP-")) {
      return rawFpName;
    }
  }

  // Check unit name for BHK / RK if any
  const nameBhkMatch = name.match(/(\d+)\s*(?:BHK|bhk)/i);
  if (nameBhkMatch) return `${nameBhkMatch[1]} BHK`;

  return rawConfig || "Standard Unit";
};

// --- Test 1: Status Normalization ---
console.log("Testing Status Normalization...");
assert.strictEqual(normalizeUnitStatus("Available", { propertyPurpose: "Sale Unit" }), "available");
assert.strictEqual(normalizeUnitStatus("Available", { propertyPurpose: "Rehab Unit" }), "rehab");
assert.strictEqual(normalizeUnitStatus("Booked", { propertyPurpose: "Sale Unit" }), "sold");
assert.strictEqual(normalizeUnitStatus("Registered", { propertyPurpose: "Sale Unit" }), "sold");
assert.strictEqual(normalizeUnitStatus("Possession_Given", { propertyPurpose: "Sale Unit" }), "sold");
assert.strictEqual(normalizeUnitStatus("Held", { propertyPurpose: "Sale Unit" }), "held");
assert.strictEqual(normalizeUnitStatus("Blocked", { propertyPurpose: "Sale Unit" }), "blocked");
assert.strictEqual(normalizeUnitStatus("Investor", { propertyPurpose: "Sale Unit" }), "blocked");
console.log("✓ Status Normalization passed!");

// --- Test 2: Dynamic Unit Configuration Extraction ---
console.log("\nTesting Unit Configuration Extraction...");
assert.strictEqual(getUnitConfiguration({ name: "SH-01", unitType: "Commercial" }), "Shop");
assert.strictEqual(getUnitConfiguration({ name: "OFC - 101", configurationLabel: "FP-1" }), "Office");
assert.strictEqual(getUnitConfiguration({ name: "1301", configurationLabel: "2 BHK", bedrooms: 2 }), "2 BHK");
assert.strictEqual(getUnitConfiguration({ name: "1302", configurationLabel: "3 BHK", bedrooms: 3 }), "3 BHK");
assert.strictEqual(getUnitConfiguration({ name: "1303", floorPlanName: "1 BHK Compact Plan" }), "1 BHK");
console.log("✓ Unit Configuration Extraction passed!");

// --- Test 3: Tower and Heading Naming ---
console.log("\nTesting Tower and Heading Naming...");
const project = { id: 36, name: "Rajgruha Heights" };
const duplicateTower = { id: 47, name: "Rajgruha Heights" };
const regularTower = { id: 49, name: "A" };
const wingTower = { id: 50, name: "A", wingCode: "A" };

assert.strictEqual(getTowerDisplayName(duplicateTower, project), "Tower A");
assert.strictEqual(getTowerDisplayName(regularTower, project), "Tower A");
assert.strictEqual(getTowerDisplayName(wingTower, project), "Wing A");

const headingWithDuplicate = `${project.name} — ${getTowerDisplayName(duplicateTower, project)}`;
assert.strictEqual(headingWithDuplicate, "Rajgruha Heights — Tower A");
console.log("✓ Tower and Heading Naming passed: 'Rajgruha Heights — Tower A' (duplicate resolved)");

// --- Test 4: Status and Configuration Combined Filter ---
console.log("\nTesting Status + BHK Filter Combination...");
const mockUnits = [
  { id: 1, name: "101", status: "available", configurationLabel: "2 BHK", bedrooms: 2 },
  { id: 2, name: "102", status: "sold", configurationLabel: "2 BHK", bedrooms: 2 },
  { id: 3, name: "103", status: "rehab", configurationLabel: "2 BHK", bedrooms: 2 },
  { id: 4, name: "201", status: "available", configurationLabel: "3 BHK", bedrooms: 3 },
  { id: 5, name: "202", status: "sold", configurationLabel: "3 BHK", bedrooms: 3 },
  { id: 6, name: "203", status: "held", configurationLabel: "3 BHK", bedrooms: 3 },
  { id: 7, name: "SH-01", status: "available", configurationLabel: "Shop", unitType: "Commercial" },
  { id: 8, name: "SH-02", status: "sold", configurationLabel: "Shop", unitType: "Commercial" },
  { id: 9, name: "OFC-01", status: "available", configurationLabel: "Office" },
];

const filterUnits = (units, activeStatusFilter, selectedConfigFilter) => {
  return units.filter(u => {
    const statusMatch = activeStatusFilter === "all" || u.status === activeStatusFilter;
    const configMatch = selectedConfigFilter === "all" || getUnitConfiguration(u) === selectedConfigFilter;
    return statusMatch && configMatch;
  });
};

// 3 BHK + Available
const res3BhkAvail = filterUnits(mockUnits, "available", "3 BHK");
assert.strictEqual(res3BhkAvail.length, 1);
assert.strictEqual(res3BhkAvail[0].name, "201");

// Shop + Sold
const resShopSold = filterUnits(mockUnits, "sold", "Shop");
assert.strictEqual(resShopSold.length, 1);
assert.strictEqual(resShopSold[0].name, "SH-02");

// All + Rehab
const resAllRehab = filterUnits(mockUnits, "rehab", "all");
assert.strictEqual(resAllRehab.length, 1);
assert.strictEqual(resAllRehab[0].name, "103");

// --- Test 5: Intra-Floor Unit Ascending Sorting ---
console.log("\nTesting Intra-Floor Unit Ascending Sorting...");
const getUnitPositionSortValue = (unit) => {
  if (!unit) return 0;
  const explicitIndex = Number(unit.unitIndex ?? unit.position);
  if (Number.isFinite(explicitIndex) && explicitIndex > 0) {
    return explicitIndex;
  }
  const rawName = String(unit.name || unit.unitNo || "").trim();
  const match = rawName.match(/(\d+)$/);
  if (match) {
    const digitsStr = match[1];
    if (digitsStr.length >= 2) {
      const lastTwo = parseInt(digitsStr.slice(-2), 10);
      if (!Number.isNaN(lastTwo)) return lastTwo;
    }
    const val = parseInt(digitsStr, 10);
    if (!Number.isNaN(val)) return val;
  }
  return 0;
};

const sortUnitsAscending = (unitsList = []) => {
  return [...unitsList].sort((a, b) => {
    const posA = getUnitPositionSortValue(a);
    const posB = getUnitPositionSortValue(b);
    if (posA !== posB) {
      return posA - posB;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      numeric: true,
    });
  });
};

// Floor 13 out of order: [1303, 1304, 1301, 1302]
const floor13 = [{ name: "1303" }, { name: "1304" }, { name: "1301" }, { name: "1302" }];
const sortedFloor13 = sortUnitsAscending(floor13).map(u => u.name);
assert.deepStrictEqual(sortedFloor13, ["1301", "1302", "1303", "1304"]);

// Floor 12 out of order: [1203, 1204, 1201, 1202]
const floor12 = [{ name: "1203" }, { name: "1204" }, { name: "1201" }, { name: "1202" }];
const sortedFloor12 = sortUnitsAscending(floor12).map(u => u.name);
assert.deepStrictEqual(sortedFloor12, ["1201", "1202", "1203", "1204"]);

// Floor 11 out of order: [1103, 1101, 1102]
const floor11 = [{ name: "1103" }, { name: "1101" }, { name: "1102" }];
const sortedFloor11 = sortUnitsAscending(floor11).map(u => u.name);
assert.deepStrictEqual(sortedFloor11, ["1101", "1102", "1103"]);

// Shops out of order: [SH-04, SH-01, SH-03, SH-02]
const shops = [{ name: "SH-04" }, { name: "SH-01" }, { name: "SH-03" }, { name: "SH-02" }];
const sortedShops = sortUnitsAscending(shops).map(u => u.name);
assert.deepStrictEqual(sortedShops, ["SH-01", "SH-02", "SH-03", "SH-04"]);

console.log("✓ Floor 13 sorted:", sortedFloor13);
console.log("✓ Floor 12 sorted:", sortedFloor12);
console.log("✓ Floor 11 sorted:", sortedFloor11);
console.log("✓ Shops sorted:", sortedShops);

console.log("\nALL VERIFICATIONS PASSED SUCCESSFULLY!");
