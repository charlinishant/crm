import React, { useMemo } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaBell,
  FaCheckCircle,
  FaCloudDownloadAlt,
  FaCode,
  FaFileAlt,
  FaHistory,
  FaMoneyBillWave,
  FaPaperPlane,
  FaReceipt,
  FaSearch,
  FaUserCheck,
} from "react-icons/fa";
import MasterLayout from "../../masterLayout/MasterLayout";

const formatMoney = (value) => {
  if (value === undefined || value === null || value === "") return "Rs. 0";
  return `Rs. ${Number(value).toLocaleString("en-IN")}`;
};

const formatDate = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return value || "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const postSalesSteps = [
  {
    title: "Welcome & Allotment",
    text: "Generate welcome letter, allotment letter and booking PDF from one booking record.",
    icon: FaFileAlt,
    status: "Ready",
  },
  {
    title: "Agreement Pack",
    text: "Prepare agreement checklist, KYC verification and customer document tracking.",
    icon: FaUserCheck,
    status: "Next",
  },
  {
    title: "Demand Engine",
    text: "Preset based demand letters with GST, TDS and milestone calculations.",
    icon: FaMoneyBillWave,
    status: "Setup",
  },
  {
    title: "Collections",
    text: "Match receipts against demands, part payments and outstanding balances.",
    icon: FaReceipt,
    status: "Pending",
  },
  {
    title: "Reminders",
    text: "Track sent, delivered and viewed communication for customer follow-ups.",
    icon: FaBell,
    status: "Pending",
  },
];

const documentTemplates = [
  {
    name: "Welcome Letter",
    trigger: "Booking confirmed",
    fields: "customer, unit, project, booking no./date, RM contact",
    status: "Ready",
  },
  {
    name: "Allotment Letter",
    trigger: "Allotment approved",
    fields: "unit, area, agreement value, payment plan summary",
    status: "Ready",
  },
  {
    name: "Demand Letter",
    trigger: "Milestone due",
    fields: "installment, principal, GST, interest, due date, bank details",
    status: "Preset",
  },
  {
    name: "Payment Receipt",
    trigger: "Payment recorded",
    fields: "amount, mode, date, GST split, TDS, running balance",
    status: "Preset",
  },
  {
    name: "Possession Letter",
    trigger: "OC received + dues NIL",
    fields: "possession date, no-dues confirmation, handover checklist",
    status: "Locked",
  },
];

const mergeTokens = [
  "{{customer.name}}",
  "{{unit.flat_no}}",
  "{{unit.carpet}}",
  "{{costsheet.agreement_value}}",
  "{{demand.amount}}",
  "{{demand.amount_in_words}}",
  "{{demand.due_date}}",
  "{{project.rera_no}}",
];

const documentEngineSteps = [
  {
    title: "Select Template",
    text: "Choose the active versioned template with letterhead and HTML body.",
    icon: FaSearch,
  },
  {
    title: "Merge Booking Data",
    text: "Resolve customer, unit, cost sheet, project and demand tokens from one booking record.",
    icon: FaCode,
  },
  {
    title: "Render PDF",
    text: "Create the customer document on firm letterhead for download and print.",
    icon: FaCloudDownloadAlt,
  },
  {
    title: "Track Delivery",
    text: "Store sent, delivered, viewed and acknowledgement status for audit.",
    icon: FaPaperPlane,
  },
];

export const PostSalesContent = ({
  booking = {},
  lead = {},
  onViewBookings,
  embedded = false,
}) => {

  const customerName = booking.customerName || lead.name || lead.customer_name || "Customer";
  const projectName = booking.projectDetails || lead.projectName || lead.interestedProjects || "Project";
  const bookingId = booking.id || booking.bookingId || "New";
  const unit = booking.unit || "-";
  const agreementValue = booking.basePrice || booking.totalPrice || booking.agreementValue || 0;
  const bookedOn = booking.bookedOn || booking.createdAt;

  const summaryCards = useMemo(
    () => [
      { label: "Booking ID", value: bookingId },
      { label: "Customer", value: customerName },
      { label: "Unit", value: unit },
      { label: "Agreement Value", value: formatMoney(agreementValue) },
    ],
    [agreementValue, bookingId, customerName, unit]
  );

  return (
    <>
        <style>{`
          .post-sales-page {
            min-height: 100vh;
            background: #f8fafc;
            padding: 24px 16px 40px;
          }

          .post-sales-page.embedded {
            min-height: auto;
            padding: 0;
          }

          .post-sales-shell {
            width: min(100%, 1180px);
            margin: 0 auto;
          }

          .post-sales-hero {
            background: #487fff;
            border-radius: 8px;
            color: #ffffff;
            display: grid;
            grid-template-columns: minmax(0, 1fr) auto;
            gap: 24px;
            padding: 28px;
            box-shadow: 0 16px 32px rgba(72, 127, 255, 0.22);
          }

          .post-sales-kicker {
            align-items: center;
            background: rgba(255, 255, 255, 0.16);
            border: 1px solid rgba(255, 255, 255, 0.24);
            border-radius: 6px;
            display: inline-flex;
            gap: 8px;
            font-size: 13px;
            font-weight: 700;
            margin-bottom: 14px;
            padding: 6px 10px;
          }

          .post-sales-hero h1 {
            color: #ffffff;
            font-size: 28px;
            font-weight: 800;
            line-height: 1.2;
            margin: 0 0 8px;
          }

          .post-sales-hero p {
            color: rgba(255, 255, 255, 0.86);
            font-size: 15px;
            line-height: 1.6;
            margin: 0;
            max-width: 720px;
          }

          .post-sales-actions {
            align-items: flex-end;
            display: flex;
            flex-direction: column;
            gap: 10px;
            justify-content: center;
          }

          .post-sales-actions button {
            align-items: center;
            border: 0;
            border-radius: 6px;
            display: inline-flex;
            font-size: 14px;
            font-weight: 700;
            gap: 8px;
            min-height: 42px;
            padding: 10px 16px;
            white-space: nowrap;
          }

          .post-sales-primary {
            background: #ffffff;
            color: #2563eb;
          }

          .post-sales-secondary {
            background: rgba(255, 255, 255, 0.14);
            color: #ffffff;
          }

          .post-sales-summary {
            display: grid;
            gap: 14px;
            grid-template-columns: repeat(4, minmax(0, 1fr));
            margin: 18px 0;
          }

          .post-sales-card,
          .post-sales-panel {
            background: #ffffff;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            box-shadow: 0 8px 20px rgba(15, 23, 42, 0.04);
          }

          .post-sales-card {
            padding: 18px;
          }

          .post-sales-card span,
          .post-sales-booking-label {
            color: #64748b;
            display: block;
            font-size: 12px;
            font-weight: 700;
            letter-spacing: 0.02em;
            margin-bottom: 8px;
            text-transform: uppercase;
          }

          .post-sales-card strong,
          .post-sales-booking-value {
            color: #0f172a;
            display: block;
            font-size: 17px;
            font-weight: 800;
            line-height: 1.3;
            overflow-wrap: anywhere;
          }

          .post-sales-main {
            display: grid;
            gap: 18px;
            grid-template-columns: minmax(0, 1.3fr) minmax(300px, 0.7fr);
          }

          .post-sales-document-grid {
            display: grid;
            gap: 18px;
            grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
            margin-top: 18px;
          }

          .post-sales-panel {
            overflow: hidden;
          }

          .post-sales-panel-head {
            align-items: center;
            border-bottom: 1px solid #e2e8f0;
            display: flex;
            justify-content: space-between;
            gap: 16px;
            padding: 18px 20px;
          }

          .post-sales-panel-head h2 {
            color: #0f172a;
            font-size: 18px;
            font-weight: 800;
            margin: 0;
          }

          .post-sales-panel-head span {
            color: #487fff;
            font-size: 13px;
            font-weight: 800;
          }

          .post-sales-steps {
            display: grid;
            gap: 0;
          }

          .post-sales-step {
            align-items: flex-start;
            border-bottom: 1px solid #eef2f7;
            display: grid;
            gap: 14px;
            grid-template-columns: 44px minmax(0, 1fr) auto;
            padding: 18px 20px;
          }

          .post-sales-step:last-child {
            border-bottom: 0;
          }

          .post-sales-step-icon {
            align-items: center;
            background: #eef4ff;
            border-radius: 8px;
            color: #487fff;
            display: flex;
            height: 44px;
            justify-content: center;
            width: 44px;
          }

          .post-sales-step h3 {
            color: #0f172a;
            font-size: 15px;
            font-weight: 800;
            margin: 0 0 5px;
          }

          .post-sales-step p {
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
          }

          .post-sales-status {
            background: #f8fafc;
            border: 1px solid #dbeafe;
            border-radius: 999px;
            color: #2563eb;
            font-size: 12px;
            font-weight: 800;
            padding: 6px 10px;
            white-space: nowrap;
          }

          .post-sales-booking {
            display: grid;
            gap: 16px;
            padding: 20px;
          }

          .post-sales-booking-row {
            border-bottom: 1px solid #eef2f7;
            padding-bottom: 14px;
          }

          .post-sales-booking-row:last-child {
            border-bottom: 0;
            padding-bottom: 0;
          }

          .post-sales-note {
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            color: #475569;
            font-size: 13px;
            line-height: 1.55;
            margin: 0 20px 20px;
            padding: 14px;
          }

          .post-sales-engine {
            display: grid;
            gap: 12px;
            padding: 18px 20px;
          }

          .post-sales-engine-step {
            align-items: flex-start;
            background: #f8fafc;
            border: 1px solid #e2e8f0;
            border-radius: 8px;
            display: grid;
            gap: 12px;
            grid-template-columns: 38px minmax(0, 1fr);
            padding: 14px;
          }

          .post-sales-engine-icon {
            align-items: center;
            background: #eef4ff;
            border-radius: 8px;
            color: #487fff;
            display: flex;
            height: 38px;
            justify-content: center;
            width: 38px;
          }

          .post-sales-engine-step h3 {
            color: #0f172a;
            font-size: 14px;
            font-weight: 800;
            margin: 0 0 4px;
          }

          .post-sales-engine-step p {
            color: #64748b;
            font-size: 13px;
            line-height: 1.5;
            margin: 0;
          }

          .post-sales-token-wrap {
            display: flex;
            flex-wrap: wrap;
            gap: 8px;
            padding: 18px 20px 0;
          }

          .post-sales-token {
            background: #eef4ff;
            border: 1px solid #dbeafe;
            border-radius: 999px;
            color: #2563eb;
            font-family: monospace;
            font-size: 12px;
            font-weight: 700;
            padding: 7px 10px;
          }

          .post-sales-template-table {
            overflow-x: auto;
            padding: 0 20px 20px;
          }

          .post-sales-template-table table {
            border-collapse: collapse;
            min-width: 720px;
            width: 100%;
          }

          .post-sales-template-table th {
            background: #487fff;
            color: #ffffff;
            font-size: 12px;
            font-weight: 800;
            padding: 12px;
            text-align: left;
          }

          .post-sales-template-table td {
            border-bottom: 1px solid #e2e8f0;
            color: #334155;
            font-size: 13px;
            padding: 13px 12px;
            vertical-align: top;
          }

          .post-sales-template-table td strong {
            color: #0f172a;
            font-weight: 800;
          }

          .post-sales-template-status {
            background: #eff6ff;
            border-radius: 999px;
            color: #2563eb;
            display: inline-flex;
            font-size: 12px;
            font-weight: 800;
            padding: 5px 9px;
          }

          .post-sales-output-actions {
            display: grid;
            gap: 10px;
            grid-template-columns: repeat(3, minmax(0, 1fr));
            padding: 18px 20px;
          }

          .post-sales-output-actions button {
            align-items: center;
            background: #ffffff;
            border: 1px solid #cbd5e1;
            border-radius: 8px;
            color: #334155;
            display: flex;
            font-size: 13px;
            font-weight: 800;
            gap: 8px;
            justify-content: center;
            min-height: 42px;
            padding: 10px;
          }

          .post-sales-output-actions button:first-child {
            background: #487fff;
            border-color: #487fff;
            color: #ffffff;
          }

          @media (max-width: 991px) {
            .post-sales-hero,
            .post-sales-main,
            .post-sales-document-grid {
              grid-template-columns: 1fr;
            }

            .post-sales-actions {
              align-items: flex-start;
            }

            .post-sales-summary {
              grid-template-columns: repeat(2, minmax(0, 1fr));
            }
          }

          @media (max-width: 575px) {
            .post-sales-page {
              padding: 16px 10px 28px;
            }

            .post-sales-hero {
              padding: 20px;
            }

            .post-sales-hero h1 {
              font-size: 23px;
            }

            .post-sales-summary,
            .post-sales-step,
            .post-sales-engine-step,
            .post-sales-output-actions {
              grid-template-columns: 1fr;
            }

            .post-sales-status {
              justify-self: flex-start;
            }
          }
        `}</style>

        <div className={`post-sales-page ${embedded ? "embedded" : ""}`}>
          <div className="post-sales-shell">
            <section className="post-sales-hero">
              <div>
                <div className="post-sales-kicker">
                  <FaCheckCircle />
                  Booking Confirmed
                </div>
                <h1>Post-Sales Workspace</h1>
                <p>
                  Continue from booking confirmation into document generation, demand setup,
                  collections and customer communication tracking.
                </p>
              </div>
              <div className="post-sales-actions">
                <button className="post-sales-primary" type="button">
                  <FaFileAlt /> Generate Booking PDF
                </button>
                <button className="post-sales-secondary" type="button" onClick={onViewBookings}>
                  View All Bookings
                </button>
              </div>
            </section>

            <section className="post-sales-summary">
              {summaryCards.map((card) => (
                <div className="post-sales-card" key={card.label}>
                  <span>{card.label}</span>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </section>

            <section className="post-sales-main">
              <div className="post-sales-panel">
                <div className="post-sales-panel-head">
                  <h2>Post-Booking Flow</h2>
                  <span>Step by step</span>
                </div>
                <div className="post-sales-steps">
                  {postSalesSteps.map((step) => {
                    const StepIcon = step.icon;
                    return (
                      <div className="post-sales-step" key={step.title}>
                        <div className="post-sales-step-icon">
                          <StepIcon />
                        </div>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.text}</p>
                        </div>
                        <span className="post-sales-status">{step.status}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <aside className="post-sales-panel">
                <div className="post-sales-panel-head">
                  <h2>Booking Details</h2>
                  <span>{formatDate(bookedOn)}</span>
                </div>
                <div className="post-sales-booking">
                  <div className="post-sales-booking-row">
                    <span className="post-sales-booking-label">Project</span>
                    <strong className="post-sales-booking-value">{projectName}</strong>
                  </div>
                  <div className="post-sales-booking-row">
                    <span className="post-sales-booking-label">Stage</span>
                    <strong className="post-sales-booking-value">{booking.stage || "Booked"}</strong>
                  </div>
                  <div className="post-sales-booking-row">
                    <span className="post-sales-booking-label">Booked By</span>
                    <strong className="post-sales-booking-value">{booking.bookedBy || "-"}</strong>
                  </div>
                  <div className="post-sales-booking-row">
                    <span className="post-sales-booking-label">Base Rate</span>
                    <strong className="post-sales-booking-value">{formatMoney(booking.baseRate)}</strong>
                  </div>
                </div>
                <p className="post-sales-note">
                  This page is ready for the document engine, demand presets and ledger APIs
                  from the post-sales specification.
                </p>
              </aside>
            </section>

            <section className="post-sales-document-grid">
              <div className="post-sales-panel">
                <div className="post-sales-panel-head">
                  <h2>Document Generation Engine</h2>
                  <span>Template + booking data</span>
                </div>
                <div className="post-sales-engine">
                  {documentEngineSteps.map((step) => {
                    const StepIcon = step.icon;
                    return (
                      <div className="post-sales-engine-step" key={step.title}>
                        <div className="post-sales-engine-icon">
                          <StepIcon />
                        </div>
                        <div>
                          <h3>{step.title}</h3>
                          <p>{step.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="post-sales-output-actions">
                  <button type="button">
                    <FaCloudDownloadAlt /> Download PDF
                  </button>
                  <button type="button" onClick={() => window.print()}>
                    <FaFileAlt /> Print
                  </button>
                  <button type="button">
                    <FaPaperPlane /> Send Later
                  </button>
                </div>
              </div>

              <div className="post-sales-panel">
                <div className="post-sales-panel-head">
                  <h2>Merge Token Library</h2>
                  <span>Searchable variables</span>
                </div>
                <div className="post-sales-token-wrap">
                  {mergeTokens.map((token) => (
                    <span className="post-sales-token" key={token}>{token}</span>
                  ))}
                </div>
                <p className="post-sales-note">
                  Admin templates can use these variables in the letter body and keep old
                  generated documents tied to the template version that issued them.
                </p>
              </div>
            </section>

            <section className="post-sales-panel" style={{ marginTop: 18 }}>
              <div className="post-sales-panel-head">
                <h2>Document Catalogue</h2>
                <span><FaHistory /> Versioned templates</span>
              </div>
              <div className="post-sales-template-table">
                <table>
                  <thead>
                    <tr>
                      <th>Document</th>
                      <th>Trigger</th>
                      <th>Key Merge Fields</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {documentTemplates.map((template) => (
                      <tr key={template.name}>
                        <td><strong>{template.name}</strong></td>
                        <td>{template.trigger}</td>
                        <td>{template.fields}</td>
                        <td><span className="post-sales-template-status">{template.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        </div>
    </>
  );
};

const PostSalesPage = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <MasterLayout>
      <PostSalesContent
        booking={location.state?.booking || {}}
        lead={location.state?.lead || {}}
        onViewBookings={() => navigate("/bookings")}
      />
    </MasterLayout>
  );
};

export default PostSalesPage;
