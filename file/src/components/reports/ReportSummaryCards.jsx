import React from "react";

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);

const cards = [
  ["Total Leads", "totalLeads"],
  ["Assigned Leads", "assignedLeads"],
  ["Unassigned Leads", "unassignedLeads"],
  ["Qualified Leads", "qualifiedLeads"],
  ["Site Visits", "siteVisits"],
  ["Bookings", "bookings"],
  ["Unqualified Leads", "unqualifiedLeads"],
  ["Total Revenue", "totalRevenue", "money"],
];

const ReportSummaryCards = ({ summary = {} }) => (
  <div className="admin-report-summary">
    {cards.map(([label, key, type]) => (
      <div className="admin-report-summary-card" key={key}>
        <span>{label}</span>
        <strong>{type === "money" ? formatMoney(summary[key]) : Number(summary[key]) || 0}</strong>
      </div>
    ))}
  </div>
);

export default ReportSummaryCards;
