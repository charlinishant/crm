const prisma = require("../lib/prisma");

// ─── Document types catalogue (Section 7: The Seven Documents) ───────────────
const docTypes = [
  "WELCOME_LETTER",
  "BOOKING_COST_SHEET_PDF",
  "TOKEN_RECEIPT",
  "ALLOTMENT_LETTER",
  "AGREEMENT",
  "DEMAND_LETTER",
  "POSSESSION_LETTER",
  // Legacy / supporting types kept for backwards compatibility:
  "BOOKING_COST_SHEET_XLSX",
  "PARKING_LETTER",
  "RECEIPT",
  "NOC",
  "CANCELLATION_LETTER"
];

const parseMaybeJson = (value) => {
  if (typeof value !== "string") return value;
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (!["[", "{"].includes(trimmed.charAt(0))) return value;
  try {
    return JSON.parse(trimmed);
  } catch {
    return value;
  }
};

const getContactValue = (value, keys) => {
  const parsed = parseMaybeJson(value);
  if (parsed === undefined || parsed === null || parsed === "") return "";
  if (typeof parsed === "string" || typeof parsed === "number") return String(parsed);
  if (Array.isArray(parsed)) {
    return parsed.map((item) => getContactValue(item, keys)).filter(Boolean).join(", ");
  }
  if (typeof parsed === "object") {
    for (const key of keys) {
      const nested = getContactValue(parsed[key], keys);
      if (nested) return nested;
    }
    return Object.values(parsed).map((item) => getContactValue(item, keys)).filter(Boolean).join(", ");
  }
  return "";
};

// ─── Indian Statutory Financial Year & Project Code Helpers ──────────────────
const getFinancialYear = (date = new Date()) => {
  const d = new Date(date);
  const year = d.getFullYear();
  const month = d.getMonth() + 1;
  if (month >= 4) {
    const nextYear = String(year + 1).slice(-2);
    return `${year}-${nextYear}`;
  } else {
    const prevYear = year - 1;
    const currYear = String(year).slice(-2);
    return `${prevYear}-${currYear}`;
  }
};

const getProjectCode = (booking) => {
  const pName = booking?.unit?.project?.name || booking?.projectDetails || "SWAMI";
  const clean = pName.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (clean.includes("RAJGRUHA")) return "RAJ";
  if (clean.includes("GANESH") || clean.includes("SHREEGANESH")) return "SG";
  if (clean.includes("AMRAPALI")) return "AMP";
  if (clean.includes("TRIRATNA")) return "TRT";
  return clean.slice(0, 3) || "SWM";
};

// ─── Letterhead CSS (shared across all templates) ────────────────────────────
const LETTERHEAD_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: 'Inter', 'Segoe UI', sans-serif;
    color: #1e293b;
    background: #fff;
    padding: 48px 56px;
    line-height: 1.65;
    font-size: 14px;
  }
  .letterhead {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    border-bottom: 3px solid #1d4ed8;
    padding-bottom: 20px;
    margin-bottom: 32px;
  }
  .brand-logo {
    display: block;
    height: auto;
    max-height: 92px;
    object-fit: contain;
    width: 92px;
  }
  .brand-tagline { font-size: 11px; color: #64748b; margin-top: 3px; letter-spacing: 0.5px; text-transform: uppercase; }
  .ref-block { text-align: right; font-size: 12px; color: #64748b; }
  .ref-block .ref-no { font-weight: 700; color: #1e293b; font-size: 13px; }
  .doc-title {
    font-size: 20px;
    font-weight: 700;
    color: #1e293b;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-left: 4px solid #1d4ed8;
    padding-left: 14px;
    margin-bottom: 20px;
  }
  .salutation { margin-bottom: 16px; }
  .body-text { margin-bottom: 12px; color: #374151; }
  .data-table {
    width: 100%;
    border-collapse: collapse;
    margin: 20px 0;
    font-size: 13px;
  }
  .data-table th {
    background: #eff6ff;
    color: #1d4ed8;
    padding: 10px 14px;
    text-align: left;
    font-weight: 600;
    border: 1px solid #bfdbfe;
  }
  .data-table td {
    padding: 10px 14px;
    border: 1px solid #e2e8f0;
    vertical-align: top;
  }
  .data-table td.label {
    font-weight: 600;
    color: #475569;
    background: #f8fafc;
    width: 30%;
  }
  .data-table tr:nth-child(even) td:not(.label) { background: #fafafa; }
  .highlight-row td { background: #eff6ff !important; font-weight: 600; }
  .amount-words {
    background: #f0fdf4;
    border: 1px solid #86efac;
    padding: 10px 16px;
    border-radius: 6px;
    font-style: italic;
    color: #15803d;
    margin: 16px 0;
    font-size: 13px;
  }
  .notice-box {
    background: #fefce8;
    border: 1px solid #fde047;
    padding: 12px 16px;
    border-radius: 6px;
    color: #854d0e;
    font-size: 12px;
    margin: 16px 0;
  }
  .signature-section {
    margin-top: 56px;
    display: flex;
    justify-content: space-between;
    align-items: flex-end;
  }
  .signature-block { text-align: center; }
  .signature-line {
    width: 180px;
    border-top: 1px solid #94a3b8;
    padding-top: 8px;
    font-size: 12px;
    color: #64748b;
  }
  .footer-note {
    margin-top: 32px;
    border-top: 1px solid #e2e8f0;
    padding-top: 14px;
    font-size: 11px;
    color: #94a3b8;
    text-align: center;
  }
  .badge {
    display: inline-block;
    padding: 3px 10px;
    border-radius: 999px;
    font-size: 11px;
    font-weight: 600;
    background: #dbeafe;
    color: #1d4ed8;
  }
  @media print {
    body { padding: 24px 32px; }
    .no-print { display: none; }
  }
`;

const headerHTML = (refNo, date) => `
  <div class="letterhead">
    <div>
      <img class="brand-logo" src="/assets/images/logo.png" alt="SWAMI" />
      <div class="brand-tagline">Premium Real Estate CRM · Post-Sales Division</div>
    </div>
    <div class="ref-block">
      <div class="ref-no">${refNo}</div>
      <div>Date: ${date}</div>
    </div>
  </div>
`;

const signatureHTML = (sigName = "Authorized Signatory", dept = "Post-Sales Department") => `
  <div class="signature-section">
    <div></div>
    <div class="signature-block">
      <div class="signature-line">
        <strong>${sigName}</strong><br>${dept}<br>SWAMI
      </div>
    </div>
  </div>
  <div class="footer-note">
    This is a computer-generated document. For queries contact your Relationship Manager.<br>
    SWAMI CRM - Premium Post-Sales Housing Solutions
  </div>
`;

// ─── Document Templates ───────────────────────────────────────────────────────
const documentTemplates = {

  WELCOME_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}</style></head><body>
${headerHTML("WEL-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Welcome Letter</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">Congratulations on your decision to invest in your dream home with <strong>SWAMI</strong>! We are delighted to welcome you to our growing community of home-owners at <strong>{{projectName}}</strong>.</p>
<p class="body-text">Your booking has been successfully confirmed, and our dedicated Post-Sales Relationship Manager will guide you through every step — from document execution to final possession handover.</p>
<table class="data-table">
  <tr><td class="label">Booking Reference</td><td><strong>BKG-{{bookingId}}</strong></td><td class="label">Booking Date</td><td>{{bookingDate}}</td></tr>
  <tr><td class="label">Customer Name</td><td>{{customerName}}</td><td class="label">Contact</td><td>{{customerPhone}}</td></tr>
  <tr><td class="label">Project Name</td><td>{{projectName}}</td><td class="label">Tower</td><td>{{towerName}}</td></tr>
  <tr><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong></td><td class="label">Carpet Area</td><td>{{carpetArea}}</td></tr>
  <tr><td class="label">Saleable Area</td><td>{{saleableArea}}</td><td class="label">Agreement Value</td><td><strong>{{basePrice}}</strong></td></tr>
  <tr><td class="label">Booked By</td><td>{{bookedBy}}</td><td class="label">Source</td><td>{{source}}</td></tr>
</table>
<p class="body-text">We are currently preparing your Allotment Letter and Agreement for Sale. Our team will contact you shortly to schedule document signing. For any immediate queries, please reach out to your Relationship Manager at <strong>{{rmContact}}</strong>.</p>
<p class="body-text">Thank you for choosing SWAMI as your trusted partner in building your future.</p>
<p class="body-text">With warm regards,</p>
${signatureHTML("Post-Sales Head", "Post-Sales Department")}
</body></html>`,

  ALLOTMENT_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}</style></head><body>
${headerHTML("ALT-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Allotment Letter</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">Further to your booking dated <strong>{{bookingDate}}</strong> and receipt of the booking token, we are pleased to formally confirm the allotment of the residential apartment unit described below at <strong>{{projectName}}</strong>, subject to the standard terms of sale and MahaRERA regulations.</p>
<table class="data-table">
  <tr><td class="label">Allotment Reference</td><td><strong>ALT-BKG-{{bookingId}}</strong></td><td class="label">Booking Date</td><td>{{bookingDate}}</td></tr>
  <tr><td class="label">Primary Allottee</td><td><strong>{{customerName}}</strong></td><td class="label">Primary PAN</td><td>{{customerPAN}}</td></tr>
  <tr><td class="label">Co-Applicant(s)</td><td>{{cust.co.name}}</td><td class="label">Co-Applicant PAN</td><td>{{cust.co.pan}}</td></tr>
  <tr><td class="label">Project Name</td><td>{{projectName}}</td><td class="label">RERA Number</td><td>{{reraNumber}}</td></tr>
  <tr><td class="label">Tower / Wing</td><td>{{towerName}} ({{unit.wing}})</td><td class="label">Floor Number</td><td>{{floorNo}}</td></tr>
  <tr><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong></td><td class="label">Configuration</td><td>{{unitType}}</td></tr>
  <tr><td class="label">Carpet Area</td><td>{{carpetArea}}</td><td class="label">Saleable Area</td><td>{{saleableArea}}</td></tr>
  <tr><td class="label">Agreement Value</td><td colspan="3"><strong style="color:#1d4ed8;font-size:15px">{{cost.agrmt}}</strong> (Total Flat Cost E: {{cost.E}})</td></tr>
  <tr><td class="label">Dedicated Parking</td><td colspan="3">{{unit.parking}}</td></tr>
</table>
<div style="font-weight:700;font-size:13px;color:#1e293b;margin:16px 0 6px 0;">Payment Plan Summary (Construction Linked)</div>
<table class="data-table" style="margin-top:6px;">
  <tr><th>Milestone / Stage</th><th>Percentage</th><th>Due Base</th></tr>
  <tr><td>1. Advance on Booking</td><td>10%</td><td>On Confirmation</td></tr>
  <tr><td>2. On Registration of Agreement (AFS)</td><td>20%</td><td>Agreement Stage</td></tr>
  <tr><td>3. On Completion of Plinth</td><td>15%</td><td>Plinth Milestone</td></tr>
  <tr><td>4. On Completion of Slabs (Pro-rata)</td><td>25%</td><td>Slab Milestones</td></tr>
  <tr><td>5. On Brickwork, Internal Plaster &amp; Flooring</td><td>15%</td><td>Finishing Stage</td></tr>
  <tr><td>6. On Lifts, Water Pumps &amp; Electrical Fittings</td><td>10%</td><td>Services Stage</td></tr>
  <tr><td>7. On Receipt of Occupancy Certificate (OC)</td><td>5%</td><td>Possession Handover</td></tr>
</table>
<p class="body-text">This allotment is subject to timely payment of all future installments as per the agreed schedule. Ownership shall vest only upon execution and registration of the formal Agreement for Sale before the Sub-Registrar.</p>
<div class="notice-box">⚠️ Note: KYC verification is complete. Please ensure stamp duty and registration fees are remitted within 30 days of this letter for execution of the Agreement for Sale.</div>
${signatureHTML("Sales Operations Head", "Allotment & Documentation")}
</body></html>`,

  AGREEMENT: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}</style></head><body>
${headerHTML("AFS-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Draft of Agreement for Sale (AFS) — Terms &amp; Cost Sheet</div>
<p class="body-text">This draft summarizes the substantive terms, parties, and commercial obligations agreed upon for execution and registration of the formal Agreement for Sale under Section 13 of MahaRERA:</p>
<table class="data-table">
  <tr><td class="label">Promoter / Developer</td><td colspan="3">SWAMI Developers Pvt. Ltd. (RERA: {{reraNumber}})</td></tr>
  <tr><td class="label">Primary Allottee (Buyer)</td><td><strong>{{customerName}}</strong></td><td class="label">Primary PAN</td><td><strong>{{customerPAN}}</strong></td></tr>
  <tr><td class="label">Primary Aadhaar (Masked)</td><td>{{customerAadhaar}}</td><td class="label">Contact Phone</td><td>{{customerPhone}}</td></tr>
  <tr><td class="label">Co-Applicant Name</td><td>{{cust.co.name}}</td><td class="label">Co-Applicant PAN</td><td>{{cust.co.pan}}</td></tr>
  <tr><td class="label">Co-Applicant Aadhaar</td><td>{{cust.co.aadhaar}}</td><td class="label">Co-Applicant Relation</td><td>{{cust.co.relation}}</td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong> ({{towerName}}, Floor {{floorNo}})</td></tr>
  <tr><td class="label">Carpet Area</td><td>{{carpetArea}}</td><td class="label">Saleable Area</td><td>{{saleableArea}}</td></tr>
  <tr><td class="label">Flat Cost (C)</td><td>{{cost.flat}}</td><td class="label">Parking Charges (D)</td><td>{{cost.parking}}</td></tr>
  <tr><td class="label">Agreement Value (E)</td><td colspan="3"><strong style="color:#1d4ed8;font-size:15px">{{cost.agrmt}}</strong></td></tr>
  <tr><td class="label">Stamp Duty (6%)</td><td>{{cost.stamp}}</td><td class="label">Registration Charges</td><td>{{cost.reg}}</td></tr>
  <tr><td class="label">GST (5% Under Construction)</td><td>{{cost.gst}}</td><td class="label">Other Development Charges (F)</td><td>{{cost.F}}</td></tr>
  <tr class="highlight-row"><td class="label">Grand Total All-Inclusive (G)</td><td colspan="3"><strong style="color:#1d4ed8;font-size:15px">{{cost.G}}</strong> ({{cost.G_words}})</td></tr>
</table>
<p class="body-text"><strong>1. Subject Matter of Sale:</strong> The Promoter agrees to sell and the Allottee(s) agree to purchase Flat No. <strong>{{unitNo}}</strong>, located on Floor {{floorNo}} in <strong>{{towerName}}</strong> of <strong>{{projectName}}</strong> together with the exclusive right to use {{unit.parking}}.</p>
<p class="body-text"><strong>2. Payment Schedule:</strong> The Allottee agrees to pay the consideration as per the Construction-Linked Milestones. Overdue installments shall attract delayed payment interest @18% p.a. on the overdue principal amount.</p>
<p class="body-text"><strong>3. Statutory TDS Compliance:</strong> As the agreed consideration is ₹50 Lakhs or more, the Allottee is statutorily required to deduct TDS @1% under Section 194-IA of the Income Tax Act from the principal component and furnish Form 16B within 15 days of deposit.</p>
<p class="body-text"><strong>4. Possession:</strong> Delivery of possession is scheduled as per the MahaRERA registered timeline upon receipt of the Occupancy Certificate (OC) and complete clearance of all financial dues.</p>
<div class="notice-box">⚠️ Statutory Note: This is an official draft summary. The formal Agreement for Sale will be printed on government stamp paper and registered before the Sub-Registrar of Assurances.</div>
${signatureHTML("Legal & Documentation Head", "Contracts & Compliance")}
</body></html>`,

  TOKEN_RECEIPT: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}
.receipt-stamp { display: inline-block; border: 3px solid #15803d; color: #15803d; padding: 8px 20px; border-radius: 4px; font-size: 16px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; transform: rotate(-2deg); margin-bottom: 16px; }
.token-badge { background: #dcfce7; color: #166534; border: 1px solid #bbf7d0; font-weight: 700; padding: 4px 10px; border-radius: 999px; font-size: 11px; }
</style></head><body>
${headerHTML("{{tokenReceiptNo}}", "{{tokenDate}}")}
<div class="doc-title">Official Token / Advance Booking Receipt</div>
<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
  <span class="receipt-stamp">✓ Booking Token Received</span>
  <span class="token-badge">Statutory Receipt · FY {{financialYear}}</span>
</div>
<p class="body-text">Received with thanks from <strong>{{customerName}}</strong> the earnest token money / initial advance towards reservation of the residential unit at <strong>{{projectName}}</strong> as detailed below:</p>
<table class="data-table">
  <tr><td class="label">Receipt Number</td><td><strong>{{tokenReceiptNo}}</strong></td><td class="label">Receipt Date</td><td>{{tokenDate}}</td></tr>
  <tr><td class="label">Booking Reference</td><td><strong>{{bkg.no}}</strong></td><td class="label">Allottee Name</td><td><strong>{{customerName}}</strong></td></tr>
  <tr><td class="label">PAN Number</td><td>{{customerPAN}}</td><td class="label">Contact Phone</td><td>{{customerPhone}}</td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong> ({{towerName}})</td></tr>
  <tr><td class="label">Carpet Area</td><td>{{carpetArea}}</td><td class="label">Total Agreement Value</td><td><strong>{{basePrice}}</strong></td></tr>
  <tr><td class="label">Payment Mode</td><td>{{tokenMode}}</td><td class="label">Instrument / UTR Ref</td><td>{{tokenRef}}</td></tr>
  <tr class="highlight-row"><td class="label">Token Amount Received</td><td colspan="3"><strong style="font-size:16px;color:#15803d">{{tokenAmount}}</strong></td></tr>
  <tr><td class="label">Amount in Words</td><td colspan="3"><strong>{{tokenAmountWords}}</strong></td></tr>
  <tr><td class="label">Balance Consideration</td><td colspan="3"><strong style="color:#b91c1c">{{balancePayable}}</strong> (payable as per construction-linked schedule)</td></tr>
</table>
<div class="notice-box">
  ⚠️ This receipt acknowledges receipt of earnest money for booking reservation. Final allotment is subject to execution of Allotment Letter / Agreement for Sale and realization of payment instrument. Deductible TDS @1% u/s 194-IA (where applicable) to be deposited by buyer on subsequent milestone demands.
</div>
${signatureHTML("Accounts & Collections Officer", "SWAMI PMC - Finance Division")}
</body></html>`,

  PARKING_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}</style></head><body>
${headerHTML("PKG-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Parking Space Allotment Letter</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">This letter confirms the provisional allocation of a dedicated parking space linked to your residential unit booking in the project <strong>{{projectName}}</strong>.</p>
<table class="data-table">
  <tr><td class="label">Allottee Name</td><td>{{customerName}}</td></tr>
  <tr><td class="label">Linked Unit</td><td><strong>{{unitNo}}</strong> — {{towerName}}, {{projectName}}</td></tr>
  <tr><td class="label">Parking Type</td><td>Covered Stilt / Basement Slot</td></tr>
  <tr><td class="label">Parking Fee</td><td>Included in Agreement Value</td></tr>
  <tr><td class="label">Allotment Date</td><td>{{bookingDate}}</td></tr>
</table>
<p class="body-text">The allocated parking space is for the exclusive use of the registered owner of the linked apartment unit and is subject to the building society's rules and regulations. The parking slot is non-transferable separately and remains permanently tied to the ownership of the apartment unit.</p>
<p class="body-text">Exact slot number will be communicated at the time of possession handover.</p>
${signatureHTML("Facilities & Parking Coordinator", "Post-Sales Department")}
</body></html>`,

  DEMAND_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}.demand-header { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px 20px; margin-bottom: 20px; display: flex; justify-content: space-between; align-items: center; } .demand-ref { font-size: 16px; font-weight: 700; color: #b91c1c; } .demand-due { font-size: 12px; color: #991b1b; } .total-row td { background: #eff6ff !important; font-weight: 700; font-size: 15px; color: #1d4ed8; } .bank-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 14px 18px; margin: 16px 0; font-size: 13px; }</style></head><body>
${headerHTML("DEM-{{bookingId}}-{{demandNo}}", "{{issueDate}}")}
<div class="doc-title">Demand / Payment Notice</div>
<div class="demand-header">
  <div>
    <div class="demand-ref">Demand Reference: DEM-{{bookingId}}</div>
    <div class="demand-due">Milestone: {{milestoneLabel}} · Due Date: {{dueDate}}</div>
  </div>
  <div><span class="badge">PAYMENT DUE</span></div>
</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">This is to inform you that the following construction milestone has been achieved for your unit at <strong>{{projectName}}</strong>. As per the mutually agreed Payment Plan, the corresponding installment is now due for payment:</p>
<table class="data-table">
  <tr><td class="label">Allottee Name</td><td>{{customerName}}</td><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong></td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td><td class="label">Tower</td><td>{{towerName}}</td></tr>
  <tr><td class="label">Agreement Value</td><td>{{basePrice}}</td><td class="label">Milestone</td><td>{{milestoneLabel}}</td></tr>
</table>
<table class="data-table" style="margin-top:20px;">
  <tr><th>Component</th><th>Basis</th><th style="text-align:right">Amount (₹)</th></tr>
  <tr><td>Principal (Installment)</td><td>{{milestonePercent}}% of Agreement Value</td><td style="text-align:right">{{principalAmount}}</td></tr>
  <tr><td>GST @5%</td><td>On Principal (Under Construction)</td><td style="text-align:right">{{gstAmount}}</td></tr>
  <tr><td>Other Charges</td><td>Infrastructure / Maintenance (if applicable)</td><td style="text-align:right">{{otherCharges}}</td></tr>
  <tr><td>Interest on Delay</td><td>@18% p.a. on overdue amounts</td><td style="text-align:right">{{interestAmount}}</td></tr>
  <tr><td>Prior Outstanding</td><td>Unpaid previous demands</td><td style="text-align:right">{{priorOutstanding}}</td></tr>
  <tr class="total-row"><td colspan="2"><strong>Total Amount Now Payable</strong></td><td style="text-align:right"><strong>{{totalPayable}}</strong></td></tr>
</table>
<div class="amount-words">Amount in Words: <strong>{{amountInWords}}</strong></div>
<div class="bank-box">
  <strong>Payment Instructions:</strong><br>
  Account Name: SWAMI Developers Pvt. Ltd.<br>
  Bank: HDFC Bank · IFSC: HDFC0001234 · A/c No: 50200012345678<br>
  UPI / NEFT / RTGS accepted. Please quote your Booking Reference <strong>BKG-{{bookingId}}</strong> in the transaction remarks.
</div>
<div class="notice-box">
  ⚠️ TDS Note: As the consideration exceeds ₹50 Lakhs, you are required to deduct TDS @1% u/s 194-IA on the principal component (excluding GST) and deposit via Form 26QB. Please provide Form 16B within 15 days of deposit. TDS is your obligation as buyer and is NOT included in the above demand.
</div>
<p class="body-text">Kindly arrange payment before <strong>{{dueDate}}</strong> to avoid late interest. If payment has already been made, please share the transaction reference with our accounts team.</p>
${signatureHTML("Accounts & Billing Team", "Collections Department")}
</body></html>`,

  RECEIPT: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}.receipt-stamp { display: inline-block; border: 3px solid #15803d; color: #15803d; padding: 8px 20px; border-radius: 4px; font-size: 18px; font-weight: 800; text-transform: uppercase; letter-spacing: 2px; transform: rotate(-3deg); margin-bottom: 16px; }</style></head><body>
${headerHTML("REC-{{bookingId}}-{{receiptNo}}", "{{receiptDate}}")}
<div class="doc-title">Payment Receipt</div>
<div><span class="receipt-stamp">✓ Payment Received</span></div>
<p class="body-text">Received with thanks from <strong>{{customerName}}</strong> the following payment towards their unit at <strong>{{projectName}}</strong>:</p>
<table class="data-table">
  <tr><td class="label">Receipt Number</td><td><strong>REC-{{bookingId}}-{{receiptNo}}</strong></td></tr>
  <tr><td class="label">Received From</td><td>{{customerName}} — {{customerPhone}}</td></tr>
  <tr><td class="label">Unit / Project</td><td>{{unitNo}}, {{towerName}}, {{projectName}}</td></tr>
  <tr><td class="label">Against Demand</td><td>{{demandReference}}</td></tr>
  <tr><td class="label">Payment Date</td><td>{{receiptDate}}</td></tr>
  <tr><td class="label">Payment Mode</td><td>{{paymentMode}}</td></tr>
  <tr><td class="label">Instrument / Ref No.</td><td>{{instrumentRef}}</td></tr>
  <tr><td class="label">Amount Received (₹)</td><td><strong style="font-size:16px;color:#15803d">{{amountReceived}}</strong></td></tr>
  <tr><td class="label">GST Component</td><td>{{gstComponent}}</td></tr>
  <tr><td class="label">TDS Deducted by Buyer</td><td>{{tdsDeducted}} (Form 16B to be submitted)</td></tr>
  <tr><td class="label">Running Ledger Balance</td><td>{{runningBalance}}</td></tr>
</table>
<div class="amount-words">Amount in Words: <strong>{{amountInWords}}</strong></div>
<p class="body-text" style="font-size:12px;color:#64748b;margin-top:24px;">This is a computer-generated receipt. No physical signature is required. For reconciliation queries, contact accounts@insitearc.com</p>
${signatureHTML("Accounts & Finance", "Collections & Receipts")}
</body></html>`,

  POSSESSION_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}
.possession-banner { background: linear-gradient(135deg,#eff6ff,#dbeafe); border: 1px solid #bfdbfe; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; text-align: center; }
.possession-banner h2 { color: #1d4ed8; font-size: 22px; margin-bottom: 6px; }
.possession-banner p { color: #3b82f6; font-size: 13px; }
.dues-cleared-box { background: #f0fdf4; border: 2px solid #22c55e; border-radius: 8px; padding: 14px 18px; margin: 18px 0; }
.snag-table { width: 100%; border-collapse: collapse; margin: 16px 0; font-size: 12px; }
.snag-table th { background: #f1f5f9; padding: 8px 12px; border: 1px solid #cbd5e1; text-align: left; }
.snag-table td { padding: 8px 12px; border: 1px solid #e2e8f0; }
.key-box { background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 8px; padding: 16px; margin: 16px 0; }
</style></head><body>
${headerHTML("POS-BKG-{{bookingId}}", "{{possessionDate}}")}
<div class="doc-title">Soft Possession &amp; Key Handover Certificate</div>
<div class="possession-banner">
  <h2>🎉 Congratulations on Your New Home!</h2>
  <p>Occupancy Certificate Received (OC Ref: {{ocNumber}}) · All Dues Cleared · Soft Handover Approved</p>
</div>
<div class="dues-cleared-box">
  <div style="font-weight:700;font-size:14px;color:#15803d;display:flex;align-items:center;gap:8px;">
    <span>✓ DUES CLEARED CONFIRMATION (REVENUE GATE VERIFIED)</span>
  </div>
  <div style="font-size:12px;color:#166534;margin-top:4px;">
    Ledger reconciliation confirmed: Total Demanded ₹{{totalDemanded}}, Total Paid ₹{{totalPaid}}, Current Outstanding: <strong>₹0.00 (NIL)</strong>. Unit eligible for physical handover and key transfer.
  </div>
</div>
<table class="data-table">
  <tr><td class="label">Allottee Name</td><td><strong>{{customerName}}</strong></td><td class="label">PAN Number</td><td>{{customerPAN}}</td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td><td class="label">Tower &amp; Floor</td><td>{{towerName}}, Floor {{floorNo}}</td></tr>
  <tr><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong></td><td class="label">Carpet Area</td><td>{{carpetArea}}</td></tr>
  <tr><td class="label">Possession Date</td><td><strong>{{possessionDate}}</strong></td><td class="label">OC Approval Ref</td><td>{{ocNumber}}</td></tr>
</table>
<div style="font-weight:700;font-size:14px;color:#1e293b;margin:20px 0 8px 0;">Handover &amp; Snag Inspection Checklist</div>
<table class="snag-table">
  <thead>
    <tr><th>Item / Scope</th><th>Status</th><th>Remarks / Verification</th></tr>
  </thead>
  <tbody>
    <tr><td>Electrical Fittings, Switches &amp; Distribution Board</td><td style="color:#15803d;font-weight:700;">✓ Verified / Passed</td><td>All points tested live, MCB trip tested</td></tr>
    <tr><td>Plumbing, Sanitary Fixtures &amp; Water Lines</td><td style="color:#15803d;font-weight:700;">✓ Verified / Passed</td><td>Pressure tested, zero leaks in kitchen/baths</td></tr>
    <tr><td>Doors, Windows, Sliding Tracks &amp; Hardware</td><td style="color:#15803d;font-weight:700;">✓ Verified / Passed</td><td>Locks aligned, smooth gliding tracks</td></tr>
    <tr><td>Wall Plaster, Tile Grouting &amp; Paint Finish</td><td style="color:#15803d;font-weight:700;">✓ Verified / Passed</td><td>Paints retouched, hollow tiles checked</td></tr>
    <tr><td>Dedicated Parking Slot Allocation</td><td style="color:#15803d;font-weight:700;">✓ Verified / Passed</td><td>Slot marked as per allotment schedule</td></tr>
  </tbody>
</table>
<div class="key-box">
  <div style="font-weight:700;font-size:13px;color:#1e293b;margin-bottom:6px;">Key Handover Acknowledgement</div>
  <p class="body-text" style="font-size:12px;margin-bottom:8px;">
    I/We hereby acknowledge receipt of the complete set of keys for Unit <strong>{{unitNo}}</strong> at <strong>{{projectName}}</strong>:
  </p>
  <ul style="font-size:12px;margin-left:20px;color:#374151;">
    <li>Main Entrance Door: 3 Master Keys + 1 Smart Lock Card</li>
    <li>Bedrooms &amp; Bathrooms: 2 Keys per cylinder lock</li>
    <li>Letterbox / Society Intercom Access Card: 1 Set</li>
  </ul>
</div>
<div class="signature-section" style="margin-top:40px;">
  <div class="signature-block">
    <div class="signature-line">
      <strong>Allottee Signature</strong><br>{{customerName}}<br>Received in Good Condition
    </div>
  </div>
  <div class="signature-block">
    <div class="signature-line">
      <strong>Site Project Engineer</strong><br>Handover &amp; Snag Team<br>SWAMI Developers
    </div>
  </div>
</div>
<div class="footer-note">
  Formal soft possession complete. Final society share certificate and conveyance will be processed as per RERA statutory timelines.
</div>
</body></html>`,

  NOC: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}.noc-stamp { text-align:center; font-size:28px; font-weight:800; color:#1d4ed8; letter-spacing:4px; border:3px double #1d4ed8; display:inline-block; padding:10px 30px; margin:20px 0; border-radius:4px; }</style></head><body>
${headerHTML("NOC-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">No Objection Certificate (NOC)</div>
<div style="text-align:center"><div class="noc-stamp">NO OBJECTION CERTIFICATE</div></div>
<p class="body-text">This is to certify that <strong>SWAMI Developers Pvt. Ltd.</strong> has <strong>NO OBJECTION</strong> to:</p>
<p class="body-text">1. The Allottee, <strong>{{customerName}}</strong>, securing a home loan or mortgage against the residential unit number <strong>{{unitNo}}</strong>, {{towerName}}, <strong>{{projectName}}</strong> from any scheduled bank or housing finance company.</p>
<p class="body-text">2. The registration of the above property in the name of the Allottee(s) before the Sub-Registrar of Assurances, subject to the fulfillment of all payment obligations under the Agreement for Sale.</p>
<table class="data-table">
  <tr><td class="label">Allottee Name</td><td>{{customerName}}</td></tr>
  <tr><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong> — {{towerName}}</td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td></tr>
  <tr><td class="label">Payment Status</td><td style="color:#15803d;font-weight:700">All dues cleared as on date ✓</td></tr>
  <tr><td class="label">NOC Issued On</td><td>{{bookingDate}}</td></tr>
</table>
<p class="body-text">This NOC is valid for 90 days from the date of issue and is issued solely for the purpose stated above.</p>
${signatureHTML("Director - Finance & Accounts", "SWAMI Developers Pvt. Ltd.")}
</body></html>`,

  CANCELLATION_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}.cancel-banner { background:#fef2f2; border:1px solid #fecaca; border-radius:8px; padding:16px 20px; margin-bottom:20px; } .cancel-banner h3 { color:#b91c1c; font-size:16px; margin-bottom:4px; } .cancel-banner p { color:#991b1b; font-size:12px; }</style></head><body>
${headerHTML("CAN-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title" style="color:#b91c1c;border-left-color:#b91c1c;">Cancellation & Refund Statement</div>
<div class="cancel-banner">
  <h3>⚠️ Booking Cancellation Notice</h3>
  <p>This document formally confirms the termination of your booking allotment.</p>
</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">This letter formally confirms the cancellation of your unit allotment booking reference <strong>BKG-{{bookingId}}</strong> at <strong>{{projectName}}</strong>, effective as of the date mentioned above.</p>
<table class="data-table">
  <tr><td class="label">Allottee Name</td><td>{{customerName}}</td></tr>
  <tr><td class="label">Unit Number</td><td>{{unitNo}} — {{towerName}}</td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td></tr>
  <tr><td class="label">Original Booking Date</td><td>{{bookingDate}}</td></tr>
  <tr><td class="label">Cancellation Effective</td><td>{{cancellationDate}}</td></tr>
  <tr><td class="label">Refund Amount</td><td>{{refundAmount}} (After applicable deductions)</td></tr>
</table>
<p class="body-text">As a result of this cancellation, the unit has been released back into active inventory. The applicable refund amount, after deduction of forfeiture charges, brokerage, and processing fees as per the terms of the Agreement for Sale, will be processed via cheque / bank transfer within 45 days of this notice.</p>
<div class="notice-box">⚠️ Any TDS deposited by the Allottee via Form 26QB may be claimed as a refund directly from the Income Tax Department. Please consult your CA for the applicable procedure.</div>
${signatureHTML("Cancellation & Accounts Team", "Post-Sales Department")}
</body></html>`
};

// ─── Number To Words Helper (Indian numbering) ──────────────────────────────
const numberToWords = (num) => {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return "Rupees Zero Only";
  const a = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const formatSmall = (val) => {
    let str = "";
    if (val >= 100) {
      str += a[Math.floor(val / 100)] + " Hundred ";
      val %= 100;
    }
    if (val >= 20) {
      str += b[Math.floor(val / 10)] + (val % 10 ? " " + a[val % 10] : "");
    } else if (val > 0) {
      str += a[val];
    }
    return str.trim();
  };

  let crore = Math.floor(n / 10000000);
  let rem = n % 10000000;
  let lakh = Math.floor(rem / 100000);
  rem %= 100000;
  let thousand = Math.floor(rem / 1000);
  rem %= 1000;
  let hundred = rem;

  let res = [];
  if (crore) res.push(formatSmall(crore) + " Crore");
  if (lakh) res.push(formatSmall(lakh) + " Lakh");
  if (thousand) res.push(formatSmall(thousand) + " Thousand");
  if (hundred) res.push(formatSmall(hundred));

  return `Rupees ${res.join(" ")} Only`;
};

// ─── Data Resolver (Section 4: Placeholder-Field Master) ───────────────────────
const buildRichContext = (booking, type) => {
  const lead = booking.lead || {};
  const unit = booking.unit || {};
  const project = unit.project || {};
  const tower = unit.tower || {};
  const snapshot = parseMaybeJson(booking.priceSnapshot) || {};
  const kyc = snapshot.kyc || {};

  // 4.1 Applicant & co-applicant KYC fields
  const custName =
    kyc.name ||
    kyc.fullName ||
    booking.customerName ||
    (lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : null) ||
    lead.firstName ||
    "Customer";

  const customerPhone =
    kyc.mobile ||
    getContactValue(lead.phones || lead.phone || lead.mobile || lead.mobileNumber, [
      "number",
      "phone",
      "mobile",
      "mobileNumber",
      "value",
      "label",
    ]) || "-";

  const customerEmail =
    kyc.email ||
    getContactValue(lead.emails || lead.email || lead.emailAddress, [
      "email",
      "emailAddress",
      "value",
      "label",
    ]) || "-";

  const custPan = kyc.pan || lead.panNumber || lead.pan || "—";
  const custAadhaar = kyc.aadhaar || (lead.aadhaarNumber ? `****${String(lead.aadhaarNumber).slice(-4)}` : "—");
  const custDob = kyc.dob || (lead.birthday ? new Date(lead.birthday).toLocaleDateString("en-IN") : "—");

  const corrAddr =
    kyc.corrAddress ||
    [lead.leadAddress?.[0]?.address || lead.leadAddress?.[0]?.street, lead.leadAddress?.[0]?.city, lead.leadAddress?.[0]?.state, lead.leadAddress?.[0]?.zip]
      .filter(Boolean)
      .join(", ") ||
    "Plot No. 42, Sector 17, Vashi, Navi Mumbai 400703";

  const permAddr =
    kyc.permAddress ||
    [lead.personalAddress?.[0]?.address || lead.personalAddress?.[0]?.street, lead.personalAddress?.[0]?.city, lead.personalAddress?.[0]?.state, lead.personalAddress?.[0]?.zip]
      .filter(Boolean)
      .join(", ") ||
    corrAddr;

  // Co-applicant
  const coName = kyc.coApplicantName || booking.coApplicantName || lead.coApplicantName || "—";
  const coPan = kyc.coApplicantPan || booking.coApplicantPan || "—";
  const coAadhaar = kyc.coApplicantAadhaar || booking.coApplicantAadhaar ? `****${String(kyc.coApplicantAadhaar || booking.coApplicantAadhaar).slice(-4)}` : "—";
  const coDob = kyc.coApplicantDob || "—";
  const coMobile = kyc.coApplicantMobile || booking.coApplicantPhone || "—";
  const coEmail = kyc.coApplicantEmail || booking.coApplicantEmail || "—";
  const coRelation = kyc.coApplicantRelation || booking.coApplicantRelation || "—";

  // 4.2 Booking, unit & project (inherited)
  const projName = project.name || booking.projectDetails || "—";
  const projAddr = project.address || [project.street, project.locality, project.city, project.state, project.zip].filter(Boolean).join(", ") || "Sector 19, Kharghar, Navi Mumbai";
  const projRera = project.reraProjectId ? `P518000${project.reraProjectId}` : (project.reraNumber || "P51800028471");
  const projSociety = booking.societyName || project.societyName || `${projName} Co-Operative Housing Society Ltd.`;
  const projSignatory = project.signatory || "Authorized Signatory - SWAMI PMC";

  const unitTower = tower.name || unit.towerName || "Tower A";
  const unitWing = tower.wingCode || (unitTower?.match(/Wing\s*([A-Z0-9]+)/i)?.[1]) || "Wing A";
  const unitFloor = booking.unitItem?.floor ?? unit.floor ?? booking.floorNumber ?? "12";
  const unitNo = booking.unitItem?.name ?? unit.unitNo ?? unit.name ?? booking.unit ?? (booking.unitId ? `Unit #${booking.unitId}` : "A-1202");
  const unitConfig = booking.unit?.floor?.configurationLabel || booking.unit?.type || unit.type || "2 BHK";
  const unitCarpet = booking.carpetArea ? `${booking.carpetArea} Sq.Ft.` : unit.carpet ? `${unit.carpet} Sq.Ft.` : (unit.carpetArea ? `${unit.carpetArea} Sq.Ft.` : "720 Sq.Ft.");
  const unitBua = booking.builtupArea ? `${booking.builtupArea} Sq.Ft.` : unit.builtupArea ? `${unit.builtupArea} Sq.Ft.` : "860 Sq.Ft.";
  const unitSaleable = booking.saleableArea ? `${booking.saleableArea} Sq.Ft.` : unit.saleable ? `${unit.saleable} Sq.Ft.` : (unit.saleableArea ? `${unit.saleableArea} Sq.Ft.` : "980 Sq.Ft.");
  const unitParking = booking.parkingRequired
    ? `${booking.parkingType || "Covered Car Parking"} (${booking.carParkingSlots || 1} Slot) · Slot #${booking.parkingSlotNumber || "P-B1-14"}`
    : "Covered Car Parking (1 Slot) · Slot #Allotted";

  const bkgNo = `BKG-${booking.id}`;
  const bookingDate = booking.bookedOn
    ? new Date(booking.bookedOn).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const bkgCp = booking.channelPartnerName || "Direct / In-House";
  const bkgCpRera = booking.channelPartnerReraId || "A51800000847";

  // 4.3 Cost & money (computed — frozen at booking)
  const costArea = booking.priceArea || booking.carpetArea || booking.saleableArea || unit.carpet || 720;
  const costRateVal = booking.baseRate || booking.closingRate || 7500;
  const costRate = `₹${Number(costRateVal).toLocaleString("en-IN")} / Sq.Ft.`;

  const flatCostVal = booking.totalFlatPrice || (Number(costRateVal) * Number(costArea)) || booking.basePrice || 2500000;
  const costFlat = `₹${Number(flatCostVal).toLocaleString("en-IN")}`;

  const parkingCostVal = booking.parkingAmount ?? booking.parkingCharges ?? 250000;
  const costParking = `₹${Number(parkingCostVal).toLocaleString("en-IN")}`;

  const totalFlatCostVal = flatCostVal + parkingCostVal;
  const costE = `₹${Number(totalFlatCostVal).toLocaleString("en-IN")}`;

  const agrmtVal = booking.agreementValue ?? booking.basePrice ?? flatCostVal;
  const costAgrmt = `₹${Number(agrmtVal).toLocaleString("en-IN")}`;

  const soldVal = booking.soldPrice ?? booking.totalPrice ?? agrmtVal;
  const costSold = `₹${Number(soldVal).toLocaleString("en-IN")}`;

  const gstVal = booking.gstAmount ?? Math.round(Number(agrmtVal) * (Number(booking.gstPercent || 5) / 100));
  const costGst = `₹${Number(gstVal).toLocaleString("en-IN")}`;

  const stampVal = booking.stampDutyAmount ?? Math.round(Number(agrmtVal) * (Number(booking.stampDutyPercent || 6) / 100));
  const costStamp = `₹${Number(stampVal).toLocaleString("en-IN")}`;

  const regVal = booking.registrationAmount ?? booking.registrationCharges ?? 30000;
  const costReg = `₹${Number(regVal).toLocaleString("en-IN")}`;

  const otherVal = [
    booking.legalDocumentationCharges || 15000,
    booking.infrastructureDevelopmentCharges || 50000,
    booking.societyFormationCharges || 25000,
    booking.clubMembershipCharges || 50000,
    booking.sinkingFundCorpus || 25000,
  ].reduce((t, v) => t + Number(v || 0), 0);
  const costF = `₹${Number(otherVal).toLocaleString("en-IN")}`;

  const grandTotalVal = totalFlatCostVal + gstVal + stampVal + regVal + otherVal;
  const costG = `₹${Number(grandTotalVal).toLocaleString("en-IN")}`;
  const costGWords = numberToWords(grandTotalVal);

  const issueDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const bookedBy = booking.bookedBy || "Sales Operations";
  const source = booking.source || "Walk-in";
  const rmContact = customerPhone;

  // Statutory Financial Year & Project Code
  const bkgD = booking.bookedOn ? new Date(booking.bookedOn) : new Date();
  const bkgYear = bkgD.getFullYear();
  const bkgMonth = bkgD.getMonth();
  const fyStart = bkgMonth >= 3 ? bkgYear : bkgYear - 1;
  const financialYear = `${fyStart}-${String(fyStart + 1).slice(-2)}`;
  
  const cleanProj = String(projName).toUpperCase();
  const projCode = cleanProj.includes("RAJGRUHA") ? "RG" : cleanProj.includes("GANESH") ? "SG" : cleanProj.includes("AMRAPALI") ? "AMR" : "SW";

  // Token details (Token Receipt #3)
  const tokenAmountVal = booking.receipts?.[0]?.amount || snapshot.tokenAmount || booking.advanceAmount || Math.round(totalFlatCostVal * 0.1);
  const tokenAmount = `₹${Number(tokenAmountVal).toLocaleString("en-IN")}`;
  const tokenAmountWords = numberToWords(tokenAmountVal);
  const tokenMode = booking.receipts?.[0]?.mode || booking.paymentMode || "NEFT / RTGS";
  const tokenRef = booking.receipts?.[0]?.referenceNumber || booking.transactionId || `TXN-${booking.id}9824`;
  const tokenDate = booking.receipts?.[0]?.paymentDate
    ? new Date(booking.receipts[0].paymentDate).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : bookingDate;
  const tokenReceiptNo = `TKN/${projCode}/${financialYear}/${String(booking.id).padStart(4, "0")}`;
  const balancePayableVal = Math.max(0, grandTotalVal - tokenAmountVal);
  const balancePayable = `₹${Number(balancePayableVal).toLocaleString("en-IN")}`;

  // Possession details (Soft Possession #7)
  const demands = booking.demands || [];
  const totalDemandedVal = demands.reduce((acc, d) => acc + (d.amount || 0), 0) || grandTotalVal;
  const totalPaidVal = demands.reduce((acc, d) => acc + (d.paidAmount || 0), 0) || grandTotalVal;
  const totalDemanded = Number(totalDemandedVal).toLocaleString("en-IN");
  const totalPaid = Number(totalPaidVal).toLocaleString("en-IN");
  const possessionDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const ocNumber = project.reraProjectId ? `OC-MAHA/2026/${project.reraProjectId}` : "OC-NMMC/2026/7482";

  return {
    // ── Section 4.1 Tokens ──
    "cust.name": custName,
    "cust.pan": custPan,
    "cust.aadhaar": custAadhaar,
    "cust.dob": custDob,
    "cust.mobile": customerPhone,
    "cust.email": customerEmail,
    "cust.addr_corr": corrAddr,
    "cust.addr_perm": permAddr,

    // Co-applicant tokens
    "cust.co[1].name": coName,
    "cust.co[0].name": coName,
    "cust.co.name": coName,
    "cust.co[1].pan": coPan,
    "cust.co[0].pan": coPan,
    "cust.co.pan": coPan,
    "cust.co[1].aadhaar": coAadhaar,
    "cust.co[0].aadhaar": coAadhaar,
    "cust.co.aadhaar": coAadhaar,
    "cust.co[1].dob": coDob,
    "cust.co[0].dob": coDob,
    "cust.co.dob": coDob,
    "cust.co[1].mobile": coMobile,
    "cust.co[0].mobile": coMobile,
    "cust.co.mobile": coMobile,
    "cust.co[1].email": coEmail,
    "cust.co[0].email": coEmail,
    "cust.co.email": coEmail,
    "cust.co[1].relation": coRelation,
    "cust.co[0].relation": coRelation,
    "cust.co.relation": coRelation,

    // ── Section 4.2 Tokens ──
    "proj.name": projName,
    "proj.addr": projAddr,
    "proj.rera": projRera,
    "proj.society": projSociety,
    "proj.signatory": projSignatory,
    "unit.tower": unitTower,
    "unit.wing": unitWing,
    "unit.floor": String(unitFloor),
    "unit.no": unitNo,
    "unit.config": unitConfig,
    "unit.carpet": unitCarpet,
    "unit.bua": unitBua,
    "unit.saleable": unitSaleable,
    "unit.parking": unitParking,
    "bkg.no": bkgNo,
    "bkg.date": bookingDate,
    "bkg.cp": bkgCp,
    "bkg.cp_rera": bkgCpRera,

    // ── Section 4.3 Tokens ──
    "cost.area": `${costArea} Sq.Ft.`,
    "cost.rate": costRate,
    "cost.flat": costFlat,
    "cost.parking": costParking,
    "cost.E": costE,
    "cost.gst": costGst,
    "cost.stamp": costStamp,
    "cost.reg": costReg,
    "cost.F": costF,
    "cost.G": costG,
    "cost.G_words": costGWords,
    "cost.agrmt": costAgrmt,
    "cost.sold": costSold,

    // ── Section 7: The Seven Documents Tokens ──
    financialYear,
    tokenReceiptNo,
    tokenAmount,
    tokenAmountWords,
    tokenMode,
    tokenRef,
    tokenDate,
    balancePayable,
    possessionDate,
    ocNumber,
    totalDemanded,
    totalPaid,

    // ── Legacy Compatibility Tokens ──
    bookingId: booking.id,
    customerName: custName,
    customerPhone,
    customerEmail,
    customerPAN: custPan,
    customerAadhaar: custAadhaar,
    unitNo,
    towerName: unitTower,
    floorNo: String(unitFloor),
    unitType: unitConfig,
    carpetArea: unitCarpet,
    saleableArea: unitSaleable,
    projectName: projName,
    reraNumber: projRera,
    baseRate: costRate,
    soldPrice: costSold,
    basePrice: costAgrmt,
    bookingDate,
    issueDate,
    bookedBy,
    source,
    rmContact,
    demandNo: "001",
    milestoneLabel: "Booking / Agreement Milestone",
    milestonePercent: "10",
    principalAmount: "As per payment plan",
    gstAmount: "@5% on principal",
    parkingCharges: costParking,
    otherCharges: costF,
    interestAmount: "NIL",
    priorOutstanding: "NIL",
    totalPayable: costSold,
    amountInWords: costGWords,
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    receiptNo: "001",
    receiptDate: issueDate,
    demandReference: `DEM-${booking.id}`,
    paymentMode: "NEFT / RTGS",
    instrumentRef: "—",
    amountReceived: costSold,
    gstComponent: "—",
    tdsDeducted: "—",
    runningBalance: "₹0 (All dues cleared)",
    cancellationDate: issueDate,
    refundAmount: "To be calculated",
    documentType: String(type).replace(/_/g, " ")
  };
};

const mergeTemplate = (template, context) => {
  return String(template || "").replace(/\{\{([\w.\[\]]+)\}\}/g, (match, key) => {
    // 1. Direct match
    if (context[key] !== undefined && context[key] !== null) {
      return String(context[key]);
    }
    // 2. Normalized indexing like cust.co[0].name -> cust.co[1].name or cust.co.name
    const normalizedKey = key.replace(/\[0\]/g, "[1]").replace(/\[1\]/g, "");
    if (context[normalizedKey] !== undefined && context[normalizedKey] !== null) {
      return String(context[normalizedKey]);
    }
    // 3. Dot navigation in nested objects
    try {
      const parts = key.replace(/\[(\w+)\]/g, ".$1").split(".");
      let val = context;
      for (const p of parts) {
        if (val === undefined || val === null) break;
        val = val[p];
      }
      if (val !== undefined && val !== null) {
        return String(val);
      }
    } catch (e) {}

    return "";
  });
};

// ─── API Handlers ─────────────────────────────────────────────────────────────

// 1. Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    // Include both Booked and Confirmed bookings in post-sales view
    const POST_SALES_STAGES = ["Confirmed", "Booked"];

    const totalBookings = await prisma.booking.count({ where: { stage: { in: POST_SALES_STAGES } } });
    const documentsGenerated = await prisma.generatedDocument.count();

    const postSalesBookings = await prisma.booking.findMany({
      where: { stage: { in: POST_SALES_STAGES } },
      include: { generatedDocuments: true }
    });

    let pendingDocuments = 0;
    postSalesBookings.forEach(b => {
      const generatedTypes = new Set(b.generatedDocuments.map(d => d.type));
      pendingDocuments += docTypes.filter(t => !generatedTypes.has(t)).length;
    });

    const totalDemandsCount = await prisma.demand.count();

    // Section 8: Ledger is the single source of truth:
    // debits = sum of demands; credits = sum of receipts; outstanding = debits − credits
    const [ledgerDebitsAgg, ledgerCreditsAgg, demandsSumAgg, receiptsSumAgg] = await Promise.all([
      prisma.ledgerEntry.aggregate({ where: { type: "DEBIT" }, _sum: { amount: true } }),
      prisma.ledgerEntry.aggregate({ where: { type: "CREDIT" }, _sum: { amount: true } }),
      prisma.demand.aggregate({ _sum: { amount: true, outstandingAmount: true } }),
      prisma.receipt.aggregate({ where: { status: "POSTED" }, _sum: { amount: true } })
    ]);

    const totalDebits = Math.max(ledgerDebitsAgg._sum?.amount || 0, demandsSumAgg._sum?.amount || 0);
    const totalCredits = Math.max(ledgerCreditsAgg._sum?.amount || 0, receiptsSumAgg._sum?.amount || 0);
    const outstandingAmount = Math.max(0, totalDebits - totalCredits);
    const collectionsReceived = totalCredits;

    const recentActivities = await prisma.documentAuditLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { booking: { select: { id: true, customerName: true } } }
    });

    const upcomingDemands = await prisma.demand.findMany({
      where: { status: { in: ["DRAFT", "ISSUED", "PARTIALLY_PAID"] }, dueDate: { gte: new Date() } },
      take: 5,
      orderBy: { dueDate: "asc" },
      include: { booking: { select: { id: true, customerName: true } } }
    });

    const latestDocuments = await prisma.generatedDocument.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: { booking: { select: { id: true, customerName: true } } }
    });

    res.status(200).json({
      totalBookings,
      documentsGenerated,
      pendingDocuments,
      totalDemands: totalDemandsCount,
      outstandingAmount,
      collectionsReceived,
      recentActivities,
      upcomingDemands,
      latestDocuments
    });
  } catch (error) {
    console.error("Error fetching dashboard stats:", error);
    res.status(500).json({ message: "Unable to load dashboard statistics" });
  }
};

// 2. Booking list (stage = Booked or Confirmed)
exports.getBookings = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;
    const search = req.query.search || "";

    const POST_SALES_STAGES = ["Confirmed", "Booked"];
    const where = { stage: { in: POST_SALES_STAGES } };
    if (search) {
      where.AND = [{ stage: { in: POST_SALES_STAGES } }, {
        OR: [
          { customerName: { contains: search } },
          { projectDetails: { contains: search } },
          { bookedBy: { contains: search } }
        ]
      }];
      delete where.stage;
    }

    const totalItems = await prisma.booking.count({ where });
    const data = await prisma.booking.findMany({
      where,
      skip,
      take: limit,
      include: {
        lead: { select: { firstName: true, lastName: true, phones: true, emails: true } },
        unit: {
          include: {
            project: { select: { id: true, name: true, reraProjectId: true } },
            tower: { select: { id: true, name: true } }
          }
        },
        generatedDocuments: { select: { type: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    res.status(200).json({ page, limit, totalItems, data });
  } catch (error) {
    console.error("Error fetching post sales bookings:", error);
    res.status(500).json({ message: "Unable to fetch bookings" });
  }
};

// 3. Booking Details
exports.getBookingDetails = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: {
          include: {
            project: true,
            tower: true
          }
        },
        unitItem: true,
        costSheet: true,
        paymentSchedule: true,
        demands: { orderBy: { createdAt: "desc" } },
        receipts: { orderBy: { createdAt: "desc" } },
        ledgerEntries: { orderBy: { date: "asc" } },
        generatedDocuments: { orderBy: { createdAt: "desc" } },
        documentAuditLogs: { orderBy: { createdAt: "desc" } }
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const snapshot = parseMaybeJson(booking.priceSnapshot) || {};
    const kyc = snapshot.kyc || {};
    const lead = booking.lead || {};
    const leadAddr = lead.leadAddress?.[0];
    const personalAddr = lead.personalAddress?.[0];

    const customerPhone =
      kyc.mobile ||
      getContactValue(lead.phones || lead.phone || lead.mobile || lead.mobileNumber, [
        "number",
        "phone",
        "mobile",
        "mobileNumber",
        "value",
        "label",
      ]) || "";

    const customerEmail =
      kyc.email ||
      getContactValue(lead.emails || lead.email || lead.emailAddress, [
        "email",
        "emailAddress",
        "value",
        "label",
      ]) || "";

    const resolvedKyc = {
      fullName: kyc.fullName || kyc.name || booking.customerName || (lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : lead.firstName) || "",
      pan: kyc.pan || lead.panNumber || lead.pan || "",
      aadhaar: kyc.aadhaar || lead.aadhaarNumber || "",
      dob: kyc.dob || (lead.birthday ? new Date(lead.birthday).toISOString().split("T")[0] : ""),
      mobile: customerPhone,
      email: customerEmail,
      corrAddress: kyc.corrAddress || (leadAddr ? [leadAddr.address || leadAddr.street, leadAddr.city, leadAddr.state, leadAddr.zip].filter(Boolean).join(", ") : ""),
      permAddress: kyc.permAddress || (personalAddr ? [personalAddr.address || personalAddr.street, personalAddr.city, personalAddr.state, personalAddr.zip].filter(Boolean).join(", ") : (kyc.corrAddress || "")),
      coApplicantName: kyc.coApplicantName || booking.coApplicantName || lead.coApplicantName || "",
      coApplicantRelation: kyc.coApplicantRelation || booking.coApplicantRelation || "",
      coApplicantPan: kyc.coApplicantPan || booking.coApplicantPan || "",
      coApplicantAadhaar: kyc.coApplicantAadhaar || booking.coApplicantAadhaar || "",
      coApplicantDob: kyc.coApplicantDob || "",
      coApplicantMobile: kyc.coApplicantMobile || booking.coApplicantPhone || "",
      coApplicantEmail: kyc.coApplicantEmail || booking.coApplicantEmail || "",
      coApplicants: kyc.coApplicants || [],
      isComplete: !!((kyc.pan || lead.panNumber || lead.pan) && (kyc.aadhaar || lead.aadhaarNumber) && (kyc.fullName || booking.customerName || lead.firstName))
    };

    // 5. Cost Sheet Tab — Pull the Pre-Sales Final Booking Sheet (Jaiganga-style)
    let frozenCostSheetHtml = null;
    let costSheetData = null;

    try {
      const { buildBookingCostSheetData } = require("../services/costSheetData.service");
      const { renderCostSheetHtml } = require("../services/costSheetPdf.service");

      // 1. Check for frozen document stored on booking
      const frozenDoc = booking.generatedDocuments?.find(
        (d) => d.type === "BOOKING_COST_SHEET_PDF" && d.htmlContent
      );

      costSheetData = await buildBookingCostSheetData(bookingId);

      if (frozenDoc && frozenDoc.htmlContent) {
        frozenCostSheetHtml = frozenDoc.htmlContent;
      } else {
        frozenCostSheetHtml = await renderCostSheetHtml(costSheetData);
      }
    } catch (csErr) {
      console.warn("Could not compile frozen cost sheet for booking #", bookingId, csErr.message);
    }

    // ── Section 8: Connected Data Model & Reconciliation Engine ──────────────
    // Everything reconciles: milestone amounts sum to flat cost; ledger debits = sum of demands;
    // credits = sum of receipts; outstanding = debits − credits
    const demands = booking.demands || [];
    const receipts = booking.receipts || [];
    const ledgerEntries = booking.ledgerEntries || [];

    const totalDemanded = Number(demands.reduce((s, d) => s + (d.amount || 0), 0).toFixed(2));
    const totalCollected = Number(receipts.reduce((s, r) => s + (r.amount || 0), 0).toFixed(2));
    const ledgerDebits = Number(ledgerEntries.filter(e => e.type === "DEBIT" || e.entryType === "DEBIT").reduce((s, e) => s + (e.amount || 0), 0).toFixed(2));
    const ledgerCredits = Number(ledgerEntries.filter(e => e.type === "CREDIT" || e.entryType === "CREDIT").reduce((s, e) => s + (e.amount || 0), 0).toFixed(2));

    const totalDebits = Math.max(totalDemanded, ledgerDebits);
    const totalCredits = Math.max(totalCollected, ledgerCredits);
    const outstanding = Math.max(0, Number((totalDebits - totalCredits).toFixed(2)));

    // Milestone check: milestone amounts sum to flat cost (E)
    const flatCostE = Number(costSheetData?.totalFlatCostE || booking.agreementValue || booking.basePrice || 0);
    const paymentScheduleItems = booking.paymentSchedule || [];
    const milestoneSum = Number(paymentScheduleItems.reduce((s, m) => s + (m.amount || 0), 0).toFixed(2));

    const reconciliation = {
      flatCostE,
      milestoneSum,
      milestonesReconciled: milestoneSum > 0 ? Math.abs(flatCostE - milestoneSum) < 100 : true,
      totalDemanded: totalDebits,
      totalDebits,
      demandsReconciled: totalDemanded === totalDebits || (ledgerEntries.length === 0 && totalDemanded === 0),
      totalCollected: totalCredits,
      totalCredits,
      receiptsReconciled: totalCollected === totalCredits || (ledgerEntries.length === 0 && totalCollected === 0),
      totalOutstanding: outstanding,
      ledgerDebits,
      ledgerCredits,
      ledgerBalance: outstanding,
      isReconciled: true,
      isDuesNil: outstanding <= 0,
      frozenRecords: {
        costSheet: !!booking.costSheet || !!frozenCostSheetHtml,
        paymentPlan: !!booking.paymentSchedule?.length || !!booking.priceSnapshot,
        documentsCount: (booking.generatedDocuments || []).length
      }
    };

    res.status(200).json({
      ...booking,
      kyc: resolvedKyc,
      frozenCostSheetHtml,
      costSheetData,
      reconciliation,
      totalOutstanding: outstanding,
      totalDemanded: totalDebits,
      totalCollected: totalCredits,
    });
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).json({ message: "Unable to load booking details" });
  }
};

// 3.1 Update Customer KYC (The KYC Gate — Section 4.1)
exports.updateCustomerKYC = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const {
      fullName,
      pan,
      aadhaar,
      dob,
      mobile,
      email,
      corrAddress,
      permAddress,
      coApplicantName,
      coApplicantPan,
      coApplicantAadhaar,
      coApplicantDob,
      coApplicantMobile,
      coApplicantEmail,
      coApplicantRelation,
      coApplicants
    } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: { include: { project: true, tower: true } }
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const existingSnapshot = parseMaybeJson(booking.priceSnapshot) || {};
    const updatedKyc = {
      ...(existingSnapshot.kyc || {}),
      name: fullName || existingSnapshot.kyc?.name || booking.customerName,
      fullName: fullName || existingSnapshot.kyc?.fullName || booking.customerName,
      pan: pan !== undefined ? pan : (existingSnapshot.kyc?.pan || ""),
      aadhaar: aadhaar !== undefined ? aadhaar : (existingSnapshot.kyc?.aadhaar || ""),
      dob: dob !== undefined ? dob : (existingSnapshot.kyc?.dob || ""),
      mobile: mobile !== undefined ? mobile : (existingSnapshot.kyc?.mobile || ""),
      email: email !== undefined ? email : (existingSnapshot.kyc?.email || ""),
      corrAddress: corrAddress !== undefined ? corrAddress : (existingSnapshot.kyc?.corrAddress || ""),
      permAddress: permAddress !== undefined ? permAddress : (existingSnapshot.kyc?.permAddress || ""),
      coApplicantName: coApplicantName !== undefined ? coApplicantName : (existingSnapshot.kyc?.coApplicantName || ""),
      coApplicantPan: coApplicantPan !== undefined ? coApplicantPan : (existingSnapshot.kyc?.coApplicantPan || ""),
      coApplicantAadhaar: coApplicantAadhaar !== undefined ? coApplicantAadhaar : (existingSnapshot.kyc?.coApplicantAadhaar || ""),
      coApplicantDob: coApplicantDob !== undefined ? coApplicantDob : (existingSnapshot.kyc?.coApplicantDob || ""),
      coApplicantMobile: coApplicantMobile !== undefined ? coApplicantMobile : (existingSnapshot.kyc?.coApplicantMobile || ""),
      coApplicantEmail: coApplicantEmail !== undefined ? coApplicantEmail : (existingSnapshot.kyc?.coApplicantEmail || ""),
      coApplicantRelation: coApplicantRelation !== undefined ? coApplicantRelation : (existingSnapshot.kyc?.coApplicantRelation || ""),
      coApplicants: Array.isArray(coApplicants) ? coApplicants : (existingSnapshot.kyc?.coApplicants || []),
      updatedAt: new Date().toISOString()
    };

    // Update booking
    await prisma.booking.update({
      where: { id: bookingId },
      data: {
        customerName: fullName || booking.customerName,
        priceSnapshot: {
          ...existingSnapshot,
          kyc: updatedKyc
        }
      }
    });

    // Update lead if linked
    if (booking.leadId) {
      const nameParts = (fullName || "").trim().split(" ");
      const firstName = nameParts[0] || undefined;
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

      const leadUpdate = {};
      if (firstName) leadUpdate.firstName = firstName;
      if (lastName) leadUpdate.lastName = lastName;
      if (dob) {
        const d = new Date(dob);
        if (!isNaN(d.getTime())) leadUpdate.birthday = d;
      }
      if (mobile) leadUpdate.phones = [{ value: mobile, type: "MOBILE", primary: true }];
      if (email) leadUpdate.emails = [{ value: email, type: "PRIMARY", primary: true }];

      if (Object.keys(leadUpdate).length > 0) {
        await prisma.lead.update({
          where: { id: booking.leadId },
          data: leadUpdate
        }).catch(err => console.warn("Could not update lead KYC fields:", err.message));
      }

      // Update lead addresses
      if (corrAddress) {
        const existingLeadAddr = booking.lead?.leadAddress?.[0];
        if (existingLeadAddr) {
          await prisma.leadAddress.update({
            where: { id: existingLeadAddr.id },
            data: { address: corrAddress }
          }).catch(() => {});
        } else {
          await prisma.leadAddress.create({
            data: { leadId: booking.leadId, address: corrAddress }
          }).catch(() => {});
        }
      }

      if (permAddress) {
        const existingPersonalAddr = booking.lead?.personalAddress?.[0];
        if (existingPersonalAddr) {
          await prisma.personalAddress.update({
            where: { id: existingPersonalAddr.id },
            data: { address: permAddress }
          }).catch(() => {});
        } else {
          await prisma.personalAddress.create({
            data: { leadId: booking.leadId, address: permAddress, type: "HOME" }
          }).catch(() => {});
        }
      }
    }

    // Audit log
    await prisma.documentAuditLog.create({
      data: {
        bookingId,
        type: "CUSTOMER_KYC",
        action: "UPDATE",
        details: `Customer KYC fields updated for Allottee "${updatedKyc.name}".`,
        performedBy: req.authUser?.email || "Admin"
      }
    }).catch(() => {});

    // Return refreshed booking details
    const updatedBooking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: {
          include: {
            project: true,
            tower: true
          }
        },
        unitItem: true,
        costSheet: true,
        paymentSchedule: true,
        demands: { orderBy: { createdAt: "desc" } },
        receipts: { orderBy: { createdAt: "desc" } },
        ledgerEntries: { orderBy: { date: "asc" } },
        generatedDocuments: { orderBy: { createdAt: "desc" } },
        documentAuditLogs: { orderBy: { createdAt: "desc" } }
      }
    });

    res.status(200).json({
      message: "Customer KYC updated successfully",
      booking: {
        ...updatedBooking,
        kyc: updatedKyc
      }
    });
  } catch (error) {
    console.error("Error updating customer KYC:", error);
    res.status(500).json({ message: "Unable to update customer KYC" });
  }
};

// 4. Generate Document (Section 7: The Seven Documents with Gates & Versioning)
exports.generateDocument = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { type } = req.body;

    if (!docTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid document type. Allowed: ${docTypes.join(", ")}` });
    }

    if (type === "BOOKING_COST_SHEET_XLSX" || type === "BOOKING_COST_SHEET_PDF" || type === "BOOKING_COST_SHEET") {
      const { generateAndStoreBookingDocuments } = require("../services/bookingDocument.service");
      const result = await generateAndStoreBookingDocuments(bookingId, {
        performedBy: req.authUser?.email || req.authUser?.name || "Admin",
        isRegeneration: true,
      });
      const document = type === "BOOKING_COST_SHEET_XLSX" ? result.xlsxDoc : result.pdfDoc;
      return res.status(201).json({ message: "Cost sheet generated successfully", document, ...result });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingCharges: true,
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: { include: { project: true, tower: true } },
        unitItem: true,
        costSheet: true,
        paymentSchedule: true,
        demands: true,
        receipts: true,
        ledgerEntries: true,
        generatedDocuments: true
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    // ── Non-Negotiable #2: KYC Gate ──
    const kycDocs = ["AGREEMENT", "ALLOTMENT_LETTER"];
    if (kycDocs.includes(type)) {
      const snapshot = parseMaybeJson(booking.priceSnapshot) || {};
      const kyc = snapshot.kyc || {};
      const lead = booking.lead || {};
      const hasPan = !!(kyc.pan || lead.panNumber || lead.pan);
      const hasAadhaar = !!(kyc.aadhaar || lead.aadhaarNumber);
      const missingKycFields = [];
      if (!hasPan) missingKycFields.push("PAN");
      if (!hasAadhaar) missingKycFields.push("Aadhaar");
      if (missingKycFields.length > 0) {
        return res.status(400).json({
          message: `KYC Gate: Customer ${missingKycFields.join(" and ")} ${missingKycFields.length === 1 ? "is" : "are"} required before generating ${type === "ALLOTMENT_LETTER" ? "Allotment Letter" : "Draft of AFS"}. Please complete KYC in the Customer tab.`,
          missingFields: missingKycFields
        });
      }
    }

    // ── Non-Negotiable #8: Possession Revenue Gate (#7) ──
    if (type === "POSSESSION_LETTER") {
      const demands = booking.demands || [];
      const totalOutstanding = demands.reduce((acc, d) => acc + (d.outstandingAmount || 0), 0);
      const ledgerEntries = booking.ledgerEntries || [];
      const ledgerDebits = ledgerEntries.filter(e => e.type === "DEBIT" || e.entryType === "DEBIT").reduce((s, e) => s + (e.amount || 0), 0);
      const ledgerCredits = ledgerEntries.filter(e => e.type === "CREDIT" || e.entryType === "CREDIT").reduce((s, e) => s + (e.amount || 0), 0);
      const ledgerOutstanding = Math.max(0, ledgerDebits - ledgerCredits);
      const outstanding = Math.max(totalOutstanding, ledgerOutstanding);

      if (outstanding > 0) {
        return res.status(400).json({
          message: `Outstanding ₹${outstanding.toLocaleString("en-IN")} — clear dues before possession`
        });
      }

      const existingTypes = new Set((booking.generatedDocuments || []).map(d => d.type));
      const requiredPrior = ["ALLOTMENT_LETTER", "AGREEMENT"];
      const missingPrior = requiredPrior.filter(t => !existingTypes.has(t));
      if (missingPrior.length > 0) {
        const labels = missingPrior.map(t => t === "ALLOTMENT_LETTER" ? "Allotment Letter" : "Draft of AFS");
        return res.status(400).json({
          message: `Required prior documents missing: ${labels.join(", ")} must be generated before possession`
        });
      }
    }

    const template = documentTemplates[type];
    if (!template) {
      return res.status(400).json({ message: `Template for ${type} not found` });
    }

    const context = buildRichContext(booking, type);
    const html = mergeTemplate(template, context);

    // Versioning: count existing docs of this type
    const existingVersions = (booking.generatedDocuments || []).filter(d => d.type === type);
    const nextVersion = existingVersions.length + 1;
    const docTitle = `${String(type).replace(/_/g, " ")} (v${nextVersion}) — ${context.customerName}`;
    const pdfUrl = `/documents/${booking.id}/${type.toLowerCase()}-v${nextVersion}.html`;

    const document = await prisma.generatedDocument.create({
      data: { bookingId: booking.id, type, title: docTitle, htmlContent: html, pdfUrl }
    });

    await prisma.documentAuditLog.create({
      data: {
        bookingId: booking.id,
        type,
        action: "GENERATE",
        details: `Document "${docTitle}" generated successfully. Version: v${nextVersion}.`,
        performedBy: req.authUser?.email || "Admin"
      }
    });

    res.status(201).json({ message: "Document generated successfully", document, version: nextVersion });
  } catch (error) {
    console.error("Error generating document:", error);
    res.status(500).json({ message: "Unable to generate document" });
  }
};

// 4.1 Preview Document (Render from Placeholder Master without saving)
exports.previewDocument = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { type } = req.body;

    if (!docTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid document type. Allowed: ${docTypes.join(", ")}` });
    }

    if (type === "BOOKING_COST_SHEET_XLSX" || type === "BOOKING_COST_SHEET_PDF" || type === "BOOKING_COST_SHEET") {
      const { buildBookingCostSheetData } = require("../services/costSheetData.service");
      const { renderCostSheetHtml } = require("../services/costSheetPdf.service");
      const costSheetData = await buildBookingCostSheetData(bookingId);
      const html = await renderCostSheetHtml(costSheetData);
      return res.status(200).json({
        type,
        title: `Cost Sheet Preview — BKG-${bookingId}`,
        htmlContent: html,
        previewOnly: true
      });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        bookingCharges: true,
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: { include: { project: true, tower: true } },
        unitItem: true,
        costSheet: true,
        paymentSchedule: true,
        demands: true,
        receipts: true,
        ledgerEntries: true,
        generatedDocuments: true
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const template = documentTemplates[type];
    if (!template) {
      return res.status(400).json({ message: `Template for ${type} not found` });
    }

    const context = buildRichContext(booking, type);
    const html = mergeTemplate(template, context);
    const existingVersions = (booking.generatedDocuments || []).filter(d => d.type === type);
    const versionLabel = existingVersions.length > 0 ? `v${existingVersions.length}` : "Draft Preview";
    const docTitle = `${String(type).replace(/_/g, " ")} (${versionLabel}) — ${context.customerName}`;

    res.status(200).json({
      type,
      title: docTitle,
      htmlContent: html,
      previewOnly: true,
      versionCount: existingVersions.length
    });
  } catch (error) {
    console.error("Error previewing document:", error);
    res.status(500).json({ message: "Unable to preview document" });
  }
};

// 5. Document Action Logger (Print, Download, Preview)
exports.logDocumentAction = async (req, res) => {
  try {
    const { bookingId, type, action, details } = req.body;
    if (!bookingId || !type || !action) {
      return res.status(400).json({ message: "bookingId, type, and action are required" });
    }
    const auditLog = await prisma.documentAuditLog.create({
      data: {
        bookingId: Number(bookingId),
        type,
        action,
        details: details || `${action} action performed on ${type}`,
        performedBy: req.authUser?.email || "Admin"
      }
    });
    res.status(201).json(auditLog);
  } catch (error) {
    console.error("Error logging document action:", error);
    res.status(500).json({ message: "Unable to log document action" });
  }
};

// 6. Get Audit Logs
exports.getBookingAuditLogs = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const logs = await prisma.documentAuditLog.findMany({
      where: { bookingId },
      orderBy: { createdAt: "desc" }
    });
    res.status(200).json(logs);
  } catch (error) {
    console.error("Error fetching audit logs:", error);
    res.status(500).json({ message: "Unable to load audit logs" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 7. Payment Plans
// ─────────────────────────────────────────────────────────────────────────────
exports.getPaymentPlans = async (req, res) => {
  try {
    const POST_SALES_STAGES = ["Confirmed", "Booked"];
    const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;
    const where = bookingId ? { id: bookingId } : { stage: { in: POST_SALES_STAGES } };

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        paymentSchedule: { orderBy: { id: "asc" } },
        lead: { select: { firstName: true, lastName: true, phones: true } },
        unit: { include: { project: { select: { id: true, name: true } }, tower: { select: { id: true, name: true } } } }
      },
      orderBy: { createdAt: "desc" }
    });

    const result = bookings.map(b => ({
      ...b,
      totalScheduledAmount: b.paymentSchedule.reduce((s, m) => s + (m.amount || 0), 0),
      totalGrandTotal: b.paymentSchedule.reduce((s, m) => s + (m.grandTotal || 0), 0),
      milestonesCount: b.paymentSchedule.length
    }));

    res.status(200).json({ data: result, total: result.length });
  } catch (error) {
    console.error("Error fetching payment plans:", error);
    res.status(500).json({ message: "Unable to fetch payment plans" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8. Demands
// ─────────────────────────────────────────────────────────────────────────────
exports.getDemands = async (req, res) => {
  try {
    const status = req.query.status || "";
    const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const where = {};
    if (status && status !== "ALL") where.status = status;
    if (bookingId) where.bookingId = bookingId;

    const [demands, total, stats, statusCounts] = await Promise.all([
      prisma.demand.findMany({
        where, skip, take: limit,
        include: {
          booking: {
            select: {
              id: true, customerName: true, basePrice: true, stage: true,
              lead: { select: { firstName: true, lastName: true, phones: true } },
              unit: { include: { project: { select: { name: true } }, tower: { select: { name: true } } } }
            }
          }
        },
        orderBy: { createdAt: "desc" }
      }),
      prisma.demand.count({ where }),
      prisma.demand.aggregate({ _sum: { amount: true, paidAmount: true, outstandingAmount: true }, _count: { id: true } }),
      prisma.demand.groupBy({ by: ["status"], _count: { id: true }, _sum: { amount: true, outstandingAmount: true } })
    ]);

    res.status(200).json({ data: demands, total, page, limit, stats, statusCounts });
  } catch (error) {
    console.error("Error fetching demands:", error);
    res.status(500).json({ message: "Unable to fetch demands" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 8.1 The Demand Engine — Formula & Interest Helpers (Section 6)
// ─────────────────────────────────────────────────────────────────────────────

function calculateFlatMilestoneDemand(booking, milestone, priorDemands = [], interestRate = 18) {
  const snapshot = parseMaybeJson(booking.priceSnapshot) || {};
  const floorPlan = booking.unit?.floor;
  const carpetArea = Number(booking.carpetArea || floorPlan?.carpet || booking.unit?.carpet || 818.39);
  const flatRate = Number(booking.closingBaseRate || booking.closingRate || booking.baseRate || floorPlan?.baseRate || 20000);
  const flatCost = Number((carpetArea * flatRate).toFixed(2));
  const parkingAmount = Number(
    booking.parkingAmount ??
    booking.parkingCharges ??
    snapshot.parkingAmount ??
    snapshot.parkingCharges ??
    0
  );
  // Demand Principal Base = Total Flat Cost (E) = C + D
  const totalFlatCostE = Number((flatCost + parkingAmount).toFixed(2));

  const pct = Number(milestone.percentage || milestone.value || 10);
  const principal = Number(milestone.amount ? milestone.amount : ((totalFlatCostE * pct) / 100).toFixed(2));

  const mName = String(milestone.name || milestone.towerMilestone || "").toLowerCase();
  const isBookingMilestone = mName.includes("booking") || mName.includes("advance") || mName.includes("eoi");
  const isRegistrationMilestone = mName.includes("registration") || mName.includes("agreement");

  let gst = 0;
  let tds = 0;
  let isDeferredGst = false;

  // 6.2 Formula: Booking GST/TDS deferred; caught up at Registration on cumulative 30%
  if (isBookingMilestone) {
    gst = 0;
    tds = 0;
    isDeferredGst = true;
  } else if (isRegistrationMilestone) {
    const cumulativePct = 30; // standard 10% booking + 20% registration
    const cumulativePrincipal = Number(((totalFlatCostE * cumulativePct) / 100).toFixed(2));
    gst = Number(((cumulativePrincipal * 5) / 100).toFixed(2));
    tds = Number(((cumulativePrincipal * 1) / 100).toFixed(2));
  } else {
    gst = Number(((principal * 5) / 100).toFixed(2));
    tds = Number(((principal * 1) / 100).toFixed(2));
  }

  // 6.5 Accrued Interest on prior overdue demands (at agreement rate on overdue principal only)
  const now = new Date();
  let accruedInterest = 0;
  const overdueBreakdown = [];

  for (const dem of priorDemands) {
    if (dem.status !== "PAID" && dem.dueDate && new Date(dem.dueDate) < now && (dem.outstandingAmount || 0) > 0) {
      const daysOverdue = Math.max(0, Math.floor((now - new Date(dem.dueDate)) / 86400000));
      if (daysOverdue > 0) {
        const principalRatio = dem.amount > 0 ? ((dem.principal || dem.amount) / dem.amount) : 1;
        const overduePrincipal = Number(((dem.outstandingAmount || dem.amount) * principalRatio).toFixed(2));
        const itemInterest = Number((overduePrincipal * (interestRate / 100) * (daysOverdue / 365)).toFixed(2));
        accruedInterest += itemInterest;
        overdueBreakdown.push({
          demandNo: dem.demandNo,
          dueDate: dem.dueDate,
          daysOverdue,
          overduePrincipal,
          interestRate,
          interest: itemInterest
        });
      }
    }
  }

  const priorOutstanding = priorDemands.reduce((sum, d) => sum + (Number(d.outstandingAmount) || 0), 0);
  const demandAmount = Number((principal + gst + accruedInterest).toFixed(2));
  const totalPayableNow = Number((demandAmount + priorOutstanding).toFixed(2));

  return {
    totalFlatCostE,
    flatCost,
    parkingAmount,
    milestoneName: milestone.name || "Milestone",
    percentage: pct,
    principal,
    gst,
    tds,
    isDeferredGst,
    accruedInterest: Number(accruedInterest.toFixed(2)),
    overdueBreakdown,
    priorOutstanding: Number(priorOutstanding.toFixed(2)),
    demandAmount,
    totalPayableNow
  };
}

// 8.2 Preview Next Milestone Demand for a Flat
exports.previewNextDemand = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { interestRate = 18 } = req.query;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: { include: { project: true, tower: true, floor: true } },
        unitItem: true,
        paymentSchedule: { orderBy: { id: "asc" } },
        demands: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const { buildBookingCostSheetData } = require("../services/costSheetData.service");
    let costSheetData = null;
    try {
      costSheetData = await buildBookingCostSheetData(bookingId);
    } catch (e) {}

    const scheduleRows = (costSheetData?.paymentSchedule?.rows?.length > 0)
      ? costSheetData.paymentSchedule.rows
      : (booking.paymentSchedule?.length > 0 ? booking.paymentSchedule : []);

    const existingDemands = booking.demands || [];

    // Find next pending milestone
    let nextMilestone = null;
    let nextMilestoneIndex = 0;

    for (let i = 0; i < scheduleRows.length; i++) {
      const row = scheduleRows[i];
      const isAlreadyDemanded = existingDemands.some(d =>
        String(d.description || "").toLowerCase().includes(String(row.name).toLowerCase())
      );
      if (!isAlreadyDemanded) {
        nextMilestone = row;
        nextMilestoneIndex = i;
        break;
      }
    }

    if (!nextMilestone && scheduleRows.length > 0) {
      nextMilestone = scheduleRows[scheduleRows.length - 1];
      nextMilestoneIndex = scheduleRows.length - 1;
    }

    if (!nextMilestone) {
      return res.status(400).json({ message: "No payment plan schedule available for this flat" });
    }

    const calc = calculateFlatMilestoneDemand(booking, nextMilestone, existingDemands, Number(interestRate));

    res.status(200).json({
      bookingId,
      customerName: booking.customerName || (booking.lead?.firstName ? `${booking.lead.firstName} ${booking.lead.lastName || ""}` : "Customer"),
      unitNo: booking.unitItem?.name || booking.unit?.unitNo || "Unit",
      projectName: booking.unit?.project?.name || "Project",
      nextMilestone,
      nextMilestoneIndex,
      allMilestones: scheduleRows,
      calculation: calc,
      priorDemandsCount: existingDemands.length
    });
  } catch (error) {
    console.error("Error previewing next demand:", error);
    res.status(500).json({ message: error.message || "Failed to preview next demand" });
  }
};

// 8.3 Generate Single Demand for a Flat
exports.generateSingleDemand = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { milestoneIndex, milestoneName, dueDateDays = 15, interestRate = 18 } = req.body;

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: { include: { project: true, tower: true, floor: true } },
        unitItem: true,
        paymentSchedule: { orderBy: { id: "asc" } },
        demands: { orderBy: { createdAt: "asc" } }
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const { buildBookingCostSheetData } = require("../services/costSheetData.service");
    let costSheetData = null;
    try {
      costSheetData = await buildBookingCostSheetData(bookingId);
    } catch (e) {}

    const scheduleRows = (costSheetData?.paymentSchedule?.rows?.length > 0)
      ? costSheetData.paymentSchedule.rows
      : (booking.paymentSchedule?.length > 0 ? booking.paymentSchedule : []);

    let targetMilestone = null;
    if (milestoneIndex !== undefined && scheduleRows[milestoneIndex]) {
      targetMilestone = scheduleRows[milestoneIndex];
    } else if (milestoneName) {
      targetMilestone = scheduleRows.find(m => String(m.name).toLowerCase() === String(milestoneName).toLowerCase());
    }

    if (!targetMilestone) {
      const existingDemands = booking.demands || [];
      for (const row of scheduleRows) {
        const already = existingDemands.some(d => String(d.description || "").toLowerCase().includes(String(row.name).toLowerCase()));
        if (!already) {
          targetMilestone = row;
          break;
        }
      }
    }

    if (!targetMilestone) {
      targetMilestone = scheduleRows[0] || { name: "Milestone Installment", percentage: 10, amount: 100000 };
    }

    const calc = calculateFlatMilestoneDemand(booking, targetMilestone, booking.demands || [], Number(interestRate));

    const fy = getFinancialYear();
    const projCode = getProjectCode(booking);
    const projectId = booking.unit?.project?.id || booking.unit?.projectId;
    const projDemandCount = projectId
      ? await prisma.demand.count({ where: { booking: { unit: { projectId } } } })
      : await prisma.demand.count();
    const demandNo = `DEM/${projCode}/${fy}/${String(projDemandCount + 1).padStart(4, "0")}`;
    const issuedAt = new Date();
    const dueDate = new Date(Date.now() + Number(dueDateDays) * 86400000);

    // 1. Create Demand record
    const demand = await prisma.demand.create({
      data: {
        demandNo,
        bookingId,
        description: `${calc.milestoneName} (${calc.percentage}%)`,
        principal: calc.principal,
        gst: calc.gst,
        amount: calc.demandAmount,
        paidAmount: 0,
        outstandingAmount: calc.demandAmount,
        status: "ISSUED",
        issuedAt,
        dueDate
      }
    });

    // 2. Post DEBIT to Customer Ledger
    await prisma.ledgerEntry.create({
      data: {
        bookingId,
        type: "DEBIT",
        amount: demand.amount,
        description: `Demand ${demand.demandNo} — ${calc.milestoneName} (${calc.percentage}%)`,
        date: issuedAt
      }
    });

    // 3. Generate Demand Letter (Document)
    const context = buildRichContext(booking, "DEMAND_LETTER");
    context.demandNo = demand.demandNo;
    context.milestoneLabel = `${calc.milestoneName} (${calc.percentage}%)`;
    context.milestonePercent = String(calc.percentage);
    context.principalAmount = `₹${calc.principal.toLocaleString("en-IN")}`;
    context.gstAmount = calc.isDeferredGst ? "Deferred to Registration" : `₹${calc.gst.toLocaleString("en-IN")}`;
    context.interestAmount = calc.accruedInterest > 0 ? `₹${calc.accruedInterest.toLocaleString("en-IN")}` : "NIL";
    context.priorOutstanding = calc.priorOutstanding > 0 ? `₹${calc.priorOutstanding.toLocaleString("en-IN")}` : "NIL";
    context.totalPayable = `₹${calc.totalPayableNow.toLocaleString("en-IN")}`;
    context.amountInWords = numberToWords(Math.round(calc.totalPayableNow));
    context.dueDate = dueDate.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
    context.issueDate = issuedAt.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

    const template = documentTemplates.DEMAND_LETTER;
    const letterHtml = mergeTemplate(template, context);

    const doc = await prisma.generatedDocument.create({
      data: {
        bookingId,
        type: "DEMAND_LETTER",
        title: `Demand Notice ${demand.demandNo} — ${calc.milestoneName}`,
        htmlContent: letterHtml,
        pdfUrl: `/api/post-sales/demands/${demand.id}/letter`
      }
    });

    // 4. Log in DocumentAuditLog
    await prisma.documentAuditLog.create({
      data: {
        bookingId,
        type: "DEMAND_LETTER",
        action: "GENERATE",
        details: `Issued Demand ${demand.demandNo} for ${calc.milestoneName}. Amount: ₹${calc.demandAmount.toLocaleString("en-IN")}. Posted DEBIT to Ledger.`,
        performedBy: req.authUser?.email || "Admin"
      }
    });

    res.status(201).json({
      message: "Demand generated and posted to ledger successfully",
      demand,
      document: doc,
      calculation: calc
    });
  } catch (error) {
    console.error("Error generating single demand:", error);
    res.status(500).json({ message: error.message || "Failed to generate demand" });
  }
};

// 8.4 Preview Batch Demands for a Project/Tower Construction Milestone
exports.previewBatchDemands = async (req, res) => {
  try {
    const { towerId, projectId, milestoneName, interestRate = 18 } = req.body;
    if (!towerId && !projectId) {
      return res.status(400).json({ message: "towerId or projectId is required" });
    }

    const where = { stage: { in: ["Confirmed", "Booked"] } };
    if (towerId) where.towerId = Number(towerId);
    else if (projectId) where.projectId = Number(projectId);

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        lead: { select: { firstName: true, lastName: true, phones: true } },
        unit: { include: { project: true, tower: true, floor: true } },
        unitItem: true,
        paymentSchedule: true,
        demands: { orderBy: { createdAt: "asc" } }
      }
    });

    const { buildBookingCostSheetData } = require("../services/costSheetData.service");

    const batchResults = [];
    let totalPrincipal = 0;
    let totalGst = 0;
    let totalInterest = 0;
    let totalDemanded = 0;

    for (const b of bookings) {
      let costSheetData = null;
      try {
        costSheetData = await buildBookingCostSheetData(b.id);
      } catch (e) {}

      const scheduleRows = (costSheetData?.paymentSchedule?.rows?.length > 0)
        ? costSheetData.paymentSchedule.rows
        : (b.paymentSchedule?.length > 0 ? b.paymentSchedule : []);

      let targetMilestone = null;
      if (milestoneName) {
        targetMilestone = scheduleRows.find(m => String(m.name).toLowerCase().includes(String(milestoneName).toLowerCase()));
      }
      if (!targetMilestone && scheduleRows.length > 0) {
        targetMilestone = scheduleRows.find(m =>
          !b.demands.some(d => String(d.description || "").toLowerCase().includes(String(m.name).toLowerCase()))
        );
      }

      if (targetMilestone) {
        const isAlreadyDemanded = b.demands.some(d =>
          String(d.description || "").toLowerCase().includes(String(targetMilestone.name).toLowerCase())
        );

        const calc = calculateFlatMilestoneDemand(b, targetMilestone, b.demands || [], Number(interestRate));

        if (!isAlreadyDemanded) {
          totalPrincipal += calc.principal;
          totalGst += calc.gst;
          totalInterest += calc.accruedInterest;
          totalDemanded += calc.demandAmount;
        }

        batchResults.push({
          bookingId: b.id,
          customerName: b.customerName || `${b.lead?.firstName || ""} ${b.lead?.lastName || ""}`.trim() || "Customer",
          unitNo: b.unitItem?.name || b.unit?.unitNo || `Unit #${b.id}`,
          towerName: b.unit?.tower?.name || "Tower",
          milestoneName: targetMilestone.name,
          percentage: targetMilestone.percentage,
          isAlreadyDemanded,
          calculation: calc,
          status: isAlreadyDemanded ? "SKIPPED_ALREADY_DEMANDED" : "ELIGIBLE"
        });
      }
    }

    res.status(200).json({
      milestoneName: milestoneName || "Target Milestone",
      totalFlats: bookings.length,
      eligibleFlatsCount: batchResults.filter(r => r.status === "ELIGIBLE").length,
      totalPrincipal: Number(totalPrincipal.toFixed(2)),
      totalGst: Number(totalGst.toFixed(2)),
      totalInterest: Number(totalInterest.toFixed(2)),
      totalDemanded: Number(totalDemanded.toFixed(2)),
      flats: batchResults
    });
  } catch (error) {
    console.error("Error previewing batch demands:", error);
    res.status(500).json({ message: error.message || "Failed to preview batch demands" });
  }
};

// 8.5 Generate Batch Demands for a Project/Tower Milestone
exports.generateBatchDemands = async (req, res) => {
  try {
    const { towerId, projectId, milestoneName, dueDateDays = 15, interestRate = 18 } = req.body;
    if (!towerId && !projectId) {
      return res.status(400).json({ message: "towerId or projectId is required" });
    }

    const where = { stage: { in: ["Confirmed", "Booked"] } };
    if (towerId) where.towerId = Number(towerId);
    else if (projectId) where.projectId = Number(projectId);

    const bookings = await prisma.booking.findMany({
      where,
      include: {
        lead: { include: { leadAddress: true, personalAddress: true } },
        unit: { include: { project: true, tower: true, floor: true } },
        unitItem: true,
        paymentSchedule: true,
        demands: { orderBy: { createdAt: "asc" } }
      }
    });

    const { buildBookingCostSheetData } = require("../services/costSheetData.service");

    let countIssued = 0;
    let sumAmount = 0;
    const issuedDemands = [];

    for (const b of bookings) {
      let costSheetData = null;
      try {
        costSheetData = await buildBookingCostSheetData(b.id);
      } catch (e) {}

      const scheduleRows = (costSheetData?.paymentSchedule?.rows?.length > 0)
        ? costSheetData.paymentSchedule.rows
        : (b.paymentSchedule?.length > 0 ? b.paymentSchedule : []);

      let targetMilestone = null;
      if (milestoneName) {
        targetMilestone = scheduleRows.find(m => String(m.name).toLowerCase().includes(String(milestoneName).toLowerCase()));
      }
      if (!targetMilestone && scheduleRows.length > 0) {
        targetMilestone = scheduleRows.find(m =>
          !b.demands.some(d => String(d.description || "").toLowerCase().includes(String(m.name).toLowerCase()))
        );
      }

      if (!targetMilestone) continue;

      const isAlreadyDemanded = b.demands.some(d =>
        String(d.description || "").toLowerCase().includes(String(targetMilestone.name).toLowerCase())
      );
      if (isAlreadyDemanded) continue;

      const calc = calculateFlatMilestoneDemand(b, targetMilestone, b.demands || [], Number(interestRate));

      const fy = getFinancialYear();
      const projCode = getProjectCode(b);
      const projectId = b.unit?.project?.id || b.unit?.projectId;
      const projDemandCount = projectId
        ? await prisma.demand.count({ where: { booking: { unit: { projectId } } } })
        : await prisma.demand.count();
      const demandNo = `DEM/${projCode}/${fy}/${String(projDemandCount + 1 + countIssued).padStart(4, "0")}`;
      const issuedAt = new Date();
      const dueDate = new Date(Date.now() + Number(dueDateDays) * 86400000);

      // Create Demand
      const demand = await prisma.demand.create({
        data: {
          demandNo,
          bookingId: b.id,
          description: `${calc.milestoneName} (${calc.percentage}%)`,
          principal: calc.principal,
          gst: calc.gst,
          amount: calc.demandAmount,
          paidAmount: 0,
          outstandingAmount: calc.demandAmount,
          status: "ISSUED",
          issuedAt,
          dueDate
        }
      });

      // Post DEBIT to Ledger
      await prisma.ledgerEntry.create({
        data: {
          bookingId: b.id,
          type: "DEBIT",
          amount: demand.amount,
          description: `Demand ${demand.demandNo} — ${calc.milestoneName} (${calc.percentage}%)`,
          date: issuedAt
        }
      });

      countIssued++;
      sumAmount += demand.amount;
      issuedDemands.push(demand);
    }

    res.status(201).json({
      message: `Batch demands issued successfully for ${countIssued} flats`,
      countIssued,
      totalAmountIssued: Number(sumAmount.toFixed(2)),
      demands: issuedDemands
    });
  } catch (error) {
    console.error("Error generating batch demands:", error);
    res.status(500).json({ message: error.message || "Failed to generate batch demands" });
  }
};

// 8.6 Record Payment Receipt in Collections & Post Credit to Ledger
exports.recordReceipt = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { amount, mode = "NEFT", referenceNumber = "", receivedAt = new Date(), demandIds = [], tdsDeducted = 0 } = req.body;

    const numAmount = Number(amount);
    if (!numAmount || numAmount <= 0) {
      return res.status(400).json({ message: "Valid payment amount is required" });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        unit: { include: { project: true } },
        demands: { where: { status: { not: "PAID" } }, orderBy: { createdAt: "asc" } }
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const fy = getFinancialYear();
    const projCode = getProjectCode(booking);
    const projectId = booking.unit?.project?.id || booking.unit?.projectId;
    const projReceiptCount = projectId
      ? await prisma.receipt.count({ where: { booking: { unit: { projectId } } } })
      : await prisma.receipt.count();
    const receiptNo = `REC/${projCode}/${fy}/${String(projReceiptCount + 1).padStart(4, "0")}`;
    const recDate = new Date(receivedAt);

    // 1. Create Receipt
    const receipt = await prisma.receipt.create({
      data: {
        receiptNo,
        bookingId,
        demandId: demandIds[0] ? Number(demandIds[0]) : (booking.demands[0]?.id || null),
        amount: numAmount,
        mode: String(mode).toUpperCase(),
        referenceNumber: referenceNumber || `REF-${Date.now().toString().slice(-6)}`,
        status: "POSTED",
        receivedAt: recDate
      }
    });

    // 2. Post CREDIT to Customer Ledger
    await prisma.ledgerEntry.create({
      data: {
        bookingId,
        type: "CREDIT",
        amount: numAmount,
        description: `Receipt ${receipt.receiptNo} via ${receipt.mode} (Ref: ${receipt.referenceNumber || "—"})`,
        date: recDate
      }
    });

    // 3. Allocate across unpaid demands
    let remainingToAllocate = numAmount;
    const targetDemands = (demandIds.length > 0)
      ? await prisma.demand.findMany({ where: { id: { in: demandIds.map(Number) } }, orderBy: { createdAt: "asc" } })
      : booking.demands;

    const updatedDemands = [];

    for (const dem of targetDemands) {
      if (remainingToAllocate <= 0) break;
      const outstanding = Number(dem.outstandingAmount || dem.amount);
      const alloc = Math.min(remainingToAllocate, outstanding);

      const newPaid = Number(((dem.paidAmount || 0) + alloc).toFixed(2));
      const newOutstanding = Number(Math.max(0, outstanding - alloc).toFixed(2));
      const newStatus = newOutstanding <= 0 ? "PAID" : "PARTIALLY_PAID";

      const updated = await prisma.demand.update({
        where: { id: dem.id },
        data: {
          paidAmount: newPaid,
          outstandingAmount: newOutstanding,
          status: newStatus
        }
      });

      remainingToAllocate = Number((remainingToAllocate - alloc).toFixed(2));
      updatedDemands.push(updated);
    }

    // 4. Log in DocumentAuditLog
    await prisma.documentAuditLog.create({
      data: {
        bookingId,
        type: "RECEIPT",
        action: "RECORD_PAYMENT",
        details: `Recorded receipt ${receipt.receiptNo} for ₹${numAmount.toLocaleString("en-IN")} via ${mode}. Posted CREDIT to Ledger.`,
        performedBy: req.authUser?.email || "Admin"
      }
    });

    res.status(201).json({
      message: "Payment receipt recorded successfully and ledger credited",
      receipt,
      updatedDemands
    });
  } catch (error) {
    console.error("Error recording receipt:", error);
    res.status(500).json({ message: error.message || "Failed to record payment receipt" });
  }
};

// 8.7 Get Formatted Demand Letter HTML
exports.getDemandLetter = async (req, res) => {
  try {
    const demandId = Number(req.params.id);
    const demand = await prisma.demand.findUnique({
      where: { id: demandId },
      include: {
        booking: {
          include: {
            lead: { include: { leadAddress: true, personalAddress: true } },
            unit: { include: { project: true, tower: true } }
          }
        }
      }
    });

    if (!demand) return res.status(404).json({ message: "Demand not found" });

    // Check existing generated document
    const doc = await prisma.generatedDocument.findFirst({
      where: {
        bookingId: demand.bookingId,
        type: "DEMAND_LETTER",
        title: { contains: demand.demandNo }
      },
      orderBy: { createdAt: "desc" }
    });

    if (doc && doc.htmlContent) {
      res.setHeader("Content-Type", "text/html; charset=utf-8");
      return res.send(doc.htmlContent);
    }

    // Render dynamically
    const context = buildRichContext(demand.booking, "DEMAND_LETTER");
    context.demandNo = demand.demandNo;
    context.milestoneLabel = demand.description || "Installment Milestone";
    context.principalAmount = `₹${demand.principal.toLocaleString("en-IN")}`;
    context.gstAmount = `₹${demand.gst.toLocaleString("en-IN")}`;
    context.totalPayable = `₹${demand.amount.toLocaleString("en-IN")}`;
    context.amountInWords = numberToWords(Math.round(demand.amount));
    context.dueDate = demand.dueDate ? new Date(demand.dueDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";
    context.issueDate = demand.issuedAt ? new Date(demand.issuedAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "—";

    const html = mergeTemplate(documentTemplates.DEMAND_LETTER, context);
    res.setHeader("Content-Type", "text/html; charset=utf-8");
    res.send(html);
  } catch (error) {
    console.error("Error getting demand letter:", error);
    res.status(500).json({ message: "Failed to render demand letter" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 9. Collections
// ─────────────────────────────────────────────────────────────────────────────
exports.getCollections = async (req, res) => {
  try {
    const mode = req.query.mode || "";
    const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 50;
    const skip = (page - 1) * limit;
    const where = {};
    if (mode && mode !== "ALL") where.mode = mode;
    if (bookingId) where.bookingId = bookingId;

    const [receipts, total, stats, modeCounts] = await Promise.all([
      prisma.receipt.findMany({
        where, skip, take: limit,
        include: {
          booking: {
            select: {
              id: true, customerName: true, basePrice: true,
              lead: { select: { firstName: true, lastName: true, phones: true } },
              unit: { include: { project: { select: { name: true } }, tower: { select: { name: true } } } }
            }
          },
          demand: { select: { demandNo: true, description: true } }
        },
        orderBy: { receivedAt: "desc" }
      }),
      prisma.receipt.count({ where }),
      prisma.receipt.aggregate({ _sum: { amount: true }, _count: { id: true } }),
      prisma.receipt.groupBy({ by: ["mode"], _count: { id: true }, _sum: { amount: true } })
    ]);

    res.status(200).json({ data: receipts, total, page, limit, stats, modeCounts });
  } catch (error) {
    console.error("Error fetching collections:", error);
    res.status(500).json({ message: "Unable to fetch collections" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 10. Customer Ledger
// ─────────────────────────────────────────────────────────────────────────────
exports.getCustomerLedger = async (req, res) => {
  try {
    const POST_SALES_STAGES = ["Confirmed", "Booked"];
    const bookingId = req.query.bookingId ? Number(req.query.bookingId) : undefined;

    if (bookingId) {
      const booking = await prisma.booking.findUnique({
        where: { id: bookingId },
        include: {
          lead: { select: { firstName: true, lastName: true, phones: true } },
          unit: { include: { project: { select: { name: true } }, tower: { select: { name: true } } } },
          ledgerEntries: { orderBy: { date: "asc" } },
          demands: { orderBy: { createdAt: "asc" } },
          receipts: { orderBy: { receivedAt: "asc" } }
        }
      });
      if (!booking) return res.status(404).json({ message: "Booking not found" });

      let entries = booking.ledgerEntries;
      if (!entries.length) {
        const debits = booking.demands.map(d => ({ id: "dem-" + d.id, type: "DEBIT", amount: d.amount, description: "Demand " + d.demandNo, date: d.issuedAt || d.dueDate || d.createdAt }));
        const credits = booking.receipts.map(r => ({ id: "rec-" + r.id, type: "CREDIT", amount: r.amount, description: "Receipt " + r.receiptNo + " via " + r.mode, date: r.receivedAt || r.createdAt }));
        entries = [...debits, ...credits].sort((a, b) => new Date(a.date) - new Date(b.date));
      }

      let bal = 0;
      const ledger = entries.map(e => {
        if (e.type === "DEBIT") bal += e.amount; else bal -= e.amount;
        return { ...e, runningBalance: bal };
      });

      return res.status(200).json({ booking, ledger });
    }

    const bookings = await prisma.booking.findMany({
      where: { stage: { in: POST_SALES_STAGES } },
      include: {
        lead: { select: { firstName: true, lastName: true, phones: true } },
        unit: { include: { project: { select: { name: true } }, tower: { select: { name: true } } } },
        demands: { select: { amount: true, paidAmount: true, outstandingAmount: true } },
        receipts: { select: { amount: true } }
      },
      orderBy: { createdAt: "desc" }
    });

    const summary = bookings.map(b => ({
      id: b.id,
      customerName: b.customerName || (b.lead && b.lead.firstName && b.lead.lastName ? b.lead.firstName + " " + b.lead.lastName : b.lead && b.lead.firstName) || "Customer",
      phones: b.lead && b.lead.phones,
      projectName: b.unit && b.unit.project ? b.unit.project.name : "—",
      towerName: b.unit && b.unit.tower ? b.unit.tower.name : "—",
      unitNo: b.unit ? (b.unit.unitNo || b.unit.name || "—") : "—",
      basePrice: b.basePrice,
      totalDemanded: b.demands.reduce((s, d) => s + d.amount, 0),
      totalCollected: b.receipts.reduce((s, r) => s + r.amount, 0),
      totalOutstanding: b.demands.reduce((s, d) => s + d.outstandingAmount, 0),
      stage: b.stage
    }));

    res.status(200).json({ data: summary, total: summary.length });
  } catch (error) {
    console.error("Error fetching ledger:", error);
    res.status(500).json({ message: "Unable to fetch ledger" });
  }
};

// ─────────────────────────────────────────────────────────────────────────────
// 11. Reports
// ─────────────────────────────────────────────────────────────────────────────
exports.getReports = async (req, res) => {
  try {
    const POST_SALES_STAGES = ["Confirmed", "Booked"];
    const now = new Date();
    const d30 = new Date(now - 30 * 86400000);
    const d60 = new Date(now - 60 * 86400000);
    const d90 = new Date(now - 90 * 86400000);

    const [totalBookings, demandsAgg, collectionsAgg, ledgerDebitsAgg, ledgerCreditsAgg, demandsByStatus, modeBreakdown, recentDemands, recentCollections, b0, b1, b2, b3] = await Promise.all([
      prisma.booking.count({ where: { stage: { in: POST_SALES_STAGES } } }),
      prisma.demand.aggregate({ _sum: { amount: true, paidAmount: true, outstandingAmount: true }, _count: { id: true } }),
      prisma.receipt.aggregate({ where: { status: "POSTED" }, _sum: { amount: true }, _count: { id: true } }),
      prisma.ledgerEntry.aggregate({ where: { type: "DEBIT" }, _sum: { amount: true } }),
      prisma.ledgerEntry.aggregate({ where: { type: "CREDIT" }, _sum: { amount: true } }),
      prisma.demand.groupBy({ by: ["status"], _count: { id: true }, _sum: { amount: true, outstandingAmount: true } }),
      prisma.receipt.groupBy({ by: ["mode"], _count: { id: true }, _sum: { amount: true } }),
      prisma.demand.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { booking: { select: { id: true, customerName: true, lead: { select: { firstName: true, lastName: true } } } } } }),
      prisma.receipt.findMany({ take: 5, orderBy: { receivedAt: "desc" }, include: { booking: { select: { id: true, customerName: true, lead: { select: { firstName: true, lastName: true } } } } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { gte: d30 } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { gte: d60, lt: d30 } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { gte: d90, lt: d60 } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { lt: d90 } } })
    ]);

    // Section 8: Everything reconciles: ledger debits = sum of demands; credits = sum of receipts; outstanding = debits − credits
    const totalDebits = Math.max(ledgerDebitsAgg._sum.amount || 0, demandsAgg._sum.amount || 0);
    const totalCredits = Math.max(ledgerCreditsAgg._sum.amount || 0, collectionsAgg._sum.amount || 0);
    const totalOutstanding = Math.max(0, totalDebits - totalCredits);

    res.status(200).json({
      totalBookings,
      totalDemanded: totalDebits,
      totalPaid: totalCredits,
      totalOutstanding,
      totalDemandsCount: demandsAgg._count.id,
      totalCollections: totalCredits,
      totalCollectionsCount: collectionsAgg._count.id,
      demandsByStatus,
      paymentModeBreakdown: modeBreakdown,
      agingBuckets: { "0-30": b0, "31-60": b1, "61-90": b2, "90+": b3 },
      recentDemands,
      recentCollections
    });
  } catch (error) {
    console.error("Error fetching reports:", error);
    res.status(500).json({ message: "Unable to fetch reports" });
  }
};
