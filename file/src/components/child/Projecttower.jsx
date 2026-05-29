import React, { useEffect, useState } from 'react';
import { Plus, Filter, MoreVertical, Layers, Building, Trash2, Pencil, X } from 'lucide-react';
import './Projecttower.css';

const initialTowerData = [
  { id: 1, name: 'TOWER D', project: 'Binghatti Hills', floorPlans: 27, totalFloors: 36 },
  { id: 2, name: 'TOWER E', project: 'Binghatti Hills', floorPlans: 5, totalFloors: 30 },
  { id: 3, name: 'Aa', project: 'Binghatti Hills', floorPlans: 2, totalFloors: 1 },
  { id: 4, name: 'A', project: 'Binghatti Hills', floorPlans: 3, totalFloors: 1 },
  { id: 5, name: 'Default Tower', project: 'Nyati Baner', floorPlans: 1, totalFloors: 1 },
  { id: 6, name: 'Towe', project: 'Binghatti Hills', floorPlans: 1, totalFloors: 1 },
  { id: 7, name: 'Default Tower', project: 'Lodha Greens', floorPlans: 2, totalFloors: 1 },
  { id: 8, name: 'Default Tower', project: 'ABC', floorPlans: 1, totalFloors: 1 },
  { id: 9, name: 'Default Tower', project: 'Vasant utsav', floorPlans: 1, totalFloors: 1 },
  { id: 10, name: 'T1', project: 'Binghatti Hills', floorPlans: 1, totalFloors: 22 },
  { id: 11, name: 'Default Tower', project: 'Adhinn PG', floorPlans: 2, totalFloors: 1 },
];

export default function Projecttower() {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.value)) return data.value;
    return [];
  };

  const readStoredTowers = () => {
    try {
      const stored = JSON.parse(window.localStorage.getItem("projectTowers") || "[]");
      return Array.isArray(stored) && stored.length ? stored : initialTowerData;
    } catch {
      return initialTowerData;
    }
  };

  const [towers, setTowers] = useState(readStoredTowers);
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [floorPlans, setFloorPlans] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [editingTowerId, setEditingTowerId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const isEditing = editingTowerId !== null;

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
        if (!towerList.length) return;

        const mapped = towerList.map((tower) => ({
          id: tower.id,
          name: tower.name,
          project: tower.project?.name || tower.project || "-",
          projectId: tower.project?.id,
          floorPlans: tower.floorPlans || 0,
          totalFloors: tower.totalFloor || tower.totalFloors || 0,
          source: "backend",
        }));

        setTowers(mapped);
        window.localStorage.setItem("projectTowers", JSON.stringify(mapped));
      } catch (error) {
        console.error("Unable to load project towers:", error);
        setError(error.message || "Unable to load project towers");
      } finally {
        setLoading(false);
      }
    };

    fetchOptions();
  }, [API_URL]);

  useEffect(() => {
    window.localStorage.setItem("projectTowers", JSON.stringify(towers));
  }, [towers]);

  const fetchTowers = async () => {
    const response = await fetch(`${API_URL}/tower?limit=100`);
    if (!response.ok) throw new Error("Unable to refresh towers");

    const result = await response.json();
    const list = normalizeList(result);
    const mapped = list.map((tower) => ({
      id: tower.id,
      name: tower.name,
      project: tower.project?.name || tower.project || "-",
      projectId: tower.project?.id,
      floorPlans: tower.floorPlans || 0,
      totalFloors: tower.totalFloor || tower.totalFloors || 0,
      source: "backend",
    }));

    setTowers(mapped.length ? mapped : readStoredTowers());
  };

  const resetForm = () => {
    setName('');
    setProjectId('');
    setFloorPlans('');
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
    setProjectId(tower.projectId || matchedProject?.id || '');
    setFloorPlans(tower.floorPlans || '');
    setTotalFloors(tower.totalFloors || '');
    setEditingTowerId(tower.id);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name || !projectId) return;

    setSaving(true);
    setError('');

    const selectedProject = projects.find((item) => String(item.id) === String(projectId));

    try {
      const payload = {
        name: name.trim(),
        projectId: Number(projectId),
        totalFloor: Number(totalFloors) || 0,
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
        project: selectedProject?.name || "-",
        projectId: Number(projectId),
        floorPlans: parseInt(floorPlans) || 0,
        totalFloors: parseInt(totalFloors) || 0,
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
                {loading ? "Loading towers..." : `${towers.length} active projects and towers available.`}
              </span>
            </div>
            <div className="action-wrapper">
              <button className="btn-filter" title="Filter Towers">
                <Filter size={18} />
              </button>
            </div>
          </div>

          <div className="tower-grid">
            {error && <div className="tower-alert">{error}</div>}
            {towers.map((tower) => (
              <div key={tower.id} className="tower-item-card">
                <div className="tower-item-header">
                  <div className="tower-title-section">
                    <Building className="building-icon" size={20} />
                    <div>
                      <h4 className="tower-name">{tower.name}</h4>
                      <p className="tower-project">{tower.project}</p>
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

            <div className="form-row">
              <div className="form-group half">
                <label>Floor Plans</label>
                <input
                  type="number"
                  value={floorPlans}
                  onChange={(e) => setFloorPlans(e.target.value)}
                  placeholder="1"
                />
              </div>
              
              <div className="form-group half">
                <label>Total Floors</label>
                <input
                  type="number"
                  value={totalFloors}
                  onChange={(e) => setTotalFloors(e.target.value)}
                  placeholder="1"
                />
              </div>
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
