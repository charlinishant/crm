import React, { useCallback, useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV, FaPlus } from "react-icons/fa";

const ColumnChartLayer = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [projects, setProjects] = useState([])
  const [loadError, setLoadError] = useState(null)
  const [message, setMessage] = useState("")
  const [modalMode, setModalMode] = useState("")
  const [selectedProject, setSelectedProject] = useState(null)
  const [projectForm, setProjectForm] = useState({})
  const [viewData, setViewData] = useState({ towers: [], floorPlans: [], units: [], loading: false, error: "" })

  const normalizeList = useCallback((data) => Array.isArray(data) ? data : Array.isArray(data?.data) ? data.data : Array.isArray(data?.items) ? data.items : [], [])
  const belongsToProject = useCallback((item, projectId) => String(item.project?.id ?? item.projectId ?? "") === String(projectId), [])

  const loadProjects = useCallback(() => {
    fetch(`${API_URL}/projects`)
      .then(res => res.json())
      .then(data => {
        setProjects(normalizeList(data))
      })
      .catch(err => {
        console.error(err)
        setLoadError('Unable to load projects')
        setProjects([])
      })
  }, [API_URL, normalizeList])
  
  useEffect(()=>{
      loadProjects()
  }, [loadProjects]);

  const openEditProject = (project) => {
    setSelectedProject(project)
    setProjectForm({
      name: project.name || "",
      projectType: project.projectType || "",
      reraProjectId: project.reraProjectId || "",
      noOfTowers: project.noOfTowers ?? "",
      active: Boolean(project.active),
      inventory: Boolean(project.inventory),
      integratedPortals: project.integratedPortals || "",
      address: project.address || "",
      city: project.city || "",
      state: project.state || "",
      country: project.country || "",
      description: project.description || "",
    })
    setModalMode("edit")
  }

  const openViewProject = async (project) => {
    setSelectedProject(project)
    setModalMode("view")
    setViewData({ towers: [], floorPlans: [], units: [], loading: true, error: "" })
    try {
      const [towerResponse, floorResponse, unitResponse] = await Promise.all([
        fetch(`${API_URL}/tower?limit=1000`),
        fetch(`${API_URL}/floor?limit=1000`),
        fetch(`${API_URL}/unit?limit=1000`),
      ])
      if (!towerResponse.ok || !floorResponse.ok || !unitResponse.ok) throw new Error("Unable to load project services")
      const [towerResult, floorResult, unitResult] = await Promise.all([towerResponse.json(), floorResponse.json(), unitResponse.json()])
      const projectId = String(project.id)
      setViewData({
        towers: normalizeList(towerResult).filter((tower) => belongsToProject(tower, projectId)),
        floorPlans: normalizeList(floorResult).filter((floor) => belongsToProject(floor, projectId)),
        units: normalizeList(unitResult).filter((unit) => belongsToProject(unit, projectId)),
        loading: false,
        error: "",
      })
    } catch (error) {
      console.error(error)
      setViewData({ towers: [], floorPlans: [], units: [], loading: false, error: "Unable to load tower, floor plan and unit details." })
    }
  }

  const closeModal = () => {
    setModalMode("")
    setSelectedProject(null)
    setProjectForm({})
  }

  const saveProject = async (event) => {
    event.preventDefault()
    if (!selectedProject?.id) return
    const payload = {
      ...projectForm,
      reraProjectId: projectForm.reraProjectId ? Number(projectForm.reraProjectId) : null,
      noOfTowers: Number(projectForm.noOfTowers) || 0,
      active: projectForm.active === true || String(projectForm.active) === "true",
      inventory: projectForm.inventory === true || String(projectForm.inventory) === "true",
    }
    try {
      const response = await fetch(`${API_URL}/projects/${selectedProject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      })
      const result = await response.json().catch(() => ({}))
      if (!response.ok) throw new Error(result?.message || "Unable to update project")
      setProjects((current) => current.map((project) => String(project.id) === String(selectedProject.id) ? { ...project, ...result } : project))
      setMessage("Project updated successfully.")
      closeModal()
    } catch (error) {
      setMessage(error.message || "Unable to update project.")
    }
  }

  const deleteProject = async (project) => {
    if (!window.confirm(`Delete ${project.name}? This action cannot be undone.`)) return
    try {
      const response = await fetch(`${API_URL}/projects/${project.id}`, { method: "DELETE" })
      if (!response.ok) throw new Error("Unable to delete project")
      setProjects((current) => current.filter((item) => String(item.id) !== String(project.id)))
      setMessage("Project deleted successfully.")
    } catch (error) {
      setMessage(error.message || "Unable to delete project. Remove linked towers, floor plans or units first.")
    }
  }

  return (
    <>
      <style>{`
        .project-wrapper {
          background: #ffffff;
          border-radius: 10px;
          border: 1px solid #e2e8f0;
          box-shadow: 0 4px 10px rgba(0, 0, 0, 0.05);
          padding: 20px;
        }

        .project-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 14px;
          margin-bottom: 15px;
        }

        .project-count {
          color: #1e293b;
          font-size: 18px;
          font-weight: 600;
        }

        .project-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-new-project {
          background: #487fff;
          color: #ffffff;
          border: none;
          padding: 9px 18px;
          border-radius: 6px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .btn-new-project:hover {
          background: #386fe8;
        }

        .project-table-container {
          overflow-x: auto;
        }

        .project-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .project-table thead th {
          background: #487fff !important;
          color: #ffffff !important;
          padding: 14px 15px;
          text-align: left;
          font-weight: 600;
          white-space: nowrap;
        }

        .project-table tbody tr {
          border-bottom: 1px solid #e2e8f0;
          transition: background 0.2s;
        }

        .project-table tbody tr:hover {
          background: #f1f5f9;
        }

        .project-table tbody tr:nth-child(even) {
          background: #f8fafc;
        }

        .project-table tbody tr:nth-child(even):hover {
          background: #f1f5f9;
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
          border-start-start-radius: 8px;
          border-end-start-radius: 8px;
        }

        .project-table thead th:last-child {
          border-start-end-radius: 8px;
          border-end-end-radius: 8px;
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
          position: absolute;
          right: 10px;
          top: 36px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          box-shadow: 0 10px 22px rgba(15, 23, 42, 0.14);
          min-width: 142px;
          overflow: hidden;
          z-index: 999;
        }

        .actions-dropdown button {
          display: block;
          width: 100%;
          padding: 12px 14px;
          background: #ffffff;
          border: none;
          color: #334155;
          cursor: pointer;
          font-size: 14px;
          text-align: left;
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

        .project-message {
          background: #eef6ff;
          border: 1px solid #bddcff;
          border-radius: 8px;
          color: #185fa5;
          margin-bottom: 12px;
          padding: 10px 12px;
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
          max-height: 86vh;
          max-width: 1080px;
          overflow-y: auto;
          padding: 22px;
          width: 100%;
        }

        .project-modal-head {
          align-items: flex-start;
          border-bottom: 1px solid #e2e8f0;
          display: flex;
          justify-content: space-between;
          margin-bottom: 18px;
          padding-bottom: 14px;
        }

        .project-modal,
        .project-modal-head h2,
        .project-related h3 {
          color: #0f172a;
          font-size: 15px !important;
          line-height: 1.35;
        }

        .project-modal-head h2,
        .project-related h3 {
          margin: 0 0 8px;
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

        .project-edit-form input,
        .project-edit-form select,
        .project-edit-form textarea {
          border: 1px solid #d6dee9;
          border-radius: 8px;
          min-height: 40px;
          padding: 0 12px;
        }

        .project-edit-form textarea {
          min-height: 80px;
          padding: 10px 12px;
        }

        .project-form-wide,
        .project-modal-actions {
          grid-column: 1 / -1;
        }

        .project-modal-actions {
          display: flex;
          gap: 10px;
          justify-content: flex-end;
        }

        .project-modal-actions button,
        .project-modal-close {
          border: 1px solid #d6dee9;
          border-radius: 8px;
          cursor: pointer;
          min-height: 38px;
          padding: 0 14px;
        }

        .project-modal-actions .primary {
          background: #487fff;
          border-color: #487fff;
          color: #ffffff;
        }

        .project-related {
          border-top: 1px solid #e2e8f0;
          margin-top: 18px;
          padding-top: 16px;
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
          font-size: 15px;
          padding: 10px;
          text-align: left;
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
        }
      `}</style>
      

      <div className="project-wrapper">

        {/* TOP BAR */}
        <div className="project-topbar">
          <span className="project-count">{projects.length} items</span>

          <div className="project-topbar-actions">

            <button
              className="btn-new-project"
              onClick={() => navigate("/new-project")}
            >
              <FaPlus /> New Project
            </button>

          </div>
        </div>

        {message && <div className="project-message">{message}</div>}

        {/* TABLE */}
        <div className="project-table-container">
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
              ) : projects.length === 0 ? (
                <tr>
                  <td colSpan="8" className="project-empty">No Data Available</td>
                </tr>
              ) : (
                projects.map((proj) => (
                  <ProjectRow
                    key={proj.id}
                    proj={proj}
                    onEdit={() => openEditProject(proj)}
                    onView={() => openViewProject(proj)}
                    onDelete={() => deleteProject(proj)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      {modalMode === "edit" && (
        <div className="project-modal-backdrop">
          <section className="project-modal">
            <div className="project-modal-head">
              <h2>Edit Project</h2>
              <button type="button" className="project-modal-close" onClick={closeModal}>x</button>
            </div>
            <form className="project-edit-form" onSubmit={saveProject}>
              <label><span>Project Name *</span><input value={projectForm.name || ""} onChange={(event) => setProjectForm((current) => ({ ...current, name: event.target.value }))} required /></label>
              <label><span>Project Type</span><input value={projectForm.projectType || ""} onChange={(event) => setProjectForm((current) => ({ ...current, projectType: event.target.value }))} /></label>
              <label><span>RERA Project ID</span><input type="number" value={projectForm.reraProjectId || ""} onChange={(event) => setProjectForm((current) => ({ ...current, reraProjectId: event.target.value }))} /></label>
              <label><span>Number of Towers</span><input type="number" value={projectForm.noOfTowers || ""} onChange={(event) => setProjectForm((current) => ({ ...current, noOfTowers: event.target.value }))} /></label>
              <label><span>Active</span><select value={String(projectForm.active)} onChange={(event) => setProjectForm((current) => ({ ...current, active: event.target.value }))}><option value="true">Yes</option><option value="false">No</option></select></label>
              <label><span>Inventory</span><select value={String(projectForm.inventory)} onChange={(event) => setProjectForm((current) => ({ ...current, inventory: event.target.value }))}><option value="true">Yes</option><option value="false">No</option></select></label>
              <label><span>Integrated Portals</span><input value={projectForm.integratedPortals || ""} onChange={(event) => setProjectForm((current) => ({ ...current, integratedPortals: event.target.value }))} /></label>
              <label><span>City</span><input value={projectForm.city || ""} onChange={(event) => setProjectForm((current) => ({ ...current, city: event.target.value }))} /></label>
              <label className="project-form-wide"><span>Address</span><textarea value={projectForm.address || ""} onChange={(event) => setProjectForm((current) => ({ ...current, address: event.target.value }))} /></label>
              <label className="project-form-wide"><span>Description</span><textarea value={projectForm.description || ""} onChange={(event) => setProjectForm((current) => ({ ...current, description: event.target.value }))} /></label>
              <div className="project-modal-actions"><button type="button" onClick={closeModal}>Cancel</button><button type="submit" className="primary">Save Changes</button></div>
            </form>
          </section>
        </div>
      )}
      {modalMode === "view" && selectedProject && (
        <div className="project-modal-backdrop">
          <section className="project-modal">
            <div className="project-modal-head">
              <h2>{selectedProject.name}</h2>
              <button type="button" className="project-modal-close" onClick={closeModal}>x</button>
            </div>
            <div className="project-detail-grid">
              <div><span>Project Type</span><strong>{selectedProject.projectType || "-"}</strong></div>
              <div><span>RERA ID</span><strong>{selectedProject.reraProjectId || "-"}</strong></div>
              <div><span>Active</span><strong>{selectedProject.active ? "Yes" : "No"}</strong></div>
              <div><span>Inventory</span><strong>{selectedProject.inventory ? "Yes" : "No"}</strong></div>
            </div>
            {viewData.loading ? <div className="project-empty">Loading project services...</div> : viewData.error ? <div className="project-empty text-danger">{viewData.error}</div> : (
              <>
                <RelatedSection title={`Towers (${viewData.towers.length})`} columns={["Tower", "Total Floors", "RERA Tower ID"]} rows={viewData.towers.map((tower) => [tower.name, tower.totalFloor ?? "-", tower.reraTowerId || "-"])} />
                <RelatedSection title={`Floor Plans (${viewData.floorPlans.length})`} columns={["Floor Plan", "Tower", "Type", "Status", "Saleable"]} rows={viewData.floorPlans.map((floor) => [floor.name, floor.tower?.name || "-", floor.type || floor.configurationLabel || "-", floor.status || "-", floor.saleable ?? "-"])} />
                <RelatedSection title={`Units (${viewData.units.length})`} columns={["Unit Group", "Tower", "Floor Plan", "Units", "Type"]} rows={viewData.units.map((unit) => [unit.unitList?.map((item) => item.name || item.unitIndex).filter(Boolean).join(", ") || `Unit #${unit.id}`, unit.tower?.name || "-", unit.floor?.name || "-", unit.unitList?.length || 0, unit.type || unit.category || "-"])} />
              </>
            )}
          </section>
        </div>
      )}
    </>
  );
};

const ProjectRow = ({ proj, onEdit, onView, onDelete }) => {
  const [open, setOpen] = useState(false);
  const date = new Date(proj.createdAt);

  const formatted = date.toLocaleDateString('en-GB');
  return (
    <tr>
      <td>{proj.name}</td>
      <td>{proj.noOfTowers}</td>
      <td>{proj.active? "Yes" : "No"}</td>
      <td>{proj.inventory? "Yes" : "No"}</td>
      <td>{proj.sales}</td>
      <td>{formatted}</td>
      <td>{proj.integratedPortals}</td>
      <td className="actions-cell">
        <button className="actions-menu-btn" type="button" onClick={() => setOpen(!open)}>
          <FaEllipsisV />
        </button>

        {open && (
          <div className="actions-dropdown">
            <button type="button" onClick={onEdit}>Edit</button>
            <button type="button" onClick={onView}>View</button>
            <button type="button" className="danger" onClick={onDelete}>Delete</button>
          </div>
        )}
      </td>
    </tr>
  );
};

const RelatedSection = ({ title, columns, rows }) => (
  <section className="project-related">
    <h3>{title}</h3>
    <div className="project-related-table">
      <table>
        <thead>
          <tr>{columns.map((column) => <th key={column}>{column}</th>)}</tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr><td colSpan={columns.length}>No records found.</td></tr>
          ) : rows.map((row, rowIndex) => (
            <tr key={`${title}-${rowIndex}`}>
              {row.map((cell, cellIndex) => <td key={`${title}-${rowIndex}-${cellIndex}`}>{cell || "-"}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </section>
);

export default ColumnChartLayer;
