import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  CheckCheck,
  CircleAlert,
  CircleHelp,
  Filter,
  Headphones,
  MessageCircle,
  RefreshCw,
  Search,
  Send,
  Smartphone,
  X,
} from "lucide-react";
import "./SalesUserPanel.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const adminRoles = new Set(["ADMIN", "SUPER_ADMIN", "MANAGER", "SVP"]);

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "000000";

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  lead?.name ||
  "Lead";

const getLeadPhone = (lead) => {
  if (!lead?.phones) return lead?.phone || lead?.mobile || lead?.whatsappNumber || "";
  if (Array.isArray(lead.phones)) {
    const first = lead.phones.find((phone) => phone?.value || phone) || "";
    return typeof first === "object" ? first.value || "" : first;
  }
  if (typeof lead.phones === "object") return lead.phones.value || "";
  return lead.phones || "";
};

const getOwnerName = (lead, user) =>
  [lead?.team?.firstName, lead?.team?.lastName].filter(Boolean).join(" ") ||
  lead?.team?.username ||
  lead?.owner ||
  lead?.sales ||
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  "Sales User";

const cleanPhone = (phone) => String(phone || "").replace(/\D/g, "");

const maskPhone = (phone) => {
  const value = cleanPhone(phone);
  if (value.length <= 4) return phone || "-";
  return `+${value.slice(0, 2)} ${value.slice(2, 5)}***${value.slice(-2)}`;
};

// WhatsApp UI change: lightweight initials for CRM-styled chat avatars.
const getInitials = (name) =>
  String(name || "Lead")
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "L";

const formatDateTime = (value) => {
  const date = value ? new Date(value) : new Date();
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const buildMessage = (lead) => {
  const firstName = getLeadName(lead).split(" ")[0] || "there";
  const project = lead?.interestedProjects || lead?.propertyType || "our project";
  return `Hi ${firstName},\n\nThank you for your interest in ${project}. I tried reaching you, please let me know your suitable time to connect!`;
};

// UI-only helper: display existing message history when the API/lead payload already provides it.
const getWhatsAppHistory = (lead) => {
  const possibleMessages = lead?.whatsappMessages || lead?.messages || lead?.conversation?.messages || [];
  if (!Array.isArray(possibleMessages)) return [];

  return possibleMessages
    .map((message, index) => ({
      id: message?.id || `${lead?.id || lead?._id || "lead"}-${index}`,
      author: message?.author || message?.sender || message?.from || "WhatsApp",
      body: message?.body || message?.message || message?.text || "",
      createdAt: message?.createdAt || message?.sentAt || message?.date,
      direction: message?.direction || message?.type || "outgoing",
      status: message?.status || "",
    }))
    .filter((message) => String(message.body || "").trim());
};

const UserWhatsAppPage = ({
  leads: providedLeads = null,
  user: providedUser = null,
  loading: providedLoading = false,
  embedded = false,
}) => {
  const savedUser = useMemo(() => JSON.parse(localStorage.getItem("authUser") || "null"), []);
  const activeUser = useMemo(() => providedUser || savedUser || {}, [providedUser, savedUser]);
  const isAdminAccess = adminRoles.has(String(activeUser?.role || "").toUpperCase());
  const shouldFetchLeads = !Array.isArray(providedLeads);

  const [leads, setLeads] = useState(Array.isArray(providedLeads) ? providedLeads : []);
  const [loading, setLoading] = useState(shouldFetchLeads);
  const [error, setError] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedLeadId, setSelectedLeadId] = useState(
    new URLSearchParams(window.location.search).get("leadId") || ""
  );
  const [drafts, setDrafts] = useState({});
  const [sendStatus, setSendStatus] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (Array.isArray(providedLeads)) {
      const leadFromNavigation = window.history.state?.usr?.lead;
      const leadIdFromUrl = new URLSearchParams(window.location.search).get("leadId") || "";
      const hasSelectedLead = providedLeads.some((lead) => String(getLeadId(lead)) === String(leadIdFromUrl));
      setLeads(leadFromNavigation && leadIdFromUrl && !hasSelectedLead ? [leadFromNavigation, ...providedLeads] : providedLeads);
      setLoading(providedLoading);
    }
  }, [providedLeads, providedLoading]);

  const loadLeads = useCallback(async () => {
    if (!shouldFetchLeads) return;

    setLoading(true);
    setError("");

    try {
      const userQuery = !isAdminAccess && activeUser?.id ? `?userId=${activeUser.id}` : "";
      const response = await fetch(`${API_URL}/leads/${userQuery}`);
      const result = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(result?.message || "Unable to load WhatsApp conversations");
      }

      const nextLeads = Array.isArray(result) ? result : result?.data || [];
      const leadFromNavigation = window.history.state?.usr?.lead;
      const leadIdFromUrl = new URLSearchParams(window.location.search).get("leadId") || "";
      const hasSelectedLead = nextLeads.some((lead) => String(getLeadId(lead)) === String(leadIdFromUrl));
      setLeads(leadFromNavigation && leadIdFromUrl && !hasSelectedLead ? [leadFromNavigation, ...nextLeads] : nextLeads);
    } catch (err) {
      setError(err.message || "Unable to load WhatsApp conversations");
    } finally {
      setLoading(false);
    }
  }, [activeUser?.id, isAdminAccess, shouldFetchLeads]);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  const conversations = useMemo(() => {
    return leads
      .filter((lead) => cleanPhone(getLeadPhone(lead)))
      .map((lead) => {
        const id = String(getLeadId(lead));
        return {
          id,
          lead,
          name: getLeadName(lead),
          phone: getLeadPhone(lead),
          owner: getOwnerName(lead, activeUser),
          message: drafts[id] ?? buildMessage(lead),
          // UI-only: preserve any existing history from the current lead object.
          history: getWhatsAppHistory(lead),
          date: lead?.updatedAt || lead?.createdAt || lead?.conductSiteDate,
          status: lead?.whatsappStatus || lead?.status || "Ready",
        };
      })
      .filter((item) => {
        const query = searchTerm.trim().toLowerCase();
        const matchesSearch =
          !query ||
          `${item.id} ${item.name} ${item.phone} ${item.owner}`.toLowerCase().includes(query);
        const hasIssue = String(item.status).toLowerCase().includes("fail") || String(item.status).toLowerCase().includes("error");
        const matchesFilter =
          statusFilter === "all" ||
          (statusFilter === "ready" && !hasIssue) ||
          (statusFilter === "issues" && hasIssue);

        return matchesSearch && matchesFilter;
      });
  }, [activeUser, drafts, leads, searchTerm, statusFilter]);

  useEffect(() => {
    const leadIdFromUrl = new URLSearchParams(window.location.search).get("leadId") || "";
    if (leadIdFromUrl && conversations.some((item) => item.id === leadIdFromUrl)) {
      setSelectedLeadId(leadIdFromUrl);
      return;
    }

    if (!conversations.length) {
      setSelectedLeadId("");
      return;
    }

    if (!conversations.some((item) => item.id === selectedLeadId)) {
      setSelectedLeadId(conversations[0].id);
    }
  }, [conversations, selectedLeadId]);

  const selectedConversation = conversations.find((item) => item.id === selectedLeadId) || conversations[0] || null;
  const currentDraft = selectedConversation ? drafts[selectedConversation.id] ?? selectedConversation.message : "";
  const visibleMessages = selectedConversation?.history?.length
    ? selectedConversation.history
    : selectedConversation
      ? [{
          id: `${selectedConversation.id}-draft-preview`,
          author: selectedConversation.owner,
          body: currentDraft,
          createdAt: selectedConversation.date,
          direction: "outgoing",
        }]
      : [];
  const issueCount = conversations.filter((item) => {
    const status = String(item.status).toLowerCase();
    return status.includes("fail") || status.includes("error");
  }).length;

  const updateDraft = (value) => {
    if (!selectedConversation) return;
    setDrafts((current) => ({ ...current, [selectedConversation.id]: value }));
  };

  const sendWhatsAppMessage = async () => {
    if (!selectedConversation || !currentDraft.trim()) return;

    setSending(true);
    setSendStatus("");

    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/whatsapp/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          leadId: selectedConversation.id,
          phone: cleanPhone(selectedConversation.phone),
          message: currentDraft,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Unable to send WhatsApp message");
      }

      setSendStatus("Message sent through WhatsApp API.");
      setLeads((current) =>
        current.map((lead) =>
          String(getLeadId(lead)) === String(selectedConversation.id)
            ? { ...lead, whatsappStatus: "Sent", updatedAt: new Date().toISOString() }
            : lead
        )
      );
    } catch (err) {
      setSendStatus(err.message || "Unable to send WhatsApp message");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className={`user-whatsapp-page ${embedded ? "embedded" : ""}`}>
      <div className="user-whatsapp-topbar">
        <div className="user-whatsapp-search">
          <Search size={17} />
          <input
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Search..."
          />
        </div>
        <div className="user-whatsapp-support">
          <a href="tel:+918069150607">+918069150607</a>
          <button type="button">Click for More Help!</button>
          <span className="available-dot" />
          <strong>Available</strong>
          <CircleHelp size={18} />
          <Headphones size={18} />
          <span className="notification-badge">9</span>
        </div>
      </div>

      <div className="user-whatsapp-header">
        <h1>All Conversations</h1>
        <div className="user-whatsapp-tools">
          <button type="button" className="icon-only" onClick={loadLeads} aria-label="Refresh conversations">
            <RefreshCw size={16} />
          </button>
          <div className="lead-search">
            <Search size={15} />
            <input
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by Lead ID/Name/Phone/"
            />
          </div>
          <button type="button" className="icon-only" aria-label="Filter conversations">
            <Filter size={16} />
          </button>
          <button type="button" className="purple-action">
            Broadcast <CircleHelp size={13} />
          </button>
          <button type="button" className="purple-action">
            New Conversation
          </button>
        </div>
      </div>

      {error && <div className="user-whatsapp-error">{error}</div>}

      <div className="user-whatsapp-shell">
        <aside className="user-whatsapp-list">
          <div className="conversation-filter-row">
            <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
              <option value="all">All Conversations</option>
              <option value="ready">Ready</option>
              <option value="issues">Needs attention</option>
            </select>
            {issueCount > 0 && <span>{issueCount}</span>}
          </div>

          <div className="conversation-scroll">
            {loading && <div className="conversation-empty">Loading conversations...</div>}
            {!loading && conversations.length === 0 && <div className="conversation-empty">No WhatsApp conversations found.</div>}

            {conversations.map((item) => {
              const hasIssue = String(item.status).toLowerCase().includes("fail") || String(item.status).toLowerCase().includes("error");

              return (
                <button
                  type="button"
                  key={item.id}
                  className={`conversation-item ${selectedConversation?.id === item.id ? "active" : ""}`}
                  onClick={() => setSelectedLeadId(item.id)}
                >
                  {/* WhatsApp UI change: larger conversation card with avatar and message preview. */}
                  <span className="conversation-item-main">
                    <span className="conversation-avatar">{getInitials(item.name)}</span>
                    <span className="conversation-copy">
                      <span className="conversation-item-title">
                        <strong>{item.name} (#{item.id})</strong>
                        {hasIssue ? <CircleAlert size={18} className="issue" /> : <CheckCheck size={16} className="read" />}
                      </span>
                      <span className="conversation-phone">{maskPhone(item.phone)}</span>
                    </span>
                  </span>
                  <span className="conversation-preview">{item.message}</span>
                  <time>{formatDateTime(item.date)}</time>
                </button>
              );
            })}
          </div>
        </aside>

        <section className="user-whatsapp-chat">
          {selectedConversation ? (
            <>
              <div className="chat-head">
                {/* WhatsApp UI change: CRM-blue WhatsApp-like chat header identity block. */}
                <div className="chat-head-profile">
                  <span className="conversation-avatar large">{getInitials(selectedConversation.name)}</span>
                  <div>
                    <h2>{selectedConversation.name} (#{selectedConversation.id})</h2>
                    <p>{selectedConversation.owner} - {maskPhone(selectedConversation.phone)}</p>
                  </div>
                </div>
                <div className="chat-head-actions">
                  <button type="button" className="connect">
                    API Connected
                  </button>
                  <button type="button" aria-label="Close conversation">
                    <X size={18} />
                  </button>
                </div>
              </div>

              <div className="chat-body">
                <div className="chat-watermark">
                  <Smartphone size={46} />
                  <MessageCircle size={34} />
                </div>
                <div className="chat-message-stack">
                  {/* WhatsApp UI change: existing history renders as a scrollable bubble stack when present. */}
                  {visibleMessages.map((message) => (
                    <article
                      className={`message-bubble ${String(message.direction).toLowerCase().includes("in") ? "incoming" : "outgoing"}`}
                      key={message.id}
                    >
                      <span>{message.author}</span>
                      <p>{message.body}</p>
                      <time>{formatDateTime(message.createdAt)} <CheckCheck size={14} /></time>
                    </article>
                  ))}
                </div>
              </div>

              {sendStatus && <div className="chat-send-status">{sendStatus}</div>}

              <div className="chat-compose">
                <label className="chat-message-field">
                  <span>
                    To: {selectedConversation.name} - {maskPhone(selectedConversation.phone)}
                  </span>
                  <textarea
                    value={currentDraft}
                    onChange={(event) => updateDraft(event.target.value)}
                    placeholder={`Type text message for ${selectedConversation.name}`}
                    aria-label={`Message to ${selectedConversation.name}`}
                  />
                </label>
                <button
                  type="button"
                  className="send"
                  disabled={sending || !currentDraft.trim()}
                  onClick={sendWhatsAppMessage}
                >
                  <Send size={16} />
                  {sending ? "Sending" : "Send message"}
                </button>
              </div>
            </>
          ) : (
            <div className="chat-empty">
              <MessageCircle size={36} />
              <span>Select a WhatsApp conversation</span>
            </div>
          )}
        </section>
      </div>
    </section>
  );
};

export default UserWhatsAppPage;
