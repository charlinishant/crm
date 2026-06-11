import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays } from "lucide-react";
import CreateFollowupModal from "../../components/sales/CreateFollowupModal";
import FollowupFilters from "../../components/sales/FollowupFilters";
import FollowupStatusBadge from "../../components/sales/FollowupStatusBadge";
import RescheduleFollowupModal from "../../components/sales/RescheduleFollowupModal";
import {
  cancelFollowup,
  createFollowup,
  getFollowups,
  markFollowupDone,
  rescheduleFollowup,
} from "../../services/followupApi";

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

const formatDateTime = (followup) => {
  if (!followup?.followUpDate) return "-";
  const datePart = String(followup.followUpDate).slice(0, 10);
  const timePart = followup.followUpTime || "00:00";
  const date = new Date(`${datePart}T${timePart}`);
  if (Number.isNaN(date.getTime())) return `${datePart} ${timePart}`;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getFilterForFollowup = (followup) => {
  const status = followup.effectiveStatus || followup.status;
  if (status === "Done") return "completed";
  if (status === "Missed") return "missed";

  const datePart = String(followup.followUpDate || "").slice(0, 10);
  const today = new Date().toISOString().slice(0, 10);
  if (datePart === today) return "today";
  if (datePart > today) return "upcoming";
  return "missed";
};

const followupActionOptions = [
  { value: "", label: "Choose option" },
  { value: "call", label: "Call" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "email", label: "Send Email" },
  { value: "visit", label: "Schedule Visit" },
  { value: "booked", label: "Booked" },
  { value: "not-interested", label: "Not Interested" },
  { value: "done", label: "Mark Done" },
  { value: "reschedule", label: "Reschedule" },
  { value: "cancel", label: "Cancel" },
  { value: "open-lead", label: "Open Lead" },
];

const SalesFollowups = ({
  activeFilter = "today",
  leads = [],
  user,
  onOpenCallLead,
  onOpenWhatsAppLead,
  onSendEmailLead,
  onBookLead,
  onOpenLead,
  onScheduleVisitLead,
  onRefreshPanel,
}) => {
  const [filter, setFilter] = useState(activeFilter);
  const [followups, setFollowups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [rescheduleTarget, setRescheduleTarget] = useState(null);
  const [selectedActions, setSelectedActions] = useState({});

  useEffect(() => {
    setFilter(activeFilter);
  }, [activeFilter]);

  const loadFollowups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const rows = await getFollowups("all");
      setFollowups(Array.isArray(rows) ? rows : []);
    } catch (err) {
      setError(err.message || "Unable to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFollowups();
  }, [loadFollowups]);

  const counts = useMemo(() => {
    const nextCounts = { today: 0, upcoming: 0, missed: 0, completed: 0, all: followups.length };
    followups.forEach((followup) => {
      const bucket = getFilterForFollowup(followup);
      nextCounts[bucket] = (nextCounts[bucket] || 0) + 1;
    });
    return nextCounts;
  }, [followups]);

  const visibleFollowups = useMemo(() => {
    if (filter === "all") return followups;
    return followups.filter((followup) => getFilterForFollowup(followup) === filter);
  }, [filter, followups]);

  const handleCreate = async (payload) => {
    await createFollowup(payload);
    await loadFollowups();
    if (onRefreshPanel) onRefreshPanel();
  };

  const handleMarkDone = async (followup, payload = {}) => {
    await markFollowupDone(followup.id, payload);
    await loadFollowups();
    if (onRefreshPanel) onRefreshPanel();
  };

  const updateLeadStatus = async (followup, status, extraPayload = {}) => {
    const leadId = getLeadId(followup.lead);
    if (!leadId) return;

    const response = await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/leads/${leadId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, ...extraPayload }),
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.message || "Unable to update lead status");
  };

  const handleNotInterested = async (followup) => {
    const reason = window.prompt("Reason for not interested", "Not Interested");
    if (!reason) return;

    try {
      await updateLeadStatus(followup, "Unqualified", {
        unqualifiedReason: "Not Interested",
        unqualifiedNote: reason,
      });
      await handleMarkDone(followup, {
        nextAction: "Unqualified",
        reason,
        note: reason,
      });
    } catch (err) {
      setError(err.message || "Unable to mark lead as not interested");
    }
  };

  const handleBooked = async (followup) => {
    try {
      await updateLeadStatus(followup, "Booked");
      await handleMarkDone(followup, {
        nextAction: "Booked",
        note: "Follow-up completed. Booking selected.",
      });
      onBookLead?.(followup.lead);
    } catch (err) {
      setError(err.message || "Unable to mark lead as booked");
    }
  };

  const handleCancel = async (followup) => {
    const note = window.prompt("Cancellation note", "");
    await cancelFollowup(followup.id, { note });
    await loadFollowups();
    if (onRefreshPanel) onRefreshPanel();
  };

  const handleReschedule = async (payload) => {
    await rescheduleFollowup(rescheduleTarget.id, payload);
    await loadFollowups();
    if (onRefreshPanel) onRefreshPanel();
  };

  const isFollowupClosed = (followup) =>
    followup.status === "Done" ||
    followup.status === "Cancelled" ||
    followup.effectiveStatus === "Done" ||
    followup.effectiveStatus === "Cancelled";

  const isActionDisabled = (followup, action) => {
    const closed = isFollowupClosed(followup);
    const done = followup.status === "Done" || followup.effectiveStatus === "Done";

    if (["booked", "not-interested", "done", "cancel"].includes(action)) return closed;
    if (action === "reschedule") return done;
    return false;
  };

  const handleActionChange = (followupId, action) => {
    setSelectedActions((current) => ({ ...current, [followupId]: action }));
  };

  const clearSelectedAction = (followupId) => {
    setSelectedActions((current) => ({ ...current, [followupId]: "" }));
  };

  const handleProceed = async (followup) => {
    const action = selectedActions[followup.id] || "";
    if (!action || isActionDisabled(followup, action)) return;

    try {
      if (action === "call") onOpenCallLead?.(followup.lead);
      if (action === "whatsapp") onOpenWhatsAppLead?.(followup.lead);
      if (action === "email") onSendEmailLead?.(followup.lead);
      if (action === "visit") onScheduleVisitLead?.(followup.lead);
      if (action === "booked") await handleBooked(followup);
      if (action === "not-interested") await handleNotInterested(followup);
      if (action === "done") await handleMarkDone(followup);
      if (action === "reschedule") setRescheduleTarget(followup);
      if (action === "cancel") await handleCancel(followup);
      if (action === "open-lead") onOpenLead?.(followup.lead);
      clearSelectedAction(followup.id);
    } catch (err) {
      setError(err.message || "Unable to complete selected action");
    }
  };

  return (
    <section className="sales-card sales-followups-card">
      <div className="sales-card-head">
        <div>
          <h2>Follow-ups</h2>
          <p>Today, upcoming, missed and completed customer actions</p>
        </div>
        <button type="button" className="sales-card-primary-btn" onClick={() => setShowCreate(true)}>
          <CalendarDays size={15} /> Create Follow-up
        </button>
      </div>

      <FollowupFilters activeFilter={filter} counts={counts} onChange={setFilter} />

      {error && <div className="sales-visit-message error">{error}</div>}
      {loading ? (
        <div className="sales-empty">Loading follow-ups...</div>
      ) : visibleFollowups.length === 0 ? (
        <div className="sales-empty">No follow-ups found for this filter.</div>
      ) : (
        <div className="followup-table">
          <div className="followup-table-head">
            <span>Lead</span>
            <span>Type</span>
            <span>Date & Time</span>
            <span>Priority</span>
            <span>Status</span>
            <span>Lead Status</span>
            <span>Notes</span>
            <span>Actions</span>
          </div>

          {visibleFollowups.map((followup) => (
            <div className="followup-row" key={followup.id}>
              <span>
                <strong>{followup.leadName}</strong>
                <small>{followup.phone || "-"}</small>
              </span>
              <span>{followup.type}</span>
              <span>{formatDateTime(followup)}</span>
              <span>
                <mark className={`followup-priority ${String(followup.priority).toLowerCase()}`}>
                  {followup.priority}
                </mark>
              </span>
              <span><FollowupStatusBadge status={followup.effectiveStatus || followup.status} /></span>
              <span>{followup.leadStatus || "-"}</span>
              <span className="followup-notes">{followup.notes || "-"}</span>
              <span className="followup-actions">
                <select
                  aria-label={`Choose action for ${followup.leadName}`}
                  value={selectedActions[followup.id] || ""}
                  onChange={(event) => handleActionChange(followup.id, event.target.value)}
                >
                  {followupActionOptions.map((option) => (
                    <option
                      disabled={option.value ? isActionDisabled(followup, option.value) : false}
                      key={option.value}
                      value={option.value}
                    >
                      {option.label}
                    </option>
                  ))}
                </select>
                <button
                  className="followup-proceed-btn"
                  disabled={!selectedActions[followup.id] || isActionDisabled(followup, selectedActions[followup.id])}
                  type="button"
                  onClick={() => handleProceed(followup)}
                >
                  Proceed
                </button>
              </span>
            </div>
          ))}
        </div>
      )}

      {showCreate && (
        <CreateFollowupModal
          currentUser={user}
          leads={leads}
          onClose={() => setShowCreate(false)}
          onSubmit={handleCreate}
        />
      )}

      {rescheduleTarget && (
        <RescheduleFollowupModal
          followup={rescheduleTarget}
          onClose={() => setRescheduleTarget(null)}
          onSubmit={handleReschedule}
        />
      )}
    </section>
  );
};

export default SalesFollowups;
