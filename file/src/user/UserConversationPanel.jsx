import React, { useMemo, useState } from "react";
import {
  CalendarDays,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Smartphone,
} from "lucide-react";

const conversationTabs = [
  { key: "calls", label: "Calls", icon: Phone },
  { key: "emails", label: "Emails", icon: Mail },
  { key: "sms", label: "SMS", icon: MessageSquare },
  { key: "siteVisits", label: "Site visits", icon: CalendarDays },
  { key: "whatsapp", label: "WhatsApp", icon: Smartphone },
];

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  `Lead #${lead?.id || "-"}`;

const getLeadPhone = (lead) => {
  if (!lead?.phones) return "-";
  if (Array.isArray(lead.phones)) {
    const first = lead.phones[0];
    if (!first) return "-";
    return typeof first === "object" ? first.value || "-" : first;
  }
  if (typeof lead.phones === "object") return lead.phones.value || "-";
  return lead.phones || "-";
};

const getLeadEmail = (lead) => {
  if (!lead?.emails) return "-";
  if (Array.isArray(lead.emails)) {
    const first = lead.emails[0];
    if (!first) return "-";
    return typeof first === "object" ? first.value || "-" : first;
  }
  if (typeof lead.emails === "object") return lead.emails.value || "-";
  return lead.emails || "-";
};

const formatDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const getActionPhone = (lead) => getLeadPhone(lead).replace(/[^\d+]/g, "");

const UserConversationPanel = ({ leads = [], user, loading = false }) => {
  const [activeTab, setActiveTab] = useState("calls");

  const records = useMemo(() => {
    const owner =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      user?.email ||
      "Sales User";

    return leads.map((lead) => ({
      id: lead.id ? `#${lead.id}` : "-",
      lead,
      name: getLeadName(lead),
      phone: getLeadPhone(lead),
      email: getLeadEmail(lead),
      owner,
      project: lead.interestedProjects || lead.propertyType || "-",
      status: lead.status || "Fresh Lead",
      date: formatDate(lead.conductSiteDate || lead.createdAt),
      visitStatus: lead.conductSiteVisit || lead.conductSiteDate ? "Scheduled" : "Pending",
      message:
        lead.requirementComment ||
        lead.locationPreferences ||
        `Follow up about ${lead.interestedProjects || lead.propertyType || "property requirement"}.`,
    }));
  }, [leads, user]);

  const rowsByTab = {
    calls: records,
    emails: records.filter((record) => record.email !== "-"),
    sms: records.filter((record) => record.phone !== "-"),
    siteVisits: records.filter((record) => record.visitStatus === "Scheduled"),
    whatsapp: records.filter((record) => record.phone !== "-"),
  };

  const visibleRows = rowsByTab[activeTab] || [];

  const renderStatus = (status) => (
    <mark className={`sales-conversation-status ${String(status).toLowerCase().replace(/\s+/g, "-")}`}>
      {status}
    </mark>
  );

  return (
    <section className="sales-card sales-conversation-card">
      <div className="sales-card-head">
        <div>
          <h2>Conversation</h2>
          <p>Calls, emails, SMS, site visits and WhatsApp for assigned leads</p>
        </div>
      </div>

      <div className="sales-conversation-tabs">
        {conversationTabs.map((tab) => {
          const Icon = tab.icon;
          const count = rowsByTab[tab.key]?.length || 0;

          return (
            <button
              key={tab.key}
              type="button"
              className={activeTab === tab.key ? "active" : ""}
              onClick={() => setActiveTab(tab.key)}
            >
              <Icon size={15} />
              <span>{tab.label}</span>
              <strong>{loading ? "..." : count}</strong>
            </button>
          );
        })}
      </div>

      <div className="sales-conversation-table">
        <div className="sales-conversation-head">
          <span>Lead</span>
          <span>Channel detail</span>
          <span>Status</span>
          <span>Owner</span>
          <span>Date</span>
          <span>Action</span>
        </div>

        {visibleRows.length === 0 && (
          <div className="sales-empty">
            {loading ? "Loading conversations..." : "No conversation records found for this tab."}
          </div>
        )}

        {visibleRows.map((record, index) => {
          const isEmail = activeTab === "emails";
          const isCall = activeTab === "calls";
          const isWhatsapp = activeTab === "whatsapp";
          const status =
            activeTab === "siteVisits"
              ? record.visitStatus
              : isEmail
                ? "Ready"
                : isWhatsapp
                  ? "Available"
                  : isCall
                    ? "Callable"
                    : "Ready";

          return (
            <div className="sales-conversation-row" key={`${activeTab}-${record.id}-${index}`}>
              <span>
                <strong>{record.id}</strong>
                <small>{record.name}</small>
              </span>
              <span>
                <strong>
                  {isEmail ? record.email : activeTab === "siteVisits" ? record.project : record.phone}
                </strong>
                <small>{record.message}</small>
              </span>
              <span>{renderStatus(status)}</span>
              <span>{record.owner}</span>
              <span>{record.date}</span>
              <span className="sales-conversation-actions">
                {isEmail && record.email !== "-" ? (
                  <a href={`mailto:${record.email}`}>Email</a>
                ) : isWhatsapp && record.phone !== "-" ? (
                  <a
                    href={`https://wa.me/${getActionPhone(record.lead).replace(/^\+/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                  >
                    Open
                  </a>
                ) : isCall && record.phone !== "-" ? (
                  <a href={`tel:${getActionPhone(record.lead)}`}>Call</a>
                ) : (
                  <button type="button" aria-label="More conversation actions">
                    <MoreVertical size={15} />
                  </button>
                )}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
};

export default UserConversationPanel;
