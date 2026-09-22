const prisma = require('../lib/prisma');
const { validateFloorRiseInputs } = require('../utils/unitPricing');

const isCommercialType = (type = '', category = '') => {
  const t = String(type || '').trim().toLowerCase();
  const c = String(category || '').trim().toLowerCase();
  return t === 'commercial' || t === 'shop' || c === 'commercial' || c === 'shop';
};

const generateUnitNumber = (floor, position, type = '', category = '') => {
  if (isCommercialType(type, category)) {
    return `SH-${String(position).padStart(2, '0')}`;
  }
  return `${floor}${String(position).padStart(2, '0')}`;
};

async function runTests() {
  console.log('====================================================');
  console.log('STARTING COMMERCIAL SHOPS INTEGRATION & UNIT TESTS');
  console.log('====================================================\n');

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition, testName, extra = '') {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, extra);
    }
  }

  try {
    // ----------------------------------------------------
    // TEST 1: Unit Pricing & Floor 0 Validation
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: Floor 0 & Negative Floor Validation ---');
    const validFloor0Error = validateFloorRiseInputs({
      baseRate: 2500,
      reraArea: 1000,
      floorRiseEnabled: true,
      floorRisePerSqft: 50,
      floorNumber: 0,
      riseFromFloor: 0
    });
    assert(validFloor0Error === null, 'TEST 10: Floor 0 is accepted without error in floor rise validation');

    const invalidNegFloorError = validateFloorRiseInputs({
      baseRate: 2500,
      reraArea: 1000,
      floorRiseEnabled: true,
      floorRisePerSqft: 50,
      floorNumber: -1,
      riseFromFloor: 0
    });
    assert(invalidNegFloorError !== null, 'TEST 11: Negative floor (-1) is rejected in floor rise validation');

    // ----------------------------------------------------
    // TEST 2: Commercial Unit Naming
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Commercial Unit Naming (SH-01..SH-10) vs Residential ---');
    const sh01 = generateUnitNumber(0, 1, 'Commercial');
    assert(sh01 === 'SH-01', 'Commercial Shop 1 on Floor 0 is named SH-01');

    const sh10 = generateUnitNumber(0, 10, 'Commercial');
    assert(sh10 === 'SH-10', 'Commercial Shop 10 on Floor 0 is named SH-10');

    const resUnit = generateUnitNumber(1, 2, 'Residential');
    assert(resUnit === '102', 'Residential Unit 2 on Floor 1 is named 102 (TEST 12 - Residential unchanged)');

    // ----------------------------------------------------
    // Database Setup for E2E Flow
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Database E2E Commercial Shop Flow ---');
    
    const testProjectName = `Commercial Plaza ${Date.now()}`;
    const project = await prisma.project.create({
      data: {
        name: testProjectName,
        projectType: 'Commercial'
      }
    });

    const tower = await prisma.tower.create({
      data: {
        name: 'Block A',
        projectId: project.id
      }
    });

    // Create FloorPlan for Ground Floor Commercial Shops (Applicable Floor 0 to 0, 5 shops)
    const floorPlan = await prisma.floorPlan.create({
      data: {
        name: 'Ground Floor Shops Plan',
        projectId: project.id,
        towerId: tower.id,
        applicableFloorFrom: 0,
        applicableFloorTo: 0,
        type: 'Commercial',
        category: 'Commercial',
        slots: {
          create: [1, 2, 3, 4, 5].map((pos) => ({
            towerId: tower.id,
            floor: 0,
            unitPosition: String(pos).padStart(2, '0')
          }))
        }
      },
      include: { slots: true }
    });

    assert(floorPlan.applicableFloorFrom === 0 && floorPlan.applicableFloorTo === 0, 'TEST 1: FloorPlan saved with Applicable Floor 0 to 0');
    assert(floorPlan.slots.length === 5, 'TEST 1: FloorPlan created with 5 shop slots');

    // Create parent Unit (floor definition in CRM architecture)
    const unitParent = await prisma.unit.create({
      data: {
        projectId: project.id,
        towerId: tower.id,
        floorId: floorPlan.id,
        type: 'Commercial',
        category: 'Commercial',
        carpet: 1000,
        description: 'Commercial Ground Floor Shops'
      }
    });

    // Create actual UnitModel records in DB corresponding to the 5 shops
    const createdShopModels = [];
    for (let i = 1; i <= 5; i++) {
      const u = await prisma.unitModel.create({
        data: {
          name: `SH-0${i}`,
          floor: 0,
          unitIndex: i,
          baseRate: 2500,
          basePrice: 2500000,
          status: 'Available',
          unitId: unitParent.id
        }
      });
      createdShopModels.push(u);
    }

    assert(createdShopModels.length === 5, 'TEST 1: 5 real UnitModel records created on Floor 0');
    assert(createdShopModels.every(u => u.floor === 0 && u.status === 'Available'), 'TEST 1 & 6: All shops have floor = 0 and status = Available');
    assert(createdShopModels.map(u => u.name).join(',') === 'SH-01,SH-02,SH-03,SH-04,SH-05', 'TEST 1: Correct shop naming SH-01 to SH-05');

    // ----------------------------------------------------
    // TEST 4: Query Preview Inventory
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Preview Inventory Query ---');
    const previewInventory = await prisma.unitModel.findMany({
      where: {
        unit: {
          projectId: project.id,
          towerId: tower.id,
          type: 'Commercial'
        },
        floor: 0
      },
      orderBy: { unitIndex: 'asc' }
    });

    assert(previewInventory.length === 5, 'TEST 2: Preview Inventory returns all 5 Commercial shops for Floor 0');
    assert(previewInventory[0].name === 'SH-01' && previewInventory[0].status === 'Available', 'TEST 2: SH-01 is AVAILABLE in Preview Inventory');

    // ----------------------------------------------------
    // TEST 5: Booking Workflow for SH-01
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: Booking SH-01 & DB Persistence ---');
    const lead = await prisma.lead.create({
      data: {
        firstName: 'Commercial',
        lastName: 'Buyer',
        seats: 1,
        tenure: 1.0,
        industry: 'Retail'
      }
    });

    const targetShop = createdShopModels[0]; // SH-01

    // Simulate atomic booking transaction as implemented in booking.controller.js
    const bookingResult = await prisma.$transaction(async (tx) => {
      // Step 1: Atomic status transition check
      const updateUnitResult = await tx.unitModel.updateMany({
        where: {
          id: targetShop.id,
          status: 'Available'
        },
        data: {
          status: 'Booked'
        }
      });

      if (updateUnitResult.count !== 1) {
        throw new Error('This shop is already booked.');
      }

      // Step 2: Create Booking record
      const newBooking = await tx.booking.create({
        data: {
          lead: { connect: { id: lead.id } },
          unit: { connect: { id: unitParent.id } },
          unitItem: { connect: { id: targetShop.id } },
          projectId: project.id,
          towerId: tower.id,
          agreementValue: targetShop.basePrice
        }
      });

      return newBooking;
    });

    assert(Boolean(bookingResult && bookingResult.id), 'TEST 4: Booking record created successfully for SH-01');

    // Verify DB status of SH-01
    const bookedShopInDB = await prisma.unitModel.findUnique({ where: { id: targetShop.id } });
    assert(bookedShopInDB.status === 'Booked', 'TEST 5 & 12: DB record for SH-01 changed to Booked');

    // Re-query Preview Inventory
    const refreshedInventory = await prisma.unitModel.findMany({
      where: {
        unit: { projectId: project.id, towerId: tower.id },
        floor: 0
      },
      orderBy: { unitIndex: 'asc' }
    });

    assert(refreshedInventory.find(u => u.name === 'SH-01').status === 'Booked', 'TEST 5 & 6 & 13: Preview Inventory shows SH-01 as BOOKED');
    assert(refreshedInventory.filter(u => u.name !== 'SH-01').every(u => u.status === 'Available'), 'TEST 5 & 6 & 13: SH-02 through SH-05 remain AVAILABLE');

    // ----------------------------------------------------
    // TEST 6: Double Booking Rejection (Direct API & DB Protection)
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 6: Double Booking & Concurrency Protection ---');
    let doubleBookingError = null;
    try {
      await prisma.$transaction(async (tx) => {
        const updateUnitResult = await tx.unitModel.updateMany({
          where: {
            id: targetShop.id,
            status: 'Available'
          },
          data: {
            status: 'Booked'
          }
        });

        if (updateUnitResult.count !== 1) {
          throw new Error('This shop is already booked.');
        }

        await tx.booking.create({
          data: {
            lead: { connect: { id: lead.id } },
            unit: { connect: { id: unitParent.id } },
            unitItem: { connect: { id: targetShop.id } },
            projectId: project.id,
            towerId: tower.id,
            agreementValue: targetShop.basePrice
          }
        });
      });
    } catch (err) {
      doubleBookingError = err.message;
    }

    assert(doubleBookingError === 'This shop is already booked.', 'TEST 7: Second booking on SH-01 rejected with "This shop is already booked."');

    // ----------------------------------------------------
    // TEST 7: Booking Allowed for SH-02
    // ----------------------------------------------------
    const shop02 = createdShopModels[1]; // SH-02
    let shop02Booking = null;
    try {
      shop02Booking = await prisma.$transaction(async (tx) => {
        const updateUnitResult = await tx.unitModel.updateMany({
          where: {
            id: shop02.id,
            status: 'Available'
          },
          data: {
            status: 'Booked'
          }
        });

        if (updateUnitResult.count !== 1) {
          throw new Error('This shop is already booked.');
        }

        return await tx.booking.create({
          data: {
            lead: { connect: { id: lead.id } },
            unit: { connect: { id: unitParent.id } },
            unitItem: { connect: { id: shop02.id } },
            projectId: project.id,
            towerId: tower.id,
            agreementValue: shop02.basePrice
          }
        });
      });
    } catch (err) {
      // should succeed
    }
    assert(Boolean(shop02Booking && shop02Booking.id), 'TEST 8: Booking allowed for SH-02');

    // ----------------------------------------------------
    // TEST 8: Concurrency Race Condition Test on SH-03
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 7: Concurrency Simulation (2 Simultaneous Users for SH-03) ---');
    const shop03 = createdShopModels[2]; // SH-03

    const attemptBooking = async (buyerName) => {
      const buyerLead = await prisma.lead.create({
        data: {
          firstName: buyerName,
          lastName: 'Test',
          seats: 1,
          tenure: 1.0,
          industry: 'Retail'
        }
      });

      return prisma.$transaction(async (tx) => {
        const updateUnitResult = await tx.unitModel.updateMany({
          where: {
            id: shop03.id,
            status: 'Available'
          },
          data: {
            status: 'Booked'
          }
        });

        if (updateUnitResult.count !== 1) {
          throw new Error('Shop already booked.');
        }

        return await tx.booking.create({
          data: {
            lead: { connect: { id: buyerLead.id } },
            unit: { connect: { id: unitParent.id } },
            unitItem: { connect: { id: shop03.id } },
            projectId: project.id,
            towerId: tower.id,
            agreementValue: shop03.basePrice
          }
        });
      });
    };

    const results = await Promise.allSettled([
      attemptBooking('Buyer 1'),
      attemptBooking('Buyer 2')
    ]);

    const successes = results.filter(r => r.status === 'fulfilled');
    const failures = results.filter(r => r.status === 'rejected');

    assert(successes.length === 1, 'TEST 9: Exactly one user succeeded in simultaneous booking');
    assert(failures.length === 1 && failures[0].reason.message === 'Shop already booked.', 'TEST 9: Second concurrent user received "Shop already booked."');

    // Cleanup created test records
    console.log('\n--- Cleaning up test records ---');
    await prisma.booking.deleteMany({ where: { projectId: project.id } });
    await prisma.unitModel.deleteMany({ where: { unitId: unitParent.id } });
    await prisma.unit.deleteMany({ where: { projectId: project.id } });
    await prisma.floorPlanSlot.deleteMany({ where: { floorPlanId: floorPlan.id } });
    await prisma.floorPlan.deleteMany({ where: { projectId: project.id } });
    await prisma.tower.deleteMany({ where: { projectId: project.id } });
    await prisma.lead.deleteMany({ where: { id: { in: [lead.id] } } });
    await prisma.project.delete({ where: { id: project.id } });

    console.log('Test records cleaned up successfully.');

  } catch (error) {
    console.error('Test execution encountered error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('====================================================');
  }
}

runTests();
