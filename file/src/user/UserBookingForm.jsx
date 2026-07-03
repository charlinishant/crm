import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  FaCheckCircle,
  FaEllipsisV,
  FaEnvelope,
  FaPen,
  FaPrint,
  FaRegFilePdf,
  FaTimes,
  FaWhatsapp,
} from "react-icons/fa";
import "./UserBookingForm.css";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const defaultSteps = [
  "Filter Project",
  "Select Unit",
  "Booking Confirmation",
];

const chipGroups = {
  propertyPurpose: ["Sale", "Resale", "Rental"],
  unitType: ["Residential", "Commercial", "Plot"],
  propertyType: ["Villa", "Bungalow", "Apartment", "Penthouse", "Duplex", "Shops", "Office space", "Na plot"],
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

const getProjectName = (project) =>
  project?.name || project?.projectName || project?.project_name || project?.title || "";

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

const flattenDatabaseUnits = (unitGroups = []) =>
  unitGroups.flatMap((group) => {
    const models = Array.isArray(group?.unitList) && group.unitList.length ? group.unitList : [group];
    return models.map((unit, index) => ({
      id: unit?.id || group?.id || unit?.name,
      groupId: group?.id,
      name: unit?.name || group?.name || `Unit ${index + 1}`,
      floor: unit?.floor || group?.floor?.name || group?.floor || "-",
      unitIndex: unit?.unitIndex,
      carpet: group?.carpet || unit?.carpet || group?.floor?.carpet || "-",
      builtupArea: group?.builtupArea || unit?.builtupArea || group?.floor?.builtupArea || "",
      saleable: group?.saleable || unit?.saleable || group?.floor?.saleable || "-",
      rateBasis: group?.rateBasis || unit?.rateBasis || group?.floor?.rateBasis || "On Carpet",
      bedrooms: group?.bedrooms || unit?.bedrooms || "-",
      bathrooms: group?.bathrooms || unit?.bathrooms || "-",
      baseRate: unit?.baseRate || group?.baseRate || "",
      basePrice: unit?.basePrice || group?.basePrice || "",
      floorRise: unit?.floorRise || group?.floorRise || "",
      guidelineValue: unit?.guidelineValue || group?.guidelineValue || unit?.guideline_value || group?.guideline_value || "",
      developmentInvoice: unit?.developmentInvoice || group?.developmentInvoice || unit?.development_invoice || group?.development_invoice || "",
      agreementValue: unit?.agreementValue || group?.agreementValue || unit?.agreement_value || group?.agreement_value || "",
      totalPrice: unit?.totalPrice || group?.totalPrice || unit?.total_price || group?.total_price || "",
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
      projectId: group?.project?.id || group?.projectId || "",
      projectName: getProjectName(group?.project),
      towerId: group?.tower?.id || group?.towerId || "",
      towerName: group?.tower?.name || group?.towerName || "Tower",
      image: getImageSource(
        unit?.image ||
          unit?.unitImage ||
          unit?.images ||
          group?.image ||
          group?.unitImage ||
          group?.images ||
          group?.floor?.floorPlanImages
      ),
      status:
        String(unit?.status || group?.status || unit?.unitStatus || group?.unitStatus || "")
          .toLowerCase()
          .replace(/\s+/g, "-") || "available",
    }));
  });

const normalizeUnitStatus = (status) => {
  const value = String(status || "available").toLowerCase();
  if (["booked", "sold", "unavailable"].includes(value)) return "booked";
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
  onMarkInterested,
  onFieldChange,
}) => {
  const [interestedUnits, setInterestedUnits] = useState(new Set());
  const [filters, setFilters] = useState({
    propertyPurpose: "Sale",
    unitType: "Residential",
    propertyType: "Apartment",
  });
  const [completionActionMessage, setCompletionActionMessage] = useState("");
  const [bookingProjects, setBookingProjects] = useState([]);
  const [projectTowers, setProjectTowers] = useState([]);
  const [databaseUnitGroups, setDatabaseUnitGroups] = useState([]);
  const [isLoadingCatalog, setIsLoadingCatalog] = useState(false);
  const [isProjectMenuOpen, setIsProjectMenuOpen] = useState(false);
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
        const [projectsResponse, unitsResponse] = await Promise.all([
          fetch(`${API_URL}/projects`),
          fetch(`${API_URL}/unit?limit=1000`),
        ]);

        const projectsResult = projectsResponse.ok ? await projectsResponse.json() : [];
        const unitsResult = unitsResponse.ok ? await unitsResponse.json() : {};

        if (!isMounted) return;

        setBookingProjects(Array.isArray(projectsResult) ? projectsResult : projectsResult?.data || []);
        setDatabaseUnitGroups(Array.isArray(unitsResult) ? unitsResult : unitsResult?.data || []);
      } catch (error) {
        console.error("Unable to load booking project catalog:", error);
        if (isMounted) {
          setBookingProjects([]);
          setDatabaseUnitGroups([]);
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
          fetch(`${API_URL}/tower/list?projectId=${selectedProjectId}`),
          fetch(`${API_URL}/unit?limit=1000&projectId=${selectedProjectId}`),
        ]);

        const towerResult = towerResponse.ok ? await towerResponse.json() : [];
        const unitResult = unitResponse.ok ? await unitResponse.json() : {};

        if (!isMounted) return;

        setProjectTowers(Array.isArray(towerResult) ? towerResult : []);
        setDatabaseUnitGroups(Array.isArray(unitResult) ? unitResult : unitResult?.data || []);
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

    if (selectedProjectId || selectedProjectName) return realUnits;
    return realUnits.length ? realUnits : unitSeed;
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
  const filteredCatalogUnits = useMemo(
    () =>
      selectedTowerId
        ? catalogUnits.filter((unit) => String(unit.towerId || unit.towerName || "Tower") === selectedTowerId)
        : catalogUnits,
    [catalogUnits, selectedTowerId]
  );
  const selectedTowerName =
    towerOptions.find((tower) => String(tower.id) === String(selectedTowerId))?.name || "";

  const selectedUnit = useMemo(() => {
    return (
      filteredCatalogUnits.find((unit) => unit.name === bookingForm.unit) ||
      filteredCatalogUnits.find((unit) => unit.status === "selected") ||
      filteredCatalogUnits[0] ||
      unitSeed[0]
    );
  }, [bookingForm.unit, filteredCatalogUnits]);

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

    if (value === "__lead_project__") {
      updateField("projectId", "");
      return;
    }

    const project = bookingProjects.find((item) => String(item.id) === String(value));
    updateField("projectId", value);
    updateField("projectDetails", getProjectName(project));
    updateField("unit", "");
    updateField("unitId", "");
    setSelectedTowerId("");
  };

  const selectUnit = (unit) => {
    if (["booked", "blocked", "refuge", "investor"].includes(normalizeUnitStatus(unit.status))) return;
    updateField("unit", unit.name);
    updateField("unitId", unit.id || unit.name);
    updateField("saleableArea", unit.saleable);
    updateField("carpetArea", unit.carpet);
    updateField("builtupArea", unit.builtupArea || "");
    updateField("rateBasis", unit.rateBasis || "On Carpet");
    updateField("baseRate", unit.baseRate || bookingForm.baseRate || "");
    const calculatedBasePrice =
      calculateBasePriceForRateBasis({
        baseRate: unit.baseRate || bookingForm.baseRate,
        rateBasis: unit.rateBasis || bookingForm.rateBasis,
        carpet: unit.carpet,
        builtupArea: unit.builtupArea,
        saleable: unit.saleable,
      }) || unit.basePrice || bookingForm.basePrice || "";
    updateField("basePrice", calculatedBasePrice);
    updateField("agreementValue", unit.agreementValue || calculatedBasePrice || bookingForm.agreementValue || "");
    updateField("totalPrice", unit.totalPrice || unit.agreementValue || calculatedBasePrice || bookingForm.totalPrice || "");
  };

  const markInterested = () => {
    if (bookingForm.unit) {
      setInterestedUnits((current) => new Set(current).add(bookingForm.unit));
    }
    onMarkInterested?.();
  };

  const submitLabel = isSavingBooking
    ? "Saving..."
    : isLoadingBookingProject
      ? "Loading..."
      : bookingStepIndex === 0
        ? "Next"
        : bookingStepIndex === 1
          ? "Continue to Confirmation"
          : "Confirm Booking";

  const isSubmitDisabled =
    isSavingBooking ||
    isLoadingBookingProject ||
    (bookingStepIndex === 0 && !bookingForm.projectDetails) ||
    (bookingStepIndex === 1 && !bookingForm.unit) ||
    (bookingStepIndex === 2 && !bookingForm.customerName && !leadName);

  const floorGroups = Array.from(new Set(filteredCatalogUnits.map((unit) => unit.floor))).sort((a, b) => Number(b) - Number(a));
  const quotationName = [
    bookingForm.projectDetails || selectedUnit.projectName,
    selectedTowerName || selectedUnit.towerName,
    selectedUnit.name,
  ].filter(Boolean).join(" - ");
  const baseRateValue = toNumber(bookingForm.baseRate, toNumber(selectedUnit.baseRate, 7750));
  const saleableValue = toNumber(bookingForm.saleableArea, toNumber(selectedUnit.saleable, 0));
  const carpetValue = toNumber(bookingForm.carpetArea, toNumber(selectedUnit.carpet, 0));
  const builtupValue = toNumber(bookingForm.builtupArea, toNumber(selectedUnit.builtupArea, 0));
  const rateBasisValue = bookingForm.rateBasis || selectedUnit.rateBasis || "On Carpet";
  const floorRiseValue = firstNumber(bookingForm.floorRise, selectedUnit.floorRise);
  const basePriceValue = calculateBasePriceForRateBasis({
    baseRate: baseRateValue,
    rateBasis: rateBasisValue,
    carpet: carpetValue,
    builtupArea: builtupValue,
    saleable: saleableValue,
  });
  const guidelineValue = firstNumber(bookingForm.guidelineValue, selectedUnit.guidelineValue);
  const developmentInvoiceValue = firstNumber(bookingForm.developmentInvoice, selectedUnit.developmentInvoice);
  const agreementOriginalValue =
    firstNumber(bookingForm.agreementValue, selectedUnit.agreementValue) ||
    basePriceValue + guidelineValue + developmentInvoiceValue;
  const defaultCostRows = useMemo(
    () => [
      { type: "section", serial: "1.", name: "Basic Details" },
      { serial: "1.a", name: "Base Rate", originalValue: baseRateValue, costType: "Discount", inputField: 0, highlight: true },
      { serial: "1.b", name: "Floor Rise", originalValue: floorRiseValue, costType: "Discount", inputField: 0 },
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
      .filter((row) => !["Base Rate", "Floor Rise", "Total Price"].includes(row.name))
      .reduce((total, row) => total + toNumber(row.newValue, 0), 0) ||
    agreementValue;
  const unitStatusCounts = filteredCatalogUnits.reduce(
    (counts, unit) => {
      const status = normalizeUnitStatus(unit.status);
      counts[status] = (counts[status] || 0) + 1;
      return counts;
    },
    { all: filteredCatalogUnits.length, available: 0, booked: 0, blocked: 0, refuge: 0, investor: 0 }
  );
  const effectiveRate = saleableValue ? Math.round(agreementValue / saleableValue) : baseRateValue;
  const selectedProject = bookingProjects.find((project) => String(project.id) === selectedProjectId);
  const hasLeadProjectOption =
    bookingForm.projectDetails && !bookingProjects.some((project) => getProjectName(project) === bookingForm.projectDetails);
  const projectSelectLabel = isLoadingCatalog
    ? "Loading projects..."
    : selectedProjectId
      ? getProjectName(selectedProject) || bookingForm.projectDetails || "Select Project"
      : bookingForm.projectDetails || (bookingProjects.length ? "Select Project" : "No projects found");

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
        .filter((row) => !["Base Rate", "Floor Rise", "Total Price"].includes(row.name))
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
            {bookingProjects.map((project) => (
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
            {hasLeadProjectOption && (
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
            <span>{key.replace(/([A-Z])/g, " $1")}</span>
            <div className="ubf-chip-row">
              {values.slice(0, key === "propertyType" ? 8 : 3).map((value) => (
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
            ["booked", "Booked"],
            ["blocked", "Blocked"],
            ["refuge", "Refuge"],
            ["investor", "Investor"],
          ].map(([key, label]) => (
            <span key={key}>
              <b>{unitStatusCounts[key] || 0}</b> {label}
            </span>
          ))}
        </div>

        <div className="ubf-floor-grid">
          {filteredCatalogUnits.length === 0 && (
            <div className="ubf-unit-empty">No units found for this project tower.</div>
          )}
          {floorGroups.map((floor) => (
            <React.Fragment key={floor}>
              <div className="ubf-floor-label">Floor {floor}</div>
              <div className="ubf-units-line">
                {filteredCatalogUnits.filter((unit) => unit.floor === floor).map((unit) => {
                  const status = normalizeUnitStatus(unit.status);
                  const tone = bookingForm.unit === unit.name ? "selected" : interestedUnits.has(unit.name) ? "interested" : status;
                  const isLocked = ["booked", "blocked", "refuge", "investor"].includes(status);
                  return (
                    <button
                      type="button"
                      key={`${unit.id}-${unit.name}`}
                      className={`ubf-unit-cell ${tone}`}
                      onClick={() => selectUnit(unit)}
                      disabled={isLocked}
                      title={`Flat no: ${unit.name}`}
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
                      <b>Flat no : {unit.name}</b>
                      <FaEllipsisV aria-hidden="true" />
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
        <select value={bookingForm[name] || value || ""} onChange={(event) => updateField(name, event.target.value)}>
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
          value={bookingForm[name] || value || ""}
          onChange={(event) => updateField(name, event.target.value)}
        />
      )}
    </label>
  );

  const renderConfirmSection = (title, children, className = "") => (
    <section className={`ubf-confirm-section ${className}`}>
      <h3>{title}</h3>
      <div className="ubf-confirm-section-body">{children}</div>
    </section>
  );

  const renderStepFour = () => {
    const bookingDate = bookingForm.bookingDate || new Date().toLocaleDateString("en-GB");
    const applicantName = bookingForm.customerName || leadName || "-";
    const applicantEmail = bookingForm.email || "-";
    const applicantPhone = bookingForm.phone || "-";
    const companyOptions = ["select", bookingForm.companyName || applicantName].filter(Boolean);
    const numberOfSeatsValue = toNumber(bookingForm.numberOfSeats);
    const perSeatPriceValue = toNumber(bookingForm.perSeatPrice);
    const calculatedMonthlyRevenue =
      numberOfSeatsValue && perSeatPriceValue ? String(numberOfSeatsValue * perSeatPriceValue) : "";

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
              ["Base Rate", `₹ ${(baseRateValue / 1000).toFixed(1).replace(/\.0$/, "")}K (${baseRateValue.toLocaleString("en-IN")})`],
              ["Floor Rise", bookingForm.floorRise || 0],
              ["Effective Rate", effectiveRate.toLocaleString("en-IN")],
              ["Total Price", compactCurrency(allInclusiveValue)],
              ["Agreement Value", compactCurrency(agreementValue)],
            ].map(([label, value]) => (
              <div className="ubf-confirm-fact" key={label}>
                <span>{label}</span>
                <strong>{value}</strong>
              </div>
            ))}
            {renderConfirmField({ label: "Booking Name", name: "bookingName", value: applicantName })}
            {renderConfirmField({ label: "Booking Date", name: "bookingDate", value: bookingDate })}
          </div>
        )}

        {renderConfirmSection(
          "Applicant Details",
          <>
            <div className="ubf-applicant-grid">
              {[
                ["Name", applicantName],
                ["Lead Name", leadName || applicantName],
                ["Phone", applicantPhone],
                ["DOB", bookingForm.dob || "-"],
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
            <div className="ubf-add-row">+ Add New Co-Applicant</div>
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
            {renderConfirmField({
              label: "Source",
              name: "source",
              type: "select",
              value: bookingForm.source || "Bulk Marketing",
              options: ["Bulk Marketing", "Referral", "Channel Partner", bookingForm.source].filter(Boolean),
            })}
            {renderConfirmField({
              label: "Sub Source",
              name: "subSource",
              type: "select",
              value: bookingForm.subSource || "Enter Sub Source",
              options: ["Enter Sub Source", "WhatsApp", "Call", bookingForm.subSource].filter(Boolean),
            })}
            {renderConfirmField({
              label: "Channel Partner",
              name: "channelPartner",
              type: "select",
              value: bookingForm.channelPartner || "Select Channel Partner",
              options: ["Select Channel Partner", "Direct", bookingForm.channelPartner].filter(Boolean),
            })}
          </div>,
          "campaign"
        )}

        {renderConfirmSection(
          "Custom Fields",
          <div className="ubf-confirm-form-grid">
            {renderConfirmField({ label: "Company Name", name: "companyName", type: "select", value: bookingForm.companyName || "select", options: companyOptions })}
            {renderConfirmField({ label: "Number Of Seats", name: "numberOfSeats" })}
            {renderConfirmField({ label: "Physical Seats", name: "physicalSeats" })}
            {renderConfirmField({ label: "Carpet Area", name: "carpetArea", value: carpetValue.toLocaleString("en-IN") })}
            {renderConfirmField({ label: "Tenure In Months", name: "tenureMonths" })}
            {renderConfirmField({ label: "Per Seat Price", name: "perSeatPrice" })}
            {renderConfirmField({ label: "Monthly Revenue", name: "monthlyRevenue", value: calculatedMonthlyRevenue })}
            {renderConfirmField({ label: "Notice Period In Months", name: "noticePeriodMonths" })}
            {renderConfirmField({ label: "Lock In Period", name: "lockInPeriod" })}
            {renderConfirmField({ label: "Security Deposit", name: "securityDeposit" })}
            {renderConfirmField({ label: "Lease Start Date", name: "leaseStartDate", disabled: true, clearable: true })}
            {renderConfirmField({ label: "Lease End Date", name: "leaseEndDate", disabled: true, clearable: true })}
          </div>,
          "custom-fields"
        )}
      </div>
    );
  };

  const getBookingDocumentHtml = () => {
    const rows = [
      ["Booking Reference", bookingForm.bookingName || quotationName || "Booking"],
      ["Customer", bookingForm.customerName || leadName || "-"],
      ["Project", bookingForm.projectDetails || selectedUnit.projectName || "-"],
      ["Tower", selectedTowerName || selectedUnit.towerName || "-"],
      ["Unit", bookingForm.unit || selectedUnit.name || "-"],
      ["Floor", selectedUnit.floor || "-"],
      ["Booking Date", bookingForm.bookedOn || bookingForm.bookingDate || new Date().toLocaleDateString("en-IN")],
      ["Saleable Area", bookingForm.saleableArea || selectedUnit.saleable || "-"],
      ["Base Rate", bookingForm.baseRate || selectedUnit.baseRate || "-"],
      ["Final Price", bookingForm.totalPrice || bookingForm.basePrice || allInclusiveValue || "-"],
    ];

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>Booking Confirmation</title>
  <style>
    body { color: #172033; font-family: Arial, sans-serif; margin: 32px; }
    h1 { font-size: 24px; margin: 0 0 4px; }
    p { color: #64748b; margin: 0 0 24px; }
    table { border-collapse: collapse; width: 100%; }
    td { border: 1px solid #d7dde7; padding: 10px 12px; }
    td:first-child { background: #f4f7fb; color: #526070; font-weight: 700; width: 34%; }
  </style>
</head>
<body>
  <h1>Booking Confirmation</h1>
  <p>Booking Confirmed Successfully</p>
  <table>${rows.map(([label, value]) => `<tr><td>${label}</td><td>${value}</td></tr>`).join("")}</table>
</body>
</html>`;
  };

  const escapePdfText = (value) => String(value ?? "-").replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");

  const getBookingPdfBlob = () => {
    const rows = [
      "Booking Confirmation",
      "Booking Confirmed Successfully",
      "",
      `Booking Reference: ${bookingForm.bookingName || quotationName || "Booking"}`,
      `Customer: ${bookingForm.customerName || leadName || "-"}`,
      `Project: ${bookingForm.projectDetails || selectedUnit.projectName || "-"}`,
      `Tower: ${selectedTowerName || selectedUnit.towerName || "-"}`,
      `Unit: ${bookingForm.unit || selectedUnit.name || "-"}`,
      `Floor: ${selectedUnit.floor || "-"}`,
      `Booking Date: ${bookingForm.bookedOn || bookingForm.bookingDate || new Date().toLocaleDateString("en-IN")}`,
      `Saleable Area: ${bookingForm.saleableArea || selectedUnit.saleable || "-"}`,
      `Base Rate: ${bookingForm.baseRate || selectedUnit.baseRate || "-"}`,
      `Final Price: ${bookingForm.totalPrice || bookingForm.basePrice || allInclusiveValue || "-"}`,
    ];
    const content = [
      "BT",
      "/F1 18 Tf",
      "50 790 Td",
      `(${escapePdfText(rows[0])}) Tj`,
      "/F1 11 Tf",
      ...rows.slice(1).flatMap((line, index) => [
        `0 -${index === 0 ? 26 : 18} Td`,
        `(${escapePdfText(line)}) Tj`,
      ]),
      "ET",
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

  const downloadBookingPdf = () => {
    setCompletionActionMessage("");
    const blob = getBookingPdfBlob();
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `booking-${bookingForm.unit || selectedUnit.name || Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const printBooking = () => {
    setCompletionActionMessage("");
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
      <div className="ubf-success-actions">
        <button type="button" onClick={downloadBookingPdf}><FaRegFilePdf /> Download Booking PDF</button>
        <button type="button" onClick={printBooking}><FaPrint /> Print Booking</button>
        <button type="button" onClick={() => showDeferredAction("WhatsApp")}><FaWhatsapp /> Send WhatsApp</button>
        <button type="button" onClick={() => showDeferredAction("Email")}><FaEnvelope /> Send Email</button>
        <button type="button" className="primary" onClick={onClose}>Close</button>
      </div>
      {completionActionMessage && <div className="ubf-success-note">{completionActionMessage}</div>}
    </div>
  );

  const stepContent = [
    renderStepOne,
    renderStepTwo,
    renderStepFour,
  ][bookingStepIndex] || renderStepOne;

  return (
    <div className="ubf-backdrop" role="dialog" aria-modal="true" aria-labelledby="ubf-title">
      <form className="ubf-modal" onSubmit={onSubmit}>
        <header className="ubf-header">
          <h2 id="ubf-title">Booking Details</h2>
          <button type="button" className="ubf-close" onClick={onClose} aria-label="Close booking details">
            <FaTimes />
          </button>
        </header>

        {!bookingSuccess && (
          <div className="ubf-stepper" aria-label="Booking progress">
            {bookingSteps.map((step, index) => (
              <div
                className={`ubf-step-item${index < bookingStepIndex ? " complete" : ""}${index === bookingStepIndex ? " active" : ""}`}
                key={step}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{step}</strong>
              </div>
            ))}
          </div>
        )}

        {(bookingMessage || bookingProjectMessage) && !bookingSuccess && (
          <div className="ubf-alert">{bookingMessage || bookingProjectMessage}</div>
        )}

        <main className="ubf-body">
          {bookingSuccess ? renderSuccess() : stepContent()}
        </main>

        {!bookingSuccess && (
          <footer className="ubf-footer">
            <div className="ubf-footer-note">
              Booking for <span>{leadName}</span>
            </div>
            <div className="ubf-footer-actions">
              <button type="button" className="ghost" onClick={bookingStepIndex === 0 ? onClose : onPrevious}>
                {bookingStepIndex === 0 ? "Cancel" : "Previous"}
              </button>
              {bookingStepIndex === 1 && (
                <button type="button" className="ghost" onClick={markInterested}>
                  Mark Interested
                </button>
              )}
              <button type="submit" className="primary" disabled={isSubmitDisabled}>
                {submitLabel}
              </button>
            </div>
          </footer>
        )}
      </form>
    </div>
  );
};

export default UserBookingForm;
