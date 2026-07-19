import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const initialFormData = {
  project: "",
  projectTower: "",
  floorPlanName: "",
  configurationLabel: "",
  status: "Draft",
  unitStream: "Sale Unit",
  possessionDate: "",
  type: "",
  category: "",
  bedrooms: "",
  bathrooms: "",
  balconies: "0",
  kitchenType: "1",
  additionalRooms: [],
  applicableFloorFrom: "",
  applicableFloorTo: "",
  unitPosition: "01",
  skippedFloors: "",
  unitNumbers: "",
  totalUnitsOfPlan: "",
  facing: "",
  cornerUnit: false,
  view: [],
  autoCalc: true,
  measure: "sqft",
  carpetArea: "",
  builtupArea: "",
  saleableArea: "",
  loading: "",
  loadingBasis: "On Carpet",
  balconyArea: "",
  enclosedBalconyUtility: "",
  terraceArea: "",
  flowerBedPocketTerrace: "",
  serviceSlabAcLedge: "",
  refugeAreaShare: "",
  parkingRequired: "No",
  carParkingSlots: "0",
  parkingType: "",
  twoWheelerSlots: "",
  basementStoreroom: "",
  rateBasis: "On Carpet",
  baseRate: "",
  basePrice: "",
  floorRisePerSqft: "",
  baseFloorForFloorRise: "",
  cornerPlcPercent: "",
  viewPlcPercent: "",
  facingPlcPercent: "",
  clubMembership: "",
  infrastructureDevelopmentCharges: "",
  infrastructureDevelopmentChargeBasis: "Lump Sum",
  legalDocumentation: "",
  gstPercent: "5",
  stampDutyPercent: "6",
  registrationAmount: "",
  parkingCharges: "",
  advanceMaintenanceMonths: "",
  maintenanceRatePerSqftPerMonth: "",
  sinkingFundCorpus: "",
  societyFormationCharges: "",
  floorPlanImages: [],
  brochurePageReference: "",
  walkthrough3dLink: "",
  paymentPlan: "",
  allotmentLetterTemplate: "",
  agreementTemplate: "",
};

const typeOptions = ["Residential", "Commercial", "Retail", "Office", "Mixed-Use"];
const categoryOptions = ["Flat", "Penthouse", "Duplex", "Row House", "Villa", "Studio", "Shop", "Showroom", "Office Unit"];
const configurationLabelOptions = ["Studio", "1 BHK", "2 BHK", "3 BHK", "4 BHK", "5 BHK", "2 BHK, 3 BHK Jodi", "Shop", "Office"];
const MAX_FLOOR_PLAN_FILE_BYTES = 25 * 1024 * 1024;
const MAX_FLOOR_PLAN_UPLOAD_BYTES = 120 * 1024 * 1024;

const readApiErrorMessage = async (response, fallback) => {
  const text = await response.text();
  if (!text) {
    return response.status === 413
      ? "Floor plan upload is too large. Please choose a smaller image/PDF."
      : fallback;
  }

  try {
    const result = JSON.parse(text);

    if (typeof result === "string") return result;
    if (result?.message) return result.message;
    if (result?.error) return result.error;
    if (result?.detail) return result.detail;

    return fallback;
  } catch {
    if (response.status === 413 || text.includes("PayloadTooLargeError")) {
      return "Floor plan upload is too large. Please choose a smaller image/PDF.";
    }

    return text;
  }
};
const statusOptions = ["Draft", "Published", "On Hold", "Sold Out", "Withdrawn"];
const unitStreamOptions = ["Sale Unit", "PAAA Member Unit", "Rehab Unit", "Investor"];
const rateBasisOptions = ["On Carpet", "On Saleable", "On Built-up"];

const getTowerWingPrefix = (tower) => {
  return String(tower?.wingCode || "").trim().toUpperCase();
};

const parseStoredSkippedFloors = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (!value) return "";
  const text = String(value).trim();
  if (text.startsWith("[") && text.endsWith("]")) {
    try {
      const parsed = JSON.parse(text);
      return Array.isArray(parsed) ? parsed.join(", ") : "";
    } catch {
      return text;
    }
  }
  return text;
};

const normalizeSkippedFloorsInput = (value, from, to) => {
  const text = String(value || "").trim();
  if (!text) return { floors: [], text: "", error: "" };
  if (!Number.isInteger(from) || !Number.isInteger(to) || from > to) {
    return { floors: [], text, error: "Select a valid applicable floor range before entering skipped floors." };
  }

  const parts = text.split(",");
  const floors = [];

  for (const part of parts) {
    const item = part.trim();
    if (!/^\d+$/.test(item)) {
      return { floors: [], text, error: `Skipped floors must contain unique whole floor numbers between ${from} and ${to}.` };
    }

    const floor = Number(item);
    if (floor < from || floor > to) {
      return { floors: [], text, error: `Skipped floors must contain unique whole floor numbers between ${from} and ${to}.` };
    }

    floors.push(floor);
  }

  const uniqueFloors = Array.from(new Set(floors)).sort((a, b) => a - b);
  return { floors: uniqueFloors, text: uniqueFloors.join(", "), error: "" };
};

const parseUnitPositions = (value) =>
  Array.from(new Set(String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((item) => {
      const position = Number(item);
      if (!Number.isInteger(position) || position < 0 || position > 99) return "";
      return String(position).padStart(2, "0");
    })
    .filter(Boolean)));

const getGeneratedUnitNumbers = ({ from, to, unitPosition, skippedFloors, tower }) => {
  if (from === null || to === null || from > to) return [];

  const positions = parseUnitPositions(unitPosition);
  if (!positions.length) return [];

  const wingPrefix = getTowerWingPrefix(tower);
  if (!wingPrefix) return [];

  const skippedFloorSet = new Set(skippedFloors);
  const units = [];

  for (let floor = from; floor <= to; floor += 1) {
    if (skippedFloorSet.has(floor)) continue;
    positions.forEach((positionLabel) => {
      units.push(`${wingPrefix}-${floor}${positionLabel}`);
    });
  }

  return units;
};

const AddFloorplan = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const isEditMode = Boolean(id);

  const [formData, setFormData] = useState(initialFormData);
  const [projects, setProjects] = useState([]);
  const [towers, setTowers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [loadingTowers, setLoadingTowers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingFloorPlan, setLoadingFloorPlan] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);
  const [isCloneMode, setIsCloneMode] = useState(false);

  const measures = [
    { value: "sqft", label: "Sq. Ft." },
    { value: "sqm", label: "Sq. M." },
  ];

  const toNumberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  };

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.value)) return data.value;
    return [];
  };

  const formatDateForInput = (value) => {
    if (!value) return "";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "";
    return date.toISOString().slice(0, 10);
  };

  const mapFloorPlanToFormData = (plan) => ({
    ...initialFormData,
    project: plan.projectId ?? plan.project?.id ?? "",
    projectTower: plan.towerId ?? plan.tower?.id ?? "",
    floorPlanName: plan.name || "",
    configurationLabel: plan.configurationLabel || "",
    status: plan.status === "Active" ? "Published" : plan.status || "Draft",
    unitStream: plan.unitStream || "Sale Unit",
    possessionDate: formatDateForInput(plan.possessionDate),
    type: plan.type || "",
    category: plan.category || "",
    bedrooms: plan.bedrooms ?? "",
    bathrooms: plan.bathrooms ?? "",
    balconies: plan.balconies ?? "0",
    kitchenType: plan.kitchenType || "1",
    additionalRooms: normalizeList(plan.additionalRooms),
    applicableFloorFrom: plan.applicableFloorFrom ?? "",
    applicableFloorTo: plan.applicableFloorTo ?? "",
    unitPosition: plan.unitPosition || "01",
    skippedFloors: parseStoredSkippedFloors(plan.skippedFloors),
    unitNumbers: plan.unitNumbers || "",
    totalUnitsOfPlan: plan.totalUnitsOfPlan ?? "",
    facing: plan.facing || "",
    cornerUnit: Boolean(plan.cornerUnit),
    view: normalizeList(plan.view),
    autoCalc: plan.autoCalc ?? true,
    measure: plan.measure || "sqft",
    carpetArea: plan.carpet ?? "",
    builtupArea: plan.builtupArea ?? "",
    saleableArea: plan.saleable ?? "",
    loading: plan.loading ?? "",
    loadingBasis: plan.loadingBasis || "On Carpet",
    balconyArea: plan.balconyArea ?? "",
    enclosedBalconyUtility: plan.enclosedBalconyUtility ?? "",
    terraceArea: plan.terraceArea ?? "",
    flowerBedPocketTerrace: plan.flowerBedPocketTerrace ?? "",
    serviceSlabAcLedge: plan.serviceSlabAcLedge ?? "",
    refugeAreaShare: plan.refugeAreaShare ?? "",
    parkingRequired: plan.parkingRequired || "No",
    carParkingSlots: plan.carParkingSlots ?? "0",
    parkingType: plan.parkingType || "",
    twoWheelerSlots: plan.twoWheelerSlots ?? "",
    basementStoreroom: plan.basementStoreroom ?? "",
    rateBasis: plan.rateBasis || "On Carpet",
    baseRate: plan.baseRate ?? "",
    basePrice: plan.basePrice ?? "",
    floorRisePerSqft: plan.floorRisePerSqft ?? "",
    baseFloorForFloorRise: plan.baseFloorForFloorRise ?? "",
    cornerPlcPercent: plan.cornerPlcPercent ?? "",
    viewPlcPercent: plan.viewPlcPercent ?? "",
    facingPlcPercent: plan.facingPlcPercent ?? "",
    clubMembership: plan.clubMembership ?? "",
    infrastructureDevelopmentCharges: plan.infrastructureDevelopmentCharges ?? "",
    infrastructureDevelopmentChargeBasis: plan.infrastructureDevelopmentChargeBasis || "Lump Sum",
    legalDocumentation: plan.legalDocumentation ?? "",
    gstPercent: plan.gstPercent ?? "5",
    stampDutyPercent: plan.stampDutyPercent ?? "6",
    registrationAmount: plan.registrationAmount ?? "",
    parkingCharges: plan.parkingCharges ?? "",
    advanceMaintenanceMonths: plan.advanceMaintenanceMonths ?? "",
    maintenanceRatePerSqftPerMonth: plan.maintenanceRatePerSqftPerMonth ?? "",
    sinkingFundCorpus: plan.sinkingFundCorpus ?? "",
    societyFormationCharges: plan.societyFormationCharges ?? "",
    floorPlanImages: normalizeList(plan.floorPlanImages),
    brochurePageReference: plan.brochurePageReference || "",
    walkthrough3dLink: plan.walkthrough3dLink || "",
    paymentPlan: plan.paymentPlan || "",
    allotmentLetterTemplate: plan.allotmentLetterTemplate || "",
    agreementTemplate: plan.agreementTemplate || "",
  });

  const selectedTower = useMemo(
    () => towers.find((tower) => String(tower.id) === String(formData.projectTower)),
    [formData.projectTower, towers]
  );
  const skippedFloorValidation = useMemo(() => {
    const from = toNumberOrNull(formData.applicableFloorFrom);
    const to = toNumberOrNull(formData.applicableFloorTo);
    return normalizeSkippedFloorsInput(formData.skippedFloors, from, to);
  }, [formData.applicableFloorFrom, formData.applicableFloorTo, formData.skippedFloors]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        setError("");

        const projectResponse = await fetch(`${API_URL}/projects/list`);

        if (!projectResponse.ok) throw new Error("Unable to load projects");

        const projectData = await projectResponse.json();

        setProjects(normalizeList(projectData));
        setTowers([]);
      } catch (err) {
        console.error(err);
        setTowers([]);
        setError(err.message || "Unable to load form options");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [API_URL]);

  useEffect(() => {
    const fetchProjectTowers = async () => {
      if (!formData.project) {
        setTowers([]);
        setFormData((prev) => ({ ...prev, projectTower: "" }));
        return;
      }

      try {
        setLoadingTowers(true);
        const response = await fetch(`${API_URL}/tower/list?projectId=${formData.project}`);
        if (!response.ok) throw new Error("Unable to load project towers");

        const towerData = await response.json();
        setTowers(normalizeList(towerData));
      } catch (err) {
        console.error(err);
        setTowers([]);
        setError(err.message || "Unable to load project towers");
      } finally {
        setLoadingTowers(false);
      }
    };

    fetchProjectTowers();
  }, [API_URL, formData.project]);

  useEffect(() => {
    const fetchFloorPlan = async () => {
      if (!id) {
        setFormData(initialFormData);
        return;
      }

      try {
        setLoadingFloorPlan(true);
        setError("");
        const response = await fetch(`${API_URL}/floor/${id}`);
        if (!response.ok) {
          const message = await readApiErrorMessage(response, "Unable to load floor plan");
          throw new Error(message);
        }

        const plan = await response.json();
        if (!plan || typeof plan === "string") throw new Error("Floor plan not found");
        setFormData(mapFloorPlanToFormData(plan));
        setIsCloneMode(false);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load floor plan");
      } finally {
        setLoadingFloorPlan(false);
      }
    };

    fetchFloorPlan();
  // The mapper only normalizes the fetched record into form state; rerunning this
  // effect for its function identity would refetch on every render.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [API_URL, id]);

  const computed = useMemo(() => {
    const finiteNumber = (value) => (Number.isFinite(value) ? value : 0);
    const carpet = toNumberOrNull(formData.carpetArea) || 0;
    const builtup = toNumberOrNull(formData.builtupArea) || 0;
    const manualSaleable = toNumberOrNull(formData.saleableArea) || 0;
    const loading = toNumberOrNull(formData.loading) || 0;
    const baseRate = toNumberOrNull(formData.baseRate) || 0;
    const basisArea = formData.loadingBasis === "On Built-up" ? builtup : carpet;
    const saleable = formData.autoCalc && basisArea ? basisArea * (1 + loading / 100) : manualSaleable;
    const rateArea =
      formData.rateBasis === "On Saleable"
        ? saleable
        : formData.rateBasis === "On Built-up"
          ? builtup
          : carpet;
    const basePrice = baseRate && rateArea ? baseRate * rateArea : 0;
    const plcPercent =
      (formData.cornerUnit ? toNumberOrNull(formData.cornerPlcPercent) || 0 : 0) +
      (toNumberOrNull(formData.viewPlcPercent) || 0) +
      (toNumberOrNull(formData.facingPlcPercent) || 0);
    const plcAmount = basePrice * (plcPercent / 100);
    const agreementValue =
      basePrice +
      plcAmount +
      (toNumberOrNull(formData.infrastructureDevelopmentCharges) || 0) +
      (toNumberOrNull(formData.legalDocumentation) || 0);
    const registration = toNumberOrNull(formData.registrationAmount) || 0;
    const taxes =
      agreementValue * ((toNumberOrNull(formData.gstPercent) || 0) / 100) +
      agreementValue * ((toNumberOrNull(formData.stampDutyPercent) || 0) / 100) +
      registration;
    const allInclusive =
      agreementValue +
      taxes +
      (toNumberOrNull(formData.parkingCharges) || 0) +
      (toNumberOrNull(formData.societyFormationCharges) || 0);

    return {
      carpet: finiteNumber(carpet),
      saleable: finiteNumber(Number(saleable.toFixed(2))),
      basePrice: finiteNumber(Number(basePrice.toFixed(2))),
      allInclusive: finiteNumber(Number(allInclusive.toFixed(2))),
    };
  }, [formData]);

  const generatedUnitNumbers = useMemo(() => {
    const from = toNumberOrNull(formData.applicableFloorFrom);
    const to = toNumberOrNull(formData.applicableFloorTo);
    return getGeneratedUnitNumbers({
      from,
      to,
      skippedFloors: skippedFloorValidation.error ? [] : skippedFloorValidation.floors,
      unitPosition: formData.unitPosition,
      tower: selectedTower,
    });
  }, [
    formData.applicableFloorFrom,
    formData.applicableFloorTo,
    skippedFloorValidation,
    formData.unitPosition,
    selectedTower,
  ]);

  useEffect(() => {
    const generatedUnitNumbersText = generatedUnitNumbers.join(", ");

    setFormData((prev) => {
      if (prev.unitNumbers === generatedUnitNumbersText) {
        return prev;
      }

      return {
        ...prev,
        unitNumbers: generatedUnitNumbersText,
      };
    });
  }, [generatedUnitNumbers]);

  const handleChange = async (event) => {
    const { name, value, type, checked, selectedOptions, files } = event.target;

    if (type === "file") {
      const selectedFiles = Array.from(files || []);
      const oversizedFile = selectedFiles.find((file) => file.size > MAX_FLOOR_PLAN_FILE_BYTES);
      const totalFileSize = selectedFiles.reduce((total, file) => total + file.size, 0);

      if (oversizedFile || totalFileSize > MAX_FLOOR_PLAN_UPLOAD_BYTES) {
        event.target.value = "";
        setFormData((prev) => ({
          ...prev,
          [name]: Array.isArray(prev[name]) ? prev[name].filter((item) => !(item instanceof File)) : [],
        }));
        setError(
          oversizedFile
            ? `${oversizedFile.name} is too large. Maximum file size is ${formatFileSize(MAX_FLOOR_PLAN_FILE_BYTES)}.`
            : `Selected files are too large. Maximum total upload size is ${formatFileSize(MAX_FLOOR_PLAN_UPLOAD_BYTES)}.`
        );
        return;
      }

      setError("");
      setFormData((prev) => ({
        ...prev,
        [name]: [
          ...(Array.isArray(prev[name]) ? prev[name].filter((item) => !(item instanceof File)) : []),
          ...selectedFiles,
        ],
      }));
      return;
    }

    if (event.target.multiple) {
      setFormData((prev) => ({
        ...prev,
        [name]: Array.from(selectedOptions).map((option) => option.value),
      }));
      return;
    }

    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
      ...(name === "project" ? { projectTower: "" } : {}),
      ...(name === "projectTower" && !prev.skippedFloors
        ? { skippedFloors: parseStoredSkippedFloors(towers.find((tower) => String(tower.id) === String(value))?.skippedFloors) }
        : {}),
    }));
  };

  const handleClone = () => {
    setFormData((prev) => ({
      ...prev,
      floorPlanName: prev.floorPlanName ? `${prev.floorPlanName} Copy` : "",
      status: "Draft",
    }));
    setIsCloneMode(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    const from = toNumberOrNull(formData.applicableFloorFrom);
    const to = toNumberOrNull(formData.applicableFloorTo);
    const carpet = toNumberOrNull(formData.carpetArea);
    const builtup = toNumberOrNull(formData.builtupArea);
    const saleable = computed.saleable || toNumberOrNull(formData.saleableArea);
    const loading = toNumberOrNull(formData.loading);
    const towerTotalFloors = toNumberOrNull(selectedTower?.totalFloor ?? selectedTower?.totalFloors);

    if (from !== null && to !== null && from > to) return "Applicable Floor From must be less than or equal to Applicable Floor To";
    if (from !== null && from < 1) return "Applicable Floor From must be at least 1";
    if (to !== null && to < 1) return "Applicable Floor To must be at least 1";
    if (towerTotalFloors !== null && towerTotalFloors < 1) return "Selected tower must have Total Floors set to at least 1 before adding floor plans.";
    if (towerTotalFloors !== null && to !== null && to > towerTotalFloors) {
      return `Applicable Floor To cannot exceed this tower's Total Floors (${towerTotalFloors}).`;
    }
    if (skippedFloorValidation.error) return skippedFloorValidation.error;
    if (formData.projectTower && !getTowerWingPrefix(selectedTower)) return "Selected tower needs a Wing Code before unit numbers can be generated.";
    if (formData.projectTower && !generatedUnitNumbers.length) return "Unit numbers could not be generated. Check floor range and unit position.";
    if (loading !== null && (loading < 0 || loading > 100)) return "Loading % must be between 0 and 100";
    if (carpet !== null && builtup !== null && saleable !== null && !(carpet < builtup && builtup < saleable)) {
      return "RERA Carpet must be less than Built-up Area and Built-up Area must be less than Saleable Area";
    }
    if (Number(formData.gstPercent) > 18) return "GST % cannot exceed 18";
    if (Number(formData.stampDutyPercent) > 10) return "Stamp Duty % cannot exceed 10";
    if (formData.status === "Published" && !formData.floorPlanImages.length) return "Floor Plan Image is required before publishing";
    return "";
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const validationError = validateForm();
    if (validationError) {
      setError(validationError);
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      name: formData.floorPlanName.trim(),
      projectId: toNumberOrNull(formData.project),
      towerId: toNumberOrNull(formData.projectTower),
      configurationLabel: formData.configurationLabel.trim(),
      status: formData.status,
      unitStream: formData.unitStream,
      possessionDate: formData.possessionDate,
      type: formData.type,
      category: formData.category,
      bedrooms: toNumberOrNull(formData.bedrooms),
      bathrooms: toNumberOrNull(formData.bathrooms),
      balconies: toNumberOrNull(formData.balconies),
      kitchenType: formData.kitchenType,
      additionalRooms: formData.additionalRooms,
      applicableFloorFrom: toNumberOrNull(formData.applicableFloorFrom),
      applicableFloorTo: toNumberOrNull(formData.applicableFloorTo),
      unitPosition: formData.unitPosition,
      skippedFloors: skippedFloorValidation.floors,
      unitNumbers: generatedUnitNumbers.join(", "),
      totalUnitsOfPlan: generatedUnitNumbers.length,
      facing: formData.facing,
      cornerUnit: formData.cornerUnit,
      view: formData.view,
      autoCalc: formData.autoCalc,
      measure: formData.measure,
      carpet: toNumberOrNull(formData.carpetArea),
      builtupArea: toNumberOrNull(formData.builtupArea),
      saleable: formData.autoCalc ? computed.saleable : toNumberOrNull(formData.saleableArea),
      loading: toNumberOrNull(formData.loading),
      loadingBasis: formData.loadingBasis,
      balconyArea: toNumberOrNull(formData.balconyArea),
      enclosedBalconyUtility: toNumberOrNull(formData.enclosedBalconyUtility),
      terraceArea: toNumberOrNull(formData.terraceArea),
      flowerBedPocketTerrace: toNumberOrNull(formData.flowerBedPocketTerrace),
      serviceSlabAcLedge: toNumberOrNull(formData.serviceSlabAcLedge),
      refugeAreaShare: toNumberOrNull(formData.refugeAreaShare),
      parkingRequired: formData.parkingRequired,
      carParkingSlots: toNumberOrNull(formData.carParkingSlots),
      parkingType: formData.parkingType,
      twoWheelerSlots: toNumberOrNull(formData.twoWheelerSlots),
      basementStoreroom: toNumberOrNull(formData.basementStoreroom),
      rateBasis: formData.rateBasis,
      baseRate: toNumberOrNull(formData.baseRate),
      basePrice: computed.basePrice,
      floorRisePerSqft: toNumberOrNull(formData.floorRisePerSqft),
      baseFloorForFloorRise: toNumberOrNull(formData.baseFloorForFloorRise),
      cornerPlcPercent: toNumberOrNull(formData.cornerPlcPercent),
      viewPlcPercent: toNumberOrNull(formData.viewPlcPercent),
      facingPlcPercent: toNumberOrNull(formData.facingPlcPercent),
      clubMembership: toNumberOrNull(formData.clubMembership),
      infrastructureDevelopmentCharges: toNumberOrNull(formData.infrastructureDevelopmentCharges),
      infrastructureDevelopmentChargeBasis: formData.infrastructureDevelopmentChargeBasis,
      legalDocumentation: toNumberOrNull(formData.legalDocumentation),
      gstPercent: toNumberOrNull(formData.gstPercent),
      stampDutyPercent: toNumberOrNull(formData.stampDutyPercent),
      registrationAmount: toNumberOrNull(formData.registrationAmount),
      parkingCharges: toNumberOrNull(formData.parkingCharges),
      advanceMaintenanceMonths: toNumberOrNull(formData.advanceMaintenanceMonths),
      maintenanceRatePerSqftPerMonth: toNumberOrNull(formData.maintenanceRatePerSqftPerMonth),
      sinkingFundCorpus: toNumberOrNull(formData.sinkingFundCorpus),
      societyFormationCharges: toNumberOrNull(formData.societyFormationCharges),
      floorPlanImages: formData.floorPlanImages.filter((item) => !(item instanceof File)),
      brochurePageReference: formData.brochurePageReference.trim(),
      walkthrough3dLink: formData.walkthrough3dLink.trim(),
      paymentPlan: formData.paymentPlan,
      allotmentLetterTemplate: formData.allotmentLetterTemplate,
      agreementTemplate: formData.agreementTemplate,
    };

    try {
      const requestBody = new FormData();
      Object.entries(payload).forEach(([key, value]) => {
        if (Array.isArray(value) || (value && typeof value === "object")) {
          requestBody.append(key, JSON.stringify(value));
        } else if (value !== undefined && value !== null) {
          requestBody.append(key, value);
        } else {
          requestBody.append(key, "");
        }
      });
      formData.floorPlanImages
        .filter((item) => item instanceof File)
        .forEach((file) => requestBody.append("floorPlanImages", file));

      const shouldCreate = !isEditMode || isCloneMode;
      const response = await fetch(shouldCreate ? `${API_URL}/floor` : `${API_URL}/floor/${id}`, {
        method: shouldCreate ? "POST" : "PATCH",
        body: requestBody,
      });

      if (!response.ok) {
        const message = await readApiErrorMessage(
          response,
          `Failed to ${shouldCreate ? "create" : "update"} floor plan (${response.status})`
        );
        throw new Error(message);
      }

      window.alert(`Floor plan ${shouldCreate ? "created" : "updated"} successfully!`);
      navigate("/floorplans", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while saving floor plan");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MasterLayout>
      <div className="lead-page">
        <div className="lead-container">
          <Breadcrumb title={isEditMode ? "Edit Floor Plan" : "Add Floor Plan"} />
          {/* <p className="lead-title">Add Floor Plan</p> */}

          <div className="lead-tabs">
            <button type="button" className="active">Floor Plan Details</button>
          </div>

          {error && <div className="unit-alert">{error}</div>}

          {formData.unitStream === "PAAA Member Unit" && (
            <div className="floorplan-warning">
              Costing is usually optional for PAAA Member Units.
            </div>
          )}

          {loadingFloorPlan ? (
            <div className="section-card">Loading floor plan...</div>
          ) : (
          <form onSubmit={handleSubmit} className="lead-form floorplan-form">
            <div className="floorplan-layout">
              <div className="floorplan-main">
              <Section title="Header / Identity">
                <div className="lead-grid">
                  <SelectField label="PROJECT *" name="project" value={formData.project} onChange={handleChange} required disabled={loadingOptions}>
                    <option value="">{loadingOptions ? "Loading projects..." : "Select a Project"}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                  </SelectField>

                  <SelectField
                    label="PROJECT TOWER *"
                    name="projectTower"
                    value={formData.projectTower}
                    onChange={handleChange}
                    required
                    disabled={!formData.project || loadingTowers}
                  >
                    <option value="">
                      {!formData.project
                        ? "Select project first"
                        : loadingTowers
                          ? "Loading towers..."
                          : "Select a Project Tower"}
                    </option>
                    {towers.map((tower) => (
                      <option key={tower.id} value={tower.id}>
                        {tower.name}{tower.wingCode ? ` (${tower.wingCode})` : ""}
                      </option>
                    ))}
                  </SelectField>
                  <InputField label="FLOOR PLAN NAME *" name="floorPlanName" value={formData.floorPlanName} onChange={handleChange} required />
                  <SelectField label="CONFIGURATION LABEL *" name="configurationLabel" value={formData.configurationLabel} onChange={handleChange} required options={configurationLabelOptions} />
                  <SelectField label="STATUS *" name="status" value={formData.status} onChange={handleChange} required options={statusOptions} />
                  <SelectField label="UNIT STREAM *" name="unitStream" value={formData.unitStream} onChange={handleChange} required options={unitStreamOptions} />
                  <InputField label="POSSESSION DATE" name="possessionDate" type="date" value={formData.possessionDate} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Details / Configuration">
                <div className="lead-grid">
                  <SelectField label="TYPE *" name="type" value={formData.type} onChange={handleChange} required options={typeOptions} />
                  <SelectField label="CATEGORY *" name="category" value={formData.category} onChange={handleChange} required options={categoryOptions} />
                  <InputField label="BEDROOMS *" name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} required />
                  <InputField label="BATHROOMS *" name="bathrooms" type="number" step="0.5" value={formData.bathrooms} onChange={handleChange} required />
                  <InputField label="BALCONIES *" name="balconies" type="number" value={formData.balconies} onChange={handleChange} required />
                    <InputField label="KITCHEN" name="kitchenType" type="number" value={formData.kitchenType} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Position & Inventory">
                <div className="lead-grid">
                  <InputField label="APPLICABLE FLOOR FROM *" name="applicableFloorFrom" type="number" min="1" value={formData.applicableFloorFrom} onChange={handleChange} required />
                  <InputField label="APPLICABLE FLOOR TO *" name="applicableFloorTo" type="number" min="1" max={selectedTower?.totalFloor || selectedTower?.totalFloors || undefined} value={formData.applicableFloorTo} onChange={handleChange} required />
                  <InputField label="UNIT POSITION(S) *" name="unitPosition" value={formData.unitPosition} onChange={handleChange} placeholder="01, 02, 03, 04" required />
                  <InputField
                    label="SKIPPED FLOORS"
                    name="skippedFloors"
                    value={formData.skippedFloors}
                    onChange={handleChange}
                    placeholder="Example: 13, 14"
                    helperText="Units will not be generated for these floors."
                    error={skippedFloorValidation.error}
                  />
                  <GeneratedUnitsField units={generatedUnitNumbers} />
                  <InputField
                    label="TOTAL UNITS OF THIS PLAN"
                    name="totalUnitsOfPlan"
                    type="number"
                    value={generatedUnitNumbers.length}
                    onChange={() => {}}
                    disabled
                  />
                </div>
              </Section>

              <Section title="Areas">
                <div className="floorplan-toggle-row">
                  <CheckboxField label="AUTO-CALC" name="autoCalc" checked={formData.autoCalc} onChange={handleChange} inline />
                  <span>Auto-calc uses Loading % to derive Saleable Area.</span>
                </div>
                <div className="lead-grid">
                  <SelectField label="MEASURE *" name="measure" value={formData.measure} onChange={handleChange} required>
                    {measures.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </SelectField>
                  <InputWithSuffix label="RERA CARPET AREA *" name="carpetArea" value={formData.carpetArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} required />
                  <InputWithSuffix label="BUILT-UP AREA" name="builtupArea" value={formData.builtupArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                  <InputField label="LOADING %" name="loading" type="number" min="0" max="100" value={formData.loading} onChange={handleChange} disabled={!formData.autoCalc} />
                  <SelectField label="LOADING BASIS" name="loadingBasis" value={formData.loadingBasis} onChange={handleChange} disabled={!formData.autoCalc} options={["On Carpet", "On Built-up"]} />
                  <InputWithSuffix label="SALEABLE AREA *" name="saleableArea" value={formData.autoCalc ? computed.saleable : formData.saleableArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} required disabled={formData.autoCalc} />
                  <InputWithSuffix label="BALCONY AREA" name="balconyArea" value={formData.balconyArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                </div>
              </Section>

              <Section title="Parking & Extras">
                <div className="lead-grid">
                  <SelectField label="PARKING REQUIRED *" name="parkingRequired" value={formData.parkingRequired} onChange={handleChange} required options={["Yes", "No"]} />
                </div>
              </Section>

              <Section title="Costing">
                <div className="lead-grid">
                  <SelectField label="RATE BASIS *" name="rateBasis" value={formData.rateBasis} onChange={handleChange} required options={rateBasisOptions} />
                  <InputField label="BASE RATE *" name="baseRate" type="number" value={formData.baseRate} onChange={handleChange} required />
                  <InputField label="BASE PRICE AT BASE FLOOR" name="basePrice" type="number" value={computed.basePrice} onChange={() => {}} disabled />
                  <InputField label="FLOOR RISE / SQFT" name="floorRisePerSqft" type="number" value={formData.floorRisePerSqft} onChange={handleChange} />
                  <InputField label="BASE FLOOR FOR FLOOR RISE" name="baseFloorForFloorRise" type="number" value={formData.baseFloorForFloorRise} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Other Charges">
                <div className="lead-grid">
                  <InputField label="STAMP DUTY (%)" name="stampDutyPercent" type="number" value={formData.stampDutyPercent} onChange={handleChange} required />
                  <InputField label="GST % *" name="gstPercent" type="number" value={formData.gstPercent} onChange={handleChange} required />
                  <InputField label="REGISTRATION CHARGES (INR)" name="registrationAmount" type="number" value={formData.registrationAmount} onChange={handleChange} required />
                  <InputField label="LEGAL CHARGES (INR)" name="legalDocumentation" type="number" value={formData.legalDocumentation} onChange={handleChange} />
                  <InputField label="DEVELOPMENT CHARGES (INR)" name="infrastructureDevelopmentCharges" type="number" value={formData.infrastructureDevelopmentCharges} onChange={handleChange} />
                  <InputField label="SOCIETY FORMATION CHARGES" name="societyFormationCharges" type="number" value={formData.societyFormationCharges} onChange={handleChange} />
                  <InputField label="PARKING CHARGES (INR)" name="parkingCharges" type="number" value={formData.parkingCharges} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Documents & Media">
                <div className="lead-grid">
                  <FileField label="FLOOR PLAN IMAGE" name="floorPlanImages" onChange={handleChange} required={formData.status === "Published" && !formData.floorPlanImages.length} />
                  <InputField label="BROCHURE PAGE REFERENCE" name="brochurePageReference" value={formData.brochurePageReference} onChange={handleChange} />
                  <InputField label="3D WALKTHROUGH LINK" name="walkthrough3dLink" type="url" value={formData.walkthrough3dLink} onChange={handleChange} />
                </div>
              </Section>

              <div className="lead-buttons floorplan-buttons">
                <button type="button" className="lead-cancel" onClick={handleClone}>
                  Clone
                </button>
                <button type="button" className="lead-cancel" onClick={() => setShowPreview(true)}>
                  Preview Cost Sheet
                </button>
                <button type="submit" className="lead-save" disabled={saving}>
                  {saving ? "Saving..." : isEditMode && !isCloneMode ? "Update Floor Plan" : "Save Floor Plan"}
                </button>
                <button type="button" className="lead-cancel" onClick={() => navigate("/floorplans")}>
                  Cancel
                </button>
              </div>
              </div>

              <aside className="floorplan-summary">
                <div className="section-card">
                  <h6>Computed Summary at Base Floor</h6>
                  <SummaryRow label="Carpet" value={`${computed.carpet || 0} ${areaSuffix(formData.measure)}`} />
                  <SummaryRow label="Saleable" value={`${computed.saleable || 0} ${areaSuffix(formData.measure)}`} />
                  <SummaryRow label="Base Price at Base Floor" value={formatMoney(computed.basePrice)} />
                  <SummaryRow label="All-Inclusive" value={formatMoney(computed.allInclusive)} highlight />
                </div>
              </aside>
            </div>
          </form>
          )}
        </div>

        {showPreview && (
          <div className="modal d-block" tabIndex="-1" style={{ background: "rgba(15, 23, 42, 0.45)" }}>
            <div className="modal-dialog modal-lg modal-dialog-centered">
              <div className="modal-content border-0 radius-12">
                <div className="modal-header">
                  <h5 className="modal-title">Preview Cost Sheet</h5>
                  <button type="button" className="btn-close" onClick={() => setShowPreview(false)} />
                </div>
                <div className="modal-body">
                  <SummaryRow label="Floor Plan" value={formData.floorPlanName || "-"} />
                  <SummaryRow label="Configuration" value={formData.configurationLabel || "-"} />
                  <SummaryRow label="Rate Basis" value={formData.rateBasis} />
                  <SummaryRow label="Base Price at Base Floor" value={formatMoney(computed.basePrice)} />
                  <SummaryRow label="All-Inclusive" value={formatMoney(computed.allInclusive)} highlight />
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MasterLayout>
  );
};

const areaSuffix = (measure) => (measure === "sqm" ? "Sq. m." : "Sq. ft.");

const formatFileSize = (bytes) => `${Math.round(bytes / (1024 * 1024))} MB`;

const formatMoney = (value) =>
  new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);

const Section = ({ title, children }) => (
  <div className="section-wrapper">
    <div className="section-header">
      <span className="section-header-label">{title}</span>
    </div>
    <div className="section-card">
      {children}
    </div>
  </div>
);

const FieldShell = ({ label, children, helperText, error }) => (
  <div className="lead-group">
    <label>{label}</label>
    {children}
    {helperText && <small className="floorplan-helper-text">{helperText}</small>}
    {error && <small className="floorplan-field-error">{error}</small>}
  </div>
);

const InputField = ({ label, name, value, onChange, type = "text", step, min, max, placeholder, required, disabled, helperText, error }) => (
  <FieldShell label={label} helperText={helperText} error={error}>
    <input
      type={type}
      step={step}
      min={min}
      max={max}
      name={name}
      value={value}
      onChange={onChange}
      placeholder={placeholder || label.replace(" *", "")}
      required={required}
      disabled={disabled}
    />
  </FieldShell>
);

const SelectField = ({ label, name, value, onChange, children, options, required, disabled }) => (
  <FieldShell label={label}>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    >
      {children || (
        <>
          <option value="">Select</option>
          {options.map((option) => (
            <option key={option} value={option}>{option}</option>
          ))}
        </>
      )}
    </select>
  </FieldShell>
);

const GeneratedUnitsField = ({ units }) => (
  <div className="lead-group lead-full">
    <label>UNIT NUMBERS</label>
    <div className="floorplan-generated-units">
      {units.length ? (
        units.map((unit) => (
          <span key={unit}>{unit}</span>
        ))
      ) : (
        <em>Select tower, floor range, and unit position(s)</em>
      )}
    </div>
  </div>
);

const CheckboxField = ({ label, name, checked, onChange, inline = false }) => (
  <div className={inline ? "floorplan-checkbox-inline" : "lead-group floorplan-checkbox"}>
    <label>
      <input type="checkbox" name={name} checked={checked} onChange={onChange} />
      {label}
    </label>
  </div>
);

const InputWithSuffix = ({ label, name, value, onChange, suffix, required, disabled }) => (
  <FieldShell label={label}>
    <div className="unit-input-group">
      <input
        type="number"
        name={name}
        value={value}
        onChange={onChange}
        placeholder={label.replace(" *", "")}
        required={required}
        disabled={disabled}
      />
      <span>{suffix}</span>
    </div>
  </FieldShell>
);

const FileField = ({ label, name, onChange, required }) => (
  <FieldShell label={label}>
    <input
      type="file"
      name={name}
      onChange={onChange}
      accept=".png,.jpg,.jpeg,.pdf"
      multiple
      required={required}
    />
  </FieldShell>
);

const SummaryRow = ({ label, value, highlight }) => (
  <div className={`d-flex justify-content-between border-bottom py-2 ${highlight ? "text-primary fw-bold" : ""}`}>
    <span>{label}</span>
    <strong>{value}</strong>
  </div>
);

export default AddFloorplan;
