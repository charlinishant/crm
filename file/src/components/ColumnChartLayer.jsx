import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV, FaPlus } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const emptyProjectForm = {
  name: "",
  description: "",
  reraProjectId: "",
  projectType: "",
  address: "",
  street: "",
  country: "",
  state: "",
  city: "",
  zip: "",
  locality: "",
  latitude: "",
  longitude: "",
  noOfTowers: "",
  active: false,
  inventory: false,
  integratedPortals: "",
};

const normalizeList = (data) =>
  Array.isArray(data)
    ? data
    : Array.isArray(data?.data)
    ? data.data
    : Array.isArray(data?.items)
    ? data.items
    : [];

const formatDate = (value) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString("en-GB");
};

const toBoolean = (value) => value === true || String(value).toLowerCase() === "true";

const getProjectName = (project) => project?.name || project?.projectName || `Project #${project?.id}`;

const ColumnChartLayer = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [modalMode, setModalMode] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [projectForm, setProjectForm] = useState(emptyProjectForm);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewData, setViewData] = useState({
    towers: [],
    floorPlans: [],
    units: [],
    loading: false,
    error: "",
  });

  const loadProjects = useCallback(async () => {
    try {
      setLoadError(null);
      const response = await fetch(`${API_URL}/projects`);
      if (!response.ok) throw new Error("Unable to load projects");
      const data = await response.json();
      setProjects(normalizeList(data));
    } catch (err) {
      console.error(err);
      setLoadError("Unable to load projects");
      setProjects([]);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const projectStats = useMemo(
    () => ({
      count: projects.length,
    }),
    [projects.length]
  );
  const filteredProjects = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return projects;

    return projects.filter((project) =>
      [
        project.name,
        project.description,
        project.projectType,
        project.reraProjectId,
        project.address,
        project.city,
        project.state,
        project.country,
        project.noOfTowers,
        project.sales,
        project.integratedPortals,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);

  const openEditProject = (project) => {
    setOpenMenuId(null);
    setSelectedProject(project);
    setProjectForm({
      name: project.name || "",
      description: project.description || "",
      reraProjectId: project.reraProjectId || "",
      projectType: project.projectType || "",
      address: project.address || "",
      street: project.street || "",
      country: project.country || "",
      state: project.state || "",
      city: project.city || "",
      zip: project.zip || "",
      locality: project.locality || "",
      latitude: project.latitude || "",
      longitude: project.longitude || "",
      noOfTowers: project.noOfTowers ?? "",
      active: Boolean(project.active),
      inventory: Boolean(project.inventory),
      integratedPortals: project.integratedPortals || "",
    });
    setModalMode("edit");
    setMessage("");
  };

  const openViewProject = async (project) => {
    setOpenMenuId(null);
    setSelectedProject(project);
    setModalMode("view");
    setViewData({ towers: [], floorPlans: [], units: [], loading: true, error: "" });

    try {
      const [towerResponse, floorResponse, unitResponse] = await Promise.all([
        fetch(`${API_URL}/tower?limit=1000`),
        fetch(`${API_URL}/floor?limit=1000`),
        fetch(`${API_URL}/unit?limit=1000`),
      ]);

      if (!towerResponse.ok || !floorResponse.ok || !unitResponse.ok) {
        throw new Error("Unable to load project services");
      }

      const [towerResult, floorResult, unitResult] = await Promise.all([
        towerResponse.json(),
        floorResponse.json(),
        unitResponse.json(),
      ]);

      const projectId = String(project.id);
      setViewData({
        towers: normalizeList(towerResult).filter((tower) => String(tower.project?.id) === projectId),
        floorPlans: normalizeList(floorResult).filter((floor) => String(floor.project?.id) === projectId),
        units: normalizeList(unitResult).filter((unit) => String(unit.project?.id) === projectId),
        loading: false,
        error: "",
      });
    } catch (error) {
      console.error(error);
      setViewData({ towers: [], floorPlans: [], units: [], loading: false, error: "Unable to load tower, floor plan and unit details." });
    }
  };

  const closeModal = () => {
    setModalMode("");
    setSelectedProject(null);
    setProjectForm(emptyProjectForm);
    setViewData({ towers: [], floorPlans: [], units: [], loading: false, error: "" });
  };

  const handleFormChange = (event) => {
    const { name, value, type, checked } = event.target;
    setProjectForm((current) => ({
      ...current,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const saveProject = async (event) => {
    event.preventDefault();
    if (!selectedProject?.id) return;

    setIsSaving(true);
    setMessage("");

    const payload = {
      name: projectForm.name,
      description: projectForm.description,
      reraProjectId: projectForm.reraProjectId ? Number(projectForm.reraProjectId) : null,
      projectType: projectForm.projectType,
      address: projectForm.address,
      street: projectForm.street,
      country: projectForm.country,
      state: projectForm.state,
      city: projectForm.city,
      zip: projectForm.zip,
      locality: projectForm.locality,
      latitude: projectForm.latitude,
      longitude: projectForm.longitude,
      noOfTowers: Number(projectForm.noOfTowers) || 0,
      active: toBoolean(projectForm.active),
      inventory: toBoolean(projectForm.inventory),
      integratedPortals: projectForm.integratedPortals || "",
    };

    try {
      const response = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to update project");

      setProjects((current) =>
        current.map((project) =>
          String(project.id) === String(selectedProject.id) ? { ...project, ...result } : project
        )
      );
      closeModal();
      window.alert("Project updated successfully!");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Unable to update project.");
    } finally {
      setIsSaving(false);
    }
  };

  const deleteProject = async (project) => {
    setOpenMenuId(null);
    const shouldDelete = window.confirm(`Delete ${getProjectName(project)}? This action cannot be undone.`);
    if (!shouldDelete) return;

    try {
      const response = await fetch(`${API_URL}/projects/${project.id}`, { method: "DELETE" });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.message || "Unable to delete project");
      }

      setProjects((current) => current.filter((item) => String(item.id) !== String(project.id)));
      window.alert("Project deleted successfully!");
    } catch (error) {
      console.error(error);
      setMessage(error.message || "Unable to delete project. Remove linked towers, floor plans or units first.");
    }
  };

  return (
    <>
      <style>{projectStyles}</style>

      <div className="project-wrapper">
        <div className="project-topbar">
          <span className="project-count">{projectStats.count} items</span>

          <div className="project-topbar-actions">
            <button className="btn-new-project" onClick={() => navigate("/new-project")}>
              <FaPlus /> New Project
            </button>
          </div>
        </div>

        {message && <div className="project-message">{message}</div>}

        <div className="project-table-container">
          <label className="crm-table-search">
            <span aria-hidden="true">🔍</span>
            <input
              type="search"
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search project..."
              aria-label="Search projects"
            />
          </label>
          <table className="project-table">
            <thead>
              <tr>
                <th>Project</th>
                <th>Number of Towers</th>
                <th>Active</th>
                <th>Inventory</th>
                <th>Post Sales</th>
                <th>Created On</th>
                <th>Integrated Portals</th>
                <th>Actions</th>
              </tr>
            </thead>

            <tbody>
              {loadError ? (
                <tr>
                  <td colSpan="8" className="project-empty text-danger">{loadError}</td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="8" className="project-empty">{searchQuery ? "No matching projects found" : "No Data Available"}</td>
                </tr>
              ) : (
                filteredProjects.map((project) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    isOpen={openMenuId === project.id}
                    onToggleMenu={() => setOpenMenuId((current) => (current === project.id ? null : project.id))}
                    onEdit={() => openEditProject(project)}
                    onView={() => openViewProject(project)}
                    onDelete={() => deleteProject(project)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {modalMode === "edit" && (
        <ProjectEditModal
          form={projectForm}
          isSaving={isSaving}
          onChange={handleFormChange}
          onClose={closeModal}
          onSubmit={saveProject}
        />
      )}

      {modalMode === "view" && selectedProject && (
        <ProjectViewModal
          project={selectedProject}
          viewData={viewData}
          onClose={closeModal}
        />
      )}
    </>
  );
};

const ProjectRow = ({ project, isOpen, onToggleMenu, onEdit, onView, onDelete }) => (
  <tr>
    <td>{project.name}</td>
    <td>{project.noOfTowers ?? 0}</td>
    <td>{project.active ? "Yes" : "No"}</td>
    <td>{project.inventory ? "Yes" : "No"}</td>
    <td>{project.sales || "-"}</td>
    <td>{formatDate(project.createdAt)}</td>
    <td>{project.integratedPortals || "-"}</td>
    <td className="actions-cell">
      <button className="actions-menu-btn" type="button" onClick={onToggleMenu} aria-label={`Actions for ${project.name}`}>
        <FaEllipsisV />
      </button>

      {isOpen && (
        <div className="actions-dropdown">
          <button type="button" onClick={onEdit}>Edit</button>
          <button type="button" onClick={onView}>View</button>
          <button type="button" className="danger" onClick={onDelete}>Delete</button>
        </div>
      )}
    </td>
  </tr>
);

const ProjectEditModal = ({ form, isSaving, onChange, onClose, onSubmit }) => (
  <div className="project-modal-backdrop">
    <section className="project-modal" role="dialog" aria-modal="true" aria-labelledby="project-edit-title">
      <div className="project-modal-head">
        <div>
          <h2 id="project-edit-title">Edit Project</h2>
          <p>Update project form details and save them to this record.</p>
        </div>
        <button type="button" className="project-modal-close" onClick={onClose}>x</button>
      </div>

      <form className="project-edit-form" onSubmit={onSubmit}>
        <label>
          <span>Project Name *</span>
          <input name="name" value={form.name} onChange={onChange} required />
        </label>

        <label>
          <span>Project Type</span>
          <select name="projectType" value={form.projectType} onChange={onChange} required>
            <option value="">Select</option>
            <option value="residential">Residential</option>
            <option value="commercial">Commercial</option>
            <option value="residential_commercial">Residential + Commercial</option>
          </select>
        </label>

        <label>
          <span>RERA Project ID</span>
          <input name="reraProjectId" type="number" value={form.reraProjectId} onChange={onChange} />
        </label>

        <label>
          <span>Number of Towers</span>
          <input name="noOfTowers" type="number" min="0" value={form.noOfTowers} onChange={onChange} />
        </label>

        <label>
          <span>Active</span>
          <select name="active" value={String(form.active)} onChange={onChange}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <label>
          <span>Inventory</span>
          <select name="inventory" value={String(form.inventory)} onChange={onChange}>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </label>

        <label>
          <span>Integrated Portals</span>
          <input name="integratedPortals" value={form.integratedPortals} onChange={onChange} />
        </label>

        <label>
          <span>Country</span>
          <input name="country" value={form.country} onChange={onChange} />
        </label>

        <label>
          <span>State</span>
          <input name="state" value={form.state} onChange={onChange} />
        </label>

        <label>
          <span>City</span>
          <input name="city" value={form.city} onChange={onChange} />
        </label>

        <label>
          <span>Zip</span>
          <input name="zip" value={form.zip} onChange={onChange} />
        </label>

        <label>
          <span>Locality</span>
          <input name="locality" value={form.locality} onChange={onChange} />
        </label>

        <label>
          <span>Latitude</span>
          <input name="latitude" value={form.latitude} onChange={onChange} />
        </label>

        <label>
          <span>Longitude</span>
          <input name="longitude" value={form.longitude} onChange={onChange} />
        </label>

        <label className="project-form-wide">
          <span>Street</span>
          <input name="street" value={form.street} onChange={onChange} />
        </label>

        <label className="project-form-wide">
          <span>Address</span>
          <textarea name="address" value={form.address} onChange={onChange} />
        </label>

        <label className="project-form-wide">
          <span>Description</span>
          <textarea name="description" value={form.description} onChange={onChange} />
        </label>

        <div className="project-modal-actions">
          <button type="button" onClick={onClose}>Cancel</button>
          <button type="submit" className="primary" disabled={isSaving}>
            {isSaving ? "Saving..." : "Save Changes"}
          </button>
        </div>
      </form>
    </section>
  </div>
);

const ProjectViewModal = ({ project, viewData, onClose }) => (
  <div className="project-modal-backdrop">
    <section className="project-modal project-view-modal" role="dialog" aria-modal="true" aria-labelledby="project-view-title">
      <div className="project-modal-head">
        <div>
          <h2 id="project-view-title">{project.name}</h2>
          <p>Read-only project details with towers, floor plans and units.</p>
        </div>
        <button type="button" className="project-modal-close" onClick={onClose}>x</button>
      </div>

      <div className="project-detail-grid">
        <Detail label="Project Type" value={project.projectType} />
        <Detail label="RERA ID" value={project.reraProjectId} />
        <Detail label="Created On" value={formatDate(project.createdAt)} />
        <Detail label="Active" value={project.active ? "Yes" : "No"} />
        <Detail label="Inventory" value={project.inventory ? "Yes" : "No"} />
        <Detail label="Integrated Portals" value={project.integratedPortals} />
        <Detail label="Address" value={[project.address, project.locality, project.city, project.state, project.country, project.zip].filter(Boolean).join(", ")} wide />
        <Detail label="Description" value={project.description?.replace(/<[^>]*>/g, "")} wide />
      </div>

      {viewData.loading ? (
        <div className="project-related-loading">Loading project services...</div>
      ) : viewData.error ? (
        <div className="project-empty text-danger">{viewData.error}</div>
      ) : (
        <>
          <RelatedSection
            title={`Towers (${viewData.towers.length})`}
            columns={["Tower", "Total Floors", "RERA Tower ID"]}
            rows={viewData.towers.map((tower) => [
              tower.name,
              tower.totalFloor ?? "-",
              tower.reraTowerId || "-",
            ])}
          />

          <RelatedSection
            title={`Floor Plans (${viewData.floorPlans.length})`}
            columns={["Floor Plan", "Tower", "Type", "Status", "Saleable"]}
            rows={viewData.floorPlans.map((floor) => [
              floor.name,
              floor.tower?.name || "-",
              floor.type || floor.configurationLabel || "-",
              floor.status || "-",
              floor.saleable ?? "-",
            ])}
          />

          <RelatedSection
            title={`Units (${viewData.units.length})`}
            columns={["Unit Group", "Tower", "Floor Plan", "Units", "Type"]}
            rows={viewData.units.map((unit) => [
              unit.unitList?.map((item) => item.name || item.unitIndex).filter(Boolean).join(", ") || `Unit #${unit.id}`,
              unit.tower?.name || "-",
              unit.floor?.name || "-",
              unit.unitList?.length || 0,
              unit.type || unit.category || "-",
            ])}
          />
        </>
      )}
    </section>
  </div>
);

const Detail = ({ label, value, wide = false }) => (
  <div className={wide ? "wide" : ""}>
    <span>{label}</span>
    <strong>{value || "-"}</strong>
  </div>
);

const RelatedSection = ({ title, columns, rows }) => (
  <section className="project-related">
    <h3>{title}</h3>
    <div className="project-related-table">
      <table>
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column}>{column}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length}>No records found.</td>
            </tr>
          ) : (
            rows.map((row, rowIndex) => (
              <tr key={`${title}-${rowIndex}`}>
                {row.map((cell, cellIndex) => (
                  <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell || "-"}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

const projectStyles = `
  .project-wrapper {
    background: #ffffff;
    border-radius: 10px;
    border: 1px solid #e2e8f0;
    box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
    padding: 20px;
  }

  .project-topbar {
    align-items: center;
    display: flex;
    gap: 14px;
    justify-content: space-between;
    margin-bottom: 15px;
  }

  .project-count {
    color: #1e293b;
    font-size: 18px;
    font-weight: 600;
  }

  .project-topbar-actions {
    align-items: center;
    display: flex;
    gap: 8px;
  }

  .btn-new-project {
    align-items: center;
    background: #487fff;
    border: none;
    border-radius: 6px;
    color: #ffffff;
    cursor: pointer;
    display: flex;
    font-size: 14px;
    font-weight: 600;
    gap: 6px;
    padding: 9px 18px;
  }

  .btn-new-project:hover {
    background: #386fe8;
  }

  .icon-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    cursor: pointer;
    display: flex;
    height: 36px;
    justify-content: center;
    width: 36px;
  }

  .icon-btn:hover {
    background: #f1f5f9;
  }

  .project-message {
    background: #eef6ff;
    border: 1px solid #bddcff;
    border-radius: 8px;
    color: #185fa5;
    margin-bottom: 12px;
    padding: 10px 12px;
  }

  .project-table-container {
    overflow-x: auto;
  }

  .project-table {
    border-collapse: collapse;
    font-size: 14px;
    width: 100%;
  }

  .project-table thead th {
    background: #487fff !important;
    color: #ffffff !important;
    font-weight: 600;
    padding: 14px 15px;
    text-align: left;
    white-space: nowrap;
  }

  .project-table tbody tr {
    border-bottom: 1px solid #e2e8f0;
    transition: background 0.2s;
  }

  .project-table tbody tr:hover,
  .project-table tbody tr:nth-child(even):hover {
    background: #f1f5f9;
  }

  .project-table tbody tr:nth-child(even) {
    background: #f8fafc;
  }

  .project-table tbody td {
    color: #334155;
    font-size: 14px;
    padding: 12px 15px;
    position: relative;
    vertical-align: middle;
    white-space: nowrap;
  }

  .project-table thead th:first-child {
    border-end-start-radius: 8px;
    border-start-start-radius: 8px;
  }

  .project-table thead th:last-child {
    border-end-end-radius: 8px;
    border-start-end-radius: 8px;
    text-align: center;
  }

  .actions-cell {
    overflow: visible;
    position: relative;
    text-align: center;
  }

  .actions-menu-btn {
    align-items: center;
    background: #ffffff;
    border: 1px solid #d1d5db;
    border-radius: 6px;
    color: #475569;
    cursor: pointer;
    display: inline-flex;
    height: 32px;
    justify-content: center;
    width: 32px;
  }

  .actions-menu-btn svg {
    height: 14px;
    width: 14px;
  }

  .actions-dropdown {
    background: #ffffff;
    border: 1px solid #e2e8f0;
    border-radius: 6px;
    box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
    min-width: 142px;
    overflow: hidden;
    position: absolute;
    right: 10px;
    top: 36px;
    z-index: 999;
  }

  .actions-dropdown button {
    background: #ffffff;
    border: none;
    color: #334155;
    cursor: pointer;
    display: block;
    font-size: 14px;
    padding: 12px 14px;
    text-align: left;
    width: 100%;
  }

  .actions-dropdown button:hover {
    background: #f1f5f9;
  }

  .danger {
    color: #dc2626 !important;
  }

  .project-empty {
    color: #94a3b8 !important;
    padding: 30px !important;
    text-align: center;
  }

  .project-modal-backdrop {
    align-items: center;
    background: rgba(15, 23, 42, 0.42);
    bottom: 0;
    display: flex;
    justify-content: center;
    left: 0;
    padding: 24px;
    position: fixed;
    right: 0;
    top: 0;
    z-index: 1600;
  }

  .project-modal {
    background: #ffffff;
    border-radius: 10px;
    box-shadow: 0 24px 70px rgba(15, 23, 42, 0.24);
    max-height: min(86vh, 880px);
    max-width: 980px;
    overflow-y: auto;
    padding: 22px;
    width: 100%;
  }

  .project-view-modal {
    max-width: 1120px;
  }

  .project-modal-head {
    align-items: flex-start;
    border-bottom: 1px solid #e2e8f0;
    display: flex;
    gap: 16px;
    justify-content: space-between;
    margin-bottom: 18px;
    padding-bottom: 14px;
  }

  .project-modal-head h2 {
    color: #0f172a;
    font-size: 20px;
    margin: 0 0 4px;
  }

  .project-modal-head p {
    color: #64748b;
    margin: 0;
  }

  .project-modal-close {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    color: #334155;
    cursor: pointer;
    font-size: 22px;
    height: 36px;
    line-height: 1;
    width: 36px;
  }

  .project-edit-form,
  .project-detail-grid {
    display: grid;
    gap: 14px;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .project-edit-form label {
    display: grid;
    gap: 7px;
  }

  .project-edit-form span,
  .project-detail-grid span {
    color: #64748b;
    font-size: 12px;
    font-weight: 700;
  }

  .project-edit-form input,
  .project-edit-form select,
  .project-edit-form textarea {
    border: 1px solid #d6dee9;
    border-radius: 8px;
    color: #1e293b;
    font: inherit;
    min-height: 40px;
    padding: 0 12px;
  }

  .project-edit-form textarea {
    min-height: 86px;
    padding: 10px 12px;
    resize: vertical;
  }

  .project-form-wide,
  .project-modal-actions,
  .project-detail-grid .wide {
    grid-column: 1 / -1;
  }

  .project-modal-actions {
    display: flex;
    gap: 10px;
    justify-content: flex-end;
    padding-top: 4px;
  }

  .project-modal-actions button {
    background: #ffffff;
    border: 1px solid #d6dee9;
    border-radius: 8px;
    color: #334155;
    cursor: pointer;
    font-weight: 700;
    min-height: 40px;
    padding: 0 16px;
  }

  .project-modal-actions .primary {
    background: #487fff;
    border-color: #487fff;
    color: #ffffff;
  }

  .project-modal-actions button:disabled {
    cursor: not-allowed;
    opacity: 0.6;
  }

  .project-detail-grid {
    margin-bottom: 20px;
  }

  .project-detail-grid div {
    background: #f8fafc;
    border: 1px solid #e2e8f0;
    border-radius: 8px;
    padding: 12px;
  }

  .project-detail-grid strong {
    color: #1e293b;
    display: block;
    font-size: 14px;
    font-weight: 600;
    margin-top: 5px;
    overflow-wrap: anywhere;
  }

  .project-related {
    border-top: 1px solid #e2e8f0;
    padding-top: 16px;
  }

  .project-related + .project-related {
    margin-top: 18px;
  }

  .project-related h3 {
    color: #0f172a;
    font-size: 15px !important;
    line-height: 1.35;
    margin: 0 0 10px;
  }

  .project-related-table {
    overflow-x: auto;
  }

  .project-related-table table {
    border-collapse: collapse;
    min-width: 620px;
    width: 100%;
  }

  .project-related-table th,
  .project-related-table td {
    border-bottom: 1px solid #e2e8f0;
    color: #334155;
    font-size: 13px;
    padding: 10px;
    text-align: left;
  }

  .project-related-table th {
    background: #f8fafc;
    color: #475569;
    font-weight: 700;
  }

  .project-related-loading {
    color: #64748b;
    padding: 16px 0;
  }

  @media (max-width: 768px) {
    .project-wrapper {
      overflow-x: auto;
    }

    .project-topbar {
      align-items: stretch;
      flex-direction: column;
    }

    .project-topbar-actions {
      justify-content: space-between;
    }

    .project-table {
      min-width: 760px;
    }

    .project-edit-form,
    .project-detail-grid {
      grid-template-columns: 1fr;
    }
  }
`;

export default ColumnChartLayer;
