import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors = ["#487fff", "#45b369", "#ff9f29", "#00b8f2", "#8252e9", "#ef4444", "#6b7280", "#10b981", "#f59e0b"];

const LeadSourceChart = ({ data = [], onSegmentClick }) => {
  const rows = data.filter((item) => Number(item.value) > 0);

  const handleClick = (entry) => {
    if (!entry || !onSegmentClick) return;
    const sourceName = entry.name || entry.payload?.name;
    const count = entry.value || entry.payload?.value;
    onSegmentClick({
      segmentType: "source",
      source: sourceName,
      leadSource: sourceName,
      count,
      title: `Lead Source: ${sourceName}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Lead Source</h6>
        {rows.length > 0 && onSegmentClick && (
          <small className="text-muted" style={{ fontSize: "11px" }}>💡 Click slice to view leads</small>
        )}
      </div>
      {rows.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              outerRadius={92}
              label={({ name, value }) => `${name}: ${value}`}
              onClick={handleClick}
              cursor={onSegmentClick ? "pointer" : "default"}
            >
              {rows.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={colors[index % colors.length]}
                  style={{ cursor: onSegmentClick ? "pointer" : "default", transition: "transform 0.2s" }}
                />
              ))}
            </Pie>
            <Tooltip
              formatter={(value, name) => [`${value} leads (click to view)`, name]}
            />
            <Legend
              onClick={(e) => {
                const entry = rows.find((r) => r.name === e.value);
                if (entry) handleClick(entry);
              }}
              wrapperStyle={{ cursor: onSegmentClick ? "pointer" : "default" }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No lead source data</div>
      )}
    </div>
  );
};

export default LeadSourceChart;
