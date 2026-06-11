import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const fallbackTowers = [
  { id: 1, name: "TOWER D", project: "Binghatti Hills" },
  { id: 2, name: "TOWER E", project: "Binghatti Hills" },
  { id: 3, name: "Aa", project: "Binghatti Hills" },
  { id: 4, name: "A", project: "Binghatti Hills" },
  { id: 5, name: "Default Tower", project: "Nyati Baner" },
  { id: 6, name: "Towe", project: "Binghatti Hills" },
  { id: 7, name: "Default Tower", project: "Lodha Greens" },
  { id: 8, name: "Default Tower", project: "ABC" },
  { id: 9, name: "Default Tower", project: "Vasant utsav" },
  { id: 10, name: "T1", project: "Binghatti Hills" },
  { id: 11, name: "Default Tower", project: "Adhinn PG" },
];

const initialFormData = {
  project: "",
  projectTower: "",
  floorPlanName: "",
  configurationLabel: "",
  status: "Draft",
  unitStream: "Sale Unit",
  reraReference: "",
  type: "",
  category: "",
  bedrooms: "",
  bathrooms: "",
  balconies: "0",
  kitchenType: "",
  additionalRooms: [],
  applicableFloorFrom: "",
  applicableFloorTo: "",
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
  registrationPercent: "1",
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
const categoryOptions = ["Apartment", "Penthouse", "Duplex", "Row House", "Villa", "Studio", "Shop", "Showroom", "Office Unit"];
const statusOptions = ["Draft", "Active", "On Hold", "Sold Out", "Withdrawn"];
const unitStreamOptions = ["Sale Unit", "PAAA Member Unit", "Rehab Unit"];
const kitchenTypeOptions = ["Separate", "Open", "Island", "Kitchenette"];
const additionalRoomOptions = ["Pooja Room", "Store Room", "Servant Room", "Powder Room", "Study", "Home Office", "Walk-in Wardrobe"];
const facingOptions = ["N", "S", "E", "W", "NE", "NW", "SE", "SW"];
const viewOptions = ["Sea View", "Garden View", "Pool View", "Road View", "Internal", "Skyline"];
const loadingBasisOptions = ["On Carpet", "On Built-up"];
const parkingTypeOptions = ["Covered Stilt", "Open", "Mechanical Stack", "Podium", "Basement"];
const rateBasisOptions = ["On Carpet", "On Saleable", "On Built-up"];
const paymentPlanOptions = ["CLP", "Possession-Linked", "Subvention", "Custom"];
const templateOptions = ["", "Sale Agreement", "PAAA Template", "Standard Allotment Letter", "Custom Template"];

const AddFloorplan = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [formData, setFormData] = useState(initialFormData);
  const [projects, setProjects] = useState([]);
  const [towers, setTowers] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showPreview, setShowPreview] = useState(false);

  const measures = [
    { value: "sqft", label: "Sq. Ft." },
    { value: "sqm", label: "Sq. M." },
  ];

  const toNumberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  };

  const readStoredTowers = () => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("projectTowers") || "[]");
      return Array.isArray(stored) && stored.length ? stored : fallbackTowers;
    } catch {
      return fallbackTowers;
    }
  };

  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.value)) return data.value;
    return [];
  };

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoadingOptions(true);
        setError("");

        const [projectResponse, towerResponse] = await Promise.all([
          fetch(`${API_URL}/projects/list`),
          fetch(`${API_URL}/tower/list`),
        ]);

        if (!projectResponse.ok) throw new Error("Unable to load projects");
        if (!towerResponse.ok) throw new Error("Unable to load project towers");

        const projectData = await projectResponse.json();
        const towerData = await towerResponse.json();
        const backendTowers = normalizeList(towerData);

        setProjects(normalizeList(projectData));
        setTowers(backendTowers.length ? backendTowers : readStoredTowers());
      } catch (err) {
        console.error(err);
        setTowers(readStoredTowers());
        setError(err.message || "Unable to load form options");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchOptions();
  }, [API_URL]);

  const computed = useMemo(() => {
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
    const basePrice = formData.autoCalc && rateArea ? baseRate * rateArea : toNumberOrNull(formData.basePrice) || 0;
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
    const registration = Math.min(agreementValue * ((toNumberOrNull(formData.registrationPercent) || 0) / 100), 30000);
    const taxes =
      agreementValue * ((toNumberOrNull(formData.gstPercent) || 0) / 100) +
      agreementValue * ((toNumberOrNull(formData.stampDutyPercent) || 0) / 100) +
      registration;
    const maintenance =
      (toNumberOrNull(formData.advanceMaintenanceMonths) || 0) *
      (toNumberOrNull(formData.maintenanceRatePerSqftPerMonth) || 0) *
      (saleable || carpet);
    const allInclusive =
      agreementValue +
      taxes +
      maintenance +
      (toNumberOrNull(formData.clubMembership) || 0) +
      (toNumberOrNull(formData.sinkingFundCorpus) || 0) +
      (toNumberOrNull(formData.societyFormationCharges) || 0);

    return {
      carpet,
      saleable: Number(saleable.toFixed(2)),
      basePrice: Number(basePrice.toFixed(2)),
      allInclusive: Number(allInclusive.toFixed(2)),
    };
  }, [formData]);

  const handleChange = async (event) => {
    const { name, value, type, checked, selectedOptions, files } = event.target;

    if (type === "file") {
      const selectedFiles = Array.from(files || []);
      const encodedFiles = await Promise.all(
        selectedFiles.map(async (file) => ({
          name: file.name,
          type: file.type,
          size: file.size,
          dataUrl: await readFileAsDataUrl(file),
        }))
      );

      setFormData((prev) => ({
        ...prev,
        [name]: encodedFiles,
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
    }));
  };

  const handleClone = () => {
    setFormData((prev) => ({
      ...prev,
      floorPlanName: prev.floorPlanName ? `${prev.floorPlanName} Copy` : "",
      status: "Draft",
    }));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const validateForm = () => {
    const from = toNumberOrNull(formData.applicableFloorFrom);
    const to = toNumberOrNull(formData.applicableFloorTo);
    const carpet = toNumberOrNull(formData.carpetArea);
    const builtup = toNumberOrNull(formData.builtupArea);
    const saleable = computed.saleable || toNumberOrNull(formData.saleableArea);
    const loading = toNumberOrNull(formData.loading);

    if (from !== null && to !== null && from > to) return "Applicable Floor From must be less than or equal to Applicable Floor To";
    if (loading !== null && (loading < 0 || loading > 100)) return "Loading % must be between 0 and 100";
    if (carpet !== null && builtup !== null && saleable !== null && !(carpet < builtup && builtup < saleable)) {
      return "RERA Carpet must be less than Built-up Area and Built-up Area must be less than Saleable Area";
    }
    if (Number(formData.gstPercent) > 18) return "GST % cannot exceed 18";
    if (Number(formData.stampDutyPercent) > 10) return "Stamp Duty % cannot exceed 10";
    if (formData.status === "Active" && !formData.floorPlanImages.length) return "Floor Plan Image is required before status can be Active";
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
      reraReference: formData.reraReference.trim(),
      type: formData.type,
      category: formData.category,
      bedrooms: toNumberOrNull(formData.bedrooms),
      bathrooms: toNumberOrNull(formData.bathrooms),
      balconies: toNumberOrNull(formData.balconies),
      kitchenType: formData.kitchenType,
      additionalRooms: formData.additionalRooms,
      applicableFloorFrom: toNumberOrNull(formData.applicableFloorFrom),
      applicableFloorTo: toNumberOrNull(formData.applicableFloorTo),
      unitNumbers: formData.unitNumbers.trim(),
      totalUnitsOfPlan: toNumberOrNull(formData.totalUnitsOfPlan),
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
      carParkingSlots: toNumberOrNull(formData.carParkingSlots),
      parkingType: formData.parkingType,
      twoWheelerSlots: toNumberOrNull(formData.twoWheelerSlots),
      basementStoreroom: toNumberOrNull(formData.basementStoreroom),
      rateBasis: formData.rateBasis,
      baseRate: toNumberOrNull(formData.baseRate),
      basePrice: formData.autoCalc ? computed.basePrice : toNumberOrNull(formData.basePrice),
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
      registrationPercent: toNumberOrNull(formData.registrationPercent),
      advanceMaintenanceMonths: toNumberOrNull(formData.advanceMaintenanceMonths),
      maintenanceRatePerSqftPerMonth: toNumberOrNull(formData.maintenanceRatePerSqftPerMonth),
      sinkingFundCorpus: toNumberOrNull(formData.sinkingFundCorpus),
      societyFormationCharges: toNumberOrNull(formData.societyFormationCharges),
      floorPlanImages: formData.floorPlanImages,
      brochurePageReference: formData.brochurePageReference.trim(),
      walkthrough3dLink: formData.walkthrough3dLink.trim(),
      paymentPlan: formData.paymentPlan,
      allotmentLetterTemplate: formData.allotmentLetterTemplate,
      agreementTemplate: formData.agreementTemplate,
    };

    try {
      const response = await fetch(`${API_URL}/floor`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(result?.message || "Failed to create floor plan");
      }

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
          <Breadcrumb title="Add Floor Plan" />
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
                  <SelectField label="PROJECT TOWER *" name="projectTower" value={formData.projectTower} onChange={handleChange} required disabled={loadingOptions}>
                    <option value="">{loadingOptions ? "Loading towers..." : "Select a Project Tower"}</option>
                    {towers.map((tower) => (
                      <option key={tower.id} value={tower.id}>{tower.name}</option>
                    ))}
                  </SelectField>
                  <InputField label="FLOOR PLAN NAME *" name="floorPlanName" value={formData.floorPlanName} onChange={handleChange} required />
                  <InputField label="CONFIGURATION LABEL *" name="configurationLabel" value={formData.configurationLabel} onChange={handleChange} placeholder="2 BHK, 3 BHK Jodi" required />
                  <SelectField label="STATUS *" name="status" value={formData.status} onChange={handleChange} required options={statusOptions} />
                  <SelectField label="UNIT STREAM *" name="unitStream" value={formData.unitStream} onChange={handleChange} required options={unitStreamOptions} />
                  <InputField label="RERA REFERENCE" name="reraReference" value={formData.reraReference} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Details / Configuration">
                <div className="lead-grid">
                  <SelectField label="TYPE *" name="type" value={formData.type} onChange={handleChange} required options={typeOptions} />
                  <SelectField label="CATEGORY *" name="category" value={formData.category} onChange={handleChange} required options={categoryOptions} />
                  <InputField label="BEDROOMS *" name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} required />
                  <InputField label="BATHROOMS *" name="bathrooms" type="number" step="0.5" value={formData.bathrooms} onChange={handleChange} required />
                  <InputField label="BALCONIES *" name="balconies" type="number" value={formData.balconies} onChange={handleChange} required />
                  <SelectField label="KITCHEN TYPE" name="kitchenType" value={formData.kitchenType} onChange={handleChange} options={kitchenTypeOptions} />
                  <MultiSelectField label="ADDITIONAL ROOMS" name="additionalRooms" value={formData.additionalRooms} onChange={handleChange} options={additionalRoomOptions} />
                </div>
              </Section>

              <Section title="Position & Inventory">
                <div className="lead-grid">
                  <InputField label="APPLICABLE FLOOR FROM *" name="applicableFloorFrom" type="number" value={formData.applicableFloorFrom} onChange={handleChange} required />
                  <InputField label="APPLICABLE FLOOR TO *" name="applicableFloorTo" type="number" value={formData.applicableFloorTo} onChange={handleChange} required />
                  <InputField label="UNIT NUMBERS" name="unitNumbers" value={formData.unitNumbers} onChange={handleChange} placeholder="A-101, A-201, A-301" />
                  <InputField label="TOTAL UNITS OF THIS PLAN *" name="totalUnitsOfPlan" type="number" value={formData.totalUnitsOfPlan} onChange={handleChange} required />
                  <SelectField label="FACING *" name="facing" value={formData.facing} onChange={handleChange} required options={facingOptions} />
                  <CheckboxField label="CORNER UNIT" name="cornerUnit" checked={formData.cornerUnit} onChange={handleChange} />
                  <MultiSelectField label="VIEW" name="view" value={formData.view} onChange={handleChange} options={viewOptions} />
                </div>
              </Section>

              <Section title="Areas">
                <div className="floorplan-toggle-row">
                  <CheckboxField label="AUTO-CALC" name="autoCalc" checked={formData.autoCalc} onChange={handleChange} inline />
                  <span>Computed fields lock when Auto-calc is on.</span>
                </div>
                <div className="lead-grid">
                  <SelectField label="MEASURE *" name="measure" value={formData.measure} onChange={handleChange} required>
                    {measures.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </SelectField>
                  <InputWithSuffix label="RERA CARPET AREA *" name="carpetArea" value={formData.carpetArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} required />
                  <InputWithSuffix label="BUILT-UP AREA" name="builtupArea" value={formData.builtupArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                  <InputWithSuffix label="SALEABLE AREA *" name="saleableArea" value={formData.autoCalc ? computed.saleable : formData.saleableArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} required disabled={formData.autoCalc} />
                  <InputWithSuffix label="LOADING % *" name="loading" value={formData.loading} onChange={handleChange} suffix="%" required />
                  <SelectField label="LOADING BASIS *" name="loadingBasis" value={formData.loadingBasis} onChange={handleChange} required options={loadingBasisOptions} />
                  <InputWithSuffix label="BALCONY AREA" name="balconyArea" value={formData.balconyArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                  <InputWithSuffix label="ENCLOSED BALCONY / UTILITY" name="enclosedBalconyUtility" value={formData.enclosedBalconyUtility} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                  <InputWithSuffix label="TERRACE AREA" name="terraceArea" value={formData.terraceArea} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                  <InputWithSuffix label="FLOWER BED / POCKET TERRACE" name="flowerBedPocketTerrace" value={formData.flowerBedPocketTerrace} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                  <InputWithSuffix label="SERVICE SLAB / AC LEDGE" name="serviceSlabAcLedge" value={formData.serviceSlabAcLedge} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                  <InputWithSuffix label="REFUGE AREA SHARE" name="refugeAreaShare" value={formData.refugeAreaShare} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                </div>
              </Section>

              <Section title="Parking & Extras">
                <div className="lead-grid">
                  <InputField label="CAR PARKING SLOTS *" name="carParkingSlots" type="number" value={formData.carParkingSlots} onChange={handleChange} required />
                  <SelectField label="PARKING TYPE *" name="parkingType" value={formData.parkingType} onChange={handleChange} required options={parkingTypeOptions} />
                  <InputField label="TWO-WHEELER SLOTS" name="twoWheelerSlots" type="number" value={formData.twoWheelerSlots} onChange={handleChange} />
                  <InputWithSuffix label="BASEMENT STOREROOM" name="basementStoreroom" value={formData.basementStoreroom} onChange={handleChange} suffix={areaSuffix(formData.measure)} />
                </div>
              </Section>

              <Section title="Costing">
                <div className="lead-grid">
                  <SelectField label="RATE BASIS *" name="rateBasis" value={formData.rateBasis} onChange={handleChange} required options={rateBasisOptions} />
                  <InputField label="BASE RATE *" name="baseRate" type="number" value={formData.baseRate} onChange={handleChange} required />
                  <InputField label="BASE PRICE" name="basePrice" type="number" value={formData.autoCalc ? computed.basePrice : formData.basePrice} onChange={handleChange} disabled={formData.autoCalc} />
                  <InputField label="FLOOR RISE / SQFT" name="floorRisePerSqft" type="number" value={formData.floorRisePerSqft} onChange={handleChange} />
                  <InputField label="BASE FLOOR FOR FLOOR RISE" name="baseFloorForFloorRise" type="number" value={formData.baseFloorForFloorRise} onChange={handleChange} />
                  <InputField label="CORNER PLC %" name="cornerPlcPercent" type="number" value={formData.cornerPlcPercent} onChange={handleChange} />
                  <InputField label="VIEW PLC %" name="viewPlcPercent" type="number" value={formData.viewPlcPercent} onChange={handleChange} />
                  <InputField label="FACING PLC %" name="facingPlcPercent" type="number" value={formData.facingPlcPercent} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Other Charges">
                <div className="lead-grid">
                  <InputField label="CLUB MEMBERSHIP" name="clubMembership" type="number" value={formData.clubMembership} onChange={handleChange} />
                  <InputField label="INFRASTRUCTURE / DEVELOPMENT CHARGES" name="infrastructureDevelopmentCharges" type="number" value={formData.infrastructureDevelopmentCharges} onChange={handleChange} />
                  <SelectField label="INFRA / DEV BASIS" name="infrastructureDevelopmentChargeBasis" value={formData.infrastructureDevelopmentChargeBasis} onChange={handleChange} options={["Lump Sum", "Per Sqft"]} />
                  <InputField label="LEGAL & DOCUMENTATION" name="legalDocumentation" type="number" value={formData.legalDocumentation} onChange={handleChange} />
                  <InputField label="GST % *" name="gstPercent" type="number" value={formData.gstPercent} onChange={handleChange} required />
                  <InputField label="STAMP DUTY % *" name="stampDutyPercent" type="number" value={formData.stampDutyPercent} onChange={handleChange} required />
                  <InputField label="REGISTRATION % *" name="registrationPercent" type="number" value={formData.registrationPercent} onChange={handleChange} required />
                  <InputField label="ADVANCE MAINTENANCE MONTHS" name="advanceMaintenanceMonths" type="number" value={formData.advanceMaintenanceMonths} onChange={handleChange} />
                  <InputField label="MAINTENANCE RATE / SQFT / MONTH" name="maintenanceRatePerSqftPerMonth" type="number" value={formData.maintenanceRatePerSqftPerMonth} onChange={handleChange} />
                  <InputField label="SINKING FUND / CORPUS" name="sinkingFundCorpus" type="number" value={formData.sinkingFundCorpus} onChange={handleChange} />
                  <InputField label="SOCIETY FORMATION CHARGES" name="societyFormationCharges" type="number" value={formData.societyFormationCharges} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Documents & Media">
                <div className="lead-grid">
                  <FileField label="FLOOR PLAN IMAGE" name="floorPlanImages" onChange={handleChange} required={formData.status === "Active"} />
                  <InputField label="BROCHURE PAGE REFERENCE" name="brochurePageReference" value={formData.brochurePageReference} onChange={handleChange} />
                  <InputField label="3D WALKTHROUGH LINK" name="walkthrough3dLink" type="url" value={formData.walkthrough3dLink} onChange={handleChange} />
                </div>
              </Section>

              <Section title="Linked Entities">
                <div className="lead-grid">
                  <SelectField label="PAYMENT PLAN *" name="paymentPlan" value={formData.paymentPlan} onChange={handleChange} required options={paymentPlanOptions} />
                  <SelectField label="DEFAULT ALLOTMENT LETTER TEMPLATE" name="allotmentLetterTemplate" value={formData.allotmentLetterTemplate} onChange={handleChange} options={templateOptions} />
                  <SelectField label="DEFAULT AGREEMENT TEMPLATE" name="agreementTemplate" value={formData.agreementTemplate} onChange={handleChange} options={templateOptions} />
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
                  {saving ? "Saving..." : "Save Floor Plan"}
                </button>
                <button type="button" className="lead-cancel" onClick={() => navigate("/floorplans")}>
                  Cancel
                </button>
              </div>
              </div>

              <aside className="floorplan-summary">
                <div className="section-card">
                  <h6>Computed Summary</h6>
                  <SummaryRow label="Carpet" value={`${computed.carpet || 0} ${areaSuffix(formData.measure)}`} />
                  <SummaryRow label="Saleable" value={`${computed.saleable || 0} ${areaSuffix(formData.measure)}`} />
                  <SummaryRow label="Base Price" value={formatMoney(computed.basePrice)} />
                  <SummaryRow label="All-Inclusive" value={formatMoney(computed.allInclusive)} highlight />
                </div>
              </aside>
            </div>
          </form>
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
                  <SummaryRow label="Base Price" value={formatMoney(computed.basePrice)} />
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

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

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

const FieldShell = ({ label, children }) => (
  <div className="lead-group">
    <label>{label}</label>
    {children}
  </div>
);

const InputField = ({ label, name, value, onChange, type = "text", step, placeholder, required, disabled }) => (
  <FieldShell label={label}>
    <input
      type={type}
      step={step}
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

const MultiSelectField = ({ label, name, value, onChange, options }) => (
  <FieldShell label={label}>
    <select
      name={name}
      value={value}
      onChange={onChange}
      multiple
      style={{ minHeight: 120 }}
    >
      {options.map((option) => (
        <option key={option} value={option}>{option}</option>
      ))}
    </select>
  </FieldShell>
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
