import React, { useMemo, useState } from "react";

const SalesPerformanceTable = ({ data = [] }) => {
  const [searchQuery, setSearchQuery] = useState("");

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

  return (
    <div className="admin-report-table-card sales-performance-table-card">
      <h6>Sales User Performance</h6>
      <label className="crm-table-search sales-performance-search">
        <span aria-hidden="true">🔍</span>
        <input
          type="search"
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
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
            {filteredData.length ? filteredData.map((row) => (
              <tr key={row.userId || row.userName}>
                <td>
                  <div className="sales-performance-user">{row.userName}</div>
                </td>
                <td>{row.assignedLeads}</td>
                <td>{row.qualifiedLeads}</td>
                <td>{row.followUpsDone}</td>
                <td>{row.missedFollowUps}</td>
                <td>{row.siteVisits}</td>
                <td>{row.bookings}</td>
                <td>{row.conversionPercentage}%</td>
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
    </div>
  );
};

export default SalesPerformanceTable;
