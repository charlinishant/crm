import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SiteVisitChart = ({ data = [], onSegmentClick }) => {
  const handleClick = (entry) => {
    if (!entry || !onSegmentClick) return;
    const name = entry.name || entry.payload?.name;
    const count = entry.value || entry.payload?.value;
    onSegmentClick({
      segmentType: "siteVisits",
      visitStatus: name,
      count,
      title: `Site Visits: ${name}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Site Visit Status</h6>
        {data.length > 0 && onSegmentClick && (
          <small className="text-muted" style={{ fontSize: "11px" }}>💡 Click bar to view leads</small>
        )}
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value, name) => [`${value} leads (click to view)`, name]}
            />
            <Bar
              dataKey="value"
              name="Site Visits"
              fill="#45b369"
              onClick={handleClick}
              style={{ cursor: onSegmentClick ? "pointer" : "default" }}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No site visit data</div>
      )}
    </div>
  );
};

export default SiteVisitChart;
