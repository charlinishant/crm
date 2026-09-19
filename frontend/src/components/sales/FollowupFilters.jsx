import React from "react";

const filters = [
  { key: "all", label: "All" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "due", label: "Due Soon" },
  { key: "overdue", label: "Overdue" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
];

const FollowupFilters = ({ activeFilter, counts = {}, onChange }) => (
  <div className="followup-filter-tabs">
    {filters.map((filter) => (
      <button
        key={filter.key}
        type="button"
        className={activeFilter === filter.key ? "active" : ""}
        onClick={() => onChange(filter.key)}
      >
        {filter.label}
        {counts[filter.key] !== undefined && <span>{counts[filter.key]}</span>}
      </button>
    ))}
  </div>
);

export default FollowupFilters;
