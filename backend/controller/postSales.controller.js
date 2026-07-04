const prisma = require("../lib/prisma");

// ─── Document types catalogue ────────────────────────────────────────────────
const docTypes = [
  "WELCOME_LETTER",
  "ALLOTMENT_LETTER",
  "AGREEMENT",
  "PARKING_LETTER",
  "DEMAND_LETTER",
  "RECEIPT",
  "POSSESSION_LETTER",
  "NOC",
  "CANCELLATION_LETTER"
];

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
  .brand-name {
    font-size: 26px;
    font-weight: 800;
    color: #1d4ed8;
    letter-spacing: -0.5px;
  }
  .brand-name span { color: #0ea5e9; }
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
      <div class="brand-name">Insite<span>Arc</span></div>
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
        <strong>${sigName}</strong><br>${dept}<br>Insite Arc
      </div>
    </div>
  </div>
  <div class="footer-note">
    This is a computer-generated document. For queries contact your Relationship Manager.<br>
    Insite Arc CRM · Premium Post-Sales Housing Solutions
  </div>
`;

// ─── Document Templates ───────────────────────────────────────────────────────
const documentTemplates = {

  WELCOME_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}</style></head><body>
${headerHTML("WEL-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Welcome Letter</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">Congratulations on your decision to invest in your dream home with <strong>Insite Arc</strong>! We are delighted to welcome you to our growing community of home-owners at <strong>{{projectName}}</strong>.</p>
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
<p class="body-text">Thank you for choosing Insite Arc as your trusted partner in building your future.</p>
<p class="body-text">With warm regards,</p>
${signatureHTML("Post-Sales Head", "Post-Sales Department")}
</body></html>`,

  ALLOTMENT_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}</style></head><body>
${headerHTML("ALT-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Allotment Letter</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">Further to your booking dated <strong>{{bookingDate}}</strong> and receipt of the initial booking amount, we are pleased to formally allot you the residential apartment unit described below, subject to the standard terms and conditions of sale and the RERA regulations applicable to this project.</p>
<table class="data-table">
  <tr><td class="label">Allotment Reference</td><td colspan="3"><strong>ALT-BKG-{{bookingId}}</strong></td></tr>
  <tr><td class="label">Allottee Name</td><td>{{customerName}}</td><td class="label">PAN Number</td><td>{{customerPAN}}</td></tr>
  <tr><td class="label">Project Name</td><td>{{projectName}}</td><td class="label">RERA Number</td><td>{{reraNumber}}</td></tr>
  <tr><td class="label">Tower / Block</td><td>{{towerName}}</td><td class="label">Floor</td><td>{{floorNo}}</td></tr>
  <tr><td class="label">Unit Number</td><td><strong>{{unitNo}}</strong></td><td class="label">Unit Type</td><td>{{unitType}}</td></tr>
  <tr><td class="label">Carpet Area</td><td>{{carpetArea}}</td><td class="label">Saleable Area</td><td>{{saleableArea}}</td></tr>
  <tr><td class="label">Base Rate (per sq.ft)</td><td>{{baseRate}}</td><td class="label">Base Price</td><td>{{basePrice}}</td></tr>
</table>
<p class="body-text">This allotment is subject to timely payment of all future installments as per the agreed Payment Plan schedule. Any default or delay in payment may result in interest charges or cancellation of allotment as per RERA regulations.</p>
<div class="notice-box">⚠️ Note: This allotment letter does not confer ownership. Ownership shall vest only upon execution of the registered Agreement for Sale and fulfillment of all payment obligations.</div>
<p class="body-text">We look forward to a long and enduring relationship with you.</p>
${signatureHTML("Sales Operations Head", "Allotment & Documentation")}
</body></html>`,

  AGREEMENT: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}</style></head><body>
${headerHTML("ATS-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Agreement for Sale — Summary Sheet</div>
<p class="body-text">This document summarises the fundamental terms agreed upon for execution of the formal Agreement for Sale (ATS) between the parties described below:</p>
<table class="data-table">
  <tr><td class="label">Promoter / Developer</td><td colspan="3">Insite Arc Developers Pvt. Ltd.</td></tr>
  <tr><td class="label">Allottee (Buyer)</td><td>{{customerName}}</td><td class="label">Contact</td><td>{{customerPhone}}</td></tr>
  <tr><td class="label">PAN Number</td><td>{{customerPAN}}</td><td class="label">Aadhaar (Masked)</td><td>{{customerAadhaar}}</td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td><td class="label">Unit</td><td>{{unitNo}} — {{towerName}}</td></tr>
  <tr><td class="label">Saleable Area</td><td>{{saleableArea}}</td><td class="label">Carpet Area</td><td>{{carpetArea}}</td></tr>
  <tr><td class="label">Agreement Value</td><td><strong>{{basePrice}}</strong></td><td class="label">Booking Date</td><td>{{bookingDate}}</td></tr>
</table>
<p class="body-text"><strong>1. Subject Matter of Sale:</strong> The Promoter agrees to sell and the Allottee agrees to purchase the residential apartment as described above, complete with the floor plans as agreed at the time of booking.</p>
<p class="body-text"><strong>2. Consideration:</strong> The total sale consideration is <strong>{{basePrice}}</strong> exclusive of registration charges, stamp duty, GST (if applicable under current construction stage), local municipal taxes, and RERA filing charges, all of which shall be borne solely by the Allottee.</p>
<p class="body-text"><strong>3. Payment Schedule:</strong> The Allottee agrees to pay the consideration in accordance with the Construction-Linked Payment Plan / Time-Linked Plan as mutually agreed and attached herewith.</p>
<p class="body-text"><strong>4. Possession Timeline:</strong> The Developer commits to deliver possession as per the RERA-approved timeline for this project, subject to force majeure and applicable grace periods.</p>
<p class="body-text"><strong>5. TDS Obligation:</strong> As the agreement value is ₹50 Lakh or more, the Allottee is obligated to deduct TDS @1% u/s 194-IA on the principal component of each installment and deposit via Form 26QB. Form 16B to be provided to the Developer within 15 days of deposit.</p>
<div class="notice-box">⚠️ This is a summary sheet for reference. The legally binding Agreement for Sale must be executed on stamp paper of appropriate value and registered before the Sub-Registrar of Assurances.</div>
${signatureHTML("Legal & Documentation Head", "Contracts & Compliance")}
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
  Account Name: Insite Arc Developers Pvt. Ltd.<br>
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

  POSSESSION_LETTER: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}.possession-banner { background: linear-gradient(135deg,#eff6ff,#dbeafe); border: 1px solid #bfdbfe; border-radius: 10px; padding: 20px 24px; margin-bottom: 24px; text-align: center; } .possession-banner h2 { color: #1d4ed8; font-size: 22px; margin-bottom: 6px; } .possession-banner p { color: #3b82f6; font-size: 13px; }</style></head><body>
${headerHTML("POS-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">Possession Offer Letter</div>
<div class="possession-banner">
  <h2>🎉 Your Home is Ready!</h2>
  <p>Occupancy Certificate received · Unit construction complete · Possession offered</p>
</div>
<p class="salutation">Dear <strong>{{customerName}}</strong>,</p>
<p class="body-text">We are delighted to inform you that construction of your residential unit at <strong>{{projectName}}</strong> has been completed. The Occupancy Certificate (OC) has been received from the competent local authority and we are now pleased to offer you formal possession of your unit.</p>
<table class="data-table">
  <tr><td class="label">Allottee Name</td><td>{{customerName}}</td></tr>
  <tr><td class="label">Unit</td><td><strong>{{unitNo}}</strong> — {{towerName}}, Floor {{floorNo}}</td></tr>
  <tr><td class="label">Project</td><td>{{projectName}}</td></tr>
  <tr><td class="label">Saleable Area</td><td>{{saleableArea}}</td></tr>
  <tr><td class="label">Possession Offer Date</td><td>{{bookingDate}}</td></tr>
  <tr><td class="label">Outstanding Balance</td><td style="color:#15803d;font-weight:700">NIL — All dues cleared ✓</td></tr>
</table>
<p class="body-text">To take physical handover of your unit, please visit our site office with the following documents:</p>
<ul style="margin:10px 0 16px 20px;color:#374151;">
  <li>Original photo ID (Aadhaar / PAN)</li>
  <li>Copy of Registered Agreement for Sale</li>
  <li>All original payment receipts</li>
  <li>Form 16B (TDS certificate, if applicable)</li>
</ul>
<p class="body-text">Our post-sales team will conduct a unit walkthrough, complete the snag list inspection, hand over the keys, and assist you with society membership.</p>
${signatureHTML("Post-Sales Head", "Possession & Handover Team")}
</body></html>`,

  NOC: `<!doctype html><html><head><meta charset="utf-8"><style>${LETTERHEAD_CSS}.noc-stamp { text-align:center; font-size:28px; font-weight:800; color:#1d4ed8; letter-spacing:4px; border:3px double #1d4ed8; display:inline-block; padding:10px 30px; margin:20px 0; border-radius:4px; }</style></head><body>
${headerHTML("NOC-BKG-{{bookingId}}", "{{bookingDate}}")}
<div class="doc-title">No Objection Certificate (NOC)</div>
<div style="text-align:center"><div class="noc-stamp">NO OBJECTION CERTIFICATE</div></div>
<p class="body-text">This is to certify that <strong>Insite Arc Developers Pvt. Ltd.</strong> has <strong>NO OBJECTION</strong> to:</p>
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
${signatureHTML("Director — Finance & Accounts", "Insite Arc Developers Pvt. Ltd.")}
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

// ─── Data Resolver ────────────────────────────────────────────────────────────
const buildRichContext = (booking, type) => {
  const lead = booking.lead || {};
  const unit = booking.unit || {};
  const project = unit.project || {};
  const tower = unit.tower || {};

  // Customer details from booking or lead
  const customerName =
    booking.customerName ||
    (lead.firstName && lead.lastName ? `${lead.firstName} ${lead.lastName}` : null) ||
    lead.firstName ||
    "Customer";

  const customerPhone = (() => {
    const p = lead.phones;
    if (!p) return "-";
    if (Array.isArray(p)) return p[0] || "-";
    try { const arr = JSON.parse(p); return Array.isArray(arr) ? arr[0] || "-" : String(p); }
    catch { return String(p); }
  })();

  const customerEmail = (() => {
    const e = lead.emails;
    if (!e) return "-";
    if (Array.isArray(e)) return e[0] || "-";
    try { const arr = JSON.parse(e); return Array.isArray(arr) ? arr[0] || "-" : String(e); }
    catch { return String(e); }
  })();

  const customerPAN = lead.panNumber || lead.pan || "—";
  const customerAadhaar = lead.aadhaarNumber ? `****${String(lead.aadhaarNumber).slice(-4)}` : "—";

  // Unit details
  const unitNo = unit.unitNo || unit.name || unit.flatNo || (booking.unitId ? `Unit #${booking.unitId}` : "N/A");
  const towerName = tower.name || unit.towerName || "—";
  const floorNo = unit.floor || unit.floorNo || "—";
  const unitType = unit.type || unit.unitType || unit.configuration || "—";
  const carpetArea = unit.carpetArea ? `${unit.carpetArea} Sq.Ft.` : (unit.carpet ? `${unit.carpet} Sq.Ft.` : "—");
  const saleableArea = booking.saleableArea
    ? `${booking.saleableArea} Sq.Ft.`
    : unit.saleableArea
    ? `${unit.saleableArea} Sq.Ft.`
    : "—";

  // Project details
  const projectName = project.name || booking.projectDetails || "—";
  const reraNumber = project.reraProjectId ? `RERA/${project.reraProjectId}` : "—";

  // Financial
  const baseRate = booking.baseRate ? `₹${Number(booking.baseRate).toLocaleString("en-IN")} / Sq.Ft.` : "—";
  const basePrice = booking.basePrice
    ? `₹${Number(booking.basePrice).toLocaleString("en-IN")}`
    : "₹0";

  // Dates
  const bookingDate = booking.bookedOn
    ? new Date(booking.bookedOn).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" })
    : new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });
  const issueDate = new Date().toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" });

  // Misc
  const bookedBy = booking.bookedBy || "—";
  const source = booking.source || "—";
  const rmContact = customerPhone;

  return {
    bookingId: booking.id,
    customerName,
    customerPhone,
    customerEmail,
    customerPAN,
    customerAadhaar,
    unitNo,
    towerName,
    floorNo,
    unitType,
    carpetArea,
    saleableArea,
    projectName,
    reraNumber,
    baseRate,
    basePrice,
    bookingDate,
    issueDate,
    bookedBy,
    source,
    rmContact,
    // Demand-specific defaults
    demandNo: "001",
    milestoneLabel: "Booking / Agreement Milestone",
    milestonePercent: "10",
    principalAmount: "As per payment plan",
    gstAmount: "@5% on principal",
    otherCharges: "NIL",
    interestAmount: "NIL",
    priorOutstanding: "NIL",
    totalPayable: basePrice,
    amountInWords: "As per invoice",
    dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toLocaleDateString("en-IN", { day: "2-digit", month: "long", year: "numeric" }),
    // Receipt defaults
    receiptNo: "001",
    receiptDate: issueDate,
    demandReference: `DEM-${booking.id}`,
    paymentMode: "NEFT / RTGS",
    instrumentRef: "—",
    amountReceived: basePrice,
    gstComponent: "—",
    tdsDeducted: "—",
    runningBalance: "₹0 (All dues cleared)",
    // Cancellation defaults
    cancellationDate: issueDate,
    refundAmount: "To be calculated",
    documentType: String(type).replace(/_/g, " ")
  };
};

const mergeTemplate = (template, context) => {
  return String(template || "").replace(/\{\{(\w+)\}\}/g, (_, key) => {
    const value = context?.[key];
    return value === undefined || value === null ? "" : String(value);
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

    const outstandingAgg = await prisma.demand.aggregate({
      where: { status: { not: "PAID" } },
      _sum: { outstandingAmount: true }
    });
    const outstandingAmount = outstandingAgg._sum.outstandingAmount || 0;

    const collectionsAgg = await prisma.receipt.aggregate({
      where: { status: "POSTED" },
      _sum: { amount: true }
    });
    const collectionsReceived = collectionsAgg._sum.amount || 0;

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
    res.status(200).json(booking);
  } catch (error) {
    console.error("Error fetching booking details:", error);
    res.status(500).json({ message: "Unable to load booking details" });
  }
};

// 4. Generate Document
exports.generateDocument = async (req, res) => {
  try {
    const bookingId = Number(req.params.id);
    const { type } = req.body;

    if (!docTypes.includes(type)) {
      return res.status(400).json({ message: `Invalid document type. Allowed: ${docTypes.join(", ")}` });
    }

    const booking = await prisma.booking.findUnique({
      where: { id: bookingId },
      include: {
        lead: true,
        unit: { include: { project: true, tower: true } }
      }
    });

    if (!booking) return res.status(404).json({ message: "Booking not found" });

    const template = documentTemplates[type];
    const context = buildRichContext(booking, type);
    const html = mergeTemplate(template, context);
    const docTitle = `${String(type).replace(/_/g, " ")} — ${context.customerName}`;
    const pdfUrl = `/documents/${booking.id}/${type.toLowerCase()}.html`;

    const document = await prisma.generatedDocument.create({
      data: { bookingId: booking.id, type, title: docTitle, htmlContent: html, pdfUrl }
    });

    await prisma.documentAuditLog.create({
      data: {
        bookingId: booking.id,
        type,
        action: "GENERATE",
        details: `Document "${docTitle}" generated successfully.`,
        performedBy: req.authUser?.email || "Admin"
      }
    });

    res.status(201).json({ message: "Document generated successfully", document });
  } catch (error) {
    console.error("Error generating document:", error);
    res.status(500).json({ message: "Unable to generate document" });
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

    const [totalBookings, demandsAgg, collectionsAgg, demandsByStatus, modeBreakdown, recentDemands, recentCollections, b0, b1, b2, b3] = await Promise.all([
      prisma.booking.count({ where: { stage: { in: POST_SALES_STAGES } } }),
      prisma.demand.aggregate({ _sum: { amount: true, paidAmount: true, outstandingAmount: true }, _count: { id: true } }),
      prisma.receipt.aggregate({ _sum: { amount: true }, _count: { id: true } }),
      prisma.demand.groupBy({ by: ["status"], _count: { id: true }, _sum: { amount: true, outstandingAmount: true } }),
      prisma.receipt.groupBy({ by: ["mode"], _count: { id: true }, _sum: { amount: true } }),
      prisma.demand.findMany({ take: 5, orderBy: { createdAt: "desc" }, include: { booking: { select: { id: true, customerName: true, lead: { select: { firstName: true, lastName: true } } } } } }),
      prisma.receipt.findMany({ take: 5, orderBy: { receivedAt: "desc" }, include: { booking: { select: { id: true, customerName: true, lead: { select: { firstName: true, lastName: true } } } } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { gte: d30 } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { gte: d60, lt: d30 } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { gte: d90, lt: d60 } } }),
      prisma.demand.count({ where: { status: { not: "PAID" }, dueDate: { lt: d90 } } })
    ]);

    res.status(200).json({
      totalBookings,
      totalDemanded: demandsAgg._sum.amount || 0,
      totalPaid: demandsAgg._sum.paidAmount || 0,
      totalOutstanding: demandsAgg._sum.outstandingAmount || 0,
      totalDemandsCount: demandsAgg._count.id,
      totalCollections: collectionsAgg._sum.amount || 0,
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
