const { buildBookingCostSheetData, formatCurrency } = require('./costSheetData.service');

const renderCostSheetHtml = async (bookingOrData) => {
  let data;
  if (bookingOrData && bookingOrData.pricing && bookingOrData.paymentSchedule) {
    data = bookingOrData;
  } else {
    const bookingId = bookingOrData?.id || bookingOrData;
    data = await buildBookingCostSheetData(bookingId);
  }

  const p = data.pricing;
  const ps = data.paymentSchedule;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Cost Sheet - ${data.project.name} - ${data.unit.unitNo}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: 'Times New Roman', Times, serif;
      background: #f8fafc;
      color: #000;
      padding: 24px;
      font-size: 13px;
    }
    .cost-sheet-page {
      max-width: 960px;
      margin: 0 auto;
      background: #fff;
      padding: 24px;
      border: 1px solid #d1d5db;
      box-shadow: 0 4px 12px rgba(0,0,0,0.08);
    }
    .header-yellow {
      background-color: #ffe699;
      border: 1px solid #000;
      text-align: center;
      padding: 8px 12px;
      font-size: 18px;
      font-weight: bold;
      text-transform: uppercase;
    }
    .header-address {
      border: 1px solid #000;
      border-top: none;
      text-align: center;
      padding: 6px;
      font-size: 11px;
    }
    .eoi-banner {
      text-align: center;
      font-size: 11px;
      padding: 4px;
      font-style: italic;
      margin-bottom: 6px;
    }
    .dual-grid {
      display: flex;
      gap: 12px;
      align-items: flex-start;
      margin-top: 6px;
    }
    .left-panel {
      flex: 1.1;
    }
    .right-panel {
      flex: 1.9;
    }
    table.grid-table {
      width: 100%;
      border-collapse: collapse;
      font-size: 11px;
    }
    table.grid-table th, table.grid-table td {
      border: 1px solid #000;
      padding: 4px 6px;
    }
    .th-green {
      background-color: #d9ead3;
      text-align: center;
      font-weight: bold;
    }
    .th-yellow {
      background-color: #ffe699;
      text-align: center;
      font-weight: bold;
    }
    .text-center { text-align: center; }
    .text-right { text-align: right; }
    .font-bold { font-weight: bold; }
    .signatory-box {
      margin-top: 18px;
      border: 1px solid #000;
      padding: 10px;
      font-size: 11px;
    }
    .signatory-title {
      font-weight: bold;
      text-align: center;
      margin-bottom: 24px;
    }
    .signatory-sign-row {
      text-align: center;
      font-weight: bold;
      margin-bottom: 12px;
    }
    .signatory-client {
      border-top: 1px solid #000;
      padding-top: 8px;
    }
    .footer-notes {
      margin-top: 12px;
      border: 1px solid #000;
      padding: 6px;
      font-size: 9px;
      text-align: center;
      line-height: 1.4;
    }
    .global-note {
      margin-top: 8px;
      font-size: 9px;
      text-align: center;
    }
    @media print {
      body { background: #fff; padding: 0; }
      .cost-sheet-page { border: none; box-shadow: none; padding: 0; max-width: 100%; }
      @page { size: A4 landscape; margin: 10mm; }
    }
  </style>
</head>
<body>
  <div class="cost-sheet-page">
    <!-- Row 1: Project Name -->
    <div class="header-yellow">
      Project Name: "${data.project.name.toUpperCase()}"
    </div>
    <!-- Row 2: Address -->
    <div class="header-address">
      ${data.project.address}
    </div>
    <!-- Row 3: EOI -->
    <div class="eoi-banner">
      ${data.project.eoiTitle}
    </div>

    <!-- Dual Layout -->
    <div class="dual-grid">
      <!-- LEFT PANEL -->
      <div class="left-panel">
        <table class="grid-table">
          <tr>
            <td style="width: 25px;" class="text-center font-bold">1</td>
            <td class="font-bold">${data.unit.isCommercial ? "Available Shop" : "Available Flat"}</td>
            <td colspan="2" class="text-center font-bold">${data.unit.unitNo}</td>
          </tr>
          <tr>
            <td class="text-center font-bold">2</td>
            <td class="font-bold">Configuration</td>
            <td colspan="2" class="text-center font-bold">${data.unit.configuration}</td>
          </tr>
          <tr style="height: 6px;"><td colspan="4" style="background:#fff;border:none;"></td></tr>
          <tr>
            <td style="border:none;"></td>
            <td style="border:none;"></td>
            <td class="text-center font-bold" style="width: 45px;">Unit</td>
            <td class="text-center font-bold" style="width: 80px;">Amount</td>
          </tr>
          <tr>
            <td class="text-center font-bold">A</td>
            <td>Flat Area</td>
            <td class="text-center">SFt.</td>
            <td class="text-right">${formatCurrency(p.carpetArea)}</td>
          </tr>
          <tr>
            <td class="text-center font-bold">B</td>
            <td>Flat Rate</td>
            <td class="text-center">/SFt.</td>
            <td class="text-right">${formatCurrency(p.flatRate)}</td>
          </tr>
          <tr style="height: 4px;"><td colspan="4" style="background:#fff;border:none;"></td></tr>
          <tr>
            <td class="text-center font-bold">C</td>
            <td class="font-bold">Flat Cost</td>
            <td class="text-center font-bold">Rs.</td>
            <td class="text-right font-bold">${formatCurrency(p.flatCost)}</td>
          </tr>
          <tr style="height: 4px;"><td colspan="4" style="background:#fff;border:none;"></td></tr>
          <tr>
            <td class="text-center font-bold">D</td>
            <td>No. of Parking</td>
            <td class="text-center">No</td>
            <td class="text-right">${p.carParkingSlots}</td>
          </tr>
          <tr>
            <td style="border:none;"></td>
            <td>Parking Cost</td>
            <td class="text-center">Rs.</td>
            <td class="text-right">${formatCurrency(p.parkingAmount)}</td>
          </tr>
          <tr style="height: 4px;"><td colspan="4" style="background:#fff;border:none;"></td></tr>
          <tr>
            <td class="text-center font-bold">E</td>
            <td class="font-bold">Total Flat Cost</td>
            <td class="text-center font-bold">Rs.</td>
            <td class="text-right font-bold">${formatCurrency(p.totalFlatCost)}</td>
          </tr>
          <tr style="height: 6px;"><td colspan="4" style="background:#fff;border:none;"></td></tr>
          <tr>
            <td colspan="4" class="font-bold" style="background: #f1f5f9;">Other Cost</td>
          </tr>
          <tr>
            <td class="text-center">1</td>
            <td>GST @ ${p.gstPercent}%</td>
            <td class="text-center">Rs.</td>
            <td class="text-right">${formatCurrency(p.gstAmount)}</td>
          </tr>
          <tr>
            <td class="text-center">2</td>
            <td>Stamp Duty ${p.stampDutyPercent}%</td>
            <td class="text-center">Rs.</td>
            <td class="text-right">${formatCurrency(p.stampDutyAmount)}</td>
          </tr>
          <tr>
            <td class="text-center">3</td>
            <td>Legal Charges</td>
            <td class="text-center">Rs.</td>
            <td class="text-right">${formatCurrency(p.legalCharges || 0)}</td>
          </tr>
          <tr>
            <td class="text-center">4</td>
            <td>Registration Charges</td>
            <td class="text-center">Rs.</td>
            <td class="text-right">${formatCurrency(p.registrationCharges || 0)}</td>
          </tr>
          ${(p.otherExpenses || []).map((exp, expIdx) => `
          <tr>
            <td class="text-center">${5 + expIdx}</td>
            <td>${exp.name || 'Other Expense'}</td>
            <td class="text-center">Rs.</td>
            <td class="text-right">${formatCurrency(exp.amount || 0)}</td>
          </tr>
          `).join('')}
          <tr>
            <td class="text-center font-bold">F</td>
            <td class="font-bold">Sub Total</td>
            <td class="text-center font-bold">Rs.</td>
            <td class="text-right font-bold">${formatCurrency(p.subTotal)}</td>
          </tr>
          <tr style="height: 4px;"><td colspan="4" style="background:#fff;border:none;"></td></tr>
          <tr class="th-yellow">
            <td class="text-center font-bold">G</td>
            <td class="font-bold">TOTAL ( E + F )</td>
            <td class="text-center font-bold">Rs.</td>
            <td class="text-right font-bold">${formatCurrency(p.grandTotal)}</td>
          </tr>
        </table>

        <!-- Signatory Block -->
        <div class="signatory-box">
          <div class="signatory-title">For ${data.project.name}</div>
          <div class="signatory-sign-row">Authorised Signatory</div>
          <div class="signatory-client">
            <div style="font-weight:bold;margin-bottom:4px;">I/We hear by accept and confirm the terms</div>
            <div style="display:flex;justify-content:space-between;margin-top:6px;">
              <div><strong>Name:</strong> ${data.signatory.customerName}</div>
              <div><strong>Date:</strong> ${data.signatory.bookingDate}</div>
            </div>
            <div style="margin-top:8px;"><strong>Sign:</strong> ________________________</div>
          </div>
        </div>
      </div>

      <!-- RIGHT PANEL (Payment Schedule) -->
      <div class="right-panel">
        <table class="grid-table">
          <thead>
            <tr>
              <th colspan="7" class="th-green" style="font-size: 12px; padding: 6px;">
                Payment Schedule For : ${data.unit.unitNo}
              </th>
            </tr>
            <tr class="th-yellow">
              <th style="text-align:left;">Milestone</th>
              <th style="width: 40px;">Net</th>
              <th style="width: 45px;">Tentative</th>
              <th style="width: 45px;">Cuml.</th>
              <th style="width: 80px;">Amount</th>
              <th style="width: 60px;">TDS</th>
              <th style="width: 70px;">GST ${p.gstPercent}%</th>
            </tr>
          </thead>
          <tbody>
            ${ps.rows.map((row) => `
              <tr>
                <td>${row.name}</td>
                <td class="text-center">${row.percentage}%</td>
                <td class="text-center">${row.tentative || ""}</td>
                <td class="text-center">${row.cumlPercent}%</td>
                <td class="text-right">${formatCurrency(row.amount)}</td>
                <td class="text-right">${row.tds ? formatCurrency(row.tds) : "—"}</td>
                <td class="text-right">${formatCurrency(row.gst)}</td>
              </tr>
            `).join("")}
            <tr class="th-yellow font-bold">
              <td colspan="3" class="text-center">Total</td>
              <td class="text-center">${ps.totalPercentage}%</td>
              <td class="text-right">${formatCurrency(ps.totalPrincipal)}</td>
              <td class="text-right">${formatCurrency(ps.totalTds)}</td>
              <td class="text-right">${formatCurrency(ps.totalGst)}</td>
            </tr>
          </tbody>
        </table>

        <!-- Footer Notes -->
        <div class="footer-notes">
          <div>${data.footerNotes[0]}</div>
          <div>${data.footerNotes[1]}</div>
        </div>
      </div>
    </div>

    <!-- Global Note -->
    <div class="global-note">
      ${data.footerNotes[2]}
    </div>
  </div>
</body>
</html>`;
};

module.exports = {
  renderCostSheetHtml
};
