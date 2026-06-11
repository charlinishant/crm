import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  FaArrowLeft,
  FaCalendarAlt,
  FaCheckCircle,
  FaClock,
  FaExchangeAlt,
  FaEdit,
  FaEllipsisV,
  FaEnvelope,
  FaHistory,
  FaLock,
  FaMapMarkerAlt,
  FaPhoneAlt,
  FaPlus,
  FaRegStickyNote,
  FaSave,
  FaStar,
  FaTimes,
  FaTrash,
  FaUserTie,
  FaWhatsapp,
} from "react-icons/fa";
import {
  createFollowup,
  getLeadFollowupContext,
  markFollowupDone,
  rescheduleFollowup,
} from "../services/followupApi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const crmStatuses = [
  "New",
  "Qualified",
  "In sourcing",
  "In closing",
  "Booked",
  "Unqualified",
];

const imageStatuses = ["Image pending", "Image received", "Image shared"];

const backendStatusMap = {
  All: "New",
  New: "New",
  Qualified: "Qualified",
  "In sourcing": "In_sourcing",
  "In closing": "In_closing",
  Booked: "Booked",
  Unqualified: "Unqualified",
  "Image pending": "Image_pending",
  "Image received": "Image_received",
  "Image shared": "Image_shared",
};

const tabs = [
  "Activity",
  "Notes",
  "Calls",
  "Site Visits",
  "Follow-ups",
  "Emails",
  "SMS",
  "WhatsApp",
  "History",
];

const fallbackLead = {
  id: 10702,
  firstName: "Chetan",
  lastName: "Agrawal",
  status: "New",
  source: "channel_partner",
  interestedProjects: "Binghatti Hills",
  tags: "channel_partner",
};

const getStoredLead = () => {
  try {
    return (
      JSON.parse(window.sessionStorage.getItem("selectedLeadDetails") || "null") ||
      JSON.parse(window.sessionStorage.getItem("selectedLeadPreview") || "null")
    );
  } catch {
    return null;
  }
};

const getCurrentUserName = () => {
  try {
    const user = JSON.parse(localStorage.getItem("authUser") || "null");
    return (
      [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
      user?.username ||
      user?.email ||
      "User"
    );
  } catch {
    return "User";
  }
};

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.name ||
  lead?.full_name ||
  lead?.customer_name ||
  lead?.companyName ||
  (getLeadId(lead) ? `Lead #${getLeadId(lead)}` : "Lead");

const getContactValue = (value, keys = ["value", "email", "phone", "number"]) => {
  if (!value) return "";
  if (typeof value === "string") return value;
  if (Array.isArray(value)) {
    for (const item of value) {
      const result = getContactValue(item, keys);
      if (result) return result;
    }
    return "";
  }
  if (typeof value === "object") {
    for (const key of keys) {
      if (value[key]) return value[key];
    }
  }
  return "";
};

const valueOf = (lead, keys, fallback = "-") => {
  for (const key of keys) {
    const value = lead?.[key];
    if (value !== undefined && value !== null && value !== "") return value;
  }
  return fallback;
};

const toDate = (value) => {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
};

const formatDateTime = (value, fallback = "-") => {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const formatDateOnly = (value, fallback = "-") => {
  const date = toDate(value);
  if (!date) return fallback;
  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const normalizeApiFollowup = (item) => ({
  ...item,
  title: item.notes || `${item.type || "Call"} follow-up`,
  dueAt: item.followUpDate && item.followUpTime
    ? `${String(item.followUpDate).slice(0, 10)}T${item.followUpTime}`
    : item.followUpDate,
  status: item.effectiveStatus || item.status || "Pending",
});

const formatMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "-";
  return new Intl.NumberFormat("en-IN", {
    currency: "INR",
    maximumFractionDigits: 0,
    style: "currency",
  }).format(amount);
};

const normalizeText = (value) => String(value || "").toLowerCase();

const getCrmStatusFromLead = (lead) => {
  const rawStatus = String(valueOf(lead, ["crmStatus", "status", "lead_status", "stage"], "New"));
  if (crmStatuses.includes(rawStatus)) return rawStatus;
  if (rawStatus === "In_sourcing") return "In sourcing";
  if (rawStatus === "In_closing") return "In closing";
  if (rawStatus === "Image_pending") return "Image pending";
  if (rawStatus === "Image_received") return "Image received";
  if (rawStatus === "Image_shared") return "Image shared";
  if (rawStatus === "Nurture" || rawStatus === "Follow-up") return "Qualified";
  if (rawStatus === "Lost" || rawStatus === "Junk") return "Unqualified";
  if (rawStatus === "Fresh_Lead" || rawStatus === "Prospect") return "New";
  if (rawStatus === "Registered") return "In closing";
  return "New";
};

const getStatusScore = (status) => {
  const statusScores = {
    All: 0,
    New: 15,
    Qualified: 35,
    "In sourcing": 55,
    "In closing": 75,
    Booked: 100,
    Unqualified: 0,
  };

  return statusScores[status] ?? 0;
};

const getOwnerName = (lead) => {
  const team = lead?.team;
  return (
    valueOf(lead, ["owner", "assigned_to", "sales"], "") ||
    [team?.firstName, team?.lastName].filter(Boolean).join(" ") ||
    team?.username ||
    team?.email ||
    "Unassigned"
  );
};

const getActivityDay = (value) => {
  const date = toDate(value);
  if (!date) return "Older";
  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
  const startDate = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
  const diff = Math.round((startToday - startDate) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Yesterday";
  return formatDateOnly(date);
};

const getLocalNotes = (leadId) => {
  try {
    return JSON.parse(localStorage.getItem(`leadNoteUi:${leadId}`) || "{}");
  } catch {
    return {};
  }
};

const saveLocalNotes = (leadId, value) => {
  localStorage.setItem(`leadNoteUi:${leadId}`, JSON.stringify(value));
};

const mergeNoteUiState = (leadId, notes) => {
  const localState = getLocalNotes(leadId);
  return notes
    .filter((note) => !localState[note.id]?.deleted)
    .map((note) => ({
      ...note,
      note: localState[note.id]?.note || note.note,
      pinned: Boolean(localState[note.id]?.pinned),
      updatedAt: localState[note.id]?.updatedAt || note.updatedAt,
    }));
};

const UserDetails = ({
  context = "auto",
  embedded = false,
  onOpenCallLead,
  onOpenWhatsAppLead,
  onScheduleVisitLead,
}) => {
  const location = useLocation();
  const navigate = useNavigate();
  const noteInputRef = useRef(null);
  const token = localStorage.getItem("authToken");
  const leadIdFromUrl = useMemo(
    () => new URLSearchParams(location.search).get("leadId"),
    [location.search]
  );

  const [lead, setLead] = useState(location.state?.lead || getStoredLead() || fallbackLead);
  const [notes, setNotes] = useState([]);
  const [calls, setCalls] = useState([]);
  const [visits, setVisits] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [activeTab, setActiveTab] = useState("Activity");
  const [selectedStatus, setSelectedStatus] = useState(getCrmStatusFromLead(lead));
  const [statusMessage, setStatusMessage] = useState("");
  const [noteDraft, setNoteDraft] = useState("");
  const [editingNoteId, setEditingNoteId] = useState(null);
  const [isSavingNote, setIsSavingNote] = useState(false);
  const [isSavingStatus, setIsSavingStatus] = useState(false);
  const [showMoreMenu, setShowMoreMenu] = useState(false);
  const [followups, setFollowups] = useState([]);
  const [followupDraft, setFollowupDraft] = useState("");
  const [followupDate, setFollowupDate] = useState("");

  const leadId = getLeadId(lead);
  const leadName = getLeadName(lead);
  const primaryPhone =
    getContactValue(lead?.phones, ["phone", "number", "value"]) ||
    valueOf(lead, ["phone", "mobile", "primaryPhone"], "");
  const primaryEmail =
    getContactValue(lead?.emails, ["email", "value"]) ||
    valueOf(lead, ["email", "primaryEmail"], "");
  const projectInterest = valueOf(
    lead,
    ["interestedProjects", "projectName", "project_name", "siteVisitProject", "propertyType"],
    "-"
  );
  const source = valueOf(lead, ["source", "channelPartner", "tags"], "-");
  const owner = getOwnerName(lead);
  const currentStatus = selectedStatus || getCrmStatusFromLead(lead);
  const leadScoreNumber = getStatusScore(currentStatus);
  const createdDate = valueOf(lead, ["createdAt", "created_at", "received_on"], "");
  const isSalesContext =
    context === "sales" || (context !== "admin" && location.pathname.startsWith("/user/sales"));
  const isAdminContext = context === "admin" || !isSalesContext;
  const detailsBackPath = isAdminContext ? "/leads" : "/user/sales";
  const statusOptions = crmStatuses;
  const stageStatusValue = statusOptions.includes(selectedStatus) ? selectedStatus : "";

  const openSalesCallPage = () => {
    if (onOpenCallLead) {
      onOpenCallLead(lead);
      return;
    }

    navigate(`/user/sales/calls${leadId ? `?leadId=${leadId}` : ""}`, {
      state: { lead },
    });
  };

  const openSalesWhatsAppPage = () => {
    if (onOpenWhatsAppLead) {
      onOpenWhatsAppLead(lead);
      return;
    }

    navigate(`/user/sales/whatsapp${leadId ? `?leadId=${leadId}` : ""}`, {
      state: { lead },
    });
  };

  const openSalesSiteVisitPage = (status = "") => {
    if (onScheduleVisitLead) {
      onScheduleVisitLead(lead, status);
      return;
    }

    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    if (status) params.set("status", status);
    navigate(`/user/sales/site-visit${params.toString() ? `?${params.toString()}` : ""}`, {
      state: { lead, status },
    });
  };

  const fetchLead = useCallback(async () => {
    const nextLeadId = leadIdFromUrl || leadId;
    if (!nextLeadId) return;

    try {
      const response = await fetch(`${API_URL}/leads/${nextLeadId}`);
      if (!response.ok) return;
      const result = await response.json();
      setLead(result);
      setSelectedStatus(getCrmStatusFromLead(result));
      window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(result));
    } catch (error) {
      console.error("Unable to load lead details:", error);
    }
  }, [leadId, leadIdFromUrl]);

  const fetchNotes = useCallback(async () => {
    if (!leadId) return;
    try {
      const response = await fetch(`${API_URL}/lead-notes/${leadId}`);
      if (!response.ok) return;
      const result = await response.json();
      const rows = Array.isArray(result) ? result : [];
      setNotes(mergeNoteUiState(leadId, rows));
    } catch (error) {
      console.error("Unable to load notes:", error);
    }
  }, [leadId]);

  const fetchCalls = useCallback(async () => {
    if (!leadId || !token) return;
    try {
      const response = await fetch(`${API_URL}/calls/lead/${leadId}?limit=100`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!response.ok) return;
      const result = await response.json();
      setCalls(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      console.error("Unable to load calls:", error);
    }
  }, [leadId, token]);

  const fetchVisits = useCallback(async () => {
    if (!leadId) return;
    try {
      const response = await fetch(`${API_URL}/schedule-visits`);
      if (!response.ok) return;
      const result = await response.json();
      const rows = (Array.isArray(result) ? result : result?.data || []).filter(
        (visit) => String(visit.leadId || visit.lead?.id) === String(leadId)
      );
      setVisits(rows);
    } catch (error) {
      console.error("Unable to load site visits:", error);
    }
  }, [leadId]);

  const fetchBookings = useCallback(async () => {
    if (!leadId) return;
    try {
      const response = await fetch(`${API_URL}/bookings?leadId=${leadId}&limit=100`);
      if (!response.ok) return;
      const result = await response.json();
      setBookings(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      console.error("Unable to load bookings:", error);
    }
  }, [leadId]);

  const fetchFollowups = useCallback(async () => {
    if (!leadId || isAdminContext) {
      setFollowups([]);
      return;
    }

    try {
      const result = await getLeadFollowupContext(leadId);
      setFollowups((result?.followUps || []).map(normalizeApiFollowup));
    } catch (error) {
      console.error("Unable to load follow-ups:", error);
      setFollowups([]);
    }
  }, [isAdminContext, leadId]);

  useEffect(() => {
    fetchLead();
  }, [fetchLead]);

  useEffect(() => {
    fetchNotes();
    fetchCalls();
    fetchVisits();
    fetchBookings();
    fetchFollowups();
  }, [fetchBookings, fetchCalls, fetchFollowups, fetchNotes, fetchVisits]);

  const saveStatus = async (status) => {
    if (!leadId) return false;
    setIsSavingStatus(true);
    setStatusMessage("");
    const backendStatus = backendStatusMap[status] || String(status || "New").replace(/\s+/g, "_");
    const nextScore = getStatusScore(status);

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: backendStatus, score: nextScore }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to update status");

      const updatedLead = { ...lead, ...result, status, crmStatus: status, score: nextScore };
      setLead(updatedLead);
      setSelectedStatus(status);
      window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(updatedLead));
      window.localStorage.setItem(
        "leadStatusUpdates",
        JSON.stringify({
          ...JSON.parse(window.localStorage.getItem("leadStatusUpdates") || "{}"),
          [leadId]: {
            status,
            crmStatus: status,
            score: nextScore,
            backendStatus,
            updatedAt: new Date().toISOString(),
          },
        })
      );
      setStatusMessage(`Status saved as ${status}`);
      return true;
    } catch (error) {
      console.error("Unable to update lead status:", error);
      setStatusMessage("Status could not be saved.");
      return false;
    } finally {
      setIsSavingStatus(false);
    }
  };

  const handleStatusChange = (nextStatus) => {
    const nextScore = getStatusScore(nextStatus);
    setSelectedStatus(nextStatus);
    setLead((currentLead) => ({
      ...currentLead,
      crmStatus: nextStatus,
      score: nextScore,
      status: nextStatus,
    }));
  };

  const reassignLead = async () => {
    if (!leadId) return;
    const nextOwnerId = window.prompt("Enter sales user ID to reassign this lead:");
    if (!nextOwnerId) return;

    const normalizedOwnerId = Number.parseInt(nextOwnerId, 10);
    if (!Number.isFinite(normalizedOwnerId)) {
      alert("Please enter a valid sales user ID.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamId: normalizedOwnerId, leadReassigned: true }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to reassign lead");

      const updatedLead = { ...lead, ...result };
      setLead(updatedLead);
      window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(updatedLead));
      setStatusMessage("Lead reassigned successfully.");
    } catch (error) {
      alert(error.message || "Unable to reassign lead");
    }
  };

  const saveNote = async () => {
    const text = noteDraft.trim();
    if (!text || !leadId) return;

    setIsSavingNote(true);
    try {
      if (editingNoteId) {
        const localState = getLocalNotes(leadId);
        const nextState = {
          ...localState,
          [editingNoteId]: {
            ...localState[editingNoteId],
            note: text,
            updatedAt: new Date().toISOString(),
          },
        };
        saveLocalNotes(leadId, nextState);
        setNotes((current) =>
          current.map((note) =>
            String(note.id) === String(editingNoteId)
              ? { ...note, note: text, updatedAt: nextState[editingNoteId].updatedAt }
              : note
          )
        );
      } else {
        const response = await fetch(`${API_URL}/lead-notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            leadId: Number(leadId),
            note: text,
            owner: getCurrentUserName(),
          }),
        });
        if (!response.ok) throw new Error("Unable to save note");
        const saved = await response.json();
        setNotes((current) => [{ ...saved, pinned: false }, ...current]);
      }

      setNoteDraft("");
      setEditingNoteId(null);
      noteInputRef.current?.focus();
    } catch (error) {
      alert(error.message || "Unable to save note");
    } finally {
      setIsSavingNote(false);
    }
  };

  const editNote = (note) => {
    setActiveTab("Notes");
    setEditingNoteId(note.id);
    setNoteDraft(note.note || "");
    setTimeout(() => noteInputRef.current?.focus(), 0);
  };

  const deleteNote = (note) => {
    if (!window.confirm("Delete this note from this page?")) return;
    const localState = getLocalNotes(leadId);
    saveLocalNotes(leadId, {
      ...localState,
      [note.id]: { ...localState[note.id], deleted: true },
    });
    setNotes((current) => current.filter((item) => String(item.id) !== String(note.id)));
  };

  const togglePinNote = (note) => {
    const localState = getLocalNotes(leadId);
    const pinned = !note.pinned;
    saveLocalNotes(leadId, {
      ...localState,
      [note.id]: { ...localState[note.id], pinned },
    });
    setNotes((current) =>
      current.map((item) => (String(item.id) === String(note.id) ? { ...item, pinned } : item))
    );
  };

  const scheduleFollowup = async () => {
    if (!followupDraft.trim() || !followupDate || !leadId) return;
    const [followUpDate, followUpTime = "09:00"] = followupDate.split("T");

    try {
      await createFollowup({
        leadId,
        type: "Call",
        followUpDate,
        followUpTime,
        priority: "Medium",
        notes: followupDraft.trim(),
      });
      setFollowupDraft("");
      setFollowupDate("");
      fetchFollowups();
    } catch (error) {
      alert(error.message || "Unable to schedule follow-up");
    }
  };

  const updateFollowupStatus = async (item, status) => {
    try {
      if (status === "Done" || status === "Completed") {
        await markFollowupDone(item.id);
      } else if (status === "Rescheduled") {
        const nextDate = window.prompt("New follow-up date and time (YYYY-MM-DDTHH:mm)", item.dueAt || "");
        if (!nextDate) return;
        const [followUpDate, followUpTime = "09:00"] = nextDate.split("T");
        await rescheduleFollowup(item.id, {
          followUpDate,
          followUpTime,
          notes: item.notes || item.title,
          priority: item.priority || "Medium",
        });
      }
      fetchFollowups();
    } catch (error) {
      alert(error.message || "Unable to update follow-up");
    }
  };

  const activities = useMemo(() => {
    const noteActivities = notes.map((note) => ({
      id: `note-${note.id}`,
      type: "Notes",
      icon: <FaRegStickyNote />,
      title: note.pinned ? "Pinned Note" : "Note Added",
      description: note.note,
      meta: `Created by ${note.owner || "User"}`,
      createdAt: note.updatedAt || note.createdAt,
      source: note,
    }));

    const callActivities = calls.map((call) => ({
      id: `call-${call.id}`,
      type: "Calls",
      icon: <FaPhoneAlt />,
      title: normalizeText(call.status).includes("connected") || normalizeText(call.status).includes("completed")
        ? "Call Connected"
        : "Call Attempted",
      description: `${call.phone || primaryPhone || "-"}${call.duration ? `, ${call.duration}s` : ""}`,
      meta: call.disposition || call.provider || "Call log",
      createdAt: call.startedAt || call.createdAt,
      source: call,
    }));

    const visitActivities = visits.map((visit) => ({
      id: `visit-${visit.id}`,
      type: "Site Visits",
      icon: <FaMapMarkerAlt />,
      title: `Site Visit ${visit.status || "Scheduled"}`,
      description: visit.project || projectInterest,
      meta: visit.meetingPoint || visit.salesExecutive || "Site visit",
      createdAt: visit.scheduledOn || visit.updatedAt || visit.createdAt,
      source: visit,
    }));

    const followupActivities = followups.map((item) => ({
      id: `followup-${item.id}`,
      type: "Follow-ups",
      icon: <FaClock />,
      title: `Follow-up ${item.status || "Scheduled"}`,
      description: item.title,
      meta: formatDateTime(item.dueAt),
      createdAt: item.updatedAt || item.dueAt || item.createdAt,
      source: item,
    }));

    const bookingActivities = bookings.map((booking) => ({
      id: `booking-${booking.id}`,
      type: "History",
      icon: <FaCheckCircle />,
      title: "Booking Created",
      description: booking.projectDetails || booking.customerName || "Booking",
      meta: `${formatMoney(booking.basePrice)} ${booking.stage || ""}`.trim(),
      createdAt: booking.bookedOn || booking.createdAt,
      source: booking,
    }));

    const statusActivity = {
      id: `status-${leadId}`,
      type: "History",
      icon: <FaHistory />,
      title: "Lead Status",
      description: currentStatus,
      meta: "Current workflow state",
      createdAt: valueOf(lead, ["updatedAt", "createdAt"], new Date().toISOString()),
      source: lead,
    };

    const createdActivity = {
      id: `created-${leadId}`,
      type: "History",
      icon: <FaPlus />,
      title: "Lead Created",
      description: `${leadName} entered CRM`,
      meta: source,
      createdAt: createdDate || new Date().toISOString(),
      source: lead,
    };

    return [
      ...noteActivities,
      ...callActivities,
      ...visitActivities,
      ...followupActivities,
      ...bookingActivities,
      statusActivity,
      createdActivity,
    ].sort((first, second) => {
      const firstTime = toDate(first.createdAt)?.getTime() || 0;
      const secondTime = toDate(second.createdAt)?.getTime() || 0;
      return secondTime - firstTime;
    });
  }, [
    bookings,
    calls,
    createdDate,
    currentStatus,
    followups,
    lead,
    leadId,
    leadName,
    notes,
    primaryPhone,
    projectInterest,
    source,
    visits,
  ]);

  const filteredActivities = useMemo(() => {
    if (activeTab === "Activity") return activities;
    if (activeTab === "Emails" || activeTab === "SMS" || activeTab === "WhatsApp") return [];
    return activities.filter((activity) => activity.type === activeTab);
  }, [activeTab, activities]);

  const groupedActivities = useMemo(() => {
    return filteredActivities.reduce((groups, activity) => {
      const day = getActivityDay(activity.createdAt);
      return { ...groups, [day]: [...(groups[day] || []), activity] };
    }, {});
  }, [filteredActivities]);

  const overview = useMemo(() => {
    const connectedCalls = calls.filter((call) =>
      ["connected", "completed", "answered"].some((status) => normalizeText(call.status).includes(status))
    ).length;
    const missedCalls = calls.filter((call) =>
      ["missed", "no-answer", "failed", "busy"].some((status) => normalizeText(call.status).includes(status))
    ).length;

    return [
      ["Total Calls", calls.length],
      ["Connected Calls", connectedCalls],
      ["Missed Calls", missedCalls],
      ["Follow-ups", followups.length],
      ["Site Visits", visits.length],
      ["Bookings", bookings.length],
      ["Notes", notes.length],
    ];
  }, [bookings.length, calls, followups.length, notes.length, visits.length]);

  const upcomingFollowups = followups.filter((item) => item.status !== "Completed" && new Date(item.dueAt) >= new Date());
  const overdueFollowups = followups.filter((item) => item.status !== "Completed" && new Date(item.dueAt) < new Date());
  const completedVisits = visits.filter((visit) => normalizeText(visit.status).includes("done") || normalizeText(visit.status).includes("completed"));
  const cancelledVisits = visits.filter((visit) => normalizeText(visit.status).includes("cancel"));
  const scheduledVisits = visits.filter((visit) => !completedVisits.includes(visit) && !cancelledVisits.includes(visit));
  const lastActivity = activities[0]?.createdAt || createdDate;

  return (
    <>
      <style>{`
        .crm-details {
          background: var(--neutral-50, #f5f6fa);
          color: var(--neutral-800, #1f2937);
          min-height: ${embedded ? "calc(100vh - 40px)" : "100vh"};
          padding: ${embedded ? "0" : "22px"};
        }

        .crm-details-shell {
          display: grid;
          gap: 18px;
          margin: 0 auto;
          max-width: 1500px;
        }

        .crm-lead-header,
        .crm-panel,
        .crm-card {
          background: var(--white, #ffffff);
          border: 1px solid var(--neutral-200, #ebecef);
          border-radius: var(--rounded-8, 8px);
          box-shadow: var(--shadow-4, 4px 8px 24px 0 rgba(182, 182, 182, 0.2));
        }

        .crm-lead-header {
          display: grid;
          gap: 16px;
          padding: 18px;
        }

        .crm-header-top {
          align-items: flex-start;
          display: flex;
          gap: 16px;
          justify-content: space-between;
        }

        .crm-lead-title h1 {
          color: var(--neutral-900, #111827);
          font-size: 24px;
          font-weight: 700;
          line-height: 1.2;
          margin: 0 0 6px;
        }

        .crm-lead-title p {
          color: var(--neutral-500, #6b7280);
          margin: 0;
        }

        .crm-status-badge {
          background: var(--primary-50, #e4f1ff);
          border: 1px solid var(--primary-100, #bfdcff);
          border-radius: 999px;
          color: var(--primary-600, #487fff);
          display: inline-flex;
          font-size: 13px;
          font-weight: 700;
          padding: 7px 12px;
          white-space: nowrap;
        }

        .crm-header-grid,
        .crm-overview-grid {
          display: grid;
          gap: 10px;
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .crm-header-grid {
          grid-template-columns: repeat(3, minmax(0, 1fr)) minmax(140px, 0.7fr);
        }

        .crm-header-field,
        .crm-overview-card {
          background: var(--neutral-50, #f5f6fa);
          border: 1px solid var(--neutral-200, #ebecef);
          border-radius: var(--rounded-6, 6px);
          padding: 11px 12px;
        }

        .crm-score-field {
          align-items: center;
          display: flex;
          gap: 12px;
          min-height: 86px;
        }

        .crm-score-circle {
          --score: 0;
          align-items: center;
          background: conic-gradient(var(--primary-600, #487fff) calc(var(--score) * 1%), var(--neutral-200, #ebecef) 0);
          border-radius: 50%;
          display: inline-flex;
          flex: 0 0 66px;
          height: 66px;
          justify-content: center;
          position: relative;
          width: 66px;
        }

        .crm-score-circle::before {
          background: var(--white, #ffffff);
          border-radius: 50%;
          content: "";
          inset: 7px;
          position: absolute;
        }

        .crm-score-circle strong {
          color: var(--neutral-900, #111827);
          font-size: 16px;
          line-height: 1;
          position: relative;
          z-index: 1;
        }

        .crm-label {
          color: var(--neutral-500, #6b7280);
          font-size: 11px;
          font-weight: 700;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
          text-transform: uppercase;
        }

        .crm-value {
          color: var(--neutral-800, #1f2937);
          font-size: 14px;
          font-weight: 600;
          min-width: 0;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
        }

        .crm-action-bar {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          overflow-x: visible;
        }

        .crm-status-control {
          align-items: center;
          display: flex;
          gap: 8px;
          margin-left: auto;
        }

        .crm-action-btn,
        .crm-small-btn {
          align-items: center;
          background: var(--white, #ffffff);
          border: 1px solid var(--neutral-300, #d1d5db);
          border-radius: var(--rounded-6, 6px);
          color: var(--neutral-700, #374151);
          cursor: pointer;
          display: inline-flex;
          font-size: 13px;
          font-weight: 700;
          gap: 8px;
          min-height: 36px;
          padding: 0 12px;
        }

        .crm-action-btn:hover,
        .crm-small-btn:hover {
          background: var(--primary-50, #e4f1ff);
          border-color: var(--primary-200, #95c7ff);
          color: var(--primary-700, #486cea);
        }

        .crm-action-btn.primary,
        .crm-small-btn.primary {
          background: var(--primary-600, #487fff);
          border-color: var(--primary-600, #487fff);
          color: var(--white, #ffffff);
        }

        .crm-action-btn.primary:hover,
        .crm-small-btn.primary:hover {
          background: var(--primary-700, #486cea);
          border-color: var(--primary-700, #486cea);
          color: var(--white, #ffffff);
        }

        .crm-action-btn.danger,
        .crm-small-btn.danger {
          color: var(--danger-700, #b91c1c);
        }

        .crm-status-select {
          border: 1px solid var(--neutral-300, #d1d5db);
          border-radius: var(--rounded-6, 6px);
          color: var(--neutral-700, #374151);
          height: 36px;
          min-width: 174px;
          padding: 0 10px;
        }

        .crm-status-save {
          min-width: 92px;
        }

        .crm-more-wrap {
          position: relative;
        }

        .crm-more-menu {
          background: var(--white, #ffffff);
          border: 1px solid var(--neutral-200, #ebecef);
          border-radius: var(--rounded-8, 8px);
          box-shadow: var(--shadow-4, 4px 8px 24px 0 rgba(182, 182, 182, 0.2));
          display: grid;
          min-width: 210px;
          padding: 6px;
          position: absolute;
          right: 0;
          top: 42px;
          z-index: 20;
        }

        .crm-more-menu button {
          align-items: center;
          background: transparent;
          border: 0;
          border-radius: var(--rounded-6, 6px);
          color: var(--neutral-700, #374151);
          cursor: pointer;
          display: flex;
          font: inherit;
          gap: 9px;
          padding: 9px 10px;
          text-align: left;
        }

        .crm-more-menu button:hover {
          background: var(--primary-50, #e4f1ff);
          color: var(--primary-700, #486cea);
        }

        .crm-more-field {
          display: grid;
          gap: 6px;
          padding: 8px;
        }

        .crm-more-field .crm-status-select {
          min-width: 190px;
          width: 100%;
        }

        .crm-main-grid {
          align-items: start;
          display: grid;
          gap: 18px;
          grid-template-columns: minmax(280px, 0.42fr) minmax(0, 1fr);
        }

        .crm-panel {
          overflow: hidden;
        }

        .crm-panel-head {
          align-items: center;
          border-bottom: 1px solid var(--neutral-200, #ebecef);
          display: flex;
          justify-content: space-between;
          padding: 14px 16px;
        }

        .crm-panel-head h2 {
          color: var(--neutral-800, #1f2937);
          font-size: 16px;
          font-weight: 700;
          margin: 0;
        }

        .crm-panel-body {
          display: grid;
          gap: 12px;
          padding: 16px;
        }

        .crm-info-row,
        .crm-list-row {
          border-bottom: 1px solid var(--neutral-200, #ebecef);
          display: grid;
          gap: 5px;
          padding-bottom: 10px;
        }

        .crm-info-row:last-child,
        .crm-list-row:last-child {
          border-bottom: 0;
          padding-bottom: 0;
        }

        .crm-overview-card strong {
          display: block;
          font-size: 22px;
          line-height: 1;
          margin-top: 4px;
        }

        .crm-workspace {
          display: grid;
          gap: 18px;
        }

        .crm-note-box,
        .crm-followup-form,
        .crm-visit-link-panel {
          display: grid;
          gap: 10px;
        }

        .crm-note-box textarea,
        .crm-followup-form input {
          border: 1px solid var(--neutral-300, #d1d5db);
          border-radius: var(--rounded-6, 6px);
          color: var(--neutral-700, #374151);
          min-height: 38px;
          padding: 9px 10px;
          width: 100%;
        }

        .crm-note-box textarea {
          min-height: 92px;
          resize: vertical;
        }

        .crm-form-actions {
          align-items: center;
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .crm-note-save,
        .crm-back-btn {
          justify-content: center;
          width: max-content;
        }

        .crm-note-save {
          min-width: 122px;
        }

        .crm-back-btn {
          min-width: 92px;
        }

        .crm-visit-link-panel {
          background: var(--neutral-50, #f5f6fa);
          border: 1px solid var(--neutral-200, #ebecef);
          border-radius: var(--rounded-8, 8px);
          padding: 14px;
        }

        .crm-visit-link-panel p {
          color: var(--neutral-500, #6b7280);
          margin: 0;
        }

        .crm-status-control {
          align-items: center;
          display: flex;
          flex: 0 0 auto;
          gap: 8px;
          margin-left: 0;
        }

        .crm-action-bar > .crm-status-control {
          margin-left: auto;
        }

        .crm-status-field {
          align-items: center;
          display: flex;
          gap: 8px;
        }

        .crm-status-select {
          background: var(--white, #ffffff);
          border: 1px solid var(--neutral-300, #d1d5db);
          border-radius: var(--rounded-6, 6px);
          color: var(--neutral-900, #111827);
          font-size: 14px;
          font-weight: 600;
          height: 46px;
          min-width: 190px;
          padding: 0 12px;
        }

        .crm-status-score {
          align-items: center;
          background: var(--neutral-50, #f5f6fa);
          border: 1px solid var(--neutral-200, #ebecef);
          border-radius: var(--rounded-6, 6px);
          color: var(--neutral-800, #1f2937);
          display: inline-flex;
          font-size: 13px;
          font-weight: 700;
          height: 46px;
          padding: 0 12px;
          white-space: nowrap;
        }

        .crm-admin-status-tools {
          align-items: center;
          display: flex;
          flex: 0 0 auto;
          gap: 8px;
          margin-left: auto;
        }

        .crm-image-status-field {
          align-items: center;
          display: flex;
          gap: 8px;
        }

        .crm-status-inline-label {
          color: var(--neutral-500, #6b7280);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
          white-space: nowrap;
        }

        .crm-footer-actions {
          display: flex;
          justify-content: flex-end;
        }

        .crm-tabs {
          border-bottom: 1px solid var(--neutral-200, #ebecef);
          display: flex;
          gap: 18px;
          overflow-x: auto;
          padding: 0 16px;
          white-space: nowrap;
        }

        .crm-tabs button {
          background: transparent;
          border: 0;
          color: var(--neutral-500, #6b7280);
          cursor: pointer;
          font-size: 13px;
          font-weight: 700;
          padding: 14px 0 11px;
          position: relative;
        }

        .crm-tabs button.active {
          color: var(--neutral-800, #1f2937);
        }

        .crm-tabs button.active::after {
          background: var(--primary-600, #487fff);
          bottom: 0;
          content: "";
          height: 2px;
          left: 0;
          position: absolute;
          right: 0;
        }

        .crm-timeline {
          display: grid;
          gap: 20px;
          padding: 16px;
        }

        .crm-day {
          display: grid;
          gap: 10px;
        }

        .crm-day-title {
          color: var(--neutral-500, #6b7280);
          font-size: 12px;
          font-weight: 800;
          text-transform: uppercase;
        }

        .crm-activity {
          border: 1px solid var(--neutral-200, #ebecef);
          border-radius: var(--rounded-6, 6px);
          display: grid;
          gap: 8px;
          padding: 13px;
        }

        .crm-activity-top {
          align-items: flex-start;
          display: flex;
          gap: 12px;
          justify-content: space-between;
        }

        .crm-activity-title {
          align-items: center;
          color: var(--neutral-800, #1f2937);
          display: flex;
          font-size: 14px;
          font-weight: 800;
          gap: 9px;
        }

        .crm-activity-title svg {
          color: var(--primary-600, #487fff);
        }

        .crm-activity p {
          color: var(--neutral-600, #4b5563);
          margin: 0;
        }

        .crm-muted {
          color: var(--neutral-500, #6b7280);
          font-size: 12px;
        }

        .crm-note-actions {
          display: flex;
          gap: 8px;
        }

        .crm-bottom-grid {
          display: grid;
          gap: 18px;
          grid-template-columns: repeat(3, minmax(0, 1fr));
        }

        .crm-empty {
          color: var(--neutral-500, #6b7280);
          padding: 18px;
          text-align: center;
        }

        @media (max-width: 1100px) {
          .crm-action-bar {
            flex-wrap: wrap;
          }

          .crm-main-grid,
          .crm-bottom-grid,
          .crm-header-grid,
          .crm-overview-grid {
            grid-template-columns: 1fr;
          }

          .crm-header-top {
            flex-direction: column;
          }
        }
      `}</style>

      <div className="crm-details">
        <div className="crm-details-shell">
          <section className="crm-lead-header">
            <div className="crm-header-top">
              <div className="crm-lead-title">
                <h1>{leadName}</h1>
                <p>#{leadId || "-"} | {primaryPhone || "No mobile number"} | {projectInterest}</p>
              </div>
              <span className="crm-status-badge">{currentStatus}</span>
            </div>

            <div className="crm-header-grid">
              {[
                ["Mobile Number", primaryPhone || "-"],
                ["Project Interest", projectInterest],
                ["Source", source],
                ["Assigned Sales User", owner],
                ["Created Date", formatDateTime(createdDate)],
                ["Last Activity", formatDateTime(lastActivity)],
                ["Email", primaryEmail || "-"],
              ].map(([label, value]) => (
                <div className="crm-header-field" key={label}>
                  <div className="crm-label">{label}</div>
                  <div className="crm-value">{value}</div>
                </div>
              ))}
              <div className="crm-header-field crm-score-field">
                <div>
                  <div className="crm-label">Lead Score</div>
                  <div className="crm-muted">Based on current stage</div>
                </div>
                <div className="crm-score-circle" style={{ "--score": leadScoreNumber }}>
                  <strong>{leadScoreNumber}%</strong>
                </div>
              </div>
            </div>

            <div className="crm-action-bar">
              {!isAdminContext && (
                <>
                  <button className="crm-action-btn primary" type="button" onClick={openSalesCallPage}>
                    <FaPhoneAlt /> Call
                  </button>
                  <button className="crm-action-btn" type="button" onClick={openSalesWhatsAppPage}>
                    <FaWhatsapp /> WhatsApp
                  </button>
                </>
              )}
              <button className="crm-action-btn" type="button" onClick={() => setActiveTab("Notes")}>
                <FaRegStickyNote /> Add Note
              </button>
              {!isAdminContext && (
                <>
                  <button className="crm-action-btn" type="button" onClick={() => setActiveTab("Follow-ups")}>
                    <FaClock /> Schedule Follow-up
                  </button>
                  <button
                    className="crm-action-btn"
                    type="button"
                    onClick={() => openSalesSiteVisitPage()}
                  >
                    <FaCalendarAlt /> Site Visit
                  </button>
                </>
              )}
              <a className="crm-action-btn" href={primaryEmail ? `mailto:${primaryEmail}` : undefined}>
                <FaEnvelope /> Send Email
              </a>
              <div className={isAdminContext ? "crm-admin-status-tools" : "crm-status-control"}>
                <div className="crm-status-control">
                  <label className="crm-status-field">
                    <select
                      className="crm-status-select"
                      disabled={isSavingStatus}
                      value={stageStatusValue}
                      onChange={(event) => handleStatusChange(event.target.value)}
                    >
                      {!stageStatusValue && (
                        <option value="" disabled>
                          Select status
                        </option>
                      )}
                      {statusOptions.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </label>
                  <button
                    className="crm-small-btn primary crm-status-save"
                    disabled={isSavingStatus || !stageStatusValue}
                    type="button"
                    onClick={() => saveStatus(stageStatusValue)}
                  >
                    <FaSave /> {isSavingStatus ? "Saving..." : "Save"}
                  </button>
                </div>
              </div>
              <div className="crm-more-wrap">
                <button
                  className="crm-action-btn"
                  type="button"
                  onClick={() => setShowMoreMenu((current) => !current)}
                >
                  <FaEllipsisV /> More
                </button>
                {showMoreMenu && (
                  <div className="crm-more-menu">
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        reassignLead();
                      }}
                    >
                      <FaExchangeAlt /> Reassign Lead
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        if (isAdminContext) {
                          navigate("/SiteVists", { state: { lead, status: "Conducted" } });
                          return;
                        }
                        openSalesSiteVisitPage("Conducted");
                      }}
                    >
                      <FaCalendarAlt /> Conducted Site visit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        navigate(isAdminContext ? "/bookings" : "/user/sales/bookings", {
                          state: { lead },
                        });
                      }}
                    >
                      <FaLock /> Bookings
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowMoreMenu(false);
                        alert("Merge Leads workflow is ready to connect.");
                      }}
                    >
                      <FaExchangeAlt /> Merge Leads
                    </button>
                  </div>
                )}
              </div>
            </div>
            {statusMessage && <div className="crm-muted">{statusMessage}</div>}
          </section>

          <section className="crm-overview-grid">
            {overview.map(([label, count]) => (
              <div className="crm-overview-card" key={label}>
                <div className="crm-label">{label}</div>
                <strong>{count}</strong>
              </div>
            ))}
          </section>

          <div className="crm-main-grid">
            <aside className="crm-panel">
              <div className="crm-panel-head">
                <h2>Lead Information</h2>
                <FaUserTie />
              </div>
              <div className="crm-panel-body">
                {[
                  ["Status", currentStatus],
                  ["Assigned To", owner],
                  ["Source", source],
                  ["Project", projectInterest],
                  ["Configuration", valueOf(lead, ["configration", "configuration"], "-")],
                  ["Budget", valueOf(lead, ["budget", "budgetMax", "budgetMin"], "-")],
                  ["Location", valueOf(lead, ["locationPreferences", "city"], "-")],
                  ["Property Type", valueOf(lead, ["propertyType", "type"], "-")],
                  ["Funding Source", valueOf(lead, ["fundingSource"], "-")],
                  ["Tags", valueOf(lead, ["tags"], "-")],
                ].map(([label, value]) => (
                  <div className="crm-info-row" key={label}>
                    <div className="crm-label">{label}</div>
                    <div className="crm-value">{value}</div>
                  </div>
                ))}
              </div>
            </aside>

            <section className="crm-workspace">
              {(activeTab === "Notes" || activeTab === "Activity") && (
                <div className="crm-panel">
                  <div className="crm-panel-head">
                    <h2>{editingNoteId ? "Edit Note" : "Add Note"}</h2>
                    {editingNoteId && (
                      <button
                        className="crm-small-btn"
                        type="button"
                        onClick={() => {
                          setEditingNoteId(null);
                          setNoteDraft("");
                        }}
                      >
                        <FaTimes /> Cancel
                      </button>
                    )}
                  </div>
                  <div className="crm-panel-body">
                    <div className="crm-note-box">
                      <textarea
                        ref={noteInputRef}
                        value={noteDraft}
                        onChange={(event) => setNoteDraft(event.target.value)}
                        placeholder="Add note for lead. Use @name to mention a user."
                      />
                      <div className="crm-form-actions">
                        <button className="crm-small-btn primary crm-note-save" disabled={isSavingNote} type="button" onClick={saveNote}>
                          <FaSave /> {isSavingNote ? "Saving..." : "Save Note"}
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Follow-ups" && (
                <div className="crm-panel">
                  <div className="crm-panel-head">
                    <h2>Schedule Follow-up</h2>
                  </div>
                  <div className="crm-panel-body">
                    <div className="crm-followup-form">
                      <input
                        value={followupDraft}
                        onChange={(event) => setFollowupDraft(event.target.value)}
                        placeholder="Follow-up purpose"
                      />
                      <input
                        type="datetime-local"
                        value={followupDate}
                        onChange={(event) => setFollowupDate(event.target.value)}
                      />
                      <button className="crm-small-btn primary" type="button" onClick={scheduleFollowup}>
                        <FaCalendarAlt /> Schedule Follow-up
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === "Site Visits" && (
                <div className="crm-panel">
                  <div className="crm-panel-head">
                    <h2>Site Visit</h2>
                  </div>
                  <div className="crm-panel-body">
                    <div className="crm-visit-link-panel">
                      <p>Open the Site Visits page to create, conduct, or update this lead visit.</p>
                      <button
                        className="crm-small-btn primary crm-note-save"
                        type="button"
                        onClick={() => {
                          if (isAdminContext) {
                            const params = new URLSearchParams();
                            if (leadId) params.set("leadId", leadId);
                            navigate(`/SiteVists${params.toString() ? `?${params.toString()}` : ""}`, {
                              state: { lead },
                            });
                            return;
                          }
                          openSalesSiteVisitPage();
                        }}
                      >
                        <FaMapMarkerAlt /> Open Site Visit
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="crm-panel">
                <div className="crm-tabs">
                  {tabs.map((tab) => (
                    <button
                      className={activeTab === tab ? "active" : ""}
                      key={tab}
                      type="button"
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </div>

                <div className="crm-timeline">
                  {Object.keys(groupedActivities).length === 0 ? (
                    <div className="crm-empty">No records found for {activeTab}.</div>
                  ) : (
                    Object.entries(groupedActivities).map(([day, dayActivities]) => (
                      <div className="crm-day" key={day}>
                        <div className="crm-day-title">{day}</div>
                        {dayActivities.map((activity) => (
                          <article className="crm-activity" key={activity.id}>
                            <div className="crm-activity-top">
                              <div>
                                <div className="crm-activity-title">
                                  {activity.icon}
                                  {activity.title}
                                </div>
                                <p>{activity.description}</p>
                              </div>
                              {activity.type === "Notes" && (
                                <div className="crm-note-actions">
                                  <button className="crm-small-btn" type="button" onClick={() => togglePinNote(activity.source)}>
                                    <FaStar /> {activity.source.pinned ? "Unpin" : "Pin"}
                                  </button>
                                  <button className="crm-small-btn" type="button" onClick={() => editNote(activity.source)}>
                                    <FaEdit /> Edit
                                  </button>
                                  <button className="crm-small-btn danger" type="button" onClick={() => deleteNote(activity.source)}>
                                    <FaTrash /> Delete
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="crm-muted">
                              {activity.meta} | {formatDateTime(activity.createdAt)}
                            </div>
                          </article>
                        ))}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>
          </div>

          <section className="crm-bottom-grid">
            <div className="crm-panel">
              <div className="crm-panel-head">
                <h2>Follow-ups</h2>
                <span className="crm-muted">{upcomingFollowups.length} upcoming, {overdueFollowups.length} overdue</span>
              </div>
              <div className="crm-panel-body">
                {followups.length === 0 ? (
                  <div className="crm-empty">No follow-ups scheduled.</div>
                ) : (
                  followups.map((item) => (
                    <div className="crm-list-row" key={item.id}>
                      <div className="crm-value">{item.title}</div>
                      <div className="crm-muted">{formatDateTime(item.dueAt)} | {item.status}</div>
                      <div className="crm-action-bar">
                        <button className="crm-small-btn" type="button" onClick={() => updateFollowupStatus(item, "Done")}>Mark Done</button>
                        <button className="crm-small-btn" type="button" onClick={() => updateFollowupStatus(item, "Rescheduled")}>Reschedule</button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="crm-panel">
              <div className="crm-panel-head">
                <h2>Site Visits</h2>
                <span className="crm-muted">{scheduledVisits.length} scheduled, {completedVisits.length} completed, {cancelledVisits.length} cancelled</span>
              </div>
              <div className="crm-panel-body">
                {visits.length === 0 ? (
                  <div className="crm-empty">No site visits found.</div>
                ) : (
                  visits.map((visit) => (
                    <div className="crm-list-row" key={visit.id}>
                      <div className="crm-value">{visit.project || projectInterest}</div>
                      <div className="crm-muted">{formatDateTime(visit.scheduledOn)} | {visit.status}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="crm-panel">
              <div className="crm-panel-head">
                <h2>Bookings & Audit</h2>
                <FaHistory />
              </div>
              <div className="crm-panel-body">
                {bookings.length === 0 ? (
                  <div className="crm-empty">No bookings found.</div>
                ) : (
                  bookings.map((booking) => (
                    <div className="crm-list-row" key={booking.id}>
                      <div className="crm-value">{booking.projectDetails || booking.customerName || "Booking"}</div>
                      <div className="crm-muted">
                        {formatDateOnly(booking.bookedOn || booking.createdAt)} | {formatMoney(booking.basePrice)} | {booking.stage || "-"}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </section>

          {!embedded && (
            <div className="crm-footer-actions">
              <button
                className="crm-small-btn crm-back-btn"
                type="button"
                onClick={() => navigate(detailsBackPath)}
              >
                <FaArrowLeft /> Back
              </button>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default UserDetails;
