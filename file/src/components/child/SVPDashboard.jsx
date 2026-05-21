import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import "./svpDashboard.css";

const SVPDashboard = () => {
  const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
  const recordsPerPage = 10;
  const navigate = useNavigate();
  const [visitedLeads, setVisitedLeads] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const getLeadName = (lead) => {
    const fullName = [lead.firstName, lead.lastName].filter(Boolean).join(" ");
    return lead.name || fullName || "-";
  };

  const getUserName = (user) =>
    [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
    user?.username ||
    user?.email ||
    "-";

  const formatVisitDate = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return value;
    return date.toLocaleDateString("en-GB");
  };

  const formatVisitDay = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleDateString("en-US", { weekday: "long" });
  };

  const formatVisitTime = (value) => {
    if (!value) return "-";
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return "-";
    return date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const fetchVisitedLeads = useCallback(async (showLoading = false) => {
    try {
      if (showLoading) setIsLoading(true);

      const response = await fetch(`${API_URL}/leads/`);
      if (!response.ok) throw new Error("Unable to load visited leads");

      const result = await response.json();
      const leads = Array.isArray(result) ? result : result?.data || [];
      setVisitedLeads(leads.filter((lead) => lead.conductSiteVisit || lead.conductSiteDate));
      setError("");
    } catch (err) {
      console.error("Unable to load visited leads:", err);
      setError(err.message || "Unable to load visited leads");
    } finally {
      if (showLoading) setIsLoading(false);
    }
  }, [API_URL]);

  useEffect(() => {
    fetchVisitedLeads(true);
    const intervalId = window.setInterval(() => fetchVisitedLeads(false), 15000);
    return () => window.clearInterval(intervalId);
  }, [fetchVisitedLeads]);

  const totalPages = Math.max(1, Math.ceil(visitedLeads.length / recordsPerPage));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * recordsPerPage;
  const paginatedLeads = visitedLeads.slice(pageStartIndex, pageStartIndex + recordsPerPage);
  const pageEndIndex = Math.min(pageStartIndex + paginatedLeads.length, visitedLeads.length);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const handleEdit = (lead) => {
    window.sessionStorage.setItem("selectedLeadEdit", JSON.stringify(lead));
    const leadId = lead.id || lead._id || lead.lead_id || "";
    navigate(leadId ? `/add-lead?editLeadId=${leadId}` : "/add-lead", { state: { lead } });
  };

  return (
    <div className="svp-container">
      <div className="svp-header">
        <div>
          <p className="breadcrumb">Home / Scheduled Visit Planned Report</p>
          <p className="svp-title">Scheduled Visit Planned Report</p>
        </div>

        <div className="svp-actions">
          <button className="btn-outline">Export</button>
          <button className="btn-outline">Calendar</button>
        </div>
      </div>

      <div className="svp-card">
        <div className="count-box">{isLoading ? "..." : visitedLeads.length}</div>
        <div>
          <p className="card-title">Lead Visited</p>
          <span className="card-sub">Visited</span>
        </div>
      </div>

      <button className="smart-btn">Smart Search</button>

      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Scheduled Date</th>
              <th>Day</th>
              <th>Time</th>
              <th>Assigned To</th>
              <th>Project</th>
              <th>Description</th>
              <th>Action</th>
            </tr>
          </thead>

          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="8" className="svp-empty-state">Loading visited leads...</td>
              </tr>
            ) : error ? (
              <tr>
                <td colSpan="8" className="svp-empty-state">{error}</td>
              </tr>
            ) : visitedLeads.length === 0 ? (
              <tr>
                <td colSpan="8" className="svp-empty-state">No visited leads found</td>
              </tr>
            ) : (
              paginatedLeads.map((lead) => (
                <tr key={lead.id || lead._id || `${lead.firstName}-${lead.lastName}`}>
                  <td>{getLeadName(lead)}</td>
                  <td>{formatVisitDate(lead.conductSiteDate)}</td>
                  <td>{formatVisitDay(lead.conductSiteDate)}</td>
                  <td>{formatVisitTime(lead.conductSiteDate)}</td>
                  <td>{getUserName(lead.team)}</td>
                  <td>{lead.interestedProjects || lead.project || "-"}</td>
                  <td>{lead.conductSiteVisit || lead.requirementComment || "-"}</td>
                  <td>
                    <button
                      type="button"
                      className="edit-btn"
                      onClick={() => handleEdit(lead)}
                    >
                      Edit
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        {visitedLeads.length > 0 && (
          <div className="svp-pagination">
            <div className="svp-pagination-info">
              Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
              <strong>{visitedLeads.length}</strong> visited leads
            </div>
            <div className="svp-pagination-actions">
              <button
                type="button"
                className="svp-pagination-btn"
                onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                disabled={activePage === 1}
              >
                Previous
              </button>
              <span className="svp-pagination-page">{activePage} / {totalPages}</span>
              <button
                type="button"
                className="svp-pagination-btn"
                onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                disabled={activePage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SVPDashboard;
