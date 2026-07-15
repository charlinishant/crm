import React, { useEffect, useRef, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, NavLink, useLocation, useNavigate } from "react-router-dom";
import ThemeToggleButton from "../helper/ThemeToggleButton";
import {
  activityNotificationStorageKey,
  dedupeActivityNotifications,
} from "../utils/activityNotifications";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const adminNotificationSoundSrc = "assets/sounds/notification.mp3";

const getActivityNotifications = () => {
  try {
    return dedupeActivityNotifications(JSON.parse(localStorage.getItem(activityNotificationStorageKey) || "[]"));
  } catch {
    return [];
  }
};

const saveActivityNotifications = (notifications) => {
  localStorage.setItem(activityNotificationStorageKey, JSON.stringify(dedupeActivityNotifications(notifications)));
};

const fetchActivityNotifications = async () => {
  const token = localStorage.getItem("authToken");
  if (!token) return getActivityNotifications();

  const response = await fetch(`${API_URL}/lead-activities?limit=100`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!response.ok) throw new Error("Unable to load activity notifications");
  const notifications = await response.json();
  const dedupedNotifications = dedupeActivityNotifications(Array.isArray(notifications) ? notifications : []);
  saveActivityNotifications(dedupedNotifications);
  return dedupedNotifications;
};

const formatNotificationTime = (value) => {
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return "";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
};

const normalizeProfilePhoto = (value) => {
  if (!value) return "/assets/images/user.png";
  if (/^(https?:|data:|blob:)/i.test(value)) return value;
  return value.startsWith("/") ? value : `/${value}`;
};

const MasterLayout = ({ children }) => {
  let [sidebarActive, seSidebarActive] = useState(false);
  let [mobileMenu, setMobileMenu] = useState(false);
  const [navbarSearch, setNavbarSearch] = useState("");
  const [activityNotifications, setActivityNotifications] = useState(getActivityNotifications);
  const [adminNotificationToast, setAdminNotificationToast] = useState(null);
  const notificationLoadRef = useRef({ initialized: false, ids: new Set(getActivityNotifications().map((item) => item.id)) });
  const notificationSoundRef = useRef(null);
  const location = useLocation(); // Hook to get the current route
  const navigate = useNavigate();
  const savedUser = JSON.parse(localStorage.getItem("authUser") || "null");
  const displayName =
    [savedUser?.firstName, savedUser?.lastName].filter(Boolean).join(" ") ||
    savedUser?.username ||
    "User";
  const displayRole = savedUser?.role
    ? savedUser.role.charAt(0).toUpperCase() +
      savedUser.role.slice(1).toLowerCase()
    : "User";
  const profilePhoto = normalizeProfilePhoto(savedUser?.profilePhoto);
  const recentActivityNotifications = activityNotifications.slice(0, 5);

  const handleLogout = async () => {
    const token = localStorage.getItem("authToken");

    if (token) {
      try {
        await fetch(`${process.env.REACT_APP_API_URL || "http://localhost:5000"}/attendance/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (error) {
        console.error("Unable to update attendance logout:", error);
      }
    }

    localStorage.removeItem("authToken");
    localStorage.removeItem("authUser");
    navigate("/sign-in");
  };

  const handleNavbarSearch = (event) => {
    event.preventDefault();

    const query = navbarSearch.trim().toLowerCase();
    if (!query) return;

    const sidebarLinks = Array.from(
      document.querySelectorAll(".sidebar-menu a[href]")
    )
      .map((link) => ({
        href: link.getAttribute("href"),
        text: link.textContent.replace(/\s+/g, " ").trim(),
      }))
      .filter((link) => link.href && link.href !== "#" && link.text);

    const normalize = (value) => value.toLowerCase();
    const matchedLink =
      sidebarLinks.find((link) => normalize(link.text) === query) ||
      sidebarLinks.find((link) => normalize(link.text).startsWith(query)) ||
      sidebarLinks.find((link) => normalize(link.text).includes(query));

    if (!matchedLink) return;

    const targetUrl = new URL(matchedLink.href, window.location.origin);
    navigate(`${targetUrl.pathname}${targetUrl.search}${targetUrl.hash}`);
    setNavbarSearch("");
  };

  useEffect(() => {
    const token = localStorage.getItem("authToken");
    if (!token) return undefined;

    const headers = { Authorization: `Bearer ${token}` };
    const markAvailable = () => {
      fetch(`${API_URL}/attendance/login`, {
        method: "POST",
        headers,
      }).catch((error) => {
        console.error("Unable to update attendance login:", error);
      });
    };
    const markLoggedOut = () => {
      const latestToken = localStorage.getItem("authToken");
      if (!latestToken) return;

      fetch(`${API_URL}/attendance/logout`, {
        method: "POST",
        headers: { Authorization: `Bearer ${latestToken}` },
        keepalive: true,
      }).catch(() => {});
    };

    markAvailable();
    const heartbeatId = window.setInterval(markAvailable, 60000);
    window.addEventListener("pagehide", markLoggedOut);

    return () => {
      window.clearInterval(heartbeatId);
      window.removeEventListener("pagehide", markLoggedOut);
    };
  }, []);

  useEffect(() => {
    const refreshNotifications = () => {
      fetchActivityNotifications()
        .then((notifications) => {
          setActivityNotifications(notifications);

          const currentIds = new Set(notifications.map((item) => item.id));
          const newNotification = notifications.find((item) => !notificationLoadRef.current.ids.has(item.id));
          const isAdmin = String(savedUser?.role || "").toUpperCase() === "ADMIN";
          const isSiteVisitNotification = String(newNotification?.title || "")
            .toLowerCase()
            .includes("site visit");

          if (notificationLoadRef.current.initialized && isAdmin && isSiteVisitNotification) {
            setAdminNotificationToast(newNotification);
            window.setTimeout(() => setAdminNotificationToast(null), 6000);
          }

          notificationLoadRef.current = { initialized: true, ids: currentIds };
        })
        .catch(() => setActivityNotifications(getActivityNotifications()));
    };

    refreshNotifications();
    const refreshId = window.setInterval(refreshNotifications, 15000);
    window.addEventListener("storage", refreshNotifications);
    window.addEventListener("focus", refreshNotifications);
    window.addEventListener("crmActivityNotificationsChanged", refreshNotifications);

    return () => {
      window.clearInterval(refreshId);
      window.removeEventListener("storage", refreshNotifications);
      window.removeEventListener("focus", refreshNotifications);
      window.removeEventListener("crmActivityNotificationsChanged", refreshNotifications);
    };
  }, [savedUser?.role]);

  useEffect(() => {
    if (!adminNotificationToast) return;

    const sound = notificationSoundRef.current || new Audio(adminNotificationSoundSrc);
    notificationSoundRef.current = sound;
    sound.currentTime = 0;
    sound.play().catch((error) => {
      console.warn("Unable to play notification sound:", error);
    });
  }, [adminNotificationToast]);

  useEffect(() => {
    const handleDropdownClick = (event) => {
      event.preventDefault();
      const clickedLink = event.currentTarget;
      const clickedDropdown = clickedLink.closest(".dropdown");

      if (!clickedDropdown) return;

      const isActive = clickedDropdown.classList.contains("open");

      // Close all dropdowns
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
        const submenu = dropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = "0px"; // Collapse submenu
        }
      });

      // Toggle the clicked dropdown
      if (!isActive) {
        clickedDropdown.classList.add("open");
        const submenu = clickedDropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = `${submenu.scrollHeight}px`; // Expand submenu
        }
      }
    };

    // Attach click event listeners to all dropdown triggers
    const dropdownTriggers = document.querySelectorAll(
      ".sidebar-menu .dropdown > a, .sidebar-menu .dropdown > Link"
    );

    dropdownTriggers.forEach((trigger) => {
      trigger.addEventListener("click", handleDropdownClick);
    });

    const openActiveDropdown = () => {
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        const submenuLinks = dropdown.querySelectorAll(".sidebar-submenu li a");
        submenuLinks.forEach((link) => {
          if (
            link.getAttribute("href") === location.pathname ||
            link.getAttribute("to") === location.pathname
          ) {
            dropdown.classList.add("open");
            const submenu = dropdown.querySelector(".sidebar-submenu");
            if (submenu) {
              submenu.style.maxHeight = `${submenu.scrollHeight}px`; // Expand submenu
            }
          }
        });
      });
    };

    // Open the submenu that contains the active route
    openActiveDropdown();

    // Cleanup event listeners on unmount
    return () => {
      dropdownTriggers.forEach((trigger) => {
        trigger.removeEventListener("click", handleDropdownClick);
      });
    };
  }, [location.pathname]);

  let sidebarControl = () => {
    seSidebarActive(!sidebarActive);
  };

  let mobileMenuControl = () => {
    setMobileMenu(!mobileMenu);
  };

  return (
    <section className={mobileMenu ? "overlay active" : "overlay "}>
      {adminNotificationToast && (
        <div className='admin-notification-toast' role='status' aria-live='polite'>
          <span className='admin-notification-toast__icon'>
            <Icon icon='iconoir:bell-notification' />
          </span>
          <div>
            <strong>{adminNotificationToast.title}</strong>
            <p>
              {adminNotificationToast.leadName}: {adminNotificationToast.description}
            </p>
          </div>
          <button type='button' onClick={() => setAdminNotificationToast(null)} aria-label='Dismiss notification'>
            <Icon icon='radix-icons:cross-2' />
          </button>
        </div>
      )}
      {/* sidebar */}
      <aside
        className={
          sidebarActive
            ? "sidebar active "
            : mobileMenu
            ? "sidebar sidebar-open"
            : "sidebar"
        }
      >
        <button
          onClick={mobileMenuControl}
          type='button'
          className='sidebar-close-btn'
        >
          <Icon icon='radix-icons:cross-2' />
        </button>
        <div>
          <Link to='/' className='sidebar-logo'>
            <img
              src='/assets/images/logo.png'
              alt='SWAMI'
              className='light-logo'
            />
            <img
              src='/assets/images/logo.png'
              alt='SWAMI'
              className='dark-logo'
            />
            <img
              src='/assets/images/logo-icon.png'
              alt='SWAMI'
              className='logo-icon'
            />
          </Link>
        </div>
        <div className='sidebar-menu-area'>
          <ul className='sidebar-menu' id='sidebar-menu'>
            <li className='dropdown'>
              <Link to='/dashboard'>
                <Icon
                  icon='solar:home-smile-angle-outline'
                  className='menu-icon'
                />
                <span> Dashboard</span>
              </Link>
              <ul className='sidebar-submenu'>
                {/* <li>
                  <NavLink
                    to='/'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />
                    AIerr
                  </NavLink>
                 </li> */}

                 <li>
                  <NavLink
                    to='/dashboard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Funnel
                  </NavLink>
                </li>


                
                <li>
                  <NavLink
                    to='/svp-dashboard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    SVP Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/reports'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />
                    My Reports
                  </NavLink>
                </li>

                {/* <li>
                  <NavLink
                    to='/index-5'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Conversation Tracker
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/index-6'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-purple w-auto' />{" "}
                    Outbound Tracker
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/index-7'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    VoiceOps Panel
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/index-8'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Medical
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/index-9'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Analytics
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/index-10'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    POS & Inventory
                  </NavLink>
                </li> */}
                
              </ul>
            </li>
{/* 
            <li className='sidebar-menu-group-title'>Application</li>
            <li>
              <NavLink
                to='/email'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='mage:email' className='menu-icon' />
                <span>Email</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/chat-message'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='bi:chat-dots' className='menu-icon' />
                <span>Chat</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/calendar-main'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='solar:calendar-outline' className='menu-icon' />
                <span>Calendar</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/kanban'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon
                  icon='material-symbols:map-outline'
                  className='menu-icon'
                />
                <span>Kanban</span>
              </NavLink>
            </li> */}

            {/* Invoice Dropdown */}
            {/* <li className='dropdown'>
              <Link to='#'>
                <Icon icon='hugeicons:invoice-03' className='menu-icon' />
                <span>Invoice</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/invoice-list'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    List
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/invoice-preview'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />
                    Preview
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/invoice-add'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Add new
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/invoice-edit'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Edit
                  </NavLink>
                </li>
              </ul>
            </li> */}

            {/* Ai Application Dropdown */}
            

            {/* Request */}
            <li className='dropdown'>
              <Link to='#'>
                
                <i class="ri-database-2-line" />
                
                <span>Leads Management</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink 
                    to='/add-lead'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    New Lead
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/leads'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />
                    All Leads
                  </NavLink>
                </li>
                
                <li>
                  <NavLink
                    to='/import-leads'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Smart Import
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/trash'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Trash Lead
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink
                    to='/preview'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Lead Preview
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/marketplace-details'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />
                    Marketplace Details
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/portfolio'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />
                    Portfolios
                  </NavLink>
                </li> */}
              </ul>
            </li>

            {/* <li className='sidebar-menu-group-title'>UI Elements</li> */}

            {/* Impact Panel */}
            <li className='dropdown'>
              <Link to='#'>
                <Icon
                  icon='solar:document-text-outline'
                  className='menu-icon'
                />
                <span>Bookings</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/bookings'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />
                    Bookings
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/brokrage-invoices'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Brokerage Invoices
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink
                    to='/button'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Product Engagement
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/dropdown'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-lilac-600 w-auto' />{" "}
                    Lead Origin Analysis
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/alert'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Marketing Analysis
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/card'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Broker Engagement
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/carousel'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Booking Ratio
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/avatar'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Dialer Summary
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/progress'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    MFA (Missed Future Activity)
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/tabs'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Sales Manager MFA
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/pagination'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />
                    Effort Report
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/badges'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Drop Off Leads
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/tooltip'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-lilac-600 w-auto' />{" "}
                    Lead Origin Drop Off
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/videos'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-cyan w-auto' />{" "}
                    Visit Tracker
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/star-rating'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-indigo w-auto' />{" "}
                    Sales Dashboard Report
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/tags'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-purple w-auto' />{" "}
                    Origin Visit Tracker
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/list'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-red w-auto' />{" "}
                    Sales Manager Report
                  </NavLink>
                </li> */}
                {/* <li>
                  <NavLink
                    to='/calendar'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-yellow w-auto' />{" "}
                    Calendar
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/radio'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-orange w-auto' />{" "}
                    Radio
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/switch'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-pink w-auto' />{" "}
                    Switch
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/image-upload'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    Upload
                  </NavLink>
                </li> */}
              </ul>
            </li>

            {/* Post Sales dropdown */}
            <li className='dropdown'>
              <Link to='#'>
                <Icon
                  icon='solar:card-transfer-outline'
                  className='menu-icon'
                />
                <span>Post Sales</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/post-sales/dashboard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />
                    Dashboard
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/post-sales/booking-list'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />
                    Booking List
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/post-sales/documents'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />
                    Documents
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/post-sales/payment-plans'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />
                    Payment Plans
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/post-sales/demands'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />
                    Demands
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/post-sales/collections'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />
                    Collections
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/post-sales/customer-ledger'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />
                    Customer Ledger
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/post-sales/reports'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />
                    Reports
                  </NavLink>
                </li>
              </ul>
            </li>

            {/* Control Center */}
            <li className='dropdown'>
              <Link to='#'>
                <Icon icon='heroicons:document' className='menu-icon' />
                <span>Conversations</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/admin/call-logs'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    Calls
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/emails'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Emails
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/smsPage'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    SMS
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/SiteVists'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Site visits
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink
                    to='/attendance'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Attendance
                  </NavLink>
                </li> */}
                <li>
                  <NavLink
                    to='/Followups'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Followups
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/WhatApp'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    WhatsApp
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/BlukClickToCalls'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Bulk Click To Calls
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink
                    to='/wizard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Broker Setup
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/wizard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Manage Setup
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/wizard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Sub-Source Setup
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/wizard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Template Manager
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/wizard'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Connection Keys
                  </NavLink>
                </li> */}

              </ul>
            </li>

            {/* Call Integration Dropdown */}
            <li className='dropdown'>
              <Link to='#'>
                <Icon icon='mingcute:storage-line' className='menu-icon' />
                <span>Tasks</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/new-task'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    New Task
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/all-tasks'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    All
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/open-tasks'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Open
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/completed-tasks'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Completed
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/archived-tasks'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Archived
                  </NavLink>
                </li>
              </ul>
            </li>

            {/* Finance Dropdown */}
            <li className='dropdown'>
              <Link to='#'>
                <Icon icon='solar:pie-chart-outline' className='menu-icon' />
                <span>Products & Services</span>
              </Link>
              <ul className='sidebar-submenu'>
                {/* <li>
                  <NavLink
                    to='/line-chart'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Product Management
                  </NavLink>
                </li> */}
                <li>
                  <NavLink
                    to='/projects'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Projects
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/towers'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Project Towers
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/floorplans'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Floor Plans
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/units'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Units
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink
                    to='/towers'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Additional Inventories
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/towers'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Additional Inventory Configurations
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/towers'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Quick add unit

                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/towers'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Approvals for Negotiation and Ad-Hoc costs
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/towers'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-success-main w-auto' />{" "}
                    Price Quotes
                  </NavLink>
                </li> */}


              </ul>
            </li>

            {/* <li>
              <NavLink
                to='/widgets'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='fe:vector' className='menu-icon' />
                <span>Widgets</span>
              </NavLink>
            </li> */}

            {/* Users Dropdown */}
            <li className='dropdown'>
              <Link to='#'>
                <Icon icon='flowbite:users-group-outline'className='menu-icon'/>
                <span>Manage User</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/all-users'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    User Details
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/user-attendance'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    User Attendance
                  </NavLink>
                </li>
                {/* 
                 */}
                <li>
                  <NavLink
                    to='/add-user'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Add User
                  </NavLink>
                </li>
                {/* <li>
                  <NavLink
                    to='/view-profile'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    View Profile
                  </NavLink>
                </li> */}
              </ul>
            </li>

            {/* Role & Access Dropdown */}
            {/* <li className='dropdown'>
              <Link to='#'>
                <i className='ri-user-settings-line' />
                <span>Role &amp; Access</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/role-access'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    Role &amp; Access
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/assign-role'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Assign Role
                  </NavLink>
                </li>
              </ul>
            </li> */}

            {/* <li className='sidebar-menu-group-title'>Application</li> */}

            {/* Authentication Dropdown
            <li className='dropdown'>
              <Link to='#'>
                <Icon icon='simple-line-icons:vector' className='menu-icon' />
                <span>Authentication</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/sign-in'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    Sign In
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/sign-up'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Sign Up
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/forgot-password'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Forgot Password
                  </NavLink>
                </li>
              </ul>
            </li> */}

            {/* gallery */}

            {/* <li className='dropdown'>
              <Link to='#'>
                <Icon
                  icon='flowbite:users-group-outline'
                  className='menu-icon'
                />
                <span>Gallery</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/gallery-grid'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    Gallery Grid
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/gallery'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Gallery Grid Desc
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/gallery-masonry'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Gallery Grid
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/gallery-hover'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Gallery Hover Effect
                  </NavLink>
                </li>
              </ul>
            </li>

            <li>
              <NavLink
                to='/pricing'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon
                  icon='hugeicons:money-send-square'
                  className='menu-icon'
                />
                <span>Pricing</span>
              </NavLink>
            </li> */}

            {/* Blog */}

            {/* <li className='dropdown'>
              <Link to='#'>
                <Icon
                  icon='flowbite:users-group-outline'
                  className='menu-icon'
                />
                <span>Blog</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/blog'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    Blog
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/blog-details'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Blog Details
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/add-blog'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Add Blog
                  </NavLink>
                </li>
              </ul>
            </li>

            <li>
              <NavLink
                to='/testimonials'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon
                  icon='mage:message-question-mark-round'
                  className='menu-icon'
                />
                <span>Testimonials</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/faq'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon
                  icon='mage:message-question-mark-round'
                  className='menu-icon'
                />
                <span>FAQs.</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/error'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='streamline:straight-face' className='menu-icon' />
                <span>404</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/terms-condition'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <Icon icon='octicon:info-24' className='menu-icon' />
                <span>Terms &amp; Conditions</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/coming-soon'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <i className='ri-rocket-line menu-icon'></i>
                <span>Coming Soon</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/access-denied'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <i className='ri-folder-lock-line menu-icon'></i>
                <span>Access Denied</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/maintenance'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <i className='ri-hammer-line menu-icon'></i>
                <span>Maintenance</span>
              </NavLink>
            </li>
            <li>
              <NavLink
                to='/blank-page'
                className={(navData) => (navData.isActive ? "active-page" : "")}
              >
                <i className='ri-checkbox-multiple-blank-line menu-icon'></i>
                <span>Blank Page</span>
              </NavLink>
            </li> */}

            {/* Settings Dropdown */}
            {/* <li className='dropdown'>
              <Link to='#'>
                <Icon
                  icon='icon-park-outline:setting-two'
                  className='menu-icon'
                />
                <span>Settings</span>
              </Link>
              <ul className='sidebar-submenu'>
                <li>
                  <NavLink
                    to='/company'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-primary-600 w-auto' />{" "}
                    Company
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/notification'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-warning-main w-auto' />{" "}
                    Notification
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/notification-alert'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-info-main w-auto' />{" "}
                    Notification Alert
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/theme'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Theme
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/currencies'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Currencies
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/language'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Languages
                  </NavLink>
                </li>
                <li>
                  <NavLink
                    to='/payment-gateway'
                    className={(navData) =>
                      navData.isActive ? "active-page" : ""
                    }
                  >
                    <i className='ri-circle-fill circle-icon text-danger-main w-auto' />{" "}
                    Payment Gateway
                  </NavLink>
                </li>
              </ul>
            </li> */}
          </ul>
        </div>
      </aside>

      <main
        className={sidebarActive ? "dashboard-main active" : "dashboard-main"}
      >
        <div className='navbar-header'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-4'>
                <button
                  type='button'
                  className='sidebar-toggle'
                  onClick={sidebarControl}
                >
                  {sidebarActive ? (
                    <Icon
                      icon='iconoir:arrow-right'
                      className='icon text-2xl non-active'
                    />
                  ) : (
                    <Icon
                      icon='heroicons:bars-3-solid'
                      className='icon text-2xl non-active '
                    />
                  )}
                </button>
                <button
                  onClick={mobileMenuControl}
                  type='button'
                  className='sidebar-mobile-toggle'
                >
                  <Icon icon='heroicons:bars-3-solid' className='icon' />
                </button>
                <form className='navbar-search' onSubmit={handleNavbarSearch}>
                  <input
                    type='text'
                    name='search'
                    placeholder='Search'
                    value={navbarSearch}
                    onChange={(event) => setNavbarSearch(event.target.value)}
                  />
                  <Icon icon='ion:search-outline' className='icon' />
                </form>
              </div>
            </div>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-3'>
                {/* ThemeToggleButton */}
                <ThemeToggleButton />
                {/* <div className='dropdown d-none d-sm-inline-block'>
                  <button
                    className='has-indicator w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center'
                    type='button'
                    data-bs-toggle='dropdown'
                  >
                    <img
                      src='assets/images/lang-flag.png'
                      alt='Wowdash'
                      className='w-24 h-24 object-fit-cover rounded-circle'
                    />
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-sm'>
                    <div className='py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <div>
                        <h6 className='text-lg text-primary-light fw-semibold mb-0'>
                          Choose Your Language
                        </h6>
                      </div>
                    </div>
                    <div className='max-h-400-px overflow-y-auto scroll-sm pe-8'>
                      <div className='form-check style-check d-flex align-items-center justify-content-between mb-16'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='english'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag1.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              English
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='english'
                        />
                      </div>
                      <div className='form-check style-check d-flex align-items-center justify-content-between mb-16'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='japan'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag2.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              Japan
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='japan'
                        />
                      </div>
                      <div className='form-check style-check d-flex align-items-center justify-content-between mb-16'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='france'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag3.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              France
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='france'
                        />
                      </div>
                      <div className='form-check style-check d-flex align-items-center justify-content-between mb-16'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='germany'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag4.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              Germany
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='germany'
                        />
                      </div>
                      <div className='form-check style-check d-flex align-items-center justify-content-between mb-16'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='korea'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag5.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              South Korea
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='korea'
                        />
                      </div>
                      <div className='form-check style-check d-flex align-items-center justify-content-between mb-16'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='bangladesh'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag6.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              Bangladesh
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='bangladesh'
                        />
                      </div>
                      <div className='form-check style-check d-flex align-items-center justify-content-between mb-16'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='india'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag7.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              India
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='india'
                        />
                      </div>
                      <div className='form-check style-check d-flex align-items-center justify-content-between'>
                        <label
                          className='form-check-label line-height-1 fw-medium text-secondary-light'
                          htmlFor='canada'
                        >
                          <span className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                            <img
                              src='assets/images/flags/flag8.png'
                              alt=''
                              className='w-36-px h-36-px bg-success-subtle text-success-main rounded-circle flex-shrink-0'
                            />
                            <span className='text-md fw-semibold mb-0'>
                              Canada
                            </span>
                          </span>
                        </label>
                        <input
                          className='form-check-input'
                          type='radio'
                          name='crypto'
                          id='canada'
                        />
                      </div>
                    </div>
                  </div>
                </div> */}
                {/* Language dropdown end */}
                {/* <div className='dropdown'>
                  <button
                    className='has-indicator w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center'
                    type='button'
                    data-bs-toggle='dropdown'
                  >
                    <Icon
                      icon='mage:email'
                      className='text-primary-light text-xl'
                    />
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-lg p-0'>
                    <div className='m-16 py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <div>
                        <h6 className='text-lg text-primary-light fw-semibold mb-0'>
                          Message
                        </h6>
                      </div>
                      <span className='text-primary-600 fw-semibold text-lg w-40-px h-40-px rounded-circle bg-base d-flex justify-content-center align-items-center'>
                        05
                      </span>
                    </div>
                    <div className='max-h-400-px overflow-y-auto scroll-sm pe-4'>
                      <Link
                        to='#'
                        className='px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between'
                      >
                        <div className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                          <span className='w-40-px h-40-px rounded-circle flex-shrink-0 position-relative'>
                            <img
                              src='assets/images/notification/profile-3.png'
                              alt=''
                            />
                            <span className='w-8-px h-8-px bg-success-main rounded-circle position-absolute end-0 bottom-0' />
                          </span>
                          <div>
                            <h6 className='text-md fw-semibold mb-4'>
                              Kathryn Murphy
                            </h6>
                            <p className='mb-0 text-sm text-secondary-light text-w-100-px'>
                              hey! there i’m...
                            </p>
                          </div>
                        </div>
                        <div className='d-flex flex-column align-items-end'>
                          <span className='text-sm text-secondary-light flex-shrink-0'>
                            12:30 PM
                          </span>
                          <span className='mt-4 text-xs text-base w-16-px h-16-px d-flex justify-content-center align-items-center bg-warning-main rounded-circle'>
                            8
                          </span>
                        </div>
                      </Link>
                      <Link
                        to='#'
                        className='px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between'
                      >
                        <div className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                          <span className='w-40-px h-40-px rounded-circle flex-shrink-0 position-relative'>
                            <img
                              src='assets/images/notification/profile-4.png'
                              alt=''
                            />
                            <span className='w-8-px h-8-px  bg-neutral-300 rounded-circle position-absolute end-0 bottom-0' />
                          </span>
                          <div>
                            <h6 className='text-md fw-semibold mb-4'>
                              Kathryn Murphy
                            </h6>
                            <p className='mb-0 text-sm text-secondary-light text-w-100-px'>
                              hey! there i’m...
                            </p>
                          </div>
                        </div>
                        <div className='d-flex flex-column align-items-end'>
                          <span className='text-sm text-secondary-light flex-shrink-0'>
                            12:30 PM
                          </span>
                          <span className='mt-4 text-xs text-base w-16-px h-16-px d-flex justify-content-center align-items-center bg-warning-main rounded-circle'>
                            2
                          </span>
                        </div>
                      </Link>
                      <Link
                        to='#'
                        className='px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between bg-neutral-50'
                      >
                        <div className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                          <span className='w-40-px h-40-px rounded-circle flex-shrink-0 position-relative'>
                            <img
                              src='assets/images/notification/profile-5.png'
                              alt=''
                            />
                            <span className='w-8-px h-8-px bg-success-main rounded-circle position-absolute end-0 bottom-0' />
                          </span>
                          <div>
                            <h6 className='text-md fw-semibold mb-4'>
                              Kathryn Murphy
                            </h6>
                            <p className='mb-0 text-sm text-secondary-light text-w-100-px'>
                              hey! there i’m...
                            </p>
                          </div>
                        </div>
                        <div className='d-flex flex-column align-items-end'>
                          <span className='text-sm text-secondary-light flex-shrink-0'>
                            12:30 PM
                          </span>
                          <span className='mt-4 text-xs text-base w-16-px h-16-px d-flex justify-content-center align-items-center bg-neutral-400 rounded-circle'>
                            0
                          </span>
                        </div>
                      </Link>
                      <Link
                        to='#'
                        className='px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between bg-neutral-50'
                      >
                        <div className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                          <span className='w-40-px h-40-px rounded-circle flex-shrink-0 position-relative'>
                            <img
                              src='assets/images/notification/profile-6.png'
                              alt=''
                            />
                            <span className='w-8-px h-8-px bg-neutral-300 rounded-circle position-absolute end-0 bottom-0' />
                          </span>
                          <div>
                            <h6 className='text-md fw-semibold mb-4'>
                              Kathryn Murphy
                            </h6>
                            <p className='mb-0 text-sm text-secondary-light text-w-100-px'>
                              hey! there i’m...
                            </p>
                          </div>
                        </div>
                        <div className='d-flex flex-column align-items-end'>
                          <span className='text-sm text-secondary-light flex-shrink-0'>
                            12:30 PM
                          </span>
                          <span className='mt-4 text-xs text-base w-16-px h-16-px d-flex justify-content-center align-items-center bg-neutral-400 rounded-circle'>
                            0
                          </span>
                        </div>
                      </Link>
                      <Link
                        to='#'
                        className='px-24 py-12 d-flex align-items-start gap-3 mb-2 justify-content-between'
                      >
                        <div className='text-black hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'>
                          <span className='w-40-px h-40-px rounded-circle flex-shrink-0 position-relative'>
                            <img
                              src='assets/images/notification/profile-7.png'
                              alt=''
                            />
                            <span className='w-8-px h-8-px bg-success-main rounded-circle position-absolute end-0 bottom-0' />
                          </span>
                          <div>
                            <h6 className='text-md fw-semibold mb-4'>
                              Kathryn Murphy
                            </h6>
                            <p className='mb-0 text-sm text-secondary-light text-w-100-px'>
                              hey! there i’m...
                            </p>
                          </div>
                        </div>
                        <div className='d-flex flex-column align-items-end'>
                          <span className='text-sm text-secondary-light flex-shrink-0'>
                            12:30 PM
                          </span>
                          <span className='mt-4 text-xs text-base w-16-px h-16-px d-flex justify-content-center align-items-center bg-warning-main rounded-circle'>
                            8
                          </span>
                        </div>
                      </Link>
                    </div>
                    <div className='text-center py-12 px-16'>
                      <Link
                        to='#'
                        className='text-primary-600 fw-semibold text-md'
                      >
                        See All Message
                      </Link>
                    </div>
                  </div>
                </div> */}
                {/* Message dropdown end */}
                <div className='dropdown'>
                  <button
                    className='has-indicator w-40-px h-40-px bg-neutral-200 rounded-circle d-flex justify-content-center align-items-center'
                    type='button'
                    data-bs-toggle='dropdown'
                  >
                    <Icon
                      icon='iconoir:bell'
                      className='text-primary-light text-xl'
                    />
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-lg p-0 admin-notifications-menu'>
                    <div className='admin-notifications-head'>
                      <div>
                        <h6 className='text-lg text-primary-light fw-semibold mb-0'>
                          Notifications
                        </h6>
                      </div>
                      <span className='text-primary-600 fw-semibold text-lg w-40-px h-40-px rounded-circle bg-base d-flex justify-content-center align-items-center'>
                        {activityNotifications.length.toString().padStart(2, "0")}
                      </span>
                    </div>
                    <div className='admin-notifications-list scroll-sm'>
                      {recentActivityNotifications.length === 0 ? (
                        <div className='px-24 py-24 text-center text-secondary-light'>
                          No activity notifications
                        </div>
                      ) : (
                        recentActivityNotifications.map((notification, index) => (
                          <Link
                            to='/activity-notifications'
                            className={`admin-notification-item ${
                              index % 2 ? "bg-neutral-50" : ""
                            }`}
                            key={notification.id}
                          >
                            <div className='admin-notification-content text-black hover-bg-transparent hover-text-primary'>
                              <span className='w-44-px h-44-px bg-info-subtle text-info-main rounded-circle d-flex justify-content-center align-items-center flex-shrink-0'>
                                <Icon icon='iconoir:activity' className='icon text-xxl' />
                              </span>
                              <div className='admin-notification-copy'>
                                <h6 className='admin-notification-title'>
                                  {notification.title}
                                </h6>
                                <p className='admin-notification-message'>
                                  {notification.leadName}: {notification.description}
                                </p>
                                <p className='admin-notification-meta'>
                                  {notification.meta || `Done by ${notification.actorName || "Sales User"}`}
                                </p>
                              </div>
                            </div>
                            <span className='admin-notification-time'>
                              {formatNotificationTime(notification.createdAt)}
                            </span>
                          </Link>
                        ))
                      )}
                    </div>
                    <div className='text-center py-12 px-16'>
                      <Link
                        to='/activity-notifications'
                        className='text-primary-600 fw-semibold text-md'
                      >
                        See All Notification
                      </Link>
                    </div>
                  </div>
                </div>
                {/* Notification dropdown end */}
                <div className='dropdown'>
                  <button
                    className='d-flex justify-content-center align-items-center rounded-circle'
                    type='button'
                    data-bs-toggle='dropdown'
                  >
                    <img
                      src={profilePhoto}
                      alt='image_user'
                      className='w-40-px h-40-px object-fit-cover rounded-circle'
                    />
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-sm'>
                    <div className='py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <div>
                        <h6 className='text-lg text-primary-light fw-semibold mb-2'>
                          {displayName}
                        </h6>
                        <span className='text-secondary-light fw-medium text-sm'>
                          {displayRole}
                        </span>
                      </div>
                      <button type='button' className='hover-text-danger'>
                        <Icon
                          icon='radix-icons:cross-1'
                          className='icon text-xl'
                        />
                      </button>
                    </div>
                    <ul className='to-top-list'>
                      <li>
                        <Link
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'
                          to='/view-profile'
                        >
                          <Icon
                            icon='solar:user-linear'
                            className='icon text-xl'
                          />{" "}
                          My Profile
                        </Link>
                      </li>
                      <li>
                        <Link
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'
                          to='/email'
                        >
                          <Icon
                            icon='tabler:message-check'
                            className='icon text-xl'
                          />{" "}
                          Inbox
                        </Link>
                      </li>
                      <li>
                        <Link
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3'
                          to='/company'
                        >
                          <Icon
                            icon='icon-park-outline:setting-two'
                            className='icon text-xl'
                          />
                          Setting
                        </Link>
                      </li>
                      <li>
                        <button
                          type='button'
                          className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-danger d-flex align-items-center gap-3'
                          onClick={handleLogout}
                        >
                          <Icon icon='lucide:power' className='icon text-xl' />{" "}
                          Log Out
                        </button>
                      </li>
                    </ul>
                  </div>
                </div>
                {/* Profile dropdown end */}
              </div>
            </div>
          </div>
        </div>

        {/* dashboard-main-body */}
        <div className='dashboard-main-body'>{children}</div>

        {/* Footer section */}
        <footer className='d-footer'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <p className='mb-0'></p>
            </div>
            <div className='col-auto'>
              <p className='mb-0'>
              <span className='text-primary-600'></span>
              </p>
            </div>
          </div>
        </footer>
      </main>
    </section>
  );
};

export default MasterLayout;
