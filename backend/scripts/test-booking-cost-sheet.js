const fs = require('fs');
const path = require('path');
const prisma = require('../lib/prisma');
const { buildBookingCostSheetData } = require('../services/costSheetData.service');
const { generateCostSheetExcel } = require('../services/excelCostSheetGenerator');
const { renderCostSheetHtml } = require('../services/costSheetPdf.service');
const { generateAndStoreBookingDocuments, logBookingDocumentAction, UPLOADS_ROOT } = require('../services/bookingDocument.service');

async function runCostSheetWorkflowTests() {
  console.log('====================================================');
  console.log('STARTING BOOKING COST SHEET & PAYMENT SCHEDULE TESTS');
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

  let testProject = null;
  let testTower = null;
  let testFloorPlan = null;
  let testUnit = null;
  let testUnitModel = null;
  let testLead = null;
  let testBooking = null;

  try {
    // ----------------------------------------------------
    // 1. Setup Test Project, Tower, FloorPlan, Unit & Lead
    // ----------------------------------------------------
    console.log('--- TEST GROUP 1: Test Data Setup (JAIGANGA Reference) ---');

    testProject = await prisma.project.create({
      data: {
        name: `TEST JAIGANGA ${Date.now()}`,
        projectType: 'Residential',
        address: 'Plot No 35/37, Sector No 2, RDP 1, Charkop Kandivali West Mumbai 400067'
      }
    });

    testTower = await prisma.tower.create({
      data: {
        name: 'Tower A',
        projectId: testProject.id
      }
    });

    testFloorPlan = await prisma.floorPlan.create({
      data: {
        name: '2 BHK Luxury Plan',
        projectId: testProject.id,
        towerId: testTower.id,
        configurationLabel: '2 BHK',
        type: 'Residential',
        category: '2 BHK',
        carpet: 641.86,
        baseRate: 18750,
        basePrice: 12035000,
        gstPercent: 5,
        stampDutyPercent: 6,
        registrationAmount: 50000
      }
    });

    testUnit = await prisma.unit.create({
      data: {
        projectId: testProject.id,
        towerId: testTower.id,
        floorId: testFloorPlan.id,
        type: 'Residential',
        category: '2 BHK',
        carpet: 641.86,
        description: 'Unit A-1401'
      }
    });

    testUnitModel = await prisma.unitModel.create({
      data: {
        name: 'A-1401',
        floor: 14,
        unitIndex: 1,
        baseRate: 18750,
        basePrice: 2500000,
        status: 'Available',
        unitId: testUnit.id
      }
    });

    testLead = await prisma.lead.create({
      data: {
        firstName: 'Rahul',
        lastName: 'Sharma',
        seats: 1,
        tenure: 1.0,
        industry: 'IT',
        phones: [{ value: '9876543210', label: 'mobile' }]
      }
    });

    assert(Boolean(testProject && testFloorPlan && testUnitModel), 'Test 1: Project, FloorPlan, Unit, Lead initialized');

    // ----------------------------------------------------
    // 2. Booking Creation with Agreed Price & Price Snapshot Freezing
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 2: Booking Creation & Pricing Freeze ---');

    const AGREEMENT_VALUE = 2500000;
    const FINAL_SOLD_PRICE = 2775000;
    const CARPET_AREA = 641.86;
    const FLAT_RATE = 18750;

    const priceSnapshot = {
      carpetArea: CARPET_AREA,
      flatRate: FLAT_RATE,
      flatCost: CARPET_AREA * FLAT_RATE,
      carParkingSlots: 0,
      parkingAmount: 0,
      totalFlatCost: CARPET_AREA * FLAT_RATE,
      gstPercent: 5,
      gstAmount: (AGREEMENT_VALUE * 0.05),
      stampDutyPercent: 6,
      stampDutyAmount: (AGREEMENT_VALUE * 0.06),
      registrationAmount: 50000,
      subTotal: (AGREEMENT_VALUE * 0.05) + (AGREEMENT_VALUE * 0.06) + 50000,
      grandTotal: FINAL_SOLD_PRICE,
      agreementValue: AGREEMENT_VALUE,
      soldPrice: FINAL_SOLD_PRICE,
      paymentScheduleBasis: 'AGREEMENT_VALUE',
      paymentBasisAmount: AGREEMENT_VALUE
    };

    testBooking = await prisma.booking.create({
      data: {
        lead: { connect: { id: testLead.id } },
        unit: { connect: { id: testUnit.id } },
        unitItem: { connect: { id: testUnitModel.id } },
        projectId: testProject.id,
        towerId: testTower.id,
        floorPlanId: testFloorPlan.id,
        customerName: 'Rahul Sharma',
        carpetArea: CARPET_AREA,
        baseRate: FLAT_RATE,
        closingBaseRate: FLAT_RATE,
        agreementValue: AGREEMENT_VALUE,
        soldPrice: FINAL_SOLD_PRICE,
        totalPrice: FINAL_SOLD_PRICE,
        gstPercent: 5,
        stampDutyPercent: 6,
        registrationAmount: 50000,
        priceSnapshot,
        paymentSchedule: {
          create: [
            { name: 'EOI', value: 10, towerMilestone: 'Booking', amount: 250000, taxes: 12500, tds: 2500, grandTotal: 262500, sortOrder: 0 },
            { name: 'On Registration of Sales Agreement', value: 20, towerMilestone: 'Registration', amount: 500000, taxes: 25000, tds: 5000, grandTotal: 525000, sortOrder: 1 },
            { name: 'On Completion of Plinth', value: 15, towerMilestone: 'Plinth', amount: 375000, taxes: 18750, tds: 3750, grandTotal: 393750, sortOrder: 2 },
            { name: 'On Slab wise upto 14th Floor (due as per slab)***', value: 25, towerMilestone: 'Slab', amount: 625000, taxes: 31250, tds: 6250, grandTotal: 656250, sortOrder: 3 },
            { name: 'On Execution of Internal Amenities of Flat', value: 10, towerMilestone: 'Internal Amenities', amount: 250000, taxes: 12500, tds: 2500, grandTotal: 262500, sortOrder: 4 },
            { name: 'On Execution of External Amenities of Flat', value: 10, towerMilestone: 'External Amenities', amount: 250000, taxes: 12500, tds: 2500, grandTotal: 262500, sortOrder: 5 },
            { name: 'On Execution of Lift & Paint', value: 5, towerMilestone: 'Lift & Paint', amount: 125000, taxes: 6250, tds: 1250, grandTotal: 131250, sortOrder: 6 },
            { name: 'Before handing over or on receipt of OC', value: 5, towerMilestone: 'Possession', amount: 125000, taxes: 6250, tds: 1250, grandTotal: 131250, sortOrder: 7 },
          ]
        }
      },
      include: { paymentSchedule: true }
    });

    assert(Boolean(testBooking && testBooking.id), 'Test 2: Booking record created with frozen pricing');
    assert(testBooking.agreementValue === AGREEMENT_VALUE, 'Test 2: Agreement Value correctly recorded as 25,00,000');
    assert(testBooking.soldPrice === FINAL_SOLD_PRICE, 'Test 2: Final Sold Price correctly recorded as 27,75,000');

    // ----------------------------------------------------
    // 3. Authoritative Data Builder Verification
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 3: Authoritative Cost Sheet Data Builder ---');
    const csData = await buildBookingCostSheetData(testBooking.id);

    assert(csData.unit.unitNo === 'A-1401', 'Test 3: Unit number identified as A-1401');
    assert(csData.pricing.carpetArea === CARPET_AREA, 'Test 3: Carpet Area is 641.86 Sq.Ft.');
    assert(csData.pricing.flatRate === FLAT_RATE, 'Test 3: Agreed Flat Rate is 18,750 / Sq.Ft.');
    assert(csData.pricing.paymentBasisAmount === AGREEMENT_VALUE, 'Test 3: Payment Schedule Basis amount is 25,00,000');
    assert(csData.paymentSchedule.totalPercentage === 100, 'Test 3: Total milestone percentages equal 100%');
    assert(csData.paymentSchedule.totalPrincipal === AGREEMENT_VALUE, 'Test 3: Total milestone principal equals 25,00,000');
    assert(csData.paymentSchedule.totalGst === 125000, 'Test 3: Total milestone GST equals 1,25,000 (5% of 25L)');
    assert(csData.paymentSchedule.totalTds === 25000, 'Test 3: Total milestone TDS equals 25,000 (1% of 25L)');
    assert(csData.paymentSchedule.reconciled === true, 'Test 3: Payment schedule successfully reconciled');

    // ----------------------------------------------------
    // 4. Excel Live Formulas Verification
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 4: Excel Generator & Live Formula AST Verification ---');
    const workbook = await generateCostSheetExcel(csData);
    const mainSheet = workbook.getWorksheet('Cost Sheet & Payment Schedule');
    assert(Boolean(mainSheet), 'Test 4: Cost Sheet & Payment Schedule single sheet present in workbook');
    assert(workbook.worksheets.length === 1, 'Test 4: Workbook contains exactly 1 clean main sheet');

    // Verify Formulas
    const d10Formula = mainSheet.getCell('D10').value?.formula || mainSheet.getCell('D10').formula;
    assert(d10Formula === 'D7*D8', 'Test 4: Cell D10 Flat Cost has live formula =D7*D8');

    const d15Formula = mainSheet.getCell('D15').value?.formula || mainSheet.getCell('D15').formula;
    assert(d15Formula === 'D10+D13', 'Test 4: Cell D15 Total Flat Cost has live formula =D10+D13');

    const d18Formula = mainSheet.getCell('D18').value?.formula || mainSheet.getCell('D18').formula;
    assert(d18Formula === 'D15*0.05', 'Test 4: Cell D18 GST has live formula =D15*0.05');

    const d19Formula = mainSheet.getCell('D19').value?.formula || mainSheet.getCell('D19').formula;
    assert(d19Formula === 'D15*0.06', 'Test 4: Cell D19 Stamp Duty has live formula =D15*0.06');

    // Find Sub Total and Grand Total cells
    let subTotalCell = null;
    let grandTotalCell = null;
    for (let r = 18; r <= 30; r++) {
      const bVal = String(mainSheet.getCell(`B${r}`).value || '');
      if (bVal === 'Sub Total') subTotalCell = mainSheet.getCell(`D${r}`);
      if (bVal.includes('TOTAL ( E + F )')) grandTotalCell = mainSheet.getCell(`D${r}`);
    }

    const subFormula = subTotalCell?.value?.formula || subTotalCell?.formula || '';
    assert(subFormula.startsWith('SUM(D18:D'), 'Test 4: Sub Total has live formula =SUM(D18:D...)');

    const gtFormula = grandTotalCell?.value?.formula || grandTotalCell?.formula || '';
    assert(gtFormula.startsWith('D15+D'), 'Test 4: Grand Total has live formula =D15+D{subTotal}');

    const j6Formula = mainSheet.getCell('J6').value?.formula || mainSheet.getCell('J6').formula;
    assert(j6Formula.includes('*G6'), 'Test 4: Cell J6 Milestone Amount has live formula referencing G6 percentage');

    const k6Formula = mainSheet.getCell('K6').value?.formula || mainSheet.getCell('K6').formula;
    assert(k6Formula === 'J6*0.01', 'Test 4: Cell K6 Milestone TDS has live formula =J6*0.01');

    const l6Formula = mainSheet.getCell('L6').value?.formula || mainSheet.getCell('L6').formula;
    assert(l6Formula === 'J6*0.05', 'Test 4: Cell L6 Milestone GST has live formula =J6*0.05');

    // ----------------------------------------------------
    // 5. HTML / PDF Renderer Verification
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 5: PDF / HTML Rendering Verification ---');
    const htmlOutput = await renderCostSheetHtml(csData);
    assert(htmlOutput.includes('A-1401'), 'Test 5: HTML contains Unit A-1401');
    assert(htmlOutput.includes('Rahul Sharma'), 'Test 5: HTML contains customer name Rahul Sharma');
    assert(htmlOutput.includes('Payment Schedule For : A-1401'), 'Test 5: HTML contains Payment Schedule header');
    assert(htmlOutput.includes('25,00,000.00'), 'Test 5: HTML contains formatted milestone totals 25,00,000.00');

    // ----------------------------------------------------
    // 6. File Storage, Versioning & Audit Trail
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 6: Storage, Versioning & Audit Logs ---');
    const docResult = await generateAndStoreBookingDocuments(testBooking.id, { performedBy: 'Test Runner' });

    assert(docResult.version === 'v1', 'Test 6: First document generation tagged as v1');
    const bookingDir = path.join(UPLOADS_ROOT, String(testBooking.id));
    assert(fs.existsSync(path.join(bookingDir, 'cost-sheet-v1.xlsx')), 'Test 6: XLSX file stored on disk under uploads/booking-invoices/:bookingId/');
    assert(fs.existsSync(path.join(bookingDir, 'cost-sheet-v1.html')), 'Test 6: HTML file stored on disk under uploads/booking-invoices/:bookingId/');

    const generatedDocsInDB = await prisma.generatedDocument.findMany({
      where: { bookingId: testBooking.id }
    });
    assert(generatedDocsInDB.length === 2, 'Test 6: 2 GeneratedDocument records created in DB (XLSX & PDF)');

    // Log user actions
    await logBookingDocumentAction(testBooking.id, 'BOOKING_COST_SHEET_XLSX', 'DOWNLOAD', 'Downloaded Excel Master', 'Admin User');
    await logBookingDocumentAction(testBooking.id, 'BOOKING_COST_SHEET_PDF', 'PRINT', 'Printed Cost Sheet', 'Admin User');

    const auditLogsInDB = await prisma.documentAuditLog.findMany({
      where: { bookingId: testBooking.id }
    });
    assert(auditLogsInDB.length === 3, 'Test 6: 3 DocumentAuditLog entries recorded (GENERATE, DOWNLOAD, PRINT)');

    // Test Regeneration (v2)
    const regenResult = await generateAndStoreBookingDocuments(testBooking.id, { performedBy: 'Admin User', isRegeneration: true });
    assert(regenResult.version === 'v2', 'Test 6: Regeneration tagged as v2');
    assert(fs.existsSync(path.join(bookingDir, 'cost-sheet-v2.xlsx')), 'Test 6: v2 XLSX file stored on disk');

    // ----------------------------------------------------
    // 7. Price Freezing Immutability Test
    // ----------------------------------------------------
    console.log('\n--- TEST GROUP 7: Price Freezing & FloorPlan Rate Immutability ---');
    // Modify FloorPlan base rate to 30,000
    await prisma.floorPlan.update({
      where: { id: testFloorPlan.id },
      data: { baseRate: 30000, basePrice: 99999999 }
    });

    const csDataAfterFloorPlanChange = await buildBookingCostSheetData(testBooking.id);
    assert(csDataAfterFloorPlanChange.pricing.flatRate === FLAT_RATE, 'Test 7: Cost Sheet retains frozen Flat Rate 18,750 even after FloorPlan changes to 30,000');
    assert(csDataAfterFloorPlanChange.pricing.paymentBasisAmount === AGREEMENT_VALUE, 'Test 7: Cost Sheet retains frozen Agreement Value 25,00,000');

    // ----------------------------------------------------
    // 8. Cleanup Test Records
    // ----------------------------------------------------
    console.log('\n--- Cleaning up test records ---');
    await prisma.documentAuditLog.deleteMany({ where: { bookingId: testBooking.id } });
    await prisma.generatedDocument.deleteMany({ where: { bookingId: testBooking.id } });
    await prisma.paymentSchedule.deleteMany({ where: { bookingId: testBooking.id } });
    await prisma.booking.deleteMany({ where: { id: testBooking.id } });
    await prisma.unitModel.deleteMany({ where: { id: testUnitModel.id } });
    await prisma.unit.deleteMany({ where: { id: testUnit.id } });
    await prisma.floorPlan.deleteMany({ where: { id: testFloorPlan.id } });
    await prisma.tower.deleteMany({ where: { id: testTower.id } });
    await prisma.lead.deleteMany({ where: { id: testLead.id } });
    await prisma.project.deleteMany({ where: { id: testProject.id } });

    // Remove temporary test uploads directory if exists
    if (fs.existsSync(bookingDir)) {
      fs.rmSync(bookingDir, { recursive: true, force: true });
    }

    console.log('Cleanup completed successfully.');

  } catch (error) {
    console.error('Test execution encountered error:', error);
  } finally {
    await prisma.$disconnect();
    console.log('\n====================================================');
    console.log(`TEST SUMMARY: ${passedTests}/${totalTests} TESTS PASSED`);
    console.log('====================================================');
  }
}

runCostSheetWorkflowTests();
