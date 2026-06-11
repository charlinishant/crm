import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MessageSquare, Phone } from "lucide-react";
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

const nextActionOptions = [
  { value: "", label: "Next action" },
  { value: "create-next-follow-up", label: "Create next follow-up" },
  { value: "Qualified", label: "Mark Qualified" },
  { value: "In Sourcing", label: "Move to In Sourcing" },
  { value: "Visit Scheduled", label: "Schedule Visit" },
  { value: "In Closing", label: "Move to In Closing" },
  { value: "Booked", label: "Mark Booked" },
  { value: "Unqualified", label: "Mark Unqualified" },
];

const SalesFollowups = ({
  activeFilter = "today",
  leads = [],
  user,
  onOpenCallLead,
  onOpenWhatsAppLead,
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
  const [nextActions, setNextActions] = useState({});

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

  const handleProceed = async (followup) => {
    const nextAction = nextActions[followup.id] || "";
    if (!nextAction) return;

    if (nextAction === "Unqualified") {
      const reason = window.prompt("Reason required: Not Answering / Not Interested / Wrong Number / Budget Issue / Other", "");
      if (!reason) return;
      await handleMarkDone(followup, {
        nextAction,
        reason,
        note: reason,
      });
      onOpenLead?.(followup.lead);
      return;
    }

    if (nextAction === "create-next-follow-up") {
      const nextDateTime = window.prompt("Next follow-up date and time (YYYY-MM-DDTHH:mm)", "");
      if (!nextDateTime) return;
      const [followUpDate, followUpTime = "09:00"] = nextDateTime.split("T");

      await createFollowup({
        leadId: getLeadId(followup.lead),
        type: followup.type || "Call",
        followUpDate,
        followUpTime,
        priority: followup.priority || "Medium",
        notes: followup.notes || "",
      });
      await handleMarkDone(followup, {
        nextAction,
        note: "Follow-up completed. Next follow-up created.",
      });
      onOpenLead?.(followup.lead);
      return;
    }

    if (nextAction === "Visit Scheduled" && onScheduleVisitLead) {
      await handleMarkDone(followup, {
        nextAction,
        note: "Follow-up completed. Schedule visit selected.",
      });
      onScheduleVisitLead(followup.lead);
      return;
    }

    await handleMarkDone(followup, {
      nextAction,
      note: `Follow-up completed. Next action: ${nextAction}`,
    });
    onOpenLead?.(followup.lead);
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
                <button type="button" onClick={() => onOpenCallLead?.(followup.lead)} title="Call">
                  <Phone size={14} /> Call
                </button>
                <button type="button" onClick={() => onOpenWhatsAppLead?.(followup.lead)} title="WhatsApp">
                  <MessageSquare size={14} /> WhatsApp
                </button>
                <div className="followup-next-action">
                  <select
                    value={nextActions[followup.id] || ""}
                    onChange={(event) => setNextActions((current) => ({ ...current, [followup.id]: event.target.value }))}
                    disabled={followup.status === "Done" || followup.status === "Cancelled"}
                  >
                    {nextActionOptions.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleProceed(followup)}
                    disabled={!nextActions[followup.id] || followup.status === "Done" || followup.status === "Cancelled"}
                  >
                    Proceed
                  </button>
                </div>
                <button type="button" onClick={() => handleMarkDone(followup)} disabled={followup.status === "Cancelled" || followup.status === "Done"}>
                  Mark Done
                </button>
                <button type="button" onClick={() => setRescheduleTarget(followup)} disabled={followup.status === "Done"}>
                  Reschedule
                </button>
                <button type="button" onClick={() => handleCancel(followup)} disabled={followup.status === "Cancelled" || followup.status === "Done"}>
                  Cancel
                </button>
                <button type="button" onClick={() => onOpenLead?.(followup.lead)}>
                  Open Lead
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
