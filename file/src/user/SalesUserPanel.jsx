import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Bell,
  CalendarDays,
  ChevronDown,
  MoreVertical,
  Home,
  LayoutDashboard,
  LogOut,
  Phone,
  Search,
  Users,
} from "lucide-react";
import "./SalesUserPanel.css";

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
  },
  leads: [],
  bookings: [],
};

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
  { key: "nurture", label: "Nurture" },
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

const getPipelineIndex = (lead) => {
  const index = pipelineStages.indexOf(getLeadStage(lead));
  return index >= 0 ? index : 0;
};

const getPercent = (value, total) => {
  if (!total) return "0%";
  return `${Math.round((value / total) * 100)}%`;
};

const SalesUserPanel = () => {
  const navigate = useNavigate();
  const initialScreen =
    window.location.pathname.endsWith("/leads")
      ? "leads"
      : new URLSearchParams(window.location.search).get("screen") || "home";
  const [panel, setPanel] = useState(fallbackPanel);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeScreen, setActiveScreen] = useState(initialScreen);
  const [activeLeadStage, setActiveLeadStage] = useState("all");
  const [selectedLead, setSelectedLead] = useState(null);
  const [openActionLeadId, setOpenActionLeadId] = useState(null);

  useEffect(() => {
    const loadPanel = async () => {
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

        if (!response.ok) {
          throw new Error(result?.message || "Unable to load user panel");
        }

        setPanel(result);
      } catch (err) {
        setPanel((current) => ({ ...current, user: savedUser || current.user }));
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadPanel();
  }, []);

  const userName = getName(panel.user);
  const filteredLeads = useMemo(() => {
    let leads = panel.leads;

    if (activeScreen === "followups") {
      leads = leads.filter((lead) => lead.status === "Fresh_Lead" || lead.status === "Prospect");
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
  }, [activeLeadStage, activeScreen, panel.leads]);

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
    window.sessionStorage.setItem("selectedLeadDetails", JSON.stringify(lead));
    navigate(leadId ? `/details?leadId=${leadId}` : "/details", { state: { lead } });
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

  const navItems = [
    { key: "home", label: "Home", icon: Home },
    { key: "leads", label: "My Leads", icon: Users, count: panel.stats.assignedLeads },
    { key: "followups", label: "Follow-ups", icon: CalendarDays, count: panel.stats.followupsDue },
    { key: "bookings", label: "Bookings", icon: LayoutDashboard, count: panel.stats.bookings },
  ];

  return (
    <div className="sales-panel" style={{ fontSize: "13px" }}>
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
                onClick={() => setActiveScreen(item.key)}
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
          <div className="sales-search">
            <Search size={15} />
            <input placeholder="Search leads, projects, units..." />
          </div>
          <button className="sales-icon-btn" type="button" title="Notifications">
            <Bell size={17} />
          </button>
          <div className="sales-role">
            <div className="sales-avatar">{initials(userName)}</div>
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
          <div className="sales-page-head">
            <div>
              <h1>Good morning, {panel.user?.firstName || userName}</h1>
              <p>{panel.user?.department || "Sales"} dashboard connected with admin access</p>
            </div>
            <div className="sales-actions">
              <button type="button">Today</button>
              <button
                type="button"
                className="primary"
                onClick={() => navigate("/add-lead")}
              >
                Add lead
              </button>
            </div>
          </div>

          {error && <div className="sales-alert">{error}. Showing saved login data.</div>}

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

          <div className="sales-grid">
            <section className="sales-card sales-leads-card">
              <div className="sales-card-head">
                <div>
                  <h2>{activeScreen === "home" ? "My active leads" : navItems.find((item) => item.key === activeScreen)?.label}</h2>
                  <p>{filteredLeads.length} records available</p>
                </div>
              </div>

              <div className="sales-stage-tabs" aria-label="Lead stage filters">
                {leadStageFilters.map((stage) => (
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
                          <button type="button" onClick={() => openLeadPreview(lead)}>
                            Preview
                          </button>
                          <button type="button" onClick={() => openLeadDetails(lead)}>
                            Details
                          </button>
                          <button type="button" onClick={() => openLeadPreview(lead, true)}>
                            Booking
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
                <button type="button"><Phone size={15} /> Call next lead</button>
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
              <a className="primary" href={`tel:${getActionPhone(selectedLead)}`}>Call</a>
              <a
                href={`https://wa.me/${getActionPhone(selectedLead).replace(/^\+/, "")}`}
                target="_blank"
                rel="noreferrer"
              >
                WhatsApp
              </a>
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
