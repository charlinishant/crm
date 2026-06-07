import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  Menu,
  MoreVertical,
  Home,
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
    followupsDue: 0,
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
  pathname.endsWith("/leads")
    ? "leads"
    : pathname.endsWith("/details")
      ? "details"
      : pathname.endsWith("/whatsapp")
        ? "whatsapp"
        : pathname.endsWith("/calls")
          ? "calls"
          : pathname.endsWith("/conversation")
            ? "conversation"
            : pathname.endsWith("/add-lead")
              ? "addLead"
              : "";

const statusLabel = {
  Fresh_Lead: "Fresh Lead",
  Prospect: "Prospect",
  Registered: "Registered",
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

const pipelineStages = ["new", "qualified", "sourcing", "closing", "booked"];

const pipelineStageLabels = {
  new: "New",
  qualified: "Qualified",
  sourcing: "Sourcing",
  closing: "Closing",
  booked: "Booked",
};

const taskStatusOptions = ["Open", "Completed", "Archived"];

const getPipelineIndex = (lead) => {
  const index = pipelineStages.indexOf(getLeadStage(lead));
  return index >= 0 ? index : 0;
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
    getScreenFromPath(window.location.pathname) ||
    new URLSearchParams(window.location.search).get("screen") ||
    "home";
  const [panel, setPanel] = useState(fallbackPanel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeScreen, setActiveScreen] = useState(initialScreen);
  const [activeLeadStage, setActiveLeadStage] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [openActionLeadId, setOpenActionLeadId] = useState(null);
  const [focusedCallLeadId, setFocusedCallLeadId] = useState(
    new URLSearchParams(window.location.search).get("leadId") || null
  );
  const [callDispositions, setCallDispositions] = useState({});
  const [callLogsByLead, setCallLogsByLead] = useState({});
  const [callingLeadId, setCallingLeadId] = useState(null);
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
    const intervalId = window.setInterval(() => {
      setTimeGreeting(getTimeGreeting());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  // WhatsApp UI change: browser back/forward also restores the matching sidebar state.
  useEffect(() => {
    const screenFromPath = getScreenFromPath(location.pathname);
    if (!screenFromPath) return;

    setActiveScreen((current) => (current === screenFromPath ? current : screenFromPath));
  }, [location.pathname]);

  // Dashboard detail pages auto-collapse the existing sidebar; other routes restore normal behavior.
  useEffect(() => {
    setIsSidebarCollapsed(activeScreen === "whatsapp" || activeScreen === "details");
  }, [activeScreen]);

  const userName = getName(panel.user);
  const userProfilePhoto = getProfilePhoto(panel.user);
  const callQueue = useMemo(() => {
    return panel.leads.filter((lead) => {
      const leadId = getLeadId(lead);
      const disposition = callDispositions[leadId]?.type;
      return disposition !== "connected" && disposition !== "qualified" && disposition !== "junk";
    });
  }, [callDispositions, panel.leads]);

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

  const filteredLeads = useMemo(() => {
    let leads = panel.leads;

    if (activeScreen === "followups") {
      leads = leads.filter((lead) => {
        const status = normalizeStageText(lead.status);
        return status === "fresh lead" || status === "prospect" || status === "new" || callbackLeadIds.has(String(getLeadId(lead)));
      });
    }

    if (activeScreen === "bookings") {
      leads = leads.filter((lead) => lead.status === "Booked" || lead.bookings?.length);
    }

    if (activeLeadStage === "visited") {
      leads = leads.filter((lead) => lead.conductSiteVisit || lead.conductSiteDate);
    } else if (activeLeadStage !== "all") {
      leads = leads.filter((lead) => getLeadStage(lead) === activeLeadStage);
    }

    return leads;
  }, [activeLeadStage, activeScreen, callbackLeadIds, panel.leads]);

  const funnelData = useMemo(() => {
    const leads = panel.leads;
    const totalLeads = leads.length;
    const qualified = leads.filter((lead) => getLeadStage(lead) === "qualified").length;
    const sourced = leads.filter((lead) => getLeadStage(lead) === "sourcing").length;
    const visited = leads.filter((lead) => lead.conductSiteVisit || lead.conductSiteDate).length;
    const booked = leads.filter((lead) => getLeadStage(lead) === "booked" || lead.bookings?.length).length;

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
        label: `Qualified · ${getPercent(qualified, totalLeads)}`,
        value: qualified,
        detail: "Qualified",
        color: "#b5d4f4",
        textColor: "#0c447c",
        height: 74,
      },
      {
        key: "sourcing",
        label: `Sourced · ${getPercent(sourced, qualified || totalLeads)}`,
        value: sourced,
        detail: "Sourced",
        color: "#85b7eb",
        textColor: "#042c53",
        height: 54,
      },
      {
        key: "visited",
        label: `Visited · ${getPercent(visited, sourced || qualified || totalLeads)}`,
        value: visited,
        detail: "Visited",
        color: "#378add",
        textColor: "#ffffff",
        height: 36,
      },
      {
        key: "booked",
        label: `Booked · ${getPercent(booked, visited || sourced || qualified || totalLeads)}`,
        value: booked,
        detail: "Booked",
        color: "#185fa5",
        textColor: "#ffffff",
        height: 24,
      },
    ];
  }, [panel.leads]);

  const handleFunnelClick = (key) => {
    setActiveScreen("leads");
    setActiveLeadStage(key);
  };

  const patchSelectedLead = async (updates) => {
    if (!selectedLead?.id) return;

    try {
      const response = await fetch(`${API_URL}/leads/${selectedLead.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updates),
      });

      if (!response.ok) {
        throw new Error("Unable to update lead");
      }

      const updatedLead = await response.json();
      setSelectedLead((current) => ({ ...current, ...updatedLead }));
      setPanel((current) => ({
        ...current,
        leads: current.leads.map((lead) =>
          lead.id === selectedLead.id ? { ...lead, ...updatedLead } : lead
        ),
      }));
    } catch (err) {
      alert(err.message || "Unable to update lead");
    }
  };

  const scheduleVisit = () => {
    const dateValue = window.prompt("Enter site visit date (YYYY-MM-DD)", new Date().toISOString().slice(0, 10));
    if (!dateValue) return;

    patchSelectedLead({
      conductSiteVisit: selectedLead.interestedProjects || selectedLead.propertyType || "Scheduled",
      conductSiteDate: new Date(dateValue).toISOString(),
    });
  };

  const reassignLead = () => {
    const teamValue = window.prompt("Assign to team/user", selectedLead.team || "");
    if (!teamValue) return;

    patchSelectedLead({ team: teamValue });
  };

  const openCallPage = (lead = null) => {
    if (lead) {
      setFocusedCallLeadId(getLeadId(lead));
    }
    setOpenActionLeadId(null);
    setSelectedLead(null);
    setActiveScreen("calls");
    const leadId = lead ? getLeadId(lead) : "";
    navigate(`/user/sales/calls${leadId ? `?leadId=${leadId}` : ""}`);
  };

  const openWhatsAppPage = (lead = null) => {
    const leadId = lead ? getLeadId(lead) : "";
    setOpenActionLeadId(null);
    setSelectedLead(null);
    setActiveScreen("whatsapp");
    navigate(`/user/sales/whatsapp${leadId ? `?leadId=${leadId}` : ""}`, {
      state: lead ? { lead } : undefined,
    });
  };

  const startLeadCall = async (lead) => {
    const leadId = getLeadId(lead);
    const leadPhone = getActionPhone(lead);
    const savedUser = JSON.parse(localStorage.getItem("authUser") || "null");
    let agentPhone = String(panel.user?.phone || savedUser?.phone || "").replace(/\D/g, "");

    if (!leadId || !leadPhone) {
      alert("Lead phone number is missing.");
      return null;
    }

    if (!agentPhone) {
      agentPhone = window.prompt("Enter your agent phone number for IVR bridge call", "")?.replace(/\D/g, "") || "";
    }

    if (!agentPhone) {
      alert("Agent phone number is required to start a cloud call.");
      return null;
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
          phone: leadPhone,
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
      setCallDispositions((current) => ({
        ...current,
        [leadId]: {
          type: "connected",
          label: "Connected",
          time: new Date().toISOString(),
        },
      }));
      return result.callLog;
    } catch (error) {
      alert(error.message || "Unable to start call");
      return null;
    } finally {
      setCallingLeadId(null);
    }
  };

  const markCallDisposition = async (lead, type, activeCallLog = null) => {
    const leadId = getLeadId(lead);
    if (!leadId) return;

    const dispositionLabels = {
      connected: "Connected",
      qualified: "Qualified",
      callback: "Callback later",
      notInterested: "Not interested",
      wrongNumber: "Wrong number",
      junk: "Junk",
    };

    setCallDispositions((current) => ({
      ...current,
      [leadId]: {
        type,
        label: dispositionLabels[type] || type,
        time: new Date().toISOString(),
      },
    }));

    const callLog = activeCallLog || callLogsByLead[leadId];
    if (callLog?.id) {
      try {
        const token = localStorage.getItem("authToken");
        await fetch(`${API_URL}/api/calls/disposition/${callLog.id}`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({ disposition: dispositionLabels[type] || type }),
        });
      } catch (error) {
        console.error("Unable to save call disposition:", error);
      }
    }

    if (type === "qualified") {
      try {
        const response = await fetch(`${API_URL}/leads/${leadId}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ status: "Qualified" }),
        });
        const updatedLead = await response.json().catch(() => ({}));
        if (response.ok) {
          setPanel((current) => ({
            ...current,
            leads: current.leads.map((item) =>
              String(getLeadId(item)) === String(leadId) ? { ...item, ...updatedLead } : item
            ),
          }));
        }
      } catch (error) {
        console.error("Unable to update qualified lead:", error);
      }
    }

    const nextLead = callQueue.find((item) => getLeadId(item) !== leadId);
    setFocusedCallLeadId(nextLead ? getLeadId(nextLead) : null);
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

  const openLeadPreview = (lead, openBooking = false) => {
    const leadId = getLeadId(lead);
    setOpenActionLeadId(null);
    window.sessionStorage.setItem("selectedLeadPreview", JSON.stringify(lead));
    navigate(
      leadId
        ? `/user-preview?leadId=${leadId}${openBooking ? "&openBooking=1" : ""}`
        : `/user-preview${openBooking ? "?openBooking=1" : ""}`,
      { state: { lead, openBooking } }
    );
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

  const logout = () => {
    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    window.location.href = "/sign-in";
  };

  const assignedTasks = panel.tasks || [];
  const currentCallLead = useMemo(() => {
    return panel.leads.find((lead) => String(getLeadId(lead)) === String(focusedCallLeadId)) || callQueue[0] || null;
  }, [callQueue, focusedCallLeadId, panel.leads]);
  const upNextLeads = callQueue.filter((lead) => getLeadId(lead) !== getLeadId(currentCallLead)).slice(0, 3);
  const todayDialCount = Object.keys(callDispositions).length;
  const qualifiedCount = Object.values(callDispositions).filter((item) => item?.type === "qualified").length;

  const navItems = [
    { key: "home", label: "Home", icon: Home },
    { key: "leads", label: "My Leads", icon: Users, count: panel.stats.assignedLeads },
    // { key: "calls", label: "Calls", icon: Phone, count: callQueue.length },
    { key: "followups", label: "Follow-ups", icon: CalendarDays, count: panel.stats.followupsDue },
    { key: "bookings", label: "Bookings", icon: LayoutDashboard, count: panel.stats.bookings },
    { key: "conversation", label: "Conversation", icon: MessageSquare, count: panel.leads.length },
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
          <img className="sales-logo" src="/assets/images/logo.png" alt="Ajwani CRM" />
          
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
                  if (item.key === "conversation") navigate("/user/sales/conversation");
                  if (item.key === "whatsapp") navigate("/user/sales/whatsapp");
                  if (item.key === "leads") navigate("/user/sales/leads");
                  if (item.key === "addLead") navigate("/user/sales/add-lead");
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
          <div className="sales-search">
            <Search size={15} />
            <input placeholder="Search leads, projects, units..." />
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
                <p>{panel.user?.department || "Sales"} dashboard connected with admin access</p>
              </div>
              <div className="sales-actions">
                {/* <button type="button">Today</button> */}
                <button
                  type="button"
                  className="primary"
                  onClick={() => {
                    setActiveScreen("addLead");
                    navigate("/user/sales/add-lead");
                  }}
                >
                  Add lead
                </button>
              </div>
            </div>
          )}

          {error && <div className="sales-alert">{error}. Showing saved login data.</div>}

          {activeScreen !== "whatsapp" && activeScreen !== "details" && activeScreen !== "conversation" && activeScreen !== "calls" && (
            <div className="sales-stat-grid">
              <div className="sales-stat">
                <span>Assigned leads</span>
                <strong>{loading ? "..." : panel.stats.assignedLeads}</strong>
                <small>From admin CRM</small>
              </div>
              <div className="sales-stat">
                <span>Follow-ups due</span>
                <strong>{loading ? "..." : panel.stats.followupsDue}</strong>
                <small>Fresh and prospect leads</small>
              </div>
              <div className="sales-stat">
                <span>Site visits</span>
                <strong>{loading ? "..." : panel.stats.siteVisits}</strong>
                <small>Scheduled visits</small>
              </div>
              <div className="sales-stat">
                <span>Bookings</span>
                <strong>{loading ? "..." : panel.stats.bookings}</strong>
                <small>Latest booked units</small>
              </div>
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
          ) : activeScreen === "calls" ? (
            <section className="sales-call-workspace">
              <div className="sales-call-head">
                <div>
                  <h2>Your queue</h2>
                  <p>{callQueue.length} leads · next SLA breach in 3 min</p>
                </div>
                <div className="sales-call-presence">
                  <span>Available</span>
                  <button type="button">Take break</button>
                </div>
              </div>

              <div className="sales-call-note">
                <Users size={16} />
                <span>Telecaller mode · You see only leads assigned to you. Dispose each one before moving to the next.</span>
              </div>

              {currentCallLead ? (
                <div className="sales-call-card">
                  <div className="sales-call-card-head">
                    <div className="sales-lead-name">
                      <span className="sales-avatar call-avatar">{initials(getLeadName(currentCallLead))}</span>
                      <span>
                        <strong>{getLeadName(currentCallLead)}</strong>
                        <small>{getLeadPhone(currentCallLead)} · English, Hindi</small>
                      </span>
                    </div>
                    <div className="sales-call-badges">
                      <span>Score {currentCallLead.score || 78}</span>
                      <strong>Hot · 9 min left</strong>
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

                  <div className="sales-call-actions">
                    <button
                      className="primary"
                      type="button"
                      disabled={String(callingLeadId) === String(getLeadId(currentCallLead))}
                      onClick={async () => {
                        const callLog = await startLeadCall(currentCallLead);
                        if (callLog) markCallDisposition(currentCallLead, "connected", callLog);
                      }}
                    >
                      {String(callingLeadId) === String(getLeadId(currentCallLead)) ? "Connecting..." : `Call ${getLeadPhone(currentCallLead)}`}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        markCallDisposition(currentCallLead, "connected");
                        openWhatsAppPage(currentCallLead);
                      }}
                    >
                      WhatsApp
                    </button>
                    <button type="button" onClick={() => markCallDisposition(currentCallLead, "callback")}>
                      Skip
                    </button>
                  </div>

                  <div className="sales-call-dispositions">
                    <button type="button" className="qualified" onClick={() => markCallDisposition(currentCallLead, "qualified")}>Qualified -></button>
                    <button type="button" onClick={() => markCallDisposition(currentCallLead, "callback")}>Callback later</button>
                    <button type="button" onClick={() => markCallDisposition(currentCallLead, "notInterested")}>Not interested</button>
                    <button type="button" onClick={() => markCallDisposition(currentCallLead, "wrongNumber")}>Wrong number</button>
                    <button type="button" className="danger" onClick={() => markCallDisposition(currentCallLead, "junk")}>Junk</button>
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
                      <strong>{getLeadName(lead)} · Score {lead.score || 65}</strong>
                      <small>{lead.channelPartner || lead.tags || "Lead"} · {callDispositions[getLeadId(lead)]?.label || "new"}</small>
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
                        <small>{callDispositions[getLeadId(lead)]?.label || "Connected"} · {getLeadPhone(lead)}</small>
                      </span>
                      <time>{getCreatedLabel(lead)}</time>
                    </div>
                  ))}
                </div>
              )}
            </section>
          ) : activeScreen === "conversation" ? (
            <UserConversationPanel
              leads={panel.leads}
              user={panel.user}
              loading={loading}
              onOpenCallLead={openCallPage}
              onOpenWhatsAppLead={openWhatsAppPage}
            />
          ) : activeScreen === "whatsapp" ? (
            <UserWhatsAppPage
              leads={panel.leads}
              user={panel.user}
              loading={loading}
              embedded
            />
          ) : activeScreen === "details" ? (
            <UserDetails />
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
                  <p>{filteredLeads.length} records available</p>
                </div>
              </div>

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
                {filteredLeads.length === 0 && (
                  <div className="sales-empty">No leads available for this sales user yet.</div>
                )}
                {filteredLeads.map((lead) => {
                  const leadId = getLeadId(lead);

                  return (
                  <div className="sales-row" key={leadId || lead.email} onClick={() => setSelectedLead(lead)}>
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
                            Booked Lead
                          </button>
                        </div>
                      )}
                    </span>
                  </div>
                  );
                })}
              </div>
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
                <button type="button"><CalendarDays size={15} /> Schedule visit</button>
                <button type="button"><Users size={15} /> Request reassignment</button>
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

      {selectedLead && (
        <div className="sales-drawer-wrap" onClick={() => setSelectedLead(null)}>
          <aside className="sales-drawer" onClick={(event) => event.stopPropagation()}>
            <div className="sales-drawer-head">
              <div className="sales-avatar large">{initials(getLeadName(selectedLead))}</div>
              <div className="sales-drawer-title">
                <h2>{getLeadName(selectedLead)}</h2>
                <p>#{selectedLead.id} · {getLeadPhone(selectedLead)} · {getLeadEmail(selectedLead)}</p>
              </div>
              <span className="sales-score">Score {selectedLead.score || 65}</span>
              <button className="sales-drawer-close" type="button" onClick={() => setSelectedLead(null)}>×</button>
            </div>
            <div className="sales-drawer-actions">
              <button className="primary" type="button" onClick={() => openCallPage(selectedLead)}>Call</button>
              <button type="button" onClick={() => openWhatsAppPage(selectedLead)}>
                WhatsApp
              </button>
              <a href={`mailto:${getLeadEmail(selectedLead)}`}>Email</a>
              <button type="button" onClick={scheduleVisit}>Schedule visit</button>
              <a
                href={`mailto:${getLeadEmail(selectedLead)}?subject=${encodeURIComponent(`Quote for ${selectedLead.interestedProjects || "your requirement"}`)}`}
              >
                Send quote
              </a>
              <button type="button" onClick={reassignLead}>Reassign</button>
            </div>
            <section className="sales-pipeline">
              <p>Pipeline stage</p>
              <div className="sales-stage-bar">
                {pipelineStages.map((stage, index) => (
                  <span
                    key={stage}
                    className={index <= getPipelineIndex(selectedLead) ? "done" : ""}
                  />
                ))}
              </div>
              <div className="sales-stage-labels">
                {pipelineStages.map((stage, index) => (
                  <span
                    key={stage}
                    className={index <= getPipelineIndex(selectedLead) ? "done" : ""}
                  >
                    {pipelineStageLabels[stage]}
                  </span>
                ))}
              </div>
            </section>
            <div className="sales-meta-grid">
              <div><span>Source</span><strong>{selectedLead.channelPartner || selectedLead.tags || "Website"}</strong></div>
              <div><span>Project</span><strong>{selectedLead.interestedProjects || selectedLead.propertyType || "-"}</strong></div>
              <div><span>Config</span><strong>{selectedLead.configration || selectedLead.configuration || "-"}</strong></div>
              <div><span>Budget</span><strong>{selectedLead.budget || "-"}</strong></div>
              <div><span>Assigned to</span><strong>{selectedLead.team || panel.user?.firstName || "-"}</strong></div>
              <div><span>Created</span><strong>{getCreatedLabel(selectedLead)}</strong></div>
            </div>
            <section className="sales-activity">
              <h3>Activity</h3>
              <div className="sales-timeline">
                <button type="button" onClick={() => { window.location.href = `tel:${getActionPhone(selectedLead)}`; }}>
                  <span />
                  <strong>Call attempted · no answer</strong>
                  <small>Today · 8:00 AM</small>
                </button>
                <button type="button" onClick={() => { window.location.href = `mailto:${getLeadEmail(selectedLead)}`; }}>
                  <span />
                  <strong>Email follow-up ready</strong>
                  <small>{getCreatedLabel(selectedLead)}</small>
                </button>
              </div>
            </section>
          </aside>
        </div>
      )}
    </div>
  );
};

export default SalesUserPanel;
