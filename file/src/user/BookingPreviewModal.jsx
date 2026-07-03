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

const BookingPreviewModal = ({ booking, lead, onClose }) => {
  if (!booking) return null;

  const customerName = booking.customerName || getLeadName(lead) || "Customer";
  const customerPhone = booking.phone || getLeadPhone(lead) || "-";
  const details = [
    ["Booking ID", booking.id || booking.bookingId || "-"],
    ["Customer", customerName],
    ["Phone", customerPhone],
    ["Project", booking.projectDetails || booking.projectName || lead?.interestedProjects || "-"],
    ["Tower", booking.towerName || booking.tower || "-"],
    ["Unit", booking.unit || booking.unitName || "-"],
    ["Status", booking.stage || booking.status || "Booked"],
    ["Booked On", formatDate(booking.bookedOn || booking.createdAt)],
    ["Booked By", booking.bookedBy || "-"],
    ["Base Rate", formatMoney(booking.baseRate)],
    ["Final Price", formatMoney(booking.basePrice || booking.totalPrice || booking.agreementValue)],
    ["Source", booking.source || lead?.source || "-"],
  ];

  const getDocumentHtml = () => `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking Preview</title>
  <style>
    body { color: #172033; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    p { color: #64748b; margin: 0 0 24px; }
    table { border-collapse: collapse; width: 100%; }
    td { border: 1px solid #d7dde7; padding: 10px 12px; }
    td:first-child { background: #f4f7fb; color: #526070; font-weight: 700; width: 34%; }
  </style>
</head>
<body>
  <h1>Booking Preview</h1>
  <p>Read-only completed booking document</p>
  <table>${details.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}</table>
</body>
</html>`;

  const getPdfBlob = () => {
    const lines = ["Booking Preview", "Read-only completed booking document", "", ...details.map(([label, value]) => `${label}: ${value}`)];
    const content = [
      "BT",
      "/F1 18 Tf",
      "50 790 Td",
      `(${escapePdfText(lines[0])}) Tj`,
      "/F1 11 Tf",
      ...lines.slice(1).flatMap((line, index) => [`0 -${index === 0 ? 26 : 18} Td`, `(${escapePdfText(line)}) Tj`]),
      "ET",
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
    link.download = `booking-${booking.id || booking.unit || Date.now()}.pdf`;
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
