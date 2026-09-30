import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Plus, MoreVertical, Layers, Building, Trash2, Pencil, X } from 'lucide-react';

const TOWERS_PER_PAGE = 6;

export default function Projecttower() {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const normalizeList = (data) => {
    if (Array.isArray(data)) return data;
    if (Array.isArray(data?.data)) return data.data;
    if (Array.isArray(data?.projects)) return data.projects;
    if (Array.isArray(data?.towers)) return data.towers;
    if (Array.isArray(data?.value)) return data.value;
    return [];
  };
  const getProjectId = (project) => project?.id ?? project?.projectId;
  const getProjectName = (project) =>
    project?.name || project?.projectName || project?.title || (project?.id ? `Project #${project.id}` : "Project");
  const mapTower = (tower) => ({
    id: tower.id,
    name: tower.name || tower.towerName || "-",
    project: tower.project?.name || tower.projectName || (typeof tower.project === "string" ? tower.project : "-"),
    projectId: tower.projectId ?? tower.project?.id,
    floorPlans: tower._count?.floors ?? tower.floorPlanCount ?? tower.floorPlans ?? 0,
    totalFloors: tower.totalFloor ?? tower.totalFloors ?? 0,
    source: "backend",
  });

  const [towers, setTowers] = useState([]);
  const [projects, setProjects] = useState([]);
  const [name, setName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [totalFloors, setTotalFloors] = useState('');
  const [loadingProjects, setLoadingProjects] = useState(false);
  const [loadingTowers, setLoadingTowers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [towerLoadError, setTowerLoadError] = useState('');
  const [message, setMessage] = useState('');
  const [editingTowerId, setEditingTowerId] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [projectSearch, setProjectSearch] = useState('');
  const [projectDropdownOpen, setProjectDropdownOpen] = useState(false);

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

  const loadProjects = useCallback(async () => {
    try {
      setLoadingProjects(true);
      setError('');
      const response = await fetch(`${API_URL}/projects/list`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to load projects");

      setProjects(normalizeList(result));
    } catch (error) {
      console.error(
        "Project API failed:",
        error?.response?.status,
        error?.response?.data,
        error?.message || error
      );
      setProjects([]);
      setError(error.message || "Unable to load projects. Please try again.");
    } finally {
      setLoadingProjects(false);
    }
  }, [API_URL]);

  // Close project dropdown when clicking outside
  useEffect(() => {
    if (!projectDropdownOpen) return;
    const handleOutsideClick = (e) => {
      if (!e.target.closest('[data-project-dropdown]')) {
        setProjectDropdownOpen(false);
        setProjectSearch('');
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [projectDropdownOpen]);

  const fetchTowers = useCallback(async () => {
    const response = await fetch(`${API_URL}/tower/list`);
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result?.message || "Unable to refresh towers");

    const list = normalizeList(result);
    const mapped = list.map(mapTower);

    setTowers(mapped);
    setTowerLoadError('');
  }, [API_URL]);

  const loadTowers = useCallback(async () => {
    try {
      setLoadingTowers(true);
      setTowerLoadError('');
      await fetchTowers();
    } catch (error) {
      console.error(
        "Tower API failed:",
        error?.response?.status,
        error?.response?.data,
        error?.message || error
      );
      setTowers([]);
      setTowerLoadError("Unable to load towers. Please try again.");
    } finally {
      setLoadingTowers(false);
    }
  }, [fetchTowers]);

  useEffect(() => {
    setMessage('');
    loadProjects();
    loadTowers();
  }, [loadProjects, loadTowers]);

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
    if (!projectId) {
      setError("Please select a project.");
      setMessage('');
      return;
    }
    if (!name.trim()) {
      setError("Tower name is required.");
      setMessage('');
      return;
    }
    if (!Number.isInteger(totalFloorCount) || totalFloorCount < 1) {
      setError("Total floors must be greater than 0.");
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
        id: result?.data?.id || (isEditing ? editingTowerId : result.id || Date.now()),
        name: name.trim(),
        project: selectedProject ? getProjectName(selectedProject) : "-",
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
                {loadingTowers
                  ? "Loading towers..."
                  : `${projects.length} active projects | ${towers.length} towers available`}
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
          {towerLoadError && <div className="tower-alert">{towerLoadError}</div>}
          {message && <div className="tower-alert success">{message}</div>}
          {filteredTowers.length === 0 && !error && !towerLoadError && !loadingTowers && (
            <div className="tower-alert">
              {searchQuery ? "No matching towers found." : "No towers created yet. Create your first tower using the form."}
            </div>
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
            <div className="form-group" style={{ position: "relative" }}>
              <label>Project *</label>
              {/* Searchable Project Dropdown */}
              <div
                data-project-dropdown="true"
                style={{
                  border: "1px solid #d1d5db",
                  borderRadius: "8px",
                  background: loadingProjects ? "#f9fafb" : "#fff",
                  cursor: loadingProjects ? "not-allowed" : "pointer",
                  userSelect: "none",
                }}
              >
                {/* Trigger Button */}
                <div
                  onClick={() => !loadingProjects && setProjectDropdownOpen((o) => !o)}
                  style={{
                    padding: "9px 12px",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "14px",
                    color: projectId ? "#111827" : "#9ca3af",
                  }}
                >
                  <span>
                    {loadingProjects
                      ? "Loading projects..."
                      : projectId
                      ? getProjectName(projects.find((p) => String(getProjectId(p)) === String(projectId)) || {})
                      : "Select Project"}
                  </span>
                  <svg width="16" height="16" viewBox="0 0 20 20" fill="#6b7280" style={{ flexShrink: 0, transform: projectDropdownOpen ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                  </svg>
                </div>

                {/* Dropdown Panel */}
                {projectDropdownOpen && (
                  <div
                    style={{
                      position: "absolute",
                      top: "calc(100% + 4px)",
                      left: 0,
                      right: 0,
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: "8px",
                      boxShadow: "0 8px 24px rgba(0,0,0,0.12)",
                      zIndex: 1000,
                      overflow: "hidden",
                    }}
                  >
                    {/* Search Input */}
                    <div style={{ padding: "8px", borderBottom: "1px solid #f1f5f9" }}>
                      <input
                        type="search"
                        autoFocus
                        value={projectSearch}
                        onChange={(e) => setProjectSearch(e.target.value)}
                        placeholder="Search project..."
                        style={{
                          width: "100%",
                          border: "1px solid #e2e8f0",
                          borderRadius: "6px",
                          padding: "6px 10px",
                          fontSize: "13px",
                          outline: "none",
                          background: "#f8fafc",
                          color: "#1e293b",
                        }}
                      />
                    </div>

                    {/* Options List */}
                    <div style={{ maxHeight: "220px", overflowY: "auto" }}>
                      {/* Clear option */}
                      <div
                        onClick={() => { setProjectId(""); setProjectDropdownOpen(false); setProjectSearch(""); }}
                        style={{
                          padding: "8px 12px",
                          fontSize: "13px",
                          color: "#9ca3af",
                          cursor: "pointer",
                          background: !projectId ? "#f0f7ff" : "transparent",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = "#f0f7ff"; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = !projectId ? "#f0f7ff" : "transparent"; }}
                      >
                        Select Project
                      </div>

                      {projects
                        .filter((p) =>
                          !projectSearch.trim() ||
                          getProjectName(p).toLowerCase().includes(projectSearch.trim().toLowerCase())
                        )
                        .map((project) => {
                          const pid = String(getProjectId(project));
                          const pname = getProjectName(project);
                          const isSelected = String(projectId) === pid;
                          return (
                            <div
                              key={pid}
                              onClick={() => { setProjectId(pid); setProjectDropdownOpen(false); setProjectSearch(""); }}
                              style={{
                                padding: "8px 12px",
                                fontSize: "13px",
                                color: isSelected ? "#487fff" : "#1e293b",
                                fontWeight: isSelected ? 600 : 400,
                                background: isSelected ? "#eff6ff" : "transparent",
                                cursor: "pointer",
                                display: "flex",
                                alignItems: "center",
                                justifyContent: "space-between",
                              }}
                              onMouseEnter={(e) => { if (!isSelected) e.currentTarget.style.background = "#f8fafc"; }}
                              onMouseLeave={(e) => { e.currentTarget.style.background = isSelected ? "#eff6ff" : "transparent"; }}
                            >
                              {pname}
                              {isSelected && (
                                <svg width="14" height="14" viewBox="0 0 20 20" fill="#487fff">
                                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                </svg>
                              )}
                            </div>
                          );
                        })}

                      {projects.filter((p) =>
                        !projectSearch.trim() ||
                        getProjectName(p).toLowerCase().includes(projectSearch.trim().toLowerCase())
                      ).length === 0 && (
                        <div style={{ padding: "12px", fontSize: "13px", color: "#9ca3af", textAlign: "center" }}>
                          No projects found
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
              {/* Hidden required input for form validation */}
              <input type="hidden" value={projectId} required />
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
              <button type="submit" className="btn-primary" disabled={saving || loadingProjects}>
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
