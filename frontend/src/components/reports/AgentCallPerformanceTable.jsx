import React, { useMemo, useState } from "react";

const RECORDS_PER_PAGE = 10;

const AgentCallPerformanceTable = ({ data = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) return data;

    return data.filter((row) =>
      [
        row.userName,
        row.role,
        row.extension,
        row.phone,
        row.callingMode,
        row.totalCalls,
        row.inbound,
        row.outbound,
        row.answered,
        row.missed,
        `${row.answerRate}%`,
        row.talkTimeFormatted,
        row.avgDurationFormatted,
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

  return (
    <div className="admin-report-table-card agent-call-performance-table-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6>Agent Call & Telephony Performance</h6>
          <small className="text-muted">Agent-wise call volume, talk time, and response rates</small>
        </div>
        <label className="crm-table-search sales-performance-search" style={{ maxWidth: "280px" }}>
          <input
            type="search"
            value={searchQuery}
            onChange={handleSearchChange}
            placeholder="Search agent performance..."
            aria-label="Search agent performance"
            style={{ border: "none", outline: "none", boxShadow: "none", background: "transparent", width: "100%", padding: 0 }}
          />
        </label>
      </div>

      <div className="table-responsive">
        <table>
          <thead>
            <tr>
              <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px" }}>Agent</th>
              <th>Ext / Mode</th>
              <th>Total Calls</th>
              <th>Inbound</th>
              <th>Outbound</th>
              <th>Answered</th>
              <th>Missed</th>
              <th>Answer Rate</th>
              <th>Total Talk Time</th>
              <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px" }}>Avg Duration</th>
            </tr>
          </thead>
          <tbody>
            {filteredData.length ? (
              paginatedData.map((row) => (
                <tr key={row.userId || row.userName}>
                  <td>
                    <div className="sales-performance-user font-semibold">{row.userName}</div>
                    <small className="text-muted">{row.role}</small>
                  </td>
                  <td>
                    <div>Ext: <strong>{row.extension || "-"}</strong></div>
                    <span className={`badge ${row.callingMode === "softphone" ? "bg-info-subtle text-info" : "bg-light text-dark"}`} style={{ fontSize: "10px" }}>
                      {row.callingMode || "softphone"}
                    </span>
                  </td>
                  <td><strong>{row.totalCalls}</strong></td>
                  <td><span className="text-info font-medium">{row.inbound}</span></td>
                  <td><span className="text-primary font-medium">{row.outbound}</span></td>
                  <td><span className="text-success font-medium">{row.answered}</span></td>
                  <td>
                    {row.missed > 0 ? (
                      <span className="text-danger font-medium">{row.missed}</span>
                    ) : (
                      <span className="text-muted">0</span>
                    )}
                  </td>
                  <td>
                    <div className="d-flex align-items-center gap-2">
                      <span className="font-semibold">{row.answerRate}%</span>
                      <div className="progress" style={{ width: "45px", height: "6px" }}>
                        <div
                          className={`progress-bar ${row.answerRate >= 70 ? "bg-success" : row.answerRate >= 40 ? "bg-warning" : "bg-danger"}`}
                          style={{ width: `${Math.min(100, row.answerRate)}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td><span className="font-medium text-dark">{row.talkTimeFormatted || "0s"}</span></td>
                  <td><span className="text-muted">{row.avgDurationFormatted || "0s"}</span></td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="10" className="admin-report-empty-cell text-center py-4">
                  {searchQuery ? "No matching agent call data" : "No agent call performance data available"}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {filteredData.length > 0 && (
        <div className="lead-pagination sales-performance-pagination mt-3">
          <div className="lead-pagination-info">
            Showing <strong>{pageStartIndex + 1}</strong> to <strong>{pageEndIndex}</strong> of{" "}
            <strong>{filteredData.length}</strong> agents
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

export default AgentCallPerformanceTable;
