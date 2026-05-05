import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";

const emptyUnit = {
  name: "",
  floor: "",
  unitIndex: "",
  baseRate: "",
  basePrice: "",
  propertyPurpose: "Sale",
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
    loading: "",
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
      <form onSubmit={handleSubmit} style={{ padding: "20px", background: "#f4f7fb" }}>
        {error && <div style={errorBox}>{error}</div>}

        <div style={card}>
          <div style={grid3}>
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

          {unitList.map((unit, index) => (
            <div key={index} style={unitRow}>
              <div style={grid6}>
                <FormField label="NAME *" name="name" value={unit.name} onChange={(event) => handleUnitChange(index, event)} placeholder="Unit Name" required />
                <FormField label="FLOOR *" name="floor" type="number" value={unit.floor} onChange={(event) => handleUnitChange(index, event)} placeholder="0" required />
                <FormField label="UNIT INDEX *" name="unitIndex" type="number" value={unit.unitIndex} onChange={(event) => handleUnitChange(index, event)} placeholder="0" required />
                <FormField label="BASE RATE *" name="baseRate" type="number" value={unit.baseRate} onChange={(event) => handleUnitChange(index, event)} required />
                <FormField label="BASE PRICE *" name="basePrice" type="number" value={unit.basePrice} onChange={(event) => handleUnitChange(index, event)} required />
                <FormField label="PROPERTY PURPOSE *" name="propertyPurpose" value={unit.propertyPurpose} onChange={(event) => handleUnitChange(index, event)} placeholder="Sale" required />
              </div>
              {unitList.length > 1 && (
                <button type="button" style={dangerBtn} onClick={() => removeUnit(index)}>
                  Remove
                </button>
              )}
            </div>
          ))}

          <button type="button" style={secondaryBtn} onClick={addAnotherUnit}>
            + Add Another Unit
          </button>
        </div>

        <div style={card}>
          <h3 style={sectionTitle}>Details</h3>

          <div style={grid2}>
            <FormField label="TYPE" name="type" value={formData.type} onChange={handleChange} />
            <FormField label="CATEGORY" name="category" value={formData.category} onChange={handleChange} />
          </div>

          <div style={grid2}>
            <FormField label="BEDROOMS" name="bedrooms" type="number" value={formData.bedrooms} onChange={handleChange} placeholder="0" />
            <FormField label="BATHROOMS" name="bathrooms" type="number" value={formData.bathrooms} onChange={handleChange} placeholder="0" />
          </div>
        </div>

        <div style={card}>
          <h3 style={sectionTitle}>Areas</h3>

          <div style={grid3}>
            <SelectField label="MEASURE *" name="measure" value={formData.measure} onChange={handleChange} required>
              <option value="sqft">Sq. Ft.</option>
              <option value="sqm">Sq. M.</option>
            </SelectField>
            <InputWithSuffix label="CARPET" name="carpet" value={formData.carpet} onChange={handleChange} suffix={formData.measure === "sqm" ? "Sq. m." : "Sq. ft."} />
            <InputWithSuffix label="SALEABLE" name="saleable" value={formData.saleable} onChange={handleChange} suffix={formData.measure === "sqm" ? "Sq. m." : "Sq. ft."} />
          </div>

          <div style={{ width: "33%" }}>
            <InputWithSuffix label="LOADING" name="loading" value={formData.loading} onChange={handleChange} suffix="%" />
          </div>
        </div>

        <div style={card}>
          <h3 style={sectionTitle}>Description</h3>

          <textarea
            name="description"
            value={formData.description}
            onChange={handleChange}
            placeholder="Enter description..."
            style={textarea}
          />
        </div>

        <div style={{ display: "flex", justifyContent: "flex-start", gap: "12px" }}>
          <button type="submit" style={primaryBtn} disabled={saving}>
            {saving ? "Saving..." : "Save"}
          </button>
          <button type="button" style={secondaryBtn} onClick={() => navigate("/units")}>
            Cancel
          </button>
        </div>
      </form>
    </MasterLayout>
  );
};

export default AddUnits;

const FormField = ({ label, name, value, onChange, placeholder, type = "text", required = false }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <input
      name={name}
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={inputStyle}
      required={required}
    />
  </div>
);

const SelectField = ({ label, name, value, onChange, children, required = false, disabled = false }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <select
      name={name}
      value={value}
      onChange={onChange}
      style={inputStyle}
      required={required}
      disabled={disabled}
    >
      {children}
    </select>
  </div>
);

const InputWithSuffix = ({ label, name, value, onChange, suffix }) => (
  <div style={{ display: "flex", flexDirection: "column" }}>
    <label style={labelStyle}>{label}</label>
    <div style={inputGroup}>
      <input
        name={name}
        type="number"
        value={value}
        onChange={onChange}
        placeholder="0.0"
        style={inputNoBorder}
      />
      <span style={suffixStyle}>{suffix}</span>
    </div>
  </div>
);

const errorBox = {
  background: "#f8d7da",
  color: "#842029",
  padding: "12px 16px",
  borderRadius: "6px",
  marginBottom: "20px",
  border: "1px solid #f5c2c7",
};

const card = {
  background: "#fff",
  padding: "20px",
  borderRadius: "10px",
  marginBottom: "20px",
  border: "1px solid #e3e8ef",
};

const sectionTitle = {
  marginBottom: "15px",
  color: "#2c3e50",
};

const unitRow = {
  borderBottom: "1px solid #eef2f7",
  marginBottom: "15px",
  paddingBottom: "15px",
};

const grid3 = {
  display: "grid",
  gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "15px",
};

const grid6 = {
  display: "grid",
  gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "15px",
};

const grid2 = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: "15px",
  marginBottom: "15px",
};

const labelStyle = {
  fontSize: "12px",
  marginBottom: "5px",
  color: "#5c6b7a",
  fontWeight: "500",
};

const inputStyle = {
  padding: "10px",
  borderRadius: "6px",
  border: "1px solid #cfd8e3",
  outline: "none",
  fontSize: "14px",
  width: "100%",
};

const inputGroup = {
  display: "flex",
  border: "1px solid #cfd8e3",
  borderRadius: "6px",
  overflow: "hidden",
};

const inputNoBorder = {
  flex: 1,
  padding: "10px",
  border: "none",
  outline: "none",
  minWidth: 0,
};

const suffixStyle = {
  background: "#eef2f7",
  padding: "10px",
  borderLeft: "1px solid #cfd8e3",
  fontSize: "13px",
};

const secondaryBtn = {
  background: "#fff",
  border: "1px solid #4a6cf7",
  color: "#4a6cf7",
  padding: "8px 14px",
  borderRadius: "6px",
  cursor: "pointer",
};

const dangerBtn = {
  background: "#fff",
  border: "1px solid #dc3545",
  color: "#dc3545",
  padding: "7px 12px",
  borderRadius: "6px",
  cursor: "pointer",
};

const primaryBtn = {
  background: "#5b3cc4",
  color: "#fff",
  border: "none",
  padding: "10px 20px",
  borderRadius: "6px",
  cursor: "pointer",
  fontWeight: "500",
};

const textarea = {
  width: "100%",
  height: "150px",
  borderRadius: "6px",
  border: "1px solid #cfd8e3",
  padding: "10px",
  outline: "none",
  resize: "none",
};
