import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const emptyUnit = {
  name: "",
  floor: "",
  unitIndex: "",
  baseRate: "",
  basePrice: "",
  propertyPurpose: "Sales",
};

const AddUnits = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [formData, setFormData] = useState({
    projectId: "",
    towerId: "",
    floorId: "",
    type: "",
    category: "",
    bedrooms: "",
    bathrooms: "",
    measure: "sqft",
    carpet: "",
    saleable: "",
    loading: "0.0",
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

  useEffect(() => {
    if (!formData.floorId) return;

    const selectedFloorPlan = floorPlans.find(
      (plan) => String(plan.id) === String(formData.floorId)
    );

    if (!selectedFloorPlan) return;

    setFormData((prev) => ({
      ...prev,
      type: selectedFloorPlan.type || prev.type,
      category: selectedFloorPlan.category || prev.category,
      bedrooms: selectedFloorPlan.bedrooms ?? prev.bedrooms,
      bathrooms: selectedFloorPlan.bathrooms ?? prev.bathrooms,
      measure: selectedFloorPlan.measure || prev.measure,
      carpet: selectedFloorPlan.carpet ?? prev.carpet,
      saleable: selectedFloorPlan.saleable ?? prev.saleable,
    }));
  }, [formData.floorId, floorPlans]);

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
        name: unit.name.trim(),
        floor: toNumberOrNull(unit.floor),
        unitIndex: toNumberOrNull(unit.unitIndex),
        baseRate: toNumberOrNull(unit.baseRate),
        basePrice: toNumberOrNull(unit.basePrice),
        propertyPurpose: unit.propertyPurpose.trim(),
      })),
      projectId: toNumberOrNull(formData.projectId),
      towerId: toNumberOrNull(formData.towerId),
      floorId: toNumberOrNull(formData.floorId),
      type: formData.type.trim(),
      category: formData.category.trim(),
      bedrooms: toNumberOrNull(formData.bedrooms),
      bathrooms: toNumberOrNull(formData.bathrooms),
      measure: formData.measure,
      carpet: toNumberOrNull(formData.carpet),
      saleable: toNumberOrNull(formData.saleable),
      loading: toNumberOrNull(formData.loading),
      description: formData.description,
    };

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
                    <FormField label="NAME *" name="name" value={unit.name} onChange={(event) => handleUnitChange(index, event)} placeholder="Unit Name" required />
                    <FormField label="FLOOR *" name="floor" type="number" value={unit.floor} onChange={(event) => handleUnitChange(index, event)} placeholder="0" required />
                    <FormField label="UNIT INDEX *" name="unitIndex" type="number" value={unit.unitIndex} onChange={(event) => handleUnitChange(index, event)} placeholder="0" required />
                    <FormField label="BASE RATE *" name="baseRate" type="number" value={unit.baseRate} onChange={(event) => handleUnitChange(index, event)} required />
                    <FormField label="BASE PRICE *" name="basePrice" type="number" value={unit.basePrice} onChange={(event) => handleUnitChange(index, event)} required />
                    <SelectField
                      label="PROPERTY PURPOSE *"
                      name="propertyPurpose"
                      value={unit.propertyPurpose}
                      onChange={(event) => handleUnitChange(index, event)}
                      required
                    >
                      <option value="">Select Purpose</option>
                      <option value="Sales">Sales</option>
                      <option value="Rent">Rent</option>
                    </SelectField>
                  </div>
                </div>
              ))}
            </Section>

            <Section title="Details">
              <div className="lead-grid">
                <FormField label="TYPE" name="type" value={formData.type} onChange={handleChange} />
                <FormField label="CATEGORY" name="category" value={formData.category} onChange={handleChange} />
                <FormField label="BEDROOMS" name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} placeholder="0" />
                <FormField label="BATHROOMS" name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} placeholder="0" />
              </div>
            </Section>

            <Section title="Areas">
              <div className="lead-grid">
                <SelectField label="MEASURE *" name="measure" value={formData.measure} onChange={handleChange} required>
                  <option value="sqft">Sq. Ft.</option>
                  <option value="sqm">Sq. M.</option>
                </SelectField>
                <InputWithSuffix label="CARPET" name="carpet" value={formData.carpet} onChange={handleChange} suffix={formData.measure === "sqm" ? "Sq. m." : "Sq. ft."} />
                <InputWithSuffix label="SALEABLE" name="saleable" value={formData.saleable} onChange={handleChange} suffix={formData.measure === "sqm" ? "Sq. m." : "Sq. ft."} />
                <InputWithSuffix label="LOADING" name="loading" value={formData.loading} onChange={handleChange} suffix="%" />
              </div>
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

const FormField = ({ label, name, value, onChange, placeholder, type = "text", required = false }) => (
  <div className="lead-group">
    <label>{label}</label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      required={required}
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

const InputWithSuffix = ({ label, name, value, onChange, suffix }) => (
  <div className="lead-group">
    <label>{label}</label>
    <div className="unit-input-group">
      <input
        name={name}
        type="number"
        value={value}
        onChange={onChange}
        placeholder="0.0"
      />
      <span>{suffix}</span>
    </div>
  </div>
);
