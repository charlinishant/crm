import React from "react";
import { FaEnvelope, FaPrint, FaRegFilePdf, FaTimes, FaWhatsapp } from "react-icons/fa";
import "./BookingPreviewModal.css";

const formatMoney = (value) => {
  if (value === undefined || value === null || value === "") return "-";
  const amount = Number(value);
  if (!Number.isFinite(amount)) return String(value);
  return `Rs. ${amount.toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
};

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.name ||
  lead?.customerName ||
  lead?.companyName ||
  "";

const getLeadPhone = (lead) => {
  if (Array.isArray(lead?.phones)) {
    const firstPhone = lead.phones[0];
    return typeof firstPhone === "object" ? firstPhone?.value || "" : firstPhone || "";
  }
  return lead?.phone || lead?.mobile || lead?.phones?.value || "";
};

const escapePdfText = (value) => String(value ?? "-").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
const escapeHtml = (value) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const displayValue = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);
  if (Array.isArray(value)) return value.map((item) => displayValue(item, "")).find(Boolean) || fallback;
  if (typeof value === "object") {
    return (
      value.name ||
      value.unitName ||
      value.unitNo ||
      value.number ||
      value.label ||
      value.title ||
      value.project?.name ||
      value.description ||
      value.type ||
      value.category ||
      (value.id ? `#${value.id}` : fallback)
    );
  }
  return fallback;
};

const BookingPreviewModal = ({ booking, lead, onClose }) => {
  if (!booking) return null;

  const customerName = booking.customerName || getLeadName(lead) || "Customer";
  const customerPhone = booking.phone || getLeadPhone(lead) || "-";
  const bookingReference = booking.bookingName || booking.referenceNo || booking.bookingNo || (booking.id ? `BKG-${booking.id}` : "Booking");
  const projectName = displayValue(booking.projectDetails || booking.projectName || booking.unit?.project || lead?.interestedProjects);
  const towerName = displayValue(booking.towerName || booking.tower);
  const unitName = displayValue(booking.unit || booking.unitName);
  const bookedOn = formatDate(booking.bookedOn || booking.createdAt);
  const finalPrice = formatMoney(booking.basePrice || booking.totalPrice || booking.agreementValue);
  const details = [
    ["Booking ID", bookingReference],
    ["Customer", customerName],
    ["Phone", customerPhone],
    ["Project", projectName],
    ["Tower", towerName],
    ["Unit", unitName],
    ["Status", displayValue(booking.stage || booking.status, "Booked")],
    ["Booked On", bookedOn],
    ["Booked By", displayValue(booking.bookedBy)],
    ["Base Rate", formatMoney(booking.baseRate)],
    ["Final Price", finalPrice],
    ["Source", displayValue(booking.source || lead?.source)],
  ].map(([label, value]) => [label, displayValue(value)]);

  const getDocumentHtml = () => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking Preview</title>
  <style>
    body { color: #172033; font-family: Arial, sans-serif; margin: 0; background: #f6f8fc; }
    .page { background: #fff; margin: 24px auto; max-width: 860px; padding: 52px 56px; }
    .top { align-items: flex-start; display: flex; justify-content: space-between; gap: 24px; }
    .brand { color: #1d2a57; font-size: 34px; font-weight: 900; letter-spacing: .02em; }
    .sub { color: #64748b; font-size: 12px; letter-spacing: .12em; margin-top: 8px; text-transform: uppercase; }
    .ref { color: #0f172a; font-size: 14px; line-height: 1.7; text-align: right; }
    .ref strong { display: block; font-size: 18px; }
    .rule { background: #2458e6; height: 3px; margin: 28px 0 34px; }
    h1 { border-left: 4px solid #2458e6; color: #0f172a; font-size: 26px; margin: 0 0 24px; padding-left: 16px; text-transform: uppercase; }
    .hero { background: #dbeafe; border: 1px solid #a9c7ff; border-radius: 8px; color: #2563eb; margin-bottom: 28px; padding: 24px; text-align: center; }
    .hero strong { display: block; font-size: 28px; margin-bottom: 10px; }
    p { color: #1f2a44; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
    table { border-collapse: collapse; margin: 24px 0; width: 100%; }
    td { border: 1px solid #d7dde7; padding: 12px 14px; }
    td:first-child { background: #f4f7fb; color: #526070; font-weight: 700; width: 34%; }
    .signature { margin-top: 42px; }
    .signature strong { display: block; margin-top: 42px; }
  </style>
</head>
<body>
  <main class="page">
    <section class="top">
      <div>
        <div class="brand">SWAMI</div>
        <div class="sub">Premium Real Estate CRM · Sales Division</div>
      </div>
      <div class="ref"><strong>${escapeHtml(bookingReference)}</strong>Date: ${escapeHtml(bookedOn)}</div>
    </section>
    <div class="rule"></div>
    <h1>Booking Confirmation Letter</h1>
    <div class="hero"><strong>Your Booking is Confirmed!</strong>Unit selected · Pricing confirmed · Booking recorded</div>
    <p>Dear <strong>${escapeHtml(customerName)}</strong>,</p>
    <p>We are pleased to confirm your booking for unit <strong>${escapeHtml(unitName)}</strong> at <strong>${escapeHtml(projectName)}</strong>. This document records the booking details captured in SWAMI CRM.</p>
    <table>${details.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
    <p>Please keep this booking confirmation for your records. The project team will coordinate the next documentation and payment steps as per the agreed booking terms.</p>
    <div class="signature">
      <span>For SWAMI Real Estate CRM</span>
      <strong>Authorized Signatory</strong>
      <span>Sales Team</span>
    </div>
  </main>
</body>
</html>`;

  const getPdfBlob = () => {
    const stream = [];
    const text = (content, x, y, size = 11) => {
      stream.push("BT", `/F1 ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(content)}) Tj`, "ET");
    };
    const rect = (x, y, width, height, color = "0.96 0.98 1") => {
      stream.push(`${color} rg`, `${x} ${y} ${width} ${height} re f`, "0 0 0 rg");
    };
    rect(0, 0, 595, 842, "1 1 1");
    text("SWAMI", 58, 748, 28);
    text("PREMIUM REAL ESTATE CRM - SALES DIVISION", 58, 728, 9);
    text(bookingReference, 420, 748, 13);
    text(`Date: ${bookedOn}`, 420, 728, 10);
    rect(58, 704, 480, 3, "0.14 0.35 0.9");
    text("BOOKING CONFIRMATION LETTER", 74, 662, 20);
    rect(58, 592, 480, 58, "0.86 0.93 1");
    text("Your Booking is Confirmed!", 170, 626, 20);
    text("Unit selected - Pricing confirmed - Booking recorded", 150, 606, 10);
    [
      `Dear ${customerName},`,
      `Your booking for unit ${unitName} at ${projectName} is confirmed.`,
      "Please keep this document for your records.",
    ].forEach((line, index) => text(line, 58, 560 - index * 18, 11));
    let y = 482;
    details.forEach(([label, value], index) => {
      if (index % 2 === 0) rect(58, y - 7, 480, 22, "0.96 0.98 1");
      text(`${label}: ${value}`, 72, y, 10);
      y -= 26;
    });
    text("For SWAMI Real Estate CRM", 58, 128, 11);
    text("Authorized Signatory", 58, 86, 12);
    text("Sales Team", 58, 70, 9);
    const content = [
      "q",
      ...stream,
      "Q",
    ].join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const downloadPdf = () => {
    const url = URL.createObjectURL(getPdfBlob());
    const link = document.createElement("a");
    link.href = url;
    link.download = `booking-${booking.id || displayValue(booking.unit, "") || Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printBooking = () => {
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.write(getDocumentHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  return (
    <div className="booking-preview-backdrop" role="dialog" aria-modal="true" aria-labelledby="booking-preview-title">
      <section className="booking-preview-modal">
        <header className="booking-preview-header">
          <div>
            <h2 id="booking-preview-title">Booking Preview</h2>
            <p>Completed booking details</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close booking preview">
            <FaTimes />
          </button>
        </header>

        <div className="booking-preview-body">
          {details.map(([label, value]) => (
            <div className="booking-preview-field" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <footer className="booking-preview-actions">
          <button type="button" onClick={downloadPdf}><FaRegFilePdf /> Download Booking PDF</button>
          <button type="button" onClick={printBooking}><FaPrint /> Print Booking</button>
          <button type="button" disabled title="WhatsApp API will be connected later"><FaWhatsapp /> Send WhatsApp</button>
          <button type="button" disabled title="Email API will be connected later"><FaEnvelope /> Send Email</button>
          <button type="button" className="primary" onClick={onClose}>Close</button>
        </footer>
      </section>
    </div>
  );
};

export default BookingPreviewModal;
