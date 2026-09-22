const fs = require("fs");
const path = require("path");
const xlsx = require("xlsx");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("../lib/prisma");

// --- Configuration & Constants ---
const PROJECTS_CONFIG = {
  TRIRATNA: {
    sheetName: "TRIRATNA",
    name: "TRIRATNA",
    reraProjectId: null,
    reraNumber: "P51800080334",
    societyName: "CHARKOP TRIRATNA CO-OP. HSG. SOC. LTD.",
    address: "Plot No. 164, RDP-7, Part-II, Sector-3, Charkop, Kandivali (West), Mumbai - 400067",
    street: "Plot No. 164, RDP-7, Part-II, Sector-3",
    locality: "Charkop, Kandivali (West)",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    zip: "400067",
    projectType: "residential",
    towerName: "A",
    totalFloors: 21,
    expectedFloorPlans: 20,
  },
  SHREE_GANESH: {
    sheetName: "SHREE GANESH",
    name: "SHREE GANESH",
    reraProjectId: null,
    reraNumber: "P51800080348",
    societyName: "CHARKOP SHREE GANESH CO-OP. HSG. SOC. LTD.",
    address: "Plot No. 233, RDP-8, Part-II, Sector-3, Charkop, Kandivali (West), Mumbai - 400067",
    street: "Plot No. 233, RDP-8, Part-II, Sector-3",
    locality: "Charkop, Kandivali (West)",
    city: "Mumbai",
    state: "Maharashtra",
    country: "India",
    zip: "400067",
    projectType: "residential",
    towerName: "A",
    totalFloors: 20,
    expectedFloorPlans: 18,
  },
};

// Locate Excel File dynamically
function resolveExcelPath() {
  const candidates = [
    path.join(__dirname, "../Floor_Plan_Grouping_by_Project.xlsx"),
    path.join(__dirname, "../../Floor_Plan_Grouping_by_Project.xlsx"),
    path.join(process.cwd(), "Floor_Plan_Grouping_by_Project.xlsx"),
    path.join(process.cwd(), "backend/Floor_Plan_Grouping_by_Project.xlsx"),
  ];
  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }
  throw new Error("Could not find Floor_Plan_Grouping_by_Project.xlsx in expected paths.");
}

// Clean & normalize string
function cleanStr(val) {
  if (val === undefined || val === null) return "";
  const s = String(val).trim();
  return s === "—" || s === "-" ? "" : s;
}

// Parse numeric carpet area
function parseCarpet(val) {
  if (val === undefined || val === null || val === "" || val === "—") return null;
  const n = parseFloat(String(val).replace(/,/g, "").trim());
  return Number.isNaN(n) ? null : n;
}

// Parse purchaser name into salutation and cleaned name
function parsePurchaser(raw) {
  const text = cleanStr(raw);
  if (!text || text.toLowerCase() === "(vacant)" || text.toLowerCase() === "vacant") {
    return { isVacant: true, salutation: null, fullName: null, firstName: null, lastName: null };
  }

  // Detect salutation
  const match = text.match(/^(Mr\.|Mrs\.|Ms\.|Dr\.|Miss\.|Smt\.)\s*(.*)$/i);
  let salutation = null;
  let remaining = text;
  if (match) {
    salutation = match[1];
    remaining = match[2].trim();
  }

  // Split name into first and last name
  const nameParts = remaining.split(/\s+/).filter(Boolean);
  const firstName = nameParts[0] || remaining;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";

  return {
    isVacant: false,
    salutation,
    fullName: remaining,
    firstName,
    lastName,
  };
}

// Read and parse project data from Excel
function parseProjectSheet(workbook, config) {
  const sheet = workbook.Sheets[config.sheetName];
  if (!sheet) {
    throw new Error(`Sheet "${config.sheetName}" not found in Excel.`);
  }

  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1 });

  // Locate Suggested Floor Plans table
  const fpHeaderIdx = rawRows.findIndex(
    (r) => Array.isArray(r) && r[0] && String(r[0]).trim().toLowerCase() === "floor plan"
  );
  if (fpHeaderIdx === -1) {
    throw new Error(`Could not locate Floor Plan table in sheet "${config.sheetName}".`);
  }

  // Locate All Units table
  const unitHeaderIdx = rawRows.findIndex(
    (r, idx) => idx > fpHeaderIdx && Array.isArray(r) && r[0] && String(r[0]).trim().toLowerCase() === "sr."
  );
  if (unitHeaderIdx === -1) {
    throw new Error(`Could not locate Units table in sheet "${config.sheetName}".`);
  }

  // Parse Floor Plans Table
  const floorPlanTableRows = rawRows.slice(fpHeaderIdx + 1, unitHeaderIdx).filter((r) => {
    return r && r[0] && String(r[0]).trim().startsWith("FP");
  });

  const floorPlans = floorPlanTableRows.map((r) => {
    const fpName = cleanStr(r[0]);
    const type = cleanStr(r[1]); // SALE / REHAB
    const carpet = parseCarpet(r[2]);
    const unitCount = parseInt(r[3], 10) || 0;
    const floorsCovered = cleanStr(r[4]);
    const unitNumbersStr = cleanStr(r[5]);

    return {
      name: fpName,
      type,
      carpet,
      unitCount,
      floorsCovered,
      unitNumbersStr,
    };
  });

  // Parse Units Table
  const unitTableRows = rawRows.slice(unitHeaderIdx + 1).filter((r) => {
    return r && r[0] !== undefined && r[0] !== null && r[0] !== "" && cleanStr(r[2]) !== "";
  });

  const units = unitTableRows.map((r) => {
    const srNo = r[0];
    const type = cleanStr(r[1]); // SALE / REHAB
    const unitNumber = cleanStr(r[2]);
    const carpet = parseCarpet(r[3]);
    const linePos = cleanStr(r[4]);
    const floorVal = cleanStr(r[5]);
    const fpName = cleanStr(r[6]);
    const purchaserRaw = cleanStr(r[7]);

    const floorNum = floorVal ? parseInt(floorVal, 10) : null;
    const purchaserInfo = parsePurchaser(purchaserRaw);

    return {
      srNo,
      type,
      unitNumber,
      carpet,
      linePos: linePos || null,
      floor: Number.isInteger(floorNum) ? floorNum : null,
      floorPlanName: fpName,
      purchaserRaw,
      purchaser: purchaserInfo,
    };
  });

  return {
    config,
    floorPlans,
    units,
  };
}

// Safety check for environment
function verifyEnvironment(isDryRun, isProduction) {
  const dbUrl = process.env.DATABASE_URL || "";
  const envVar = process.env.ENVIRONMENT || "";

  if (isProduction) {
    if (process.env.CONFIRM_PRODUCTION_IMPORT !== "true") {
      console.error("\n❌ ABORTED: Production import requested without CONFIRM_PRODUCTION_IMPORT=true");
      console.error("Run with: CONFIRM_PRODUCTION_IMPORT=true npm run import:project-data:production\n");
      process.exit(1);
    }
    console.log("⚠️  RUNNING IN PRODUCTION MODE (CONFIRM_PRODUCTION_IMPORT=true verified)");
    return;
  }

  // Local verification
  if (!isDryRun) {
    const isLocalhost =
      dbUrl.includes("127.0.0.1") ||
      dbUrl.includes("localhost") ||
      process.env.DATABASE_HOST === "127.0.0.1" ||
      process.env.DATABASE_HOST === "localhost";

    if (!isLocalhost && envVar.toLowerCase() !== "local") {
      console.error("\n❌ SAFETY CHECK FAILED: Refusing to run import against non-local database!");
      console.error("DATABASE_URL does not point to localhost/127.0.0.1 and ENVIRONMENT is not 'local'.");
      console.error("If this is intended for production, use: npm run import:project-data:production with CONFIRM_PRODUCTION_IMPORT=true\n");
      process.exit(1);
    }
  }
}

async function runImport() {
  const args = process.argv.slice(2);
  const isDryRun = args.includes("--dry-run");
  const isProduction = args.includes("--production");

  verifyEnvironment(isDryRun, isProduction);

  console.log("=========================================");
  console.log(`CRM PROJECT IMPORT ${isDryRun ? "[DRY-RUN MODE]" : "[LIVE DATABASE MODE]"}`);
  console.log("=========================================");

  const excelPath = resolveExcelPath();
  console.log(`Source Excel: ${excelPath}`);
  const workbook = xlsx.readFile(excelPath);

  const parsedData = {
    TRIRATNA: parseProjectSheet(workbook, PROJECTS_CONFIG.TRIRATNA),
    SHREE_GANESH: parseProjectSheet(workbook, PROJECTS_CONFIG.SHREE_GANESH),
  };

  // Pre-calculate statistics
  const stats = {};
  for (const key of ["TRIRATNA", "SHREE_GANESH"]) {
    const item = parsedData[key];
    const vacantUnits = item.units.filter((u) => u.purchaser.isVacant);
    const occupiedUnits = item.units.filter((u) => !u.purchaser.isVacant);

    // Group occupied units by normalized purchaser name
    const leadsMap = new Map();
    occupiedUnits.forEach((u) => {
      const name = u.purchaser.fullName;
      if (!leadsMap.has(name)) {
        leadsMap.set(name, {
          info: u.purchaser,
          units: [],
        });
      }
      leadsMap.get(name).units.push(u.unitNumber);
    });

    stats[key] = {
      project: item.config.name,
      floorPlansCount: item.floorPlans.length,
      unitsCount: item.units.length,
      vacantCount: vacantUnits.length,
      occupiedCount: occupiedUnits.length,
      uniqueLeadsCount: leadsMap.size,
      leadsMap,
      duplicatePurchasers: Array.from(leadsMap.entries()).filter(([, v]) => v.units.length > 1),
    };
  }

  // Display dry-run preview or plan
  if (isDryRun) {
    console.log("\n--- DRY-RUN SUMMARY (NO DATABASE WRITES) ---");
    for (const key of ["TRIRATNA", "SHREE_GANESH"]) {
      const s = stats[key];
      console.log(`\nProject: ${s.project}`);
      console.log(`  Tower: A (Floors: ${PROJECT_CONFIG_FLOORS(key)})`);
      console.log(`  Floor Plans: ${s.floorPlansCount}`);
      console.log(`  Total Units: ${s.unitsCount}`);
      console.log(`  Vacant Units: ${s.vacantCount}`);
      console.log(`  Units with Purchasers: ${s.occupiedCount}`);
      console.log(`  Unique Leads to Create: ${s.uniqueLeadsCount}`);
      console.log(`  Purchasers with Multiple Units: ${s.duplicatePurchasers.length}`);
      s.duplicatePurchasers.forEach(([name, data]) => {
        console.log(`    - ${name} → ${data.units.join(", ")}`);
      });
    }

    console.log("\n=========================================");
    console.log("CRM PROJECT IMPORT");
    console.log("==================");
    printProjectSummary("TRIRATNA", "SIMULATED", stats.TRIRATNA);
    printProjectSummary("SHREE GANESH", "SIMULATED", stats.SHREE_GANESH);
    printTotalSummary(stats);
    console.log("=========================================\n");
    return;
  }

  // --- LIVE TRANSACTIONAL IMPORT ---
  const results = {};

  await prisma.$transaction(
    async (tx) => {
      for (const key of ["TRIRATNA", "SHREE_GANESH"]) {
        const item = parsedData[key];
        const config = item.config;
        const s = stats[key];

        // 1. Create or Find Project (Idempotent)
        let project = await tx.project.findFirst({
          where: { name: config.name },
        });

        let projectStatus = "EXISTING";
        if (!project) {
          project = await tx.project.create({
            data: {
              name: config.name,
              description: `${config.societyName} | MahaRERA: ${config.reraNumber}`,
              reraProjectId: null,
              projectType: config.projectType,
              address: config.address,
              street: config.street,
              locality: config.locality,
              city: config.city,
              state: config.state,
              country: config.country,
              zip: config.zip,
              inventory: true,
              active: true,
              noOfTowers: 1,
            },
          });
          projectStatus = "CREATED";
        } else {
          // Update address and description if missing
          project = await tx.project.update({
            where: { id: project.id },
            data: {
              address: project.address || config.address,
              street: project.street || config.street,
              locality: project.locality || config.locality,
              city: project.city || config.city,
              state: project.state || config.state,
              country: project.country || config.country,
              zip: project.zip || config.zip,
              inventory: true,
              active: true,
            },
          });
        }

        // 2. Create or Find Tower (Idempotent)
        let tower = await tx.tower.findFirst({
          where: {
            projectId: project.id,
            name: config.towerName,
          },
        });

        let towerStatus = "EXISTING";
        if (!tower) {
          tower = await tx.tower.create({
            data: {
              name: config.towerName,
              projectId: project.id,
              totalFloor: config.totalFloors,
              reraTowerId: config.reraNumber,
            },
          });
          towerStatus = "CREATED";
        } else {
          if ((tower.totalFloor || 0) < config.totalFloors) {
            tower = await tx.tower.update({
              where: { id: tower.id },
              data: { totalFloor: config.totalFloors },
            });
          }
        }

        // 3. Create or Find Floor Plans
        const floorPlanMap = new Map();
        for (const fp of item.floorPlans) {
          let floorPlan = await tx.floorPlan.findFirst({
            where: {
              projectId: project.id,
              towerId: tower.id,
              name: fp.name,
            },
          });

          // Determine floors from covered string (e.g., "11–21" or "1" or "10")
          const rangeParts = fp.floorsCovered
            .replace(/[–—]/g, "-")
            .split("-")
            .map((p) => parseInt(p.trim(), 10))
            .filter((p) => !Number.isNaN(p));

          const applicableFloorFrom = rangeParts.length >= 1 ? rangeParts[0] : null;
          const applicableFloorTo = rangeParts.length >= 2 ? rangeParts[1] : applicableFloorFrom;

          const unitStream = fp.type.toUpperCase() === "REHAB" ? "Rehab Unit" : "Sale Unit";

          if (!floorPlan) {
            floorPlan = await tx.floorPlan.create({
              data: {
                name: fp.name,
                projectId: project.id,
                towerId: tower.id,
                configurationLabel: fp.name,
                status: "Active",
                unitStream,
                type: fp.type,
                carpet: fp.carpet,
                applicableFloorFrom,
                applicableFloorTo,
                unitNumbers: fp.unitNumbersStr,
                totalUnitsOfPlan: fp.unitCount,
              },
            });
          } else {
            floorPlan = await tx.floorPlan.update({
              where: { id: floorPlan.id },
              data: {
                carpet: fp.carpet !== null ? fp.carpet : floorPlan.carpet,
                type: fp.type,
                unitStream,
                applicableFloorFrom: applicableFloorFrom ?? floorPlan.applicableFloorFrom,
                applicableFloorTo: applicableFloorTo ?? floorPlan.applicableFloorTo,
                unitNumbers: fp.unitNumbersStr || floorPlan.unitNumbers,
                totalUnitsOfPlan: fp.unitCount || floorPlan.totalUnitsOfPlan,
              },
            });
          }
          floorPlanMap.set(fp.name, floorPlan);
        }

        // 4. Create or Find Units & UnitModels
        // Group units by FloorPlan
        const unitsByFp = new Map();
        item.units.forEach((u) => {
          if (!unitsByFp.has(u.floorPlanName)) {
            unitsByFp.set(u.floorPlanName, []);
          }
          unitsByFp.get(u.floorPlanName).push(u);
        });

        const unitModelMap = new Map(); // unitNumber -> UnitModel record

        for (const [fpName, fpUnits] of unitsByFp.entries()) {
          const floorPlan = floorPlanMap.get(fpName);
          if (!floorPlan) {
            throw new Error(`Missing floor plan "${fpName}" for unit creation.`);
          }

          // Find or create the Unit group
          let unitGroup = await tx.unit.findFirst({
            where: {
              projectId: project.id,
              towerId: tower.id,
              floorId: floorPlan.id,
            },
          });

          if (!unitGroup) {
            unitGroup = await tx.unit.create({
              data: {
                projectId: project.id,
                towerId: tower.id,
                floorId: floorPlan.id,
                type: floorPlan.type,
                category: floorPlan.category || (floorPlan.name.includes("SHOP") ? "Shop" : "Flat"),
                carpet: floorPlan.carpet,
                description: `${project.name} Tower ${tower.name} ${floorPlan.name}`,
              },
            });
          }

          // Create or update individual UnitModel records
          for (const u of fpUnits) {
            const unitPositionNum = u.linePos ? parseInt(u.linePos, 10) : null;
            const unitIndex = Number.isInteger(unitPositionNum) ? unitPositionNum : null;
            const propertyPurpose = u.type.toUpperCase() === "REHAB" ? "Rehab Unit" : "Sale Unit";

            let unitItem = await tx.unitModel.findFirst({
              where: {
                unitId: unitGroup.id,
                name: u.unitNumber,
              },
            });

            if (!unitItem) {
              unitItem = await tx.unitModel.create({
                data: {
                  unitId: unitGroup.id,
                  name: u.unitNumber,
                  floor: u.floor,
                  unitIndex,
                  status: "Available",
                  propertyPurpose,
                },
              });
            } else {
              // Update non-destructive fields
              unitItem = await tx.unitModel.update({
                where: { id: unitItem.id },
                data: {
                  floor: u.floor ?? unitItem.floor,
                  unitIndex: unitIndex ?? unitItem.unitIndex,
                  propertyPurpose: propertyPurpose ?? unitItem.propertyPurpose,
                },
              });
            }

            unitModelMap.set(u.unitNumber, unitItem);

            // Maintain FloorPlanSlot if floor and unitPosition are valid positive integers
            if (Number.isInteger(u.floor) && u.floor >= 1 && u.linePos) {
              const positionStr = String(unitIndex || u.linePos).padStart(2, "0");
              const existingSlot = await tx.floorPlanSlot.findFirst({
                where: {
                  towerId: tower.id,
                  floor: u.floor,
                  unitPosition: positionStr,
                },
              });

              if (!existingSlot) {
                await tx.floorPlanSlot.create({
                  data: {
                    floorPlanId: floorPlan.id,
                    towerId: tower.id,
                    floor: u.floor,
                    unitPosition: positionStr,
                  },
                });
              }
            }
          }
        }

        // 5. Create or Find Leads & Associate Non-Confirmed Tentative Bookings
        const leadsCreatedOrFound = new Map();

        for (const [purchaserName, leadData] of s.leadsMap.entries()) {
          const info = leadData.info;

          // Find existing lead by exact normalized full name or match
          let lead = await tx.lead.findFirst({
            where: {
              OR: [
                {
                  firstName: info.firstName,
                  lastName: info.lastName,
                },
                {
                  companyName: purchaserName,
                },
              ],
              is_delete: false,
            },
          });

          if (!lead) {
            lead = await tx.lead.create({
              data: {
                salutation: info.salutation,
                firstName: info.firstName,
                lastName: info.lastName,
                companyName: purchaserName,
                status: "New",
                industry: "Real Estate Purchaser",
                seats: 0,
                tenure: 0,
                interestedProjects: project.name,
                tags: `Excel Import | ${project.name}`,
              },
            });
          } else {
            // Append project to interested projects if not present
            const currentProj = lead.interestedProjects || "";
            if (!currentProj.includes(project.name)) {
              lead = await tx.lead.update({
                where: { id: lead.id },
                data: {
                  interestedProjects: [currentProj, project.name].filter(Boolean).join(", "),
                },
              });
            }
          }

          leadsCreatedOrFound.set(purchaserName, lead);

          // Link Lead to each associated Unit via a Tentative Booking (Enquiry)
          for (const unitNumber of leadData.units) {
            const unitItem = unitModelMap.get(unitNumber);
            if (unitItem) {
              // Check if a tentative/enquiry booking already exists for this lead & unit
              const existingBooking = await tx.booking.findFirst({
                where: {
                  leadId: lead.id,
                  unitItemId: unitItem.id,
                },
              });

              if (!existingBooking) {
                await tx.booking.create({
                  data: {
                    leadId: lead.id,
                    unitId: unitItem.unitId,
                    unitItemId: unitItem.id,
                    activeUnitItemId: null, // Keep null: does NOT block the unit
                    stage: "Tentative",
                    customerName: purchaserName,
                    bookingName: `${purchaserName} - ${project.name} ${unitNumber}`,
                    totalAllInclusiveCost: 0,
                    agreementValue: 0,
                    basePrice: 0,
                  },
                });
              }
            }
          }
        }

        results[key] = {
          projectStatus,
          towerStatus,
          floorPlansCount: item.floorPlans.length,
          unitsCount: item.units.length,
          leadsCount: leadsCreatedOrFound.size,
          vacantCount: s.vacantCount,
        };
      }
    },
    {
      timeout: 120000, // 2 minutes timeout for bulk operations
    }
  );

  // Print Summary exactly as required by Phase 15
  console.log("\n=========================================");
  console.log("CRM PROJECT IMPORT");
  console.log("==================");
  printProjectSummary("TRIRATNA", results.TRIRATNA.projectStatus, results.TRIRATNA);
  printProjectSummary("SHREE GANESH", results.SHREE_GANESH.projectStatus, results.SHREE_GANESH);
  printTotalSummary(results);
  console.log("Errors:\n0\n");
  console.log("Warnings:\n0\n");
  console.log("=========================================\n");
}

function PROJECT_CONFIG_FLOORS(key) {
  return PROJECTS_CONFIG[key].totalFloors;
}

function printProjectSummary(projectName, status, data) {
  console.log(`\n${projectName}\n`);
  console.log(`Project:\n${status}\n`);
  console.log(`Tower:\n${data.towerStatus || status}\n`);
  console.log(`Floor Plans:\n${data.floorPlansCount}\n`);
  console.log(`Units:\n${data.unitsCount}\n`);
  console.log(`Leads: ${data.leadsCount || data.uniqueLeadsCount}\n`);
  console.log(`Vacant Units: ${data.vacantCount}\n`);
  console.log("=========================================");
}

function printTotalSummary(data) {
  console.log("\nTOTAL\n");
  console.log("Projects:\n2\n");
  console.log("Towers:\n2\n");
  console.log(`Floor Plans:\n${(data.TRIRATNA?.floorPlansCount || 0) + (data.SHREE_GANESH?.floorPlansCount || 0)}\n`);
  console.log(`Units:\n${(data.TRIRATNA?.unitsCount || 0) + (data.SHREE_GANESH?.unitsCount || 0)}\n`);
  console.log("=========================================\n");
}

runImport()
  .catch((err) => {
    console.error("\n❌ Import failed with error:");
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
