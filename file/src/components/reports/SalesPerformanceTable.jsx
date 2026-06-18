import React from "react";

const SalesPerformanceTable = ({ data = [] }) => (
  <div className="admin-report-table-card">
    <h6>Sales User Performance</h6>
    <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Sales User</th>
            <th>Assigned</th>
            <th>Qualified</th>
            <th>Follow-ups Done</th>
            <th>Missed</th>
            <th>Site Visits</th>
            <th>Bookings</th>
            <th>Conversion %</th>
          </tr>
        </thead>
        <tbody>
          {data.length ? data.map((row) => (
            <tr key={row.userId}>
              <td>{row.userName}</td>
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
              <td colSpan="8" className="admin-report-empty-cell">No sales performance data</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default SalesPerformanceTable;
