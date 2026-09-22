const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });

const prisma = require("../lib/prisma");

async function runValidation() {
  console.log("=========================================");
  console.log("CRM PROJECT DATA VALIDATION");
  console.log("=========================================\n");

  let passes = 0;
  let failures = 0;

  function assert(condition, message) {
    if (condition) {
      console.log(`✅ PASS: ${message}`);
      passes++;
    } else {
      console.error(`❌ FAIL: ${message}`);
      failures++;
    }
  }

  try {
    // 1. Validate Projects
    const triratna = await prisma.project.findFirst({
      where: { name: "TRIRATNA" },
      include: {
        tower: true,
        floor: true,
        unit: {
          include: {
            unitList: {
              include: {
                bookings: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    const shreeGanesh = await prisma.project.findFirst({
      where: { name: "SHREE GANESH" },
      include: {
        tower: true,
        floor: true,
        unit: {
          include: {
            unitList: {
              include: {
                bookings: {
                  include: {
                    lead: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    assert(Boolean(triratna), "Project TRIRATNA exists");
    assert(Boolean(shreeGanesh), "Project SHREE GANESH exists");

    if (!triratna || !shreeGanesh) {
      console.error("\nCannot proceed with validation until both projects exist.");
      console.log(`\nVALIDATION RESULT: FAIL (${failures} failed, ${passes} passed)`);
      process.exit(1);
    }

    // 2. Validate Towers
    const triratnaTower = triratna.tower.find((t) => t.name === "A");
    const shreeGaneshTower = shreeGanesh.tower.find((t) => t.name === "A");

    assert(Boolean(triratnaTower), "TRIRATNA Tower A exists");
    assert(Boolean(shreeGaneshTower), "SHREE GANESH Tower A exists");
    assert(triratna.tower.length === 1, "TRIRATNA has exactly 1 tower (Tower A)");
    assert(shreeGanesh.tower.length === 1, "SHREE GANESH has exactly 1 tower (Tower A)");
    assert(triratnaTower && triratnaTower.totalFloor >= 21, "TRIRATNA Tower A has at least 21 floors");
    assert(shreeGaneshTower && shreeGaneshTower.totalFloor >= 20, "SHREE GANESH Tower A has at least 20 floors");

    // 3. Validate Floor Plans
    assert(triratna.floor.length === 20, `TRIRATNA has 20 floor plans (found ${triratna.floor.length})`);
    assert(shreeGanesh.floor.length === 18, `SHREE GANESH has 18 floor plans (found ${shreeGanesh.floor.length})`);
    const totalFloorPlans = triratna.floor.length + shreeGanesh.floor.length;
    assert(totalFloorPlans === 38, `Total floor plans across both projects is 38 (found ${totalFloorPlans})`);

    // 4. Validate Units
    const triratnaUnitModels = triratna.unit.flatMap((u) => u.unitList || []);
    const shreeGaneshUnitModels = shreeGanesh.unit.flatMap((u) => u.unitList || []);

    assert(triratnaUnitModels.length === 66, `TRIRATNA has 66 units (found ${triratnaUnitModels.length})`);
    assert(shreeGaneshUnitModels.length === 56, `SHREE GANESH has 56 units (found ${shreeGaneshUnitModels.length})`);
    const totalUnits = triratnaUnitModels.length + shreeGaneshUnitModels.length;
    assert(totalUnits === 122, `Total units across both projects is 122 (found ${totalUnits})`);

    // 5. Validate Duplicate Units
    const triratnaUnitNames = new Set();
    let triratnaDupes = 0;
    triratnaUnitModels.forEach((u) => {
      if (triratnaUnitNames.has(u.name)) triratnaDupes++;
      triratnaUnitNames.add(u.name);
    });
    assert(triratnaDupes === 0, `TRIRATNA has 0 duplicate units (found ${triratnaDupes})`);

    const shreeGaneshUnitNames = new Set();
    let shreeGaneshDupes = 0;
    shreeGaneshUnitModels.forEach((u) => {
      if (shreeGaneshUnitNames.has(u.name)) shreeGaneshDupes++;
      shreeGaneshUnitNames.add(u.name);
    });
    assert(shreeGaneshDupes === 0, `SHREE GANESH has 0 duplicate units (found ${shreeGaneshDupes})`);

    // 6. Validate Vacant Units & Unit Statuses
    const triratnaVacant = triratnaUnitModels.filter((u) => (u.bookings || []).length === 0);
    const shreeGaneshVacant = shreeGaneshUnitModels.filter((u) => (u.bookings || []).length === 0);

    assert(triratnaVacant.length === 15, `TRIRATNA has 15 vacant units (found ${triratnaVacant.length})`);
    assert(shreeGaneshVacant.length === 16, `SHREE GANESH has 16 vacant units (found ${shreeGaneshVacant.length})`);
    assert(
      triratnaVacant.every((u) => u.status === "Available"),
      "All vacant TRIRATNA units have status Available"
    );
    assert(
      shreeGaneshVacant.every((u) => u.status === "Available"),
      "All vacant SHREE GANESH units have status Available"
    );

    // 7. Validate Leads & Purchaser Mappings
    const triratnaLeads = new Set(
      triratnaUnitModels
        .flatMap((u) => u.bookings || [])
        .map((b) => b.leadId)
        .filter(Boolean)
    );
    const shreeGaneshLeads = new Set(
      shreeGaneshUnitModels
        .flatMap((u) => u.bookings || [])
        .map((b) => b.leadId)
        .filter(Boolean)
    );

    assert(triratnaLeads.size === 44, `TRIRATNA has 44 unique purchaser Leads (found ${triratnaLeads.size})`);
    assert(shreeGaneshLeads.size === 35, `SHREE GANESH has 35 unique purchaser Leads (found ${shreeGaneshLeads.size})`);

    // 8. Verify specific multi-unit purchaser: Dinesh Thaku Naik in SHREE GANESH
    const dineshLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { firstName: "Dinesh", lastName: "Thaku Naik" },
          { companyName: "Dinesh Thaku Naik" },
        ],
      },
      include: {
        bookings: {
          include: {
            unitItem: true,
          },
        },
      },
    });

    assert(Boolean(dineshLead), "Lead 'Dinesh Thaku Naik' exists");
    if (dineshLead) {
      const dineshUnits = dineshLead.bookings.map((b) => b.unitItem?.name).filter(Boolean);
      assert(
        dineshUnits.length === 4,
        `Dinesh Thaku Naik is linked to exactly 4 units (found ${dineshUnits.length}: ${dineshUnits.join(", ")})`
      );
      const expectedDineshUnits = ["SHOP - 2", "SHOP - 3", "SHOP - 4", "1903"];
      const allFound = expectedDineshUnits.every((eu) => dineshUnits.includes(eu));
      assert(allFound, "Dinesh Thaku Naik linked to SHOP-2, SHOP-3, SHOP-4, and 1903");
    }

    // 9. Verify specific multi-unit purchaser: Samir Narendra Gokani in TRIRATNA
    const samirLead = await prisma.lead.findFirst({
      where: {
        OR: [
          { firstName: "Samir", lastName: "Narendra Gokani" },
          { companyName: "Samir Narendra Gokani" },
        ],
      },
      include: {
        bookings: {
          include: {
            unitItem: true,
          },
        },
      },
    });
    assert(Boolean(samirLead), "Lead 'Samir Narendra Gokani' exists");
    if (samirLead) {
      const samirUnits = samirLead.bookings.map((b) => b.unitItem?.name).filter(Boolean);
      assert(
        samirUnits.length === 2,
        `Samir Narendra Gokani is linked to exactly 2 units (found ${samirUnits.length}: ${samirUnits.join(", ")})`
      );
    }

    // 10. Verify tentative booking stages (no fake confirmed bookings)
    const allImportBookings = await prisma.booking.findMany({
      where: {
        unitItem: {
          is: {
            unit: {
              is: {
                projectId: { in: [triratna.id, shreeGanesh.id] },
              },
            },
          },
        },
      },
    });

    assert(
      allImportBookings.every((b) => b.stage === "Tentative" && b.activeUnitItemId === null),
      "All imported purchaser bookings have stage=Tentative and activeUnitItemId=null"
    );

    console.log("\n=========================================");
    console.log(`VALIDATION SUMMARY: ${failures === 0 ? "PASS" : "FAIL"}`);
    console.log(`Passed: ${passes}`);
    console.log(`Failed: ${failures}`);
    console.log("=========================================\n");

    if (failures > 0) {
      process.exit(1);
    }
  } catch (error) {
    console.error("Validation threw unexpected error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runValidation();
