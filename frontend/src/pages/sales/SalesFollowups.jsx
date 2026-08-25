import React, { useCallback, useEffect, useMemo, useState } from "react";
import { CalendarDays, MoreVertical } from "lucide-react";
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
  updateFollowup,
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
  const [openMenuId, setOpenMenuId] = useState(null);
  const [viewTarget, setViewTarget] = useState(null);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editForm, setEditForm] = useState({});
  const [page, setPage] = useState(1);
  const [pageMeta, setPageMeta] = useState({ totalItems:0, totalPages:1 });
  const recordsPerPage = 10;

  useEffect(() => {
    setFilter(activeFilter);
  }, [activeFilter]);

  const loadFollowups = useCallback(async (nextPage = page) => {
    setLoading(true);
    setError("");
    try {
      const result = await getFollowups(filter, { page:nextPage, limit:recordsPerPage });
      const rows = Array.isArray(result) ? result : result?.data || [];
      setFollowups(rows);
      setPageMeta({
        totalItems:Number(result?.totalItems) || rows.length,
        totalPages:Math.max(1, Number(result?.totalPages) || 1),
      });
    } catch (err) {
      setError(err.message || "Unable to load follow-ups");
    } finally {
      setLoading(false);
    }
  }, [filter, page]);

  useEffect(() => {
    loadFollowups(page);
  }, [loadFollowups, page]);

  useEffect(() => {
    setPage(1);
  }, [filter]);

  const counts = useMemo(() => {
    const nextCounts = { callbacks: 0, today: 0, upcoming: 0, missed: 0, completed: 0, all: followups.length };
    followups.forEach((followup) => {
      const bucket = getFilterForFollowup(followup);
      nextCounts[bucket] = (nextCounts[bucket] || 0) + 1;
      if (followup.type === "Callback" && followup.status === "Pending") {
        nextCounts.callbacks += 1;
      }
    });
    return nextCounts;
  }, [followups]);

  const visibleFollowups = followups;

  const handleCreate = async (payload) => {
    await createFollowup(payload);
    await loadFollowups(page);
    if (onRefreshPanel) onRefreshPanel();
  };

  const handleMarkDone = async (followup, payload = {}) => {
    await markFollowupDone(followup.id, payload);
    await loadFollowups(page);
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
    await loadFollowups(page);
    if (onRefreshPanel) onRefreshPanel();
  };

  const handleReschedule = async (payload) => {
    await rescheduleFollowup(rescheduleTarget.id, payload);
    await loadFollowups(page);
    if (onRefreshPanel) onRefreshPanel();
  };

  const openEdit = (followup) => {
    setEditTarget(followup);
    setEditForm({
      type:followup.type || "Call",
      priority:followup.priority || "Medium",
      followUpDate:String(followup.followUpDate || "").slice(0, 10),
      followUpTime:followup.followUpTime || "09:00",
      notes:followup.notes || "",
    });
    setOpenMenuId(null);
  };

  const submitEdit = async (event) => {
    event.preventDefault();
    if (!editTarget?.id) return;
    setLoading(true);
    try {
      await updateFollowup(editTarget.id, editForm);
      setEditTarget(null);
      await loadFollowups(page);
    } catch (err) {
      setError(err.message || "Unable to edit follow-up");
    } finally {
      setLoading(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget?.id) return;
    setLoading(true);
    try {
      await cancelFollowup(deleteTarget.id, { note:"Cancelled from User/Sales follow-ups table" });
      setDeleteTarget(null);
      const nextPage = followups.length === 1 ? Math.max(1, page - 1) : page;
      setPage(nextPage);
      await loadFollowups(nextPage);
      if (onRefreshPanel) onRefreshPanel();
    } catch (err) {
      setError(err.message || "Unable to delete follow-up");
    } finally {
      setLoading(false);
    }
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
          <h2>{filter === "callbacks" ? "Callbacks due" : "Follow-ups"}</h2>
          <p>{filter === "callbacks" ? "Scheduled callback queue for assigned leads" : "Today, upcoming, missed and completed customer actions"}</p>
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
                <div className="followup-next-action">
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
                </div>
                <div className="followup-row-menu-wrap">
                  <button
                    type="button"
                    className="followup-row-menu-btn"
                    aria-label={`Open menu for follow-up ${followup.id}`}
                    aria-expanded={openMenuId === followup.id}
                    onClick={() => setOpenMenuId((current) => current === followup.id ? null : followup.id)}
                  >
                    <MoreVertical size={16} />
                  </button>
                  {openMenuId === followup.id && (
                    <div className="followup-row-menu">
                      <button type="button" onClick={() => { setViewTarget(followup); setOpenMenuId(null); }}>View</button>
                      <button type="button" disabled={isFollowupClosed(followup)} onClick={() => openEdit(followup)}>Edit</button>
                      <button type="button" className="danger" disabled={isFollowupClosed(followup)} onClick={() => { setDeleteTarget(followup); setOpenMenuId(null); }}>Delete</button>
                    </div>
                  )}
                </div>
              </span>
            </div>
          ))}
        </div>
      )}

      {!loading && pageMeta.totalItems > 0 && (
        <div className="sales-table-pagination">
          <span>
            Showing {(page - 1) * recordsPerPage + 1}-{Math.min(page * recordsPerPage, pageMeta.totalItems)} of {pageMeta.totalItems}
          </span>
          <div>
            <button type="button" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
              Previous
            </button>
            <span>{page} / {pageMeta.totalPages}</span>
            <button type="button" disabled={page >= pageMeta.totalPages} onClick={() => setPage((current) => Math.min(pageMeta.totalPages, current + 1))}>
              Next
            </button>
          </div>
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

      {viewTarget && (
        <div className="sales-dialog-backdrop" role="presentation">
          <section className="sales-dialog" role="dialog" aria-modal="true" aria-labelledby="followup-view-title">
            <div className="sales-dialog-head">
              <h3 id="followup-view-title">Follow-up details</h3>
              <button type="button" onClick={() => setViewTarget(null)} aria-label="Close follow-up details">X</button>
            </div>
            <div className="sales-dialog-grid">
              {[
                ["Lead", viewTarget.leadName],
                ["Phone", viewTarget.phone],
                ["Type", viewTarget.type],
                ["Priority", viewTarget.priority],
                ["Status", viewTarget.effectiveStatus || viewTarget.status],
                ["Lead status", viewTarget.leadStatus],
                ["Follow-up on", formatDateTime(viewTarget)],
                ["Notes", viewTarget.notes || "-"],
              ].map(([label, value]) => (
                <div key={label}><span>{label}</span><strong>{value || "-"}</strong></div>
              ))}
            </div>
          </section>
        </div>
      )}

      {editTarget && (
        <div className="sales-dialog-backdrop" role="presentation">
          <form className="sales-dialog" role="dialog" aria-modal="true" aria-labelledby="followup-edit-title" onSubmit={submitEdit}>
            <div className="sales-dialog-head">
              <h3 id="followup-edit-title">Edit follow-up</h3>
              <button type="button" onClick={() => setEditTarget(null)} aria-label="Close edit follow-up">X</button>
            </div>
            <div className="sales-dialog-form">
              <label><span>Type</span><select value={editForm.type} onChange={(event) => setEditForm((current) => ({ ...current, type:event.target.value }))}>{["Call", "Callback", "WhatsApp", "Email", "Visit", "Other"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Priority</span><select value={editForm.priority} onChange={(event) => setEditForm((current) => ({ ...current, priority:event.target.value }))}>{["Low", "Medium", "High"].map((item) => <option key={item} value={item}>{item}</option>)}</select></label>
              <label><span>Date</span><input type="date" value={editForm.followUpDate} onChange={(event) => setEditForm((current) => ({ ...current, followUpDate:event.target.value }))} required /></label>
              <label><span>Time</span><input type="time" value={editForm.followUpTime} onChange={(event) => setEditForm((current) => ({ ...current, followUpTime:event.target.value }))} required /></label>
              <label className="wide"><span>Notes</span><textarea value={editForm.notes} onChange={(event) => setEditForm((current) => ({ ...current, notes:event.target.value }))} rows={3} /></label>
            </div>
            <div className="sales-dialog-actions">
              <button type="button" onClick={() => setEditTarget(null)}>Cancel</button>
              <button type="submit" className="primary" disabled={loading}>{loading ? "Saving..." : "Save"}</button>
            </div>
          </form>
        </div>
      )}

      {deleteTarget && (
        <div className="sales-dialog-backdrop" role="presentation">
          <section className="sales-dialog" role="alertdialog" aria-modal="true" aria-labelledby="followup-delete-title">
            <div className="sales-dialog-head">
              <h3 id="followup-delete-title">Delete follow-up?</h3>
              <button type="button" onClick={() => setDeleteTarget(null)} aria-label="Close delete confirmation">X</button>
            </div>
            <p className="sales-dialog-copy">This will cancel the follow-up and preserve CRM history.</p>
            <div className="sales-dialog-actions">
              <button type="button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="danger" disabled={loading} onClick={confirmDelete}>{loading ? "Deleting..." : "Delete"}</button>
            </div>
          </section>
        </div>
      )}
    </section>
  );
};

export default SalesFollowups;
