import React, { useEffect, useMemo, useState } from 'react';
import { Plus, MoreVertical, Layers, Building, Trash2, Pencil, X } from 'lucide-react';

const TOWERS_PER_PAGE = 6;

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
  const [projectId, setProjectId] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingTowerId, setEditingTowerId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);

  const isEditing = editingTowerId !== null;
  const filteredTowers = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return towers;

    return towers.filter((tower) =>
      [
        tower.name,
        tower.project,
        tower.floorPlans,
        tower.totalFloors,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [searchQuery, towers]);
  const totalPages = Math.max(1, Math.ceil(filteredTowers.length / TOWERS_PER_PAGE));
  const paginatedTowers = useMemo(() => {
    const startIndex = (currentPage - 1) * TOWERS_PER_PAGE;
    return filteredTowers.slice(startIndex, startIndex + TOWERS_PER_PAGE);
  }, [currentPage, filteredTowers]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        setLoading(true);
        setError('');
        setMessage('');
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
    setProjectId('');
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
    setTotalFloors(tower.totalFloors || '');
    setEditingTowerId(tower.id);
    setActiveMenuId(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const totalFloorCount = Number(totalFloors);
    if (!name || !projectId || !Number.isInteger(totalFloorCount) || totalFloorCount < 1) {
      setError("Tower Name, Project, and Total Floors are required.");
      setMessage('');
      return;
    }

    setSaving(true);
    setError('');
    setMessage('');

    const selectedProject = projects.find((item) => String(item.id) === String(projectId));

    try {
      const payload = {
        name: name.trim(),
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
      setMessage(`Tower ${isEditing ? "updated" : "created"} successfully.`);
      resetForm();

      try {
        await fetchTowers();
      } catch (refreshError) {
        console.warn("Tower saved, but refresh failed:", refreshError);
      }
    } catch (error) {
      console.error("Unable to save tower:", error);
      setError(
        error.message === "Failed to fetch"
          ? `Unable to connect to backend at ${API_URL}. Please make sure the backend is running.`
          : error.message || "Unable to save tower"
      );
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    const previousTowers = towers;
    setError('');
    setMessage('');
    setActiveMenuId(null);
    setTowers((current) => current.filter((tower) => tower.id !== id));

    try {
      const response = await fetch(`${API_URL}/tower/${id}`, { method: "DELETE" });
      let result = null;
      try {
        result = await response.json();
      } catch {
        result = null;
      }

      if (!response.ok) {
        throw new Error(result?.message || result || "Unable to delete tower");
      }

      await fetchTowers();
    } catch (error) {
      console.error("Unable to delete tower:", error);
      setTowers(previousTowers);
      setError(error.message || "Unable to delete tower");
    }
  };

  return (
    <div className="tower-dashboard">
      <div className="dashboard-container">
        
        {/* Left Side: Tower List Grid */}
        <div className="list-column">
          <div className="list-header">
            <div>
              {/* <h2>Towers</h2> */}
              <span className="item-count">
                {loading ? "Loading towers..." : `${filteredTowers.length} active projects and towers available.`}
              </span>
            </div>
            <div className="action-wrapper">
              {/* <button className="btn-filter" title="Filter Towers">
                <Filter size={18} />
              </button> */}
            </div>
          </div>

          <label className="crm-table-search tower-search-field">
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
          {message && <div className="tower-alert success">{message}</div>}
          {filteredTowers.length === 0 && !error && !message && (
            <div className="tower-alert">{searchQuery ? "No matching towers found." : "No towers found."}</div>
          )}

          <div className="tower-grid">
            {paginatedTowers.map((tower) => (
              <div key={tower.id} className="tower-item-card">
                <div className="tower-item-header">
                  <div className="tower-title-section">
                    <Building className="building-icon" size={20} />
                    <div>
                      <h4 className="tower-name">{tower.name}</h4>
                      <p className="tower-project">
                        {tower.project}
                      </p>
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

          {filteredTowers.length > 6 && (
            <div className="tower-pagination">
              <span className="tower-pagination-info">
                Showing <strong>{(currentPage - 1) * 6 + 1}-{Math.min(currentPage * 6, filteredTowers.length)}</strong> of <strong>{filteredTowers.length}</strong> towers
              </span>
              <div className="tower-pagination-actions">
                <button
                  type="button"
                  className="tower-pagination-btn"
                  onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                  disabled={currentPage === 1}
                >
                  Previous
                </button>
                <span className="tower-pagination-page-num">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  type="button"
                  className="tower-pagination-btn"
                  onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                  disabled={currentPage === totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          )}
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
              <label>Total Floors *</label>
              <input
                type="number"
                value={totalFloors}
                onChange={(e) => setTotalFloors(e.target.value)}
                onWheel={(e) => e.currentTarget.blur()}
                placeholder="1"
                min="1"
                required
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
