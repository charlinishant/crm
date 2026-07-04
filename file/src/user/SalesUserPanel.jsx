import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
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
  Users,
} from "lucide-react";
import "./SalesUserPanel.css";
import UserAddlead from "./userAddlead";
import UserConversationPanel from "./UserConversationPanel";
import UserDetails from "./userDetails";
import UserWhatsAppPage from "./UserWhatsAppPage";
import SalesFollowups from "../pages/sales/SalesFollowups";
import UserBookingForm from "./UserBookingForm";
import BookingPreviewModal from "./BookingPreviewModal";
import CallDispositionModal from "./CallDispositionModal";
import StartCallModal from "./StartCallModal";
import CallLogsTable from "../components/CallLogsTable";

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
        : pathname.endsWith("/calls")
          ? "calls"
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

const getSalesExecutiveName = (value) => {
  if (!value) return "";
  if (typeof value !== "object") return String(value);
  return getName(value);
};

const getProfilePhoto = (user) => {
  if (user?.profilePhoto) return user.profilePhoto;
  if (!user?.email) return "";

  const profilePhotos = JSON.parse(localStorage.getItem("userProfilePhotos") || "{}");
  return profilePhotos[user.email.trim().toLowerCase()] || "";
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

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

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

const isBookedLead = (lead) =>
  getLeadStage(lead) === "booked" ||
  (lead?.bookings || []).some((booking) => normalizeStageText(booking?.stage) === "booked");

const taskStatusOptions = ["Open", "Completed", "Archived"];
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
  try {
    const cachedUpdates = JSON.parse(localStorage.getItem("siteVisitStatusUpdates") || "{}");
    return cachedUpdates[String(leadId)] || null;
  } catch (error) {
    return null;
  }
};

const getCachedLeadStatusUpdates = () => {
  try {
    return JSON.parse(localStorage.getItem("leadStatusUpdates") || "{}");
  } catch (error) {
    return {};
  }
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

const withAttendanceLoadedAt = (attendance) =>
  attendance ? { ...attendance, loadedAt: Date.now() } : null;

const getTimeGreeting = () => {
  const hour = new Date().getHours();

  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
};

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
  const [callingLeadId, setCallingLeadId] = useState(null);
  const [callTarget, setCallTarget] = useState(null);
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
  const [leadTableSearch, setLeadTableSearch] = useState("");
  const [leadTablePage, setLeadTablePage] = useState(1);
  const [projects, setProjects] = useState([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [users, setUsers] = useState([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [isExecutiveDropdownOpen, setIsExecutiveDropdownOpen] = useState(false);
  const [attendance, setAttendance] = useState(null);
  const [attendanceBusy, setAttendanceBusy] = useState(false);
  const [attendanceNow, setAttendanceNow] = useState(Date.now());
  // Dashboard detail pages reuse this sidebar state so focused workspaces can auto-collapse it.
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(
    initialScreen === "whatsapp" || initialScreen === "details"
  );
  const [timeGreeting, setTimeGreeting] = useState(() => getTimeGreeting());

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

        if (currentResult?.data) {
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
  const callQueue = useMemo(() => {
    return panel.leads.filter((lead) => !disposedLeadIds.includes(String(getLeadId(lead))));
  }, [disposedLeadIds, panel.leads]);

  useEffect(() => {
    const interval = window.setInterval(() => setCallNow(Date.now()), 1000);
    return () => window.clearInterval(interval);
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
          if (["completed", "failed", "no-answer", "busy", "canceled"].includes(String(nextLog.status).toLowerCase()) && !nextLog.disposition) {
            const lead = panel.leads.find((item) => String(getLeadId(item)) === String(nextLog.leadId));
            if (lead) {
              setDispositionInitialValue(nextLog.status === "no-answer" ? "No Answer" : nextLog.status === "busy" ? "Busy" : "");
              setDispositionTarget((current) => current || { lead, callLog:nextLog });
            }
          }
        } catch (pollError) {
          console.error("Unable to refresh call status:", pollError);
        }
      }));
    };

    poll();
    const interval = window.setInterval(poll, 3000);
    return () => window.clearInterval(interval);
  }, [callLogsByLead, panel.leads]);

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

  const filteredLeads = useMemo(() => {
    let leads = panel.leads;

    if (activeScreen === "followups") {
      leads = leads.filter((lead) => {
        const status = normalizeStageText(lead.status);
        return status === "fresh lead" || status === "prospect" || status === "new" || callbackLeadIds.has(String(getLeadId(lead)));
      });
    }

    if (activeScreen === "bookings") {
      leads = leads.filter((lead) => normalizeStageText(lead.status) === "booked");
    }

    if (activeScreen !== "bookings") {
      if (activeLeadStage === "visited") {
        leads = leads.filter((lead) => lead.conductSiteVisit || lead.conductSiteDate);
      } else if (activeLeadStage !== "all") {
        leads = leads.filter((lead) => getLeadStage(lead) === activeLeadStage);
      }
    }

    return leads;
  }, [activeLeadStage, activeScreen, callbackLeadIds, panel.leads]);

  const isPaginatedLeadTable = activeScreen === "leads" || activeScreen === "bookings";

  const searchedLeads = useMemo(() => {
    if (!isPaginatedLeadTable) return filteredLeads;

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
  }, [filteredLeads, isPaginatedLeadTable, leadTableSearch]);

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
    setIsExecutiveDropdownOpen(false);
    setSiteVisitLead(nextLead);
    setSiteVisitMessage("");
    setSiteVisitForm({
      leadId: nextLeadId ? String(nextLeadId) : "",
      project: visitData.siteVisitProject || visitData.conductSiteVisit || nextLead?.interestedProjects || nextLead?.propertyType || "",
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
    setIsExecutiveDropdownOpen(false);
    setSiteVisitLead(nextLead);
    setSiteVisitForm((current) => {
      return {
        ...current,
        leadId: value,
        project: nextLead?.siteVisitProject || nextLead?.conductSiteVisit || nextLead?.interestedProjects || nextLead?.propertyType || current.project,
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

    const previousLeads = panel.leads;
    const previousStats = panel.stats;
    const leadId = siteVisitForm.leadId;

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
      const response = await fetch(`${API_URL}/leads/${leadId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to schedule visit");

      try {
        await fetch(`${API_URL}/schedule-visits`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
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
      } catch (error) {
        console.error("Unable to save schedule visit table row:", error);
      }

      try {
        const cachedUpdates = JSON.parse(localStorage.getItem("siteVisitStatusUpdates") || "{}");
        cachedUpdates[leadId] = {
          ...updates,
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("siteVisitStatusUpdates", JSON.stringify(cachedUpdates));
        window.dispatchEvent(new Event("siteVisitStatusUpdated"));
      } catch (error) {
        console.error("Unable to cache site visit status:", error);
      }

      setPanel((current) => ({
        ...current,
        leads: current.leads.map((lead) =>
          String(getLeadId(lead)) === String(leadId) ? { ...lead, ...result, ...updates } : lead
        ),
      }));
      setSiteVisitLead((current) => (current ? { ...current, ...result, ...updates } : current));
      setSiteVisitMessage("Site visit saved. Admin conversation/site visit status can read this lead status.");
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
      setCallTarget(lead);
    }
    setOpenActionLeadId(null);
    setActiveScreen("calls");
    const leadId = lead ? getLeadId(lead) : "";
    navigate(`/user/sales/calls${leadId ? `?leadId=${leadId}` : ""}`);
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

  const startLeadCall = async (lead, agentPhone) => {
    const leadId = getLeadId(lead);
    const leadPhone = getActionPhone(lead);
    const savedUser = JSON.parse(localStorage.getItem("authUser") || "null");

    if (!leadId || !leadPhone) {
      throw new Error("Lead phone number is missing.");
    }

    try {
      setCallingLeadId(leadId);
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/calls/start`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          leadId: Number(leadId),
          agentId: panel.user?.id || savedUser?.id,
          leadPhone,
          agentPhone,
        }),
      });
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Unable to start call");
      }

      setCallLogsByLead((current) => ({
        ...current,
        [leadId]: result.callLog,
      }));
      return result.callLog;
    } catch (error) {
      throw new Error(error.message || "Unable to start call");
    } finally {
      setCallingLeadId(null);
    }
  };

  const openCallDisposition = (lead, type = "") => {
    const leadId = getLeadId(lead);
    if (!leadId) return;

    const dispositionLabels = {
      qualified: "Qualified",
      callback: "Callback Later",
      siteVisit: "Site Visit Scheduled",
      notInterested: "Not Interested",
      wrongNumber: "Wrong Number",
      junk: "Junk",
      noAnswer: "No Answer",
      busy: "Busy",
      followUp: "Follow-up Required",
    };
    const callLog = callLogsByLead[leadId];
    if (!callLog?.id) {
      setCallTarget(lead);
      return;
    }
    setDispositionInitialValue(dispositionLabels[type] || type);
    setDispositionTarget({ lead, callLog });
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
          bookedBy: userName,
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

      try {
        const cachedUpdates = JSON.parse(localStorage.getItem("leadStatusUpdates") || "{}");
        cachedUpdates[String(leadId)] = {
          status: "Booked",
          crmStatus: "Booked",
          score: 100,
          backendStatus: "Booked",
          updatedAt: new Date().toISOString(),
        };
        localStorage.setItem("leadStatusUpdates", JSON.stringify(cachedUpdates));
      } catch (error) {
        console.error("Unable to cache booked lead status:", error);
      }

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
  const liveTodayLoginSeconds =
    (Number(attendance?.todayLoginSeconds) || 0) +
    (attendance && !attendance.logoutAt ? secondsSince(attendance.loadedAt, attendanceNow) : 0);
  const liveTodayBreakSeconds =
    (Number(attendance?.todayBreakSeconds) || 0) +
    (attendance?.breakStartedAt && !attendance?.breakEndedAt ? secondsSince(attendance.loadedAt, attendanceNow) : 0);

  const toggleBreak = () => {
    updateAttendance(isOnBreak ? "break/end" : "break/start");
  };

  const logout = async () => {
    await updateAttendance("logout");
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    window.location.href = "/sign-in";
  };

  const assignedTasks = panel.tasks || [];
  const currentCallLead = useMemo(() => {
    return panel.leads.find((lead) => String(getLeadId(lead)) === String(focusedCallLeadId)) || callQueue[0] || null;
  }, [callQueue, focusedCallLeadId, panel.leads]);
  const currentCallLog = currentCallLead ? callLogsByLead[getLeadId(currentCallLead)] : null;
  const currentCallStatus = String(currentCallLog?.status || "").toLowerCase();
  const isCurrentCallActive = currentCallLog?.id && !["completed", "failed", "no-answer", "busy", "canceled"].includes(currentCallStatus) && !currentCallLog.disposition;
  const currentCallDuration = currentCallStatus === "connected"
    ? Math.max(0, Math.floor((callNow - new Date(currentCallLog.connectedAt || currentCallLog.startedAt).getTime()) / 1000))
    : Number(currentCallLog?.duration) || 0;
  const upNextLeads = callQueue.filter((lead) => getLeadId(lead) !== getLeadId(currentCallLead)).slice(0, 3);
  const todayDialCount = Object.keys(callDispositions).length;
  const qualifiedCount = Object.values(callDispositions).filter((item) => item?.type === "qualified").length;

  const navItems = [
    { key: "home", label: "Home", icon: Home },
    { key: "leads", label: "My Leads", icon: Users, count: panel.stats.assignedLeads },
    // { key: "calls", label: "Calls", icon: Phone, count: callQueue.length },
    { key: "conversation", label: "Conversation", icon: MessageSquare, count: panel.leads.length },
    { key: "callLogs", label: "My Call Logs", icon: History },
    { key: "followups", label: "Follow-ups", icon: CalendarDays, count: panel.stats.followupsDue },
    { key: "scheduleVisit", label: "Schedule Visit", icon: CalendarDays, count: panel.stats.siteVisits },
    { key: "bookings", label: "Bookings", icon: LayoutDashboard, count: panel.stats.bookings },
   
    { key: "whatsapp", label: "WhatsApp", icon: Smartphone, count: panel.leads.filter((lead) => getActionPhone(lead).replace(/\D/g, "")).length },
    { key: "tasks", label: "Tasks", icon: LayoutDashboard, count: panel.stats.tasks },
  ];

  const visibleLeadStageFilters =
    activeScreen === "bookings"
      ? [{ key: "all", label: "All" }]
      : leadStageFilters;

  return (
    <div
      className={`sales-panel ${isSidebarCollapsed ? "sidebar-collapsed" : ""} ${
        activeScreen === "whatsapp" ? "whatsapp-screen" : ""
      } ${
        activeScreen === "details" ? "details-screen" : ""
      }`}
      style={{ fontSize: "13px" }}
    >
      <aside className="sales-sidebar">
        <div className="sales-brand">
          <img className="sales-logo" src="/assets/images/logo.png" alt="Insitearc" />
          
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
          <button className="sales-icon-btn" type="button" title="Notifications">
            <Bell size={17} />
          </button>
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
            <ChevronDown size={14} />
          </div>
          <button className="sales-icon-btn" type="button" title="Logout" onClick={logout}>
            <LogOut size={17} />
          </button>
        </header>

        <section className="sales-content">
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

          {activeScreen === "addLead" ? (
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
          ) : activeScreen === "calls" ? (
            <section className="sales-call-workspace">
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
                    <div className="sales-lead-name">
                      <span className="sales-avatar call-avatar">{initials(getLeadName(currentCallLead))}</span>
                      <span>
                        <strong>{getLeadName(currentCallLead)}</strong>
                        <small>{getLeadPhone(currentCallLead)} - English, Hindi</small>
                      </span>
                    </div>
                    <div className="sales-call-badges">
                      <span>Score {currentCallLead.score || 78}</span>
                      <strong>Hot - 9 min left</strong>
                    </div>
                  </div>

                  <div className="sales-call-meta">
                    <div><span>Source</span><strong>{currentCallLead.channelPartner || currentCallLead.tags || "Website"}</strong></div>
                    <div><span>Interested in</span><strong>{currentCallLead.interestedProjects || currentCallLead.propertyType || "-"}</strong></div>
                    <div><span>Budget</span><strong>{currentCallLead.budget || [currentCallLead.budgetMin, currentCallLead.budgetMax].filter(Boolean).join(" - ") || "-"}</strong></div>
                    <div><span>Attempt</span><strong>{callDispositions[getLeadId(currentCallLead)] ? "2 of 3" : "1 of 3"}</strong></div>
                  </div>

                  <div className="sales-call-sla">
                    SLA breach in 3 min. {currentCallLead.tags || "Assigned lead"}.
                  </div>

                  {currentCallLog && (
                    <div className="sales-live-call-status">
                      <span className={`status ${currentCallStatus}`}>{currentCallStatus.replace("-", " ")}</span>
                      {currentCallStatus === "connected" && <strong>{formatDuration(currentCallDuration)}</strong>}
                      <small>Call #{currentCallLog.id}</small>
                    </div>
                  )}

                  <div className="sales-call-actions">
                    <button
                      className="primary"
                      type="button"
                      disabled={String(callingLeadId) === String(getLeadId(currentCallLead)) || isCurrentCallActive}
                      onClick={() => setCallTarget(currentCallLead)}
                    >
                      {String(callingLeadId) === String(getLeadId(currentCallLead)) || isCurrentCallActive
                        ? currentCallStatus === "connected" ? `Connected · ${formatDuration(currentCallDuration)}` : "Calling..."
                        : `Call ${getLeadPhone(currentCallLead)}`}
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
                    onClick={() => setFocusedCallLeadId(getLeadId(lead))}
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
                  <select
                    name="leadId"
                    value={siteVisitForm.leadId}
                    onChange={handleSiteVisitChange}
                    required
                  >
                    <option value="">Select lead</option>
                    {panel.leads.map((lead) => (
                      <option key={getLeadId(lead) || getLeadName(lead)} value={getLeadId(lead)}>
                        {getLeadName(lead)} {getLeadPhone(lead) !== "-" ? `- ${getLeadPhone(lead)}` : ""}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <span>Project</span>
                  <select
                    name="project"
                    value={siteVisitForm.project}
                    onChange={handleSiteVisitChange}
                    required
                  >
                    <option value="">
                      {isLoadingProjects ? "Loading projects..." : "Select project"}
                    </option>
                    {siteVisitForm.project && !projectOptions.includes(siteVisitForm.project) && (
                      <option value={siteVisitForm.project}>{siteVisitForm.project}</option>
                    )}
                    {projectOptions.map((project) => (
                      <option key={project} value={project}>
                        {project}
                      </option>
                    ))}
                  </select>
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
                  <div
                    className="sales-executive-dropdown"
                    onBlur={(event) => {
                      if (!event.currentTarget.contains(event.relatedTarget)) {
                        setIsExecutiveDropdownOpen(false);
                      }
                    }}
                  >
                    <button
                      className="sales-executive-trigger"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isExecutiveDropdownOpen}
                      onClick={() => setIsExecutiveDropdownOpen((isOpen) => !isOpen)}
                    >
                      <span>
                        {getExecutiveNameFromId(siteVisitForm.executiveId) ||
                          getSalesExecutiveName(siteVisitForm.executive) ||
                          (isLoadingUsers ? "Loading executives..." : "Select sales executive")}
                      </span>
                      <ChevronDown size={16} />
                    </button>

                    {isExecutiveDropdownOpen && (
                      <div className="sales-executive-menu" role="listbox">
                        {siteVisitForm.executive &&
                          !siteVisitForm.executiveId &&
                          !salesExecutiveOptions.some(
                            (executive) =>
                              executive.name.toLowerCase() === siteVisitForm.executive.toLowerCase()
                          ) && (
                            <button
                              type="button"
                              role="option"
                              aria-selected
                              onClick={() => {
                                setSiteVisitForm((current) => ({
                                  ...current,
                                  executiveId: "",
                                  executive: siteVisitForm.executive,
                                }));
                                setIsExecutiveDropdownOpen(false);
                              }}
                            >
                              <strong>{siteVisitForm.executive}</strong>
                            </button>
                          )}
                        {salesExecutiveOptions.map((executive) => (
                          <button
                            key={executive.id}
                            type="button"
                            role="option"
                            aria-selected={String(siteVisitForm.executiveId) === String(executive.id)}
                            className={String(siteVisitForm.executiveId) === String(executive.id) ? "selected" : ""}
                            onClick={() => {
                              setSiteVisitForm((current) => ({
                                ...current,
                                executiveId: executive.id,
                                executive: executive.name,
                              }));
                              setIsExecutiveDropdownOpen(false);
                            }}
                          >
                            <strong>{executive.name}</strong>
                            {executive.role && <small>{executive.role}</small>}
                          </button>
                        ))}
                        {!isLoadingUsers && salesExecutiveOptions.length === 0 && (
                          <div className="sales-executive-empty">No sales executives found</div>
                        )}
                      </div>
                    )}
                  </div>
                </label>

                <label>
                  <span>Visit Status</span>
                  <select
                    name="status"
                    value={siteVisitForm.status}
                    onChange={handleSiteVisitChange}
                  >
                    {siteVisitStatusOptions.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </select>
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

              {isPaginatedLeadTable && (
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
                <div className="sales-table-head">
                  <span>Lead</span>
                  <span>Requirement</span>
                  <span>Status</span>
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

                  return (
                  <div
                    className="sales-row"
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
                      <strong>{lead.interestedProjects || lead.propertyType || "-"}</strong>
                      <small>{lead.configration || lead.budget || "-"}</small>
                    </span>
                    <span>
                      <mark>{statusLabel[lead.status] || lead.status || "New"}</mark>
                    </span>
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
                <button type="button" onClick={() => openCallPage()}><Phone size={15} /> Call next lead</button>
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
                    <small>{booking.projectDetails || booking.unit || "Unit details pending"}</small>
                  </div>
                ))}
              </div>
            </aside>
          </div>
          )}
        </section>
      </main>

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

      <CallDispositionModal
        lead={dispositionTarget?.lead || null}
        callLog={dispositionTarget?.callLog || null}
        projects={projects}
        initialDisposition={dispositionInitialValue}
        onClose={() => {
          setDispositionTarget(null);
          setDispositionInitialValue("");
        }}
        onSaved={(savedCallLog) => {
          const leadId = String(savedCallLog.leadId);
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
          const nextLead = panel.leads.find((item) => String(getLeadId(item)) !== leadId && !disposedLeadIds.includes(String(getLeadId(item))));
          setFocusedCallLeadId(nextLead ? getLeadId(nextLead) : null);
          setDispositionTarget(null);
          setDispositionInitialValue("");
        }}
      />

      <StartCallModal
        lead={callTarget}
        leadPhone={callTarget ? getActionPhone(callTarget) : ""}
        initialAgentPhone={panel.user?.phone || JSON.parse(localStorage.getItem("authUser") || "null")?.phone || ""}
        onClose={() => setCallTarget(null)}
        onStart={(agentPhone) => startLeadCall(callTarget, agentPhone)}
      />

    </div>
  );
};

export default SalesUserPanel;
