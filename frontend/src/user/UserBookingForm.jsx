import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaArrowLeft,
  FaCheckCircle,
  FaEllipsisV,
  FaEnvelope,
  FaFileExcel,
  FaPen,
  FaPrint,
  FaRegFilePdf,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";
import { calculateBookingPricing, toSafeNumber } from "../utils/pricing";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const getAuthHeaders = () => {
  const token = localStorage.getItem("authToken");
  return token ? { Authorization: `Bearer ${token}` } : {};
};

const defaultSteps = [
  "Filter Project",
  "Select Unit",
  "Booking Confirmation",
];

const chipGroups = {
  unitType: ["Residential", "Commercial"],
};

const unitSeed = [
  { name: "3001", floor: 30, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "3002", floor: 30, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "3003", floor: 30, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "3004", floor: 30, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "3005", floor: 30, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "3006", floor: 30, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2901", floor: 29, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2902", floor: 29, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2903", floor: 29, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2904", floor: 29, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2905", floor: 29, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2906", floor: 29, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2801", floor: 28, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2802", floor: 28, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2804", floor: 28, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2805", floor: 28, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2806", floor: 28, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2803", floor: 28, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2701", floor: 27, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2702", floor: 27, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2703", floor: 27, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2704", floor: 27, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2705", floor: 27, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2706", floor: 27, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2601", floor: 26, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2602", floor: 26, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2603", floor: 26, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2604", floor: 26, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2605", floor: 26, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2606", floor: 26, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2501", floor: 25, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "unavailable" },
  { name: "2502", floor: 25, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2503", floor: 25, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2504", floor: 25, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2505", floor: 25, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2506", floor: 25, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 3, status: "available" },
  { name: "2401", floor: 24, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 2, status: "unavailable" },
  { name: "2402", floor: 24, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 2, status: "available" },
  { name: "2403", floor: 24, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 2, status: "selected" },
  { name: "2404", floor: 24, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 2, status: "available" },
  { name: "2405", floor: 24, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 2, status: "available" },
  { name: "2406", floor: 24, carpet: 1372, saleable: 2150, bedrooms: 3, bathrooms: 2, status: "available" },
];

const emptySelectedUnit = {
  ...unitSeed[0],
  name: "-",
  floor: "-",
  carpet: "-",
  saleable: "-",
  bedrooms: "-",
  bathrooms: "-",
  status: "available",
};

const paymentRows = [
  { name: "Agreement", milestone: "Agreement", percentage: 80, amount: 14326000, taxes: 0, tds: 0, grandTotal: 14326000 },
  { name: "Possession", milestone: "Possession", percentage: 20, amount: 3581500, taxes: 0, tds: 0, grandTotal: 3581500 },
];

const costCurrency = (value) =>
  `₹ ${Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  })}`;
const costNumber = (value) =>
  Number(value || 0).toLocaleString("en-IN", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    useGrouping: false,
  });
const toNumber = (value, fallback = 0) => {
  if (typeof value === "number") return Number.isFinite(value) ? value : fallback;
  const parsed = Number(String(value || "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(parsed) ? parsed : fallback;
};
const firstNumber = (...values) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== "") {
      return toNumber(value, 0);
    }
  }
  return 0;
};
const getFloorSortValue = (value) => {
  const number = Number(value);
  return Number.isNaN(number) ? Number.NEGATIVE_INFINITY : number;
};
const getUnitPositionSortValue = (unit) => {
  if (!unit) return 0;
  const explicitIndex = Number(unit.unitIndex ?? unit.position);
  if (Number.isFinite(explicitIndex) && explicitIndex > 0) {
    return explicitIndex;
  }
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
const getRateBasisArea = ({ rateBasis, carpet, builtupArea, saleable }) => {
  if (rateBasis === "On Built-up") return toNumber(builtupArea, 0);
  if (rateBasis === "On Saleable") return toNumber(saleable, 0);
  return toNumber(carpet, 0);
};
const calculateBasePriceForRateBasis = ({ baseRate, rateBasis, carpet, builtupArea, saleable }) => {
  const rate = toNumber(baseRate, 0);
  const area = getRateBasisArea({ rateBasis, carpet, builtupArea, saleable });
  if (!rate || !area) return 0;
  return rate * area;
};
const calculateCostNewValue = (row) => {
  const original = toNumber(row.originalValue, 0);
  const input = toNumber(row.inputField, 0);
  return row.costType === "AdHoc Cost" ? original + input : Math.max(original - input, 0);
};
const confirmCurrency = (value) => `₹ ${Number(value || 0).toLocaleString("en-IN")}`;
const formatDisplayDate = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleDateString("en-GB");
};
const isPlaceholderProjectName = (value) => {
  const normalized = String(value || "").trim().toLowerCase();
  return ["no", "none", "na", "n/a", "null", "undefined", "-"].includes(normalized);
};
const compactCurrency = (value) => {
  const amount = Number(value || 0);
  if (amount >= 10000000) {
    return `₹ ${(amount / 10000000).toFixed(1).replace(/\.0$/, "")}Cr (${amount.toLocaleString("en-IN")})`;
  }
  if (amount >= 100000) {
    return `₹ ${(amount / 100000).toFixed(1).replace(/\.0$/, "")}L (${amount.toLocaleString("en-IN")})`;
  }
  return confirmCurrency(amount);
};
const formatUnitPopupPrice = (value) => {
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
const bookingNumber = (value) => {
  const number = Number(String(value ?? "").replace(/[^\d.-]/g, ""));
  return Number.isFinite(number) && number >= 0 ? number : 0;
};
const emptyCustomCharge = () => ({
  id: `expense-${Date.now()}-${Math.random().toString(36).slice(2)}`,
  name: "",
  amount: "",
});
const escapeHtml = (value) =>
  String(value ?? "-")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");

const getProjectName = (project) =>
  project?.name || project?.projectName || project?.project_name || project?.title || "";

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  `User #${user?.id}`;

const sourceOptions = [
  "Channel Partner",
  "Walk-in",
  "Website",
  "Portal",
  "Reference",
  "Direct",
  "Digital",
  "Meta",
];

const normalizeBookingSource = (value) => {
  const source = String(value || "").trim();
  if (!source) return "Walk-in";
  if (source.toLowerCase() === "channel_partner") return "Channel Partner";
  return source;
};

const isChannelPartnerSource = (value) => normalizeBookingSource(value) === "Channel Partner";

const normalizeProjectTypeValue = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const matchesProjectTypeFilter = (unit, selectedType, project) => {
  if (!selectedType) return true;
  const selected = normalizeProjectTypeValue(selectedType);
  const projectType = normalizeProjectTypeValue(project?.projectType || unit?.projectType);
  const unitType = normalizeProjectTypeValue(unit?.unitType || unit?.type);

  if (projectType.includes("residential") && projectType.includes("commercial")) return true;
  if (projectType) return projectType === selected;
  if (unitType) return unitType === selected;
  return true;
};

const normalizeUnitPurpose = (value) =>
  String(value || "")
    .toLowerCase()
    .replace(/[_-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const isRehabUnit = (unit) =>
  normalizeUnitPurpose(unit?.propertyPurpose || unit?.unitStream || unit?.floorPlanUnitStream).includes("rehab");

const getImageSource = (value) => {
  if (!value) return "";

  if (typeof value === "string") return value;

  if (Array.isArray(value)) {
    return value.map(getImageSource).find(Boolean) || "";
  }

  if (typeof value === "object") {
    return (
      value.dataUrl ||
      value.url ||
      value.src ||
      value.preview ||
      value.path ||
      value.image ||
      value.file ||
      ""
    );
  }

  return "";
};

const resolveMediaUrl = (value) => {
  const source = getImageSource(value);
  if (!source) return "";
  if (/^(https?:|data:|blob:)/i.test(source)) return source;
  if (source.startsWith("/uploads/")) return `${API_URL}${source}`;
  if (source.startsWith("uploads/")) return `${API_URL}/${source}`;
  return source;
};

const parseBhkNumber = (text) => {
  if (!text) return "";
  const str = String(text).trim();
  const match = str.match(/(\d+(\.\d+)?)\s*(bhk|bed|bedroom|rk)/i);
  if (match) return match[1];
  const numberMatch = str.match(/^(\d+)\s*bhk$/i);
  if (numberMatch) return numberMatch[1];
  const wordMatch = str.match(/\b(one|two|three|four|five|six)\s*(bhk|bed|bedroom)/i);
  if (wordMatch) {
    const map = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6" };
    return map[wordMatch[1].toLowerCase()] || "";
  }
  const standaloneMatch = str.match(/\b(\d+)\s*b\b/i);
  if (standaloneMatch) return standaloneMatch[1];
  return "";
};

const parseBathroomNumber = (text) => {
  if (!text) return "";
  const str = String(text).trim();
  const match = str.match(/(\d+(\.\d+)?)\s*(t|bath|bathroom|washroom|toilet)s?\b/i);
  if (match) return match[1];
  const wordMatch = str.match(/\b(one|two|three|four|five|six)\s*(t|bath|bathroom|washroom|toilet)s?\b/i);
  if (wordMatch) {
    const map = { one: "1", two: "2", three: "3", four: "4", five: "5", six: "6" };
    return map[wordMatch[1].toLowerCase()] || "";
  }
  return "";
};

const flattenDatabaseUnits = (unitGroups = []) =>
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

      const rawBedrooms =
        unit?.bedrooms ??
        unit?.bhk ??
        floorPlan?.bedrooms ??
        group?.bedrooms ??
        directUnit?.bedrooms ??
        "";

      const parsedBedrooms = parseBhkNumber(
        unit?.configurationLabel ||
        floorPlan?.configurationLabel ||
        group?.configurationLabel ||
        floorPlan?.planName ||
        floorPlan?.name ||
        group?.name ||
        unit?.name ||
        unit?.type ||
        floorPlan?.type ||
        group?.type ||
        unit?.description ||
        group?.description ||
        directUnit?.description
      );

      const bedroomsVal =
        rawBedrooms !== "" && rawBedrooms !== "-" && rawBedrooms !== null && rawBedrooms !== undefined
          ? String(rawBedrooms)
          : (parsedBedrooms || "");

      const rawBathrooms =
        unit?.bathrooms ??
        floorPlan?.bathrooms ??
        group?.bathrooms ??
        directUnit?.bathrooms ??
        "";

      const parsedBathrooms = parseBathroomNumber(
        unit?.configurationLabel ||
        floorPlan?.configurationLabel ||
        group?.configurationLabel ||
        floorPlan?.planName ||
        floorPlan?.name ||
        group?.name ||
        unit?.description ||
        group?.description ||
        directUnit?.description ||
        unit?.type ||
        floorPlan?.type
      );

      const bathroomsVal =
        rawBathrooms !== "" && rawBathrooms !== "-" && rawBathrooms !== null && rawBathrooms !== undefined
          ? String(rawBathrooms)
          : (parsedBathrooms || (bedroomsVal ? String(bedroomsVal) : ""));

      const configLabel =
        unit?.configurationLabel ||
        floorPlan?.configurationLabel ||
        group?.configurationLabel ||
        floorPlan?.planName ||
        floorPlan?.name ||
        (bedroomsVal && bedroomsVal !== "-" ? `${bedroomsVal} BHK` : "");

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

      return {
        id: unit?.id || group?.id || unit?.name,
        groupId: group?.id || directUnit?.id || unit?.unitId,
        unitItemId: unit?.id || "",
        unitId: group?.id || directUnit?.id || unit?.unitId || "",
        name: unit?.name || group?.name || `Unit ${index + 1}`,
        floor: unit?.floor || floorPlan?.name || group?.floor || "-",
        unitIndex: unit?.unitIndex,
        carpet: carpetVal !== "-" ? carpetVal : "",
        builtupArea: builtupVal !== "-" ? builtupVal : "",
        saleable: saleableVal !== "-" ? saleableVal : "",
        rateBasis: floorPlan?.rateBasis || group?.rateBasis || "On Carpet",
        bedrooms: bedroomsVal !== "-" ? bedroomsVal : "",
        bathrooms: bathroomsVal !== "-" ? bathroomsVal : "",
        configurationLabel: configLabel,
        facing: facingVal,
        kitchen: floorPlan?.kitchenType ?? group?.kitchenType ?? "-",
        baseRate: baseRateVal,
        basePrice: basePriceVal,
        floorRiseEnabled: unit?.pricing?.floorRiseEnabled ?? floorPlan?.floorRiseEnabled ?? false,
        floorRise: unit?.pricing?.floorRiseCalculatedAmount ?? unit?.pricing?.floorRiseAmount ?? unit?.floorRiseAmount ?? unit?.floorRise ?? group?.floorRise ?? "",
        floorRiseRate: unit?.pricing?.floorRisePerSqft ?? unit?.floorRisePerSqft ?? floorPlan?.floorRisePerSqft ?? "",
        floorRiseSteps: unit?.pricing?.riseSteps ?? unit?.pricing?.floorRiseSteps ?? unit?.floorRiseSteps ?? "",
        riseFromFloor: unit?.pricing?.riseFromFloor ?? floorPlan?.baseFloorForFloorRise ?? "",
        floorRiseCalculatedAmount: unit?.pricing?.floorRiseCalculatedAmount ?? unit?.pricing?.floorRiseAmount ?? "",
        calculatedUnitPrice: unit?.pricing?.calculatedUnitPrice ?? unit?.pricing?.finalPrice ?? "",
        reraArea: unit?.pricing?.reraArea ?? unit?.reraArea ?? carpetVal ?? "",
        pricing: unit?.pricing || null,
        guidelineValue: unit?.guidelineValue || group?.guidelineValue || unit?.guideline_value || group?.guideline_value || "",
        developmentInvoice: unit?.developmentInvoice || group?.developmentInvoice || unit?.development_invoice || group?.development_invoice || "",
        agreementValue: unit?.agreementValue || group?.agreementValue || unit?.agreement_value || group?.agreement_value || "",
        totalPrice: unit?.totalPrice || group?.totalPrice || unit?.total_price || group?.total_price || "",
        propertyPurpose:
          unit?.propertyPurpose ||
          group?.propertyPurpose ||
          directUnit?.propertyPurpose ||
          floorPlan?.unitStream ||
          "",
        unitStream: floorPlan?.unitStream || group?.unitStream || "",
        legalDocumentationFee:
          unit?.legalDocumentationFee || group?.legalDocumentationFee || unit?.legal_documentation_fee || group?.legal_documentation_fee || "",
        electricityInfrastructureCharges:
          unit?.electricityInfrastructureCharges ||
          group?.electricityInfrastructureCharges ||
          unit?.electricity_infrastructure_charges ||
          group?.electricity_infrastructure_charges ||
          "",
        khataRegistrationCharges:
          unit?.khataRegistrationCharges || group?.khataRegistrationCharges || unit?.khata_registration_charges || group?.khata_registration_charges || "",
        maintenanceAdvance: unit?.maintenanceAdvance || group?.maintenanceAdvance || unit?.maintenance_advance || group?.maintenance_advance || "",
        stampDuty: unit?.stampDuty || group?.stampDuty || unit?.stamp_duty || group?.stamp_duty || "",
        projectId: group?.project?.id || directUnit?.project?.id || floorPlan?.project?.id || group?.projectId || "",
        projectName: getProjectName(group?.project || directUnit?.project || floorPlan?.project),
        towerId: group?.tower?.id || directUnit?.tower?.id || floorPlan?.tower?.id || group?.towerId || "",
        towerName: group?.tower?.name || directUnit?.tower?.name || floorPlan?.tower?.name || group?.towerName || "Tower",
        type: floorPlan?.type || group?.type || "",
        projectType: group?.project?.projectType || group?.projectType || "",
        image: resolveMediaUrl(
          unit?.image ||
          unit?.unitImage ||
          unit?.images ||
          group?.image ||
          group?.unitImage ||
          group?.images ||
          floorPlan?.floorPlanImages ||
          group?.floor?.floorPlanImages
        ),
        status:
          String(unit?.status || group?.status || unit?.unitStatus || group?.unitStatus || "")
            .toLowerCase()
            .replace(/\s+/g, "-") || "available",
      };
    });
  });

const normalizeUnitStatus = (status, unit) => {
  if (isRehabUnit(unit)) return "rehab";

  const value = String(status || "available").toLowerCase();
  if (["booked", "sold", "unavailable", "registered", "possession", "possession_given"].includes(value)) return "booked";
  if (["held", "hold"].includes(value)) return "held";
  if (["blocked", "block"].includes(value)) return "blocked";
  if (value === "refuge") return "refuge";
  if (value === "investor") return "investor";
  if (value === "selected") return "selected";
  return "available";
};

const UserBookingForm = ({
  isOpen,
  bookingSteps = defaultSteps,
  bookingStepIndex = 0,
  bookingMessage,
  bookingProjectMessage,
  bookingForm = {},
  leadName,
  isSavingBooking,
  isLoadingBookingProject,
  bookingSuccess = false,
  onClose,
  onSubmit,
  onPrevious,
  onFieldChange,
}) => {
  const [interestedUnits] = useState(new Set());
  const [filters, setFilters] = useState({
    unitType: "",
  });
  const [completionActionMessage, setCompletionActionMessage] = useState("");
  const [bookingProjects, setBookingProjects] = useState([]);
  const [projectTowers, setProjectTowers] = useState([]);
  const [databaseUnitGroups, setDatabaseUnitGroups] = useState([]);
  const [channelPartners, setChannelPartners] = useState([]);
  const [unitBookingDetails, setUnitBookingDetails] = useState(null);
  const [isLoadingUnitDetails, setIsLoadingUnitDetails] = useState(false);
  const [unitDetailsMessage, setUnitDetailsMessage] = useState("");
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
  const [projectSearch, setProjectSearch] = useState("");
  const [editableCostRows, setEditableCostRows] = useState([]);
  const [selectedTowerId, setSelectedTowerId] = useState("");
  const projectSelectRef = useRef(null);
  const selectedProjectId = bookingForm.projectId ? String(bookingForm.projectId) : "";
  const selectedProjectName = String(bookingForm.projectDetails || "").toLowerCase();

  useEffect(() => {
    if (!isOpen) return undefined;
    const previousBodyOverflow = document.body.style.overflow;
    const previousHtmlOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = "hidden";
    document.documentElement.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousBodyOverflow;
      document.documentElement.style.overflow = previousHtmlOverflow;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isProjectMenuOpen) return undefined;

    const closeProjectMenu = (event) => {
      if (projectSelectRef.current?.contains(event.target)) return;
      setIsProjectMenuOpen(false);
    };

    document.addEventListener("mousedown", closeProjectMenu);
    return () => document.removeEventListener("mousedown", closeProjectMenu);
  }, [isProjectMenuOpen]);

  useEffect(() => {
    if (!isOpen) return undefined;

    let isMounted = true;

    const loadBookingCatalog = async () => {
      setIsLoadingCatalog(true);

      try {
        const [projectsResponse, unitsResponse, usersResponse] = await Promise.all([
          fetch(`${API_URL}/projects`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/unit?limit=1000`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/users/by-role?role=CHANNEL_PARTNER`, { headers: getAuthHeaders() }),
        ]);

        const projectsResult = projectsResponse.ok ? await projectsResponse.json() : [];
        const unitsResult = unitsResponse.ok ? await unitsResponse.json() : {};
        const usersResult = usersResponse.ok ? await usersResponse.json() : {};

        if (!isMounted) return;

        setBookingProjects(Array.isArray(projectsResult) ? projectsResult : projectsResult?.data || []);
        setDatabaseUnitGroups(Array.isArray(unitsResult) ? unitsResult : unitsResult?.items || unitsResult?.data || []);
        setChannelPartners(Array.isArray(usersResult) ? usersResult : usersResult?.data || []);
      } catch (error) {
        console.error("Unable to load booking project catalog:", error);
        if (isMounted) {
          setBookingProjects([]);
          setDatabaseUnitGroups([]);
          setChannelPartners([]);
        }
      } finally {
        if (isMounted) setIsLoadingCatalog(false);
      }
    };

    loadBookingCatalog();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen || !selectedProjectId) return undefined;

    let isMounted = true;

    const loadProjectInventory = async () => {
      setIsLoadingCatalog(true);
      setSelectedTowerId("");

      try {
        const [towerResponse, unitResponse] = await Promise.all([
          fetch(`${API_URL}/tower/list?projectId=${selectedProjectId}`, { headers: getAuthHeaders() }),
          fetch(`${API_URL}/unit?limit=1000&projectId=${selectedProjectId}`, { headers: getAuthHeaders() }),
        ]);

        const towerResult = towerResponse.ok ? await towerResponse.json() : [];
        const unitResult = unitResponse.ok ? await unitResponse.json() : {};

        if (!isMounted) return;

        setProjectTowers(
          Array.isArray(towerResult)
            ? towerResult
            : Array.isArray(towerResult?.data)
              ? towerResult.data
              : Array.isArray(towerResult?.towers)
                ? towerResult.towers
                : []
        );
        setDatabaseUnitGroups(Array.isArray(unitResult) ? unitResult : unitResult?.items || unitResult?.data || []);
      } catch (error) {
        console.error("Unable to load project towers and units:", error);
        if (isMounted) {
          setProjectTowers([]);
          setDatabaseUnitGroups([]);
        }
      } finally {
        if (isMounted) setIsLoadingCatalog(false);
      }
    };

    loadProjectInventory();

    return () => {
      isMounted = false;
    };
  }, [isOpen, selectedProjectId]);

  const databaseUnits = useMemo(() => flattenDatabaseUnits(databaseUnitGroups), [databaseUnitGroups]);
  const catalogUnits = useMemo(() => {
    const realUnits = databaseUnits.filter((unit) => {
      if (selectedProjectId) return String(unit.projectId) === selectedProjectId;
      if (selectedProjectName) return String(unit.projectName || "").toLowerCase() === selectedProjectName;
      return true;
    });

    return realUnits;
  }, [databaseUnits, selectedProjectId, selectedProjectName]);
  const towerOptions = useMemo(
    () => {
      if (projectTowers.length) {
        return projectTowers.map((tower) => ({
          id: String(tower.id),
          name: tower.name || `Tower ${tower.id}`,
        }));
      }

      const towerMap = new Map();
      catalogUnits.forEach((unit) => {
        const id = String(unit.towerId || unit.towerName || "Tower");
        if (!towerMap.has(id)) {
          towerMap.set(id, {
            id,
            name: unit.towerName || "Tower",
          });
        }
      });

      return Array.from(towerMap.values());
    },
    [catalogUnits, projectTowers]
  );
  const filteredCatalogUnits = useMemo(() => {
    const selectedProject = bookingProjects.find((project) => String(project.id) === selectedProjectId);

    return catalogUnits.filter((unit) => {
      const towerMatches =
        !selectedTowerId ||
        String(unit.towerId || unit.towerName || "Tower") === selectedTowerId;
      const typeMatches = matchesProjectTypeFilter(unit, filters.unitType, selectedProject);

      return towerMatches && typeMatches;
    });
  }, [bookingProjects, catalogUnits, filters.unitType, selectedProjectId, selectedTowerId]);
  const selectedTowerName =
    towerOptions.find((tower) => String(tower.id) === String(selectedTowerId))?.name || "";

  const selectedUnit = useMemo(() => {
    const catalogUnit =
      filteredCatalogUnits.find((unit) => String(unit.unitItemId || unit.id) === String(bookingForm.unitItemId)) ||
      filteredCatalogUnits.find((unit) => unit.name === bookingForm.unit) ||
      catalogUnits.find((unit) => String(unit.unitItemId || unit.id) === String(bookingForm.unitItemId)) ||
      catalogUnits.find((unit) => unit.name === bookingForm.unit) ||
      databaseUnits.find((unit) => String(unit.unitItemId || unit.id) === String(bookingForm.unitItemId)) ||
      databaseUnits.find((unit) => unit.name === bookingForm.unit) ||
      emptySelectedUnit;

    const rawBedrooms =
      unitBookingDetails?.floorPlan?.bedrooms ??
      unitBookingDetails?.unit?.bedrooms ??
      catalogUnit.bedrooms ??
      "";

    const parsedBedrooms = parseBhkNumber(
      unitBookingDetails?.floorPlan?.configurationLabel ||
      unitBookingDetails?.floorPlan?.name ||
      unitBookingDetails?.floorPlan?.type ||
      catalogUnit.configurationLabel ||
      catalogUnit.name ||
      catalogUnit.type ||
      bookingForm.unit
    );

    const resolvedBedrooms =
      rawBedrooms !== "" && rawBedrooms !== "-" && rawBedrooms !== null && rawBedrooms !== undefined
        ? String(rawBedrooms)
        : (parsedBedrooms ? String(parsedBedrooms) : "-");

    const rawBathrooms =
      unitBookingDetails?.floorPlan?.bathrooms ??
      unitBookingDetails?.unit?.bathrooms ??
      catalogUnit.bathrooms ??
      "";

    const parsedBathrooms = parseBathroomNumber(
      unitBookingDetails?.floorPlan?.configurationLabel ||
      unitBookingDetails?.floorPlan?.name ||
      unitBookingDetails?.floorPlan?.type ||
      catalogUnit.configurationLabel ||
      catalogUnit.name
    );

    const resolvedBathrooms =
      rawBathrooms !== "" && rawBathrooms !== "-" && rawBathrooms !== null && rawBathrooms !== undefined
        ? String(rawBathrooms)
        : (parsedBathrooms ? String(parsedBathrooms) : (resolvedBedrooms !== "-" ? String(resolvedBedrooms) : "-"));

    if (!unitBookingDetails) {
      return {
        ...catalogUnit,
        bedrooms: resolvedBedrooms,
        bathrooms: resolvedBathrooms,
      };
    }

    return {
      ...catalogUnit,
      id: unitBookingDetails.unit?.unitItemId || catalogUnit.id,
      unitItemId: unitBookingDetails.unit?.unitItemId || catalogUnit.unitItemId,
      unitId: unitBookingDetails.unit?.id || catalogUnit.unitId,
      name: unitBookingDetails.unit?.name || catalogUnit.name,
      floor: unitBookingDetails.unit?.floorNumber ?? catalogUnit.floor,
      status: unitBookingDetails.unit?.status || catalogUnit.status,
      projectId: unitBookingDetails.project?.id || catalogUnit.projectId,
      projectName: unitBookingDetails.project?.name || catalogUnit.projectName,
      towerId: unitBookingDetails.tower?.id || catalogUnit.towerId,
      towerName: unitBookingDetails.tower?.name || catalogUnit.towerName,
      image: resolveMediaUrl(unitBookingDetails.floorPlan?.floorPlanImages) || catalogUnit.image,
      bedrooms: resolvedBedrooms,
      bathrooms: resolvedBathrooms,
      kitchen: unitBookingDetails.floorPlan?.kitchen ?? catalogUnit.kitchen,
      carpet: unitBookingDetails.floorPlan?.reraArea ?? unitBookingDetails.floorPlan?.carpet ?? catalogUnit.carpet,
      reraArea: unitBookingDetails.floorPlan?.reraArea ?? catalogUnit.reraArea,
      saleable: unitBookingDetails.floorPlan?.saleableArea ?? catalogUnit.saleable,
      rateBasis: unitBookingDetails.floorPlan?.rateBasis || catalogUnit.rateBasis,
      baseRate: unitBookingDetails.pricing?.baseRate ?? catalogUnit.baseRate,
      floorRiseEnabled: unitBookingDetails.pricing?.floorRiseEnabled ?? catalogUnit.floorRiseEnabled,
      floorRiseRate: unitBookingDetails.pricing?.floorRiseRate ?? catalogUnit.floorRiseRate,
      floorRiseSteps: unitBookingDetails.pricing?.riseSteps ?? catalogUnit.floorRiseSteps,
      riseFromFloor: unitBookingDetails.pricing?.riseFromFloor ?? catalogUnit.riseFromFloor,
      floorRiseCalculatedAmount: unitBookingDetails.pricing?.floorRiseAmount ?? catalogUnit.floorRiseCalculatedAmount,
      effectiveRate: unitBookingDetails.pricing?.effectiveRate ?? catalogUnit.effectiveRate,
    };
  }, [bookingForm.unit, bookingForm.unitItemId, catalogUnits, databaseUnits, filteredCatalogUnits, unitBookingDetails]);

  useEffect(() => {
    const resolvedUnit =
      catalogUnits.find((u) => String(u.unitItemId || u.id) === String(bookingForm.unitItemId)) ||
      catalogUnits.find((u) => u.name === bookingForm.unit) ||
      databaseUnits.find((u) => String(u.unitItemId || u.id) === String(bookingForm.unitItemId)) ||
      databaseUnits.find((u) => u.name === bookingForm.unit);

    const unitItemId = bookingForm.unitItemId || resolvedUnit?.unitItemId || resolvedUnit?.id || bookingForm.unit;
    if (!isOpen || !unitItemId) {
      setUnitBookingDetails(null);
      setUnitDetailsMessage("");
      return undefined;
    }

    let isMounted = true;
    setUnitBookingDetails(null);
    setUnitDetailsMessage("");
    setIsLoadingUnitDetails(true);

    const queryParams = new URLSearchParams();
    if (selectedProjectId) queryParams.set("projectId", selectedProjectId);
    if (bookingForm.unit) queryParams.set("unit", bookingForm.unit);
    const queryString = queryParams.toString() ? `?${queryParams.toString()}` : "";

    fetch(`${API_URL}/unit/${encodeURIComponent(unitItemId)}/booking-details${queryString}`, { headers: getAuthHeaders() })
      .then(async (response) => {
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || "Unit details could not be loaded.");
        return result?.data;
      })
      .then((details) => {
        if (!isMounted) return;
        setUnitBookingDetails(details || null);
        const baseRate = details?.pricing?.baseRate;
        updateField("baseRate", baseRate ?? "");
        updateField("closingBaseRate", bookingForm.closingBaseRate ?? baseRate ?? "");
        updateField("closingRate", bookingForm.closingRate ?? bookingForm.closingBaseRate ?? baseRate ?? "");
        updateField("carpetArea", details?.floorPlan?.reraArea ?? details?.floorPlan?.carpet ?? "");
        updateField("reraArea", details?.floorPlan?.reraArea ?? "");
        updateField("saleableArea", details?.floorPlan?.saleableArea ?? "");
        updateField("floorRiseRate", details?.pricing?.floorRiseRate ?? 0);
        updateField("floorRiseSteps", details?.pricing?.riseSteps ?? 0);
        updateField("riseFromFloor", details?.pricing?.riseFromFloor ?? "");
        updateField("floorRiseCalculatedAmount", details?.pricing?.floorRiseAmount ?? 0);
        updateField("floorRiseEnabled", details?.pricing?.floorRiseEnabled ? "Yes" : "No");
      })
      .catch((error) => {
        if (!isMounted) return;
        console.warn("Booking details load warning:", error.message);
        if (!resolvedUnit) {
          setUnitDetailsMessage(error.message || "Unit details could not be loaded.");
        }
      })
      .finally(() => {
        if (isMounted) setIsLoadingUnitDetails(false);
      });

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, bookingForm.unitItemId, bookingForm.unit, selectedProjectId]);

  useEffect(() => {
    if (!selectedTowerId) return;
    if (towerOptions.some((tower) => String(tower.id) === String(selectedTowerId))) return;
    setSelectedTowerId("");
  }, [selectedTowerId, towerOptions]);

  useEffect(() => {
    setEditableCostRows([]);
  }, [bookingForm.customerName, bookingForm.phone, bookingForm.projectId, bookingForm.projectDetails, bookingForm.unit, bookingForm.unitId]);

  const updateField = (name, value) => {
    if (!onFieldChange) return;
    onFieldChange({ target: { name, value } });
  };

  const selectProjectOption = (value) => {
    setIsProjectMenuOpen(false);
    setProjectSearch("");

    if (value === "__lead_project__") {
      updateField("projectId", "");
      return;
    }

    const project = bookingProjects.find((item) => String(item.id) === String(value));
    updateField("projectId", value);
    updateField("projectDetails", getProjectName(project));
    updateField("unit", "");
    updateField("unitId", "");
    updateField("unitItemId", "");
    setSelectedTowerId("");
  };

  const selectUnit = (unit) => {
    if (["booked", "blocked", "refuge", "investor", "rehab", "held"].includes(normalizeUnitStatus(unit.status, unit))) return;
    setUnitBookingDetails(null);
    setUnitDetailsMessage("");
    updateField("unit", unit.name);
    updateField("unitId", unit.unitId || unit.groupId || "");
    updateField("unitItemId", unit.unitItemId || unit.id || "");
    updateField("saleableArea", unit.saleable);
    updateField("carpetArea", unit.carpet);
    updateField("builtupArea", unit.builtupArea || "");
    updateField("rateBasis", unit.rateBasis || "On Carpet");
    const nextBaseRate = unit.baseRate ?? "";
    updateField("baseRate", nextBaseRate);
    updateField("closingBaseRate", nextBaseRate ?? "");
    updateField("closingRate", nextBaseRate ?? "");
    updateField("floorRise", unit.floorRise || "");
    updateField("floorRiseEnabled", unit.floorRiseEnabled ? "Yes" : "No");
    updateField("floorRiseRate", unit.floorRiseRate || "");
    updateField("floorRiseSteps", unit.floorRiseSteps ?? "");
    updateField("riseFromFloor", unit.riseFromFloor || "");
    updateField("floorRiseCalculatedAmount", unit.floorRiseCalculatedAmount || unit.floorRise || "");
    updateField("calculatedUnitPrice", unit.calculatedUnitPrice || unit.basePrice || "");
    updateField("reraArea", unit.reraArea ?? unit.carpet ?? "");
    const calculatedBasePrice =
      unit.basePrice ||
      unit.pricing?.finalPrice ||
      calculateBasePriceForRateBasis({
        baseRate: unit.baseRate || bookingForm.baseRate,
        rateBasis: unit.rateBasis || bookingForm.rateBasis,
        carpet: unit.carpet,
        builtupArea: unit.builtupArea,
        saleable: unit.saleable,
      }) ||
      bookingForm.basePrice ||
      "";
    updateField("basePrice", calculatedBasePrice);
    updateField("agreementValue", "");
    updateField("totalPrice", "");
  };

  const hasProjectSelected = Boolean(bookingForm.projectId || (bookingForm.projectDetails && !isPlaceholderProjectName(bookingForm.projectDetails)));
  const hasUnitSelected = Boolean(bookingForm.unit && bookingForm.unit !== "-");
  const hasCustomerInfo = Boolean((bookingForm.customerName && String(bookingForm.customerName).trim()) || (leadName && leadName !== "Selected lead"));

  const isSubmitDisabled =
    isSavingBooking ||
    isLoadingBookingProject ||
    (bookingStepIndex === 0 && !hasProjectSelected) ||
    (bookingStepIndex === 1 && !hasUnitSelected) ||
    (bookingStepIndex === 2 && !hasCustomerInfo);

  const allFloorGroups = useMemo(() => {
    const groups = new Map();

    filteredCatalogUnits.forEach((unit) => {
      const floor = unit.floor ?? "-";
      if (!groups.has(floor)) {
        groups.set(floor, {
          floor,
          units: [],
        });
      }
      groups.get(floor).units.push(unit);
    });

    return Array.from(groups.values())
      .sort((a, b) => {
        const floorDiff = getFloorSortValue(b.floor) - getFloorSortValue(a.floor);
        if (floorDiff) return floorDiff;
        return String(b.floor).localeCompare(String(a.floor));
      })
      .map((group) => ({
        ...group,
        units: group.units.slice().sort((a, b) => {
          const positionDiff = getUnitPositionSortValue(a) - getUnitPositionSortValue(b);
          if (positionDiff) return positionDiff;
          return String(a.name || "").localeCompare(String(b.name || ""), undefined, { numeric: true });
        }),
      }));
  }, [filteredCatalogUnits]);
  const quotationName = [
    bookingForm.projectDetails || selectedUnit.projectName,
    selectedTowerName || selectedUnit.towerName,
    selectedUnit.name,
  ].filter(Boolean).join(" - ");
  const baseRateValue = toSafeNumber(bookingForm.baseRate ?? selectedUnit.baseRate, 0);
  const closingBaseRateValue = toSafeNumber(bookingForm.closingRate ?? bookingForm.closingBaseRate ?? selectedUnit.closingBaseRate ?? baseRateValue, baseRateValue);
  const saleableValue = toNumber(bookingForm.saleableArea, toNumber(selectedUnit.saleable, 0));
  const carpetValue = toNumber(bookingForm.carpetArea, toNumber(selectedUnit.carpet, 0));
  const builtupValue = toNumber(bookingForm.builtupArea, toNumber(selectedUnit.builtupArea, 0));
  const rateBasisValue = bookingForm.rateBasis || selectedUnit.rateBasis || "On Carpet";
  const floorRiseRateValue = firstNumber(bookingForm.floorRiseRate, selectedUnit.floorRiseRate, 0);
  const floorRiseStepsValue = firstNumber(bookingForm.floorRiseSteps, selectedUnit.floorRiseSteps, 0);
  const riseFromFloorValue = firstNumber(bookingForm.riseFromFloor, selectedUnit.riseFromFloor, 0);
  const reraAreaValue = firstNumber(bookingForm.reraArea, selectedUnit.reraArea, carpetValue, 0);
  const floorRisePerSqftTotal = floorRiseRateValue * floorRiseStepsValue;
  const floorRiseValue = (reraAreaValue && floorRisePerSqftTotal)
    ? (reraAreaValue * floorRisePerSqftTotal)
    : firstNumber(bookingForm.floorRise, selectedUnit.floorRise, 0);
  const effectiveRate = toSafeNumber(selectedUnit.effectiveRate, baseRateValue + floorRiseRateValue);
  const fallbackBasePriceValue = reraAreaValue ? (closingBaseRateValue * reraAreaValue) : calculateBasePriceForRateBasis({
    baseRate: closingBaseRateValue,
    rateBasis: rateBasisValue,
    carpet: carpetValue,
    builtupArea: builtupValue,
    saleable: saleableValue,
  });
  const basePriceValue = (reraAreaValue && effectiveRate)
    ? (reraAreaValue * effectiveRate)
    : (firstNumber(bookingForm.basePrice, selectedUnit.basePrice) || fallbackBasePriceValue);
  const guidelineValue = firstNumber(bookingForm.guidelineValue, selectedUnit.guidelineValue);
  const developmentInvoiceValue = firstNumber(bookingForm.developmentInvoice, selectedUnit.developmentInvoice);
  const agreementOriginalValue =
    firstNumber(bookingForm.agreementValue, selectedUnit.agreementValue) ||
    basePriceValue + guidelineValue + developmentInvoiceValue;
  const defaultCostRows = useMemo(
    () => [
      { type: "section", serial: "1.", name: "Basic Details" },
      { serial: "1.a", name: "Base Rate", originalValue: baseRateValue, costType: "Discount", inputField: 0, highlight: true },
      { serial: "1.b", name: "Floor Rise Rate", originalValue: floorRiseRateValue, costType: "Discount", inputField: 0 },
      { serial: "1.c", name: "Floor Rise Steps", originalValue: floorRiseStepsValue, costType: "Discount", inputField: 0 },
      { serial: "1.d", name: "Floor Rise Amount", originalValue: floorRiseValue, costType: "Discount", inputField: 0 },
      { type: "section", serial: "2.", name: "Agreement Value Details" },
      { serial: "2.a", name: "Base Price", originalValue: basePriceValue, costType: "Discount", inputField: 0 },
      { serial: "2.b", name: "Guideline Value", originalValue: guidelineValue, costType: "Discount", inputField: 0 },
      { serial: "2.c", name: "Development Invoice", originalValue: developmentInvoiceValue, costType: "Discount", inputField: 0 },
      { serial: "2.d", name: "Agreement Value", originalValue: agreementOriginalValue, costType: "Discount", inputField: 0, highlight: true },
      { type: "section", serial: "3.", name: "Additional Details" },
      {
        serial: "3.a",
        name: "Legal Documentation Fee",
        originalValue: firstNumber(bookingForm.legalDocumentationFee, selectedUnit.legalDocumentationFee),
        costType: "Discount",
        inputField: 0,
      },
      {
        serial: "3.b",
        name: "Electricity Infrastructure Charges",
        originalValue: firstNumber(bookingForm.electricityInfrastructureCharges, selectedUnit.electricityInfrastructureCharges),
        costType: "Discount",
        inputField: 0,
      },
      {
        serial: "3.c",
        name: "Khata Registration Charges",
        originalValue: firstNumber(bookingForm.khataRegistrationCharges, selectedUnit.khataRegistrationCharges),
        costType: "Discount",
        inputField: 0,
      },
      {
        serial: "3.d",
        name: "Maintenance Advance",
        originalValue: firstNumber(bookingForm.maintenanceAdvance, selectedUnit.maintenanceAdvance),
        costType: "Discount",
        inputField: 0,
      },
      {
        serial: "3.e",
        name: "Stamp Duty",
        originalValue: firstNumber(bookingForm.stampDuty, selectedUnit.stampDuty),
        costType: "Discount",
        inputField: 0,
      },
      { type: "section", serial: "4.", name: "Total Price Details" },
      {
        serial: "4.a",
        name: "Total Price",
        originalValue: firstNumber(bookingForm.totalPrice, selectedUnit.totalPrice) || agreementOriginalValue,
        costType: "Discount",
        inputField: 0,
        highlight: true,
      },
    ],
    [
      agreementOriginalValue,
      basePriceValue,
      baseRateValue,
      bookingForm.electricityInfrastructureCharges,
      bookingForm.khataRegistrationCharges,
      bookingForm.legalDocumentationFee,
      bookingForm.maintenanceAdvance,
      bookingForm.stampDuty,
      bookingForm.totalPrice,
      developmentInvoiceValue,
      floorRiseValue,
      floorRiseRateValue,
      floorRiseStepsValue,
      guidelineValue,
      selectedUnit.electricityInfrastructureCharges,
      selectedUnit.khataRegistrationCharges,
      selectedUnit.legalDocumentationFee,
      selectedUnit.maintenanceAdvance,
      selectedUnit.stampDuty,
      selectedUnit.totalPrice,
    ]
  );
  const quoteCostRows = editableCostRows.length ? editableCostRows : defaultCostRows;
  const quoteLineRows = quoteCostRows
    .filter((row) => row.type !== "section")
    .map((row) => ({ ...row, newValue: calculateCostNewValue(row) }));
  const agreementValue =
    toNumber(quoteLineRows.find((row) => row.name === "Agreement Value")?.newValue, 0) ||
    agreementOriginalValue ||
    basePriceValue;
  const allInclusiveValue =
    toNumber(quoteLineRows.find((row) => row.name === "Total Price")?.newValue, 0) ||
    quoteLineRows
      .filter((row) => !["Base Rate", "Floor Rise", "Floor Rise Rate", "Floor Rise Steps", "Floor Rise Amount", "Total Price"].includes(row.name))
      .reduce((total, row) => total + toNumber(row.newValue, 0), 0) ||
    agreementValue;
  const unitStatusCounts = filteredCatalogUnits.reduce(
    (counts, unit) => {
      const status = normalizeUnitStatus(unit.status, unit);
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { all: filteredCatalogUnits.length, available: 0, booked: 0, held: 0, blocked: 0, refuge: 0, investor: 0, rehab: 0 }
  );
  const selectedProject = bookingProjects.find((project) => String(project.id) === selectedProjectId);
  const leadProjectDetails = isPlaceholderProjectName(bookingForm.projectDetails) ? "" : bookingForm.projectDetails;
  const hasLeadProjectOption =
    leadProjectDetails && !bookingProjects.some((project) => getProjectName(project) === leadProjectDetails);
  const projectSelectLabel = isLoadingCatalog
    ? "Loading projects..."
    : selectedProjectId
      ? getProjectName(selectedProject) || leadProjectDetails || "Select Project"
      : leadProjectDetails || (bookingProjects.length ? "Select Project" : "No projects found");
  const projectSearchQuery = projectSearch.trim().toLowerCase();
  const filteredBookingProjects = projectSearchQuery
    ? bookingProjects.filter((project) => getProjectName(project).toLowerCase().includes(projectSearchQuery))
    : bookingProjects;
  const shouldShowLeadProjectOption =
    hasLeadProjectOption && (!projectSearchQuery || leadProjectDetails.toLowerCase().includes(projectSearchQuery));

  const syncCostSheetFields = (rows) => {
    const lineRows = rows
      .filter((row) => row.type !== "section")
      .map((row) => ({ ...row, newValue: calculateCostNewValue(row) }));
    const nextAgreementValue =
      toNumber(lineRows.find((row) => row.name === "Agreement Value")?.newValue, 0) ||
      agreementOriginalValue ||
      basePriceValue;
    const nextTotalPrice =
      toNumber(lineRows.find((row) => row.name === "Total Price")?.newValue, 0) ||
      lineRows
        .filter((row) => !["Base Rate", "Floor Rise", "Floor Rise Rate", "Floor Rise Steps", "Floor Rise Amount", "Total Price"].includes(row.name))
        .reduce((total, row) => total + toNumber(row.newValue, 0), 0) ||
      nextAgreementValue;

    updateField("agreementValue", nextAgreementValue);
    updateField("totalPrice", nextTotalPrice);
    updateField(
      "costSheet",
      lineRows.map((row) => ({
        fieldName: row.name,
        originalValue: toNumber(row.originalValue, 0),
        costType: row.costType || "Discount",
        inputField: toNumber(row.inputField, 0),
        newValue: toNumber(row.newValue, 0),
      }))
    );
  };

  const handleCostRowChange = (serial, field, value) => {
    const nextRows = (editableCostRows.length ? editableCostRows : defaultCostRows).map((row) =>
      row.serial === serial ? { ...row, [field]: value } : row
    );
    setEditableCostRows(nextRows);
    syncCostSheetFields(nextRows);
  };

  const fallbackCustomCharges = useMemo(() => [emptyCustomCharge()], []);
  const customCharges = Array.isArray(bookingForm.customOtherCharges) && bookingForm.customOtherCharges.length
    ? bookingForm.customOtherCharges
    : fallbackCustomCharges;
  const updateCustomCharge = (index, field, value) => {
    const nextRows = customCharges.map((row, rowIndex) =>
      rowIndex === index ? { ...row, [field]: value } : row
    );
    updateField("customOtherCharges", nextRows);
  };
  const addCustomCharge = () => updateField("customOtherCharges", [...customCharges, emptyCustomCharge()]);
  const removeCustomCharge = (index) =>
    updateField("customOtherCharges", customCharges.filter((_, rowIndex) => rowIndex !== index));

  const calculatedPricing = useMemo(() => calculateBookingPricing({
    reraArea: reraAreaValue,
    baseRate: baseRateValue,
    closingRate: closingBaseRateValue,
    parkingAmount: bookingForm.parkingCharges !== undefined && bookingForm.parkingCharges !== "" ? bookingForm.parkingCharges : (bookingForm.parkingAmount ?? 0),
    gstPercent: 5,
    stampDutyPercent: 6,
    legalCharges: bookingForm.legalDocumentationCharges,
    registrationCharges: bookingForm.registrationAmount,
    otherExpenses: customCharges,
  }), [
    baseRateValue,
    bookingForm.legalDocumentationCharges,
    bookingForm.parkingCharges,
    bookingForm.parkingAmount,
    bookingForm.registrationAmount,
    closingBaseRateValue,
    customCharges,
    reraAreaValue,
  ]);
  const gstAmount = calculatedPricing.gstAmount;
  const stampDutyAmount = calculatedPricing.stampDutyAmount;
  const bookingAllInclusiveAmount = calculatedPricing.totalAllInclusiveCost;
  const agreementTaxMultiplier = 1 + (calculatedPricing.gstPercent + calculatedPricing.stampDutyPercent) / 100;

  useEffect(() => {
    if (!isOpen) return;

    if (bookingForm.agreementValue === "" || bookingForm.agreementValue === undefined || bookingForm.agreementValue === null) {
      updateField("agreementValue", String(calculatedPricing.agreementValue));
    }

    if (String(bookingForm.totalPrice ?? "") !== String(calculatedPricing.totalAllInclusiveCost)) {
      updateField("totalPrice", String(calculatedPricing.totalAllInclusiveCost));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, calculatedPricing.agreementValue, calculatedPricing.totalAllInclusiveCost]);

  if (!isOpen) return null;

  const renderUnitGallery = () => (
    <aside className="ubf-side-panel">
      <h6>Unit Gallery</h6>
      <div className="ubf-gallery">
        {selectedUnit.image ? (
          <img className="ubf-unit-gallery-image" src={selectedUnit.image} alt={`${selectedUnit.name} floor plan`} />
        ) : (
          <div className="ubf-floorplan" aria-label="No unit image available">
            <span />
            <span />
            <span />
            <span />
          </div>
        )}
        <div className="ubf-building-shot" />
      </div>
      <h6>Unit Details Card</h6>
      <div className="ubf-unit-card">
        {selectedUnit.image && (
          <img className="ubf-unit-card-image" src={selectedUnit.image} alt={`${selectedUnit.name} preview`} />
        )}
        <strong>{selectedUnit.name}</strong>
        <div><span>Floor</span><b>{selectedUnit.floor}</b></div>
        <div><span>Carpet Area</span><b>{selectedUnit.carpet} Sq. Ft.</b></div>
        <div><span>Saleable Area</span><b>{selectedUnit.saleable} Sq. Ft.</b></div>
        <div><span>Bedrooms</span><b>{selectedUnit.bedrooms}</b></div>
        <div><span>Bathrooms</span><b>{selectedUnit.bathrooms}</b></div>
      </div>
    </aside>
  );

  const renderStepOne = () => (
    <div className="ubf-step ubf-start-step">
      <section className="ubf-start-choice">
        {/* <div className="ubf-start-art ubf-search-art" aria-hidden="true">
          <div className="ubf-person" />
          <div className="ubf-magnifier" />
          <div className="ubf-skyline" />
          <div className="ubf-start-house" />
        </div> */}
        <h6>Select Project For Booking</h6>
        <p>Start by selecting a project that you like and we will guide you further</p>
        <label className="ubf-field ubf-project-select" ref={projectSelectRef}>
          <span>Select Project</span>
          <button
            type="button"
            className="ubf-project-select-button"
            disabled={isLoadingCatalog || (!bookingProjects.length && !bookingForm.projectDetails)}
            onClick={() => setIsProjectMenuOpen((current) => !current)}
          >
            {projectSelectLabel}
          </button>
          {isProjectMenuOpen && (
            <div className="ubf-project-select-menu" role="listbox">
              <div className="ubf-project-search-wrap">
                <input
                  autoFocus
                  className="ubf-project-search"
                  type="search"
                  value={projectSearch}
                  onChange={(event) => setProjectSearch(event.target.value)}
                  placeholder="Search project..."
                  aria-label="Search project"
                />
              </div>
              {filteredBookingProjects.map((project) => (
                <button
                  type="button"
                  className={String(project.id) === selectedProjectId ? "active" : ""}
                  key={project.id}
                  onClick={() => selectProjectOption(project.id)}
                  role="option"
                  aria-selected={String(project.id) === selectedProjectId}
                >
                  {getProjectName(project)}
                </button>
              ))}
              {shouldShowLeadProjectOption && (
                <button
                  type="button"
                  className={!selectedProjectId ? "active" : ""}
                  onClick={() => selectProjectOption("__lead_project__")}
                  role="option"
                  aria-selected={!selectedProjectId}
                >
                  {bookingForm.projectDetails}
                </button>
              )}
              {!filteredBookingProjects.length && !shouldShowLeadProjectOption && (
                <div className="ubf-project-empty">No matching projects found.</div>
              )}
            </div>
          )}
        </label>
      </section>


      {/* 
      <section className="ubf-start-choice">
        {renderProjectIllustration()}
        <h3>Quick Unit Selection</h3>
        <p>Know your unit? Select it here and proceed to book directly.</p>
        <label className="ubf-field">
          <span>Select Unit</span>
          <select value={bookingForm.unit || ""} onChange={(event) => {
            const unit = catalogUnits.find((item) => item.name === event.target.value);
            if (unit) {
              if (unit.projectId) updateField("projectId", unit.projectId);
              if (unit.projectName) updateField("projectDetails", unit.projectName);
              selectUnit(unit);
            }
          }}>
            <option value="">{isLoadingCatalog ? "Loading units..." : "Search Units"}</option>
            {catalogUnits.filter((unit) => unit.status !== "unavailable").map((unit) => (
              <option key={`${unit.id}-${unit.name}`} value={unit.name}>
                {unit.name} {unit.projectName ? `- ${unit.projectName}` : ""}
              </option>
            ))}
          </select>
        </label>
      </section> */}
    </div>
  );

  const renderStepTwo = () => (
    <div className="ubf-step ubf-unit-step">
      <aside className="ubf-filter-rail">
        <h6>Filters By</h6>
        {Object.entries(chipGroups).map(([key, values]) => (
          <div className="ubf-chip-block compact" key={key}>
            <span>{key === "unitType" ? "Project Type" : key.replace(/([A-Z])/g, " $1")}</span>
            <div className="ubf-chip-row">
              {values.map((value) => (
                <button
                  type="button"
                  key={value}
                  className={filters[key] === value ? "active" : ""}
                  onClick={() => setFilters((current) => ({ ...current, [key]: value }))}
                >
                  {value}
                </button>
              ))}
            </div>
          </div>
        ))}
      </aside>

      <section className="ubf-unit-board">
        <div className="ubf-unit-toolbar">
          <div>
            <h6>Select Unit</h6>
            <strong>{selectedTowerName || "All Towers"}</strong>
          </div>
          <div className="ubf-unit-actions">
            <label className="ubf-tower-select">
              <span>Select Tower</span>
              <select
                value={selectedTowerId}
                onChange={(event) => {
                  setSelectedTowerId(event.target.value);
                  updateField("unit", "");
                  updateField("unitId", "");
                  updateField("unitItemId", "");
                }}
              >
                <option value="">
                  {towerOptions.length ? "All Towers" : "No towers found"}
                </option>
                {towerOptions.map((tower) => (
                  <option key={tower.id} value={tower.id}>
                    {tower.name}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>
        <div className="ubf-status-counters">
          {[
            ["all", "All"],
            ["available", "Available"],
            ["booked", "Booked / Sold"],
            ["rehab", "Rehab"],
            ["held", "Held"],
            ["blocked", "Blocked"],
            ["investor", "Investor"],
            ["refuge", "Refuge"],
          ].map(([key, label]) => (
            <span key={key}>
              <b>{unitStatusCounts[key] || 0}</b> {label}
            </span>
          ))}
        </div>

        {/* Status Color Scheme Legend */}
        <div className="ubf-legend-bar" aria-label="Status colour legend">
          <strong>Legend:</strong>
          <div className="ubf-legend-bar-items">
            <span className="ubf-legend-bar-item">
              <span className="ubf-legend-swatch" style={{ background: "#24b36b" }} /> Available
            </span>
            <span className="ubf-legend-bar-item">
              <span className="ubf-legend-swatch" style={{ background: "#e65258" }} /> Sold / Booked
            </span>
            <span className="ubf-legend-bar-item">
              <span className="ubf-legend-swatch" style={{ background: "#111827" }} /> Rehab
            </span>
            <span className="ubf-legend-bar-item">
              <span className="ubf-legend-swatch" style={{ background: "#facc15" }} /> Held
            </span>
            <span className="ubf-legend-bar-item">
              <span className="ubf-legend-swatch" style={{ background: "#64748b" }} /> Blocked
            </span>
            <span className="ubf-legend-bar-item">
              <span className="ubf-legend-swatch" style={{ background: "#8b5cf6" }} /> Investor
            </span>
            <span className="ubf-legend-bar-item">
              <span className="ubf-legend-swatch" style={{ background: "#378add" }} /> Selected
            </span>
          </div>
        </div>

        <div className="ubf-floor-grid">
          {filteredCatalogUnits.length === 0 && (
            <div className="ubf-unit-empty">No units found for this project tower.</div>
          )}
          {allFloorGroups.map(({ floor, units }) => (
            <React.Fragment key={floor}>
              <div className="ubf-floor-label">{Number(floor) === 0 || floor === "0" || floor === 0 ? "Ground Floor" : `Floor ${floor}`}</div>
              <div className="ubf-units-line">
                {units.map((unit) => {
                  const status = normalizeUnitStatus(unit.status, unit);
                  const tone = bookingForm.unit === unit.name ? "selected" : interestedUnits.has(unit.name) ? "interested" : status;
                  const isLocked = ["booked", "blocked", "refuge", "investor", "rehab", "held"].includes(status);
                  const isShop = String(unit.name || "").startsWith("SH-") || String(unit.unitType || "").toLowerCase().includes("commercial") || String(unit.configurationLabel || "").toLowerCase().includes("shop");
                  return (
                    <button
                      type="button"
                      key={`${unit.id}-${unit.name}`}
                      className={`ubf-unit-cell ${tone}`}
                      onClick={() => selectUnit(unit)}
                      disabled={isLocked}
                      title={`${isShop ? "Shop no" : "Flat no"}: ${unit.name}${isRehabUnit(unit) ? " - Rehab Unit" : ""}`}
                    >
                      {unit.image ? (
                        <img src={unit.image} alt="" />
                      ) : (
                        <span className="ubf-unit-plan" aria-hidden="true">
                          <i />
                          <i />
                          <i />
                          <i />
                        </span>
                      )}
                      <b>{isShop ? "Shop no" : "Flat no"} : {unit.name}</b>
                      <span
                        className="ubf-unit-dots-trigger"
                        onClick={(e) => e.stopPropagation()}
                        title=""
                        aria-label="View price details"
                      >
                        <FaEllipsisV aria-hidden="true" />
                        <span className="ubf-unit-popup">
                          <span className="ubf-unit-popup-header">{isShop ? "Shop" : "Flat"} {unit.name}</span>
                          <span className="ubf-unit-popup-price">
                            {formatUnitPopupPrice(unit.basePrice)}
                            {unit.basePrice ? (
                              <span className="ubf-unit-popup-exact">
                                {" "}(₹{Number(unit.basePrice).toLocaleString("en-IN")})
                              </span>
                            ) : null}
                          </span>
                          {unit.carpet && unit.carpet !== "-" ? (
                            <span className="ubf-unit-popup-meta">
                              Carpet: <strong>{unit.carpet} sq.ft</strong>
                            </span>
                          ) : null}
                          {unit.configurationLabel && unit.configurationLabel !== "-" ? (
                            <span className="ubf-unit-popup-meta">
                              Type: <strong>{unit.configurationLabel}</strong>
                            </span>
                          ) : unit.bedrooms && unit.bedrooms !== "-" ? (
                            <span className="ubf-unit-popup-meta">
                              Type: <strong>{unit.bedrooms} BHK</strong>
                            </span>
                          ) : null}
                          {unit.builtupArea && unit.builtupArea !== "-" ? (
                            <span className="ubf-unit-popup-meta">
                              Built-up: {unit.builtupArea} sq.ft
                            </span>
                          ) : null}
                          {unit.saleable && unit.saleable !== "-" ? (
                            <span className="ubf-unit-popup-meta">
                              Saleable: {unit.saleable} sq.ft
                            </span>
                          ) : null}
                          {unit.baseRate && unit.baseRate !== "-" ? (
                            <span className="ubf-unit-popup-meta">
                              Rate: ₹{Number(unit.baseRate).toLocaleString("en-IN")}/sq.ft
                            </span>
                          ) : null}
                          {unit.facing ? (
                            <span className="ubf-unit-popup-meta">
                              Facing: {unit.facing}
                            </span>
                          ) : null}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </React.Fragment>
          ))}
        </div>
      </section>

      {renderUnitGallery()}
    </div>
  );

  // eslint-disable-next-line no-unused-vars
  const renderCostSheet = () => (
    <div className="ubf-cost-table">
      <h6>Cost Sheet</h6>
      <div className="ubf-cost-head">
        <span>Sr. No.</span>
        <span>Field Name</span>
        <span>Original Value</span>
        <span>Discount Or AdHoc Cost</span>
        <span>Input Field</span>
        <span>New Value</span>
      </div>
      {quoteCostRows.map((row) =>
        row.type === "section" ? (
          <div className="ubf-cost-section" key={row.serial}>{row.serial} {row.name}</div>
        ) : (
          <div className={`ubf-cost-row${row.highlight ? " highlight" : ""}`} key={row.serial}>
            <span>{row.serial}</span>
            <strong>{row.name}</strong>
            <span className="ubf-cost-money">{costCurrency(row.originalValue)}</span>
            <div className="ubf-cost-select-cell">
              <select
                value={row.costType || "Discount"}
                onChange={(event) => handleCostRowChange(row.serial, "costType", event.target.value)}
              >
                <option value="Discount">Discount</option>
                <option value="AdHoc Cost">AdHoc Cost</option>
              </select>
            </div>
            <label className="ubf-money-input">
              <span>₹</span>
              <input
                type="number"
                min="0"
                value={row.inputField ?? 0}
                onChange={(event) => handleCostRowChange(row.serial, "inputField", event.target.value)}
              />
            </label>
            <label className="ubf-money-input readonly">
              <span>₹</span>
              <input type="text" value={costNumber(calculateCostNewValue(row))} readOnly />
            </label>
          </div>
        )
      )}
    </div>
  );

  // eslint-disable-next-line no-unused-vars
  const renderPaymentSchedule = () => {
    const totalPercentage = paymentRows.reduce((sum, row) => sum + row.percentage, 0);
    const totalAmount = paymentRows.reduce((sum, row) => sum + row.amount, 0);
    const totalTaxes = paymentRows.reduce((sum, row) => sum + row.taxes, 0);
    const totalTds = paymentRows.reduce((sum, row) => sum + row.tds, 0);
    const totalGrand = paymentRows.reduce((sum, row) => sum + row.grandTotal, 0);

    return (
      <div className="ubf-payment-schedule">
        <h6>Payment Schedule</h6>
        <p>Payment Schedule for Agreement Value</p>
        <div className="ubf-payment-table">
          <div className="ubf-payment-head">
            <span>Name/Date</span>
            <span>Tower Milestone</span>
            <span>Value (In Percentage %)</span>
            <span>Amount</span>
            <span>Taxes <small>i</small></span>
            <span>TDS <small>i</small></span>
            <span>Grand Total</span>
          </div>
          {paymentRows.map((row) => (
            <div className="ubf-payment-row" key={row.name}>
              <div className="ubf-payment-name">
                <button type="button" aria-label={`Add ${row.name} schedule row`}>+</button>
                <span>{row.name}</span>
                <FaPen />
              </div>
              <div className="ubf-payment-control">
                <select defaultValue={row.milestone}>
                  <option>Agreement</option>
                  <option>Possession</option>
                </select>
              </div>
              <div className="ubf-payment-control">
                <input type="number" defaultValue={row.percentage} />
              </div>
              <label className="ubf-money-input">
                <span>₹</span>
                <input type="text" value={costNumber(row.amount)} readOnly />
              </label>
              <span className="ubf-payment-money">{costCurrency(row.taxes)}</span>
              <span className="ubf-payment-money">{costCurrency(row.tds)}</span>
              <span className="ubf-payment-money">{costCurrency(row.grandTotal)}</span>
            </div>
          ))}
          <div className="ubf-payment-row total">
            <strong>Total Agreement Value</strong>
            <span>-</span>
            <span>{totalPercentage}%</span>
            <span>{costCurrency(totalAmount)}</span>
            <span>{costCurrency(totalTaxes)}</span>
            <span>{costCurrency(totalTds)}</span>
            <span>{costCurrency(totalGrand)}</span>
          </div>
        </div>
      </div>
    );
  };

  const renderConfirmField = ({ label, name, value, type = "input", options = [], placeholder = "", disabled = false, clearable = false }) => (
    <label className="ubf-confirm-field" key={name || label}>
      <span>
        {label}
        {clearable && (
          <button type="button" onClick={() => updateField(name, "")}>
            clear value
          </button>
        )}
      </span>
      {type === "select" ? (
        <select disabled={disabled} value={bookingForm[name] ?? value ?? ""} onChange={(event) => updateField(name, event.target.value)}>
          {options.map((option, index) => (
            <option key={`${option}-${index}`} value={option}>
              {option}
            </option>
          ))}
        </select>
      ) : (
        <input
          disabled={disabled}
          placeholder={placeholder}
          value={bookingForm[name] ?? value ?? ""}
          onChange={(event) => updateField(name, event.target.value)}
        />
      )}
    </label>
  );

  const renderPricingField = ({ label, name, value, disabled = false, onChange }) => (
    <label className="ubf-confirm-fact ubf-price-edit" key={name}>
      <span>{label}</span>
      <input
        type="number"
        min="0"
        step="0.01"
        disabled={disabled}
        value={bookingForm[name] ?? value ?? ""}
        onChange={onChange || ((event) => updateField(name, event.target.value))}
        onWheel={(event) => event.currentTarget.blur()}
      />
      <small>{confirmCurrency(bookingForm[name] ?? value)}</small>
    </label>
  );

  const updateAgreementDetailsField = (name, rawValue) => {
    updateField(name, rawValue);
    if (name === "parkingCharges" || name === "parkingAmount") {
      updateField("parkingCharges", rawValue);
      updateField("parkingAmount", rawValue);
      const parsedParking = toSafeNumber(rawValue);
      if (parsedParking > 0) {
        updateField("parkingRequired", "Yes");
        if (!bookingForm.carParkingSlots) updateField("carParkingSlots", "1");
        if (!bookingForm.parkingType) updateField("parkingType", "Covered");
      } else {
        updateField("parkingRequired", "No");
      }
    }

    const nextReraArea = name === "reraArea" ? toSafeNumber(rawValue) : toSafeNumber(bookingForm.reraArea ?? reraAreaValue);
    const nextClosingRate = name === "closingRate" ? toSafeNumber(rawValue) : toSafeNumber(bookingForm.closingRate ?? calculatedPricing.closingRate);
    const parkingAmount = (name === "parkingCharges" || name === "parkingAmount") ? toSafeNumber(rawValue) : toSafeNumber(bookingForm.parkingCharges ?? bookingForm.parkingAmount ?? calculatedPricing.parkingAmount);
    const legalCharges = name === "legalDocumentationCharges" ? toSafeNumber(rawValue) : toSafeNumber(bookingForm.legalDocumentationCharges ?? calculatedPricing.legalCharges);
    const registrationCharges = name === "registrationAmount" ? toSafeNumber(rawValue) : toSafeNumber(bookingForm.registrationAmount ?? calculatedPricing.registrationCharges);
    const otherExpenseTotal = Number(customCharges.reduce((total, row) => total + toSafeNumber(row.amount, 0), 0).toFixed(2));

    const nextClosingPrice = Number((nextReraArea * nextClosingRate).toFixed(2));
    let nextAgreementValue = Number((nextClosingPrice + parkingAmount).toFixed(2));

    if (name === "agreementValue") {
      nextAgreementValue = toSafeNumber(rawValue);
      if (nextReraArea) {
        const backCalculatedClosingRate = Math.max((nextAgreementValue - parkingAmount) / nextReraArea, 0);
        updateField("closingRate", Number.isInteger(backCalculatedClosingRate) ? String(backCalculatedClosingRate) : backCalculatedClosingRate.toFixed(2));
      }
    } else if (name === "totalPrice") {
      const requestedTotal = toSafeNumber(rawValue);
      const nonAgreementCharges = legalCharges + registrationCharges + otherExpenseTotal;
      const taxMultiplier = 1 + 0.06 + 0.05; // 1.11 (6% Stamp Duty + 5% GST)
      nextAgreementValue = Number((Math.max((requestedTotal - nonAgreementCharges) / taxMultiplier, 0)).toFixed(2));
      updateField("agreementValue", String(nextAgreementValue));
      if (nextReraArea) {
        const backCalculatedClosingRate = Math.max((nextAgreementValue - parkingAmount) / nextReraArea, 0);
        updateField("closingRate", Number.isInteger(backCalculatedClosingRate) ? String(backCalculatedClosingRate) : backCalculatedClosingRate.toFixed(2));
      }
    } else if (name === "legalDocumentationCharges" || name === "registrationAmount") {
      nextAgreementValue = toSafeNumber(
        bookingForm.agreementValue !== "" && bookingForm.agreementValue !== undefined
          ? bookingForm.agreementValue
          : (nextClosingPrice + parkingAmount)
      );
    } else {
      updateField("agreementValue", String(nextAgreementValue));
    }

    const stampDuty = Number((nextAgreementValue * 6 / 100).toFixed(2));
    const gst = Number((nextAgreementValue * 5 / 100).toFixed(2));
    const nextTotalPrice = Number((nextAgreementValue + stampDuty + gst + legalCharges + registrationCharges + otherExpenseTotal).toFixed(2));

    if (name !== "totalPrice") {
      updateField("totalPrice", String(nextTotalPrice));
    }
  };

  const renderAgreementField = ({ label, name, value, helper, disabled = false, placeholder, type = "number", onChange }) => (
    <label className={`ubf-confirm-fact ubf-price-edit ubf-agreement-field ${disabled ? "ubf-field-readonly" : ""}`} key={name}>
      <span>{label}</span>
      <input
        type={type}
        min="0"
        step="0.01"
        disabled={disabled}
        placeholder={placeholder}
        value={value ?? ""}
        onChange={onChange || ((event) => updateAgreementDetailsField(name, event.target.value))}
        onWheel={(event) => event.currentTarget.blur()}
      />
      {helper && <small>{helper}</small>}
    </label>
  );

  const renderConfirmSection = (title, children, className = "") => (
    <section className={`ubf-confirm-section ${className}`}>
      <h3>{title}</h3>
      <div className="ubf-confirm-section-body">{children}</div>
    </section>
  );

  const displayText = (value) => {
    if (value === undefined || value === null || value === "" || Number.isNaN(value)) return "-";
    return String(value);
  };
  const formatStatus = (value) => {
    const text = String(value || "").replace(/[_-]/g, " ").trim();
    if (!text) return "-";
    return text.charAt(0).toUpperCase() + text.slice(1);
  };
  const renderFactGrid = (items, className = "ubf-confirm-unit-grid", children = null) => (
    <div className={className}>
      {items.map(([label, value]) => (
        <div className="ubf-confirm-fact" key={label}>
          <span>{label}</span>
          <strong>{displayText(value)}</strong>
        </div>
      ))}
      {children}
    </div>
  );

  const renderBookingConfirmation = () => {
    const bookingDate = bookingForm.bookingDate || new Date().toISOString().slice(0, 10);
    const applicantName = bookingForm.bookingName || bookingForm.customerName || leadName || "";
    const sourceValue = normalizeBookingSource(bookingForm.source);
    const summaryReraArea = toSafeNumber(bookingForm.reraArea, reraAreaValue);
    const summaryClosingRate = toSafeNumber(bookingForm.closingRate, calculatedPricing.closingRate);
    const summaryParking = toSafeNumber(bookingForm.parkingCharges, calculatedPricing.parkingAmount);
    const summaryFlatPrice = Number((summaryReraArea * summaryClosingRate).toFixed(2));
    const summaryAgreement = toSafeNumber(bookingForm.agreementValue, summaryFlatPrice + summaryParking);
    const summaryGst = Number((summaryAgreement * 5 / 100).toFixed(2));
    const summaryStampAmount = Number((summaryAgreement * 6 / 100).toFixed(2));
    const summaryLegalCharges = toSafeNumber(bookingForm.legalDocumentationCharges, calculatedPricing.legalCharges);
    const summaryRegistrationCharges = toSafeNumber(bookingForm.registrationAmount, calculatedPricing.registrationCharges);
    const summaryOtherExpenses = Number(customCharges.reduce((total, row) => total + toSafeNumber(row.amount, 0), 0).toFixed(2));
    const summaryAllInclusive = Number((
      summaryAgreement +
      summaryGst +
      summaryStampAmount +
      summaryLegalCharges +
      summaryRegistrationCharges +
      summaryOtherExpenses
    ).toFixed(2));
    const bookingDetailsSection = renderConfirmSection(
      "Booking Details",
      <div className="ubf-confirm-form-grid ubf-booking-details-row">
        {renderConfirmField({ label: "Booking Name *", name: "bookingName", value: applicantName })}
        {renderConfirmField({ label: "Booking Date *", name: "bookingDate", value: bookingDate })}
        <label className="ubf-confirm-field">
          <span>Source *</span>
          <select
            value={sourceValue}
            onChange={(event) => {
              const source = normalizeBookingSource(event.target.value);
              updateField("source", source);
              if (!isChannelPartnerSource(source)) {
                updateField("channelPartnerId", "");
                updateField("channelPartner", "");
                updateField("cpReraNumber", "");
              }
            }}
          >
            {[...sourceOptions, !sourceOptions.includes(sourceValue) ? sourceValue : ""]
              .filter(Boolean)
              .map((option, index) => (
                <option key={`${option}-${index}`} value={option}>{option}</option>
              ))}
          </select>
        </label>
        {isChannelPartnerSource(sourceValue) && (
          <>
            <label className="ubf-confirm-field">
              <span>Channel Partner *</span>
              <select
                value={bookingForm.channelPartnerId || ""}
                onChange={(event) => {
                  const selected = channelPartners.find((user) => String(user.id) === event.target.value);
                  updateField("channelPartnerId", event.target.value);
                  updateField("channelPartner", selected ? getUserName(selected) : "");
                  updateField("cpReraNumber", selected?.reraNumber || selected?.cpReraNumber || selected?.rera || selected?.reraNo || "");
                }}
              >
                <option value="">Select Channel Partner</option>
                {channelPartners.map((user) => (
                  <option key={user.id} value={user.id}>{getUserName(user)}</option>
                ))}
              </select>
            </label>
            {renderConfirmField({ label: "Channel Partner RERA ID *", name: "cpReraNumber", value: bookingForm.cpReraNumber })}
          </>
        )}
      </div>
    );

    return (
      <div className="ubf-step ubf-confirm-step">
        <h4 className="ubf-confirm-title">Booking Confirmation</h4>
        {isLoadingUnitDetails && <div className="ubf-alert">Loading selected unit details...</div>}
        {unitDetailsMessage && <div className="ubf-alert">{unitDetailsMessage}</div>}

        {renderConfirmSection(
          "Unit Details",
          <>
            {renderFactGrid([
              ["Name / Unit Number", selectedUnit.name],
              ["Status", formatStatus(selectedUnit.status)],
              ["Floor Number", selectedUnit.floor],
              ["Project Name", selectedUnit.projectName || bookingForm.projectDetails],
              ["Tower Name", selectedTowerName || selectedUnit.towerName],
              ["Bedrooms", selectedUnit.bedrooms],
              ["Bathrooms", selectedUnit.bathrooms],
            ], "ubf-confirm-unit-grid", (
              <div className="ubf-confirm-parking-field">
                {renderPricingField({
                  label: "Parking",
                  name: "parkingCharges",
                  value: (bookingForm.parkingCharges !== undefined && bookingForm.parkingCharges !== "")
                    ? bookingForm.parkingCharges
                    : ((bookingForm.parkingAmount !== undefined && bookingForm.parkingAmount !== "") ? bookingForm.parkingAmount : calculatedPricing.parkingAmount),
                  onChange: (event) => updateAgreementDetailsField("parkingCharges", event.target.value),
                })}
              </div>
            ))}
          </>
        )}

        {renderConfirmSection("Floor Rise Details", renderFactGrid([
          ["Floor Rise", selectedUnit.floorRiseEnabled ? "Yes" : "No"],
          ["Floor Rise Rate", confirmCurrency(selectedUnit.floorRiseEnabled ? floorRiseRateValue : 0)],
          ["Rise Steps", selectedUnit.floorRiseEnabled ? floorRiseStepsValue : 0],
          ["Floor Rise Amount", confirmCurrency(selectedUnit.floorRiseEnabled ? floorRiseValue : 0)],
        ], "ubf-confirm-unit-grid compact"))}

        {renderConfirmSection(
          "Agreement Details",
          <div className="ubf-agreement-details-wrap">
            {/* Row 1: RERA Area ('a'), Closing Rate ('b'), Closing Price ('c = a * b'), Agreement Value ('d = c + x') */}
            <div className="ubf-confirm-form-grid ubf-agreement-details-grid">
              {renderAgreementField({
                label: "RERA AREA",
                name: "reraArea",
                value: bookingForm.reraArea ?? reraAreaValue,
                helper: `${Number(summaryReraArea || 0).toLocaleString("en-IN")} Sq. Ft.`,
              })}
              {renderAgreementField({
                label: "CLOSING RATE",
                name: "closingRate",
                value: bookingForm.closingRate ?? calculatedPricing.closingRate,
                helper: `Base rate: ${confirmCurrency(baseRateValue)}`,
              })}
              {renderAgreementField({
                label: "CLOSING PRICE",
                name: "closingPrice",
                value: summaryFlatPrice,
                disabled: true,
                helper: "(RERA Area * Closing Rate)",
              })}
              {renderAgreementField({
                label: "AGREEMENT VALUE",
                name: "agreementValue",
                value: bookingForm.agreementValue !== "" && bookingForm.agreementValue !== undefined ? bookingForm.agreementValue : summaryAgreement,
                helper: "(RERA Area * Closing Rate) + Parking",
              })}
            </div>

            {/* Row 2: Stamp Duty (6% of d), GST (5% of d), Legal Charges (input integer), Registration Cost (input integer) */}
            <div className="ubf-confirm-form-grid ubf-agreement-details-grid ubf-agreement-secondary-grid">
              {renderAgreementField({
                label: "STAMP DUTY",
                name: "stampDuty",
                value: summaryStampAmount,
                disabled: true,
                helper: "6% of Agreement Value",
              })}
              {renderAgreementField({
                label: "GST",
                name: "gst",
                value: summaryGst,
                disabled: true,
                helper: "5% of Agreement Value",
              })}
              {renderAgreementField({
                label: "LEGAL CHARGES",
                name: "legalDocumentationCharges",
                value: bookingForm.legalDocumentationCharges ?? "",
                placeholder: "0",
                helper: "Legal Documentation",
              })}
              {renderAgreementField({
                label: "REGISTRATION COST",
                name: "registrationAmount",
                value: bookingForm.registrationAmount ?? "",
                placeholder: "0",
                helper: "Registration Charges (INR)",
              })}
            </div>

            {/* Row 3: Other Expenses with dynamic add/remove */}
            <div className="ubf-agreement-expenses-section">
              <div className="ubf-agreement-expenses-header">
                <span className="ubf-expenses-title">Other Expenses</span>
                <button
                  type="button"
                  className="ubf-add-expense-btn"
                  onClick={addCustomCharge}
                >
                  + Add Expense
                </button>
              </div>
              <div className="ubf-custom-charge-list">
                {customCharges.map((row, index) => (
                  <div className="ubf-custom-charge-row" key={row.id || `custom-charge-${index}`}>
                    <label className="ubf-confirm-field">
                      <span>Expense Name</span>
                      <input
                        placeholder="Expense Name (e.g. Clubhouse, Maintenance)"
                        value={row.name || ""}
                        onChange={(event) => updateCustomCharge(index, "name", event.target.value)}
                      />
                    </label>
                    <label className="ubf-confirm-field">
                      <span>Amount (INR)</span>
                      <input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="0"
                        value={row.amount ?? ""}
                        onChange={(event) => updateCustomCharge(index, "amount", event.target.value)}
                        onWheel={(event) => event.currentTarget.blur()}
                      />
                    </label>
                    <button
                      type="button"
                      className="ubf-delete-expense-btn"
                      onClick={() => removeCustomCharge(index)}
                      disabled={customCharges.length === 1 && !row.name && !row.amount}
                      title="Delete expense"
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Row 4: Total Price */}
            <div className="ubf-confirm-form-grid ubf-agreement-total-grid">
              {renderAgreementField({
                label: "TOTAL PRICE",
                name: "totalPrice",
                value: bookingForm.totalPrice !== "" && bookingForm.totalPrice !== undefined ? bookingForm.totalPrice : summaryAllInclusive,
                helper: "Agreement Value + 11% (Stamp & GST) + Legal + Registration + Other Expenses",
              })}
            </div>
          </div>
        )}

        {bookingDetailsSection}

        {renderConfirmSection(
          "Booking Summary",
          <div className="ubf-booking-summary">
            <div className="ubf-receipt-sheet">
              <div className="ubf-receipt-row">
                <span>Total Flat Price<small>RERA Area * Closing Rate</small></span>
                <strong>{confirmCurrency(summaryFlatPrice)}</strong>
              </div>
              <div className="ubf-receipt-row">
                <span>Total Agreement<small>(RERA Area * Closing Rate) + Parking</small></span>
                <strong>{confirmCurrency(summaryAgreement)}</strong>
              </div>
              <div className="ubf-receipt-row">
                <span>5% GST</span>
                <strong>{confirmCurrency(summaryGst)}</strong>
              </div>
              <div className="ubf-receipt-row">
                <span>6% Stamp Amount</span>
                <strong>{confirmCurrency(summaryStampAmount)}</strong>
              </div>
              <div className="ubf-receipt-row">
                <span>Legal Charges</span>
                <strong>{confirmCurrency(summaryLegalCharges)}</strong>
              </div>
              <div className="ubf-receipt-row">
                <span>Registration Charges (INR)</span>
                <strong>{confirmCurrency(summaryRegistrationCharges)}</strong>
              </div>
              {customCharges
                .filter((row) => row.name || toSafeNumber(row.amount, 0))
                .map((row, index) => (
                  <div className="ubf-receipt-row" key={row.id || `summary-expense-${index}`}>
                    <span>{row.name || "Expense"}</span>
                    <strong>{confirmCurrency(row.amount)}</strong>
                  </div>
                ))}
            </div>
            <div className="ubf-booking-summary-total">
              <span>Total All Inclusive Cost Sheet</span>
              <strong>{confirmCurrency(summaryAllInclusive)}</strong>
            </div>
          </div>
        )}

      </div>
    );
  };

  // eslint-disable-next-line no-unused-vars
  const renderStepFour = () => {
    const bookingDate = bookingForm.bookingDate || new Date().toLocaleDateString("en-GB");
    const applicantName = bookingForm.customerName || leadName || "-";
    const applicantEmail = bookingForm.email || "-";
    const applicantPhone = bookingForm.phone || "-";
    return (
      <div className="ubf-step ubf-confirm-step">
        <h4 className="ubf-confirm-title">Booking Confirmation</h4>

        {renderConfirmSection(
          "Unit Details",
          <div className="ubf-confirm-unit-grid">
            {[
              ["Name", selectedUnit.name],
              ["Status", selectedUnit.status === "unavailable" ? "Unavailable" : "Available"],
              ["Floor", selectedUnit.floor],
              ["Project Tower Name", selectedTowerName || selectedUnit.towerName || "Tower"],
              ["Bedrooms", selectedUnit.bedrooms],
              ["Bathrooms", selectedUnit.bathrooms],
              ["Carpet", carpetValue.toLocaleString("en-IN")],
              ["Saleable", `${saleableValue.toLocaleString("en-IN")} sq_ft`],
              ["RERA Area", `${reraAreaValue.toLocaleString("en-IN")} sq_ft`],
              ["Base Rate", `₹ ${(baseRateValue / 1000).toFixed(1).replace(/\.0$/, "")}K (${baseRateValue.toLocaleString("en-IN")})`],
              ["Floor Rise Rate", floorRiseRateValue.toLocaleString("en-IN")],
              ["Rise From Floor", riseFromFloorValue || "-"],
              ["Rise Steps", floorRiseStepsValue.toLocaleString("en-IN")],
              ["Floor Rise Amount", confirmCurrency(floorRiseValue)],
              ["Effective Rate", effectiveRate.toLocaleString("en-IN")],
              ["Total Price", compactCurrency(allInclusiveValue)],
              ["Agreement Value", compactCurrency(agreementValue)],
            ]
              .filter(([label]) => !["Base Rate", "Total Price", "Agreement Value"].includes(label))
              .map(([label, value]) => (
                <div className="ubf-confirm-fact" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
            {renderPricingField({ label: "Base Rate", name: "baseRate", value: baseRateValue })}
            {renderPricingField({ label: "Closing Base Rate", name: "closingBaseRate", value: closingBaseRateValue })}
            {renderPricingField({ label: "Total Price", name: "totalPrice", value: bookingAllInclusiveAmount })}
            {renderPricingField({ label: "Agreement Value", name: "agreementValue", value: agreementValue })}
            {renderConfirmField({ label: "Booking Name", name: "bookingName", value: applicantName })}
            {renderConfirmField({ label: "Booking Date", name: "bookingDate", value: bookingDate })}
          </div>
        )}

        {renderConfirmSection(
          "Parking Details",
          <div className="ubf-confirm-form-grid">
            {renderConfirmField({
              label: "Parking Required *",
              name: "parkingRequired",
              type: "select",
              value: bookingForm.parkingRequired || "No",
              options: ["No", "Yes"],
            })}
            {bookingForm.parkingRequired === "Yes" && (
              <>
                {renderConfirmField({ label: "Number of Car Parking Slots *", name: "carParkingSlots", value: bookingForm.carParkingSlots, placeholder: "0" })}
                {renderConfirmField({
                  label: "Parking Type *",
                  name: "parkingType",
                  type: "select",
                  value: bookingForm.parkingType || "",
                  options: ["", "Covered", "Open", "Stilt", "Basement", "Stack", "Mechanical"],
                })}
                {renderConfirmField({ label: "Parking Slot Number", name: "parkingSlotNumber", value: bookingForm.parkingSlotNumber })}
                {renderConfirmField({ label: "Number of Two-Wheeler Slots", name: "twoWheelerSlots", value: bookingForm.twoWheelerSlots })}
                {renderConfirmField({ label: "Basement/Storeroom Area", name: "basementStoreroomArea", value: bookingForm.basementStoreroomArea })}
                {renderConfirmField({ label: "Parking Charges (INR)", name: "parkingCharges", value: bookingForm.parkingCharges || "0" })}
              </>
            )}
          </div>
        )}

        {renderConfirmSection(
          "Other Charges",
          <>
            <div className="ubf-confirm-form-grid">
              {renderConfirmField({ label: "GST %", name: "gstPercent", value: bookingForm.gstPercent || "5" })}
              {renderConfirmField({ label: "Stamp Duty %", name: "stampDutyPercent", value: bookingForm.stampDutyPercent || "6" })}
              {renderConfirmField({ label: "Registration Charges (INR)", name: "registrationAmount", value: bookingForm.registrationAmount })}
              {renderConfirmField({ label: "Legal Documentation Charges (INR)", name: "legalDocumentationCharges", value: bookingForm.legalDocumentationCharges })}
              {renderConfirmField({ label: "Infrastructure/Development Charges (INR)", name: "infrastructureDevelopmentCharges", value: bookingForm.infrastructureDevelopmentCharges })}
              {renderConfirmField({ label: "Society Formation Charges (INR)", name: "societyFormationCharges", value: bookingForm.societyFormationCharges })}
              {renderConfirmField({ label: "Club Membership Charges (INR)", name: "clubMembershipCharges", value: bookingForm.clubMembershipCharges })}
              {renderConfirmField({ label: "Maintenance Advance Months", name: "maintenanceAdvanceMonths", value: bookingForm.maintenanceAdvanceMonths })}
              {renderConfirmField({ label: "Maintenance Rate / Sqft / Month", name: "maintenanceRatePerSqftPerMonth", value: bookingForm.maintenanceRatePerSqftPerMonth })}
              {renderConfirmField({ label: "Sinking Fund/Corpus (INR)", name: "sinkingFundCorpus", value: bookingForm.sinkingFundCorpus })}
              <div className="ubf-confirm-fact">
                <span>Parking Charges</span>
                <strong>{confirmCurrency(bookingNumber(bookingForm.parkingCharges))}</strong>
              </div>
              <div className="ubf-confirm-fact">
                <span>All-Inclusive Amount</span>
                <strong>{confirmCurrency(bookingAllInclusiveAmount)}</strong>
              </div>
            </div>
            <div className="ubf-custom-charge-list">
              {customCharges.map((row, index) => (
                <div className="ubf-custom-charge-row" key={`custom-charge-${index}`}>
                  <input placeholder="Charge Name" value={row.name || ""} onChange={(event) => updateCustomCharge(index, "name", event.target.value)} />
                  <select value={row.chargeType || "Fixed"} onChange={(event) => updateCustomCharge(index, "chargeType", event.target.value)}>
                    <option>Fixed</option>
                    <option>Percentage</option>
                  </select>
                  <input placeholder={row.chargeType === "Percentage" ? "Percentage" : "Amount"} value={row.rate || row.amount || ""} onChange={(event) => updateCustomCharge(index, row.chargeType === "Percentage" ? "rate" : "amount", event.target.value)} />
                  <select value={row.taxable || "No"} onChange={(event) => updateCustomCharge(index, "taxable", event.target.value)}>
                    <option>No</option>
                    <option>Yes</option>
                  </select>
                  <button type="button" onClick={() => removeCustomCharge(index)}>Remove Row</button>
                </div>
              ))}
              <button type="button" className="ubf-add-row-button" onClick={addCustomCharge}>Add Row</button>
            </div>
          </>
        )}

        {renderConfirmSection(
          "Applicant Details",
          <>
            <div className="ubf-applicant-grid">
              {[
                ["Name", applicantName],
                ["Lead Name", leadName || applicantName],
                ["Phone", applicantPhone],
                ["DOB", formatDisplayDate(bookingForm.dob)],
                ["PAN Number", bookingForm.panNumber || "-"],
                ["Aadhaar Number", bookingForm.aadhaarNumber || "-"],
                ["Email", applicantEmail],
              ].map(([label, value]) => (
                <div className="ubf-confirm-fact" key={label}>
                  <span>{label}</span>
                  <strong>{value}</strong>
                </div>
              ))}
              <button type="button" className="ubf-section-menu" aria-label="Applicant actions">
                <FaEllipsisV />
              </button>
            </div>
          </>
        )}

        {renderConfirmSection(
          "Hold/Book Unit",
          <div className="ubf-confirm-form-grid">
            {renderConfirmField({
              label: "Select Booking Stage *",
              name: "bookingStage",
              type: "select",
              value: bookingForm.bookingStage || "Tentative",
              options: ["Tentative", "Confirmed"],
            })}
            {renderConfirmField({
              label: "Select Project Unit Status *",
              name: "projectUnitStatus",
              type: "select",
              value: bookingForm.projectUnitStatus || "Booked",
              options: ["Booked", "Hold", "Available"],
            })}
          </div>
        )}

        {renderConfirmSection(
          "Campaign Info",
          <div className="ubf-confirm-form-grid">
            {renderConfirmField({
              label: "Campaign",
              name: "campaign",
              type: "select",
              value: bookingForm.campaign || "walkin",
              options: ["walkin", "Site Visit", "Digital"],
            })}
            <label className="ubf-confirm-field">
              <span>Source</span>
              <select
                value={normalizeBookingSource(bookingForm.source)}
                onChange={(event) => {
                  const source = normalizeBookingSource(event.target.value);
                  updateField("source", source);
                  if (!isChannelPartnerSource(source)) {
                    updateField("channelPartnerId", "");
                    updateField("channelPartner", "");
                  }
                }}
              >
                {[...sourceOptions, !sourceOptions.includes(normalizeBookingSource(bookingForm.source)) ? normalizeBookingSource(bookingForm.source) : ""].filter(Boolean).map((option, index) => (
                  <option key={`${option}-${index}`} value={option}>{option}</option>
                ))}
              </select>
            </label>
            <label className="ubf-confirm-field">
              <span>Channel Partner</span>
              <select
                value={bookingForm.channelPartnerId || ""}
                onChange={(event) => {
                  const selected = channelPartners.find((user) => String(user.id) === event.target.value);
                  updateField("channelPartnerId", event.target.value);
                  updateField("channelPartner", selected ? getUserName(selected) : "");
                  if (selected) {
                    const rera = selected.reraNumber || selected.cpReraNumber || selected.rera || selected.reraNo || "";
                    updateField("cpReraNumber", rera);
                  }
                }}
                disabled={!isChannelPartnerSource(bookingForm.source)}
              >
                <option value="">Select Channel Partner</option>
                {channelPartners.map((user) => (
                  <option key={user.id} value={user.id}>{getUserName(user)}</option>
                ))}
              </select>
            </label>
            {isChannelPartnerSource(bookingForm.source) && (
              <label className="ubf-confirm-field">
                <span>CP RERA Number (Auto-filled from CP Master)</span>
                <input
                  type="text"
                  placeholder="Auto-populated from CP master"
                  value={bookingForm.cpReraNumber || ""}
                  readOnly
                  style={{ backgroundColor: "#f8fafc", cursor: "not-allowed", fontWeight: "600", color: "#334155" }}
                />
              </label>
            )}
          </div>,
          "campaign"
        )}

        <div className="ubf-price-summary-card" style={{ background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "18px", marginTop: "16px", boxShadow: "0 2px 8px rgba(15,23,42,0.04)" }}>
          <h6 style={{ margin: "0 0 14px", fontSize: "16px", fontWeight: "700", color: "#0f172a" }}>PRICE SUMMARY</h6>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px", fontSize: "13.5px", color: "#334155" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Base Rate ({confirmCurrency(closingBaseRateValue)}/sq.ft)</span><strong>{confirmCurrency(closingBaseRateValue * reraAreaValue)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Floor Rise ({confirmCurrency(floorRiseRateValue)} × {floorRiseStepsValue} steps/sq.ft)</span><strong>{confirmCurrency(floorRiseValue)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between" }}><span>Effective Rate ({confirmCurrency(effectiveRate)}/sq.ft)</span><strong>{confirmCurrency(effectiveRate * reraAreaValue)}</strong></div>
            <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #e2e8f0", paddingTop: "10px", fontWeight: "700", fontSize: "15px", color: "#0f172a" }}>
              <span>Agreement Value</span>
              <strong>{confirmCurrency(agreementValue)}</strong>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", fontWeight: "700", fontSize: "16px", color: "#1e40af" }}>
              <span>Final Sold Price</span>
              <strong>{confirmCurrency(allInclusiveValue || agreementValue)}</strong>
            </div>
            {isChannelPartnerSource(bookingForm.source) && (
              <div style={{ display: "flex", justifyContent: "space-between", color: "#2563eb", borderTop: "1px dashed #cbd5e1", paddingTop: "8px", fontSize: "13px", fontWeight: "600" }}>
                <span>Estimated CP Brokerage (2%)</span>
                <strong>{confirmCurrency((agreementValue * 2) / 100)}</strong>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const getBookingDocumentData = () => {
    const bookingReference = bookingForm.bookingName || quotationName || `BKG-${bookingForm.id || Date.now()}`;
    const customerName = bookingForm.customerName || leadName || "-";
    const projectName = bookingForm.projectDetails || selectedUnit.projectName || "-";
    const towerName = selectedTowerName || selectedUnit.towerName || "-";
    const unitName = bookingForm.unit || selectedUnit.name || "-";
    const bookingDate = bookingForm.bookedOn || bookingForm.bookingDate || new Date().toLocaleDateString("en-IN");
    const finalPrice = bookingAllInclusiveAmount;
    const rows = [
      ["Booking Reference", bookingReference],
      ["Customer", customerName],
      ["Project", projectName],
      ["Tower", towerName],
      ["Unit", unitName],
      ["Floor", selectedUnit.floor || "-"],
      ["Booking Date", bookingDate],
      ["Saleable Area", bookingForm.saleableArea || selectedUnit.saleable || "-"],
      ["Carpet Area", bookingForm.carpetArea || selectedUnit.carpet || "-"],
      ["Base Rate", bookingForm.baseRate || selectedUnit.baseRate || "-"],
      ["Closing Base Rate", bookingForm.closingBaseRate || selectedUnit.closingBaseRate || bookingForm.baseRate || selectedUnit.baseRate || "-"],
      ["Agreement Value", confirmCurrency(calculatedPricing.agreementValue)],
      ["Parking Charges", confirmCurrency(calculatedPricing.parkingAmount)],
      ["GST", confirmCurrency(gstAmount)],
      ["Stamp Duty", confirmCurrency(stampDutyAmount)],
      ["All-Inclusive Amount", confirmCurrency(bookingAllInclusiveAmount)],
      ["Final Sold Price", confirmCurrency(finalPrice)],
    ];

    return { bookingReference, customerName, projectName, towerName, unitName, bookingDate, finalPrice, rows };
  };

  const getBookingDocumentHtml = () => {
    const { bookingReference, customerName, projectName, unitName, bookingDate, rows } = getBookingDocumentData();

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking Confirmation</title>
  <style>
    body { color: #172033; font-family: Arial, sans-serif; margin: 0; background: #f6f8fc; }
    .page { background: #fff; margin: 24px auto; max-width: 860px; padding: 52px 56px; }
    .top { align-items: flex-start; display: flex; justify-content: space-between; gap: 24px; }
    .brand { color: #1d2a57; font-size: 34px; font-weight: 900; letter-spacing: .02em; }
    .sub { color: #64748b; font-size: 12px; letter-spacing: .12em; margin-top: 8px; text-transform: uppercase; }
    .ref { color: #0f172a; font-size: 14px; line-height: 1.7; text-align: right; }
    .ref strong { display: block; font-size: 18px; }
    .rule { background: #2458e6; height: 3px; margin: 28px 0 34px; }
    h1 { border-left: 4px solid #2458e6; color: #0f172a; font-size: 26px; margin: 0 0 24px; padding-left: 16px; text-transform: uppercase; }
    .hero { background: #dbeafe; border: 1px solid #a9c7ff; border-radius: 8px; color: #2563eb; margin-bottom: 28px; padding: 24px; text-align: center; }
    .hero strong { display: block; font-size: 28px; margin-bottom: 10px; }
    p { color: #1f2a44; font-size: 15px; line-height: 1.7; margin: 0 0 20px; }
    table { border-collapse: collapse; margin: 24px 0; width: 100%; }
    td { border: 1px solid #d7dde7; padding: 12px 14px; }
    td:first-child { background: #f4f7fb; color: #526070; font-weight: 700; width: 34%; }
    .signature { margin-top: 42px; }
    .signature strong { display: block; margin-top: 42px; }
  </style>
</head>
<body>
  <main class="page">
    <section class="top">
      <div>
        <div class="brand">SWAMI</div>
        <div class="sub">Premium Real Estate CRM · Sales Division</div>
      </div>
      <div class="ref"><strong>${escapeHtml(bookingReference)}</strong>Date: ${escapeHtml(bookingDate)}</div>
    </section>
    <div class="rule"></div>
    <h1>Booking Confirmation Letter</h1>
    <div class="hero"><strong>Your Booking is Confirmed!</strong>Unit selected · Pricing confirmed · Booking recorded</div>
    <p>Dear <strong>${escapeHtml(customerName)}</strong>,</p>
    <p>We are pleased to confirm your booking for unit <strong>${escapeHtml(unitName)}</strong> at <strong>${escapeHtml(projectName)}</strong>. This document records the booking details captured in SWAMI CRM.</p>
    <table>${rows.map(([label, value]) => `<tr><td>${escapeHtml(label)}</td><td>${escapeHtml(value)}</td></tr>`).join("")}</table>
    <p>Please keep this booking confirmation for your records. The project team will coordinate the next documentation and payment steps as per the agreed booking terms.</p>
    <div class="signature">
      <span>For SWAMI Real Estate CRM</span>
      <strong>Authorized Signatory</strong>
      <span>Sales Team</span>
    </div>
  </main>
</body>
</html>`;
  };

  const escapePdfText = (value) => String(value ?? "-").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const getBookingPdfBlob = () => {
    const { bookingReference, customerName, projectName, unitName, bookingDate, rows } = getBookingDocumentData();
    const detailLines = rows.map(([label, value]) => `${label}: ${value}`);
    const bodyLines = [
      `Dear ${customerName},`,
      `Your booking for unit ${unitName} at ${projectName} is confirmed.`,
      "Please keep this document for your records.",
    ];
    const stream = [];
    const text = (content, x, y, size = 11) => {
      stream.push("BT", `/F1 ${size} Tf`, `${x} ${y} Td`, `(${escapePdfText(content)}) Tj`, "ET");
    };
    const rect = (x, y, width, height, color = "0.96 0.98 1") => {
      stream.push(`${color} rg`, `${x} ${y} ${width} ${height} re f`, "0 0 0 rg");
    };
    rect(0, 0, 595, 842, "1 1 1");
    text("SWAMI", 58, 748, 28);
    text("PREMIUM REAL ESTATE CRM - SALES DIVISION", 58, 728, 9);
    text(bookingReference, 420, 748, 13);
    text(`Date: ${bookingDate}`, 420, 728, 10);
    rect(58, 704, 480, 3, "0.14 0.35 0.9");
    text("BOOKING CONFIRMATION LETTER", 74, 662, 20);
    rect(58, 592, 480, 58, "0.86 0.93 1");
    text("Your Booking is Confirmed!", 170, 626, 20);
    text("Unit selected - Pricing confirmed - Booking recorded", 150, 606, 10);
    bodyLines.forEach((line, index) => text(line, 58, 560 - index * 18, 11));
    let y = 482;
    detailLines.forEach((line, index) => {
      if (index % 2 === 0) rect(58, y - 7, 480, 22, "0.96 0.98 1");
      text(line, 72, y, 10);
      y -= 26;
    });
    text("For SWAMI Real Estate CRM", 58, 128, 11);
    text("Authorized Signatory", 58, 86, 12);
    text("Sales Team", 58, 70, 9);
    const content = [
      "q",
      ...stream,
      "Q",
    ].join("\n");
    const objects = [
      "<< /Type /Catalog /Pages 2 0 R >>",
      "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
      "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
      `<< /Length ${content.length} >>\nstream\n${content}\nendstream`,
    ];
    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    objects.forEach((object, index) => {
      offsets.push(pdf.length);
      pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
    });
    const xrefOffset = pdf.length;
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    offsets.slice(1).forEach((offset) => {
      pdf += `${String(offset).padStart(10, "0")} 00000 n \n`;
    });
    pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
    return new Blob([pdf], { type: "application/pdf" });
  };

  const downloadCostSheetExcel = async () => {
    const bookingId = bookingForm.id || bookingForm._id || bookingForm.bookingId;
    if (!bookingId) {
      setCompletionActionMessage("Booking ID not available for Excel generation.");
      return;
    }
    setCompletionActionMessage("Generating Cost Sheet Excel...");
    try {
      const response = await fetch(`${API_URL}/api/bookings/${bookingId}/cost-sheet`, {
        method: 'GET',
        headers: getAuthHeaders()
      });
      if (!response.ok) throw new Error("Failed to fetch cost sheet Excel");
      
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `cost-sheet-${bookingForm.unit || selectedUnit?.name || bookingId}.xlsx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setCompletionActionMessage("Cost Sheet Excel downloaded successfully.");
    } catch (error) {
      console.error("Error downloading cost sheet Excel:", error);
      setCompletionActionMessage("Failed to generate cost sheet Excel.");
    }
  };

  const downloadBookingPdf = async () => {
    const bookingId = bookingForm.id || bookingForm._id || bookingForm.bookingId;
    if (bookingId) {
      setCompletionActionMessage("Opening customer Cost Sheet...");
      const printWindow = window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf`, "_blank");
      if (printWindow) {
        setCompletionActionMessage("Cost Sheet opened successfully.");
        return;
      }
    }
    try {
      const url = URL.createObjectURL(getBookingPdfBlob());
      const link = document.createElement("a");
      link.href = url;
      link.download = `booking-${bookingForm.id || bookingForm.unit || selectedUnit?.name || selectedUnit?.unitName || Date.now()}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setCompletionActionMessage("Booking PDF downloaded successfully.");
    } catch (error) {
      console.error("Error downloading PDF:", error);
      setCompletionActionMessage("Failed to generate PDF.");
    }
  };

  const printBooking = () => {
    setCompletionActionMessage("");
    const bookingId = bookingForm.id || bookingForm._id || bookingForm.bookingId;
    if (bookingId) {
      const printWindow = window.open(`${API_URL}/api/bookings/${bookingId}/cost-sheet/pdf?action=print`, "_blank");
      if (printWindow) {
        setTimeout(() => {
          try {
            printWindow.print();
          } catch (_) {}
        }, 1000);
        return;
      }
    }
    const printWindow = window.open("", "_blank", "noopener,noreferrer");
    if (!printWindow) return;
    printWindow.document.write(getBookingDocumentHtml());
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const showDeferredAction = (channel) => {
    setCompletionActionMessage(`${channel} API will be connected later.`);
  };

  const renderSuccess = () => (
    <div className="ubf-success">
      <div className="ubf-success-illustration">
        <FaCheckCircle />
      </div>
      <h3>Booking Completed</h3>
      <p>Booking Confirmed Successfully</p>
      <div className="sales-sold-price-card">
        <span className="sales-sold-price-label">Final Sold Price</span>
        <strong className="sales-sold-price-value">
          {confirmCurrency(bookingAllInclusiveAmount)}
        </strong>
        <small>
          Agreement Value: {confirmCurrency(calculatedPricing.agreementValue)}
        </small>
      </div>
      <div className="ubf-success-actions">
        <button type="button" className="btn btn-success" style={{ background: "#16a34a", borderColor: "#16a34a", color: "#fff", fontWeight: 700 }} onClick={downloadCostSheetExcel}>
          <FaFileExcel /> Download Cost Sheet (Excel)
        </button>
        <button type="button" onClick={downloadBookingPdf}>
          <FaRegFilePdf /> Download PDF
        </button>
        <button type="button" onClick={printBooking}>
          <FaPrint /> Print Booking
        </button>
        <button type="button" onClick={() => showDeferredAction("WhatsApp")}>
          <FaWhatsapp /> Send WhatsApp
        </button>
        <button type="button" onClick={() => showDeferredAction("Email")}>
          <FaEnvelope /> Send Email
        </button>
        <button type="button" className="primary" onClick={onClose}>Close</button>
      </div>
      {completionActionMessage && <div className="ubf-success-note">{completionActionMessage}</div>}
    </div>
  );

  const stepContent = [
    renderStepOne,
    renderStepTwo,
    renderBookingConfirmation,
  ][bookingStepIndex] || renderStepOne;

  return (
    <div className="ubf-backdrop" role="dialog" aria-modal="true" aria-labelledby="ubf-title">
      <form className="ubf-modal" onSubmit={onSubmit}>
        <header className="ubf-header">
          <div className="ubf-header-left">
            <button
              type="button"
              className="ubf-back-arrow-btn"
              onClick={bookingStepIndex > 0 ? onPrevious : onClose}
              aria-label="Back to lead page"
              title="Back"
            >
              <FaArrowLeft />
            </button>
            <h2 id="ubf-title">Booking Details</h2>
          </div>
          <button type="button" className="ubf-close" onClick={onClose} aria-label="Close booking details">
            <FaTimes />
          </button>
        </header>

        {!bookingSuccess && (
          <div className="sales-booking-stepper" aria-label="Booking progress">
            {(bookingSteps && bookingSteps.length ? bookingSteps : defaultSteps).map((stepTitle, index) => {
              const isComplete = index < bookingStepIndex;
              const isActive = index === bookingStepIndex;
              return (
                <div
                  className={`sales-booking-step${isComplete ? " is-complete" : ""}${isActive ? " is-active" : ""}`}
                  key={stepTitle}
                >
                  <div className="sales-booking-step-dot">
                    {isComplete ? (
                      <svg className="sales-step-check-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    ) : isActive ? (
                      index + 1
                    ) : (
                      <span className="sales-step-dot-small" />
                    )}
                  </div>
                  <div className="sales-booking-step-label">
                    {stepTitle}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {(bookingMessage || bookingProjectMessage) && !bookingSuccess && (
          <div className="ubf-alert">{bookingMessage || bookingProjectMessage}</div>
        )}

        <main className="ubf-body">
          {bookingSuccess ? renderSuccess() : stepContent()}
        </main>

        {!bookingSuccess && (
          <footer className="sales-sticky-booking-footer">
            <div className="sales-booking-footer-lead">
              Booking for <strong>{leadName}</strong>
            </div>
            <div className="ubf-footer-actions">
              {bookingStepIndex > 0 ? (
                <button
                  type="button"
                  className="sales-btn secondary"
                  onClick={onPrevious}
                >
                  ← Previous
                </button>
              ) : (
                <button
                  type="button"
                  className="sales-btn secondary"
                  onClick={onClose}
                >
                  Cancel
                </button>
              )}
              <button
                type="submit"
                className="sales-btn primary"
                disabled={Boolean(isSubmitDisabled)}
              >
                {bookingStepIndex === 0 ? "Next →" : bookingStepIndex === 1 ? "Next →" : "Confirm Booking"}
              </button>
            </div>
          </footer>
        )}
      </form>
    </div>
  );
};

export default UserBookingForm;
