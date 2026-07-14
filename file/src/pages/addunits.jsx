import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const emptyUnit = {
  floor: "",
  unitIndex: "",
  status: "Available",
};

const UNIT_STATUS_OPTIONS = [
  "Available",
  "Held",
  "Blocked",
  "Booked",
  "Registered",
  "Possession_Given",
  "Cancelled",
  "Refuge",
  "Investor",
];

const AddUnits = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    projectId: "",
    towerId: "",
    floorId: "",
    propertyPurpose: "",
    description: "",
  });
  const [unitList, setUnitList] = useState([{ ...emptyUnit }]);
  const [projects, setProjects] = useState([]);
  const [towers, setTowers] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [loadingOptions, setLoadingOptions] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const toNumberOrNull = (value) => {
    if (value === "" || value === null || value === undefined) return null;
    const number = Number(value);
    return Number.isNaN(number) ? null : number;
  };

  const selectedFloorPlan = floorPlans.find((plan) => String(plan.id) === String(formData.floorId));
  const selectedTower = towers.find((tower) => String(tower.id) === String(formData.towerId));

  const getGeneratedUnitNumber = (unit) => {
    const wingCode = String(selectedTower?.wingCode || "").trim().toUpperCase();
    const floor = toNumberOrNull(unit.floor);
    const position = toNumberOrNull(unit.unitIndex);

    if (!wingCode || floor === null || position === null) return "";
    return `${wingCode}-${floor}${String(position).padStart(2, "0")}`;
  };

  const getRateBasisArea = (floorPlan) => {
    if (!floorPlan) return 0;
    if (floorPlan.rateBasis === "On Built-up") return toNumberOrNull(floorPlan.builtupArea) || 0;
    if (floorPlan.rateBasis === "On Saleable") return toNumberOrNull(floorPlan.saleable) || 0;
    return toNumberOrNull(floorPlan.carpet) || 0;
  };

  const getUnitPricing = (floor) => {
    const baseRate = toNumberOrNull(selectedFloorPlan?.baseRate) || 0;
    const floorRise = toNumberOrNull(selectedFloorPlan?.floorRisePerSqft) || 0;
    const baseFloor = toNumberOrNull(selectedFloorPlan?.baseFloorForFloorRise) ?? toNumberOrNull(selectedFloorPlan?.applicableFloorFrom) ?? 0;
    const floorNumber = toNumberOrNull(floor) ?? baseFloor;
    const area = getRateBasisArea(selectedFloorPlan);
    const effectiveRate = Number((baseRate + ((floorNumber - baseFloor) * floorRise)).toFixed(2));

    return {
      baseRate: effectiveRate || "",
      basePrice: effectiveRate && area ? Number((effectiveRate * area).toFixed(2)) : "",
    };
  };

  useEffect(() => {
    const fetchProjects = async () => {
      try {
        setLoadingOptions(true);
        setError("");

        const response = await fetch(`${API_URL}/projects/list`);
        if (!response.ok) throw new Error("Unable to load projects");

        const data = await response.json();
        setProjects(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load projects");
      } finally {
        setLoadingOptions(false);
      }
    };

    fetchProjects();
  }, [API_URL]);

  useEffect(() => {
    const fetchProjectData = async () => {
      if (!formData.projectId) {
        setTowers([]);
        setFloorPlans([]);
        setFormData((prev) => ({ ...prev, towerId: "", floorId: "" }));
        return;
      }

      try {
        setError("");
        const [towerResponse, floorResponse] = await Promise.all([
          fetch(`${API_URL}/tower/list?projectId=${formData.projectId}`),
          fetch(`${API_URL}/floor?limit=100`),
        ]);

        if (!towerResponse.ok) throw new Error("Unable to load project towers");
        if (!floorResponse.ok) throw new Error("Unable to load floor plans");

        const towerData = await towerResponse.json();
        const floorData = await floorResponse.json();
        const floors = Array.isArray(floorData) ? floorData : floorData?.data ?? [];

        setTowers(Array.isArray(towerData) ? towerData : []);
        setFloorPlans(
          floors.filter((plan) => String(plan.project?.id || "") === String(formData.projectId))
        );
      } catch (err) {
        console.error(err);
        setError(err.message || "Unable to load project data");
      }
    };

    fetchProjectData();
  }, [API_URL, formData.projectId]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "projectId" ? { towerId: "", floorId: "" } : {}),
    }));
  };

  const handleUnitChange = (index, event) => {
    const { name, value } = event.target;
    setUnitList((prev) =>
      prev.map((unit, unitIndex) =>
        unitIndex === index ? { ...unit, [name]: value } : unit
      )
    );
  };

  const addAnotherUnit = () => {
    setUnitList((prev) => [...prev, { ...emptyUnit }]);
  };

  const removeUnit = (index) => {
    setUnitList((prev) => prev.filter((_, unitIndex) => unitIndex !== index));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");

    const payload = {
      unitList: unitList.map((unit) => ({
        name: getGeneratedUnitNumber(unit),
        floor: toNumberOrNull(unit.floor),
        unitIndex: toNumberOrNull(unit.unitIndex),
        baseRate: getUnitPricing(unit.floor).baseRate || 0,
        basePrice: getUnitPricing(unit.floor).basePrice || 0,
        status: unit.status || "Available",
      })),
      projectId: toNumberOrNull(formData.projectId),
      towerId: toNumberOrNull(formData.towerId),
      floorId: toNumberOrNull(formData.floorId),
      propertyPurpose: formData.propertyPurpose,
      description: formData.description,
    };

    if (!selectedTower?.wingCode) {
      setSaving(false);
      setError("Selected tower needs a Wing Code before unit numbers can be generated.");
      return;
    }

    if (payload.unitList.some((unit) => !unit.name)) {
      setSaving(false);
      setError("Enter Floor and Unit Position for every unit so the unit number can be generated.");
      return;
    }

    try {
      const response = await fetch(`${API_URL}/unit`, {
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
        throw new Error(result?.message || "Failed to create unit");
      }

      window.alert("Unit created successfully!");
      navigate("/units", { replace: true });
    } catch (err) {
      console.error(err);
      setError(err.message || "Something went wrong while saving unit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MasterLayout>
      <div className="lead-page">
        <div className="lead-container">
          <p className="lead-title">Add Units</p>

          <div className="lead-tabs">
            <button type="button" className="active">Unit Details</button>
          </div>

          {error && <div className="unit-alert">{error}</div>}

          <form onSubmit={handleSubmit} className="lead-form">
            <Section title="Project Mapping">
              <div className="lead-grid">
                <SelectField
                  label="PROJECT *"
                  name="projectId"
                  value={formData.projectId}
                  onChange={handleChange}
                  required
                  disabled={loadingOptions}
                >
                  <option value="">{loadingOptions ? "Loading projects..." : "Select a Project"}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="PROJECT TOWER *"
                  name="towerId"
                  value={formData.towerId}
                  onChange={handleChange}
                  required
                  disabled={!formData.projectId}
                >
                  <option value="">{formData.projectId ? "Select a Project Tower" : "Select project first"}</option>
                  {towers.map((tower) => (
                    <option key={tower.id} value={tower.id}>
                      {tower.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="UNIT CONFIGURATION *"
                  name="floorId"
                  value={formData.floorId}
                  onChange={handleChange}
                  required
                  disabled={!formData.projectId}
                >
                  <option value="">{formData.projectId ? "Select a Floor Plan" : "Select project first"}</option>
                  {floorPlans.map((plan) => (
                    <option key={plan.id} value={plan.id}>
                      {plan.name}
                    </option>
                  ))}
                </SelectField>
                <SelectField
                  label="PROPERTY PURPOSE *"
                  name="propertyPurpose"
                  value={formData.propertyPurpose}
                  onChange={handleChange}
                  required
                >
                  <option value="">Select Purpose</option>
                  <option value="Investment">Investment</option>
                  <option value="Self Use">Self Use</option>
                </SelectField>
                <FormField
                  label="RATE BASIS"
                  name="rateBasis"
                  value={selectedFloorPlan?.rateBasis || ""}
                  placeholder="Select floor plan"
                  disabled
                />
              </div>
            </Section>

            <Section
              title="Units"
              action={
                <button type="button" className="section-add-btn" onClick={addAnotherUnit}>
                  + Add Another Unit
                </button>
              }
            >
              {unitList.map((unit, index) => (
                <div key={index} className="section-card">
                  <div className="unit-card-title">
                    <span>Unit {index + 1}</span>
                    {unitList.length > 1 && (
                      <button type="button" className="lead-remove" onClick={() => removeUnit(index)}>
                        Remove
                      </button>
                    )}
                  </div>
                  <div className="lead-grid">
                    <FormField label="GENERATED UNIT NUMBER" name="name" value={getGeneratedUnitNumber(unit)} placeholder="Auto-generated" disabled />
                    <FormField label="FLOOR *" name="floor" type="number" value={unit.floor} onChange={(event) => handleUnitChange(index, event)} placeholder="0" required />
                    <FormField label="UNIT POSITION *" name="unitIndex" type="number" value={unit.unitIndex} onChange={(event) => handleUnitChange(index, event)} placeholder="01" required />
                    <FormField label="BASE RATE" name="baseRate" type="number" value={getUnitPricing(unit.floor).baseRate} disabled />
                    <FormField label="BASE PRICE" name="basePrice" type="number" value={getUnitPricing(unit.floor).basePrice} disabled />
                    <SelectField label="STATUS" name="status" value={unit.status || "Available"} onChange={(event) => handleUnitChange(index, event)}>
                      {UNIT_STATUS_OPTIONS.map((status) => (
                        <option key={status} value={status}>{status.replace("_", " ")}</option>
                      ))}
                    </SelectField>
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Description">
              <div className="lead-group lead-full">
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Enter description..."
                  className="lead-comment unit-comment"
                />
              </div>
            </Section>

            <div className="lead-buttons">
              <button type="submit" className="lead-save" disabled={saving}>
                {saving ? "Saving..." : "Save"}
              </button>
              <button type="button" className="lead-cancel" onClick={() => navigate("/units")}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    </MasterLayout>
  );
};

export default AddUnits;

const Section = ({ title, action, children }) => (
  <div className="section-wrapper">
    <div className="section-header">
      <span className="section-header-label">{title}</span>
      {action}
    </div>
    {children}
  </div>
);

const FormField = ({ label, name, value, onChange, placeholder, type = "text", required = false, disabled = false }) => (
  <div className="lead-group">
    <label>{label}</label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
      disabled={disabled}
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, children, required = false, disabled = false }) => (
  <div className="lead-group">
    <label>{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      required={required}
      disabled={disabled}
    >
      {children}
    </select>
  </div>
);
