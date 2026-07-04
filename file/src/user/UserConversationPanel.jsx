import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  CalendarDays,
  CheckCircle,
  Loader2,
  Mail,
  MessageSquare,
  MoreVertical,
  Phone,
  Search,
  Send,
  Smartphone,
  X,
} from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const DEFAULT_SENDER_EMAIL = "morenishant7777@gmail.com";
const conversationPageSize = 10;

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
  if (lead?.email) return lead.email;
  if (lead?.primaryEmail) return lead.primaryEmail;
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
  const location = useLocation();
  const searchParams = useMemo(() => new URLSearchParams(location.search), [location.search]);
  const requestedTab = searchParams.get("tab");
  const requestedLeadId = searchParams.get("leadId");
  const [activeTab, setActiveTab] = useState(requestedTab === "emails" ? "emails" : "calls");
  const [emailLead, setEmailLead] = useState(null);
  const [emailForm, setEmailForm] = useState({
    from: DEFAULT_SENDER_EMAIL,
    to: "",
    subject: "",
    body: "",
  });
  const [emailStatus, setEmailStatus] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);
  const [senderEmailOptions, setSenderEmailOptions] = useState([]);
  const [loadingSenders, setLoadingSenders] = useState(false);
  const [conversationSearch, setConversationSearch] = useState("");
  const [conversationPage, setConversationPage] = useState(1);

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

  const rowsByTab = useMemo(
    () => ({
      calls: records,
      emails: records.filter((record) => record.email !== "-"),
      sms: records.filter((record) => record.phone !== "-"),
      siteVisits: records,
      whatsapp: records.filter((record) => record.phone !== "-"),
    }),
    [records]
  );

  const visibleRows = useMemo(() => rowsByTab[activeTab] || [], [activeTab, rowsByTab]);
  const searchedRows = useMemo(() => {
    const query = conversationSearch.trim().toLowerCase();
    if (!query) return visibleRows;

    return visibleRows.filter((record) =>
      [
        record.id,
        record.name,
        record.phone,
        record.email,
        record.owner,
        record.project,
        record.status,
        record.date,
        record.visitStatus,
        record.visitLocation,
        record.visitExecutive,
        record.message,
        record.whatsappMessage,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [conversationSearch, visibleRows]);
  const conversationTotalPages = Math.max(1, Math.ceil(searchedRows.length / conversationPageSize));
  const paginatedRows = searchedRows.slice(
    (conversationPage - 1) * conversationPageSize,
    conversationPage * conversationPageSize
  );

  React.useEffect(() => {
    if (requestedTab && conversationTabs.some((tab) => tab.key === requestedTab)) {
      setActiveTab(requestedTab);
    }
  }, [requestedTab]);

  React.useEffect(() => {
    setConversationPage(1);
  }, [activeTab, conversationSearch]);

  React.useEffect(() => {
    setConversationPage((currentPage) => Math.min(currentPage, conversationTotalPages));
  }, [conversationTotalPages]);

  React.useEffect(() => {
    let isMounted = true;

    const loadSenders = async () => {
      setLoadingSenders(true);
      try {
        const response = await fetch(`${API_URL}/api/email/senders`);
        const result = await response.json().catch(() => ({}));
        const senders = Array.isArray(result?.data) ? result.data : [];
        if (isMounted) {
          const senderList = senders.length ? senders : [DEFAULT_SENDER_EMAIL];
          setSenderEmailOptions(senderList);
          setEmailForm((current) => ({
            ...current,
            from: senderList.includes(current.from) ? current.from : senderList[0],
          }));
        }
      } catch (error) {
        if (isMounted) {
          setSenderEmailOptions([]);
        }
      } finally {
        if (isMounted) setLoadingSenders(false);
      }
    };

    loadSenders();

    return () => {
      isMounted = false;
    };
  }, []);

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

  const openEmailComposer = (record) => {
    const firstName = record.name.split(" ")[0] || "there";
    setEmailLead(record);
    setEmailStatus("");
    setEmailForm({
      from: senderEmailOptions[0] || DEFAULT_SENDER_EMAIL,
      to: record.email === "-" ? "" : record.email,
      subject: `Regarding ${record.project || "your enquiry"}`,
      body: `Hi ${firstName},\n\nThank you for your interest in ${record.project || "our project"}.\n\nPlease let me know a suitable time to connect.\n\nRegards,\n${record.owner}`,
    });
  };

  const closeEmailComposer = () => {
    if (sendingEmail) return;
    setEmailLead(null);
    setEmailStatus("");
  };

  const updateEmailField = (field, value) => {
    setEmailForm((current) => ({ ...current, [field]: value }));
  };

  const sendLeadEmail = async () => {
    if (!emailLead || sendingEmail) return;

    setEmailStatus("");
    if (!emailForm.from.trim() || !emailForm.to.trim() || !emailForm.subject.trim() || !emailForm.body.trim()) {
      setEmailStatus("Please fill sender, receiver, subject and body.");
      return;
    }

    setSendingEmail(true);
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/email/send`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          leadId: emailLead.rawId,
          from: emailForm.from.trim(),
          to: emailForm.to.trim(),
          subject: emailForm.subject.trim(),
          body: emailForm.body.trim(),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to send email");

      if (token && emailLead.rawId) {
        fetch(`${API_URL}/lead-activities`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            leadId: Number(emailLead.rawId),
            type: "Email Sent",
            title: "Email Sent",
            description: emailForm.subject.trim(),
            message: `Email sent to ${emailForm.to.trim()}: ${emailForm.subject.trim()}`,
          }),
        }).catch(() => null);
      }

      setEmailStatus("Email sent successfully.");
    } catch (error) {
      setEmailStatus(error.message || "Unable to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  React.useEffect(() => {
    if (requestedTab !== "emails" || !requestedLeadId || emailLead) return;

    const record = records.find((item) => String(item.rawId) === String(requestedLeadId));
    if (record && record.email !== "-") {
      openEmailComposer(record);
    }
  }, [emailLead, records, requestedLeadId, requestedTab]);

  return (
    <section className="sales-card sales-conversation-card">
      <style>{`
        .sales-email-composer {
          background: #f8fafc;
          border: 1px solid #dbe3ef;
          border-radius: 8px;
          display: grid;
          gap: 12px;
          margin: 14px 0;
          padding: 14px;
        }

        .sales-email-composer-head {
          align-items: center;
          display: flex;
          justify-content: space-between;
          gap: 12px;
        }

        .sales-email-composer-head h3 {
          color: #0f172a;
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }

        .sales-email-composer-head p {
          color: #64748b;
          font-size: 13px;
          margin: 4px 0 0;
        }

        .sales-email-close {
          align-items: center;
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          color: #334155;
          display: inline-flex;
          height: 34px;
          justify-content: center;
          width: 34px;
        }

        .sales-email-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .sales-email-field {
          display: grid;
          gap: 6px;
        }

        .sales-email-field.full {
          grid-column: 1 / -1;
        }

        .sales-email-field label {
          color: #475569;
          font-size: 12px;
          font-weight: 700;
          text-transform: uppercase;
        }

        .sales-email-field input,
        .sales-email-field select,
        .sales-email-field textarea {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          color: #0f172a;
          font-size: 14px;
          min-height: 40px;
          padding: 9px 10px;
          width: 100%;
        }

        .sales-email-field textarea {
          min-height: 140px;
          resize: vertical;
        }

        .sales-email-actions {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          justify-content: space-between;
        }

        .sales-email-send {
          align-items: center;
          background: #487fff;
          border: 1px solid #487fff;
          border-radius: 6px;
          color: #ffffff;
          display: inline-flex;
          font-size: 14px;
          font-weight: 700;
          gap: 8px;
          min-height: 38px;
          padding: 0 14px;
        }

        .sales-email-send:disabled {
          cursor: not-allowed;
          opacity: 0.65;
        }

        .sales-email-spinner {
          animation: sales-email-spin 0.8s linear infinite;
        }

        @keyframes sales-email-spin {
          from {
            transform: rotate(0deg);
          }

          to {
            transform: rotate(360deg);
          }
        }

        .sales-email-status {
          align-items: center;
          color: #475569;
          display: inline-flex;
          font-size: 13px;
          gap: 6px;
        }

        @media (max-width: 768px) {
          .sales-email-grid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
      <div className="sales-card-head">
        <div>
          <h2>Conversation</h2>
          <p>Calls, emails, SMS, site visits and WhatsApp for assigned leads</p>
        </div>
        <label className="sales-table-search sales-conversation-search">
          <Search size={15} />
          <input
            type="search"
            value={conversationSearch}
            onChange={(event) => setConversationSearch(event.target.value)}
            placeholder="Search lead from table..."
            aria-label="Search lead from conversation table"
          />
        </label>
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

      {activeTab === "emails" && emailLead && (
        <div className="sales-email-composer">
          <div className="sales-email-composer-head">
            <div>
              <h6>Email {emailLead.name}</h6>
              <p>{emailLead.id} | {emailLead.project}</p>
            </div>
            <button
              className="sales-email-close"
              disabled={sendingEmail}
              type="button"
              onClick={closeEmailComposer}
              title="Close email composer"
            >
              <X size={17} />
            </button>
          </div>

          <div className="sales-email-grid">
            <label className="sales-email-field">
              <span>Sender Email</span>
              <select
                disabled={loadingSenders || senderEmailOptions.length === 0}
                value={emailForm.from}
                onChange={(event) => updateEmailField("from", event.target.value)}
              >
                <option value="">
                  {loadingSenders
                    ? "Loading sender email..."
                    : senderEmailOptions.length === 0
                      ? "No sender email configured"
                      : "Select sender email"}
                </option>
                {senderEmailOptions.map((email) => (
                  <option key={email} value={email}>
                    {email}
                  </option>
                ))}
              </select>
            </label>
            <label className="sales-email-field">
              <span>Receiver Email</span>
              <input
                type="email"
                value={emailForm.to}
                onChange={(event) => updateEmailField("to", event.target.value)}
                placeholder="receiver@example.com"
              />
            </label>
            <label className="sales-email-field full">
              <span>Subject</span>
              <input
                value={emailForm.subject}
                onChange={(event) => updateEmailField("subject", event.target.value)}
                placeholder="Email subject"
              />
            </label>
            <label className="sales-email-field full">
              <span>Body Message</span>
              <textarea
                value={emailForm.body}
                onChange={(event) => updateEmailField("body", event.target.value)}
                placeholder="Write your message"
              />
            </label>
          </div>

          <div className="sales-email-actions">
            <span className="sales-email-status">
              {emailStatus === "Email sent successfully." && <CheckCircle size={15} />}
              {emailStatus}
            </span>
            <button
              className="sales-email-send"
              disabled={sendingEmail}
              type="button"
              onClick={sendLeadEmail}
            >
              {sendingEmail ? <Loader2 className="sales-email-spinner" size={16} /> : <Send size={16} />}
              {sendingEmail ? "Sending..." : "Send Email"}
            </button>
          </div>
        </div>
      )}

      <div className="sales-conversation-table">
        <div className="sales-conversation-head">
          <span>Lead</span>
          <span>Channel detail</span>
          <span>Status</span>
          <span>Owner</span>
          <span>Date</span>
          <span>Action</span>
        </div>

        {paginatedRows.length === 0 && (
          <div className="sales-empty">
            {loading
              ? "Loading conversations..."
              : conversationSearch.trim()
                ? "No conversation records match your search."
                : "No conversation records found for this tab."}
          </div>
        )}

        {paginatedRows.map((record, index) => {
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
                  <button type="button" onClick={() => openEmailComposer(record)}>Email</button>
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
      {searchedRows.length > 0 && (
        <div className="sales-table-pagination">
          <span>
            Showing {(conversationPage - 1) * conversationPageSize + 1}-
            {Math.min(conversationPage * conversationPageSize, searchedRows.length)} of {searchedRows.length}
          </span>
          <div>
            <button
              type="button"
              disabled={conversationPage === 1}
              onClick={() => setConversationPage((current) => Math.max(1, current - 1))}
            >
              Previous
            </button>
            <button
              type="button"
              disabled={conversationPage >= conversationTotalPages}
              onClick={() => setConversationPage((current) => Math.min(conversationTotalPages, current + 1))}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
};

export default UserConversationPanel;
