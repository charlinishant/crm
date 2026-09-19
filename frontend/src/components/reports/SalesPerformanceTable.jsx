import React, { useMemo, useState } from "react";

const RECORDS_PER_PAGE = 10;

const SalesPerformanceTable = ({ data = [], onSegmentClick }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;

    return data.filter((row) =>
      [
        row.userName,
        row.assignedLeads,
        row.qualifiedLeads,
        row.followUpsDone,
        row.missedFollowUps,
        row.siteVisits,
        row.bookings,
        `${row.conversionPercentage}%`,
      ]
        .filter((value) => value !== undefined && value !== null)
        .some((value) => String(value).toLowerCase().includes(query))
    );
  }, [data, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / RECORDS_PER_PAGE));
  const activePage = Math.min(currentPage, totalPages);
  const pageStartIndex = (activePage - 1) * RECORDS_PER_PAGE;
  const paginatedData = filteredData.slice(pageStartIndex, pageStartIndex + RECORDS_PER_PAGE);
  const pageEndIndex = Math.min(pageStartIndex + paginatedData.length, filteredData.length);

  const handleSearchChange = (event) => {
    setSearchQuery(event.target.value);
    setCurrentPage(1);
  };

  const handleCellClick = (row, metric, metricLabel, count) => {
    if (!onSegmentClick || !count || count <= 0) return;
    onSegmentClick({
      segmentType: "salesPerformance",
      userId: row.userId,
      salesUserId: row.userId,
      userName: row.userName,
      metric,
      count,
      title: `${metricLabel} — ${row.userName}`,
    });
  };

  const renderClickableCount = (row, metric, metricLabel, count, badgeClass = "badge-info") => {
    if (!onSegmentClick || !count || count <= 0) {
      return <span>{count ?? 0}</span>;
    }
    return (
      <button
        type="button"
        className="btn btn-sm btn-link p-0 text-decoration-none fw-bold"
        style={{ cursor: "pointer", color: "inherit" }}
        onClick={() => handleCellClick(row, metric, metricLabel, count)}
        title={`Click to view ${count} ${metricLabel.toLowerCase()}`}
      >
        <span className={`badge ${badgeClass} text-primary bg-light border`}>
          {count} 🔍
        </span>
      </button>
    );
  };

  return (
    <div className="admin-report-table-card sales-performance-table-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Sales User Performance</h6>
        {onSegmentClick && (
          <small className="text-muted" style={{ fontSize: "11px" }}>💡 Click any count badge to drill into leads</small>
        )}
      </div>
      <label className="crm-table-search sales-performance-search">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          value={searchQuery}
          onChange={handleSearchChange}
          placeholder="Search sales performance..."
          aria-label="Search sales performance"
        />
      </label>
      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Sales User</th>
              <th>Assigned</th>
              <th>Qualified</th>
              <th>Follow-ups Done</th>
              <th>Missed</th>
              <th>Site Visits</th>
              <th>Bookings</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Conversion %</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length ? paginatedData.map((row) => (
              <tr key={row.userId || row.userName}>
                <td>
                  <div className="sales-performance-user">{row.userName}</div>
                </td>
                <td>{renderClickableCount(row, "assignedLeads", "Assigned Leads", row.assignedLeads)}</td>
                <td>{renderClickableCount(row, "qualifiedLeads", "Qualified Leads", row.qualifiedLeads)}</td>
                <td>{renderClickableCount(row, "followupsDone", "Follow-ups Done", row.followUpsDone)}</td>
                <td>{renderClickableCount(row, "missedFollowups", "Missed Follow-ups", row.missedFollowUps)}</td>
                <td>{renderClickableCount(row, "siteVisits", "Site Visits", row.siteVisits)}</td>
                <td>{renderClickableCount(row, "bookings", "Bookings", row.bookings)}</td>
                <td><strong>{row.conversionPercentage}%</strong></td>
              </tr>
            )) : (
              <tr>
                <td colSpan="8" className="admin-report-empty-cell">
                  {searchQuery ? "No matching sales performance data" : "No sales performance data"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {filteredData.length > 0 && (
        <div className="lead-pagination sales-performance-pagination">
          <div className="lead-pagination-info">
            Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
            <strong>{filteredData.length}</strong> records
          </div>
          <div className="lead-pagination-actions">
            <button
              type="button"
              className="lead-pagination-btn"
              onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
              disabled={activePage === 1}
            >
              Previous
            </button>
            <span className="lead-pagination-page">
              {activePage} / {totalPages}
            </span>
            <button
              type="button"
              className="lead-pagination-btn"
              onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
              disabled={activePage === totalPages}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesPerformanceTable;
