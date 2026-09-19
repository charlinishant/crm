import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  FaBuilding,
  FaArrowLeft,
  FaSearch,
  FaEllipsisV,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaDoorOpen,
  FaCheckCircle,
  FaInfoCircle,
  FaTimes,
} from "react-icons/fa";
import "../../styles/inventory-drilldown.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  if (source.startsWith("/uploads/")) return `${API_URL}${source}`;
  if (source.startsWith("uploads/")) return `${API_URL}/${source}`;
  return source;
};

const formatPrice = (value) => {
  const amount = Number(value || 0);
  if (!amount) return "Price on Request";
  if (amount >= 10000000) {
    return `₹ ${(amount / 10000000).toFixed(2).replace(/\.?0+$/, "")} Cr`;
  }
  if (amount >= 100000) {
    return `₹ ${(amount / 100000).toFixed(2).replace(/\.?0+$/, "")} L`;
  }
  return `₹ ${amount.toLocaleString("en-IN")}`;
};

const normalizeUnitStatus = (status, unit) => {
  const rawPurpose = String(
    unit?.propertyPurpose || unit?.unitStream || unit?.floorPlanUnitStream || ""
  ).toLowerCase();
  if (rawPurpose.includes("rehab")) return "rehab";

  const val = String(status || "available").toLowerCase();
  if (["booked", "sold", "unavailable"].includes(val)) return "booked";
  if (["blocked", "block"].includes(val)) return "blocked";
  if (val === "refuge") return "refuge";
  if (val === "investor") return "investor";
  return "available";
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

      const builtupVal =
        unit?.builtupArea ??
        floorPlan?.builtupArea ??
        group?.builtupArea ??
        directUnit?.builtupArea ??
        "";

      const areaDisplay = carpetVal || saleableVal || builtupVal || "";

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
        (rawBedrooms ? `${rawBedrooms} BHK` : "");

      const baseRateVal =
        unit?.pricing?.baseRate ??
        unit?.baseRate ??
        floorPlan?.baseRate ??
        group?.baseRate ??
        "";

      const basePriceVal =
        unit?.pricing?.finalPrice ??
        unit?.finalPrice ??
        unit?.basePrice ??
        floorPlan?.basePrice ??
        group?.basePrice ??
        "";

      const facingVal =
        unit?.facing ||
        floorPlan?.facing ||
        group?.facing ||
        "";

      const rawFloor = unit?.floor ?? floorPlan?.name ?? group?.floor ?? 1;
      const floorNumber = Number(String(rawFloor).replace(/\D/g, "")) || 1;

      return {
        id: unit?.id || group?.id || `${rawFloor}-${index}`,
        name: String(unit?.name || unit?.unitNo || group?.name || `Unit ${index + 1}`),
        floor: rawFloor,
        floorNumber: floorNumber,
        carpet: carpetVal !== "-" ? carpetVal : "",
        builtupArea: builtupVal !== "-" ? builtupVal : "",
        saleable: saleableVal !== "-" ? saleableVal : "",
        areaDisplay: areaDisplay !== "-" ? areaDisplay : "",
        bedrooms: rawBedrooms,
        configurationLabel: configLabel,
        facing: facingVal,
        baseRate: baseRateVal,
        basePrice: basePriceVal,
        projectId: group?.project?.id || directUnit?.project?.id || floorPlan?.project?.id || group?.projectId || "",
        towerId: group?.tower?.id || directUnit?.tower?.id || floorPlan?.tower?.id || group?.towerId || "",
        status: normalizeUnitStatus(unit?.status || group?.status || unit?.unitStatus || group?.unitStatus, unit),
        image: resolveMediaUrl(unit?.image || unit?.unitImage || group?.image || floorPlan?.floorPlanImages),
      };
    });
  });

export const InventoryDrilldownBrowser = ({ initialProjectId = null }) => {
  // Navigation State
  const [currentLevel, setCurrentLevel] = useState(1); // 1: Projects, 2: Towers, 3: Units
  const [selectedProject, setSelectedProject] = useState(null);
  const [selectedTower, setSelectedTower] = useState(null);

  // Data State
  const [projects, setProjects] = useState([]);
  const [towers, setTowers] = useState([]);
  const [units, setUnits] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Filter & Search State
  const [searchQuery, setSearchQuery] = useState("");
  const [activeStatusFilter, setActiveStatusFilter] = useState("all");

  // Read-only modal preview state
  const [previewUnit, setPreviewUnit] = useState(null);

  // Fetch all Projects on mount
  const loadProjects = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/projects`);
      if (!res.ok) throw new Error("Unable to load projects");
      const data = await res.json();
      const list = normalizeList(data);
      setProjects(list);

      if (initialProjectId) {
        const found = list.find((p) => String(p.id) === String(initialProjectId));
        if (found) {
          handleSelectProject(found);
        }
      }
    } catch (err) {
      console.error(err);
      setError("Failed to load projects inventory.");
    } finally {
      setLoading(false);
    }
  }, [initialProjectId]);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  // Fetch Towers when Project is selected
  const loadTowersForProject = async (project) => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch(`${API_URL}/tower/list?projectId=${project.id}`);
      if (!res.ok) throw new Error("Unable to load project towers");
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

  // Fetch Units when Tower is selected
  const loadUnitsForTower = async (project, tower) => {
    try {
      setLoading(true);
      setError(null);
      const url = tower?.id
        ? `${API_URL}/unit?towerId=${tower.id}&limit=1000`
        : `${API_URL}/unit?projectId=${project.id}&limit=1000`;
      const res = await fetch(url);
      if (!res.ok) throw new Error("Unable to load units");
      const data = await res.json();
      const allRaw = normalizeList(data);
      const flattened = flattenUnits(allRaw);
      // Filter units matching this tower
      const towerUnits = tower?.id
        ? flattened.filter((u) => !u.towerId || String(u.towerId) === String(tower.id))
        : flattened;
      setUnits(towerUnits.length > 0 ? towerUnits : flattened);
    } catch (err) {
      console.error(err);
      setError("Failed to load floor-wise units.");
      setUnits([]);
    } finally {
      setLoading(false);
    }
  };

  // Navigation Handlers
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
    setActiveStatusFilter("all");
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
    setUnits([]);
    if (selectedProject) {
      loadTowersForProject(selectedProject);
    }
  };

  // Status Counts for Level 3
  const statusCounts = useMemo(() => {
    const counts = {
      all: units.length,
      available: 0,
      booked: 0,
      blocked: 0,
      refuge: 0,
      investor: 0,
      rehab: 0,
    };
    units.forEach((u) => {
      if (counts[u.status] !== undefined) {
        counts[u.status] += 1;
      }
    });
    return counts;
  }, [units]);

  // Group units by Floor in descending order
  const floorGroups = useMemo(() => {
    const filtered =
      activeStatusFilter === "all"
        ? units
        : units.filter((u) => u.status === activeStatusFilter);

    const map = new Map();
    filtered.forEach((unit) => {
      const floorKey = unit.floorNumber || 1;
      if (!map.has(floorKey)) {
        map.set(floorKey, {
          floorNumber: floorKey,
          floorLabel: `Floor ${floorKey}`,
          units: [],
        });
      }
      map.get(floorKey).units.push(unit);
    });

    // If a tower has specified totalFloors, include all floors descending
    const totalFloors = selectedTower?.totalFloor || selectedTower?.totalFloors || 0;
    if (totalFloors > 0 && activeStatusFilter === "all") {
      for (let f = 1; f <= totalFloors; f++) {
        if (!map.has(f)) {
          map.set(f, {
            floorNumber: f,
            floorLabel: `Floor ${f}`,
            units: [],
          });
        }
      }
    }

    return Array.from(map.values()).sort((a, b) => b.floorNumber - a.floorNumber);
  }, [units, activeStatusFilter, selectedTower]);

  // Filtered Projects for Level 1 Search
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;
    return projects.filter((p) =>
      [p.name, p.city, p.state, p.address, p.projectType]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

  return (
    <div className="inv-browser-container">
      {/* Top Header & Search / Actions */}
      <div className="inv-top-header">
        <div className="inv-top-header-left">
          <FaBuilding className="text-primary" style={{ fontSize: 24 }} />
          <div>
            <h4 className="inv-title">Visual Inventory Browser</h4>
            <p className="inv-subtitle">
              Interactive 3-level building drill-down: Projects → Towers → Floor-wise Units
            </p>
          </div>
        </div>

        <div className="inv-header-actions">
          {currentLevel === 1 && (
            <div className="inv-search-box">
              <FaSearch className="inv-search-icon" />
              <input
                type="text"
                className="inv-search-input"
                placeholder="Search building / project..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          )}

          {currentLevel > 1 && (
            <button
              className="inv-back-btn"
              onClick={currentLevel === 3 ? handleBackToTowers : handleBackToProjects}
            >
              <FaArrowLeft /> {currentLevel === 3 ? "Back to Towers" : "Back to Projects"}
            </button>
          )}
        </div>
      </div>

      {/* Breadcrumb Navigation Trail */}
      <div className="inv-breadcrumbs-bar">
        <div className="inv-breadcrumbs-trail">
          <span
            className={`inv-breadcrumb-item ${currentLevel === 1 ? "active" : ""}`}
            onClick={handleBackToProjects}
          >
            <FaBuilding /> All Projects ({projects.length})
          </span>

          {selectedProject && (
            <>
              <span className="inv-breadcrumb-separator">/</span>
              <span
                className={`inv-breadcrumb-item ${currentLevel === 2 ? "active" : ""}`}
                onClick={currentLevel === 3 ? handleBackToTowers : undefined}
              >
                <FaLayerGroup /> {selectedProject.name}
              </span>
            </>
          )}

          {selectedTower && (
            <>
              <span className="inv-breadcrumb-separator">/</span>
              <span className="inv-breadcrumb-item active">
                <FaDoorOpen /> {selectedTower.name || `Tower #${selectedTower.id}`}
              </span>
            </>
          )}
        </div>

        <div className="text-muted" style={{ fontSize: 12 }}>
          {currentLevel === 1 && `Level 1: Click building photo to explore towers`}
          {currentLevel === 2 && `Level 2: Select a tower to inspect floor units`}
          {currentLevel === 3 && `Level 3: Live floor-wise inventory (Read-only)`}
        </div>
      </div>

      {error && <div className="alert alert-danger mb-4">{error}</div>}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status" />
          <p className="mt-2 text-muted" style={{ fontSize: 13 }}>
            Loading inventory data...
          </p>
        </div>
      )}

      {/* =========================================================================
          LEVEL 1: Projects Elevation Photo Cards
          ========================================================================= */}
      {!loading && currentLevel === 1 && (
        <div className="inv-projects-grid">
          {filteredProjects.length === 0 ? (
            <div className="col-12 text-center py-5 text-muted">
              <h5>No projects found</h5>
              <p>Try searching for a different project name or location.</p>
            </div>
          ) : (
            filteredProjects.map((project) => {
              const photoUrl = resolveMediaUrl(
                project.elevationPhoto || project.image || project.projectImage
              );
              const initials = (project.name || "PR")
                .split(" ")
                .map((n) => n[0])
                .slice(0, 2)
                .join("")
                .toUpperCase();

              const towerCount = project.noOfTowers || project.towerCount || project.towers?.length || 1;
              const unitCount = project.unitCount || project.units?.length || 0;
              const availableCount = project.availableUnits || unitCount;

              return (
                <div
                  key={project.id}
                  className="inv-project-card"
                  onClick={() => handleSelectProject(project)}
                  role="button"
                  tabIndex={0}
                >
                  {/* Photo / Elevation Hero Container */}
                  <div className="inv-project-photo-wrapper">
                    {photoUrl ? (
                      <img
                        src={photoUrl}
                        alt={`${project.name} Elevation`}
                        className="inv-project-photo"
                      />
                    ) : (
                      <div className="inv-project-photo-fallback">
                        <FaBuilding className="inv-project-photo-fallback-icon" />
                        <span className="inv-project-photo-fallback-initials">
                          {project.name || "Project"}
                        </span>
                      </div>
                    )}
                    <div className="inv-project-photo-overlay" />

                    {/* Top Type Badge */}
                    <span className="inv-project-badge-top">
                      {project.projectType || "Residential"}
                    </span>

                    {/* Status Badge */}
                    <span className="inv-project-badge-avail">
                      {availableCount > 0 ? `${availableCount} Units Avail` : "Active"}
                    </span>

                    {/* Click hint overlay */}
                    <span className="inv-project-click-hint">
                      View Towers <FaArrowLeft style={{ transform: "rotate(180deg)" }} />
                    </span>
                  </div>

                  {/* Card Details */}
                  <div className="inv-project-card-body">
                    <div>
                      <h5 className="inv-project-title">{project.name}</h5>
                      <div className="inv-project-location">
                        <FaMapMarkerAlt className="text-danger" />
                        <span>
                          {[project.address, project.city, project.state]
                            .filter(Boolean)
                            .join(", ") || "Location specified in master record"}
                        </span>
                      </div>
                    </div>

                    <div className="inv-project-stats-grid">
                      <div className="inv-stat-item">
                        <span className="inv-stat-value">{towerCount}</span>
                        <span className="inv-stat-label">Towers</span>
                      </div>
                      <div className="inv-stat-item">
                        <span className="inv-stat-value">{unitCount || "--"}</span>
                        <span className="inv-stat-label">Total Units</span>
                      </div>
                      <div className="inv-stat-item">
                        <span className="inv-stat-value available">
                          {availableCount || "--"}
                        </span>
                        <span className="inv-stat-label">Available</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="inv-project-action-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleSelectProject(project);
                      }}
                    >
                      <FaBuilding /> Explore Project Towers →
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* =========================================================================
          LEVEL 2: Towers for Selected Project
          ========================================================================= */}
      {!loading && currentLevel === 2 && selectedProject && (
        <div>
          {/* Project Summary Banner */}
          <div className="inv-project-header-banner">
            <div className="inv-banner-left">
              {resolveMediaUrl(selectedProject.elevationPhoto || selectedProject.image) ? (
                <img
                  src={resolveMediaUrl(
                    selectedProject.elevationPhoto || selectedProject.image
                  )}
                  alt=""
                  className="inv-banner-thumb"
                />
              ) : (
                <div className="inv-banner-icon">
                  <FaBuilding />
                </div>
              )}
              <div>
                <h3 className="inv-banner-name" style={{ color: "#ffffff", fontWeight: "bold", margin: "0 0 4px 0", fontSize: "24px" }}>{selectedProject.name}</h3>
                <p className="inv-banner-sub" style={{ color: "#e2e8f0" }}>
                  <span className="badge bg-primary">
                    {selectedProject.projectType || "Residential"}
                  </span>
                  <span>
                    <FaMapMarkerAlt /> {[selectedProject.address, selectedProject.city].filter(Boolean).join(", ")}
                  </span>
                </p>
              </div>
            </div>

            <div className="inv-banner-metrics">
              <div className="inv-banner-metric-item">
                <div className="inv-banner-metric-val">{towers.length}</div>
                <div className="inv-banner-metric-lbl">Total Towers</div>
              </div>
              <div className="inv-banner-metric-item">
                <div className="inv-banner-metric-val">
                  {selectedProject.unitCount || "--"}
                </div>
                <div className="inv-banner-metric-lbl">Total Units</div>
              </div>
            </div>
          </div>

          {/* Towers Grid */}
          <h5 className="mb-3 fw-bold text-dark">
            Select a Tower ({towers.length})
          </h5>

          {towers.length === 0 ? (
            <div className="card p-5 text-center text-muted">
              <h5>No towers configured for this project</h5>
              <p>Add towers in Inventory &gt; Project Towers to view unit layout.</p>
            </div>
          ) : (
            <div className="inv-towers-grid">
              {towers.map((tower) => {
                const towerPhoto = resolveMediaUrl(tower.elevationPhoto || tower.image);
                const totalFloors = tower.totalFloor || tower.totalFloors || 0;
                const unitCount = tower.unitCount || tower._count?.units || 0;

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
                            <img
                              src={towerPhoto}
                              alt=""
                              className="inv-tower-thumb"
                            />
                          ) : (
                            <FaLayerGroup />
                          )}
                        </div>
                        <div>
                          <h6 className="inv-tower-title">{tower.name}</h6>
                          <p className="inv-tower-floors">
                            {totalFloors > 0 ? `${totalFloors} Floors` : "Floors not set"}
                          </p>
                        </div>
                      </div>

                      <div className="inv-tower-stat-bar">
                        <span style={{ fontSize: 12, color: "#64748b" }}>
                          Total Units: <strong className="text-dark">{unitCount || "--"}</strong>
                        </span>
                        <span style={{ fontSize: 12, color: "#16a34a" }}>
                          <FaCheckCircle /> Active
                        </span>
                      </div>
                    </div>

                    <div className="inv-tower-action">
                      <span>View Floor Units Grid →</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* =========================================================================
          LEVEL 3: Floor-wise Unit Grid & Counters
          ========================================================================= */}
      {!loading && currentLevel === 3 && selectedTower && (
        <div className="inv-level3-wrapper">
          {/* Header & Quick Selector */}
          <div className="d-flex align-items-center justify-content-between flex-wrap gap-2 mb-3">
            <div>
              <h5 className="mb-1 fw-bold text-dark">
                {selectedProject?.name} — {selectedTower.name}
              </h5>
              <p className="text-muted mb-0" style={{ fontSize: 12.5 }}>
                Floor-wise real-time unit status &amp; area breakdown (Read-Only Preview)
              </p>
            </div>

            {/* Quick Tower Switcher */}
            {towers.length > 1 && (
              <div className="d-flex align-items-center gap-2">
                <span style={{ fontSize: 12.5, fontWeight: 600, color: "#64748b" }}>
                  Switch Tower:
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
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Status Counters Bar (Clickable to Filter) */}
          <div className="inv-unit-counters-bar">
            {[
              ["all", "All", statusCounts.all],
              ["available", "Available", statusCounts.available],
              ["booked", "Booked", statusCounts.booked],
              ["blocked", "Blocked", statusCounts.blocked],
              ["refuge", "Refuge", statusCounts.refuge],
              ["investor", "Investor", statusCounts.investor],
              ["rehab", "Rehab", statusCounts.rehab],
            ].map(([key, label, count]) => (
              <button
                key={key}
                type="button"
                className={`inv-counter-pill ${key} ${activeStatusFilter === key ? "active" : ""}`}
                onClick={() => setActiveStatusFilter(key)}
              >
                <span className="inv-counter-badge">{count || 0}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>

          {/* Floor-wise Unit Grid (Reusing Booking Layout) */}
          <div className="inv-grid-wrapper">
            {floorGroups.length === 0 ? (
              <div className="text-center py-5 col-12 text-muted" style={{ gridColumn: "1 / -1" }}>
                <h6>No units found matching &apos;{activeStatusFilter}&apos; filter.</h6>
                <button
                  className="btn btn-sm btn-outline-primary mt-2"
                  onClick={() => setActiveStatusFilter("all")}
                >
                  Clear Filter
                </button>
              </div>
            ) : (
              floorGroups.map(({ floorNumber, floorLabel, units: floorUnits }) => (
                <React.Fragment key={floorNumber}>
                  <div className="inv-floor-label">{floorLabel}</div>
                  <div className="inv-units-line">
                    {floorUnits.length === 0 ? (
                      <span className="text-muted" style={{ fontSize: 12 }}>
                        No units on this floor
                      </span>
                    ) : (
                      floorUnits.map((unit) => {
                        const areaText = unit.areaDisplay ? `${unit.areaDisplay} sq.ft` : "";

                        return (
                          <div
                            key={unit.id}
                            className={`inv-unit-box ${unit.status}`}
                            onClick={() => setPreviewUnit(unit)}
                            title={`Click to view specs: Flat ${unit.name} · ${areaText || "Area not set"}`}
                          >
                            {/* Plan 4-pane icon or thumbnail */}
                            {unit.image ? (
                              <img src={unit.image} alt="" className="inv-unit-thumb" />
                            ) : (
                              <span className="inv-unit-plan-icon" aria-hidden="true">
                                <i />
                                <i />
                                <i />
                                <i />
                              </span>
                            )}

                            {/* Flat Number AND Area Together */}
                            <div className="inv-unit-info">
                              <span className="inv-unit-name-text">
                                Flat no : {unit.name}
                              </span>
                              {areaText && (
                                <span className="inv-unit-area-text">
                                  {areaText}
                                </span>
                              )}
                            </div>

                            {/* 3-Dots Preview Popup Trigger */}
                            <span
                              className="inv-unit-dots-btn"
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              title="Quick specs"
                            >
                              <FaEllipsisV />
                              <span className="inv-unit-popup">
                                <span className="inv-popup-header">
                                  FLAT {unit.name}
                                </span>
                                <span className="inv-popup-price">
                                  {formatPrice(unit.basePrice)}
                                  {unit.basePrice ? (
                                    <span className="inv-popup-exact">
                                      (₹{Number(unit.basePrice).toLocaleString("en-IN")})
                                    </span>
                                  ) : null}
                                </span>

                                {unit.carpet && (
                                  <span className="inv-popup-meta">
                                    Carpet: <strong>{unit.carpet} sq.ft</strong>
                                  </span>
                                )}
                                {unit.configurationLabel && (
                                  <span className="inv-popup-meta">
                                    Type: <strong>{unit.configurationLabel}</strong>
                                  </span>
                                )}
                                {unit.saleable && (
                                  <span className="inv-popup-meta">
                                    Saleable: <strong>{unit.saleable} sq.ft</strong>
                                  </span>
                                )}
                                {unit.baseRate && (
                                  <span className="inv-popup-meta">
                                    Rate: <strong>₹{Number(unit.baseRate).toLocaleString("en-IN")}/sq.ft</strong>
                                  </span>
                                )}
                                {unit.facing && (
                                  <span className="inv-popup-meta">
                                    Facing: <strong>{unit.facing}</strong>
                                  </span>
                                )}
                              </span>
                            </span>
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

      {/* =========================================================================
          Read-Only Full Unit Specs Modal
          ========================================================================= */}
      {previewUnit && (
        <div className="inv-modal-overlay" onClick={() => setPreviewUnit(null)}>
          <div className="inv-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <div className="d-flex align-items-center gap-2">
                <FaInfoCircle />
                <h5 className="inv-modal-title">
                  Flat {previewUnit.name} Specifications
                </h5>
              </div>
              <button
                type="button"
                className="inv-modal-close-btn"
                onClick={() => setPreviewUnit(null)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="inv-modal-body">
              <div className="d-flex align-items-center justify-content-between mb-3">
                <span
                  className="badge text-uppercase"
                  style={{
                    backgroundColor:
                      previewUnit.status === "available"
                        ? "#10b981"
                        : previewUnit.status === "booked"
                        ? "#ef4444"
                        : "#64748b",
                    padding: "6px 12px",
                    fontSize: 12,
                  }}
                >
                  Status: {previewUnit.status}
                </span>

                <span className="text-primary fw-bold" style={{ fontSize: 16 }}>
                  {formatPrice(previewUnit.basePrice)}
                </span>
              </div>

              <div className="inv-modal-grid">
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Project</span>
                  <span className="inv-modal-val">{selectedProject?.name || "--"}</span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Tower / Wing</span>
                  <span className="inv-modal-val">{selectedTower?.name || "--"}</span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Floor</span>
                  <span className="inv-modal-val">Floor {previewUnit.floor}</span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Unit Type</span>
                  <span className="inv-modal-val">
                    {previewUnit.configurationLabel ||
                      (previewUnit.bedrooms ? `${previewUnit.bedrooms} BHK` : "--")}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Carpet Area</span>
                  <span className="inv-modal-val">
                    {previewUnit.carpet ? `${previewUnit.carpet} sq.ft` : "--"}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Saleable Area</span>
                  <span className="inv-modal-val">
                    {previewUnit.saleable ? `${previewUnit.saleable} sq.ft` : "--"}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Base Rate</span>
                  <span className="inv-modal-val">
                    {previewUnit.baseRate
                      ? `₹${Number(previewUnit.baseRate).toLocaleString("en-IN")}/sq.ft`
                      : "--"}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Facing</span>
                  <span className="inv-modal-val">{previewUnit.facing || "--"}</span>
                </div>
              </div>
            </div>

            <div className="inv-modal-footer">
              <button
                type="button"
                className="btn btn-secondary btn-sm px-4"
                onClick={() => setPreviewUnit(null)}
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default InventoryDrilldownBrowser;
