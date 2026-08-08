import React, { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const initialMapping = {
  projectId: "",
  towerId: "",
  floorId: "",
  propertyPurpose: "",
  description: "",
};

const createUnitDraft = () => ({
  floor: "0",
  unitIndex: "01",
  status: "Available",
  baseRate: "",
  basePrice: "",
});

const statusOptions = ["Available", "Blocked", "Refuge", "Investor"];
const purposeOptions = ["Sale Unit", "Rental Unit", "Investor Unit"];

const toNumber = (value) => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const formatUnitPosition = (value) => {
  const number = Number(value);
  if (!Number.isInteger(number) || number < 0 || number > 99) return "";
  return String(number).padStart(2, "0");
};

const calculateBasePrice = (baseRate, floorPlan) => {
  const rate = toNumber(baseRate);
  const area =
    floorPlan?.rateBasis === "On Built-up"
      ? toNumber(floorPlan?.builtupArea)
      : floorPlan?.rateBasis === "On Saleable"
        ? toNumber(floorPlan?.saleable)
        : toNumber(floorPlan?.carpet);

  return rate && area ? Number((rate * area).toFixed(2)) : "";
};

const getProjectName = (project) => project?.name || project?.projectName || `Project #${project?.id}`;

const AddUnits = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [mapping, setMapping] = useState(initialMapping);
  const [units, setUnits] = useState([createUnitDraft()]);
  const [projects, setProjects] = useState([]);
  const [towers, setTowers] = useState([]);
  const [floorPlans, setFloorPlans] = useState([]);
  const [selectedFloorPlan, setSelectedFloorPlan] = useState(null);
  const [loadingProjects, setLoadingProjects] = useState(true);
  const [loadingTowers, setLoadingTowers] = useState(false);
  const [loadingFloorPlans, setLoadingFloorPlans] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const selectedTower = useMemo(
    () => towers.find((tower) => String(tower.id) === String(mapping.towerId)),
    [mapping.towerId, towers]
  );

  const generatedUnitNumbers = useMemo(() => {
    const wingCode = String(selectedTower?.wingCode || "").trim().toUpperCase();
    return units.map((unit) => {
      const position = formatUnitPosition(unit.unitIndex);
      if (!wingCode || unit.floor === "" || !position) return "";
      return `${wingCode}-${Number(unit.floor)}${position}`;
    });
  }, [selectedTower, units]);

  useEffect(() => {
    const loadProjects = async () => {
      try {
        setLoadingProjects(true);
        setError("");
        const response = await fetch(`${API_URL}/projects/list`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "Unable to load projects");
        setProjects(Array.isArray(result) ? result : result?.data || []);
      } catch (err) {
        setProjects([]);
        setError(err.message || "Unable to load projects");
      } finally {
        setLoadingProjects(false);
      }
    };

    loadProjects();
  }, [API_URL]);

  useEffect(() => {
    if (!mapping.projectId) {
      setTowers([]);
      setFloorPlans([]);
      setSelectedFloorPlan(null);
      setMapping((current) => ({ ...current, towerId: "", floorId: "" }));
      return;
    }

    const loadTowers = async () => {
      try {
        setLoadingTowers(true);
        setError("");
        const response = await fetch(`${API_URL}/tower/list?projectId=${mapping.projectId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "Unable to load towers");
        setTowers(Array.isArray(result) ? result : result?.data || []);
      } catch (err) {
        setTowers([]);
        setError(err.message || "Unable to load towers");
      } finally {
        setLoadingTowers(false);
      }
    };

    loadTowers();
  }, [API_URL, mapping.projectId]);

  useEffect(() => {
    if (!mapping.towerId) {
      setFloorPlans([]);
      setSelectedFloorPlan(null);
      setMapping((current) => ({ ...current, floorId: "" }));
      return;
    }

    const loadFloorPlans = async () => {
      try {
        setLoadingFloorPlans(true);
        setError("");
        const response = await fetch(`${API_URL}/floor/list?towerId=${mapping.towerId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "Unable to load floor plans");
        setFloorPlans(Array.isArray(result) ? result : result?.data || []);
      } catch (err) {
        setFloorPlans([]);
        setError(err.message || "Unable to load floor plans");
      } finally {
        setLoadingFloorPlans(false);
      }
    };

    loadFloorPlans();
  }, [API_URL, mapping.towerId]);

  useEffect(() => {
    if (!mapping.floorId) {
      setSelectedFloorPlan(null);
      return;
    }

    const loadFloorPlan = async () => {
      try {
        setError("");
        const response = await fetch(`${API_URL}/floor/${mapping.floorId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "Unable to load floor plan");
        setSelectedFloorPlan(result && typeof result === "object" ? result : null);
        setMapping((current) => ({
          ...current,
          propertyPurpose: current.propertyPurpose || result?.unitStream || "Sale Unit",
        }));
        setUnits((current) =>
          current.map((unit) => {
            const nextBaseRate = unit.baseRate || result?.baseRate || "";
            return {
              ...unit,
              baseRate: nextBaseRate,
              basePrice: unit.basePrice || calculateBasePrice(nextBaseRate, result) || "",
            };
          })
        );
      } catch (err) {
        setSelectedFloorPlan(null);
        setError(err.message || "Unable to load floor plan");
      }
    };

    loadFloorPlan();
  }, [API_URL, mapping.floorId]);

  const updateMapping = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setError("");
    setMapping((current) => ({
      ...current,
      [name]: value,
      ...(name === "projectId" ? { towerId: "", floorId: "" } : {}),
      ...(name === "towerId" ? { floorId: "" } : {}),
    }));
  };

  const updateUnit = (index, event) => {
    const { name, value } = event.target;
    setMessage("");
    setError("");
    setUnits((current) =>
      current.map((unit, unitIndex) => {
        if (unitIndex !== index) return unit;
        const next = { ...unit, [name]: value };
        if (name === "baseRate") next.basePrice = calculateBasePrice(value, selectedFloorPlan) || "";
        return next;
      })
    );
  };

  const addAnotherUnit = () => {
    setUnits((current) => [...current, createUnitDraft()]);
  };

  const submitUnits = async (event) => {
    event.preventDefault();

    const missingGeneratedUnit = generatedUnitNumbers.some((unitNumber) => !unitNumber);
    if (missingGeneratedUnit) {
      setError("Select a tower with Wing Code, floor, and unit position before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      for (const unit of units) {
        const response = await fetch(`${API_URL}/unit`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...mapping,
            ...unit,
            propertyPurpose: mapping.propertyPurpose,
          }),
        });
        const result = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(result?.message || "Unable to create unit");
      }

      setMessage(`${units.length} unit${units.length > 1 ? "s" : ""} created successfully.`);
      setUnits([createUnitDraft()]);
    } catch (err) {
      setError(err.message || "Unable to create unit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MasterLayout>
      <div className="lead-page add-units-page">
        <div className="lead-container add-units-container">
          <Breadcrumb title="Add Units" />

          <form className="add-units-form" onSubmit={submitUnits}>
            <div className="add-units-tabs">
              <button type="button" className="add-units-tab is-active">Unit Details</button>
            </div>

            {error && <div className="unit-alert">{error}</div>}
            {message && <div className="unit-alert success">{message}</div>}

            <section className="add-units-panel">
              <div className="add-units-section-title">Project Mapping</div>
              <div className="add-units-grid add-units-grid-four">
                <div className="add-units-field">
                  <label>PROJECT *</label>
                  <select name="projectId" value={mapping.projectId} onChange={updateMapping} required disabled={loadingProjects}>
                    <option value="">{loadingProjects ? "Loading projects..." : "Select a Project"}</option>
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>{getProjectName(project)}</option>
                    ))}
                  </select>
                </div>

                <div className="add-units-field">
                  <label>PROJECT TOWER *</label>
                  <select name="towerId" value={mapping.towerId} onChange={updateMapping} required disabled={!mapping.projectId || loadingTowers}>
                    <option value="">
                      {!mapping.projectId ? "Select project first" : loadingTowers ? "Loading towers..." : "Select Tower"}
                    </option>
                    {towers.map((tower) => (
                      <option key={tower.id} value={tower.id}>
                        {tower.name}{tower.wingCode ? ` (${tower.wingCode})` : ""}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="add-units-field">
                  <label>UNIT CONFIGURATION *</label>
                  <select name="floorId" value={mapping.floorId} onChange={updateMapping} required disabled={!mapping.towerId || loadingFloorPlans}>
                    <option value="">
                      {!mapping.towerId ? "Select project first" : loadingFloorPlans ? "Loading floor plans..." : "Select Unit Configuration"}
                    </option>
                    {floorPlans.map((floorPlan) => (
                      <option key={floorPlan.id} value={floorPlan.id}>{floorPlan.configurationLabel || floorPlan.name}</option>
                    ))}
                  </select>
                </div>

                <div className="add-units-field">
                  <label>PROPERTY PURPOSE *</label>
                  <select name="propertyPurpose" value={mapping.propertyPurpose} onChange={updateMapping} required>
                    <option value="">Select Purpose</option>
                    {purposeOptions.map((purpose) => (
                      <option key={purpose} value={purpose}>{purpose}</option>
                    ))}
                  </select>
                </div>

                <div className="add-units-field add-units-field-quarter">
                  <label>RATE BASIS</label>
                  <input value={selectedFloorPlan?.rateBasis || ""} placeholder="Select floor plan" readOnly />
                </div>
              </div>

              <div className="add-units-divider" />

              <div className="add-units-units-head">
                <span>Units</span>
                <button type="button" onClick={addAnotherUnit}>+ Add Another Unit</button>
              </div>

              {units.map((unit, index) => (
                <section className="add-units-card" key={`unit-${index}`}>
                  <h6>{`Unit ${index + 1}`}</h6>
                  <div className="add-units-grid add-units-grid-four">
                    <div className="add-units-field">
                      <label>GENERATED UNIT NUMBER</label>
                      <input value={generatedUnitNumbers[index] || ""} placeholder="Auto-generated" readOnly />
                    </div>

                    <div className="add-units-field">
                      <label>FLOOR *</label>
                      <input name="floor" type="number" min="0" value={unit.floor} onChange={(event) => updateUnit(index, event)} required />
                    </div>

                    <div className="add-units-field">
                      <label>UNIT POSITION *</label>
                      <input name="unitIndex" type="number" min="0" max="99" value={unit.unitIndex} onChange={(event) => updateUnit(index, event)} required />
                    </div>

                    <div className="add-units-field">
                      <label>BASE RATE</label>
                      <input name="baseRate" type="number" value={unit.baseRate} onChange={(event) => updateUnit(index, event)} />
                    </div>

                    <div className="add-units-field">
                      <label>BASE PRICE</label>
                      <input name="basePrice" type="number" value={unit.basePrice} onChange={(event) => updateUnit(index, event)} />
                    </div>

                    <div className="add-units-field">
                      <label>STATUS</label>
                      <select name="status" value={unit.status} onChange={(event) => updateUnit(index, event)}>
                        {statusOptions.map((status) => (
                          <option key={status} value={status}>{status}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </section>
              ))}

              <div className="add-units-divider" />

              <div className="add-units-field add-units-description">
                <label>Description</label>
                <textarea
                  name="description"
                  value={mapping.description}
                  onChange={updateMapping}
                  placeholder="Enter description..."
                  rows={4}
                />
              </div>

              <div className="add-units-divider" />

              <div className="add-units-actions">
                <button type="submit" className="lead-save" disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </button>
                <button type="button" className="lead-cancel" onClick={() => navigate("/units")}>
                  Cancel
                </button>
              </div>
            </section>
          </form>
        </div>
      </div>
    </MasterLayout>
  );
};

export default AddUnits;
