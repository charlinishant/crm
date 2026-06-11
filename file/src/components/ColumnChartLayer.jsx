import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaEllipsisV, FaPlus } from "react-icons/fa";

const ColumnChartLayer = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [projects, setProjects] = useState([])
  const [loadError, setLoadError] = useState(null)
  
  useEffect(()=>{
      fetch(`${API_URL}/projects`)
      .then(res => res.json())
      .then(data => {
        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data.data)
          ? data.data
          : Array.isArray(data.items)
          ? data.items
          : []
        setProjects(normalized)
      })
      .catch(err => {
        console.error(err)
        setLoadError('Unable to load projects')
        setProjects([])
      })
  }, [API_URL]);

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

        .icon-btn {
          width: 36px;
          height: 36px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: #ffffff;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
        }

        .icon-btn:hover {
          background: #f1f5f9;
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

            {/* ✅ FIXED BUTTON */}
            <button
              className="btn-new-project"
              onClick={() => navigate("/new-project")}
            >
              <FaPlus /> New Project
            </button>

            <button className="icon-btn">⬆</button>
            <button className="icon-btn">◑</button>
            <button className="icon-btn">▼</button>
          </div>
        </div>

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
                  <ProjectRow key={proj.id} proj={proj} />
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
};

const ProjectRow = ({ proj }) => {
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
            <button>Edit</button>
            <button>View</button>
            <button className="danger">Delete</button>
          </div>
        )}
      </td>
    </tr>
  );
};

export default ColumnChartLayer;
