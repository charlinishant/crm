import React from "react";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
};

const RecentActivityTable = ({ data = [] }) => (
  <div className="admin-report-table-card">
    <h6>Recent Activity</h6>
    <div className="table-responsive">
      <table>
        <thead>
          <tr>
            <th>Time</th>
            <th>Lead</th>
            <th>Activity</th>
            <th>User</th>
            <th>Description</th>
          </tr>
        </thead>
        <tbody>
          {data.length ? data.map((row) => (
            <tr key={row.id}>
              <td>{formatDateTime(row.createdAt)}</td>
              <td>{row.leadName}</td>
              <td>{row.activity}</td>
              <td>{row.userName}</td>
              <td>{row.description}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan="5" className="admin-report-empty-cell">No recent activity</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  </div>
);

export default RecentActivityTable;
