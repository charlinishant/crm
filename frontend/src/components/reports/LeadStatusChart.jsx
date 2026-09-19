import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors = ["#487fff", "#45b369", "#ff9f29", "#00b8f2", "#8252e9", "#ef4444", "#6b7280"];

const LeadStatusChart = ({ data = [], onSegmentClick }) => {
  const rows = data.filter((item) => Number(item.value) > 0);

  const handleClick = (entry) => {
    if (!entry || !onSegmentClick) return;
    const statusName = entry.name || entry.payload?.name;
    const count = entry.value || entry.payload?.value;
    onSegmentClick({
      segmentType: "status",
      status: statusName,
      leadStatus: statusName,
      count,
      title: `Lead Status: ${statusName}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Lead Status</h6>
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
                  style={{ cursor: onSegmentClick ? "pointer" : "default" }}
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
        <div className="admin-report-empty">No lead status data</div>
      )}
    </div>
  );
};

export default LeadStatusChart;
