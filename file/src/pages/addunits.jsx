import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import MasterLayout from "../masterLayout/MasterLayout";
import Breadcrumb from "../components/Breadcrumb";

const initialForm = {
  projectId: "",
  towerId: "",
  floorId: "",
  floor: "",
  unitIndex: "",
  propertyPurpose: "Sale Unit",
  status: "Available",
  baseRate: "",
  basePrice: "",
};

const statusOptions = ["Available", "Blocked", "Refuge", "Investor"];

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

  return rate && area ? Number((rate * area).toFixed(2)) : 0;
};

const getProjectName = (project) => project?.name || project?.projectName || `Project #${project?.id}`;

const AddUnits = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const [form, setForm] = useState(initialForm);
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
    () => towers.find((tower) => String(tower.id) === String(form.towerId)),
    [form.towerId, towers]
  );
  const generatedUnitNumber = useMemo(() => {
    const wingCode = String(selectedTower?.wingCode || "").trim().toUpperCase();
    const position = formatUnitPosition(form.unitIndex);
    if (!wingCode || !form.floor || !position) return "";
    return `${wingCode}-${Number(form.floor)}${position}`;
  }, [form.floor, form.unitIndex, selectedTower]);

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
    if (!form.projectId) {
      setTowers([]);
      setFloorPlans([]);
      setSelectedFloorPlan(null);
      setForm((current) => ({ ...current, towerId: "", floorId: "" }));
      return;
    }

    const loadTowers = async () => {
      try {
        setLoadingTowers(true);
        setError("");
        const response = await fetch(`${API_URL}/tower/list?projectId=${form.projectId}`);
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
  }, [API_URL, form.projectId]);

  useEffect(() => {
    if (!form.towerId) {
      setFloorPlans([]);
      setSelectedFloorPlan(null);
      setForm((current) => ({ ...current, floorId: "" }));
      return;
    }

    const loadFloorPlans = async () => {
      try {
        setLoadingFloorPlans(true);
        setError("");
        const response = await fetch(`${API_URL}/floor/list?towerId=${form.towerId}`);
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
  }, [API_URL, form.towerId]);

  useEffect(() => {
    if (!form.floorId) {
      setSelectedFloorPlan(null);
      return;
    }

    const loadFloorPlan = async () => {
      try {
        setError("");
        const response = await fetch(`${API_URL}/floor/${form.floorId}`);
        const result = await response.json();
        if (!response.ok) throw new Error(result?.message || "Unable to load floor plan");
        setSelectedFloorPlan(result && typeof result === "object" ? result : null);
        setForm((current) => {
          const nextBaseRate = current.baseRate || result?.baseRate || "";
          return {
            ...current,
            propertyPurpose: current.propertyPurpose || result?.unitStream || "Sale Unit",
            baseRate: nextBaseRate,
            basePrice: current.basePrice || calculateBasePrice(nextBaseRate, result) || "",
          };
        });
      } catch (err) {
        setSelectedFloorPlan(null);
        setError(err.message || "Unable to load floor plan");
      }
    };

    loadFloorPlan();
  }, [API_URL, form.floorId]);

  const updateForm = (event) => {
    const { name, value } = event.target;
    setMessage("");
    setError("");
    setForm((current) => {
      const next = {
        ...current,
        [name]: value,
        ...(name === "projectId" ? { towerId: "", floorId: "" } : {}),
        ...(name === "towerId" ? { floorId: "" } : {}),
      };

      if (name === "baseRate") {
        next.basePrice = calculateBasePrice(value, selectedFloorPlan) || "";
      }

      return next;
    });
  };

  const submitUnit = async (event) => {
    event.preventDefault();

    if (!generatedUnitNumber) {
      setError("Select a tower with Wing Code, floor, and unit position before saving.");
      return;
    }

    try {
      setSaving(true);
      setError("");
      setMessage("");

      const response = await fetch(`${API_URL}/unit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to create unit");

      setMessage(`${generatedUnitNumber} created successfully.`);
      setForm((current) => ({
        ...current,
        floor: "",
        unitIndex: "",
      }));
    } catch (err) {
      setError(err.message || "Unable to create unit");
    } finally {
      setSaving(false);
    }
  };

  return (
    <MasterLayout>
      <div className="lead-page">
        <div className="lead-container">
          <Breadcrumb title="Add Units" />
          <form className="lead-form add-unit-form" onSubmit={submitUnit}>
            <div className="add-unit-heading">
              <div>
                <h2>Create Unit</h2>
                <p>Select an existing project setup, then add one unit to its inventory.</p>
              </div>
              <Link to="/units" className="lead-cancel">View Inventory</Link>
            </div>

            {error && <div className="unit-alert">{error}</div>}
            {message && <div className="unit-alert success">{message}</div>}

            <div className="lead-grid">
              <div className="lead-group">
                <label>PROJECT *</label>
                <select name="projectId" value={form.projectId} onChange={updateForm} required disabled={loadingProjects}>
                  <option value="">{loadingProjects ? "Loading projects..." : "Select Project"}</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>{getProjectName(project)}</option>
                  ))}
                </select>
              </div>

              <div className="lead-group">
                <label>PROJECT TOWER *</label>
                <select name="towerId" value={form.towerId} onChange={updateForm} required disabled={!form.projectId || loadingTowers}>
                  <option value="">
                    {!form.projectId ? "Select project first" : loadingTowers ? "Loading towers..." : "Select Tower"}
                  </option>
                  {towers.map((tower) => (
                    <option key={tower.id} value={tower.id}>
                      {tower.name}{tower.wingCode ? ` (${tower.wingCode})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              <div className="lead-group">
                <label>FLOOR PLAN *</label>
                <select name="floorId" value={form.floorId} onChange={updateForm} required disabled={!form.towerId || loadingFloorPlans}>
                  <option value="">
                    {!form.towerId ? "Select tower first" : loadingFloorPlans ? "Loading floor plans..." : "Select Floor Plan"}
                  </option>
                  {floorPlans.map((floorPlan) => (
                    <option key={floorPlan.id} value={floorPlan.id}>{floorPlan.name}</option>
                  ))}
                </select>
              </div>

              <div className="lead-group">
                <label>FLOOR *</label>
                <input name="floor" type="number" min="1" value={form.floor} onChange={updateForm} placeholder="Floor" required />
              </div>

              <div className="lead-group">
                <label>UNIT POSITION *</label>
                <input name="unitIndex" type="number" min="0" max="99" value={form.unitIndex} onChange={updateForm} placeholder="01" required />
              </div>

              <div className="lead-group">
                <label>UNIT NUMBER</label>
                <input value={generatedUnitNumber || "Generated after tower, floor, and position"} readOnly />
              </div>

              <div className="lead-group">
                <label>PROPERTY PURPOSE</label>
                <input name="propertyPurpose" value={form.propertyPurpose} onChange={updateForm} placeholder="Sale Unit" />
              </div>

              <div className="lead-group">
                <label>STATUS</label>
                <select name="status" value={form.status} onChange={updateForm}>
                  {statusOptions.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>

              <div className="lead-group">
                <label>BASE RATE</label>
                <input name="baseRate" type="number" value={form.baseRate} onChange={updateForm} placeholder="Base Rate" />
              </div>

              <div className="lead-group">
                <label>BASE PRICE</label>
                <input name="basePrice" type="number" value={form.basePrice} onChange={updateForm} placeholder="Base Price" />
              </div>
            </div>

            <div className="add-unit-summary">
              <span>Selected floor plan</span>
              <strong>{selectedFloorPlan?.name || "-"}</strong>
              <span>Carpet</span>
              <strong>{selectedFloorPlan?.carpet || 0} {selectedFloorPlan?.measure === "sqm" ? "Sq. M." : "Sq. Ft."}</strong>
              <span>Saleable</span>
              <strong>{selectedFloorPlan?.saleable || 0} {selectedFloorPlan?.measure === "sqm" ? "Sq. M." : "Sq. Ft."}</strong>
              <span>Rate Basis</span>
              <strong>{selectedFloorPlan?.rateBasis || "-"}</strong>
            </div>

            <div className="lead-buttons add-unit-actions">
              <button type="submit" className="lead-save" disabled={saving}>
                {saving ? "Saving..." : "Create Unit"}
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
