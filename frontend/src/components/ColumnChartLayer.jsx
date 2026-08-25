import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV, FaPlus } from "react-icons/fa";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const ROWS_PER_PAGE = 10;

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

const getProjectName = (project) => project?.name || project?.projectName || `Project #${project?.id}`;

const formatDisplayValue = (value) => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) {
    if (!value.length) return "-";
    return value.map(formatDisplayValue).join(", ");
  }
  if (typeof value === "object") {
    return value.name || value.label || value.title || value.id || "-";
  }
  return value;
};

const ColumnChartLayer = () => {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [loadError, setLoadError] = useState(null);
  const [message, setMessage] = useState("");
  const [openMenuId, setOpenMenuId] = useState(null);
  const [modalMode, setModalMode] = useState("");
  const [selectedProject, setSelectedProject] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
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
        project.postSales ? "Yes" : "No",
        project.integratedPortals,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [projects, searchQuery]);
  const totalPages = Math.max(1, Math.ceil(filteredProjects.length / ROWS_PER_PAGE));
  const paginatedProjects = useMemo(() => {
    const startIndex = (currentPage - 1) * ROWS_PER_PAGE;
    return filteredProjects.slice(startIndex, startIndex + ROWS_PER_PAGE);
  }, [currentPage, filteredProjects]);
  const pageStartIndex = (currentPage - 1) * ROWS_PER_PAGE;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery]);

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [currentPage, totalPages]);

  const openEditProject = (project) => {
    setOpenMenuId(null);
    navigate(`/new-project?editProjectId=${project.id}`);
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
    setViewData({ towers: [], floorPlans: [], units: [], loading: false, error: "" });
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
                <th>SR. NO.</th>
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
                  <td colSpan="9" className="project-empty text-danger">{loadError}</td>
                </tr>
              ) : filteredProjects.length === 0 ? (
                <tr>
                  <td colSpan="9" className="project-empty">{searchQuery ? "No matching projects found" : "No Data Available"}</td>
                </tr>
              ) : (
                paginatedProjects.map((project, index) => (
                  <ProjectRow
                    key={project.id}
                    project={project}
                    serialNumber={pageStartIndex + index + 1}
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
          {filteredProjects.length > ROWS_PER_PAGE && (
            <TablePagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPrevious={() => setCurrentPage((page) => Math.max(1, page - 1))}
              onNext={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
            />
          )}
        </div>
      </div>

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

const ProjectRow = ({ project, serialNumber, isOpen, onToggleMenu, onEdit, onView, onDelete }) => (
  <tr>
    <td className="fw-bold">{serialNumber}</td>
    <td>{project.name}</td>
    <td>{project.towerCount ?? project.noOfTowers ?? project._count?.tower ?? 0}</td>
    <td>{project.active ? "Yes" : "No"}</td>
    <td>{project.inventory ? "Yes" : "No"}</td>
    <td>{project.postSales ? "Yes" : "No"}</td>
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

const TablePagination = ({ currentPage, totalPages, onPrevious, onNext }) => (
  <div className="table-pagination">
    <span>
      Showing page <strong>{currentPage}</strong> of <strong>{totalPages}</strong>
    </span>
    <div className="table-pagination-actions">
      <button type="button" onClick={onPrevious} disabled={currentPage === 1}>
        Previous
      </button>
      <button type="button" onClick={onNext} disabled={currentPage === totalPages}>
        Next
      </button>
    </div>
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
        <Detail label="Post Sales" value={project.postSales ? "Yes" : "No"} />
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
    <strong>{formatDisplayValue(value)}</strong>
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
                  <td key={`${title}-${rowIndex}-${cellIndex}`}>{formatDisplayValue(cell)}</td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  </section>
);

export default ColumnChartLayer;
