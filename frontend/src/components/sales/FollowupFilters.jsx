import React from "react";

const filters = [
  { key: "callbacks", label: "Callbacks due" },
  { key: "today", label: "Today" },
  { key: "upcoming", label: "Upcoming" },
  { key: "missed", label: "Missed" },
  { key: "completed", label: "Completed" },
  { key: "all", label: "All" },
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
