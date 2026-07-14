import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Filter, MoreVertical, Layers, Building, Trash2, Pencil, X } from 'lucide-react';

const floorConventionOptions = [
  { value: "GROUND_IS_FLOOR_1", label: "Ground is Floor 1" },
  { value: "STILT_NOT_COUNTED", label: "Stilt not counted" },
  { value: "STILT_COUNTED_AS_FLOOR", label: "Stilt counted as floor" },
];

const getFloorConventionLabel = (value) =>
  floorConventionOptions.find((option) => option.value === value)?.label || "Ground is Floor 1";

export default function Projecttower() {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.value)) return data.value;
    return [];
  };

  const [towers, setTowers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [wingCode, setWingCode] = useState('');
  const [projectId, setProjectId] = useState('');
  const [floorNumberingConvention, setFloorNumberingConvention] = useState("GROUND_IS_FLOOR_1");
  const [skippedFloors, setSkippedFloors] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingTowerId, setEditingTowerId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const isEditing = editingTowerId !== null;
  const filteredTowers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return towers;

    return towers.filter((tower) =>
      [
        tower.name,
        tower.wingCode,
        getFloorConventionLabel(tower.floorNumberingConvention),
        tower.skippedFloors,
        tower.project,
        tower.floorPlans,
        tower.totalFloors,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchQuery, towers]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError('');
        const [projectResponse, towerResponse] = await Promise.all([
          fetch(`${API_URL}/projects/list`),
          fetch(`${API_URL}/tower?limit=100`),
        ]);

        if (!projectResponse.ok) throw new Error("Unable to load projects");
        if (!towerResponse.ok) throw new Error("Unable to load towers");

        const projectResult = await projectResponse.json();
        const towerResult = await towerResponse.json();
        const projectList = normalizeList(projectResult);
        const towerList = normalizeList(towerResult);

        setProjects(projectList);
        const mapped = towerList.map((tower) => ({
          id: tower.id,
          name: tower.name,
          wingCode: tower.wingCode || "",
          floorNumberingConvention: tower.floorNumberingConvention || "GROUND_IS_FLOOR_1",
          skippedFloors: tower.skippedFloors || "",
          project: tower.project?.name || tower.project || "-",
          projectId: tower.project?.id,
          floorPlans: tower._count?.floors ?? tower.floorPlans ?? 0,
          totalFloors: tower.totalFloor ?? tower.totalFloors ?? 0,
          source: "backend",
        }));

        setTowers(mapped);
      } catch (error) {
        console.error("Unable to load project towers:", error);
        setError(error.message || "Unable to load project towers");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [API_URL]);

  const fetchTowers = async () => {
    const response = await fetch(`${API_URL}/tower?limit=100`);
    if (!response.ok) throw new Error("Unable to refresh towers");

    const result = await response.json();
    const list = normalizeList(result);
    const mapped = list.map((tower) => ({
      id: tower.id,
      name: tower.name,
      wingCode: tower.wingCode || "",
      floorNumberingConvention: tower.floorNumberingConvention || "GROUND_IS_FLOOR_1",
      skippedFloors: tower.skippedFloors || "",
      project: tower.project?.name || tower.project || "-",
      projectId: tower.project?.id,
      floorPlans: tower._count?.floors ?? tower.floorPlans ?? 0,
      totalFloors: tower.totalFloor ?? tower.totalFloors ?? 0,
      source: "backend",
    }));

    setTowers(mapped);
  };

  const resetForm = () => {
    setName('');
    setWingCode('');
    setProjectId('');
    setFloorNumberingConvention("GROUND_IS_FLOOR_1");
    setSkippedFloors('');
    setTotalFloors('');
    setEditingTowerId(null);
    setActiveMenuId(null);
  };

  const handleEdit = (tower) => {
    const matchedProject = projects.find((project) => {
      return (
        String(project.id) === String(tower.projectId) ||
        project.name === tower.project
      );
    });

    setName(tower.name || '');
    setWingCode(tower.wingCode || '');
    setProjectId(tower.projectId || matchedProject?.id || '');
    setFloorNumberingConvention(tower.floorNumberingConvention || "GROUND_IS_FLOOR_1");
    setSkippedFloors(tower.skippedFloors || '');
    setTotalFloors(tower.totalFloors || '');
    setEditingTowerId(tower.id);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalFloorCount = Number(totalFloors);
    if (!name || !wingCode || !projectId || !Number.isInteger(totalFloorCount) || totalFloorCount < 1) {
      setError("Tower Name, Wing Code, Project, and Total Floors of at least 1 are required.");
      return;
    }

    setSaving(true);
    setError('');

    const selectedProject = projects.find((item) => String(item.id) === String(projectId));

    try {
      const payload = {
        name: name.trim(),
        wingCode: wingCode.trim().toUpperCase(),
        floorNumberingConvention,
        skippedFloors: skippedFloors.trim(),
        projectId: Number(projectId),
        totalFloor: totalFloorCount,
      };

      const response = await fetch(
        isEditing ? `${API_URL}/tower/${editingTowerId}` : `${API_URL}/tower`,
        {
          method: isEditing ? "PATCH" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(payload),
        }
      );

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = {};
      }

      if (!response.ok) {
        throw new Error(result?.message || `Failed to ${isEditing ? "update" : "create"} tower`);
      }

      const savedTower = {
        id: isEditing ? editingTowerId : result.id || Date.now(),
        name: name.trim(),
        wingCode: wingCode.trim().toUpperCase(),
        floorNumberingConvention,
        skippedFloors: skippedFloors.trim(),
        project: selectedProject?.name || "-",
        projectId: Number(projectId),
        floorPlans: 0,
        totalFloors: totalFloorCount,
        source: "backend",
      };

      setTowers((current) => {
        if (isEditing) {
          return current.map((tower) => (
            tower.id === editingTowerId ? { ...tower, ...savedTower } : tower
          ));
        }

        return [savedTower, ...current];
      });
      await fetchTowers();
      resetForm();
    } catch (error) {
      console.error("Unable to save tower:", error);
      setError(error.message || "Unable to save tower");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const tower = towers.find((item) => item.id === id);
    const updatedTowers = towers.filter((tower) => tower.id !== id);
    setTowers(updatedTowers);

    if (tower?.source !== "backend") return;

    try {
      await fetch(`${API_URL}/tower/${id}`, { method: "DELETE" });
    } catch (error) {
      console.error("Unable to delete tower:", error);
    }
  };

  return (
    <div className="tower-dashboard">
      <div className="dashboard-container">
        
        {/* Left Side: Tower List Grid */}
        <div className="list-column">
          <div className="list-header">
            <div>
              <h2>Towers</h2>
              <span className="item-count">
                {loading ? "Loading towers..." : `${filteredTowers.length} active projects and towers available.`}
              </span>
            </div>
            <div className="action-wrapper">
              <button className="btn-filter" title="Filter Towers">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="tower-grid">
            <label className="crm-table-search" style={{ gridColumn: "1 / -1" }}>
              <span aria-hidden="true">🔍</span>
              <input
                type="search"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Search tower..."
                aria-label="Search towers"
              />
            </label>
            {error && <div className="tower-alert">{error}</div>}
            {filteredTowers.length === 0 && !error && (
              <div className="tower-alert">{searchQuery ? "No matching towers found." : "No towers found."}</div>
            )}
            {filteredTowers.map((tower) => (
              <div key={tower.id} className="tower-item-card">
                <div className="tower-item-header">
                  <div className="tower-title-section">
                    <Building className="building-icon" size={20} />
                    <div>
                      <h4 className="tower-name">{tower.name}</h4>
                      <p className="tower-project">
                        {tower.project}
                        {tower.wingCode ? <span className="tower-code">Wing {tower.wingCode}</span> : null}
                      </p>
                      <p className="tower-project">{getFloorConventionLabel(tower.floorNumberingConvention)}</p>
                      {tower.skippedFloors ? <p className="tower-project">Skipped Floors: {tower.skippedFloors}</p> : null}
                    </div>
                  </div>
                  
                  <div className="card-actions">
                    <button
                      className="btn-action"
                      type="button"
                      onClick={() => handleDelete(tower.id)}
                      title="Delete Tower"
                    >
                      <Trash2 size={16} />
                    </button>
                    <div className="tower-menu-wrapper">
                      <button
                        className="btn-action"
                        type="button"
                        onClick={() => setActiveMenuId((current) => current === tower.id ? null : tower.id)}
                        title="Tower Options"
                      >
                        <MoreVertical size={16} />
                      </button>
                      {activeMenuId === tower.id && (
                        <div className="tower-action-menu">
                          <button type="button" onClick={() => handleEdit(tower)}>
                            <Pencil size={14} />
                            <span>Edit</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="tower-metrics">
                  <div className="metric-box">
                    <Layers size={16} className="metric-icon" />
                    <div>
                      <span className="metric-label">Floor Plans</span>
                      <span className="metric-value">{tower.floorPlans}</span>
                    </div>
                  </div>
                  <div className="metric-box">
                    <Building size={16} className="metric-icon" />
                    <div>
                      <span className="metric-label">Total Floors</span>
                      <span className="metric-value">{tower.totalFloors}</span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Right Side: Form Fields Section */}
        <div className="form-column">
          <div className="card-header">
            <h3>{isEditing ? "Edit Tower" : "Add New Tower"}</h3>
            <p>{isEditing ? "Update tower details and save them to the database." : "Create a new tower and map it to a project."}</p>
          </div>
          
          <form onSubmit={handleSubmit}>
            <div className="form-group">
              <label>Project *</label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                disabled={loading}
                required
              >
                <option value="">{loading ? "Loading projects..." : "Select Project"}</option>
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Tower Name *</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. TOWER F"
                required
              />
            </div>

            <div className="form-group">
              <label>Wing Code *</label>
              <input
                type="text"
                value={wingCode}
                onChange={(e) => setWingCode(e.target.value.toUpperCase())}
                placeholder="e.g. A, B, TG"
                maxLength={12}
                required
              />
            </div>

            <div className="form-group">
              <label>Stilt / Ground Convention *</label>
              <select
                value={floorNumberingConvention}
                onChange={(e) => setFloorNumberingConvention(e.target.value)}
                required
              >
                {floorConventionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>Total Floors *</label>
              <input
                type="number"
                value={totalFloors}
                onChange={(e) => setTotalFloors(e.target.value)}
                placeholder="1"
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Skipped Floors</label>
              <input
                type="text"
                value={skippedFloors}
                onChange={(e) => setSkippedFloors(e.target.value)}
                placeholder="13, 14"
              />
            </div>

            <div className="form-footer">
              <button type="submit" className="btn-primary" disabled={saving || loading}>
                {isEditing ? <Pencil size={16} /> : <Plus size={16} />}
                {saving ? "Saving..." : isEditing ? "Update Tower" : "Save Tower"}
              </button>
              {isEditing && (
                <button type="button" className="btn-secondary" onClick={resetForm} disabled={saving}>
                  <X size={16} /> Cancel Edit
                </button>
              )}
            </div>
          </form>
        </div>

      </div>
    </div>
  );
}
