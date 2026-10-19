import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  FaBuilding,
  FaArrowLeft,
  FaEllipsisV,
  FaMapMarkerAlt,
  FaLayerGroup,
  FaDoorOpen,
  FaCheckCircle,
  FaInfoCircle,
  FaTimes,
  FaUserFriends,
  FaTag,
  FaExternalLinkAlt,
  FaPlusCircle,
  FaCheck,
  FaPhoneAlt,
  FaEnvelope,
  FaUserCheck,
  FaRegCalendarAlt,
} from "react-icons/fa";
import UserBookingForm from "../../user/UserBookingForm";
import "../../styles/inventory-drilldown.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("token") || sessionStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
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

export const normalizeUnitStatus = (status, unit) => {
  const rawPurpose = String(
    unit?.propertyPurpose ||
      unit?.unitStream ||
      unit?.floorPlanUnitStream ||
      unit?.floor?.unitStream ||
      ""
  ).toLowerCase();
  if (rawPurpose.includes("rehab")) return "rehab";

  const val = String(status || "available").toLowerCase();
  if (
    [
      "booked",
      "sold",
      "registered",
      "possession_given",
      "possession",
      "unavailable",
    ].includes(val)
  ) {
    return "sold";
  }
  if (val === "held") return "held";
  if (
    [
      "blocked",
      "block",
      "investor",
      "refuge",
      "cancelled",
    ].includes(val)
  ) {
    return "blocked";
  }
  if (["available", "vacant"].includes(val)) {
    return "available";
  }
  return "available";
};

export const getTowerDisplayName = (tower, project) => {
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

export const getUnitConfiguration = (unit) => {
  const name = String(unit?.name || "").trim().toUpperCase();
  const rawConfig = String(unit?.configurationLabel || "").trim();
  const rawFpName = String(unit?.floorPlanName || "").trim();
  const rawType = String(unit?.unitType || "").trim();
  const rawBedrooms = unit?.bedrooms;

  // Check for Shop / Commercial
  if (
    name.startsWith("SH-") ||
    name.startsWith("SHOP") ||
    rawType.toLowerCase().includes("commercial") ||
    rawType.toLowerCase().includes("retail") ||
    rawConfig.toLowerCase().includes("shop") ||
    rawFpName.toLowerCase().includes("shop")
  ) {
    return "Shop";
  }

  // Check for Office
  if (
    name.startsWith("OFC") ||
    name.startsWith("OFFICE") ||
    rawConfig.toLowerCase().includes("office") ||
    rawFpName.toLowerCase().includes("office")
  ) {
    return "Office";
  }

  // If configurationLabel is explicit like "1 BHK", "2 BHK", "3 BHK", "4 BHK", "1 RK", "Penthouse", "Studio", "Duplex"
  if (rawConfig && !rawConfig.toUpperCase().startsWith("FP-")) {
    return rawConfig;
  }

  // If bedrooms is known
  if (rawBedrooms && Number(rawBedrooms) > 0) {
    return `${rawBedrooms} BHK`;
  }

  // Check floorPlanName
  if (rawFpName) {
    const bhkMatch = rawFpName.match(/(\d+)\s*(?:BHK|bhk)/i);
    if (bhkMatch) {
      return `${bhkMatch[1]} BHK`;
    }
    const rkMatch = rawFpName.match(/(\d+)\s*(?:RK|rk)/i);
    if (rkMatch) {
      return `${rkMatch[1]} RK`;
    }
    if (rawFpName.toLowerCase().includes("shop")) return "Shop";
    if (rawFpName.toLowerCase().includes("office")) return "Office";
    if (!rawFpName.toUpperCase().startsWith("FP-")) {
      return rawFpName;
    }
  }

  // Check unit name for BHK / RK if any
  const nameBhkMatch = name.match(/(\d+)\s*(?:BHK|bhk)/i);
  if (nameBhkMatch) return `${nameBhkMatch[1]} BHK`;

  return rawConfig || "Standard Unit";
};

export const getUnitPositionSortValue = (unit) => {
  if (!unit) return 0;

  // 1. If explicit unitIndex is present as a valid number
  const explicitIndex = Number(unit.unitIndex ?? unit.position);
  if (Number.isFinite(explicitIndex) && explicitIndex > 0) {
    return explicitIndex;
  }

  // 2. Parse trailing unit-position number (e.g. 1301 -> 1, 1104 -> 4, SH-02 -> 2)
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

export const sortUnitsAscending = (unitsList = []) => {
  return [...unitsList].sort((a, b) => {
    const posA = getUnitPositionSortValue(a);
    const posB = getUnitPositionSortValue(b);
    if (posA !== posB) {
      return posA - posB;
    }
    return String(a.name || "").localeCompare(String(b.name || ""), undefined, {
      numeric: true,
    });
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

      const rawFloor = (unit?.floor !== null && unit?.floor !== undefined)
        ? unit.floor
        : (group?.floor !== null && group?.floor !== undefined ? group.floor : (floorPlan?.name ?? 1));
      const floorDigits = String(rawFloor).replace(/[^\d-]/g, "");
      const parsedFloor = Number(floorDigits);
      const floorNumber = Number.isFinite(parsedFloor) ? parsedFloor : 0;

      const floorPlanName =
        floorPlan?.planName ||
        floorPlan?.name ||
        unit?.floorPlan?.planName ||
        unit?.floorPlan?.name ||
        group?.floorPlan?.planName ||
        group?.floor?.name ||
        group?.name ||
        "";

      const floorPlanId =
        floorPlan?.id ||
        unit?.floorPlanId ||
        group?.floorPlanId ||
        group?.floor?.id ||
        "";

      const rawPurpose = String(
        unit?.propertyPurpose || unit?.unitStream || unit?.floorPlanUnitStream || ""
      ).toLowerCase();
      const unitType =
        unit?.type ||
        floorPlan?.type ||
        group?.type ||
        group?.category ||
        (rawPurpose.includes("rehab") ? "REHAB" : "SALE");

      const firstBooking = Array.isArray(unit?.bookings) && unit.bookings.length > 0 
        ? unit.bookings[0] 
        : (Array.isArray(group?.bookings) && group.bookings.length > 0 ? group.bookings[0] : null);

      const leadObj = firstBooking?.lead || unit?.lead || group?.lead || null;

      const rawLead =
        unit?.leadName ||
        (leadObj
          ? `${leadObj.firstName || ""} ${leadObj.lastName || ""}`.trim() || leadObj.name || leadObj.companyName
          : null) ||
        firstBooking?.leadName ||
        firstBooking?.customerName ||
        group?.leadName ||
        "";

      const leadId =
        unit?.leadId ||
        leadObj?.id ||
        firstBooking?.leadId ||
        group?.leadId ||
        null;

      const leadPhone =
        leadObj?.phone || leadObj?.contact || leadObj?.mobile || unit?.leadPhone || firstBooking?.phone || group?.leadPhone || "";

      const leadEmail =
        leadObj?.email || unit?.leadEmail || firstBooking?.email || group?.leadEmail || "";

      const leadStage =
        leadObj?.stage || leadObj?.status || leadObj?.lead_status || firstBooking?.stage || "";

      const bookingDate =
        firstBooking?.bookingDate || firstBooking?.createdAt || unit?.bookingDate || "";

      const agreementValue =
        firstBooking?.agreementValue || firstBooking?.totalCost || unit?.agreementValue || "";

      const bookings = unit?.bookings || group?.bookings || (firstBooking ? [firstBooking] : []);

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
        floorPlanName,
        floorPlanId,
        unitType,
        leadName: rawLead || "",
        leadId,
        leadPhone,
        leadEmail,
        leadStage,
        bookingDate,
        agreementValue,
        bookings,
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
  const [selectedConfigFilter, setSelectedConfigFilter] = useState("all");
  const [selectedFloorPlanFilter, setSelectedFloorPlanFilter] = useState("all");

  // Read-only modal preview state
  const [previewUnit, setPreviewUnit] = useState(null);

  // Booking and Lead Integration State
  const [selectedBookingUnit, setSelectedBookingUnit] = useState(null);
  const [isLeadModalOpen, setIsLeadModalOpen] = useState(false);
  const [leadsList, setLeadsList] = useState([]);
  const [leadSearchQuery, setLeadSearchQuery] = useState("");
  const [loadingLeads, setLoadingLeads] = useState(false);
  const [isCreatingNewLead, setIsCreatingNewLead] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    source: "Website",
  });
  const [leadError, setLeadError] = useState("");
  const [savingLead, setSavingLead] = useState(false);

  const [isBookingOpen, setIsBookingOpen] = useState(false);
  const [bookingStepIndex, setBookingStepIndex] = useState(0);
  const [isSavingBooking, setIsSavingBooking] = useState(false);
  const [bookingMessage, setBookingMessage] = useState("");
  const [isBookingSuccess, setIsBookingSuccess] = useState(false);
  const [bookingForm, setBookingForm] = useState({});

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
    setActiveStatusFilter("all");
    setSelectedConfigFilter("all");
    loadTowersForProject(project);
    loadUnitsForTower(project, null);
  };

  const handleSelectTower = (tower) => {
    setSelectedTower(tower);
    setCurrentLevel(3);
    setActiveStatusFilter("all");
    setSelectedConfigFilter("all");
    setSelectedFloorPlanFilter("all");
    loadUnitsForTower(selectedProject, tower);
  };

  const handleBackToProjects = () => {
    setCurrentLevel(1);
    setSelectedProject(null);
    setSelectedTower(null);
    setSearchQuery("");
    setActiveStatusFilter("all");
    setSelectedConfigFilter("all");
    setUnits([]);
  };

  const handleBackToTowers = () => {
    setCurrentLevel(2);
    setSelectedTower(null);
    setActiveStatusFilter("all");
    setSelectedConfigFilter("all");
    setSelectedFloorPlanFilter("all");
    if (selectedProject) {
      loadTowersForProject(selectedProject);
      loadUnitsForTower(selectedProject, null);
    }
  };

  // Booking and Lead Handlers
  const handleOpenBookingForUnit = async (unit) => {
    setSelectedBookingUnit(unit);
    setPreviewUnit(null);

    // If unit already has a linked lead, open booking directly
    if (unit.leadId) {
      setBookingForm({
        leadId: unit.leadId,
        customerName: unit.leadName || "Customer",
        projectId: unit.projectId || selectedProject?.id,
        projectDetails: selectedProject?.name || "",
        towerId: unit.towerId || selectedTower?.id,
        unitItemId: unit.id,
        unit: unit.name,
        floor: unit.floor,
        baseRate: unit.baseRate,
        basePrice: unit.basePrice,
        carpetArea: unit.carpet,
        saleableArea: unit.saleable,
        rateBasis: unit.rateBasis || "On Carpet",
        stage: "Booked",
        idempotencyKey: `booking-${unit.leadId}-${unit.id}-${Date.now()}`,
      });
      setBookingStepIndex(0);
      setIsBookingSuccess(false);
      setBookingMessage("");
      setIsBookingOpen(true);
      return;
    }

    // Otherwise load leads and open lead selection / creation modal
    try {
      setLoadingLeads(true);
      setLeadError("");
      const res = await fetch(`${API_URL}/leads/`, { headers: getAuthHeaders() });
      const data = await res.json();
      setLeadsList(normalizeList(data));
    } catch (err) {
      setLeadsList([]);
    } finally {
      setLoadingLeads(false);
      setIsLeadModalOpen(true);
    }
  };

  const handleSelectLeadForBooking = (lead) => {
    setIsLeadModalOpen(false);
    const leadName = `${lead.firstName || ""} ${lead.lastName || ""}`.trim() || lead.name || lead.companyName || "Lead";
    setBookingForm({
      leadId: lead.id,
      customerName: leadName,
      projectId: selectedBookingUnit?.projectId || selectedProject?.id,
      projectDetails: selectedProject?.name || "",
      towerId: selectedBookingUnit?.towerId || selectedTower?.id,
      unitItemId: selectedBookingUnit?.id,
      unit: selectedBookingUnit?.name,
      floor: selectedBookingUnit?.floor,
      baseRate: selectedBookingUnit?.baseRate,
      basePrice: selectedBookingUnit?.basePrice,
      carpetArea: selectedBookingUnit?.carpet,
      saleableArea: selectedBookingUnit?.saleable,
      rateBasis: selectedBookingUnit?.rateBasis || "On Carpet",
      stage: "Booked",
      idempotencyKey: `booking-${lead.id}-${selectedBookingUnit?.id}-${Date.now()}`,
    });
    setBookingStepIndex(0);
    setIsBookingSuccess(false);
    setBookingMessage("");
    setIsBookingOpen(true);
  };

  const handleCreateNewLeadForBooking = async (e) => {
    e.preventDefault();
    if (!newLeadForm.firstName || !newLeadForm.phone) {
      setLeadError("First Name and Phone are required.");
      return;
    }

    setSavingLead(true);
    setLeadError("");
    try {
      const res = await fetch(`${API_URL}/leads/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify({
          ...newLeadForm,
          interestedProjects: selectedProject?.name || "",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.message || data?.error || "Failed to create lead");
      }
      const createdLead = data?.data || data;
      setIsCreatingNewLead(false);
      handleSelectLeadForBooking(createdLead);
    } catch (err) {
      setLeadError(err.message || "Failed to create lead");
    } finally {
      setSavingLead(false);
    }
  };

  const handleSubmitBooking = async (event) => {
    if (event?.preventDefault) event.preventDefault();
    if (bookingStepIndex < 2) {
      setBookingStepIndex((prev) => prev + 1);
      return;
    }

    setIsSavingBooking(true);
    setBookingMessage("");
    try {
      const payload = {
        ...bookingForm,
        stage: "Booked",
        soldPrice: Number(bookingForm.totalPrice || bookingForm.basePrice || 0),
        unitItemId: bookingForm.unitItemId ? Number(bookingForm.unitItemId) : undefined,
        leadId: bookingForm.leadId ? Number(bookingForm.leadId) : undefined,
      };
      const res = await fetch(`${API_URL}/bookings`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...getAuthHeaders(),
        },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok) {
        throw new Error(result?.message || result?.error || "Failed to create booking");
      }
      setIsBookingSuccess(true);
      setBookingMessage("Booking created successfully!");
      // Immediately refresh inventory from database
      if (selectedProject && selectedTower) {
        loadUnitsForTower(selectedProject, selectedTower);
      }
    } catch (err) {
      setBookingMessage(err.message || "Something went wrong while booking.");
    } finally {
      setIsSavingBooking(false);
    }
  };

  const filteredLeads = useMemo(() => {
    const q = leadSearchQuery.trim().toLowerCase();
    if (!q) return leadsList;
    return leadsList.filter((l) =>
      [l.firstName, l.lastName, l.name, l.phone, l.email, l.companyName]
        .filter(Boolean)
        .some((val) => String(val).toLowerCase().includes(q))
    );
  }, [leadsList, leadSearchQuery]);

  // Available Configurations (BHK / Type) dynamically driven from project units
  const availableConfigurations = useMemo(() => {
    const map = new Map();
    units.forEach((u) => {
      const config = getUnitConfiguration(u);
      if (!map.has(config)) {
        map.set(config, {
          config,
          totalCount: 0,
          activeStatusCount: 0,
        });
      }
      const item = map.get(config);
      item.totalCount += 1;
      if (activeStatusFilter === "all" || u.status === activeStatusFilter) {
        item.activeStatusCount += 1;
      }
    });
    return Array.from(map.values()).sort((a, b) =>
      a.config.localeCompare(b.config, undefined, { numeric: true })
    );
  }, [units, activeStatusFilter]);

  // Status Counts for Level 3 (Respecting selectedConfigFilter if set)
  const statusCounts = useMemo(() => {
    const scopedUnits =
      selectedConfigFilter === "all"
        ? units
        : units.filter((u) => getUnitConfiguration(u) === selectedConfigFilter);

    const counts = {
      all: scopedUnits.length,
      available: 0,
      sold: 0,
      rehab: 0,
      held: 0,
      blocked: 0,
    };
    scopedUnits.forEach((u) => {
      if (counts[u.status] !== undefined) {
        counts[u.status] += 1;
      } else {
        counts.available += 1;
      }
    });
    return counts;
  }, [units, selectedConfigFilter]);

  // Phase 18 Project Dashboard Statistics
  const dashboardStats = useMemo(() => {
    const totalUnits = units.length;
    let availableUnits = 0;
    let bookedUnits = 0;
    let unitsWithLeads = 0;
    let totalBookingAmount = 0;

    units.forEach((u) => {
      const st = String(u.status || "").toLowerCase();
      if (st === "available") {
        availableUnits += 1;
      }
      if (st === "booked" || st === "sold") {
        bookedUnits += 1;
      }
      if (u.leadName && String(u.leadName).trim() !== "") {
        unitsWithLeads += 1;
      }
      if (Array.isArray(u.bookings)) {
        u.bookings.forEach((b) => {
          if (b.stage === "Confirmed" || b.status === "Approved" || b.stage === "Booked") {
            const amt = Number(b.finalAmount || b.tokenAmount || b.agreementValue || b.soldPrice || 0);
            if (!Number.isNaN(amt)) totalBookingAmount += amt;
          }
        });
      }
    });

    return {
      totalUnits,
      availableUnits,
      bookedUnits,
      unitsWithLeads,
      totalBookingAmount:
        totalBookingAmount > 0
          ? `₹${totalBookingAmount.toLocaleString("en-IN")}`
          : "₹0",
    };
  }, [units]);

  // Phase 17 Available Floor Plans for Tower Filter
  const availableFloorPlans = useMemo(() => {
    const map = new Map();
    units.forEach((u) => {
      const name = u.floorPlanName || "General";
      if (!map.has(name)) {
        map.set(name, {
          name,
          count: 0,
        });
      }
      map.get(name).count += 1;
    });
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, undefined, { numeric: true })
    );
  }, [units]);

  // Group units by Floor in descending order (Combining status AND config filters)
  const floorGroups = useMemo(() => {
    let filtered = units;
    if (activeStatusFilter !== "all") {
      filtered = filtered.filter((u) => u.status === activeStatusFilter);
    }
    if (selectedConfigFilter !== "all") {
      filtered = filtered.filter(
        (u) => getUnitConfiguration(u) === selectedConfigFilter
      );
    }
    if (selectedFloorPlanFilter !== "all") {
      filtered = filtered.filter(
        (u) => (u.floorPlanName || "General") === selectedFloorPlanFilter
      );
    }

    const map = new Map();
    filtered.forEach((unit) => {
      const floorKey = (unit.floor !== null && unit.floor !== undefined && unit.floor !== "")
        ? Number(unit.floor)
        : (unit.floorNumber ?? 0);
      const floorLabel = floorKey === 0 ? "Ground Floor" : `Floor ${floorKey}`;
      if (!map.has(floorKey)) {
        map.set(floorKey, {
          floorNumber: floorKey,
          floorLabel,
          units: [],
        });
      }
      map.get(floorKey).units.push(unit);
    });

    // Sort units ascending by position inside each floor
    map.forEach((floorGroup) => {
      floorGroup.units = sortUnitsAscending(floorGroup.units);
    });

    // If a tower has specified totalFloors, include all floors descending when no filter is active
    const totalFloors = selectedTower?.totalFloor || selectedTower?.totalFloors || 0;
    if (
      totalFloors > 0 &&
      activeStatusFilter === "all" &&
      selectedConfigFilter === "all" &&
      selectedFloorPlanFilter === "all"
    ) {
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
  }, [units, activeStatusFilter, selectedConfigFilter, selectedFloorPlanFilter, selectedTower]);

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
                <FaDoorOpen /> {getTowerDisplayName(selectedTower, selectedProject)}
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
                        onError={(e) => {
                          e.currentTarget.style.display = 'none';
                          const fallback = e.currentTarget.parentElement?.querySelector('.inv-project-photo-fallback');
                          if (fallback) fallback.style.display = 'flex';
                        }}
                      />
                    ) : null}
                    <div
                      className="inv-project-photo-fallback"
                      style={{ display: photoUrl ? 'none' : 'flex' }}
                    >
                      <FaBuilding className="inv-project-photo-fallback-icon" />
                      <span className="inv-project-photo-fallback-initials">
                        {project.name || "Project"}
                      </span>
                    </div>
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
                            .join(", ") || "-"}
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
                        <span className="inv-stat-label">Total</span>
                      </div>
                      <div className="inv-stat-item">
                        <span className="inv-stat-value available">
                          {project.availableUnits || "0"}
                        </span>
                        <span className="inv-stat-label">Avail</span>
                      </div>
                      <div className="inv-stat-item">
                        <span className="inv-stat-value" style={{ color: "#dc2626" }}>
                          {project.soldUnits || "0"}
                        </span>
                        <span className="inv-stat-label">Sold</span>
                      </div>
                      <div className="inv-stat-item">
                        <span className="inv-stat-value" style={{ color: "#3b82f6" }}>
                          {project.rehabUnits || "0"}
                        </span>
                        <span className="inv-stat-label">Rehab</span>
                      </div>
                      <div className="inv-stat-item">
                        <span className="inv-stat-value" style={{ color: "#d97706" }}>
                          {project.heldUnits || "0"}
                        </span>
                        <span className="inv-stat-label">Held</span>
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
                <h3 className="inv-banner-name">{selectedProject.name}</h3>
                <p className="inv-banner-sub">
                  <span className="badge bg-primary">
                    {selectedProject.projectType || "Residential"}
                  </span>
                  <span className="d-inline-flex align-items-center gap-1">
                    <FaMapMarkerAlt className="text-danger" /> {[selectedProject.address, selectedProject.city].filter(Boolean).join(", ") || "-"}
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
                  {selectedProject.unitCount || dashboardStats.totalUnits || "--"}
                </div>
                <div className="inv-banner-metric-lbl">Total Units</div>
              </div>
            </div>
          </div>

          {/* Phase 18 Project Dashboard Statistics */}
          <div className="inv-dashboard-stats-grid">
            <div className="inv-stat-card">
              <div className="inv-stat-content">
                <span className="inv-stat-title">Total Units</span>
                <span className="inv-stat-value">{dashboardStats.totalUnits}</span>
              </div>
              <FaBuilding className="inv-stat-icon text-primary" />
            </div>
            <div className="inv-stat-card">
              <div className="inv-stat-content">
                <span className="inv-stat-title">Available Units</span>
                <span className="inv-stat-value" style={{ color: "#10b981" }}>
                  {dashboardStats.availableUnits}
                </span>
              </div>
              <FaDoorOpen className="inv-stat-icon" style={{ color: "#10b981" }} />
            </div>
            <div className="inv-stat-card">
              <div className="inv-stat-content">
                <span className="inv-stat-title">Booked Units</span>
                <span className="inv-stat-value" style={{ color: "#ef4444" }}>
                  {dashboardStats.bookedUnits}
                </span>
              </div>
              <FaCheckCircle className="inv-stat-icon" style={{ color: "#ef4444" }} />
            </div>
            <div className="inv-stat-card">
              <div className="inv-stat-content">
                <span className="inv-stat-title">Units With Leads</span>
                <span className="inv-stat-value" style={{ color: "#3b82f6" }}>
                  {dashboardStats.unitsWithLeads}
                </span>
              </div>
              <FaUserFriends className="inv-stat-icon" style={{ color: "#3b82f6" }} />
            </div>
            <div className="inv-stat-card">
              <div className="inv-stat-content">
                <span className="inv-stat-title">Total Booking Amount</span>
                <span className="inv-stat-value" style={{ color: "#8b5cf6" }}>
                  {dashboardStats.totalBookingAmount}
                </span>
              </div>
              <FaTag className="inv-stat-icon" style={{ color: "#8b5cf6" }} />
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
                {selectedProject?.name} — {getTowerDisplayName(selectedTower, selectedProject)}
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
                      {getTowerDisplayName(t, selectedProject)}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Filter 1: Status Counter / Filter Bar (Item 1 & Item 3 Live Queries & Filtering) */}
          <div className="inv-status-filter-bar">
            <button
              type="button"
              className={`inv-status-filter-card status-total ${activeStatusFilter === "all" ? "active" : ""}`}
              onClick={() => setActiveStatusFilter("all")}
              title="Show all unit statuses"
            >
              <div className="inv-status-filter-content">
                <span className="inv-status-filter-label">Total Units</span>
                <span className="inv-status-filter-val">{statusCounts.all}</span>
              </div>
              <FaBuilding className="inv-status-filter-icon text-secondary" />
            </button>

            <button
              type="button"
              className={`inv-status-filter-card status-available ${activeStatusFilter === "available" ? "active" : ""}`}
              onClick={() => setActiveStatusFilter(activeStatusFilter === "available" ? "all" : "available")}
              title="Filter to Available units"
            >
              <div className="inv-status-filter-content">
                <span className="inv-status-filter-label">Available</span>
                <span className="inv-status-filter-val" style={{ color: "#16a34a" }}>
                  {statusCounts.available}
                </span>
              </div>
              <FaDoorOpen className="inv-status-filter-icon" style={{ color: "#16a34a" }} />
            </button>

            <button
              type="button"
              className={`inv-status-filter-card status-sold ${activeStatusFilter === "sold" ? "active" : ""}`}
              onClick={() => setActiveStatusFilter(activeStatusFilter === "sold" ? "all" : "sold")}
              title="Filter to Sold / Booked units"
            >
              <div className="inv-status-filter-content">
                <span className="inv-status-filter-label">Sold</span>
                <span className="inv-status-filter-val" style={{ color: "#dc2626" }}>
                  {statusCounts.sold}
                </span>
              </div>
              <FaCheckCircle className="inv-status-filter-icon" style={{ color: "#dc2626" }} />
            </button>

            <button
              type="button"
              className={`inv-status-filter-card status-rehab ${activeStatusFilter === "rehab" ? "active" : ""}`}
              onClick={() => setActiveStatusFilter(activeStatusFilter === "rehab" ? "all" : "rehab")}
              title="Filter to Rehab units"
            >
              <div className="inv-status-filter-content">
                <span className="inv-status-filter-label">Rehab</span>
                <span className="inv-status-filter-val" style={{ color: "#2563eb" }}>
                  {statusCounts.rehab}
                </span>
              </div>
              <FaLayerGroup className="inv-status-filter-icon" style={{ color: "#2563eb" }} />
            </button>

            <button
              type="button"
              className={`inv-status-filter-card status-held ${activeStatusFilter === "held" ? "active" : ""}`}
              onClick={() => setActiveStatusFilter(activeStatusFilter === "held" ? "all" : "held")}
              title="Filter to Held units"
            >
              <div className="inv-status-filter-content">
                <span className="inv-status-filter-label">Held</span>
                <span className="inv-status-filter-val" style={{ color: "#d97706" }}>
                  {statusCounts.held}
                </span>
              </div>
              <FaTag className="inv-status-filter-icon" style={{ color: "#d97706" }} />
            </button>

            <button
              type="button"
              className={`inv-status-filter-card status-blocked ${activeStatusFilter === "blocked" ? "active" : ""}`}
              onClick={() => setActiveStatusFilter(activeStatusFilter === "blocked" ? "all" : "blocked")}
              title="Filter to Blocked / Investor units"
            >
              <div className="inv-status-filter-content">
                <span className="inv-status-filter-label">Blocked</span>
                <span className="inv-status-filter-val" style={{ color: "#64748b" }}>
                  {statusCounts.blocked}
                </span>
              </div>
              <FaTimes className="inv-status-filter-icon" style={{ color: "#64748b" }} />
            </button>
          </div>

          {/* Filter 2: Dynamic Configuration (BHK / Type) Filter */}
          {availableConfigurations.length > 0 && (
            <div className="inv-config-filter-wrapper">
              <div className="inv-config-filter-header">
                <div className="d-flex align-items-center gap-2">
                  <FaTag className="text-primary" />
                  <span className="fw-bold">Configuration Filter ({availableConfigurations.length} types):</span>
                </div>
                {selectedConfigFilter !== "all" && (
                  <button
                    type="button"
                    className="btn btn-sm btn-link text-decoration-none p-0 text-primary"
                    onClick={() => setSelectedConfigFilter("all")}
                    style={{ fontSize: 12, fontWeight: 600 }}
                  >
                    Clear Config Filter
                  </button>
                )}
              </div>
              <div className="inv-config-pills-list">
                <button
                  type="button"
                  className={`inv-config-pill ${selectedConfigFilter === "all" ? "active" : ""}`}
                  onClick={() => setSelectedConfigFilter("all")}
                >
                  All Configurations ({units.length})
                </button>
                {availableConfigurations.map((item) => (
                  <button
                    key={item.config}
                    type="button"
                    className={`inv-config-pill ${selectedConfigFilter === item.config ? "active" : ""}`}
                    onClick={() =>
                      setSelectedConfigFilter(
                        selectedConfigFilter === item.config ? "all" : item.config
                      )
                    }
                  >
                    {item.config} (
                    {activeStatusFilter === "all" ? item.totalCount : item.activeStatusCount}
                    )
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Active Combined Filter Tag Banner */}
          {(activeStatusFilter !== "all" || selectedConfigFilter !== "all") && (
            <div className="inv-active-filter-alert">
              <div className="d-flex align-items-center gap-2 flex-wrap">
                <span style={{ fontSize: 13, color: "#334155", fontWeight: 600 }}>Active Filters:</span>
                {activeStatusFilter !== "all" && (
                  <span
                    className="badge text-uppercase px-2 py-1"
                    style={{
                      backgroundColor:
                        activeStatusFilter === "available"
                          ? "#16a34a"
                          : activeStatusFilter === "sold"
                          ? "#dc2626"
                          : activeStatusFilter === "rehab"
                          ? "#2563eb"
                          : activeStatusFilter === "held"
                          ? "#d97706"
                          : "#64748b",
                    }}
                  >
                    Status: {activeStatusFilter}
                  </span>
                )}
                {selectedConfigFilter !== "all" && (
                  <span className="badge bg-primary px-2 py-1">
                    Config: {selectedConfigFilter}
                  </span>
                )}
                <span className="text-muted ms-1" style={{ fontSize: 12.5 }}>
                  ({floorGroups.reduce((acc, f) => acc + f.units.length, 0)} units match)
                </span>
              </div>
              <button
                type="button"
                className="btn btn-sm btn-outline-secondary py-1 px-3"
                style={{ fontSize: 12, borderRadius: 6 }}
                onClick={() => {
                  setActiveStatusFilter("all");
                  setSelectedConfigFilter("all");
                }}
              >
                Clear All Filters
              </button>
            </div>
          )}

          {/* Status Color Scheme Legend */}
          <div className="inv-legend-bar" aria-label="Status colour legend">
            <span className="inv-legend-title">Legend:</span>
            <div className="inv-legend-items">
              <span className="inv-legend-item">
                <span className="inv-legend-swatch available" /> Available
              </span>
              <span className="inv-legend-item">
                <span className="inv-legend-swatch sold" /> Sold / Booked
              </span>
              <span className="inv-legend-item">
                <span className="inv-legend-swatch rehab" /> Rehab
              </span>
              <span className="inv-legend-item">
                <span className="inv-legend-swatch held" /> Held
              </span>
              <span className="inv-legend-item">
                <span className="inv-legend-swatch blocked" /> Blocked
              </span>
              <span className="inv-legend-item">
                <span className="inv-legend-swatch investor" /> Investor
              </span>
            </div>
          </div>

          {/* Floor-wise Unit Grid (Reusing Booking Layout) */}
          <div className="inv-grid-wrapper">
            {floorGroups.length === 0 ? (
              <div className="text-center py-5 col-12 text-muted" style={{ gridColumn: "1 / -1" }}>
                <h6>
                  No units found matching &apos;
                  {[activeStatusFilter !== "all" ? activeStatusFilter : "", selectedConfigFilter !== "all" ? selectedConfigFilter : ""]
                    .filter(Boolean)
                    .join(" + ")}
                  &apos; filter.
                </h6>
                <button
                  className="btn btn-sm btn-outline-primary mt-2"
                  onClick={() => {
                    setActiveStatusFilter("all");
                    setSelectedConfigFilter("all");
                    setSelectedFloorPlanFilter("all");
                  }}
                >
                  Clear Filters
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
                        const isShop =
                          String(unit.name).startsWith("SH-") ||
                          String(unit.unitType || "").toLowerCase().includes("commercial") ||
                          String(unit.configurationLabel || "").toLowerCase().includes("shop");
                        const isOffice =
                          String(unit.name).startsWith("OFC") ||
                          String(unit.configurationLabel || "").toLowerCase().includes("office");

                        return (
                          <div
                            key={unit.id}
                            className={`inv-unit-box ${unit.status}`}
                            onClick={() => setPreviewUnit(unit)}
                            title={`Click to view specs: ${isShop ? "Shop" : isOffice ? "Office" : "Flat"} ${unit.name} · ${areaText || "Area not set"}`}
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

                            {/* Flat/Shop/Office Number AND Area Together */}
                            <div className="inv-unit-info">
                              <span className="inv-unit-name-text">
                                {isShop ? "Shop no" : isOffice ? "Office no" : "Flat no"} : {unit.name}
                              </span>
                              {areaText && (
                                <span className="inv-unit-area-text">
                                  {areaText}
                                </span>
                              )}
                              {unit.configurationLabel && (
                                <span style={{ fontSize: 10.5, color: "rgba(255,255,255,0.9)", fontWeight: 600 }}>
                                  {unit.configurationLabel}
                                </span>
                              )}
                              {unit.status === "sold" || unit.status === "booked" ? (
                                <span className="inv-unit-lead-pill" style={{ background: "#fee2e2", color: "#991b1b" }}>
                                  🔒 SOLD {unit.leadName ? `(${unit.leadName})` : ""}
                                </span>
                              ) : unit.status === "rehab" ? (
                                <span className="inv-unit-lead-pill" style={{ background: "#dbeafe", color: "#1e40af" }}>
                                  🏢 REHAB
                                </span>
                              ) : unit.status === "held" ? (
                                <span className="inv-unit-lead-pill" style={{ background: "#fef3c7", color: "#92400e" }}>
                                  ⏳ HELD
                                </span>
                              ) : unit.status === "blocked" ? (
                                <span className="inv-unit-lead-pill" style={{ background: "#f1f5f9", color: "#475569" }}>
                                  🚫 BLOCKED
                                </span>
                              ) : unit.leadName ? (
                                <span className="inv-unit-lead-pill" title={`Lead: ${unit.leadName}`}>
                                  👤 {unit.leadName}
                                </span>
                              ) : (
                                <span className="inv-unit-vacant-pill">
                                  AVAILABLE
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
                                  {isShop ? "SHOP" : isOffice ? "OFFICE" : "FLAT"} {unit.name}
                                </span>
                                <span className="inv-popup-price">
                                  {formatPrice(unit.basePrice)}
                                  {unit.basePrice ? (
                                    <span className="inv-popup-exact">
                                      (₹{Number(unit.basePrice).toLocaleString("en-IN")})
                                    </span>
                                  ) : null}
                                </span>

                                {unit.configurationLabel && (
                                  <span className="inv-popup-meta">
                                    Config: <strong>{unit.configurationLabel}</strong>
                                  </span>
                                )}
                                {unit.carpet && (
                                  <span className="inv-popup-meta">
                                    Carpet: <strong>{unit.carpet} sq.ft</strong>
                                  </span>
                                )}
                                {unit.unitType && (
                                  <span className="inv-popup-meta">
                                    Type: <strong>{unit.unitType}</strong>
                                  </span>
                                )}
                                <span className="inv-popup-meta">
                                  Status: <strong className="text-uppercase">{unit.status}</strong>
                                </span>
                                <span className="inv-popup-meta">
                                  Lead: <strong>{unit.leadName || "None (Vacant)"}</strong>
                                </span>
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
          <div className="inv-modal-content" style={{ maxWidth: "600px" }} onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <div className="inv-modal-header-left">
                <div className="inv-modal-header-icon">
                  <FaInfoCircle />
                </div>
                <div>
                  <h5 className="inv-modal-title">
                    {String(previewUnit.name).startsWith("SH-") || String(previewUnit.unitType || "").toLowerCase().includes("commercial") ? "Shop" : "Flat"} {previewUnit.name} Specifications
                  </h5>
                  <p className="inv-modal-subtitle">
                    {selectedProject?.name || previewUnit.projectName || "Project"} &bull; {selectedTower?.name || previewUnit.towerName || "Tower"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="inv-modal-close-btn"
                onClick={() => setPreviewUnit(null)}
                aria-label="Close"
              >
                <FaTimes />
              </button>
            </div>

            <div className="inv-modal-body">
              {/* Highlight Price & Status Bar */}
              <div className="inv-unit-highlight-banner">
                <div className="d-flex align-items-center gap-2">
                  <span
                    className="badge text-uppercase"
                    style={{
                      backgroundColor:
                        previewUnit.status === "available"
                          ? "#10b981"
                          : previewUnit.status === "booked"
                          ? "#ef4444"
                          : previewUnit.status === "blocked"
                          ? "#f59e0b"
                          : "#64748b",
                      padding: "6px 12px",
                      fontSize: 12,
                      fontWeight: 700,
                      letterSpacing: "0.5px",
                    }}
                  >
                    Status: {previewUnit.status}
                  </span>
                  {previewUnit.status === "booked" && previewUnit.bookingDate && (
                    <span className="text-muted" style={{ fontSize: 12 }}>
                      Booked on {new Date(previewUnit.bookingDate).toLocaleDateString("en-IN")}
                    </span>
                  )}
                </div>

                <div className="text-end">
                  <span className="text-muted d-block" style={{ fontSize: 11, textTransform: "uppercase", fontWeight: 700 }}>
                    {previewUnit.agreementValue ? "Agreement Value" : "Base Price"}
                  </span>
                  <span className="text-primary fw-bold" style={{ fontSize: 18 }}>
                    {formatPrice(previewUnit.agreementValue || previewUnit.basePrice)}
                  </span>
                </div>
              </div>

              {/* Specifications Grid */}
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
                  <span className="inv-modal-val">
                    {Number(previewUnit.floor) === 0 || previewUnit.floor === "0" || previewUnit.floor === 0
                      ? "Ground Floor"
                      : `Floor ${previewUnit.floor}`}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Floor Plan</span>
                  <span className="inv-modal-val">{previewUnit.floorPlanName || "--"}</span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Unit Number</span>
                  <span className="inv-modal-val">
                    {String(previewUnit.name).startsWith("SH-") || String(previewUnit.unitType || "").toLowerCase().includes("commercial")
                      ? `Shop ${previewUnit.name}`
                      : `Flat ${previewUnit.name}`}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Unit Type / Config</span>
                  <span className="inv-modal-val">
                    {previewUnit.unitType || previewUnit.configurationLabel || "--"}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Carpet Area</span>
                  <span className="inv-modal-val">
                    {previewUnit.carpet ? `${previewUnit.carpet} sq.ft` : "--"}
                  </span>
                </div>
                <div className="inv-modal-field">
                  <span className="inv-modal-label">Facing</span>
                  <span className="inv-modal-val">{previewUnit.facing || "--"}</span>
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
                  <span className="inv-modal-label">Status</span>
                  <span className="inv-modal-val text-uppercase">
                    {previewUnit.status}
                  </span>
                </div>
              </div>

              {/* Purchaser / Lead Details Section */}
              {previewUnit.leadName || previewUnit.leadId ? (
                <div className="inv-lead-section">
                  <div className="inv-lead-header">
                    <div className="d-flex align-items-center gap-2">
                      <FaUserCheck className="text-primary" />
                      <strong style={{ fontSize: 13, color: "#0369a1", textTransform: "uppercase", letterSpacing: "0.5px" }}>
                        Purchaser / Assigned Lead
                      </strong>
                    </div>
                    {previewUnit.leadStage && (
                      <span className="badge bg-primary text-uppercase" style={{ fontSize: 10 }}>
                        {previewUnit.leadStage}
                      </span>
                    )}
                  </div>

                  <div className="inv-lead-info-row">
                    <div className="inv-lead-info-item">
                      <span className="inv-modal-label">Full Name</span>
                      <span className="inv-modal-val fw-bold" style={{ color: "#0f172a" }}>
                        {previewUnit.leadId ? (
                          <Link
                            to={`/details?leadId=${previewUnit.leadId}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-decoration-none text-primary"
                          >
                            {previewUnit.leadName || `Lead #${previewUnit.leadId}`}
                          </Link>
                        ) : (
                          previewUnit.leadName || `Lead #${previewUnit.leadId}`
                        )}
                      </span>
                    </div>

                    <div className="inv-lead-info-item">
                      <span className="inv-modal-label">Phone Number</span>
                      <span className="inv-modal-val" style={{ color: "#0f172a" }}>
                        {previewUnit.leadPhone ? (
                          <a href={`tel:${previewUnit.leadPhone}`} className="text-decoration-none text-dark d-inline-flex align-items-center gap-1">
                            <FaPhoneAlt size={11} className="text-muted" /> {previewUnit.leadPhone}
                          </a>
                        ) : (
                          "--"
                        )}
                      </span>
                    </div>

                    {previewUnit.leadEmail && (
                      <div className="inv-lead-info-item">
                        <span className="inv-modal-label">Email Address</span>
                        <span className="inv-modal-val" style={{ color: "#0f172a", fontSize: 13 }}>
                          <a href={`mailto:${previewUnit.leadEmail}`} className="text-decoration-none text-dark d-inline-flex align-items-center gap-1">
                            <FaEnvelope size={11} className="text-muted" /> {previewUnit.leadEmail}
                          </a>
                        </span>
                      </div>
                    )}

                    {previewUnit.leadId && (
                      <div className="inv-lead-info-item">
                        <span className="inv-modal-label">Lead Reference</span>
                        <span className="inv-modal-val text-muted" style={{ fontSize: 13 }}>
                          ID #{previewUnit.leadId}
                        </span>
                      </div>
                    )}
                  </div>

                  {previewUnit.leadId && (
                    <div className="inv-lead-actions">
                      <Link
                        to={`/details?leadId=${previewUnit.leadId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="btn btn-primary btn-sm d-inline-flex align-items-center gap-2 fw-semibold px-3 py-2"
                        style={{ borderRadius: 8, fontSize: 12.5 }}
                      >
                        <FaExternalLinkAlt size={12} />
                        <span>View Lead Details (Admin) &rarr;</span>
                      </Link>
                    </div>
                  )}
                </div>
              ) : (
                <div className="inv-vacant-banner">
                  <FaInfoCircle className="text-secondary" />
                  <span>This unit is currently vacant with no purchaser or lead assigned.</span>
                </div>
              )}
            </div>

            <div className="inv-modal-footer d-flex justify-content-between align-items-center">
              <button
                type="button"
                className="btn btn-outline-secondary btn-sm px-4 fw-semibold"
                style={{ borderRadius: 8 }}
                onClick={() => setPreviewUnit(null)}
              >
                Close Preview
              </button>

              {previewUnit.status === "booked" && (
                <span className="badge bg-danger p-2 px-3 text-uppercase fw-bold" style={{ borderRadius: 6 }}>
                  BOOKED
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Select or Create Lead Modal for Booking
          ========================================================================= */}
      {isLeadModalOpen && (
        <div className="inv-modal-overlay" onClick={() => setIsLeadModalOpen(false)}>
          <div className="inv-modal-content" style={{ maxWidth: "560px" }} onClick={(e) => e.stopPropagation()}>
            <div className="inv-modal-header">
              <div className="d-flex align-items-center gap-2">
                <FaUserFriends className="text-primary" />
                <h5 className="inv-modal-title">
                  Select Lead to Book {selectedBookingUnit?.name}
                </h5>
              </div>
              <button
                type="button"
                className="inv-modal-close-btn"
                onClick={() => setIsLeadModalOpen(false)}
              >
                <FaTimes />
              </button>
            </div>

            <div className="inv-modal-body">
              {leadError && <div className="alert alert-danger mb-3 py-2">{leadError}</div>}

              <div className="d-flex align-items-center justify-content-between mb-3">
                <span className="text-muted" style={{ fontSize: 13 }}>
                  {isCreatingNewLead ? "Create a new lead" : "Choose an existing customer lead"}
                </span>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setIsCreatingNewLead(!isCreatingNewLead);
                    setLeadError("");
                  }}
                >
                  {isCreatingNewLead ? "← Pick Existing Lead" : "+ Create New Lead"}
                </button>
              </div>

              {isCreatingNewLead ? (
                <form onSubmit={handleCreateNewLeadForBooking}>
                  <div className="mb-2">
                    <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>First Name *</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={newLeadForm.firstName}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, firstName: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>Last Name</label>
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      value={newLeadForm.lastName}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, lastName: e.target.value })}
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>Phone *</label>
                    <input
                      type="tel"
                      className="form-control form-control-sm"
                      value={newLeadForm.phone}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>Email</label>
                    <input
                      type="email"
                      className="form-control form-control-sm"
                      value={newLeadForm.email}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, email: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label mb-1" style={{ fontSize: 12, fontWeight: 600 }}>Source</label>
                    <select
                      className="form-select form-select-sm"
                      value={newLeadForm.source}
                      onChange={(e) => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                    >
                      <option value="Walk-in">Walk-in</option>
                      <option value="Website">Website</option>
                      <option value="Channel Partner">Channel Partner</option>
                      <option value="Portal">Portal</option>
                      <option value="Reference">Reference</option>
                    </select>
                  </div>

                  <div className="d-flex justify-content-end gap-2">
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() => setIsCreatingNewLead(false)}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary btn-sm fw-bold px-3"
                      disabled={savingLead}
                    >
                      {savingLead ? "Saving..." : "Create & Continue to Booking →"}
                    </button>
                  </div>
                </form>
              ) : (
                <div>
                  <div className="mb-3">
                    <input
                      type="text"
                      className="form-control form-control-sm"
                      placeholder="Search lead by name, phone, email..."
                      value={leadSearchQuery}
                      onChange={(e) => setLeadSearchQuery(e.target.value)}
                    />
                  </div>

                  {loadingLeads ? (
                    <div className="text-center py-4 text-muted">Loading leads...</div>
                  ) : filteredLeads.length === 0 ? (
                    <div className="text-center py-4 text-muted">
                      <p className="mb-2">No leads found matching your search.</p>
                      <button
                        type="button"
                        className="btn btn-sm btn-primary"
                        onClick={() => setIsCreatingNewLead(true)}
                      >
                        + Create New Lead
                      </button>
                    </div>
                  ) : (
                    <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                      <ul className="list-group list-group-flush">
                        {filteredLeads.slice(0, 50).map((l) => {
                          const name = `${l.firstName || ""} ${l.lastName || ""}`.trim() || l.name || l.companyName || `Lead #${l.id}`;
                          return (
                            <li
                              key={l.id}
                              className="list-group-item list-group-item-action d-flex align-items-center justify-content-between p-2"
                              style={{ cursor: "pointer" }}
                              onClick={() => handleSelectLeadForBooking(l)}
                            >
                              <div>
                                <strong style={{ fontSize: 13 }}>{name}</strong>
                                <div className="text-muted" style={{ fontSize: 11.5 }}>
                                  {l.phone || "No phone"} {l.email ? `· ${l.email}` : ""}
                                </div>
                              </div>
                              <button
                                type="button"
                                className="btn btn-sm btn-outline-primary py-1 px-3"
                                style={{ fontSize: 11.5, fontWeight: 600 }}
                              >
                                Select →
                              </button>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* =========================================================================
          Full CRM Booking Flow (UserBookingForm)
          ========================================================================= */}
      {isBookingOpen && (
        <UserBookingForm
          isOpen={isBookingOpen}
          bookingStepIndex={bookingStepIndex}
          bookingMessage={bookingMessage}
          bookingProjectMessage=""
          bookingForm={bookingForm}
          leadName={bookingForm.customerName}
          isSavingBooking={isSavingBooking}
          isLoadingBookingProject={false}
          bookingSuccess={isBookingSuccess}
          onClose={() => {
            setIsBookingOpen(false);
            if (selectedProject && selectedTower) {
              loadUnitsForTower(selectedProject, selectedTower);
            }
          }}
          onSubmit={handleSubmitBooking}
          onPrevious={() => setBookingStepIndex((prev) => Math.max(0, prev - 1))}
          onFieldChange={(field, value) => setBookingForm((prev) => ({ ...prev, [field]: value }))}
        />
      )}
    </div>
  );
};

export default InventoryDrilldownBrowser;
