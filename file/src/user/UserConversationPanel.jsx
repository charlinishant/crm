import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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
  if (!lead?.phones) return lead?.phone || lead?.mobile || lead?.whatsappNumber || "-";
  if (Array.isArray(lead.phones)) {
    const first = lead.phones[0];
    if (!first) return "-";
    return typeof first === "object" ? first.value || "-" : first;
  }
  if (typeof lead.phones === "object") return lead.phones.value || "-";
  return lead.phones || "-";
};

const maskPhone = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (!digits) return "-";
  return `${digits.slice(0, 4)}****`;
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

const buildWhatsAppMessage = (lead) => {
  const name = getLeadName(lead).split(" ")[0] || "there";
  const project = lead?.interestedProjects || lead?.propertyType || "our project";
  return `Hi ${name}, thank you for your interest in ${project}. Please let me know a suitable time to connect.`;
};

const UserConversationPanel = ({
  leads = [],
  user,
  loading = false,
  onOpenCallLead = null,
  onOpenWhatsAppLead = null,
  onScheduleVisitLead = null,
}) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("calls");

  const records = useMemo(() => {
    const owner =
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      user?.email ||
      "Sales User";

    return leads.map((lead) => ({
      rawId: lead.id || lead._id || lead.lead_id || "",
      id: lead.id ? `#${lead.id}` : "-",
      lead,
      name: getLeadName(lead),
      phone: getLeadPhone(lead),
      email: getLeadEmail(lead),
      owner,
      project: lead.interestedProjects || lead.propertyType || "-",
      status: lead.status || "Fresh Lead",
      date: formatDate(lead.conductSiteDate || lead.createdAt),
      visitStatus: lead.siteVisitStatus || lead.visitStatus || (lead.conductSiteVisit || lead.conductSiteDate ? "Scheduled" : "Pending"),
      visitLocation: lead.siteVisitLocation || lead.meetingPoint || lead.locationPreferences || "-",
      visitExecutive: lead.siteVisitExecutive || lead.team || owner,
      message:
        lead.requirementComment ||
        lead.locationPreferences ||
        `Follow up about ${lead.interestedProjects || lead.propertyType || "property requirement"}.`,
      whatsappMessage: buildWhatsAppMessage(lead),
    }));
  }, [leads, user]);

  const rowsByTab = {
    calls: records,
    emails: records.filter((record) => record.email !== "-"),
    sms: records.filter((record) => record.phone !== "-"),
    siteVisits: records,
    whatsapp: records.filter((record) => record.phone !== "-"),
  };

  const visibleRows = rowsByTab[activeTab] || [];

  const renderStatus = (status) => (
    <mark className={`sales-conversation-status ${String(status).toLowerCase().replace(/\s+/g, "-")}`}>
      {status}
    </mark>
  );

  const openCallLead = (lead) => {
    if (!lead) return;

    if (typeof onOpenCallLead === "function") {
      onOpenCallLead(lead);
      return;
    }

    const leadId = lead.id || lead._id || lead.lead_id || "";
    navigate(`/user/sales/calls${leadId ? `?leadId=${leadId}` : ""}`);
  };

  const openWhatsAppLead = (lead) => {
    if (!lead) return;

    if (typeof onOpenWhatsAppLead === "function") {
      onOpenWhatsAppLead(lead);
      return;
    }

    const leadId = lead.id || lead._id || lead.lead_id || "";
    navigate(`/user/sales/whatsapp${leadId ? `?leadId=${leadId}` : ""}`, { state: { lead } });
  };

  const openScheduleVisit = (lead) => {
    if (!lead) return;

    if (typeof onScheduleVisitLead === "function") {
      onScheduleVisitLead(lead);
    }
  };

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
                  {isEmail
                    ? record.email
                    : activeTab === "siteVisits"
                      ? record.project
                      : isWhatsapp
                        ? maskPhone(record.phone)
                        : record.phone}
                </strong>
                {!isWhatsapp && (
                  <small>
                    {activeTab === "siteVisits"
                      ? `${record.visitLocation} - ${record.visitExecutive}`
                      : record.message}
                  </small>
                )}
              </span>
              <span>{renderStatus(status)}</span>
              <span>{record.owner}</span>
              <span>{record.date}</span>
              <span className="sales-conversation-actions">
                {isEmail && record.email !== "-" ? (
                  <a href={`mailto:${record.email}`}>Email</a>
                ) : isWhatsapp && record.phone !== "-" ? (
                  <>
                    <button
                      type="button"
                      title={`Connect WhatsApp for ${record.name}`}
                      onClick={() => openWhatsAppLead(record.lead)}
                    >
                      Connect
                    </button>
                    
                  </>
                ) : isCall && record.phone !== "-" ? (
                  <button type="button" onClick={() => openCallLead(record.lead)}>
                    Call
                  </button>
                ) : activeTab === "siteVisits" ? (
                  <button type="button" onClick={() => openScheduleVisit(record.lead)}>
                    {record.visitStatus === "Pending" ? "Schedule Visit" : "Update Visit"}
                  </button>
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
