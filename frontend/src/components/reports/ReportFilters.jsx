import React from "react";

const leadStatuses = ["New", "Qualified", "Nurture", "In_sourcing", "In_closing", "Booked", "Unqualified"];

const getUserName = (user) =>
  [user?.firstName, user?.lastName].filter(Boolean).join(" ") ||
  user?.username ||
  user?.email ||
  `User #${user.id}`;

const ReportFilters = ({ filters, projects, users, leadSources, loading, onChange, onRefresh }) => (
  <div className="admin-report-filters">
    <label>
      <span>From</span>
      <input type="date" name="fromDate" value={filters.fromDate} onChange={onChange} />
    </label>
    <label>
      <span>To</span>
      <input type="date" name="toDate" value={filters.toDate} onChange={onChange} />
    </label>
    <label>
      <span>Project</span>
      <select name="projectId" value={filters.projectId} onChange={onChange}>
        <option value="">All Projects</option>
        {projects.map((project) => (
          <option key={project.id} value={project.id}>{project.name}</option>
        ))}
      </select>
    </label>
    <label>
      <span>Sales User</span>
      <select name="salesUserId" value={filters.salesUserId} onChange={onChange}>
        <option value="">All Sales Users</option>
        {users.map((user) => (
          <option key={user.id} value={user.id}>{getUserName(user)}</option>
        ))}
      </select>
    </label>
    <label>
      <span>Lead Source</span>
      <select name="leadSource" value={filters.leadSource} onChange={onChange}>
        <option value="">All Sources</option>
        {leadSources.filter((source) => source.name && source.name !== "Unknown").map((source) => (
          <option key={source.name} value={source.name}>{source.name}</option>
        ))}
      </select>
    </label>
    <label>
      <span>Lead Status</span>
      <select name="leadStatus" value={filters.leadStatus} onChange={onChange}>
        <option value="">All Status</option>
        {leadStatuses.map((status) => (
          <option key={status} value={status}>{status}</option>
        ))}
      </select>
    </label>
    <button type="button" onClick={onRefresh} disabled={loading}>
      {loading ? "Refreshing..." : "Refresh"}
    </button>
  </div>
);

export default ReportFilters;
