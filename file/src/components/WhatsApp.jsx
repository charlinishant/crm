import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Icon } from "@iconify/react";
import "./WhatsApp.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const adminRoles = new Set(["ADMIN", "SUPER_ADMIN", "MANAGER", "SVP"]);

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  `Lead #${lead?.id || "-"}`;

const getLeadPhone = (lead) => {
  if (!lead?.phones) return "";
  if (Array.isArray(lead.phones)) {
    const first = lead.phones.find((phone) => phone?.value || phone) || "";
    return typeof first === "object" ? first.value || "" : first;
  }
  if (typeof lead.phones === "object") return lead.phones.value || "";
  return lead.phones || "";
};

const getOwnerName = (lead, fallbackUser) =>
  [lead?.team?.firstName, lead?.team?.lastName].filter(Boolean).join(" ") ||
  lead?.team?.username ||
  lead?.owner ||
  lead?.sales ||
  [fallbackUser?.firstName, fallbackUser?.lastName].filter(Boolean).join(" ") ||
  fallbackUser?.username ||
  "Unassigned";

const cleanPhone = (value) => String(value || "").replace(/\D/g, "");

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

const buildMessage = (lead) => {
  const name = getLeadName(lead).split(" ")[0] || "there";
  const project = lead?.interestedProjects || lead?.propertyType || "our project";
  return `Hi ${name}, thank you for your interest in ${project}. Please let me know a suitable time to connect.`;
};

const openWhatsApp = (lead, message) => {
  const phone = cleanPhone(getLeadPhone(lead));
  if (!phone) return;

  const text = String(message || "").trim();
  const textQuery = text ? `?text=${encodeURIComponent(text)}` : "";
  window.open(`https://wa.me/${phone}${textQuery}`, "_blank", "noopener,noreferrer");
};

const WhatsApp = () => {
  const savedUser = useMemo(() => JSON.parse(localStorage.getItem("authUser") || "null"), []);
  const isAdminAccess = adminRoles.has(String(savedUser?.role || "").toUpperCase());
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [messageDrafts, setMessageDrafts] = useState({});

  const loadWhatsAppLeads = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const userQuery = !isAdminAccess && savedUser?.id ? `?userId=${savedUser.id}` : "";
      const response = await fetch(`${API_URL}/leads/${userQuery}`);
      const result = await response.json().catch(() => []);

      if (!response.ok) {
        throw new Error(result?.message || "Unable to load WhatsApp leads");
      }

      const nextLeads = Array.isArray(result) ? result : result?.data || [];
      setLeads(nextLeads.filter((lead) => cleanPhone(getLeadPhone(lead))));
    } catch (err) {
      setError(err.message || "Unable to load WhatsApp leads");
    } finally {
      setLoading(false);
    }
  }, [isAdminAccess, savedUser?.id]);

  useEffect(() => {
    loadWhatsAppLeads();
  }, [loadWhatsAppLeads]);

  const rows = useMemo(() => {
    return leads
      .map((lead) => {
        const leadId = lead.id || lead._id || lead.lead_id || "-";
        const message = messageDrafts[leadId] ?? buildMessage(lead);
        return {
          lead,
          leadId,
          name: getLeadName(lead),
          phone: getLeadPhone(lead),
          status: cleanPhone(getLeadPhone(lead)) ? "Ready" : "Missing phone",
          owner: getOwnerName(lead, savedUser),
          date: formatDate(lead.updatedAt || lead.createdAt || lead.conductSiteDate),
          message,
        };
      })
      .filter((row) => {
        const term = search.trim().toLowerCase();
        const matchesSearch =
          !term ||
          `${row.leadId} ${row.name} ${row.phone} ${row.owner}`.toLowerCase().includes(term);
        const matchesStatus = statusFilter === "all" || row.status.toLowerCase() === statusFilter;
        return matchesSearch && matchesStatus;
      });
  }, [leads, messageDrafts, savedUser, search, statusFilter]);

  const setDraft = (leadId, value) => {
    setMessageDrafts((current) => ({ ...current, [leadId]: value }));
  };

  return (
    <div className="whatsapp-page">
      <div className="whatsapp-toolbar">
        <div className="whatsapp-title">
          <h2>{isAdminAccess ? "All user WhatsApp leads" : "My WhatsApp leads"}</h2>
          <p>{loading ? "Loading..." : `${rows.length} leads ready to connect on WhatsApp`}</p>
        </div>

        <div className="whatsapp-controls">
          <div className="whatsapp-search">
            <Icon icon="mdi:magnify" width={18} height={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search lead, owner or phone"
            />
          </div>
          <select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
            <option value="all">All</option>
            <option value="ready">Ready</option>
          </select>
          <button type="button" className="whatsapp-refresh" onClick={loadWhatsAppLeads}>
            <Icon icon="mdi:refresh" width={16} height={16} />
            Refresh
          </button>
        </div>
      </div>

      {error && <div className="whatsapp-alert">{error}</div>}

      <div className="table-responsive">
        <table className="custom-table whatsapp-table">
          <thead>
            <tr>
              <th>LEAD ID</th>
              <th>LEAD NAME</th>
              <th>PHONE</th>
              <th>STATUS</th>
              <th>ACTIVITY OWNER</th>
              <th>ACTIVITY DATE</th>
              <th>MESSAGE</th>
              <th>ACTIONS</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan="8" className="whatsapp-empty">
                  Loading WhatsApp leads...
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan="8" className="whatsapp-empty">
                  No WhatsApp leads found.
                </td>
              </tr>
            )}
            {rows.map((row) => (
              <tr key={row.leadId}>
                <td className="text-muted">#{row.leadId}</td>
                <td className="fw-medium">{row.name}</td>
                <td>{row.phone}</td>
                <td>
                  <span className={`status-pill status-${row.status.toLowerCase().replace(/\s+/g, "-")}`}>
                    {row.status}
                  </span>
                </td>
                <td>{row.owner}</td>
                <td>{row.date}</td>
                <td className="content-cell">
                  <textarea
                    value={row.message}
                    onChange={(event) => setDraft(row.leadId, event.target.value)}
                    aria-label={`WhatsApp message for ${row.name}`}
                  />
                </td>
                <td>
                  <div className="whatsapp-actions">
                    <button type="button" onClick={() => openWhatsApp(row.lead, null)}>
                      Connect
                    </button>
                    <button type="button" className="primary" onClick={() => openWhatsApp(row.lead, row.message)}>
                      Send
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default WhatsApp;
