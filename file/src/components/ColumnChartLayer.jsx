import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { FaPlus } from "react-icons/fa";

const ColumnChartLayer = () => {
  const navigate = useNavigate();
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

  const [projects, setProjects] = useState([])
  
  useEffect(()=>{
      fetch(`${API_URL}/projects`)
      .then(res=>res.json())
      .then(data=>setProjects(data))
      .catch(err=>console.log(err))
  }, [API_URL]);

  return (
    <>
      <style>{`
        .project-wrapper {
          background: #ffffff;
          border-radius: 10px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.07);
          overflow: hidden;
          font-family: sans-serif;
        }

        .project-topbar {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 14px 20px;
          border-bottom: 1px solid #e2e8f0;
        }

        .project-count {
          font-size: 14px;
          color: #64748b;
        }

        .project-topbar-actions {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .btn-new-project {
          background: #7c3aed;
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
          background: #6d28d9;
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
          font-size: 13px;
        }

        .project-table thead tr {
          background: #f1f5f9;
        }

        .project-table thead th {
          padding: 11px 16px;
          text-align: left;
          font-weight: 600;
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
        }

        .project-table tbody tr {
          border-bottom: 1px solid #f1f5f9;
        }

        .project-table tbody tr:hover {
          background: #f8fafc;
        }

        .project-table tbody td {
          padding: 14px 16px;
          color: #1e293b;
        }

        .actions-cell {
          position: relative;
          text-align: right;
        }

        .actions-menu-btn {
          background: none;
          border: none;
          cursor: pointer;
          font-size: 20px;
        }

        .actions-dropdown {
          position: absolute;
          right: 10px;
          top: 36px;
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
          z-index: 100;
        }

        .actions-dropdown button {
          display: block;
          width: 100%;
          padding: 10px;
          background: none;
          border: none;
          cursor: pointer;
        }

        .actions-dropdown button:hover {
          background: #f1f5f9;
        }

        .danger {
          color: red;
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
              {projects.length === 0 ? (
                <tr>
                  <td colSpan="8">No Data</td>
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
      <td></td>
      <td className="actions-cell">
        <button onClick={() => setOpen(!open)}>⋮</button>

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