const ExcelJS = require('exceljs');
const { buildBookingCostSheetData } = require('./costSheetData.service');

/**
 * Generate Jaiganga-style Cost Sheet & Payment Schedule Excel Workbook with Live Formulas
 * @param {Object|number} bookingOrData
 * @returns {Promise<ExcelJS.Workbook>}
 */
const generateCostSheetExcel = async (bookingOrData) => {
  let data;
  if (bookingOrData && bookingOrData.pricing && bookingOrData.paymentSchedule) {
    data = bookingOrData;
  } else {
    const bookingId = bookingOrData?.id || bookingOrData;
    data = await buildBookingCostSheetData(bookingId);
  }

  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'SWAMI CRM';
  workbook.lastModifiedBy = 'SWAMI CRM';
  workbook.created = new Date();
  workbook.modified = new Date();

  // ----------------------------------------------------
  // 1. Single Main Cost Sheet & Payment Schedule
  // ----------------------------------------------------
  const sheet = workbook.addWorksheet('Cost Sheet & Payment Schedule', {
    views: [{ showGridLines: true }]
  });
  sheet.properties.defaultRowHeight = 20;

  // Set column widths
  sheet.getColumn(1).width = 4;   // A
  sheet.getColumn(2).width = 25;  // B
  sheet.getColumn(3).width = 10;  // C
  sheet.getColumn(4).width = 16;  // D
  sheet.getColumn(5).width = 2;   // E (Spacer)
  sheet.getColumn(6).width = 38;  // F (Milestone)
  sheet.getColumn(7).width = 8;   // G (Net %)
  sheet.getColumn(8).width = 10;  // H (Due)
  sheet.getColumn(9).width = 8;   // I (Cuml. %)
  sheet.getColumn(10).width = 16; // J (Amount)
  sheet.getColumn(11).width = 12; // K (TDS)
  sheet.getColumn(12).width = 14; // L (GST)

  const thinBorder = {
    top: { style: 'thin' },
    left: { style: 'thin' },
    bottom: { style: 'thin' },
    right: { style: 'thin' }
  };

  const headerFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFFFE699' } // Light Yellow
  };

  const subHeaderFill = {
    type: 'pattern',
    pattern: 'solid',
    fgColor: { argb: 'FFD9EAD3' } // Light Green
  };

  const projectName = data.project.name || 'PROJECT NAME';
  const projectAddress = data.project.address || 'Project Address';
  const unitNo = data.unit.unitNo || 'A-1401';
  const configuration = data.unit.configuration || '2 BHK';
  const carpetArea = data.pricing.carpetArea;
  const flatRate = data.pricing.flatRate;

  // Row 1: Project Name
  sheet.mergeCells('A1:L1');
  const titleRow = sheet.getCell('A1');
  titleRow.value = `Project Name: "${projectName.toUpperCase()}"`;
  titleRow.font = { name: 'Times New Roman', size: 18, bold: true };
  titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
  titleRow.fill = headerFill;
  titleRow.border = thinBorder;

  // Row 2: Address
  sheet.mergeCells('A2:L2');
  const addrRow = sheet.getCell('A2');
  addrRow.value = projectAddress;
  addrRow.font = { name: 'Times New Roman', size: 11 };
  addrRow.alignment = { horizontal: 'center', vertical: 'middle' };
  addrRow.border = thinBorder;

  // Row 3: EOI Title
  sheet.mergeCells('F3:L3');
  const eoiRow = sheet.getCell('F3');
  eoiRow.value = data.project.eoiTitle || 'Expression of Interest in Proposed Self-Redevelopment';
  eoiRow.font = { name: 'Times New Roman', size: 10 };
  eoiRow.alignment = { horizontal: 'center', vertical: 'middle' };
  eoiRow.border = thinBorder;

  // Row 4: Top headers
  sheet.getCell('A4').value = 1;
  sheet.getCell('B4').value = data.unit.isCommercial ? 'Available Shop' : 'Available Flat';
  sheet.mergeCells('C4:D4');
  sheet.getCell('C4').value = unitNo;

  sheet.mergeCells('F4:L4');
  const psHeader = sheet.getCell('F4');
  psHeader.value = `Payment Schedule For : ${unitNo}`;
  psHeader.font = { name: 'Times New Roman', size: 12, bold: true };
  psHeader.alignment = { horizontal: 'center', vertical: 'middle' };
  psHeader.fill = subHeaderFill;
  psHeader.border = thinBorder;

  [sheet.getCell('A4'), sheet.getCell('B4'), sheet.getCell('C4')].forEach(c => {
    c.font = { bold: true };
    c.border = thinBorder;
  });

  // Row 5: Configuration & Milestone Headers
  sheet.getCell('A5').value = 2;
  sheet.getCell('B5').value = 'Configuration';
  sheet.mergeCells('C5:D5');
  sheet.getCell('C5').value = configuration;

  sheet.getCell('F5').value = 'Milestone';
  sheet.getCell('G5').value = 'Net';
  sheet.getCell('H5').value = 'Tentative';
  sheet.getCell('I5').value = 'Cuml.';
  sheet.getCell('J5').value = 'Amount';
  sheet.getCell('K5').value = 'TDS';
  sheet.getCell('L5').value = `GST ${(data.pricing.gstPercent || 5)}%`;

  [sheet.getCell('A5'), sheet.getCell('B5'), sheet.getCell('C5')].forEach(c => {
    c.font = { bold: true };
    c.border = thinBorder;
  });

  ['F5','G5','H5','I5','J5','K5','L5'].forEach(col => {
    const c = sheet.getCell(col);
    c.font = { bold: true, name: 'Times New Roman' };
    c.fill = headerFill;
    c.border = thinBorder;
    c.alignment = { horizontal: 'center', vertical: 'middle' };
  });

  // Left Block: Unit Details & Costs (Rows 6 - 23)
  sheet.getCell('C6').value = 'Unit';
  sheet.getCell('D6').value = 'Amount';
  sheet.getCell('C6').border = thinBorder; sheet.getCell('C6').font = { bold: true };
  sheet.getCell('D6').border = thinBorder; sheet.getCell('D6').font = { bold: true };

  // Flat Area (D7)
  sheet.getCell('A7').value = 'A';
  sheet.getCell('B7').value = 'Flat Area';
  sheet.getCell('C7').value = 'SFt.';
  sheet.getCell('D7').value = carpetArea;
  sheet.getCell('D7').numFmt = '#,##0.00';

  // Flat Rate (D8)
  sheet.getCell('A8').value = 'B';
  sheet.getCell('B8').value = 'Flat Rate';
  sheet.getCell('C8').value = '/SFt.';
  sheet.getCell('D8').value = flatRate;
  sheet.getCell('D8').numFmt = '#,##0.00';

  // Flat Cost (D10 = D7 * D8)
  sheet.getCell('A10').value = 'C';
  sheet.getCell('B10').value = 'Flat Cost';
  sheet.getCell('C10').value = 'Rs.';
  sheet.getCell('D10').value = { formula: 'D7*D8', result: data.pricing.flatCost };
  sheet.getCell('B10').font = { bold: true };
  sheet.getCell('D10').font = { bold: true };
  sheet.getCell('D10').numFmt = '#,##0.00';

  // Parking (D12, D13)
  sheet.getCell('A12').value = 'D';
  sheet.getCell('B12').value = 'No. of Parking';
  sheet.getCell('C12').value = 'No';
  sheet.getCell('D12').value = data.pricing.carParkingSlots || 0;
  sheet.getCell('B13').value = 'Parking Cost';
  sheet.getCell('C13').value = 'Rs.';
  sheet.getCell('D13').value = data.pricing.parkingAmount || 0;
  sheet.getCell('D13').numFmt = '#,##0.00';

  // Total Flat Cost (D15 = D10 + D13)
  sheet.getCell('A15').value = 'E';
  sheet.getCell('B15').value = 'Total Flat Cost';
  sheet.getCell('C15').value = 'Rs.';
  sheet.getCell('D15').value = { formula: 'D10+D13', result: data.pricing.totalFlatCost };
  sheet.getCell('B15').font = { bold: true };
  sheet.getCell('D15').font = { bold: true };
  sheet.getCell('D15').numFmt = '#,##0.00';

  for (let r = 7; r <= 15; r++) {
    for (let c = 1; c <= 4; c++) {
      if (sheet.getCell(r, c).value !== null) {
        sheet.getCell(r, c).border = thinBorder;
      }
    }
  }

  // ----------------------------------------------------
  // Other Costs Section (Left Block: Rows 17+)
  // ----------------------------------------------------
  const otherCostHeaderRow = 17;
  sheet.mergeCells(`A${otherCostHeaderRow}:D${otherCostHeaderRow}`);
  sheet.getCell(`A${otherCostHeaderRow}`).value = 'Other Cost';
  sheet.getCell(`A${otherCostHeaderRow}`).font = { bold: true };
  sheet.getCell(`A${otherCostHeaderRow}`).border = thinBorder;

  const gstDecimal = (data.pricing.gstPercent || 5) / 100;
  const stampDutyDecimal = (data.pricing.stampDutyPercent || 6) / 100;
  const tdsDecimal = (data.pricing.tdsPercent || 1) / 100;

  // Build the complete list of other cost items from the booking summary
  const otherCostItems = [
    {
      label: `GST @ ${data.pricing.gstPercent || 5}%`,
      formula: `D15*${gstDecimal}`,
      result: data.pricing.gstAmount,
    },
    {
      label: `Stamp Duty ${data.pricing.stampDutyPercent || 6}%`,
      formula: `D15*${stampDutyDecimal}`,
      result: data.pricing.stampDutyAmount,
    },
    {
      label: 'Legal Charges',
      value: data.pricing.legalCharges || 0,
    },
    {
      label: 'Registration Charges',
      value: data.pricing.registrationCharges || 0,
    },
  ];

  // Append any custom other expenses (e.g. Clubhouse, Maintenance, Infrastructure)
  if (Array.isArray(data.pricing.otherExpenses) && data.pricing.otherExpenses.length > 0) {
    data.pricing.otherExpenses.forEach((exp) => {
      otherCostItems.push({
        label: exp.name || 'Other Expense',
        value: Number(exp.amount || 0),
      });
    });
  }

  let curRow = 18;
  const startOtherRow = curRow;

  otherCostItems.forEach((item, idx) => {
    sheet.getCell(`A${curRow}`).value = idx + 1;
    sheet.getCell(`B${curRow}`).value = item.label;
    sheet.getCell(`C${curRow}`).value = 'Rs.';
    if (item.formula) {
      sheet.getCell(`D${curRow}`).value = { formula: item.formula, result: item.result };
    } else {
      sheet.getCell(`D${curRow}`).value = item.value;
    }
    sheet.getCell(`D${curRow}`).numFmt = '#,##0.00';
    for (let c = 1; c <= 4; c++) {
      sheet.getCell(curRow, c).border = thinBorder;
    }
    curRow++;
  });

  const lastOtherRow = curRow - 1;
  const subTotalRow = curRow;

  // Sub Total Row
  sheet.getCell(`A${subTotalRow}`).value = 'F';
  sheet.getCell(`B${subTotalRow}`).value = 'Sub Total';
  sheet.getCell(`C${subTotalRow}`).value = 'Rs.';
  sheet.getCell(`D${subTotalRow}`).value = {
    formula: `SUM(D${startOtherRow}:D${lastOtherRow})`,
    result: data.pricing.subTotal,
  };
  sheet.getCell(`B${subTotalRow}`).font = { bold: true };
  sheet.getCell(`D${subTotalRow}`).font = { bold: true };
  sheet.getCell(`D${subTotalRow}`).numFmt = '#,##0.00';
  for (let c = 1; c <= 4; c++) {
    sheet.getCell(subTotalRow, c).border = thinBorder;
  }
  curRow++;

  // Grand Total Row
  const grandTotalRow = curRow;
  sheet.getCell(`A${grandTotalRow}`).value = 'G';
  sheet.getCell(`B${grandTotalRow}`).value = 'TOTAL ( E + F )';
  sheet.getCell(`C${grandTotalRow}`).value = 'Rs.';
  sheet.getCell(`D${grandTotalRow}`).value = {
    formula: `D15+D${subTotalRow}`,
    result: data.pricing.grandTotal,
  };
  sheet.getCell(`D${grandTotalRow}`).numFmt = '#,##0.00';
  for (let c = 1; c <= 4; c++) {
    const cell = sheet.getCell(grandTotalRow, c);
    cell.fill = headerFill;
    cell.font = { bold: true };
    cell.border = thinBorder;
  }
  curRow++;

  // Signatory Block (Left Block: Below Grand Total)
  let sigRow = grandTotalRow + 2;
  sheet.mergeCells(`B${sigRow}:D${sigRow}`);
  sheet.getCell(`B${sigRow}`).value = `For ${projectName}`;
  sheet.getCell(`B${sigRow}`).font = { bold: true };
  sheet.getCell(`B${sigRow}`).alignment = { horizontal: 'center' };

  sigRow += 4;
  sheet.mergeCells(`B${sigRow}:D${sigRow}`);
  sheet.getCell(`B${sigRow}`).value = 'Authorised Signatory';
  sheet.getCell(`B${sigRow}`).font = { bold: true };
  sheet.getCell(`B${sigRow}`).alignment = { horizontal: 'center' };

  sigRow += 2;
  sheet.mergeCells(`A${sigRow}:D${sigRow}`);
  sheet.getCell(`A${sigRow}`).value = 'I/We hear by accept and confirm the terms';
  sheet.getCell(`A${sigRow}`).font = { bold: true };

  sigRow += 1;
  sheet.getCell(`A${sigRow}`).value = 'Name';
  sheet.getCell(`A${sigRow}`).font = { bold: true };
  sheet.mergeCells(`B${sigRow}:D${sigRow}`);
  sheet.getCell(`B${sigRow}`).value = data.signatory.customerName;
  sheet.getCell(`B${sigRow}`).font = { bold: true };
  sheet.getCell(`B${sigRow}`).alignment = { horizontal: 'center' };

  sigRow += 1;
  sheet.getCell(`A${sigRow}`).value = 'Sign';
  sheet.getCell(`A${sigRow}`).font = { bold: true };
  sheet.getCell(`C${sigRow}`).value = 'Date';
  sheet.getCell(`C${sigRow}`).font = { bold: true };
  sheet.getCell(`D${sigRow}`).value = data.signatory.bookingDate;

  for (let r = sigRow - 2; r <= sigRow; r++) {
    for (let c = 1; c <= 4; c++) {
      sheet.getCell(r, c).border = thinBorder;
    }
  }

  // ----------------------------------------------------
  // Right Block: Payment Schedule (Columns F to L)
  // ----------------------------------------------------
  const scheduleRows = data.paymentSchedule.rows;
  const startScheduleRow = 6;
  let currentScheduleRow = startScheduleRow;

  for (let i = 0; i < scheduleRows.length; i++) {
    const milestone = scheduleRows[i];
    const r = currentScheduleRow;

    sheet.getCell(`F${r}`).value = milestone.name;
    sheet.getCell(`G${r}`).value = milestone.value / 100;
    sheet.getCell(`G${r}`).numFmt = '0%';
    sheet.getCell(`H${r}`).value = milestone.tentative || '';

    // Cumulative formula
    sheet.getCell(`I${r}`).value = { formula: `SUM($G$6:G${r})`, result: milestone.cumlPercent / 100 };
    sheet.getCell(`I${r}`).numFmt = '0%';

    // Amount formula: =$D$15*G{r} (so editing Parking in D13 or Flat Cost in D10 automatically updates all milestones)
    const basisFormula = `$D$15*G${r}`;
    sheet.getCell(`J${r}`).value = { formula: basisFormula, result: milestone.amount };
    sheet.getCell(`J${r}`).numFmt = '#,##0.00';

    // TDS formula: =J{r}*tdsDecimal
    sheet.getCell(`K${r}`).value = { formula: `J${r}*${tdsDecimal}`, result: milestone.tds };
    sheet.getCell(`K${r}`).numFmt = '#,##0.00';

    // GST formula: =J{r}*gstDecimal
    sheet.getCell(`L${r}`).value = { formula: `J${r}*${gstDecimal}`, result: milestone.gst };
    sheet.getCell(`L${r}`).numFmt = '#,##0.00';

    for (let c = 6; c <= 12; c++) {
      sheet.getCell(r, c).border = thinBorder;
    }

    currentScheduleRow++;
  }

  const endScheduleRow = currentScheduleRow - 1;

  // Align schedule total row with either the end of schedule or grand total row
  const scheduleTotalRow = Math.max(currentScheduleRow, grandTotalRow);

  // Fill padding rows to align visually
  while (currentScheduleRow < scheduleTotalRow) {
    for (let c = 6; c <= 12; c++) {
      sheet.getCell(currentScheduleRow, c).border = thinBorder;
    }
    currentScheduleRow++;
  }

  // Schedule Totals
  sheet.mergeCells(`F${scheduleTotalRow}:H${scheduleTotalRow}`);
  sheet.getCell(`F${scheduleTotalRow}`).value = 'Total';
  sheet.getCell(`I${scheduleTotalRow}`).value = { formula: `SUM(G${startScheduleRow}:G${endScheduleRow})`, result: 1.0 };
  sheet.getCell(`I${scheduleTotalRow}`).numFmt = '0%';

  sheet.getCell(`J${scheduleTotalRow}`).value = { formula: `SUM(J${startScheduleRow}:J${endScheduleRow})`, result: data.paymentSchedule.totalPrincipal };
  sheet.getCell(`J${scheduleTotalRow}`).numFmt = '#,##0.00';

  sheet.getCell(`K${scheduleTotalRow}`).value = { formula: `SUM(K${startScheduleRow}:K${endScheduleRow})`, result: data.paymentSchedule.totalTds };
  sheet.getCell(`K${scheduleTotalRow}`).numFmt = '#,##0.00';

  sheet.getCell(`L${scheduleTotalRow}`).value = { formula: `SUM(L${startScheduleRow}:L${endScheduleRow})`, result: data.paymentSchedule.totalGst };
  sheet.getCell(`L${scheduleTotalRow}`).numFmt = '#,##0.00';

  for (let c = 6; c <= 12; c++) {
    const cell = sheet.getCell(scheduleTotalRow, c);
    cell.fill = headerFill;
    cell.font = { bold: true };
    cell.border = thinBorder;
  }

  // Footer notes for payment schedule
  const fnRow1 = scheduleTotalRow + 1;
  const fnRow2 = scheduleTotalRow + 2;
  sheet.mergeCells(`F${fnRow1}:L${fnRow2}`);
  const footerNoteCell = sheet.getCell(`F${fnRow1}`);
  footerNoteCell.value = `${data.footerNotes[0] || 'GST & Stamp Duty is as per the prevailing Govt. Norms.'}\n${data.footerNotes[1] || 'Society Development charges shall be applicable at the time of possessions as decided by society proportionate to all.'}`;
  footerNoteCell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  footerNoteCell.font = { size: 9 };
  footerNoteCell.border = thinBorder;

  // Global Bottom Note
  const globalNoteRow = Math.max(sigRow + 2, fnRow2 + 2);
  sheet.mergeCells(`A${globalNoteRow}:L${globalNoteRow}`);
  const globalNote = sheet.getCell(`A${globalNoteRow}`);
  globalNote.value = data.footerNotes[2] || 'NOTE: Committee Reserve the rights to change the price, configuration if not booked (rates are for 7 days).';
  globalNote.alignment = { horizontal: 'center' };
  globalNote.font = { size: 9 };

  return workbook;
};

module.exports = {
  generateCostSheetExcel
};
