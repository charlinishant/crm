import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  FaBuilding,
  FaArrowLeft,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaDoorOpen,
  FaCheckCircle,
  FaUser,
  FaExternalLinkAlt,
  FaSearch,
  FaFileAlt,
  FaMoneyBillWave,
  FaReceipt,
  FaBook,
  FaChartBar,
  FaCalendarAlt,
  FaFileInvoiceDollar,
  FaHome,
  FaExchangeAlt,
} from "react-icons/fa";
import MasterLayout from "../../masterLayout/MasterLayout";
import "../../styles/inventory-drilldown.css";

const API_URL =
  process.env.REACT_APP_API_URL ||
  (typeof window !== "undefined" && !["localhost", "127.0.0.1"].includes(window.location.hostname)
    ? window.location.origin
    : "http://localhost:5002");

const authHeaders = () => {
  const token = localStorage.getItem("token") || localStorage.getItem("authToken") || sessionStorage.getItem("token");
  return {
    Authorization: token ? `Bearer ${token}` : "",
    "Content-Type": "application/json",
  };
};

const normalizeList = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.items)
    ? data.items
    : [];

const resolveMediaUrl = (source) => {
  if (!source) return "";
  if (typeof source === "object") {
    source = source.url || source.src || source.dataUrl || source.path || "";
  }
  if (!source || typeof source !== "string") return "";
  const trimmed = source.trim();
  if (!trimmed) return "";
  if (/^(https?:|data:|blob:)/i.test(trimmed)) return trimmed;
  if (trimmed.startsWith("/uploads/")) return `${API_URL}${trimmed}`;
  if (trimmed.startsWith("uploads/")) return `${API_URL}/${trimmed}`;
  if (trimmed.startsWith("/")) return `${API_URL}${trimmed}`;
  return `${API_URL}/${trimmed}`;
};

// Fallback real architectural elevation photos for projects when not uploaded yet
const DEFAULT_PROJECT_ELEVATIONS = {
  rajgruha: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
  shree_ganesh: "https://images.unsplash.com/photo-1486406146926-c627a92ad1ab?auto=format&fit=crop&w=1200&q=80",
  amrapali: "https://images.unsplash.com/photo-1577495508048-b635879837f1?auto=format&fit=crop&w=1200&q=80",
  triratna: "https://images.unsplash.com/photo-1512917774080-9991f1c4c750?auto=format&fit=crop&w=1200&q=80",
  default: "https://images.unsplash.com/photo-1545324418-cc1a3fa10c00?auto=format&fit=crop&w=1200&q=80",
};

const getProjectElevationPhoto = (project) => {
  const uploaded = resolveMediaUrl(project?.elevationPhoto || project?.image || project?.projectImage);
  if (uploaded) return uploaded;

  const name = String(project?.name || "").toLowerCase().trim();
  if (name.includes("rajgruha")) return DEFAULT_PROJECT_ELEVATIONS.rajgruha;
  if (name.includes("ganesh")) return DEFAULT_PROJECT_ELEVATIONS.shree_ganesh;
  if (name.includes("amrapali")) return DEFAULT_PROJECT_ELEVATIONS.amrapali;
  if (name.includes("triratna")) return DEFAULT_PROJECT_ELEVATIONS.triratna;
  return DEFAULT_PROJECT_ELEVATIONS.default;
};

const formatMoney = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "—";
  if (amount >= 10000000) {
    return `₹ ${(amount / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (amount >= 100000) {
    return `₹ ${(amount / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  }
  return `₹ ${amount.toLocaleString("en-IN")}`;
};

const getTowerDisplayName = (tower, project) => {
  if (!tower) return "";
  const tName = String(tower.name || "").trim();
  const pName = String(project?.name || "").trim();
  if (tower.wingCode && String(tower.wingCode).trim()) {
    return `Wing ${String(tower.wingCode).trim()}`;
  }
  if (tName && pName && tName.toLowerCase() === pName.toLowerCase()) {
    return "Tower A";
  }
  if (/^[A-Z0-9]$/i.test(tName)) {
    return `Tower ${tName}`;
  }
  return tName || `Tower #${tower.id}`;
};

const getUnitPositionSortValue = (unit) => {
  if (!unit) return 0;
  const explicitIndex = Number(unit.unitIndex ?? unit.position);
  if (Number.isFinite(explicitIndex) && explicitIndex > 0) return explicitIndex;
  const rawName = String(unit.name || unit.unitNo || "").trim();
  const match = rawName.match(/(\d+)$/);
  if (match) {
    const digitsStr = match[1];
    if (digitsStr.length >= 2) {
      const lastTwo = parseInt(digitsStr.slice(-2), 10);
      if (!Number.isNaN(lastTwo)) return lastTwo;
    }
    const val = parseInt(digitsStr, 10);
    if (!Number.isNaN(val)) return val;
  }
  return 0;
};

const sortUnitsAscending = (unitsList = []) => {
  return [...unitsList].sort((a, b) => {
    const posA = getUnitPositionSortValue(a);
    const posB = getUnitPositionSortValue(b);
    if (posA !== posB) return posA - posB;
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true });
  });
};

const flattenUnits = (unitGroups = []) =>
  unitGroups.flatMap((group) => {
    const directUnit = group?.unit || {};
    const floorPlan = group?.floor || directUnit?.floor || group?.floorPlan || {};
    const models = Array.isArray(group?.unitList) && group.unitList.length ? group.unitList : [group];

    return models.map((unit, index) => {
      const carpetVal =
        unit?.carpet ??
        unit?.carpetArea ??
        floorPlan?.carpet ??
        floorPlan?.carpetArea ??
        group?.carpet ??
        group?.carpetArea ??
        directUnit?.carpet ??
        "";

      const saleableVal =
        unit?.saleable ??
        unit?.saleableArea ??
        floorPlan?.saleable ??
        floorPlan?.saleableArea ??
        group?.saleable ??
        group?.saleableArea ??
        directUnit?.saleable ??
        "";

      const areaDisplay = carpetVal || saleableVal || "";

      const rawBedrooms =
        unit?.bedrooms ??
        unit?.bhk ??
        floorPlan?.bedrooms ??
        group?.bedrooms ??
        directUnit?.bedrooms ??
        "";

      const configLabel =
        unit?.configurationLabel ||
        floorPlan?.configurationLabel ||
        group?.configurationLabel ||
        floorPlan?.planName ||
        floorPlan?.name ||
        (rawBedrooms ? `${rawBedrooms} BHK` : "Standard Unit");

      const rawFloor =
        unit?.floor !== null && unit?.floor !== undefined
          ? unit.floor
          : group?.floor !== null && group?.floor !== undefined
          ? group.floor
          : (floorPlan?.name ?? 1);

      const floorDigits = String(rawFloor).replace(/[^\d-]/g, "");
      const parsedFloor = Number(floorDigits);
      const floorNumber = Number.isFinite(parsedFloor) ? parsedFloor : 0;

      const firstBooking =
        Array.isArray(unit?.bookings) && unit.bookings.length > 0
          ? unit.bookings[0]
          : Array.isArray(group?.bookings) && group.bookings.length > 0
          ? group.bookings[0]
          : null;

      const leadObj = firstBooking?.lead || unit?.lead || group?.lead || null;

      const rawCustomerName =
        unit?.leadName ||
        (leadObj
          ? `${leadObj.firstName || ""} ${leadObj.lastName || ""}`.trim() || leadObj.name || leadObj.companyName
          : null) ||
        firstBooking?.customerName ||
        firstBooking?.leadName ||
        "";

      const bookingId = unit?.bookingId || firstBooking?.id || group?.bookingId || null;
      const stage = firstBooking?.stage || unit?.stage || unit?.status || "Booked";

      return {
        id: unit?.id || group?.id || `${rawFloor}-${index}`,
        unitId: group?.id || directUnit?.id || null,
        name: String(unit?.name || unit?.unitNo || group?.name || `Unit ${index + 1}`),
        floor: rawFloor,
        floorNumber,
        carpet: carpetVal,
        saleable: saleableVal,
        areaDisplay,
        bedrooms: rawBedrooms,
        configurationLabel: configLabel,
        customerName: rawCustomerName,
        bookingId,
        stage,
        bookings: unit?.bookings || group?.bookings || (firstBooking ? [firstBooking] : []),
        basePrice: unit?.basePrice || group?.basePrice || floorPlan?.basePrice || 0,
        projectId: group?.project?.id || directUnit?.project?.id || group?.projectId || "",
        towerId: group?.tower?.id || directUnit?.tower?.id || group?.towerId || "",
        status: String(unit?.status || group?.status || "").toLowerCase(),
      };
    });
  });

const quickNavLinks = [
  { to: "/post-sales/booking-list", label: "Booking List", icon: <FaFileAlt /> },
  { to: "/post-sales/documents", label: "Documents", icon: <FaBook /> },
  { to: "/post-sales/payment-plans", label: "Payment Plans", icon: <FaCalendarAlt /> },
  { to: "/post-sales/demands", label: "Demands", icon: <FaFileInvoiceDollar /> },
  { to: "/post-sales/collections", label: "Collections", icon: <FaReceipt /> },
  { to: "/post-sales/customer-ledger", label: "Customer Ledger", icon: <FaMoneyBillWave /> },
  { to: "/post-sales/reports", label: "Reports", icon: <FaChartBar /> },
];

const PostSalesDashboard = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();

  // 4-Level Drill-Down State
  // Level 1: Projects (Elevation photos)
  // Level 2: Towers (Only selected project's towers)
  // Level 3: Floor-wise SOLD inventory (Only sold/booked flats)
  // Level 4: Customer record (Opens Customer Tab in Section 3)
  const [currentLevel, setCurrentLevel] = useState(1);
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTower, setSelectedTower] = useState(null);

  // Data State
  const [projects, setProjects] = useState([]);
  const [towers, setTowers] = useState([]);
  const [units, setUnits] = useState([]);
  const [postSalesBookings, setPostSalesBookings] = useState([]);
  const [dashboardStats, setDashboardStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStageFilter, setSelectedStageFilter] = useState("all");

  // Load All Projects and Post-Sales Bookings on Mount
  const loadInitialData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [projRes, bookingsRes, statsRes] = await Promise.all([
        fetch(`${API_URL}/projects`, { headers: authHeaders() }),
        fetch(`${API_URL}/post-sales/bookings?limit=1000`, { headers: authHeaders() }),
        fetch(`${API_URL}/post-sales/dashboard-stats`, { headers: authHeaders() }),
      ]);

      if (!projRes.ok) throw new Error("Unable to load projects list");

      const projData = await projRes.json();
      const projectList = normalizeList(projData);
      setProjects(projectList);

      if (bookingsRes.ok) {
        const bData = await bookingsRes.json().catch(() => ({}));
        setPostSalesBookings(normalizeList(bData));
      }

      if (statsRes.ok) {
        const sData = await statsRes.json().catch(() => null);
        if (sData) setDashboardStats(sData);
      }

      // Check URL query param for deep-linking into a project
      const projectIdParam = searchParams.get("projectId");
      if (projectIdParam) {
        const found = projectList.find((p) => String(p.id) === String(projectIdParam));
        if (found) {
          handleSelectProject(found);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load projects inventory for post-sales.");
    } finally {
      setLoading(false);
    }
  }, [searchParams]);

  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  // Level 2: Load Towers for Selected Project
  const loadTowersForProject = async (project) => {
    try {
      setLoading(true);
      setError("");
      const res = await fetch(`${API_URL}/tower/list?projectId=${project.id}`, {
        headers: authHeaders(),
      });
      if (!res.ok) throw new Error("Unable to load towers for project");
      const data = await res.json();
      setTowers(normalizeList(data));
    } catch (err) {
      console.error(err);
      setError("Failed to load towers for this project.");
      setTowers([]);
    } finally {
      setLoading(false);
    }
  };

  // Level 3: Load Units for Selected Tower & Filter to Sold Inventory
  const loadUnitsForTower = async (project, tower) => {
    try {
      setLoading(true);
      setError("");
      const url = tower?.id
        ? `${API_URL}/unit?towerId=${tower.id}&limit=1000`
        : `${API_URL}/unit?projectId=${project.id}&limit=1000`;

      const res = await fetch(url, { headers: authHeaders() });
      if (!res.ok) throw new Error("Unable to load units for tower");

      const data = await res.json();
      const allRaw = normalizeList(data);
      const flattened = flattenUnits(allRaw);

      // Associate with post-sales bookings to ensure accurate customerName, bookingId, and sold status
      const enriched = flattened.map((unit) => {
        const matched = postSalesBookings.find(
          (b) =>
            (b.unitItemId && String(b.unitItemId) === String(unit.id)) ||
            (b.unitId && String(b.unitId) === String(unit.unitId)) ||
            (tower?.id && String(b.towerId) === String(tower.id) && String(b.unit || b.unitItem?.name) === String(unit.name))
        );

        const primaryBooking = unit.bookings?.[0] || matched;
        const bId = unit.bookingId || matched?.id || primaryBooking?.id || null;
        const custName =
          unit.customerName ||
          matched?.customerName ||
          (matched?.lead ? `${matched.lead.firstName || ""} ${matched.lead.lastName || ""}`.trim() : null) ||
          primaryBooking?.customerName ||
          "Customer";
        const val = matched?.agreementValue || matched?.totalFlatPrice || unit.basePrice || 0;
        const stg = matched?.stage || unit.stage || (unit.status === "sold" ? "Sold" : "Booked");

        return {
          ...unit,
          bookingId: bId,
          customerName: custName,
          agreementValue: val,
          stage: stg,
          matchedBooking: matched || null,
        };
      });

      // CRITICAL REQUIREMENT:
      // "Level 3 — Sold inventory: Clicking a tower shows a FLOOR-WISE list — but in post-sales
      //  it shows only SOLD / booked flats (not available inventory).
      //  Filter to booked/registered/possession states."
      const soldOnly = enriched.filter((u) => {
        const st = String(u.status || "").toLowerCase();
        const stageSt = String(u.stage || "").toLowerCase();
        const isSoldStatus = [
          "sold",
          "booked",
          "registered",
          "possession_given",
          "possession",
          "unavailable",
        ].includes(st);
        const hasSoldStage = [
          "booked",
          "confirmed",
          "registered",
          "possession",
          "possession_given",
        ].includes(stageSt);
        const hasBookingLinked = !!u.bookingId || (Array.isArray(u.bookings) && u.bookings.length > 0);

        return isSoldStatus || hasSoldStage || hasBookingLinked;
      });

      setUnits(soldOnly);
    } catch (err) {
      console.error(err);
      setError("Failed to load sold units for this tower.");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  // Level Navigation Handlers
  const handleSelectProject = (project) => {
    setSelectedProject(project);
    setSelectedTower(null);
    setCurrentLevel(2);
    setSearchQuery("");
    loadTowersForProject(project);
  };

  const handleSelectTower = (tower) => {
    setSelectedTower(tower);
    setCurrentLevel(3);
    setSearchQuery("");
    setSelectedStageFilter("all");
    loadUnitsForTower(selectedProject, tower);
  };

  const handleBackToProjects = () => {
    setCurrentLevel(1);
    setSelectedProject(null);
    setSelectedTower(null);
    setSearchQuery("");
    setUnits([]);
  };

  const handleBackToTowers = () => {
    setCurrentLevel(2);
    setSelectedTower(null);
    setSearchQuery("");
    setSelectedStageFilter("all");
    setUnits([]);
    if (selectedProject) {
      loadTowersForProject(selectedProject);
    }
  };

  // LEVEL 4: Customer Record Drill-Down
  // "Clicking a sold flat opens that flat's customer record (Section 3), landing on the Customer tab."
  const handleOpenCustomerRecord = (unit) => {
    if (unit.bookingId) {
      navigate(`/post-sales/details/${unit.bookingId}?tab=customer`);
      return;
    }

    // If unit has no bookingId directly, check postSalesBookings by unit name
    const found = postSalesBookings.find(
      (b) =>
        (b.unit && String(b.unit).trim() === String(unit.name).trim()) ||
        (b.customerName && String(b.customerName).trim() === String(unit.customerName).trim())
    );

    if (found?.id) {
      navigate(`/post-sales/details/${found.id}?tab=customer`);
      return;
    }

    // Fallback: search booking list
    navigate(`/post-sales/booking-list?search=${encodeURIComponent(unit.name)}`);
  };

  // Filtered Projects for Level 1 Search
  const filteredProjects = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return projects;
    return projects.filter((p) =>
      [p.name, p.city, p.state, p.address, p.projectType]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [projects, searchQuery]);

  // Compute sold counts for a project
  const getProjectSoldCount = useCallback(
    (project) => {
      if (project?.soldUnits && Number(project.soldUnits) > 0) {
        return Number(project.soldUnits);
      }
      const matchingBookings = postSalesBookings.filter(
        (b) =>
          String(b.projectId) === String(project?.id) ||
          (b.projectDetails && String(b.projectDetails).toLowerCase().includes(String(project?.name).toLowerCase()))
      );
      return matchingBookings.length;
    },
    [postSalesBookings]
  );

  // Filtered Sold Units for Level 3
  const filteredSoldUnits = useMemo(() => {
    let result = units;

    if (selectedStageFilter !== "all") {
      result = result.filter((u) => {
        const s = String(u.stage || u.status || "").toLowerCase();
        return s.includes(selectedStageFilter.toLowerCase());
      });
    }

    const q = searchQuery.trim().toLowerCase();
    if (q) {
      result = result.filter(
        (u) =>
          String(u.name || "").toLowerCase().includes(q) ||
          String(u.customerName || "").toLowerCase().includes(q) ||
          String(u.configurationLabel || "").toLowerCase().includes(q)
      );
    }

    return result;
  }, [units, selectedStageFilter, searchQuery]);

  // Floor-Wise Grouping of SOLD flats (Descending order: highest floor first down to ground)
  const floorGroups = useMemo(() => {
    const map = new Map();

    filteredSoldUnits.forEach((unit) => {
      const fNum = Number(unit.floorNumber ?? unit.floor ?? 0);
      const fLabel = fNum === 0 ? "Ground Floor" : `Floor ${fNum}`;

      if (!map.has(fNum)) {
        map.set(fNum, {
          floorNumber: fNum,
          floorLabel: fLabel,
          units: [],
        });
      }
      map.get(fNum).units.push(unit);
    });

    // Sort units ascending inside each floor (1301, 1302, 1303...)
    map.forEach((group) => {
      group.units = sortUnitsAscending(group.units);
    });

    // Return floors ordered descending (e.g. 20, 19, 18 ... 1, 0)
    return Array.from(map.values()).sort((a, b) => b.floorNumber - a.floorNumber);
  }, [filteredSoldUnits]);

  // Stage breakdown counts for Level 3 toolbar
  const stageCounts = useMemo(() => {
    const counts = { all: units.length, booked: 0, registered: 0, possession: 0 };
    units.forEach((u) => {
      const st = String(u.stage || u.status || "").toLowerCase();
      if (st.includes("registered")) counts.registered += 1;
      else if (st.includes("possession")) counts.possession += 1;
      else counts.booked += 1;
    });
    return counts;
  }, [units]);

  return (
    <MasterLayout>
      <div className="ps-drilldown-container">
        {/* Module Sub-Navigation Bar */}
        <div className="ps-nav-pills-bar">
          <span className="ps-nav-pill active">
            <FaLayerGroup /> Visual Inventory (Landing)
          </span>
          {quickNavLinks.map((link) => (
            <Link key={link.to} to={link.to} className="ps-nav-pill">
              {link.icon} {link.label}
            </Link>
          ))}
        </div>

        {/* Top Header & Breadcrumb Trail */}
        <div className="inv-top-header">
          <div className="inv-top-header-left">
            <FaBuilding className="text-primary" style={{ fontSize: 24 }} />
            <div>
              <div className="d-flex align-items-center gap-2">
                <h4 className="inv-title">Post-Sales Visual Inventory</h4>
                <span className="ps-level-badge">
                  Level {currentLevel}: {currentLevel === 1 ? "Projects Elevation" : currentLevel === 2 ? "Towers" : "Sold Inventory"}
                </span>
              </div>
              <p className="inv-subtitle">
                Visual Drill-Down: Project Elevations → Towers → Floor-Wise SOLD Inventory → Customer Record
              </p>
            </div>
          </div>

          <div className="inv-header-actions">
            {currentLevel === 1 && (
              <div className="inv-search-box">
                <input
                  type="text"
                  className="inv-search-input"
                  placeholder="Search project by name or location..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            {currentLevel === 3 && (
              <div className="inv-search-box">
                <input
                  type="text"
                  className="inv-search-input"
                  placeholder="Search flat no or customer name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            )}

            {currentLevel > 1 && (
              <button
                type="button"
                className="inv-back-btn"
                onClick={currentLevel === 3 ? handleBackToTowers : handleBackToProjects}
              >
                <FaArrowLeft /> {currentLevel === 3 ? "Back to Towers" : "Back to Projects"}
              </button>
            )}
          </div>
        </div>

        {/* Interactive Breadcrumb Trail */}
        <div className="inv-breadcrumbs-bar">
          <div className="inv-breadcrumbs-trail">
            <span
              className={`inv-breadcrumb-item ${currentLevel === 1 ? "active" : ""}`}
              onClick={handleBackToProjects}
            >
              <FaHome /> All Projects ({projects.length})
            </span>

            {selectedProject && (
              <>
                <span className="inv-breadcrumb-separator">/</span>
                <span
                  className={`inv-breadcrumb-item ${currentLevel === 2 ? "active" : ""}`}
                  onClick={currentLevel === 3 ? handleBackToTowers : undefined}
                >
                  <FaBuilding /> {selectedProject.name}
                </span>
              </>
            )}

            {selectedTower && (
              <>
                <span className="inv-breadcrumb-separator">/</span>
                <span className="inv-breadcrumb-item active">
                  <FaDoorOpen /> {getTowerDisplayName(selectedTower, selectedProject)} (Sold Flats)
                </span>
              </>
            )}
          </div>

          <div className="text-muted" style={{ fontSize: 12 }}>
            {currentLevel === 1 && "Level 1: Click building elevation to view project towers"}
            {currentLevel === 2 && "Level 2: Select a tower to view floor-wise sold flats"}
            {currentLevel === 3 && "Level 3: Click any sold flat to open its Customer Record (Section 3)"}
          </div>
        </div>

        {/* Section 8: Dashboard Tiles — Reconciled with Ledger (Source of Truth) */}
        <div className="row g-3 mb-4">
          {[
            { label: "Post-Sales Bookings", val: postSalesBookings.length || dashboardStats?.totalBookings || 0, color: "#3b82f6", icon: "🏠", sub: "Confirmed / Booked Flats" },
            { label: "Total Demanded", val: formatMoney(dashboardStats?.totalDemanded ?? 0), color: "#dc2626", icon: "🧾", sub: "Ledger Debits Sum" },
            { label: "Total Collected", val: formatMoney(dashboardStats?.collectionsReceived ?? 0), color: "#16a34a", icon: "💰", sub: "Ledger Credits Sum" },
            { label: "Current Outstanding", val: formatMoney(dashboardStats?.outstandingAmount ?? 0), color: "#ea580c", icon: "⚠️", sub: "Debits − Credits (Source of Truth)" },
          ].map(tile => (
            <div key={tile.label} className="col-6 col-md-3">
              <div
                style={{
                  background: "#ffffff",
                  borderRadius: 12,
                  padding: "16px 20px",
                  border: "none",
                  boxShadow: "0 4px 16px rgba(15, 23, 42, 0.08), 0 1px 3px rgba(15, 23, 42, 0.04)",
                }}
              >
                <div style={{ fontSize: 11, fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.5px" }}>{tile.label}</div>
                <div style={{ fontSize: 20, fontWeight: 800, color: "#1e293b", marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
                  <span>{tile.icon}</span> <span>{tile.val}</span>
                </div>
                <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 3 }}>{tile.sub}</div>
              </div>
            </div>
          ))}
        </div>

        {error && <div className="alert alert-danger mb-4">{error}</div>}

        {loading && (
          <div className="text-center py-5">
            <div className="spinner-border text-primary" role="status" />
            <p className="mt-2 text-muted" style={{ fontSize: 13 }}>
              Loading post-sales visual inventory...
            </p>
          </div>
        )}

        {/* =========================================================================
            LEVEL 1: Projects Elevation Photo Cards Grid
            "Large clickable building elevations (real photos), one per project
             (Rajgruha, Shree Ganesh, Amrapali). The image is the clickable element.
             Elevation photo is uploaded on the Project record."
            ========================================================================= */}
        {!loading && currentLevel === 1 && (
          <div>
            <div className="inv-projects-grid">
              {filteredProjects.length === 0 ? (
                <div className="col-12 text-center py-5 text-muted">
                  <h5>No projects found</h5>
                  <p>Try searching for a different project name or location.</p>
                </div>
              ) : (
                filteredProjects.map((project) => {
                  const elevationUrl = getProjectElevationPhoto(project);
                  const isUploadedPhoto = !!(project.elevationPhoto || project.image);
                  const soldCount = getProjectSoldCount(project);
                  const towerCount = project.noOfTowers || project.towerCount || project.tower?.length || 1;

                  return (
                    <div key={project.id} className="inv-project-card">
                      {/* LEVEL 1: The Image is the primary clickable element */}
                      <div
                        className="ps-project-elevation-img-box"
                        onClick={() => handleSelectProject(project)}
                        role="button"
                        tabIndex={0}
                        title={`Click building elevation to view towers for ${project.name}`}
                      >
                        <img
                          src={elevationUrl}
                          alt={`${project.name} Elevation`}
                          className="ps-project-elevation-img"
                        />
                        <div className="ps-elevation-overlay" />

                        {/* Top Badges */}
                        <div className="ps-elevation-badge-floating">
                          <FaBuilding /> {isUploadedPhoto ? "Elevation Photo" : project.projectType || "Residential"}
                        </div>

                        <div className="ps-elevation-sold-badge">
                          <FaCheckCircle /> {soldCount} Sold {soldCount === 1 ? "Flat" : "Flats"}
                        </div>

                        {/* Click CTA hint */}
                        <div className="ps-elevation-click-cta">
                          <span>View Towers</span>
                          <FaArrowLeft style={{ transform: "rotate(180deg)" }} />
                        </div>
                      </div>

                      {/* Card Body */}
                      <div className="inv-project-card-body">
                        <div>
                          <h5
                            className="inv-project-title"
                            style={{ cursor: "pointer" }}
                            onClick={() => handleSelectProject(project)}
                          >
                            {project.name}
                          </h5>
                          <div className="inv-project-location">
                            <FaMapMarkerAlt className="text-danger" />
                            <span>
                              {[project.address, project.city, project.state].filter(Boolean).join(", ") || "Mumbai, Maharashtra"}
                            </span>
                          </div>
                        </div>

                        <div className="inv-project-stats-grid">
                          <div className="inv-stat-item">
                            <span className="inv-stat-value">{towerCount}</span>
                            <span className="inv-stat-label">Towers</span>
                          </div>
                          <div className="inv-stat-item">
                            <span className="inv-stat-value" style={{ color: "#dc2626" }}>
                              {soldCount}
                            </span>
                            <span className="inv-stat-label">Sold</span>
                          </div>
                          <div className="inv-stat-item" style={{ gridColumn: "span 4" }}>
                            <span className="inv-stat-value" style={{ color: "#2563eb", fontSize: 13 }}>
                              {project.reraProjectId || "RERA Approved"}
                            </span>
                            <span className="inv-stat-label">RERA Registration</span>
                          </div>
                        </div>

                        <button
                          type="button"
                          className="inv-project-action-btn"
                          onClick={() => handleSelectProject(project)}
                        >
                          <FaBuilding /> Explore Project Towers →
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            LEVEL 2: Towers for Selected Project
            "Clicking a project's elevation shows its towers (only that project's towers)."
            ========================================================================= */}
        {!loading && currentLevel === 2 && selectedProject && (
          <div>
            {/* Selected Project Elevation Header Banner */}
            <div className="inv-project-header-banner">
              <div className="inv-banner-left">
                <img
                  src={getProjectElevationPhoto(selectedProject)}
                  alt=""
                  className="inv-banner-thumb"
                />
                <div>
                  <h3 className="inv-banner-name">{selectedProject.name}</h3>
                  <p className="inv-banner-sub">
                    <span className="badge bg-primary">{selectedProject.projectType || "Residential"}</span>
                    <span className="d-inline-flex align-items-center gap-1">
                      <FaMapMarkerAlt className="text-danger" /> {[selectedProject.address, selectedProject.city].filter(Boolean).join(", ") || "Mumbai"}
                    </span>
                    {selectedProject.reraProjectId && (
                      <span className="badge bg-secondary">RERA: {selectedProject.reraProjectId}</span>
                    )}
                  </p>
                </div>
              </div>

              <div className="inv-banner-metrics">
                <div className="inv-banner-metric-item">
                  <div className="inv-banner-metric-val">{towers.length}</div>
                  <div className="inv-banner-metric-lbl">Project Towers</div>
                </div>
                <div className="inv-banner-metric-item">
                  <div className="inv-banner-metric-val" style={{ color: "#dc2626" }}>
                    {getProjectSoldCount(selectedProject)}
                  </div>
                  <div className="inv-banner-metric-lbl">Total Sold Flats</div>
                </div>
              </div>
            </div>

            {/* Towers Grid */}
            <h5 className="mb-3 fw-bold text-dark d-flex align-items-center gap-2">
              <FaLayerGroup className="text-primary" /> Select Tower to Inspect Sold Inventory ({towers.length})
            </h5>

            {towers.length === 0 ? (
              <div className="card p-5 text-center text-muted">
                <h5>No towers configured for {selectedProject.name}</h5>
                <p>Add towers in Project setup to view units.</p>
              </div>
            ) : (
              <div className="inv-towers-grid">
                {towers.map((tower) => {
                  const towerPhoto = resolveMediaUrl(tower.elevationPhoto || tower.image);
                  const totalFloors = tower.totalFloor || tower.totalFloors || 0;
                  const towerName = getTowerDisplayName(tower, selectedProject);

                  return (
                    <div
                      key={tower.id}
                      className="inv-tower-card"
                      onClick={() => handleSelectTower(tower)}
                      role="button"
                      tabIndex={0}
                    >
                      <div>
                        <div className="inv-tower-card-top">
                          <div className="inv-tower-icon-box">
                            {towerPhoto ? (
                              <img src={towerPhoto} alt="" className="inv-tower-thumb" />
                            ) : (
                              <FaLayerGroup />
                            )}
                          </div>
                          <div>
                            <h6 className="inv-tower-title">{towerName}</h6>
                            <p className="inv-tower-floors">
                              {totalFloors > 0 ? `${totalFloors} Floors` : "Floors not specified"}
                            </p>
                          </div>
                        </div>

                        <div className="inv-tower-stat-bar">
                          <span style={{ fontSize: 12.5, color: "#64748b" }}>
                            RERA: <strong className="text-dark">{tower.reraTowerId || "—"}</strong>
                          </span>
                          <span style={{ fontSize: 12.5, color: "#dc2626", fontWeight: 700 }}>
                            <FaCheckCircle /> Post-Sales Active
                          </span>
                        </div>
                      </div>

                      <div className="inv-tower-action">
                        <span>View Floor-Wise Sold Flats →</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            LEVEL 3: Floor-wise SOLD Inventory
            "Clicking a tower shows a FLOOR-WISE list — but in post-sales it shows only
             SOLD / booked flats (not available inventory). Reuse the floor-wise grid
             component from booking; filter to booked/registered/possession states."
            ========================================================================= */}
        {!loading && currentLevel === 3 && selectedTower && (
          <div className="inv-level3-wrapper">
            {/* Header & Quick Selector */}
            <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
              <div>
                <h5 className="mb-1 fw-bold text-dark d-flex align-items-center gap-2">
                  <span>{selectedProject?.name}</span>
                  <span className="text-muted">/</span>
                  <span className="text-primary">{getTowerDisplayName(selectedTower, selectedProject)}</span>
                </h5>
                <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>
                  Floor-wise Sold &amp; Booked Flats · Click any flat to open its Customer Record (Section 3)
                </p>
              </div>

              {/* Quick Tower Switcher */}
              {towers.length > 1 && (
                <div className="d-flex align-items-center gap-2">
                  <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                    <FaExchangeAlt /> Switch Tower:
                  </span>
                  <select
                    className="form-select form-select-sm"
                    style={{ width: "auto", minWidth: 160 }}
                    value={selectedTower.id}
                    onChange={(e) => {
                      const target = towers.find((t) => String(t.id) === String(e.target.value));
                      if (target) handleSelectTower(target);
                    }}
                  >
                    {towers.map((t) => (
                      <option key={t.id} value={t.id}>
                        {getTowerDisplayName(t, selectedProject)}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            {/* Informational Notice Banner */}
            <div className="ps-sold-notice-banner">
              <div className="d-flex align-items-center gap-2">
                <FaCheckCircle className="text-danger" style={{ fontSize: 18 }} />
                <span style={{ fontSize: 13, color: "#991b1b", fontWeight: 600 }}>
                  Post-Sales View: Displaying Sold, Booked, Registered &amp; Possession flats only. Available inventory is excluded.
                </span>
              </div>
              <span className="badge bg-danger px-3 py-2" style={{ fontSize: 12 }}>
                {units.length} Sold / Booked Flats in Tower
              </span>
            </div>

            {/* Status Filter Bar for Sold Units */}
            <div className="inv-status-filter-bar mb-3">
              <button
                type="button"
                className={`inv-status-filter-card status-sold ${selectedStageFilter === "all" ? "active" : ""}`}
                onClick={() => setSelectedStageFilter("all")}
              >
                <div className="inv-status-filter-content">
                  <span className="inv-status-filter-label">All Sold Units</span>
                  <span className="inv-status-filter-val" style={{ color: "#dc2626" }}>
                    {stageCounts.all}
                  </span>
                </div>
                <FaCheckCircle className="inv-status-filter-icon" style={{ color: "#dc2626" }} />
              </button>

              <button
                type="button"
                className={`inv-status-filter-card ${selectedStageFilter === "booked" ? "active" : ""}`}
                onClick={() => setSelectedStageFilter(selectedStageFilter === "booked" ? "all" : "booked")}
              >
                <div className="inv-status-filter-content">
                  <span className="inv-status-filter-label">Booked / Confirmed</span>
                  <span className="inv-status-filter-val" style={{ color: "#b91c1c" }}>
                    {stageCounts.booked}
                  </span>
                </div>
                <FaFileAlt className="inv-status-filter-icon" style={{ color: "#b91c1c" }} />
              </button>

              <button
                type="button"
                className={`inv-status-filter-card ${selectedStageFilter === "registered" ? "active" : ""}`}
                onClick={() => setSelectedStageFilter(selectedStageFilter === "registered" ? "all" : "registered")}
              >
                <div className="inv-status-filter-content">
                  <span className="inv-status-filter-label">Registered</span>
                  <span className="inv-status-filter-val" style={{ color: "#1e40af" }}>
                    {stageCounts.registered}
                  </span>
                </div>
                <FaBook className="inv-status-filter-icon" style={{ color: "#1e40af" }} />
              </button>

              <button
                type="button"
                className={`inv-status-filter-card ${selectedStageFilter === "possession" ? "active" : ""}`}
                onClick={() => setSelectedStageFilter(selectedStageFilter === "possession" ? "all" : "possession")}
              >
                <div className="inv-status-filter-content">
                  <span className="inv-status-filter-label">Possession Given</span>
                  <span className="inv-status-filter-val" style={{ color: "#047857" }}>
                    {stageCounts.possession}
                  </span>
                </div>
                <FaDoorOpen className="inv-status-filter-icon" style={{ color: "#047857" }} />
              </button>
            </div>

            {/* Floor-Wise Grid (Reusing Booking Floor Layout) */}
            <div className="inv-grid-wrapper">
              {floorGroups.length === 0 ? (
                <div className="text-center py-5 col-12 text-muted" style={{ gridColumn: "1 / -1" }}>
                  <h6>No sold units found in this tower matching filter criteria.</h6>
                  <p style={{ fontSize: 13 }}>
                    Post-sales operates on units that have already been booked or sold with a customer record.
                  </p>
                  <button
                    className="btn btn-sm btn-outline-primary mt-2"
                    onClick={() => {
                      setSelectedStageFilter("all");
                      setSearchQuery("");
                    }}
                  >
                    Clear Filters
                  </button>
                </div>
              ) : (
                floorGroups.map(({ floorNumber, floorLabel, units: floorSoldUnits }) => (
                  <React.Fragment key={floorNumber}>
                    {/* Vertical Floor Label on the Left */}
                    <div className="inv-floor-label">{floorLabel}</div>

                    {/* Horizontal Line of Sold Flat Boxes on the Right */}
                    <div className="inv-units-line">
                      {floorSoldUnits.length === 0 ? (
                        <span className="text-muted" style={{ fontSize: 12 }}>
                          No sold units on this floor
                        </span>
                      ) : (
                        floorSoldUnits.map((unit) => {
                          const stageClass = String(unit.stage || "").toLowerCase().includes("registered")
                            ? "registered"
                            : String(unit.stage || "").toLowerCase().includes("possession")
                            ? "possession"
                            : "sold";

                          return (
                            /* LEVEL 4: Clicking a sold flat opens Customer Record (Section 3), landing on Customer tab */
                            <div
                              key={unit.id}
                              className={`ps-sold-unit-box ${stageClass}`}
                              onClick={() => handleOpenCustomerRecord(unit)}
                              role="button"
                              tabIndex={0}
                              title={`Click to open customer record for Flat ${unit.name} · ${unit.customerName}`}
                            >
                              <div className="ps-sold-unit-header">
                                <span className="ps-sold-unit-no">Flat : {unit.name}</span>
                                <span className="ps-sold-status-pill">{unit.stage || "SOLD"}</span>
                              </div>

                              <div className="ps-sold-customer-line">
                                <FaUser style={{ fontSize: 11 }} />
                                <span>{unit.customerName || "Customer Record"}</span>
                              </div>

                              <div className="ps-sold-meta-line">
                                <span>{unit.configurationLabel}</span>
                                <span>{unit.areaDisplay ? `${unit.areaDisplay} sq.ft` : ""}</span>
                              </div>

                              <div className="ps-sold-footer-cta">
                                <span>{unit.agreementValue ? formatMoney(unit.agreementValue) : "Cost Sheet Active"}</span>
                                <span className="d-flex align-items-center gap-1">
                                  Customer Record <FaExternalLinkAlt style={{ fontSize: 9 }} />
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </React.Fragment>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
};

export default PostSalesDashboard;
