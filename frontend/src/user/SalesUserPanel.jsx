import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  CalendarDays,
  ChevronDown,
  Menu,
  MoreVertical,
  Home,
  History,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  Phone,
  Search,
  Smartphone,
  UserCircle,
  Users,
  X,
} from "lucide-react";
import UserAddlead from "./userAddlead";
import UserConversationPanel from "./UserConversationPanel";
import UserDetails from "./userDetails";
import UserWhatsAppPage from "./UserWhatsAppPage";
import SalesFollowups from "../pages/sales/SalesFollowups";
import UserBookingForm from "./UserBookingForm";
import BookingPreviewModal from "./BookingPreviewModal";
import CallDispositionModal from "./CallDispositionModal";
import CallLogsTable from "../components/CallLogsTable";
import { getReportsSocket } from "../services/socketClient";
import UserSalesNotifications from "./UserSalesNotifications";
import UserSalesProfile from "./UserSalesProfile";
import { getMyNotifications } from "../services/userSalesApi";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const fallbackPanel = {
  user: {
    firstName: "Sales",
    lastName: "User",
    email: "sales@example.com",
    role: "SALES",
    department: "SALES",
  },
  stats: {
    assignedLeads: 0,
    newLeadsToday: 0,
    followupsDue: 0,
    followupsToday: 0,
    missedFollowups: 0,
    upcomingFollowups: 0,
    highPriorityFollowups: 0,
    siteVisits: 0,
    bookings: 0,
    tasks: 0,
  },
  leads: [],
  bookings: [],
  tasks: [],
};

// WhatsApp UI change: keep route-derived screens centralized so sidebar collapse restores on route changes.
const getScreenFromPath = (pathname) =>
  pathname === "/user/sales"
    ? "home"
    : pathname.endsWith("/leads")
    ? "leads"
    : pathname.endsWith("/bookings")
      ? "bookings"
    : pathname.endsWith("/details")
      ? "details"
      : pathname.endsWith("/whatsapp")
        ? "whatsapp"
        : pathname.endsWith("/calls/inbound") || pathname.endsWith("/calls/outbound") || pathname.endsWith("/calls")
          ? "calls"
          : pathname.endsWith("/disposition")
            ? "disposition"
            : pathname.endsWith("/my-call-logs") || pathname === "/my-call-logs"
              ? "callLogs"
              : pathname.endsWith("/followups")
                ? "followups"
                : pathname.endsWith("/site-visit")
                  ? "scheduleVisit"
                  : pathname.endsWith("/conversation")
                    ? "conversation"
                    : pathname.endsWith("/add-lead")
                      ? "addLead"
                      : pathname.endsWith("/profile")
                        ? "profile"
                        : pathname.endsWith("/notifications")
                          ? "notifications"
                      : "";

const statusLabel = {
  Fresh_Lead: "Fresh Lead",
  Prospect: "Prospect",
  Registered: "Registered",
  New: "New",
  Qualified: "Qualified",
  In_sourcing: "In sourcing",
  "In sourcing": "In sourcing",
  In_closing: "In closing",
  "In closing": "In closing",
  Booked: "Booked",
  Lost: "Lost",
  NP: "NP",
  Unqualified: "Unqualified",
};

const leadStageFilters = [
  { key: "all", label: "All" },
  { key: "new", label: "New" },
  { key: "qualified", label: "Qualified" },
  { key: "sourcing", label: "In sourcing" },
  { key: "closing", label: "In closing" },
  { key: "booked", label: "Booked" },
  { key: "Unqualified", label: "Unqualified" },
];

const dispositionLeadFilters = [
  { key: "disposition:Callback Later", label: "Callback Later" },
  { key: "disposition:Interested Project", label: "Interested Project" },
  { key: "disposition:Not Interested", label: "Not Interested" },
  { key: "disposition:Site Visit Scheduled", label: "Site Visit Scheduled" },
  { key: "disposition:Wrong Number", label: "Wrong Number" },
  { key: "disposition:No Answer", label: "No Answer" },
  { key: "disposition:Busy", label: "Busy" },
  { key: "disposition:Follow-up Required", label: "Follow-up Required" },
  { key: "disposition:Junk", label: "Junk" },
  { key: "disposition:Qualified", label: "Qualified" },
];

const initials = (name) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .slice(0, 2)
    .join("")
    .toUpperCase() || "SU";

const getName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  "Sales User";

const getUserId = (user) => user?.id ?? user?._id ?? user?.userId ?? "";

const getDisplayText = (value, fallback = "-") => {
  if (value === undefined || value === null || value === "") return fallback;
  if (typeof value === "string" || typeof value === "number") return String(value);

  if (Array.isArray(value)) {
    return value.map((item) => getDisplayText(item, "")).find(Boolean) || fallback;
  }

  if (typeof value === "object") {
    return (
      value.name ||
      value.unitName ||
      value.unitNo ||
      value.number ||
      value.label ||
      value.title ||
      value.description ||
      value.project?.name ||
      value.type ||
      value.category ||
      (value.id ? `#${value.id}` : fallback)
    );
  }

  return fallback;
};

const getSalesExecutiveName = (value) => {
  if (!value) return "";
  if (typeof value !== "object") return String(value);
  return getName(value);
};

const getProfilePhoto = (user) => {
  return user?.profilePhoto || "";
};

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  `Lead #${lead?.id}`;

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

const getActionPhone = (lead) => getLeadPhone(lead).replace(/[^\d+]/g, "");

const normalizePhoneDigits = (value) => String(value || "").replace(/\D/g, "");

const phoneMatches = (first, second) => {
  const firstDigits = normalizePhoneDigits(first);
  const secondDigits = normalizePhoneDigits(second);
  if (!firstDigits || !secondDigits) return false;
  if (firstDigits === secondDigits) return true;
  return firstDigits.length >= 10 &&
    secondDigits.length >= 10 &&
    firstDigits.slice(-10) === secondDigits.slice(-10);
};

const findLeadByPhoneInList = (leads, phone) =>
  (leads || []).find((lead) => phoneMatches(getLeadPhone(lead), phone)) || null;

const enrichLeadForInbound = (lead) => lead ? {
  ...lead,
  source:lead.source || lead.channelPartner || lead.tags || "",
  project:lead.project || lead.interestedProjects || lead.propertyType || "",
} : null;

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

const getLatestDisposition = (lead) =>
  Array.isArray(lead?.callLogs)
    ? lead.callLogs.find((call) => call?.disposition) || null
    : lead?.latestDisposition || null;

const isLeadDisposedFromCalling = (lead, localCallLog = null) => {
  const dispositionCall = localCallLog?.disposition ? localCallLog : getLatestDisposition(lead);
  if (!dispositionCall?.disposition) return false;
  const disposition = String(dispositionCall.disposition || "").trim();
  return Boolean(disposition);
};

const getDispositionFilterValue = (filterKey) =>
  String(filterKey || "").startsWith("disposition:")
    ? String(filterKey).slice("disposition:".length)
    : "";

const getCreatedLabel = (lead) => {
  const rawDate = lead?.createdAt || lead?.conductSiteDate || lead?.birthday;
  if (!rawDate) return "-";

  const createdDate = new Date(rawDate);
  if (Number.isNaN(createdDate.getTime())) return "-";

  const diffDays = Math.floor((Date.now() - createdDate.getTime()) / 86400000);
  if (diffDays <= 0) return "Today";
  if (diffDays === 1) return "1 day ago";
  return `${diffDays} days ago`;
};

const normalizeStageText = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .trim();

const getLeadStage = (lead) => {
  const values = [
    lead?.stage,
    lead?.leadStage,
    lead?.pipelineStage,
    lead?.status,
    lead?.tags,
  ]
    .map(normalizeStageText)
    .filter(Boolean);

  if (values.some((value) => value.includes("book"))) return "booked";
  if (values.some((value) => value.includes("closing") || value.includes("close") || value.includes("registered"))) return "closing";
  if (values.some((value) => value.includes("sourcing") || value.includes("source"))) return "sourcing";
  if (values.some((value) => value.includes("qualified") || value.includes("prospect"))) return "qualified";
  if (values.some((value) => value.includes("nurture") || value.includes("follow"))) return "nurture";
  return "new";
};

const isConfirmedBooking = (booking) => {
  const stage = normalizeStageText(booking?.stage || booking?.status);
  return stage === "booked" || stage === "confirmed";
};

const isBookedLead = (lead) =>
  getLeadStage(lead) === "booked" ||
  (lead?.bookings || []).some(isConfirmedBooking);

const taskStatusOptions = ["Open", "Completed", "Archived"];

const getTaskAttachments = (task) => {
  const rawAttachments = task?.attachments || task?.attachment || task?.files || [];
  const attachments = Array.isArray(rawAttachments) ? rawAttachments : [rawAttachments];

  return attachments
    .filter(Boolean)
    .map((attachment, index) => {
      if (typeof attachment === "string") {
        return { id: `${attachment}-${index}`, name: attachment, url: "" };
      }

      const name =
        attachment.name ||
        attachment.fileName ||
        attachment.filename ||
        attachment.originalName ||
        attachment.path ||
        attachment.url ||
        `Attachment ${index + 1}`;
      const url = attachment.url || attachment.path || attachment.fileUrl || attachment.location || "";

      return { id: `${name}-${index}`, name, url };
    });
};

const getAttachmentHref = (attachment) => {
  if (!attachment?.url) return "";
  if (/^(https?:|blob:|data:)/i.test(attachment.url)) return attachment.url;
  return attachment.url.startsWith("/") ? attachment.url : `/${attachment.url}`;
};
const siteVisitStatusOptions = [
  "Scheduled",
  "Confirmed",
  "Visit Done",
  "Visit Missed",
  "Cancelled",
  "Rescheduled",
];

const emptyBookingForm = {
  projectId: "",
  unit: "",
  unitId: "",
  unitItemId: "",
  idempotencyKey: "",
  customerName: "",
  phone: "",
  email: "",
  dob: "",
  panNumber: "",
  aadhaarNumber: "",
  stage: "Booked",
  projectDetails: "",
  bookedOn: "",
  saleableArea: "",
  basePrice: "",
  baseRate: "",
  campaign: "walkin",
  source: "",
  subSource: "",
  channelPartner: "",
  companyName: "",
  numberOfSeats: "",
  physicalSeats: "",
  carpetArea: "",
  tenureMonths: "",
  perSeatPrice: "",
  monthlyRevenue: "",
  noticePeriodMonths: "",
  lockInPeriod: "",
  securityDeposit: "",
  leaseStartDate: "",
  leaseEndDate: "",
};

const bookingSteps = [
  "Filter Project",
  "Select Unit",
  "Booking Confirmation",
];
const salesTablePageSize = 10;

const getDefaultVisitDateTime = () => {
  const date = new Date();
  date.setHours(date.getHours() + 2, 0, 0, 0);
  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const toDateTimeLocalValue = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return getDefaultVisitDateTime();

  const timezoneOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - timezoneOffset).toISOString().slice(0, 16);
};

const getProjectName = (project) =>
  project?.projectName ||
  project?.project_name ||
  project?.name ||
  project?.title ||
  project?.label ||
  "";

const getCachedSiteVisitUpdate = (leadId) => {
  return null;
};

const getCachedLeadStatusUpdates = () => {
  return {};
};

const applyCachedLeadStatusUpdates = (leads = []) => {
  const cachedUpdates = getCachedLeadStatusUpdates();

  return leads.map((lead) => {
    const update = cachedUpdates[String(getLeadId(lead))];
    return update ? { ...lead, ...update, status: update.status, score: update.score } : lead;
  });
};

const getPercent = (value, total) => {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
};

const formatTaskDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
};

const formatTaskDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const getDispositionDetail = (callLog) => {
  if (!callLog?.disposition) return "-";
  if (callLog.disposition === "Callback Later") {
    return callLog.nextFollowUpAt ? `Callback: ${formatTaskDateTime(callLog.nextFollowUpAt)}` : "Callback time pending";
  }
  if (callLog.disposition === "Site Visit Scheduled") {
    return callLog.visitDateTime ? `Visit: ${formatTaskDateTime(callLog.visitDateTime)}` : "Visit time pending";
  }
  return callLog.notes || callLog.interestedProject || formatTaskDateTime(callLog.createdAt);
};

const leadHasScheduledSiteVisit = (lead) =>
  Boolean(
    lead?.conductSiteVisit ||
    lead?.conductSiteDate ||
    lead?.siteVisitProject ||
    lead?.siteVisitDate ||
    lead?.siteVisitStatus ||
    lead?.visitStatus ||
    lead?.conductSiteStatus
  );

const getLeadSiteVisitDetail = (lead) => {
  const visitDate = lead?.conductSiteDate || lead?.siteVisitDate || lead?.siteVisitConductedOn;
  if (visitDate) return `Visit: ${formatTaskDateTime(visitDate)}`;
  return lead?.siteVisitProject || lead?.conductSiteVisit || lead?.siteVisitStatus || "Visit scheduled";
};

const getDateKey = (value) => {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const formatDashboardDate = () =>
  new Date().toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "short",
  });

const formatIndianCompactMoney = (value) => {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) return "";
  if (amount >= 10000000) return `Rs. ${(amount / 10000000).toFixed(amount % 10000000 ? 1 : 0)} Cr`;
  if (amount >= 100000) return `Rs. ${(amount / 100000).toFixed(amount % 100000 ? 1 : 0)} L`;
  return `Rs. ${amount.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
};

const formatDuration = (seconds = 0) => {
  const totalSeconds = Number(seconds) || 0;
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const remainingSeconds = totalSeconds % 60;

  if (hours) return `${hours}h ${minutes}m ${remainingSeconds}s`;
  if (minutes) return `${minutes}m ${remainingSeconds}s`;
  return `${remainingSeconds}s`;
};

const secondsSince = (timestamp, now) => {
  if (!timestamp) return 0;
  return Math.max(0, Math.floor((now - timestamp) / 1000));
};

const getTodayStartMs = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today.getTime();
};

const getAttendanceSessionKey = (userId) => userId ? `swamiAttendanceSessionStartedAt:${userId}` : "";

const getAttendanceSessionStartedAt = (attendance) => {
  const userId = attendance?.userId;
  const key = getAttendanceSessionKey(userId);
  if (!attendance || !key || attendance.logoutAt || attendance.status === "Logged Out") return null;

  const todayStartMs = getTodayStartMs();
  const storedValue = Number(localStorage.getItem(key));
  if (Number.isFinite(storedValue) && storedValue >= todayStartMs) return storedValue;

  const loginAt = new Date(attendance.loginAt || Date.now()).getTime();
  const startedAt = Math.max(Number.isNaN(loginAt) ? Date.now() : loginAt, todayStartMs);
  localStorage.setItem(key, String(startedAt));
  return startedAt;
};

const clearAttendanceSessionStart = (userId) => {
  const key = getAttendanceSessionKey(userId);
  if (key) localStorage.removeItem(key);
};

const withAttendanceLoadedAt = (attendance) =>
  attendance ? { ...attendance, loadedAt: Date.now(), sessionStartedAt:getAttendanceSessionStartedAt(attendance) } : null;

const attendanceSecondsValue = (primary, fallback = 0) => {
  const value = Number(primary);
  if (Number.isFinite(value)) return value;
  const fallbackValue = Number(fallback);
  return Number.isFinite(fallbackValue) ? fallbackValue : 0;
};

const getTimeGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

const formatNotificationTime = (value) => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const cleanNotificationDescription = (value) =>
  String(value || "")
    .split("\n")
    .filter((line) => !/^(LEAD_ASSIGNED|TASK_ASSIGNED):/.test(line))
    .join("\n")
    .trim();

const SalesUserPanel = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const initialScreen =
    new URLSearchParams(window.location.search).get("screen") ||
    getScreenFromPath(window.location.pathname) ||
    "home";
  const [panel, setPanel] = useState(fallbackPanel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeScreen, setActiveScreen] = useState(initialScreen);
  const [activeLeadStage, setActiveLeadStage] = useState("all");
  const [activeFollowupFilter, setActiveFollowupFilter] = useState(
    new URLSearchParams(window.location.search).get("filter") || "today"
  );
  const [openActionLeadId, setOpenActionLeadId] = useState(null);
  const [focusedCallLeadId, setFocusedCallLeadId] = useState(
    new URLSearchParams(window.location.search).get("leadId") || null
  );
  const [callDispositions, setCallDispositions] = useState({});
  const [callLogsByLead, setCallLogsByLead] = useState({});
  const [callLogCount, setCallLogCount] = useState(0);
  const [inboundCallCount, setInboundCallCount] = useState(0);
  const [callTarget, setCallTarget] = useState(null);
  const [activeCallId, setActiveCallId] = useState(null);
  const [activeBlockedCall, setActiveBlockedCall] = useState(null);
  const [currentCallRequest, setCurrentCallRequest] = useState(null);
  const [outboundCallStatus, setOutboundCallStatus] = useState("idle");
  const [callError, setCallError] = useState("");
  const [startingCallLeadId, setStartingCallLeadId] = useState(null);
  const [activeCallDispositionTab, setActiveCallDispositionTab] = useState("Callback Later");
  const [disposedLeadIds, setDisposedLeadIds] = useState([]);
  const [dispositionTarget, setDispositionTarget] = useState(null);
  const [dispositionInitialValue, setDispositionInitialValue] = useState("");
  const [callNow, setCallNow] = useState(Date.now());
  const [siteVisitLead, setSiteVisitLead] = useState(null);
  const [siteVisitForm, setSiteVisitForm] = useState({
    leadId: "",
    project: "",
    visitDateTime: getDefaultVisitDateTime(),
    location: "",
    executiveId: "",
    executive: "",
    note: "",
    status: "Scheduled",
  });
  const [siteVisitMessage, setSiteVisitMessage] = useState("");
  const [isSavingSiteVisit, setIsSavingSiteVisit] = useState(false);
  const [bookingLead, setBookingLead] = useState(null);
  const [bookingForm, setBookingForm] = useState(emptyBookingForm);
  const [isBookingFormOpen, setIsBookingFormOpen] = useState(false);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [bookingProjectMessage, setBookingProjectMessage] = useState("");
  const [bookingStepIndex, setBookingStepIndex] = useState(0);
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingPreview, setBookingPreview] = useState(null);
  const [viewTask, setViewTask] = useState(null);
  const [leadTableSearch, setLeadTableSearch] = useState("");
  const [leadTablePage, setLeadTablePage] = useState(1);
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceNow, setAttendanceNow] = useState(Date.now());
  // Dashboard detail pages reuse this sidebar state so focused workspaces can auto-collapse it.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    initialScreen === "whatsapp" || initialScreen === "details"
  );
  const [timeGreeting, setTimeGreeting] = useState(() => getTimeGreeting());
  const [mcubeWidgetUrl, setMcubeWidgetUrl] = useState("");
  const [mcubeWidgetMeta, setMcubeWidgetMeta] = useState({});
  const [mcubeWidgetVisible, setMcubeWidgetVisible] = useState(false);
  const [mcubeWidgetStatus, setMcubeWidgetStatus] = useState("loading");
  const [activeModal, setActiveModal] = useState(null);
  const mcubeWidgetConfigLoadedRef = useRef("");
  const outboundRequestInProgressRef = useRef(false);
  const [inboundCall, setInboundCall] = useState(null);
  const [isInboundNoticeDismissed, setIsInboundNoticeDismissed] = useState(false);
  const [isInboundPopupOpen, setIsInboundPopupOpen] = useState(false);
  const [salesNotifications, setSalesNotifications] = useState([]);
  const [salesUnreadCount, setSalesUnreadCount] = useState(0);
  const [isSalesNotificationsOpen, setIsSalesNotificationsOpen] = useState(false);

  const loadPanel = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
    }

      const token = localStorage.getItem("authToken");
      const savedUser = JSON.parse(localStorage.getItem("authUser") || "null");

      if (!token) {
        setPanel((current) => ({ ...current, user: savedUser || current.user }));
        setLoading(false);
        return;
      }

      try {
        const response = await fetch(`${API_URL}/users/access-panel`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const result = await response.json();

        if (response.status === 401) {
          localStorage.removeItem("authToken");
          localStorage.removeItem("authUser");
          window.location.href = "/sign-in";
          return;
        }

        if (!response.ok) {
          throw new Error(result?.message || "Unable to load user panel");
        }

        setPanel({
          ...result,
          leads: applyCachedLeadStatusUpdates(result.leads || []),
          user: {
            ...result.user,
            profilePhoto: result.user?.profilePhoto || savedUser?.profilePhoto || getProfilePhoto(result.user),
          },
        });
      } catch (err) {
        setPanel((current) => ({ ...current, user: savedUser || current.user }));
        setError(err.message);
      } finally {
        setLoading(false);
      }
  }, []);

  useEffect(() => {
    loadPanel();
  }, [loadPanel]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token || !panel.user?.id) return;
    const configKey = `${panel.user.id}:${token}`;
    if (mcubeWidgetConfigLoadedRef.current === configKey) return;
    mcubeWidgetConfigLoadedRef.current = configKey;

    let isMounted = true;
    const loadMcubeWidget = async () => {
      try {
        setMcubeWidgetStatus("loading");
        const response = await fetch(`${API_URL}/api/calls/browser-phone/widget`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (response.ok && isMounted) {
          setMcubeWidgetUrl(result.widgetUrl || "");
          setMcubeWidgetMeta({
            agentExtension:result.agentExtension || "",
            agentCallingMode:result.agentCallingMode || "",
            mcubeUsername:result.mcubeUsername || "",
          });
          setMcubeWidgetStatus(result.widgetUrl ? "registered" : "offline");
        } else if (isMounted) {
          setMcubeWidgetStatus("error");
        }
      } catch (error) {
        if (isMounted) {
          setMcubeWidgetUrl("");
          setMcubeWidgetMeta({});
          setMcubeWidgetStatus("error");
        }
      }
    };

    loadMcubeWidget();
    return () => {
      isMounted = false;
    };
  }, [panel.user?.id]);

  const isLiveOutboundStatus = useCallback(
    (status) => ["initiating", "calling", "ringing", "connected"].includes(String(status || "").toLowerCase()),
    []
  );
  const isFinalOutboundStatus = useCallback(
    (status) => ["completed", "failed", "busy", "no-answer", "canceled", "rejected", "missed"].includes(String(status || "").toLowerCase()),
    []
  );
  const normalizeOutboundStatus = useCallback((status) => {
    const normalized = String(status || "initiated").toLowerCase().replace(/[_\s]+/g, "-");
    const aliases = {
      initiated:"ringing",
      queued:"ringing",
      calling:"ringing",
      answered:"connected",
      "in-progress":"connected",
      hangup:"completed",
      noanswer:"no-answer",
      no_answer:"no-answer",
      cancelled:"canceled",
      rejected:"failed",
    };
    return aliases[normalized] || normalized;
  }, []);
  const resetOutboundCallState = useCallback(() => {
    outboundRequestInProgressRef.current = false;
    setOutboundCallStatus("idle");
    setActiveCallId(null);
    setCurrentCallRequest(null);
    setCallTarget(null);
    setStartingCallLeadId(null);
    setCallError("");
    setActiveBlockedCall(null);
  }, []);
  const hideMcubeWidget = useCallback(() => setMcubeWidgetVisible(false), []);
  const showMcubeWidget = useCallback(() => setMcubeWidgetVisible(true), []);
  const isMcubeWidgetControlScreen = activeScreen === "calls";
  const isMcubeWidgetPanelVisible = isMcubeWidgetControlScreen && mcubeWidgetVisible;

  useEffect(() => {
    const userId = getUserId(panel.user);
    if (!userId) return undefined;

    let isMounted = true;
    const inboundEvents = [
      "mcube:inbound:ringing",
      "mcube:inbound:answered",
      "mcube:inbound:connected",
      "mcube:inbound:ended",
      "mcube:inbound:completed",
      "mcube:inbound:missed",
      "mcube:inbound:recording-ready",
      "mcube:inbound:failed",
    ];

    const handleInboundCall = (call) => {
      if (!isMounted || !call) return;
      const matchedLead = call.lead || findLeadByPhoneInList(
        panel.leads,
        call.callerNumber || call.customerNumber || call.leadPhone || call.phone
      );
      const enrichedCall = matchedLead ? { ...call, lead:enrichLeadForInbound(matchedLead) } : call;
      setInboundCall((current) => {
        const sameCall = current?.providerCallId === enrichedCall.providerCallId || current?.callLogId === enrichedCall.callLogId;
        if (!sameCall) {
          setInboundCallCount((count) => count + 1);
          setCallLogCount((count) => count + 1);
        }
        return sameCall ? { ...current, ...enrichedCall } : enrichedCall;
      });
      setIsInboundNoticeDismissed(false);
      setIsInboundPopupOpen(true);
      if (enrichedCall.lead?.id) {
        setCallLogsByLead((current) => ({
          ...current,
          [enrichedCall.lead.id]: {
            ...(current[enrichedCall.lead.id] || {}),
            id: enrichedCall.callLogId,
            leadId: enrichedCall.lead.id,
            status: enrichedCall.status,
            startedAt: enrichedCall.startedAt,
            connectedAt: enrichedCall.connectedAt,
            endedAt: enrichedCall.endedAt,
            duration: enrichedCall.duration,
            notes: "MCube inbound",
          },
        }));
      }
    };

    getReportsSocket()
      .then((socket) => {
        if (!isMounted) return;
        socket.emit("register", String(userId));
        inboundEvents.forEach((eventName) => socket.on(eventName, handleInboundCall));
      })
      .catch((socketError) => {
        console.error("Unable to connect inbound call socket:", socketError);
      });

    return () => {
      isMounted = false;
      getReportsSocket()
        .then((socket) => inboundEvents.forEach((eventName) => socket.off(eventName, handleInboundCall)))
        .catch(() => {});
    };
  }, [panel.leads, panel.user]);

  const loadSalesNotifications = useCallback(async () => {
    try {
      const result = await getMyNotifications({ page:1, limit:10 });
      setSalesNotifications(
        (Array.isArray(result.data) ? result.data : [])
          .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
          .slice(0, 10)
      );
      setSalesUnreadCount(Number(result.unreadCount) || 0);
    } catch (notificationError) {
      console.error("Unable to load sales notifications:", notificationError);
    }
  }, []);

  useEffect(() => {
    const userId = getUserId(panel.user);
    if (!userId) return undefined;

    let isMounted = true;
    const mergeNotification = (notification) => {
      if (!isMounted || !notification) return;
      setSalesNotifications((current) => [notification, ...current.filter((item) => item.id !== notification.id)].slice(0, 10));
      if (!notification.isRead) setSalesUnreadCount((count) => count + 1);
    };
    const replaceNotifications = (notifications) => {
      if (!isMounted || !Array.isArray(notifications)) return;
      if (notifications.length > 0) {
        setSalesNotifications((current) =>
          [...notifications, ...current]
            .filter((item, index, items) => item?.id && items.findIndex((next) => next.id === item.id) === index)
            .sort((first, second) => new Date(second.createdAt || 0) - new Date(first.createdAt || 0))
            .slice(0, 10)
        );
      }
      setSalesUnreadCount(notifications.filter((item) => !item.isRead).length);
    };

    loadSalesNotifications();
    getReportsSocket()
      .then((socket) => {
        if (!isMounted) return;
        socket.emit("register", String(userId));
        socket.on(`notification-${userId}`, replaceNotifications);
        socket.on(`newNotification-${userId}`, mergeNotification);
      })
      .catch((socketError) => {
        console.error("Unable to connect sales notification socket:", socketError);
      });

    return () => {
      isMounted = false;
      getReportsSocket()
        .then((socket) => {
          socket.off(`notification-${userId}`, replaceNotifications);
          socket.off(`newNotification-${userId}`, mergeNotification);
        })
        .catch(() => {});
    };
  }, [loadSalesNotifications, panel.user]);

  useEffect(() => {
    if (isSalesNotificationsOpen) loadSalesNotifications();
  }, [isSalesNotificationsOpen, loadSalesNotifications]);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    const userId = getUserId(panel.user);
    if (!token || !userId) return;

    let isMounted = true;
    const toInboundCardCall = (callLog) => {
      if (!callLog) return null;
      const matchedLead = callLog.lead || findLeadByPhoneInList(
        panel.leads,
        callLog.callerNumber || callLog.customerNumber || callLog.leadPhone || callLog.phone
      );
      return {
        id:callLog.id,
        callLogId:callLog.id,
        providerCallId:callLog.providerCallId || callLog.callId || "",
        direction:"inbound",
        status:callLog.status || "calling",
        providerStatus:callLog.providerStatus || "",
        callerNumber:callLog.callerNumber || callLog.customerNumber || callLog.leadPhone || callLog.phone || "",
        customerNumber:callLog.customerNumber || callLog.leadPhone || callLog.phone || "",
        virtualNumber:callLog.virtualNumber || "",
        agentNumber:callLog.agentNumber || callLog.agentPhone || "",
        agentExtension:callLog.agentExtension || "",
        agentName:getName(callLog.agent),
        campaignId:callLog.campaignName || "",
        queueId:callLog.queueName || "",
        startedAt:callLog.startedAt || callLog.createdAt,
        answeredAt:callLog.answeredAt || callLog.connectedAt || null,
        connectedAt:callLog.connectedAt || callLog.answeredAt || null,
        endedAt:callLog.endedAt || null,
        duration:callLog.duration || 0,
        recordingUrl:callLog.recordingUrl ? "available" : "",
        recordingStatus:callLog.recordingUrl ? "available" : "pending",
        disconnectedBy:callLog.disconnectedBy || "",
        disposition:callLog.disposition || "",
        lead:enrichLeadForInbound(matchedLead),
      };
    };

    const loadActiveInbound = async () => {
      try {
        const response = await fetch(`${API_URL}/api/calls/active-inbound`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || "Unable to restore inbound call");
        if (isMounted && result.callLog) {
          setInboundCall(toInboundCardCall(result.callLog));
          setIsInboundNoticeDismissed(false);
        }
      } catch (loadError) {
        console.error("Unable to restore active inbound call:", loadError);
      }
    };

    loadActiveInbound();
    return () => {
      isMounted = false;
    };
  }, [panel.user]);

  useEffect(() => {
    let isMounted = true;

    const loadCallCounts = async () => {
      const token = localStorage.getItem("authToken");
      if (!token) {
        if (isMounted) {
          setCallLogCount(0);
          setInboundCallCount(0);
        }
        return;
      }

      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [allResponse, inboundResponse] = await Promise.all([
          fetch(`${API_URL}/api/calls/my?limit=1`, { headers }),
          fetch(`${API_URL}/api/calls/inbound?limit=1`, { headers }),
        ]);
        const result = await allResponse.json().catch(() => ({}));
        const inboundResult = await inboundResponse.json().catch(() => ({}));
        if (!allResponse.ok) throw new Error(result?.message || "Unable to load call log count");
        if (!inboundResponse.ok) throw new Error(inboundResult?.message || "Unable to load inbound call count");
        if (isMounted) {
          setCallLogCount(Number(result?.totalItems) || (Array.isArray(result?.data) ? result.data.length : 0));
          setInboundCallCount(Number(inboundResult?.totalItems) || (Array.isArray(inboundResult?.data) ? inboundResult.data.length : 0));
        }
      } catch (loadError) {
        console.error("Unable to load call counts", loadError);
      }
    };

    loadCallCounts();
    const interval = window.setInterval(loadCallCounts, 15000);

    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  useEffect(() => {
    if (activeScreen !== "calls" && activeScreen !== "callLogs") return;
    const token = localStorage.getItem("authToken");
    if (!token) return;

    let isMounted = true;
    const refreshVisibleCallCounts = async () => {
      try {
        const headers = { Authorization: `Bearer ${token}` };
        const [allResponse, inboundResponse] = await Promise.all([
          fetch(`${API_URL}/api/calls/my?limit=1`, { headers }),
          fetch(`${API_URL}/api/calls/inbound?limit=1`, { headers }),
        ]);
        const result = await allResponse.json().catch(() => ({}));
        const inboundResult = await inboundResponse.json().catch(() => ({}));
        if (isMounted && allResponse.ok) {
          setCallLogCount(Number(result?.totalItems) || (Array.isArray(result?.data) ? result.data.length : 0));
        }
        if (isMounted && inboundResponse.ok) {
          setInboundCallCount(Number(inboundResult?.totalItems) || (Array.isArray(inboundResult?.data) ? inboundResult.data.length : 0));
        }
      } catch (loadError) {
        console.error("Unable to refresh visible call counts", loadError);
      }
    };

    refreshVisibleCallCounts();
    return () => {
      isMounted = false;
    };
  }, [activeScreen]);

  const updateAttendance = useCallback(async (action) => {
    const token = localStorage.getItem("authToken");
    if (!token) return null;

    setAttendanceBusy(true);

    try {
      const response = await fetch(`${API_URL}/attendance/${action}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Unable to update attendance");
      }

      const attendanceData = withAttendanceLoadedAt(result?.data);
      setAttendance(attendanceData);
      return attendanceData;
    } catch (err) {
      alert(err.message || "Unable to update attendance");
      return null;
    } finally {
      setAttendanceBusy(false);
    }
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return;

    let isMounted = true;

    const loadAttendance = async () => {
      try {
        const currentResponse = await fetch(`${API_URL}/attendance/me`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const currentResult = await currentResponse.json().catch(() => ({}));

        if (currentResult?.data && currentResult.data.status !== "Logged Out") {
          if (isMounted) setAttendance(withAttendanceLoadedAt(currentResult.data));
          return;
        }

        const startResponse = await fetch(`${API_URL}/attendance/login`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const startResult = await startResponse.json().catch(() => ({}));
        if (isMounted) setAttendance(withAttendanceLoadedAt(startResult?.data));
      } catch (error) {
        console.error("Unable to load attendance", error);
      }
    };

    loadAttendance();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return undefined;



    let isMounted = true;
    const markAttendanceActive = async () => {
      try {
        const response = await fetch(`${API_URL}/attendance/login`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
        const result = await response.json().catch(() => ({}));
        if (isMounted && response.ok && result?.data) {
          setAttendance(withAttendanceLoadedAt(result.data));
        }
      } catch (error) {
        console.error("Unable to refresh attendance heartbeat", error);
      }
    };

    const heartbeatId = window.setInterval(markAttendanceActive, 60000);
    return () => {
      isMounted = false;
      window.clearInterval(heartbeatId);
    };
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setTimeGreeting(getTimeGreeting());
    }, 60000);



    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setAttendanceNow(Date.now());
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, []);

  useEffect(() => {
    let isMounted = true;

    const loadProjects = async () => {
      const projectEndpoints = [
        `${API_URL}/projects`,
        `${API_URL}/api/projects`,
        `${API_URL}/project`,
        `${API_URL}/api/project`,
      ];

      setIsLoadingProjects(true);

      for (const endpoint of projectEndpoints) {
        try {
          const response = await fetch(endpoint);
          if (!response.ok) continue;

          const result = await response.json();
          const projectList = Array.isArray(result)
            ? result
            : result?.data || result?.projects || result?.items || [];

          if (!Array.isArray(projectList)) continue;

          if (isMounted) {
            setProjects(projectList.filter((project) => getProjectName(project)));
          }
          setIsLoadingProjects(false);
          return;
        } catch (error) {
          console.error("Unable to load projects from endpoint:", endpoint, error);
        }
      }

      if (isMounted) {
        setProjects([]);
        setIsLoadingProjects(false);
      }
    };

    loadProjects();

    return () => {
      isMounted = false;
    };
  }, [API_URL]);

  useEffect(() => {
    let isMounted = true;

    const loadUsers = async () => {
      setIsLoadingUsers(true);

      try {
        const response = await fetch(`${API_URL}/users?limit=1000`);
        if (!response.ok) throw new Error("Unable to load users");

        const result = await response.json();
        const userList = Array.isArray(result)
          ? result
          : result?.data || result?.users || [];

        if (isMounted) {
          setUsers(Array.isArray(userList) ? userList : []);
        }
      } catch (error) {
        console.error("Unable to load sales executives:", error);
        if (isMounted) setUsers([]);
      } finally {
        if (isMounted) setIsLoadingUsers(false);
      }
    };

    loadUsers();

    return () => {
      isMounted = false;
    };
  }, []);

  // WhatsApp UI change: browser back/forward also restores the matching sidebar state.
  useEffect(() => {
    const screenFromSearch = new URLSearchParams(location.search).get("screen");
    const screenFromPath = screenFromSearch || getScreenFromPath(location.pathname);
    if (!screenFromPath) return;

    setActiveScreen((current) => (current === screenFromPath ? current : screenFromPath));
    setPanel((current) => ({
      ...current,
      leads: applyCachedLeadStatusUpdates(current.leads),
    }));

    if (screenFromPath === "followups") {
      setActiveFollowupFilter(new URLSearchParams(location.search).get("filter") || "today");
    }

    const focusedLeadId = new URLSearchParams(location.search).get("leadId");
    if (screenFromPath === "calls" && focusedLeadId) {
      setFocusedCallLeadId(focusedLeadId);
    }

    if (location.state?.refreshPanel) {
      loadPanel(false);
    }
  }, [loadPanel, location.pathname, location.search, location.state?.refreshPanel]);

  // Dashboard detail pages auto-collapse the existing sidebar; other routes restore normal behavior.
  useEffect(() => {
    setIsSidebarCollapsed(activeScreen === "whatsapp" || activeScreen === "details");
  }, [activeScreen]);

  const userName = getName(panel.user);
  const userProfilePhoto = getProfilePhoto(panel.user);
  const unreadSalesNotifications = salesUnreadCount;
  const callQueue = useMemo(() => {
    return panel.leads.filter((lead) => {
      const leadId = String(getLeadId(lead));
      if (disposedLeadIds.includes(leadId)) return false;
      return !isLeadDisposedFromCalling(lead, callLogsByLead[leadId]);
    });
  }, [callLogsByLead, disposedLeadIds, panel.leads]);

  const getLeadDisposition = useCallback(
    (lead) => {
      const leadId = String(getLeadId(lead));
      return callLogsByLead[leadId]?.disposition
        ? callLogsByLead[leadId]
        : getLatestDisposition(lead);
    },
    [callLogsByLead]
  );

  const callDispositionBuckets = useMemo(() => {
    return dispositionLeadFilters.map((filter) => {
      const disposition = getDispositionFilterValue(filter.key);
      const leads = panel.leads
        .map((lead) => ({
          lead,
          callLog:getLeadDisposition(lead),
        }))
        .filter((item) => item.callLog?.disposition === disposition);

      return {
        ...filter,
        disposition,
        leads,
      };
    });
  }, [getLeadDisposition, panel.leads]);

  const activeCallDispositionBucket =
    callDispositionBuckets.find((bucket) => bucket.disposition === activeCallDispositionTab) ||
    callDispositionBuckets[0];

  useEffect(() => {
    const interval = window.setInterval(() => setCallNow(Date.now()), 1000);
    return () => {
      window.clearInterval(interval);
      outboundRequestInProgressRef.current = false;
    };
  }, []);

  useEffect(() => {
    const activeLogs = Object.values(callLogsByLead).filter(
      (log) => log?.id && !["completed", "failed", "no-answer", "busy", "canceled"].includes(String(log.status).toLowerCase())
    );
    if (!activeLogs.length) return undefined;

    const poll = async () => {
      const token = localStorage.getItem("authToken");
      await Promise.all(activeLogs.map(async (log) => {
        try {
          const response = await fetch(`${API_URL}/api/calls/status/${log.id}`, {
            headers:token ? { Authorization:`Bearer ${token}` } : {},
          });
          const result = await response.json().catch(() => ({}));
          if (!response.ok || !result.callLog) return;
          const nextLog = result.callLog;
          setCallLogsByLead((current) => ({ ...current, [nextLog.leadId]:nextLog }));
          const nextStatus = normalizeOutboundStatus(nextLog.status);
          if (isFinalOutboundStatus(nextStatus) && !nextLog.disposition) {
            const lead = panel.leads.find((item) => String(getLeadId(item)) === String(nextLog.leadId));
            if (lead) {
              outboundRequestInProgressRef.current = false;
              setOutboundCallStatus(nextStatus);
              setActiveCallId(null);
              setCurrentCallRequest(null);
              setDispositionInitialValue(nextLog.status === "no-answer" ? "No Answer" : nextLog.status === "busy" ? "Busy" : "");
              setCallTarget(null);
              setActiveModal("disposition");
              setDispositionTarget((current) => current || { lead, callLog:nextLog });
            }
          } else if (nextLog?.id === activeCallId && nextLog?.status) {
            setOutboundCallStatus(nextStatus);
          }
        } catch (pollError) {
          console.error("Unable to refresh call status:", pollError);
        }
      }));
    };

    poll();
    const interval = window.setInterval(poll, 3000);
    return () => window.clearInterval(interval);
  }, [activeCallId, callLogsByLead, isFinalOutboundStatus, normalizeOutboundStatus, panel.leads]);

  const connectedCallLeads = useMemo(() => {
    return panel.leads.filter((lead) => {
      const disposition = callDispositions[getLeadId(lead)]?.type;
      return disposition === "connected" || disposition === "qualified";
    });
  }, [callDispositions, panel.leads]);

  const callbackLeadIds = useMemo(() => {
    return new Set(
      Object.entries(callDispositions)
        .filter(([, disposition]) => disposition?.type === "callback")
        .map(([leadId]) => leadId)
    );
  }, [callDispositions]);

  const projectOptions = useMemo(() => {
    const projectNames = [
      ...projects.map(getProjectName),
      ...panel.leads.flatMap((lead) => [
        lead.siteVisitProject,
        lead.conductSiteVisit,
        lead.interestedProjects,
        lead.projectName,
        lead.project_name,
        lead.propertyType,
      ]),
    ]
      .map((value) => String(value || "").trim())
      .filter(Boolean);

    return Array.from(new Set(projectNames)).sort((first, second) =>
      first.localeCompare(second)
    );
  }, [panel.leads, projects]);

  const salesExecutiveOptions = useMemo(() => {
    const salesUsers = users.filter((user) => {
      if (user?.isActive === false) return false;

      const roleText = [user?.role, user?.department, user?.designation]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return roleText.includes("sales");
    });
    const candidates = salesUsers.length ? salesUsers : [panel.user].filter(Boolean);
    const seen = new Set();

    return candidates
      .map((user) => ({
        id: String(getUserId(user) || user?.email || getName(user)),
        name: getName(user),
        role: user?.role || user?.department || "",
      }))
      .filter((user) => {
        if (!user.id || seen.has(user.id)) return false;
        seen.add(user.id);
        return true;
      })
      .sort((first, second) => first.name.localeCompare(second.name));
  }, [panel.user, users]);

  const getExecutiveIdFromValue = useCallback(
    (value) => {
      if (!value) return "";
      if (typeof value === "object") {
        const id = getUserId(value);
        if (id) return String(id);
      }

      const executiveName = getSalesExecutiveName(value);
      const matchingExecutive = salesExecutiveOptions.find(
        (executive) =>
          String(executive.id) === String(executiveName) ||
          executive.name.toLowerCase() === executiveName.toLowerCase()
      );

      return matchingExecutive?.id || "";
    },
    [salesExecutiveOptions]
  );

  const getExecutiveNameFromId = useCallback(
    (executiveId) =>
      salesExecutiveOptions.find((executive) => String(executive.id) === String(executiveId))?.name || "",
    [salesExecutiveOptions]
  );

  useEffect(() => {
    if (!siteVisitForm.executive || siteVisitForm.executiveId) return;

    const executiveId = getExecutiveIdFromValue(siteVisitForm.executive);
    if (!executiveId) return;

    setSiteVisitForm((current) => ({
      ...current,
      executiveId,
      executive: getExecutiveNameFromId(executiveId) || current.executive,
    }));
  }, [
    getExecutiveIdFromValue,
    getExecutiveNameFromId,
    siteVisitForm.executive,
    siteVisitForm.executiveId,
  ]);

  const bookingLeadRows = useMemo(() => {
    const leadsById = new Map((panel.leads || []).map((lead) => [String(getLeadId(lead)), lead]));
    const rows = [];
    const seenLeadIds = new Set();

    (panel.bookings || [])
      .filter(isConfirmedBooking)
      .forEach((booking) => {
        const leadId = booking.leadId || booking.lead?.id || "";
        const leadKey = String(leadId || `booking-${booking.id}`);
        if (seenLeadIds.has(leadKey)) return;
        seenLeadIds.add(leadKey);

        const matchedLead = leadsById.get(String(leadId)) || booking.lead || null;
        const bookingLead = matchedLead
          ? {
              ...matchedLead,
              status:"Booked",
              bookings:[
                booking,
                ...((matchedLead.bookings || []).filter((item) => String(item?.id) !== String(booking.id))),
              ],
            }
          : {
              id:leadId || `booking-${booking.id}`,
              firstName:booking.customerName || "Booked",
              lastName:booking.customerName ? "" : "Lead",
              phones:booking.phone ? [{ type:"Mobile", value:booking.phone }] : [],
              status:"Booked",
              interestedProjects:booking.projectDetails || booking.project?.name || "",
              propertyType:booking.unit || booking.unitNumber || "",
              configration:booking.unit || booking.unitNumber || "",
              budget:booking.basePrice || booking.agreementValue || booking.totalConsideration || "",
              bookings:[booking],
            };

        rows.push(bookingLead);
      });

    return rows;
  }, [panel.bookings, panel.leads]);

  const filteredLeads = useMemo(() => {
    let leads = activeScreen === "bookings" ? bookingLeadRows : panel.leads;
    const activeDisposition = getDispositionFilterValue(activeLeadStage);

    if (activeScreen === "followups") {
      leads = leads.filter((lead) => {
        const status = normalizeStageText(lead.status);
        return status === "fresh lead" || status === "prospect" || status === "new" || callbackLeadIds.has(String(getLeadId(lead)));
      });
    }

    if (activeScreen === "bookings") {
      leads = leads.filter(isBookedLead);
    }

    if (activeScreen !== "bookings") {
      if (activeDisposition) {
        leads = leads.filter((lead) => {
          if (activeDisposition === "Site Visit Scheduled" && leadHasScheduledSiteVisit(lead)) return true;
          return getLeadDisposition(lead)?.disposition === activeDisposition;
        });
      } else if (activeLeadStage === "visited") {
        leads = leads.filter((lead) => lead.conductSiteVisit || lead.conductSiteDate);
      } else if (activeLeadStage !== "all") {
        leads = leads.filter((lead) => getLeadStage(lead) === activeLeadStage);
      }
    }

    return leads;
  }, [activeLeadStage, activeScreen, bookingLeadRows, callbackLeadIds, getLeadDisposition, panel.leads]);

  const isPaginatedLeadTable = activeScreen === "home" || activeScreen === "leads" || activeScreen === "bookings";
  const isSearchableLeadTable = activeScreen === "leads" || activeScreen === "bookings";

  const searchedLeads = useMemo(() => {
    if (!isSearchableLeadTable) return filteredLeads;

    const query = leadTableSearch.trim().toLowerCase();
    if (!query) return filteredLeads;

    return filteredLeads.filter((lead) =>
      [
        getLeadName(lead),
        getLeadPhone(lead),
        lead.email,
        lead.companyName,
        lead.interestedProjects,
        lead.propertyType,
        lead.configration,
        lead.budget,
        lead.status,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [filteredLeads, isSearchableLeadTable, leadTableSearch]);

  const leadTableTotalPages = Math.max(1, Math.ceil(searchedLeads.length / salesTablePageSize));
  const tableLeads =
    isPaginatedLeadTable
      ? searchedLeads.slice((leadTablePage - 1) * salesTablePageSize, leadTablePage * salesTablePageSize)
      : filteredLeads;
  const visibleRecordCount = isPaginatedLeadTable ? searchedLeads.length : filteredLeads.length;

  useEffect(() => {
    if (!isPaginatedLeadTable) return;

    setLeadTablePage(1);
  }, [activeLeadStage, activeScreen, isPaginatedLeadTable, leadTableSearch]);

  useEffect(() => {
    if (!isPaginatedLeadTable) return;

    setLeadTablePage((currentPage) => Math.min(currentPage, leadTableTotalPages));
  }, [activeScreen, isPaginatedLeadTable, leadTableTotalPages]);

  const funnelData = useMemo(() => {
    const leads = panel.leads;
    const totalLeads = leads.length;
    const qualified = leads.filter((lead) => getLeadStage(lead) === "qualified").length;
    const sourced = leads.filter((lead) => getLeadStage(lead) === "sourcing").length;
    const visited = leads.filter((lead) => lead.conductSiteVisit || lead.conductSiteDate).length;
    const booked = leads.filter(isBookedLead).length;

    return [
      {
        key: "all",
        label: "Leads",
        value: totalLeads,
        detail: "Leads",
        color: "#e6f1fb",
        textColor: "#0c447c",
        height: 100,
      },
      {
        key: "qualified",
        label: `Qualified - ${getPercent(qualified, totalLeads)}`,
        value: qualified,
        detail: "Qualified",
        color: "#b5d4f4",
        textColor: "#0c447c",
        height: 74,
      },
      {
        key: "sourcing",
        label: `Sourced - ${getPercent(sourced, qualified || totalLeads)}`,
        value: sourced,
        detail: "Sourced",
        color: "#85b7eb",
        textColor: "#042c53",
        height: 54,
      },
      {
        key: "visited",
        label: `Visited - ${getPercent(visited, sourced || qualified || totalLeads)}`,
        value: visited,
        detail: "Visited",
        color: "#378add",
        textColor: "#ffffff",
        height: 36,
      },
      {
        key: "booked",
        label: `Booked - ${getPercent(booked, visited || sourced || qualified || totalLeads)}`,
        value: booked,
        detail: "Booked",
        color: "#185fa5",
        textColor: "#ffffff",
        height: 24,
      },
    ];
  }, [panel.leads]);

  const homeMetrics = useMemo(() => {
    const todayKey = getDateKey(new Date());
    const currentMonthKey = todayKey.slice(0, 7);
    const todayLeads = panel.leads.filter((lead) => getDateKey(lead.createdAt || lead.received_on) === todayKey);
    const assignedNewLeads = panel.leads.filter((lead) => getLeadStage(lead) === "new");
    const backendNewLeadsToday = Number(panel.stats.newLeadsToday);
    const newLeadsTodayCount = Number.isFinite(backendNewLeadsToday) && backendNewLeadsToday > 0
      ? backendNewLeadsToday
      : todayLeads.length || assignedNewLeads.length;
    const todaysVisits = panel.leads.filter((lead) =>
      getDateKey(lead.conductSiteDate || lead.siteVisitDate || lead.siteVisitConductedOn) === todayKey
    );
    const completedVisitCount = todaysVisits.filter((lead) =>
      ["done", "completed", "conducted", "visit done"].some((status) =>
        normalizeStageText(lead.siteVisitStatus || lead.visitStatus || lead.conductSiteStatus).includes(status)
      )
    ).length;
    const upcomingVisitCount = Math.max(todaysVisits.length - completedVisitCount, 0);
    const monthBookings = (panel.bookings || []).filter((booking) =>
      getDateKey(booking.bookedOn || booking.createdAt).startsWith(currentMonthKey)
    );
    const bookedAmount = monthBookings.reduce(
      (total, booking) => total + (Number(booking.basePrice || booking.amount || booking.totalAmount) || 0),
      0
    );
    const missedCount = panel.stats.missedFollowups || 0;

    return [
      {
        key: "new-leads",
        label: "New leads today",
        value: newLeadsTodayCount,
        detail: newLeadsTodayCount ? "+ from assigned leads" : "No new leads yet",
        tone: "positive",
        onClick: () => {
          setActiveScreen("leads");
          setActiveLeadStage("new");
          navigate("/user/sales/leads");
        },
      },
      {
        key: "site-visits",
        label: "Site visits today",
        value: todaysVisits.length || panel.stats.siteVisits || 0,
        detail: `${completedVisitCount} done - ${upcomingVisitCount} upcoming`,
        onClick: () => {
          openScheduleVisit();
          navigate("/user/sales/site-visit");
        },
      },
      {
        key: "bookings",
        label: "Bookings MTD",
        value: monthBookings.length || panel.stats.bookings || 0,
        detail: bookedAmount ? `${formatIndianCompactMoney(bookedAmount)} booked` : "Booked this month",
        tone: "positive",
        onClick: () => {
          setActiveScreen("bookings");
          navigate("/user/sales/bookings");
        },
      },
      {
        key: "sla",
        label: "SLA breaches",
        value: missedCount,
        detail: missedCount ? "Needs reassignment" : "No breaches",
        tone: missedCount ? "danger" : "positive",
        onClick: () => {
          setActiveScreen("followups");
          setActiveFollowupFilter("missed");
          navigate("/user/sales/followups?filter=missed");
        },
      },
    ];
  }, [navigate, panel.bookings, panel.leads, panel.stats.bookings, panel.stats.missedFollowups, panel.stats.newLeadsToday, panel.stats.siteVisits]);

  const handleFunnelClick = (key) => {
    setActiveScreen("leads");
    setActiveLeadStage(key);
  };

  const openFollowups = (filter = "today") => {
    setActiveScreen("followups");
    setActiveFollowupFilter(filter);
    navigate(`/user/sales/followups?filter=${filter}`);
  };

  const openScheduleVisit = (lead = null) => {
    const nextLead = lead || panel.leads[0] || null;
    const nextLeadId = getLeadId(nextLead);
    const cachedVisit = getCachedSiteVisitUpdate(nextLeadId);
    const visitData = {
      ...cachedVisit,
      ...nextLead,
      siteVisitStatus: nextLead?.siteVisitStatus || cachedVisit?.siteVisitStatus,
      visitStatus: nextLead?.visitStatus || cachedVisit?.visitStatus,
      conductSiteStatus: nextLead?.conductSiteStatus || cachedVisit?.conductSiteStatus,
      siteVisitProject: nextLead?.siteVisitProject || cachedVisit?.siteVisitProject,
      conductSiteVisit: nextLead?.conductSiteVisit || cachedVisit?.conductSiteVisit,
      conductSiteDate: nextLead?.conductSiteDate || cachedVisit?.conductSiteDate,
      siteVisitLocation: nextLead?.siteVisitLocation || cachedVisit?.siteVisitLocation,
      meetingPoint: nextLead?.meetingPoint || cachedVisit?.meetingPoint,
      siteVisitExecutive: nextLead?.siteVisitExecutive || cachedVisit?.siteVisitExecutive,
      siteVisitNote: nextLead?.siteVisitNote || cachedVisit?.siteVisitNote,
    };
    const savedExecutive = visitData.siteVisitExecutive || nextLead?.team || getName(panel.user);
    const savedExecutiveId = getExecutiveIdFromValue(savedExecutive);

    setOpenActionLeadId(null);
    setSiteVisitLead(nextLead);
    setSiteVisitMessage("");
    setSiteVisitForm({
      leadId: nextLeadId ? String(nextLeadId) : "",
      project: getDisplayText(visitData.siteVisitProject || visitData.conductSiteVisit || nextLead?.interestedProjects || nextLead?.propertyType, ""),
      visitDateTime: visitData.conductSiteDate
        ? toDateTimeLocalValue(visitData.conductSiteDate)
        : getDefaultVisitDateTime(),
      location: visitData.siteVisitLocation || visitData.meetingPoint || nextLead?.locationPreferences || "",
      executiveId: savedExecutiveId,
      executive: savedExecutiveId ? getExecutiveNameFromId(savedExecutiveId) : getSalesExecutiveName(savedExecutive),
      note: visitData.siteVisitNote || "",
      status: visitData.siteVisitStatus || visitData.visitStatus || visitData.conductSiteStatus || "Scheduled",
    });
    setActiveScreen("scheduleVisit");
  };

  const handleSiteVisitChange = (event) => {
    const { name, value } = event.target;

    if (name === "executiveId") {
      setSiteVisitForm((current) => ({
        ...current,
        executiveId: value,
        executive: getExecutiveNameFromId(value),
      }));
      return;
    }

    if (name !== "leadId") {
      setSiteVisitForm((current) => ({ ...current, [name]: value }));
      return;
    }

    const nextLead = panel.leads.find((lead) => String(getLeadId(lead)) === String(value)) || null;
    const savedExecutive = nextLead?.siteVisitExecutive || nextLead?.team || "";
    const savedExecutiveId = getExecutiveIdFromValue(savedExecutive);
    setSiteVisitLead(nextLead);
    setSiteVisitForm((current) => {
      return {
        ...current,
        leadId: value,
        project: getDisplayText(nextLead?.siteVisitProject || nextLead?.conductSiteVisit || nextLead?.interestedProjects || nextLead?.propertyType || current.project, ""),
        visitDateTime: nextLead?.conductSiteDate ? toDateTimeLocalValue(nextLead.conductSiteDate) : current.visitDateTime,
        location: nextLead?.siteVisitLocation || nextLead?.meetingPoint || nextLead?.locationPreferences || current.location,
        executiveId: savedExecutiveId || current.executiveId,
        executive: savedExecutiveId
          ? getExecutiveNameFromId(savedExecutiveId)
          : getSalesExecutiveName(savedExecutive) || current.executive,
        note: nextLead?.siteVisitNote || current.note,
        status: nextLead?.siteVisitStatus || nextLead?.visitStatus || nextLead?.conductSiteStatus || current.status,
      };
    });
  };

  const saveSiteVisit = async (event) => {
    event.preventDefault();

    const selectedExecutiveName =
      getExecutiveNameFromId(siteVisitForm.executiveId) || getSalesExecutiveName(siteVisitForm.executive);

    if (!siteVisitForm.leadId || !siteVisitForm.project || !siteVisitForm.visitDateTime || !selectedExecutiveName) {
      setSiteVisitMessage("Select lead, project, date, time and sales executive before saving.");
      return;
    }

    const updates = {
      conductSiteVisit: siteVisitForm.project,
      conductSiteDate: new Date(siteVisitForm.visitDateTime).toISOString(),
      siteVisitProject: siteVisitForm.project,
      siteVisitLocation: siteVisitForm.location,
      siteVisitExecutive: selectedExecutiveName,
      siteVisitNote: siteVisitForm.note,
      siteVisitStatus: siteVisitForm.status,
      visitStatus: siteVisitForm.status,
      conductSiteStatus: siteVisitForm.status,
      meetingPoint: siteVisitForm.location,
    };
    
    const leadId = siteVisitForm.leadId;
    const previousLeads = panel.leads;
    const previousStats = panel.stats;

    setIsSavingSiteVisit(true);
    setSiteVisitMessage("");
    setPanel((current) => ({
      ...current,
      stats: {
        ...current.stats,
        siteVisits: current.leads.some((lead) => String(getLeadId(lead)) === String(leadId) && (lead.conductSiteVisit || lead.conductSiteDate))
          ? current.stats.siteVisits
          : (current.stats.siteVisits || 0) + 1,
      },
      leads: current.leads.map((lead) =>
        String(getLeadId(lead)) === String(leadId) ? { ...lead, ...updates } : lead
      ),
    }));

    try {
      const token = localStorage.getItem("authToken");
      const authHeaders = {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      };

      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: authHeaders,
        body: JSON.stringify(updates),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to schedule visit");

      const visitResponse = await fetch(`${API_URL}/schedule-visits`, {
        method: "POST",
        headers: authHeaders,
        body: JSON.stringify({
          leadId: Number(leadId),
          project: siteVisitForm.project,
          status: siteVisitForm.status,
          meetingPoint: siteVisitForm.location,
          salesExecutive: selectedExecutiveName,
          note: siteVisitForm.note,
          initiatedBy: panel.user?.firstName || panel.user?.username || panel.user?.email || "",
          scheduledOn: new Date(siteVisitForm.visitDateTime).toISOString(),
        }),
      });
      const savedVisit = await visitResponse.json().catch(() => ({}));
      if (!visitResponse.ok) throw new Error(savedVisit?.message || "Unable to save site visit schedule");

      setPanel((current) => ({
        ...current,
        leads: current.leads.map((lead) =>
          String(getLeadId(lead)) === String(leadId)
            ? {
                ...lead,
                ...result,
                ...updates,
                scheduleVisits:[
                  savedVisit,
                  ...((lead.scheduleVisits || []).filter((visit) => String(visit?.id) !== String(savedVisit?.id))),
                ],
              }
            : lead
        ),
      }));
      setSiteVisitLead((current) => (current ? { ...current, ...result, ...updates, scheduleVisits:[savedVisit] } : current));
      setSiteVisitMessage("Site visit scheduled and saved in this lead.");
    } catch (err) {
      setPanel((current) => ({ ...current, stats: previousStats, leads: previousLeads }));
      setSiteVisitMessage(err.message || "Unable to schedule visit.");
    } finally {
      setIsSavingSiteVisit(false);
    }
  };

  const openCallPage = (lead = null) => {
    if (lead) {
      setFocusedCallLeadId(getLeadId(lead));
    }
    setOpenActionLeadId(null);
    setActiveScreen("calls");
    const leadId = lead ? getLeadId(lead) : "";
    navigate(`/user/sales/calls${leadId ? `?leadId=${leadId}` : ""}`, {
      state: lead ? { lead } : undefined,
    });
  };

  const openWhatsAppPage = (lead = null) => {
    const leadId = lead ? getLeadId(lead) : "";
    setOpenActionLeadId(null);
    setActiveScreen("whatsapp");
    navigate(`/user/sales/whatsapp${leadId ? `?leadId=${leadId}` : ""}`, {
      state: lead ? { lead } : undefined,
    });
  };

  const openEmailPage = (lead = null) => {
    const leadId = lead ? getLeadId(lead) : "";
    setActiveScreen("conversation");
    navigate(`/user/sales/conversation?tab=emails${leadId ? `&leadId=${leadId}` : ""}`, {
      state: lead ? { lead } : undefined,
    });
  };

  const openBookingPage = (lead = null) => {
    const leadId = lead ? getLeadId(lead) : "";
    setActiveScreen("bookings");
    navigate(`/user/sales/bookings${leadId ? `?leadId=${leadId}` : ""}`, {
      state: lead ? { lead } : undefined,
    });
  };

  const openSalesSiteVisitPage = (lead = null, status = "") => {
    openScheduleVisit(lead);
    const leadId = lead ? getLeadId(lead) : "";
    const params = new URLSearchParams();
    if (leadId) params.set("leadId", leadId);
    if (status) params.set("status", status);
    navigate(`/user/sales/site-visit${params.toString() ? `?${params.toString()}` : ""}`, {
      state: lead ? { lead, status } : undefined,
    });
  };

  const openSalesNotificationLink = (link = "") => {
    const target = String(link || "").trim();
    if (!target) return;
    if (!target.startsWith("/user/sales")) return;
    setIsSalesNotificationsOpen(false);
    navigate(target);
  };

  const openCallDisposition = (lead, type = "") => {
    const leadId = getLeadId(lead);
    if (!leadId) return;

    const dispositionLabels = {
      qualified: "Qualified",
      callback: "Callback Later",
      interestedProject: "Interested Project",
      siteVisit: "Site Visit Scheduled",
      notInterested: "Not Interested",
      wrongNumber: "Wrong Number",
      junk: "Junk",
      noAnswer: "No Answer",
      busy: "Busy",
      followUp: "Follow-up Required",
    };
    const callLog = callLogsByLead[leadId];
    setCallTarget(null);
    setActiveModal("disposition");
    setDispositionInitialValue(dispositionLabels[type] || type);
    setDispositionTarget({
      lead,
      callLog:callLog?.id ? callLog : {
        id:null,
        leadId:Number(leadId),
        leadPhone:getActionPhone(lead),
        phone:getActionPhone(lead),
        status:"completed",
        provider:"manual",
      },
    });
  };

  const completeActiveBlockedCall = () => {
    if (!activeBlockedCall?.id) return;
    const blockedLeadId = activeBlockedCall.leadId ? String(activeBlockedCall.leadId) : "";
    const lead =
      activeBlockedCall.lead ||
      panel.leads.find((item) => String(getLeadId(item)) === blockedLeadId) ||
      null;

    setCallTarget(null);
    setActiveModal("disposition");
    setDispositionInitialValue("");
    setDispositionTarget({
      lead,
      callLog:activeBlockedCall,
    });
  };

  const updateTaskStatus = async (taskId, status) => {
    const previousTasks = panel.tasks || [];

    setPanel((current) => ({
      ...current,
      tasks: (current.tasks || []).map((task) =>
        task.id === taskId ? { ...task, status } : task
      ),
    }));

    try {
      const response = await fetch(`${API_URL}/tasks/${taskId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to update task");

      setPanel((current) => ({
        ...current,
        tasks: (current.tasks || []).map((task) =>
          task.id === taskId ? { ...task, ...result } : task
        ),
      }));
    } catch (err) {
      setPanel((current) => ({ ...current, tasks: previousTasks }));
      alert(err.message || "Unable to update task");
    }
  };

  const openBookingForm = (lead) => {
    const today = new Date();
    const localDate = new Date(today.getTime() - today.getTimezoneOffset() * 60000)
      .toISOString()
      .slice(0, 10);
    const leadProject =
      lead?.interestedProjects ||
      lead?.siteVisitProject ||
      lead?.conductSiteVisit ||
      lead?.projectName ||
      lead?.project_name ||
      lead?.propertyType ||
      "";
    const leadSource =
      lead?.source ||
      lead?.leadSource ||
      lead?.campaign ||
      lead?.tags ||
      "";

    setOpenActionLeadId(null);
    setBookingLead(lead);
    setBookingMessage("");
    setBookingProjectMessage("");
    setBookingStepIndex(0);
    setIsBookingSuccess(false);
    setBookingForm({
      ...emptyBookingForm,
      customerName: lead ? getLeadName(lead) : "",
      phone: lead ? getLeadPhone(lead) : "",
      email: lead?.email || lead?.emailAddress || lead?.primaryEmail || "",
      dob: lead?.birthday || lead?.dob || lead?.dateOfBirth || "",
      panNumber: lead?.panNumber || lead?.pan || lead?.panCard || lead?.pan_card || "",
      aadhaarNumber: lead?.aadhaarNumber || lead?.aadharNumber || lead?.aadhaar || lead?.aadhar || lead?.aadhaarCard || lead?.aadharCard || "",
      projectDetails: leadProject,
      source: leadSource,
      companyName: lead?.companyName || "",
      bookedOn: localDate,
      idempotencyKey: `booking-${getLeadId(lead) || "lead"}-${Date.now()}`,
    });
    setIsBookingFormOpen(true);
  };

  const getLeadBookingPreview = (lead) => {
    const leadId = getLeadId(lead);
    return (
      (lead?.bookings || [])[0] ||
      (panel.bookings || []).find((booking) => String(booking.leadId) === String(leadId)) ||
      {
        id: leadId,
        leadId,
        customerName: getLeadName(lead),
        phone: getLeadPhone(lead),
        projectDetails: lead?.interestedProjects || lead?.projectDetails || lead?.projectName || "-",
        unit: lead?.unit || "-",
        stage: "Booked",
        source: lead?.source || "-",
      }
    );
  };

  const openBookingPreview = (lead) => {
    setOpenActionLeadId(null);
    setBookingPreview({
      booking: getLeadBookingPreview(lead),
      lead,
    });
  };

  const closeBookingForm = () => {
    setIsBookingFormOpen(false);
    setBookingLead(null);
    setBookingMessage("");
    setBookingProjectMessage("");
    setBookingStepIndex(0);
    setIsBookingSuccess(false);
  };

  const handleBookingFieldChange = (event) => {
    const { name, value } = event.target;
    setBookingForm((current) => ({ ...current, [name]: value }));
  };

  const handleSaveBooking = async (event) => {
    event.preventDefault();

    const leadId = bookingLead ? getLeadId(bookingLead) : "";
    if (!leadId) {
      setBookingMessage("Select a lead before confirming the booking.");
      return;
    }

    if (bookingStepIndex === 0) {
      if (!bookingForm.projectDetails.trim()) {
        setBookingMessage("Select a project before continuing.");
        return;
      }
      setBookingMessage("");
      setBookingProjectMessage("");
      setBookingStepIndex(1);
      return;
    }

    if (bookingStepIndex === 1) {
      if (!bookingForm.unit.trim()) {
        setBookingProjectMessage("Select a unit before continuing.");
        return;
      }
      setBookingMessage("");
      setBookingProjectMessage("");
      setBookingStepIndex(2);
      return;
    }

    if (!bookingForm.customerName.trim() || !bookingForm.projectDetails.trim()) {
      setBookingMessage("Customer name and project details are required.");
      return;
    }

    setIsSavingBooking(true);
    setBookingMessage("");

    try {
      const response = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...bookingForm,
          leadId: Number(leadId),
          stage: "Booked",
          unitId: bookingForm.unitId ? Number(bookingForm.unitId) : undefined,
          unitItemId: bookingForm.unitItemId ? Number(bookingForm.unitItemId) : undefined,
          bookedBy: userName,
          idempotencyKey: bookingForm.idempotencyKey || `booking-${leadId}-${bookingForm.unitItemId || Date.now()}`,
          bookedOn: bookingForm.bookedOn || new Date().toISOString().slice(0, 10),
          saleableArea: bookingForm.saleableArea || bookingForm.carpetArea,
          source: bookingForm.source || bookingForm.campaign,
        }),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to create booking");

      const savedBooking = {
        ...bookingForm,
        ...result,
        leadId: Number(leadId),
        unit: result?.unit || bookingForm.unit,
        stage: "Booked",
      };
      const updatedLead = {
        ...bookingLead,
        status: "Booked",
        lead_status: "Booked",
        stage: "Booked",
        bookings: [savedBooking, ...(bookingLead?.bookings || [])],
      };

      setPanel((current) => ({
        ...current,
        stats: {
          ...current.stats,
          bookings: (current.stats.bookings || 0) + 1,
        },
        leads: current.leads.map((lead) =>
          String(getLeadId(lead)) === String(leadId) ? { ...lead, ...updatedLead } : lead
        ),
        bookings: [savedBooking, ...(current.bookings || [])],
      }));

      setBookingMessage("Booking confirmed successfully.");
      setIsBookingSuccess(true);
      await loadPanel(false);
      return true;
    } catch (error) {
      console.error("Unable to save booking:", error);
      setBookingMessage(error.message || "Booking could not be saved. Please check backend and database.");
    } finally {
      setIsSavingBooking(false);
    }
  };

  const openLeadPreview = (lead, openBooking = false) => {
    setOpenActionLeadId(null);
    if (openBooking) {
      if (isBookedLead(lead)) {
        openBookingPreview(lead);
        return;
      }
      openBookingForm(lead);
      return;
    }
    openLeadDetails(lead);
  };

  const openLeadDetails = (lead) => {
    const leadId = getLeadId(lead);
    setOpenActionLeadId(null);
    setActiveScreen("details");
    window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(lead));
    navigate(leadId ? `/user/sales/details?leadId=${leadId}` : "/user/sales/details", { state: { lead } });
  };

  const toggleLeadActionMenu = (event, lead) => {
    event.stopPropagation();
    const leadId = getLeadId(lead);
    setOpenActionLeadId((current) => (current === leadId ? null : leadId));
  };

  const attendanceStatus = attendance?.status || "Available";
  const isOnBreak = attendanceStatus === "On Break";
  const attendanceLoadedElapsedSeconds = attendance ? secondsSince(attendance.loadedAt, attendanceNow) : 0;
  const liveTodayLoginSeconds =
    attendance?.sessionStartedAt && !attendance?.logoutAt
      ? secondsSince(attendance.sessionStartedAt, attendanceNow)
      : attendanceSecondsValue(attendance?.todayLoginSeconds, attendance?.currentSessionSeconds) +
        (attendance && !attendance.logoutAt ? attendanceLoadedElapsedSeconds : 0);
  const liveTodayBreakSeconds =
    attendanceSecondsValue(attendance?.todayBreakSeconds, attendance?.currentBreakSeconds) +
    (attendance?.breakStartedAt && !attendance?.breakEndedAt ? attendanceLoadedElapsedSeconds : 0);

  const toggleBreak = () => {
    updateAttendance(isOnBreak ? "break/end" : "break/start");
  };

  const logout = async () => {
    await updateAttendance("logout");
    clearAttendanceSessionStart(getUserId(panel.user) || attendance?.userId);
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    window.location.href = "/sign-in";
  };

  const assignedTasks = panel.tasks || [];
  const currentCallLead = useMemo(() => {
    return callQueue.find((lead) => String(getLeadId(lead)) === String(focusedCallLeadId)) || callQueue[0] || null;
  }, [callQueue, focusedCallLeadId]);
  const currentCallLog = currentCallLead ? callLogsByLead[getLeadId(currentCallLead)] : null;
  const currentCallStatus = String(currentCallLog?.status || "").toLowerCase();
  const currentCallStatusLabel = currentCallStatus === "ringing" || currentCallStatus === "calling"
    ? "Call ringing"
    : currentCallStatus.replace("-", " ");
  const currentCallDuration = currentCallStatus === "connected"
    ? Math.max(0, Math.floor((callNow - new Date(currentCallLog.connectedAt || currentCallLog.startedAt).getTime()) / 1000))
    : Number(currentCallLog?.duration) || 0;
  const upNextLeads = callQueue.filter((lead) => getLeadId(lead) !== getLeadId(currentCallLead)).slice(0, 3);
  const todayDialCount = Object.keys(callDispositions).length;
  const qualifiedCount = Object.values(callDispositions).filter((item) => item?.type === "qualified").length;
  const outboundCallButtonText =
    outboundCallStatus === "initiating" ? "Starting..." :
      ["calling", "ringing"].includes(outboundCallStatus) ? "Ringing..." :
        outboundCallStatus === "connected" ? "Connected" :
          "Call Lead";
  const callBlocked = Boolean(startingCallLeadId) || isLiveOutboundStatus(outboundCallStatus);

  const startSelectedCallLead = async (lead) => {
    if (!lead) return;
    const leadId = getLeadId(lead);
    if (!leadId) {
      setCallError("Lead is missing.");
      return;
    }
    const leadPhone = getActionPhone(lead);
    const digits = String(leadPhone || "").replace(/\D/g, "");
    if (digits.length < 10) {
      setCallError("Lead number is unavailable.");
      return;
    }

    if (outboundRequestInProgressRef.current) {
      return;
    }

    if (isLiveOutboundStatus(outboundCallStatus)) {
      setCallError("Another call is currently active.");
      return;
    }

    const requestId =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random()}`;

    outboundRequestInProgressRef.current = true;
    setStartingCallLeadId(leadId);
    setOutboundCallStatus("initiating");
    setCallError("");
    setFocusedCallLeadId(getLeadId(lead));

    let acceptedCall = false;
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/calls/mcube/click-to-call`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          ...(token ? { Authorization:`Bearer ${token}` } : {}),
        },
        body:JSON.stringify({
          leadId:Number(leadId),
          requestId,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result?.success === false) {
        if (response.status === 409 && result?.callLog) {
          const blockedStatus = normalizeOutboundStatus(result.callLog.status || "ringing");
          const blockedLeadId = result.callLog.leadId ? String(result.callLog.leadId) : "";
          setActiveBlockedCall(result.callLog);
          setActiveCallId(result.callLog.id || null);
          setOutboundCallStatus(blockedStatus);
          if (blockedLeadId) {
            setCallLogsByLead((current) => ({ ...current, [blockedLeadId]:result.callLog }));
          }
        }
        throw new Error(result?.message || "Unable to start call");
      }
      setActiveBlockedCall(null);
      if (result?.callLog) {
        setCallLogsByLead((current) => ({ ...current, [leadId]:result.callLog }));
      }
      const nextCallId = result?.callLog?.id || result?.callLogId || result?.data?.callLogId || null;
      setActiveCallId(nextCallId);
      setCurrentCallRequest({ requestId, leadId, phone:digits });
      setCallTarget(lead);
      setDispositionTarget(null);
      const acceptedStatus = normalizeOutboundStatus(result?.callLog?.status || result?.status || "ringing");
      setOutboundCallStatus(acceptedStatus);
      acceptedCall = !isFinalOutboundStatus(acceptedStatus);
      if (result?.agentExtension || result?.agentCallingMode || result?.mcubeUsername) {
        setMcubeWidgetMeta((current) => ({
          ...current,
          agentExtension:result.agentExtension || current.agentExtension || "",
          agentCallingMode:result.agentCallingMode || current.agentCallingMode || "",
          mcubeUsername:result.mcubeUsername || current.mcubeUsername || "",
        }));
      }
    } catch (callError) {
      setCallTarget(null);
      setActiveCallId(null);
      setCurrentCallRequest(null);
      setOutboundCallStatus("failed");
      setCallError(callError.message || "Unable to start call");
    } finally {
      if (!acceptedCall) {
        outboundRequestInProgressRef.current = false;
      }
      setStartingCallLeadId(null);
    }
  };

  useEffect(() => {
    if (activeScreen !== "calls") return;
    const params = new URLSearchParams(location.search);
    const leadId = params.get("leadId");
    if (!leadId) return;

    const lead =
      panel.leads.find((item) => String(getLeadId(item)) === String(leadId)) ||
      location.state?.lead ||
      null;
    if (!lead) return;

    setFocusedCallLeadId(leadId);
  }, [activeScreen, location.key, location.search, location.state, panel.leads]);

  const sidebarCounts = useMemo(() => {
    const leads = panel.leads || [];
    const tasks = panel.tasks || [];
    const leadsWithWhatsApp = leads.filter((lead) => getActionPhone(lead).replace(/\D/g, "")).length;
    const scheduledVisits = leads.filter(leadHasScheduledSiteVisit).length;
    const bookedLeads = bookingLeadRows.length || leads.filter(isBookedLead).length;
    const followupLeads = leads.filter((lead) => {
      const status = normalizeStageText(lead.status);
      return (
        status === "fresh lead" ||
        status === "prospect" ||
        status === "new" ||
        callbackLeadIds.has(String(getLeadId(lead))) ||
        Boolean(lead.nextFollowUpAt || lead.followUpDate || lead.followupDate || lead.followUpTime)
      );
    }).length;

    return {
      home:leads.length,
      leads:leads.length,
      conversation:leads.length,
      calls:callQueue.length + inboundCallCount,
      callLogs:callLogCount,
      followups:followupLeads || Number(panel.stats.followupsDue) || 0,
      scheduleVisit:scheduledVisits || Number(panel.stats.siteVisits) || 0,
      bookings:bookedLeads || Number(panel.stats.bookings) || 0,
      whatsapp:leadsWithWhatsApp,
      tasks:tasks.length || Number(panel.stats.tasks) || 0,
      notifications:salesUnreadCount,
    };
  }, [
    bookingLeadRows,
    callLogCount,
    callQueue.length,
    callbackLeadIds,
    inboundCallCount,
    panel.leads,
    panel.stats.bookings,
    panel.stats.followupsDue,
    panel.stats.siteVisits,
    panel.stats.tasks,
    panel.tasks,
    salesUnreadCount,
  ]);

  const navItems = [
    { key: "home", label: "Home", icon: Home, count: sidebarCounts.home },
    { key: "leads", label: "My Leads", icon: Users, count: sidebarCounts.leads },
    { key: "conversation", label: "Conversation", icon: MessageSquare, count: sidebarCounts.conversation },
    { key: "calls", label: "Calls", icon: Phone, count: sidebarCounts.calls },
    { key: "callLogs", label: "My Call Logs", icon: History, count: sidebarCounts.callLogs },
    { key: "followups", label: "Follow-ups", icon: CalendarDays, count: sidebarCounts.followups },
    { key: "scheduleVisit", label: "Schedule Visit", icon: CalendarDays, count: sidebarCounts.scheduleVisit },
    { key: "bookings", label: "Bookings", icon: LayoutDashboard, count: sidebarCounts.bookings },
   
    { key: "whatsapp", label: "WhatsApp", icon: Smartphone, count: sidebarCounts.whatsapp },
    { key: "tasks", label: "Tasks", icon: LayoutDashboard, count: sidebarCounts.tasks },
    { key: "notifications", label: "Notifications", icon: Bell, count: sidebarCounts.notifications },
    { key: "profile", label: "Profile", icon: UserCircle, count: 0 },
  ];

  const visibleLeadStageFilters =
    activeScreen === "bookings"
      ? [{ key: "all", label: "All" }]
      : activeScreen === "leads"
        ? [...leadStageFilters, ...dispositionLeadFilters]
      : leadStageFilters;
  const activeDispositionFilter = getDispositionFilterValue(activeLeadStage);
  const siteVisitLeadOptions = panel.leads.map((lead) => ({
    value: String(getLeadId(lead)),
    label: getLeadName(lead),
    sub: getLeadPhone(lead) !== "-" ? getLeadPhone(lead) : "",
  }));
  const siteVisitProjectOptions = [
    ...(siteVisitForm.project && !projectOptions.includes(siteVisitForm.project)
      ? [{ value: siteVisitForm.project, label: siteVisitForm.project }]
      : []),
    ...projectOptions.map((project) => ({ value: project, label: project })),
  ];
  const siteVisitExecutiveOptions = [
    ...(siteVisitForm.executive &&
    !siteVisitForm.executiveId &&
    !salesExecutiveOptions.some((executive) => executive.name.toLowerCase() === siteVisitForm.executive.toLowerCase())
      ? [{ value: "", label: siteVisitForm.executive }]
      : []),
    ...salesExecutiveOptions.map((executive) => ({
      value: executive.id,
      label: executive.name,
      sub: executive.role,
    })),
  ];
  const siteVisitStatusSelectOptions = siteVisitStatusOptions.map((status) => ({ value: status, label: status }));
  const renderDispositionBuckets = () => (
    <div className="sales-call-list-card sales-disposition-list-card">
      <div className="sales-card-head">
        <div>
          <h2>Disposition buckets</h2>
          <p>Work each outcome separately</p>
        </div>
      </div>
      <div className="sales-disposition-tabs" aria-label="Disposition filters">
        {callDispositionBuckets.map((bucket) => (
          <button
            key={bucket.key}
            type="button"
            className={activeCallDispositionTab === bucket.disposition ? "active" : ""}
            onClick={() => setActiveCallDispositionTab(bucket.disposition)}
          >
            {bucket.label}
            <span>{bucket.leads.length}</span>
          </button>
        ))}
      </div>
      {!activeCallDispositionBucket?.leads.length ? (
        <div className="sales-empty compact">No leads in this disposition yet.</div>
      ) : (
        <div className="sales-disposition-list">
          {activeCallDispositionBucket.leads.map(({ lead, callLog }) => (
            <button
              type="button"
              className="sales-disposition-row"
              key={`${activeCallDispositionBucket.disposition}-${getLeadId(lead)}`}
              onClick={() => {
                setFocusedCallLeadId(getLeadId(lead));
                setActiveScreen("calls");
                navigate(`/user/sales/calls${getLeadId(lead) ? `?leadId=${getLeadId(lead)}` : ""}`);
              }}
            >
              <span className="sales-lead-name">
                <span className="sales-avatar small">{initials(getLeadName(lead))}</span>
                <span>
                  <strong>{getLeadName(lead)}</strong>
                  <small>{getLeadPhone(lead)}</small>
                </span>
              </span>
              <span>
                <strong>{callLog.disposition}</strong>
                <small>{getDispositionDetail(callLog)}</small>
              </span>
              <time>{formatTaskDateTime(callLog.updatedAt || callLog.createdAt)}</time>
            </button>
          ))}
        </div>
      )}
    </div>
  );

  const renderInboundCalls = () => {
    const lead = inboundCall?.lead || null;
    const inboundCallerNumber = inboundCall?.callerNumber || inboundCall?.customerNumber || inboundCall?.leadPhone || inboundCall?.phone || "";
    const rawInboundStatus = String(inboundCall?.status || "waiting").toLowerCase();
    const status = rawInboundStatus === "calling" ? "ringing" : rawInboundStatus.replace(/-/g, " ");
    const startedAt = inboundCall?.startedAt ? formatTaskDateTime(inboundCall.startedAt) : "-";
    const isActiveInboundCall = ["initiated", "queued", "calling", "ringing", "connected", "in-progress"].includes(rawInboundStatus);
    const liveSeconds = isActiveInboundCall && inboundCall?.startedAt
      ? Math.max(0, Math.floor((callNow - new Date(inboundCall.startedAt).getTime()) / 1000))
      : Number(inboundCall?.duration) || 0;

    return (
      <section className="sales-call-workspace sales-inbound-workspace">
        <div className="sales-call-head">
          <div>
            <h2>Inbound Calls</h2>
            <p>MCube virtual number to browser softphone workflow</p>
          </div>
          <button type="button" onClick={() => setInboundCall(null)} disabled={!inboundCall || isActiveInboundCall}>
            Clear current
          </button>
        </div>

        <div className="sales-inbound-grid">
          <div className="sales-call-card sales-inbound-current">
            <div className="sales-call-card-head">
              <div className="sales-lead-name">
                <span className="sales-avatar call-avatar">{initials(lead ? getLeadName(lead) : "Unknown Caller")}</span>
                <span>
                  <strong>{lead ? getLeadName(lead) : "Unknown Caller"}</strong>
                  <small>{inboundCallerNumber || "Waiting for MCube inbound event"}</small>
                </span>
              </div>
              <div className="sales-call-badges">
                <span>{status}</span>
              </div>
            </div>

            <div className="sales-call-meta">
              <div><span>Lead ID</span><strong>{lead?.id ? `#${lead.id}` : "-"}</strong></div>
              <div><span>Project</span><strong>{lead?.project || "-"}</strong></div>
              <div><span>Source</span><strong>{lead?.source || "-"}</strong></div>
              <div><span>Agent</span><strong>{inboundCall?.agentName || "-"}</strong></div>
              <div><span>Extension</span><strong>{inboundCall?.agentExtension || "-"}</strong></div>
              <div><span>Virtual Number</span><strong>{inboundCall?.virtualNumber || "-"}</strong></div>
              <div><span>Campaign / Queue</span><strong>{[inboundCall?.campaignId, inboundCall?.queueId].filter(Boolean).join(" / ") || "-"}</strong></div>
              <div><span>Started</span><strong>{startedAt}</strong></div>
              <div><span>Duration</span><strong>{formatDuration(liveSeconds)}</strong></div>
              <div><span>Disconnected By</span><strong>{inboundCall?.disconnectedBy || "-"}</strong></div>
              <div><span>Recording</span><strong>{inboundCall?.recordingUrl ? "Available" : isActiveInboundCall ? "Pending" : "Processing"}</strong></div>
            </div>

            <div className="sales-call-sla">
              {rawInboundStatus === "waiting"
                ? "Waiting for MCUBE inbound event"
                : rawInboundStatus === "connected"
                  ? "Answer and speak through MCUBE browser softphone"
                  : "CRM notifications do not replace MCUBE Answer/Reject controls."}
            </div>

            <div className="sales-call-actions">
              <button
                type="button"
                className="primary"
                onClick={() => {
                  setDispositionInitialValue("");
                  setCallTarget(null);
                  setActiveModal("disposition");
                  setDispositionTarget({
                    lead,
                    callLog:{
                      id:inboundCall?.callLogId || inboundCall?.id || null,
                      leadId:lead?.id || inboundCall?.leadId || null,
                      leadPhone:inboundCall?.customerNumber || inboundCall?.callerNumber || "",
                      phone:inboundCall?.customerNumber || inboundCall?.callerNumber || "",
                      callerNumber:inboundCall?.callerNumber || "",
                      customerNumber:inboundCall?.customerNumber || inboundCall?.callerNumber || "",
                      direction:"inbound",
                      provider:inboundCall?.provider || "mcube",
                      status:rawInboundStatus === "waiting" ? "completed" : inboundCall?.status || "completed",
                    },
                  });
                }}
              >
                Dispose call
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveScreen("callLogs");
                  navigate("/my-call-logs", {
                    state:{
                      direction:"inbound",
                      phone:inboundCallerNumber,
                    },
                  });
                }}
              >
                Show in call log
              </button>
            </div>
          </div>
        </div>

      </section>
    );
  };

  return (
    <div
      className={`sales-panel ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${
        activeScreen === "whatsapp" ? "whatsapp-screen" : ""
      } ${
        activeScreen === "details" ? "details-screen" : ""
      }`}
      style={{ fontSize: "13px" }}
    >
      {mcubeWidgetUrl && (
        <>
          {isMcubeWidgetControlScreen && !mcubeWidgetVisible && (
            <button
              type="button"
              className="sales-mcube-widget-launcher"
              onClick={showMcubeWidget}
            >
              Softphone
            </button>
          )}
          <div className={`sales-mcube-widget-shell ${isMcubeWidgetPanelVisible ? "is-open" : "is-hidden"}`}>
            <div
              className="sales-mcube-widget-modal"
              aria-labelledby="sales-mcube-widget-title"
            >
              <div className="sales-mcube-widget-header">
                <div>
                  <span id="sales-mcube-widget-title">MCUBE Softphone</span>
                  <small>
                    {mcubeWidgetMeta.agentExtension ? `Ext: ${mcubeWidgetMeta.agentExtension}` : mcubeWidgetStatus}
                    {mcubeWidgetMeta.agentCallingMode ? ` | ${mcubeWidgetMeta.agentCallingMode}` : ""}
                  </small>
                </div>
                <button
                  type="button"
                  className="sales-mcube-widget-close"
                  onClick={hideMcubeWidget}
                  aria-label="Minimize MCUBE softphone"
                >
                  <X size={18} />
                </button>
              </div>
              <div className="sales-mcube-widget-body">
                <iframe
                  key="persistent-mcube-widget"
                  className="sales-mcube-login-frame"
                  title="MCube softphone"
                  src={mcubeWidgetUrl}
                  allow="microphone; autoplay"
                />
              </div>
              <div className="sales-mcube-widget-footer">
                <button type="button" className="secondary" onClick={hideMcubeWidget}>
                  Minimize
                </button>
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    const lead = callTarget;
                    if (!lead) {
                      hideMcubeWidget();
                      return;
                    }
                    outboundRequestInProgressRef.current = false;
                    setOutboundCallStatus("completed");
                    setActiveCallId(null);
                    setCurrentCallRequest(null);
                    setCallTarget(null);
                    hideMcubeWidget();
                    openCallDisposition(lead);
                  }}
                >
                  Dispose Call
                </button>
              </div>
            </div>
          </div>
        </>
      )}
      <aside className="sales-sidebar">
        <div className="sales-brand">
          <img className="sales-logo" src="/assets/images/logo.png" alt="SWAMI" />
          
        </div>

        <div className="sales-nav-label">Workspace</div>
        <nav className="sales-nav">
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                className={`sales-nav-item ${activeScreen === item.key ? "active" : ""}`}
                type="button"
                onClick={() => {
                  setActiveScreen(item.key);
                  if (item.key === "bookings") setActiveLeadStage("all");
                  if (item.key === "calls") navigate("/user/sales/calls");
                  if (item.key === "callLogs") navigate("/my-call-logs");
                  if (item.key === "followups") openFollowups(activeFollowupFilter);
                  if (item.key === "conversation") navigate("/user/sales/conversation");
                  if (item.key === "whatsapp") navigate("/user/sales/whatsapp");
                  if (item.key === "leads") navigate("/user/sales/leads");
                  if (item.key === "bookings") navigate("/user/sales/bookings");
                  if (item.key === "addLead") navigate("/user/sales/add-lead");
                  if (item.key === "scheduleVisit") openSalesSiteVisitPage();
                  if (item.key === "notifications") navigate("/user/sales/notifications");
                  if (item.key === "profile") navigate("/user/sales/profile");
                }}
              >
                <Icon size={16} />
                <span>{item.label}</span>
                {Number.isFinite(item.count) && <span className="sales-count">{item.count}</span>}
              </button>
            );
          })}
        </nav>
      </aside>

      <main className="sales-main">
        <header className="sales-topbar">
          {/* WhatsApp UI change: existing page topbar gets a hamburger to reopen the auto-collapsed sidebar. */}
          <button
            className="sales-icon-btn sales-sidebar-toggle"
            type="button"
            title={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            aria-label={isSidebarCollapsed ? "Open sidebar" : "Close sidebar"}
            onClick={() => setIsSidebarCollapsed((current) => !current)}
          >
            <Menu size={18} />
          </button>
          <div className="sales-topbar-spacer" />
          <div className="sales-call-presence sales-header-presence">
            <span>{attendanceStatus}</span>
            <small>Login {formatDuration(liveTodayLoginSeconds)} | Break {formatDuration(liveTodayBreakSeconds)}</small>
            <button type="button" onClick={toggleBreak} disabled={attendanceBusy}>
              {isOnBreak ? "Return" : "Take break"}
            </button>
          </div>
          <div className="sales-notification-menu">
            <button
              className="sales-icon-btn sales-notification-btn"
              type="button"
              title="Notifications"
              aria-expanded={isSalesNotificationsOpen}
              onClick={() => setIsSalesNotificationsOpen((current) => !current)}
            >
              <Bell size={17} />
              {unreadSalesNotifications > 0 && (
                <span className="sales-notification-count">{Math.min(unreadSalesNotifications, 99)}</span>
              )}
            </button>
            {isSalesNotificationsOpen && (
              <div className="sales-notification-dropdown">
                <div className="sales-notification-head">
                  <strong>Notifications</strong>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSalesNotificationsOpen(false);
                      setActiveScreen("notifications");
                      navigate("/user/sales/notifications");
                    }}
                  >
                    View all
                  </button>
                </div>
                <div className="sales-notification-list">
                  {salesNotifications.length === 0 ? (
                    <div className="sales-notification-empty">No notifications</div>
                  ) : (
                    salesNotifications.slice(0, 8).map((notification) => (
                      <div className={`sales-notification-item ${notification.isRead ? "" : "unread"}`} key={notification.id}>
                        <span className="sales-notification-pulse" aria-hidden="true">
                          <Activity size={18} />
                        </span>
                        <div className="sales-notification-copy">
                          <strong>{notification.titile || notification.title || "Notification"}</strong>
                          <p>{cleanNotificationDescription(notification.description) || "-"}</p>
                          <small>Done by {notification.actorName || notification.createdByName || notification.createdBy?.name || userName}</small>
                        </div>
                        <time>{formatNotificationTime(notification.createdAt)}</time>
                      </div>
                    ))
                  )}
                </div>
                {salesNotifications.length > 0 && (
                  <button
                    type="button"
                    className="sales-notification-see-all"
                    onClick={() => {
                      setIsSalesNotificationsOpen(false);
                      setActiveScreen("notifications");
                      navigate("/user/sales/notifications");
                    }}
                  >
                    See All Notification
                  </button>
                )}
              </div>
            )}
          </div>
          <div className="sales-role">
            {userProfilePhoto ? (
              <img className="sales-avatar" src={userProfilePhoto} alt={userName} />
            ) : (
              <div className="sales-avatar">{initials(userName)}</div>
            )}
            <div>
              <div className="sales-role-name">{userName}</div>
              <div className="sales-role-title">{panel.user?.role || "SALES"}</div>
            </div>
            {/* <ChevronDown size={14} /> */}
          </div>
          <button className="sales-icon-btn" type="button" title="Logout" onClick={logout}>
            <LogOut size={17} />
          </button>
        </header>

        <section className="sales-content">
          {inboundCall && !isInboundNoticeDismissed && (
            <div className="sales-inbound-notice">
              <div>
                <span>Incoming Call</span>
                <strong>{inboundCall.lead ? getLeadName(inboundCall.lead) : "Unknown Caller"}</strong>
                <small>
                  {inboundCall.callerNumber || "-"}
                  {inboundCall.agentExtension ? ` | Ext ${inboundCall.agentExtension}` : ""}
                  {inboundCall.status ? ` | ${String(inboundCall.status).replace(/-/g, " ")}` : ""}
                </small>
              </div>
              <div className="sales-inbound-notice-actions">
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen("calls");
                    navigate("/user/sales/calls");
                  }}
                >
                  Open inbound
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveScreen("callLogs");
                    navigate("/my-call-logs", {
                      state:{
                        direction:"inbound",
                        phone:inboundCall.callerNumber || inboundCall.customerNumber || "",
                      },
                    });
                  }}
                >
                  Show in call log
                </button>
                <button type="button" className="ghost" onClick={() => setIsInboundNoticeDismissed(true)}>
                  Dismiss
                </button>
              </div>
            </div>
          )}

          {inboundCall && isInboundPopupOpen && (
            <div className="sales-inbound-popup-backdrop" role="presentation">
              <section className="sales-inbound-popup" role="dialog" aria-modal="true" aria-labelledby="inbound-popup-title">
                <div className="sales-inbound-popup-head">
                  <span>Incoming Call</span>
                  <button type="button" onClick={() => setIsInboundPopupOpen(false)} aria-label="Close inbound call popup">
                    ×
                  </button>
                </div>
                <div className="sales-inbound-popup-body">
                  <div className="sales-avatar call-avatar">
                    {initials(inboundCall.lead ? getLeadName(inboundCall.lead) : "Unknown Caller")}
                  </div>
                  <div>
                    <h2 id="inbound-popup-title">{inboundCall.lead ? getLeadName(inboundCall.lead) : "Unknown Caller"}</h2>
                    <p>{inboundCall.callerNumber || inboundCall.customerNumber || "-"}</p>
                    <small>
                      {[inboundCall.agentExtension ? `Ext ${inboundCall.agentExtension}` : "", inboundCall.status ? String(inboundCall.status).replace(/-/g, " ") : ""].filter(Boolean).join(" | ")}
                    </small>
                  </div>
                </div>
                <div className="sales-inbound-popup-actions">
                  <button
                    type="button"
                    className="primary"
                    onClick={() => {
                      setIsInboundPopupOpen(false);
                      setActiveScreen("calls");
                      navigate("/user/sales/calls");
                    }}
                  >
                    Open inbound
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setIsInboundPopupOpen(false);
                      setActiveScreen("callLogs");
                      navigate("/my-call-logs", {
                        state:{
                          direction:"inbound",
                          phone:inboundCall.callerNumber || inboundCall.customerNumber || "",
                        },
                      });
                    }}
                  >
                    Show in call log
                  </button>
                  <button type="button" className="ghost" onClick={() => setIsInboundPopupOpen(false)}>
                    Dismiss
                  </button>
                </div>
              </section>
            </div>
          )}

          {activeScreen === "home" && (
            <div className="sales-page-head">
              <div>
                <h1>{timeGreeting}, {panel.user?.firstName || userName}</h1>
                <p>{formatDashboardDate()} - {panel.leads.length} assigned leads</p>
              </div>
              <div className="sales-actions">
                {/* <button type="button" className="sales-range-btn">
                  Last 7 days
                </button> */}
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setActiveScreen("addLead");
                    navigate("/user/sales/add-lead");
                  }}
                >
                  + Add lead
                </button>
              </div>
            </div>
          )}

          {error && <div className="sales-alert">{error}. Showing saved login data.</div>}

          {activeScreen === "home" && (
            <div className="sales-stat-grid sales-home-metrics">
              {homeMetrics.map((metric) => (
                <button
                  className={`sales-stat sales-stat-click sales-home-metric ${metric.tone || ""}`}
                  key={metric.key}
                  type="button"
                  onClick={metric.onClick}
                >
                  <span>{metric.label}</span>
                  <strong>{loading ? "..." : metric.value}</strong>
                  <small>{metric.detail}</small>
                </button>
              ))}
            </div>
          )}

          {activeScreen === "followups" && (
            <div className="sales-stat-grid">
              <button type="button" className="sales-stat sales-stat-click" onClick={() => openFollowups("today")}>
                <span>Today follow-ups</span>
                <strong>{loading ? "..." : panel.stats.followupsToday || 0}</strong>
                <small>Due today</small>
              </button>
              <button type="button" className="sales-stat sales-stat-click" onClick={() => openFollowups("missed")}>
                <span>Missed follow-ups</span>
                <strong>{loading ? "..." : panel.stats.missedFollowups || 0}</strong>
                <small>Pending past time</small>
              </button>
              <button type="button" className="sales-stat sales-stat-click" onClick={() => openFollowups("upcoming")}>
                <span>Upcoming follow-ups</span>
                <strong>{loading ? "..." : panel.stats.upcomingFollowups || 0}</strong>
                <small>Future schedule</small>
              </button>
              <button type="button" className="sales-stat sales-stat-click" onClick={() => openFollowups("callbacks")}>
                <span>Callbacks due</span>
                <strong>{loading ? "..." : panel.stats.callbacksDue || 0}</strong>
                <small>Callback queue</small>
              </button>
              <button type="button" className="sales-stat sales-stat-click" onClick={() => openFollowups("all")}>
                <span>High priority</span>
                <strong>{loading ? "..." : panel.stats.highPriorityFollowups || 0}</strong>
                <small>Needs attention</small>
              </button>
            </div>
          )}

          {activeScreen === "home" && (
            <section className="sales-card sales-funnel-card">
              <div className="sales-card-head">
                <h2>This month's funnel</h2>
                <button type="button" className="sales-card-link" onClick={() => setActiveScreen("leads")}>
                  View details
                </button>
              </div>
              <div className="sales-funnel">
                {funnelData.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    className="sales-funnel-item"
                    onClick={() => handleFunnelClick(item.key)}
                    title={`Show ${item.detail}`}
                  >
                    <span
                      className="sales-funnel-bar"
                      style={{
                        background: item.color,
                        color: item.textColor,
                        height: `${item.height}px`,
                      }}
                    >
                      {loading ? "..." : item.value.toLocaleString("en-IN")}
                    </span>
                    <span className="sales-funnel-label">{item.label}</span>
                  </button>
                ))}
              </div>
            </section>
          )}

          {activeScreen === "profile" ? (
            <UserSalesProfile
              onProfileUpdated={(nextUser) => {
                setPanel((current) => ({ ...current, user:{ ...current.user, ...nextUser } }));
              }}
            />
          ) : activeScreen === "notifications" ? (
            <UserSalesNotifications
              onUnreadCountChange={setSalesUnreadCount}
              onOpenLink={openSalesNotificationLink}
            />
          ) : activeScreen === "addLead" ? (
            <div className="sales-user-add-lead">
              <UserAddlead
                currentUser={panel.user}
                onLeadCreated={async () => {
                  await loadPanel(false);
                  setActiveScreen("leads");
                }}
              />
            </div>
          ) : activeScreen === "followups" ? (
            <SalesFollowups
              activeFilter={activeFollowupFilter}
              leads={panel.leads}
              user={panel.user}
              onOpenCallLead={openCallPage}
              onOpenWhatsAppLead={openWhatsAppPage}
              onSendEmailLead={openEmailPage}
              onBookLead={openBookingPage}
              onOpenLead={openLeadDetails}
              onScheduleVisitLead={openSalesSiteVisitPage}
              onRefreshPanel={() => loadPanel(false)}
            />
          ) : activeScreen === "callLogs" ? (
            <CallLogsTable scope="sales" />
          ) : activeScreen === "disposition" ? (
            <section className="sales-call-workspace">
              {renderDispositionBuckets()}
            </section>
          ) : activeScreen === "calls" ? (
            <section className="sales-call-workspace">
              {inboundCall && (
                <div className="sales-inbound-inline-panel">
                  {renderInboundCalls()}
                </div>
              )}
              <div className="sales-call-head">
                <div>
                  <h2>Your queue</h2>
                  <p>{callQueue.length} leads - next SLA breach in 3 min</p>
                </div>
              </div>

              <div className="sales-call-note">
                <Users size={16} />
                <span>Telecaller mode - You see only leads assigned to you. Dispose each one before moving to the next.</span>
              </div>

              {currentCallLead ? (
                <div className="sales-call-card">
                  <div className="sales-call-card-head">
                    <button
                      type="button"
                      className="sales-lead-name sales-call-lead-trigger"
                      title="Call this lead"
                      disabled={callBlocked}
                      onClick={() => startSelectedCallLead(currentCallLead)}
                    >
                      <span className="sales-avatar call-avatar">{initials(getLeadName(currentCallLead))}</span>
                      <span>
                        <strong>{getLeadName(currentCallLead)}</strong>
                        <small>{getLeadPhone(currentCallLead)} - English, Hindi</small>
                      </span>
                    </button>
                    <div className="sales-call-badges">
                      <span>Score {currentCallLead.score || 78}</span>
                    </div>
                  </div>

                  <div className="sales-call-meta">
                    <div><span>Source</span><strong>{currentCallLead.channelPartner || currentCallLead.tags || "Website"}</strong></div>
                    <div><span>Interested in</span><strong>{getDisplayText(currentCallLead.interestedProjects || currentCallLead.propertyType)}</strong></div>
                    <div><span>Budget</span><strong>{getDisplayText(currentCallLead.budget || [currentCallLead.budgetMin, currentCallLead.budgetMax].filter(Boolean).join(" - "))}</strong></div>
                    <div><span>Attempt</span><strong>{callDispositions[getLeadId(currentCallLead)] ? "2 of 3" : "1 of 3"}</strong></div>
                  </div>

                  <div className="sales-call-sla">
                    SLA breach in 3 min. {currentCallLead.tags || "Assigned lead"}.
                  </div>

                  {currentCallLog && (
                    <div className="sales-live-call-status">
                      <span className={`status ${currentCallStatus}`}>{currentCallStatusLabel}</span>
                      {currentCallStatus === "connected" && <strong>{formatDuration(currentCallDuration)}</strong>}
                      <small>Call #{currentCallLog.id}</small>
                    </div>
                  )}
                  {!currentCallLog && currentCallRequest && (
                    <div className="sales-live-call-status">
                      <span className={`status ${outboundCallStatus}`}>{outboundCallStatus.replace(/-/g, " ")}</span>
                      <small>Request {String(currentCallRequest.requestId).slice(0, 8)}</small>
                    </div>
                  )}
                  {callError && (
                    <div className="sales-inline-error">
                      <span>{callError}</span>
                      {activeBlockedCall?.id && (
                        <button type="button" onClick={completeActiveBlockedCall}>
                          Complete active call
                        </button>
                      )}
                    </div>
                  )}

                  <div className="sales-call-actions">
                    <button
                      className="primary"
                      type="button"
                      disabled={callBlocked}
                      onClick={() => startSelectedCallLead(currentCallLead)}
                    >
                      {outboundCallButtonText}
                    </button>
                    <button
                      type="button"
                      onClick={() => openWhatsAppPage(currentCallLead)}
                    >
                      WhatsApp
                    </button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "callback")}>
                      Skip
                    </button>
                  </div>

                  <div className="sales-call-dispositions">
                    <button type="button" className="qualified" onClick={() => openCallDisposition(currentCallLead, "qualified")}>Qualified →</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "callback")}>Callback later</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "interestedProject")}>Interested Project</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "siteVisit")}>Site visit scheduled</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "notInterested")}>Not interested</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "wrongNumber")}>Wrong number</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "noAnswer")}>No answer</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "busy")}>Busy</button>
                    <button type="button" onClick={() => openCallDisposition(currentCallLead, "followUp")}>Follow-up required</button>
                    <button type="button" className="danger" onClick={() => openCallDisposition(currentCallLead, "junk")}>Junk</button>
                  </div>
                </div>
              ) : (
                <div className="sales-card sales-empty">No leads are waiting in the call queue.</div>
              )}

              <div className="sales-call-list-card">
                <div className="sales-card-head">
                  <h2>Up next</h2>
                  <button type="button" className="sales-card-link" onClick={() => setActiveScreen("leads")}>View all {panel.leads.length}</button>
                </div>
                {upNextLeads.length === 0 && <div className="sales-empty compact">No more queued leads.</div>}
                {upNextLeads.map((lead) => (
                  <button
                    type="button"
                    className="sales-call-next-row"
                    key={getLeadId(lead)}
                    disabled={callBlocked}
                    onClick={() => startSelectedCallLead(lead)}
                  >
                    <span>
                      <strong>{getLeadName(lead)} - Score {lead.score || 65}</strong>
                      <small>{lead.channelPartner || lead.tags || "Lead"} - {callDispositions[getLeadId(lead)]?.label || "new"}</small>
                    </span>
                    <time>Today {lead.conductSiteDate ? formatTaskDate(lead.conductSiteDate) : "9:15 AM"}</time>
                  </button>
                ))}
              </div>

              <div className="sales-call-stats">
                <div><span>Today's dials</span><strong>{todayDialCount}</strong></div>
                <div><span>Connected</span><strong>{connectedCallLeads.length}</strong></div>
                <div><span>Qualified</span><strong>{qualifiedCount}</strong></div>
                <div><span>Talk time</span><strong>{connectedCallLeads.length ? `${connectedCallLeads.length * 7}m` : "0m"}</strong></div>
              </div>

              {connectedCallLeads.length > 0 && (
                <div className="sales-call-list-card">
                  <div className="sales-card-head">
                    <h2>Connected leads</h2>
                    <p>{connectedCallLeads.length} connected</p>
                  </div>
                  {connectedCallLeads.map((lead) => (
                    <div className="sales-call-next-row static" key={getLeadId(lead)}>
                      <span>
                        <strong>{getLeadName(lead)}</strong>
                        <small>{callDispositions[getLeadId(lead)]?.label || "Connected"} - {getLeadPhone(lead)}</small>
                      </span>
                      <time>{getCreatedLabel(lead)}</time>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : activeScreen === "scheduleVisit" ? (
            <section className="sales-card sales-visit-card">
              <div className="sales-card-head">
                <div>
                  <h2>Schedule Site Visit</h2>
                  <p>Create and update site visit status for admin conversation access</p>
                </div>
              </div>

              <form className="sales-visit-form" onSubmit={saveSiteVisit}>
                <label>
                  <span>Lead</span>
                  <SalesSearchableSelect
                    value={siteVisitForm.leadId}
                    options={siteVisitLeadOptions}
                    placeholder="Select lead"
                    searchPlaceholder="Search lead..."
                    onChange={(value) => handleSiteVisitChange({ target: { name: "leadId", value } })}
                  />
                </label>

                <label>
                  <span>Project</span>
                  <SalesSearchableSelect
                    value={siteVisitForm.project}
                    options={siteVisitProjectOptions}
                    placeholder={isLoadingProjects ? "Loading projects..." : "Select project"}
                    searchPlaceholder="Search project..."
                    disabled={isLoadingProjects}
                    onChange={(value) => handleSiteVisitChange({ target: { name: "project", value } })}
                  />
                </label>

                <label>
                  <span>Date and time</span>
                  <input
                    name="visitDateTime"
                    type="datetime-local"
                    value={siteVisitForm.visitDateTime}
                    onChange={handleSiteVisitChange}
                    required
                  />
                </label>

                <label>
                  <span>Customer location / meeting point</span>
                  <input
                    name="location"
                    value={siteVisitForm.location}
                    onChange={handleSiteVisitChange}
                    placeholder="Pickup address or meeting point"
                  />
                </label>

                <label>
                  <span>Assign sales executive</span>
                  <SalesSearchableSelect
                    value={siteVisitForm.executiveId}
                    options={siteVisitExecutiveOptions}
                    placeholder={isLoadingUsers ? "Loading executives..." : "Select sales executive"}
                    searchPlaceholder="Search executive..."
                    disabled={isLoadingUsers}
                    onChange={(value) => {
                      const selectedExecutive = salesExecutiveOptions.find((executive) => String(executive.id) === String(value));
                      setSiteVisitForm((current) => ({
                        ...current,
                        executiveId: value,
                        executive: selectedExecutive?.name || siteVisitForm.executive,
                      }));
                    }}
                  />
                </label>

                <label>
                  <span>Visit Status</span>
                  <SalesSearchableSelect
                    value={siteVisitForm.status}
                    options={siteVisitStatusSelectOptions}
                    placeholder="Select status"
                    searchPlaceholder="Search status..."
                    onChange={(value) => handleSiteVisitChange({ target: { name: "status", value } })}
                  />
                </label>

                <label className="sales-visit-note">
                  <span>Visit note</span>
                  <textarea
                    name="note"
                    value={siteVisitForm.note}
                    onChange={handleSiteVisitChange}
                    placeholder="Customer interest, meeting instructions, documents to carry..."
                  />
                </label>

                <div className="sales-visit-summary">
                  <div>
                    <span>Selected lead</span>
                    <strong>{siteVisitLead ? getLeadName(siteVisitLead) : "No lead selected"}</strong>
                  </div>
                  <div>
                    <span>Phone</span>
                    <strong>{siteVisitLead ? getLeadPhone(siteVisitLead) : "-"}</strong>
                  </div>
                  <div>
                    <span>Status visible to admin</span>
                    <strong>{siteVisitForm.status}</strong>
                  </div>
                </div>

                {siteVisitMessage && <div className="sales-visit-message">{siteVisitMessage}</div>}

                <div className="sales-visit-actions">
                  <button type="button" onClick={() => setActiveScreen("conversation")}>
                    Back to Conversation
                  </button>
                  <button className="primary" type="submit" disabled={isSavingSiteVisit}>
                    {isSavingSiteVisit ? "Saving..." : "Save visit"}
                  </button>
                </div>
              </form>
            </section>
          ) : activeScreen === "conversation" ? (
            <UserConversationPanel
              leads={panel.leads}
              user={panel.user}
              loading={loading}
              onOpenCallLead={openCallPage}
              onOpenWhatsAppLead={openWhatsAppPage}
              onScheduleVisitLead={openScheduleVisit}
            />
          ) : activeScreen === "whatsapp" ? (
            <UserWhatsAppPage
              leads={panel.leads}
              user={panel.user}
              loading={loading}
              embedded
            />
          ) : activeScreen === "details" ? (
            <UserDetails
              context="sales"
              onOpenCallLead={openCallPage}
              onOpenWhatsAppLead={openWhatsAppPage}
              onScheduleVisitLead={openSalesSiteVisitPage}
            />
          ) : activeScreen === "tasks" ? (
            <section className="sales-card sales-tasks-card">
              <div className="sales-card-head">
                <div>
                  <h2>My tasks</h2>
                  <p>{assignedTasks.length} assigned task records</p>
                </div>
              </div>

              <div className="sales-task-list">
                {assignedTasks.length === 0 && (
                  <div className="sales-empty">No tasks assigned to this user yet.</div>
                )}
                {assignedTasks.map((task) => (
                  <div className="sales-task-row" key={task.id}>
                    <div>
                      <strong>{task.title || "Untitled Task"}</strong>
                      <small>{task.description || task.subtitle || task.type || "Follow up"}</small>
                    </div>
                    <div>
                      <span>Priority</span>
                      <strong>{task.priority || "Medium"}</strong>
                    </div>
                    <div>
                      <span>Due</span>
                      <strong>{formatTaskDate(task.dueDate || task.dueOn)}</strong>
                    </div>
                    <label className="sales-task-status">
                      <span>Status</span>
                      <select
                        value={task.status || "Open"}
                        onChange={(event) => updateTaskStatus(task.id, event.target.value)}
                      >
                        {taskStatusOptions.map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                    </label>
                    <div className="sales-task-actions">
                      <span>Action</span>
                      <button type="button" onClick={() => setViewTask(task)}>
                        View
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ) : (
          <div className="sales-grid">
            <section className="sales-card sales-leads-card">
              <div className="sales-card-head">
                <div>
                  <h2>{activeScreen === "home" ? "My active leads" : navItems.find((item) => item.key === activeScreen)?.label}</h2>
                  <p>{visibleRecordCount} records available</p>
                </div>
              </div>

              {isSearchableLeadTable && (
                <div className="sales-table-toolbar">
                  <label className="sales-table-search">
                    <Search size={15} />
                    <input
                      type="search"
                      value={leadTableSearch}
                      onChange={(event) => setLeadTableSearch(event.target.value)}
                      placeholder={activeScreen === "bookings" ? "Search booked leads..." : "Search leads..."}
                      aria-label={activeScreen === "bookings" ? "Search booked leads" : "Search leads"}
                    />
                  </label>
                </div>
              )}

              <div className="sales-stage-tabs" aria-label="Lead stage filters">
                {visibleLeadStageFilters.map((stage) => (
                  <button
                    key={stage.key}
                    type="button"
                    className={activeLeadStage === stage.key ? "active" : ""}
                    onClick={() => setActiveLeadStage(stage.key)}
                  >
                    {stage.label}
                  </button>
                ))}
              </div>

              <div className="sales-table">
                <div className={`sales-table-head ${activeDispositionFilter ? "with-disposition" : ""}`}>
                  <span>Lead</span>
                  <span>Requirement</span>
                  <span>Status</span>
                  {activeDispositionFilter && <span>Disposition details</span>}
                  <span>Action</span>
                </div>
                {tableLeads.length === 0 && (
                  <div className="sales-empty">
                    {activeScreen === "bookings"
                      ? leadTableSearch.trim()
                        ? "No booked leads match your search."
                        : "No booked leads available for this sales user yet."
                      : leadTableSearch.trim() && isPaginatedLeadTable
                        ? "No leads match your search."
                        : "No leads available for this sales user yet."}
                  </div>
                )}
                {tableLeads.map((lead) => {
                  const leadId = getLeadId(lead);
                  const latestDisposition = getLeadDisposition(lead);
                  const dispositionLabel =
                    activeDispositionFilter === "Site Visit Scheduled" && leadHasScheduledSiteVisit(lead)
                      ? "Site Visit Scheduled"
                      : latestDisposition?.disposition || "-";
                  const dispositionDetail =
                    activeDispositionFilter === "Site Visit Scheduled" && leadHasScheduledSiteVisit(lead)
                      ? getLeadSiteVisitDetail(lead)
                      : getDispositionDetail(latestDisposition);

                  return (
                  <div
                    className={`sales-row ${activeDispositionFilter ? "with-disposition" : ""}`}
                    key={leadId || lead.email}
                    onClick={() => {
                      if (isBookedLead(lead)) {
                        openBookingPreview(lead);
                        return;
                      }
                      openLeadDetails(lead);
                    }}
                  >
                    <span className="sales-lead-name">
                      <span className="sales-avatar small">{initials(getLeadName(lead))}</span>
                      <span>
                        <strong>{getLeadName(lead)}</strong>
                        <small>{getLeadPhone(lead)}</small>
                      </span>
                    </span>
                    <span>
                      <strong>{getDisplayText(lead.interestedProjects || lead.propertyType)}</strong>
                      <small>{getDisplayText(lead.configration || lead.budget)}</small>
                    </span>
                    <span>
                      <mark>{statusLabel[lead.status] || lead.status || "New"}</mark>
                    </span>
                    {activeDispositionFilter && (
                      <span className="sales-disposition-cell">
                        <strong>{dispositionLabel}</strong>
                        <small>{dispositionDetail}</small>
                      </span>
                    )}
                    <span className="sales-row-actions" onClick={(event) => event.stopPropagation()}>
                      <button
                        type="button"
                        className="sales-row-menu-btn"
                        title="Open lead actions"
                        aria-label="Open lead actions"
                        onClick={(event) => toggleLeadActionMenu(event, lead)}
                      >
                        <MoreVertical size={16} />
                      </button>
                      {openActionLeadId === leadId && (
                        <div className="sales-row-menu">
                          {/* Lead action menu change: Call and WhatsApp actions removed from this dropdown. */}
                          <button type="button" onClick={() => openLeadDetails(lead)}>
                            Preview
                          </button>
                           <button type="button" onClick={() => openLeadPreview(lead, true)}>
                            {isBookedLead(lead) ? "Preview Booking" : "Booked Lead"}
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                  );
                })}
              </div>
              {isPaginatedLeadTable && searchedLeads.length > 0 && (
                <div className="sales-table-pagination">
                  <span>
                    Showing {(leadTablePage - 1) * salesTablePageSize + 1}-
                    {Math.min(leadTablePage * salesTablePageSize, searchedLeads.length)} of {searchedLeads.length}
                  </span>
                  <div>
                    <button
                      type="button"
                      disabled={leadTablePage === 1}
                      onClick={() => setLeadTablePage((current) => Math.max(1, current - 1))}
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      disabled={leadTablePage >= leadTableTotalPages}
                      onClick={() => setLeadTablePage((current) => Math.min(leadTableTotalPages, current + 1))}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </section>

            <aside className="sales-card">
              <div className="sales-card-head">
                <div>
                  <h2>Quick actions</h2>
                  <p>Sales workflow</p>
                </div>
              </div>
              <div className="sales-action-list">
                <button type="button" disabled={callBlocked} onClick={() => {
                  if (currentCallLead) {
                    openCallPage(currentCallLead);
                    return;
                  }
                  openCallPage();
                }}><Phone size={15} /> Call next lead</button>
                <button type="button" onClick={() => openScheduleVisit()}><CalendarDays size={15} /> Schedule visit</button>
              </div>

              <div className="sales-card-head compact">
                <div>
                  <h2>Recent bookings</h2>
                  <p>{panel.bookings.length} found</p>
                </div>
              </div>
              <div className="sales-bookings">
                {panel.bookings.length === 0 && <div className="sales-empty compact">No bookings yet.</div>}
                {panel.bookings.map((booking) => (
                  <div className="sales-booking" key={booking.id}>
                    <strong>{booking.customerName || "Customer"}</strong>
                    <small>{getDisplayText(booking.projectDetails || booking.unit, "Unit details pending")}</small>
                  </div>
                ))}
              </div>
            </aside>
          </div>
          )}
        </section>
      </main>

      {viewTask && (
        <SalesTaskViewModal task={viewTask} onClose={() => setViewTask(null)} />
      )}

      <UserBookingForm
        isOpen={isBookingFormOpen}
        bookingSteps={bookingSteps}
        bookingStepIndex={bookingStepIndex}
        bookingMessage={bookingMessage}
        bookingProjectMessage={bookingProjectMessage}
        bookingForm={bookingForm}
        leadName={bookingLead ? getLeadName(bookingLead) : "Selected lead"}
        isSavingBooking={isSavingBooking}
        isLoadingBookingProject={false}
        bookingSuccess={isBookingSuccess}
        onClose={closeBookingForm}
        bookingHoldOwner={userName}
        onSubmit={handleSaveBooking}
        onPrevious={() => {
          setBookingMessage("");
          setBookingProjectMessage("");
          setBookingStepIndex((current) => Math.max(0, current - 1));
        }}
        onFieldChange={handleBookingFieldChange}
        onMarkInterested={() =>
          setBookingProjectMessage(
            bookingForm.unit ? `${bookingForm.unit} marked as interested.` : "Select a unit before marking interest."
          )
        }
      />

      <BookingPreviewModal
        booking={bookingPreview?.booking}
        lead={bookingPreview?.lead}
        onClose={() => setBookingPreview(null)}
      />

      {activeModal !== "mcube" && (
        <CallDispositionModal
          lead={dispositionTarget?.lead || null}
          callLog={dispositionTarget?.callLog || null}
          projects={projects}
          initialDisposition={dispositionInitialValue}
          onClose={() => {
            setDispositionTarget(null);
            setDispositionInitialValue("");
            setActiveModal(null);
            resetOutboundCallState();
          }}
          onSaved={(savedCallLog) => {
            const leadId = savedCallLog?.leadId ? String(savedCallLog.leadId) : "";
            if (leadId) {
              setCallLogsByLead((current) => ({ ...current, [leadId]:savedCallLog }));
              setCallDispositions((current) => ({
                ...current,
                [leadId]:{
                  type:savedCallLog.disposition,
                  label:savedCallLog.disposition,
                  time:new Date().toISOString(),
                },
              }));
              setDisposedLeadIds((current) => current.includes(leadId) ? current : [...current, leadId]);
              const nextLead = panel.leads.find((item) => {
                const itemLeadId = String(getLeadId(item));
                return itemLeadId !== leadId &&
                  !disposedLeadIds.includes(itemLeadId) &&
                  !isLeadDisposedFromCalling(item, callLogsByLead[itemLeadId]);
              });
              setFocusedCallLeadId(nextLead ? getLeadId(nextLead) : null);
            }
            if (String(savedCallLog?.direction || "").toLowerCase() === "inbound") {
              setInboundCall((current) => current ? {
                ...current,
                lead:enrichLeadForInbound(savedCallLog.lead || current.lead),
                callerNumber:savedCallLog.callerNumber || savedCallLog.customerNumber || savedCallLog.leadPhone || savedCallLog.phone || current.callerNumber,
                customerNumber:savedCallLog.customerNumber || savedCallLog.callerNumber || savedCallLog.leadPhone || savedCallLog.phone || current.customerNumber,
                status:savedCallLog.status || current.status,
                disposition:savedCallLog.disposition || current.disposition,
                duration:savedCallLog.duration || current.duration,
                endedAt:savedCallLog.endedAt || current.endedAt,
              } : current);
              setCallLogCount((count) => count + (savedCallLog?.id ? 0 : 1));
            }
            setDispositionTarget(null);
            setDispositionInitialValue("");
            setActiveModal(null);
            resetOutboundCallState();
          }}
        />
      )}

    </div>
  );
};

const SalesSearchableSelect = ({
  value,
  options,
  placeholder,
  searchPlaceholder = "Search...",
  disabled = false,
  onChange,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState("");
  const selectedOption = options.find((option) => String(option.value) === String(value));
  const filteredOptions = options.filter((option) =>
    [option.label, option.sub]
      .filter(Boolean)
      .some((text) => String(text).toLowerCase().includes(search.trim().toLowerCase()))
  );

  const close = () => {
    setIsOpen(false);
    setSearch("");
  };

  return (
    <div
      className="sales-search-select"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) close();
      }}
    >
      <button
        type="button"
        className="sales-search-select-trigger"
        aria-haspopup="listbox"
        aria-expanded={isOpen}
        disabled={disabled}
        onClick={() => setIsOpen((current) => !current)}
      >
        <span>{selectedOption?.label || placeholder}</span>
        <ChevronDown size={16} />
      </button>

      {isOpen && (
        <div className="sales-search-select-menu" role="listbox">
          <div className="sales-search-select-search">
            <input
              autoFocus
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder={searchPlaceholder}
            />
          </div>
          <div className="sales-search-select-options">
            {filteredOptions.map((option) => (
              <button
                type="button"
                role="option"
                aria-selected={String(option.value) === String(value)}
                className={String(option.value) === String(value) ? "selected" : ""}
                key={`${option.value}-${option.label}`}
                onClick={() => {
                  onChange(option.value);
                  close();
                }}
              >
                <strong>{option.label}</strong>
                {option.sub && <small>{option.sub}</small>}
              </button>
            ))}
            {!filteredOptions.length && (
              <div className="sales-search-select-empty">No options found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

const SalesTaskViewModal = ({ task, onClose }) => {
  const attachments = getTaskAttachments(task);
  const taskDetails = [
    ["Status", task.status || "Open"],
    ["Priority", task.priority || "Medium"],
    ["Due Date", formatTaskDate(task.dueDate || task.dueOn)],
    ["Due Time", task.dueTime || "-"],
    ["Assigned By", task.assignedBy ? getName(task.assignedBy) : task.assignedByName || "-"],
  ];

  return (
    <div className="sales-task-modal-backdrop">
      <section className="sales-task-modal" role="dialog" aria-modal="true" aria-labelledby="sales-task-view-title">
        <div className="sales-task-modal-head">
          <div>
            <h2 id="sales-task-view-title">{task.title || "Untitled Task"}</h2>
            <p>{task.description || task.subtitle || task.type || "Task details"}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close task details">
            X
          </button>
        </div>

        <div className="sales-task-modal-grid">
          {taskDetails.map(([label, value]) => (
            <div className="sales-task-modal-field" key={label}>
              <span>{label}</span>
              <strong>{value}</strong>
            </div>
          ))}
        </div>

        <div className="sales-task-modal-section">
          <h3>Attachments</h3>
          {attachments.length === 0 ? (
            <p className="sales-task-modal-empty">No attachments uploaded for this task.</p>
          ) : (
            <div className="sales-task-attachment-list">
              {attachments.map((attachment) => {
                const href = getAttachmentHref(attachment);
                return (
                  <div className="sales-task-attachment" key={attachment.id}>
                    <span>{attachment.name}</span>
                    {href ? (
                      <a
                        className="sales-task-attachment-view"
                        href={href}
                        target="_blank"
                        rel="noreferrer"
                      >
                        View
                      </a>
                    ) : (
                      <button type="button" className="sales-task-attachment-view" disabled>
                        View
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>
    </div>
  );
};

export default SalesUserPanel;
