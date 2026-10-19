import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const statusColors = {
  Connected: "#10b981",
  Missed: "#ef4444",
  Busy: "#f59e0b",
  "No Answer": "#f97316",
  Failed: "#6b7280",
  Initiated: "#3b82f6",
};

const defaultColors = ["#10b981", "#ef4444", "#f59e0b", "#f97316", "#6b7280", "#3b82f6"];

const CallStatusChart = ({ data = [], onSegmentClick }) => {
  const rows = data.filter((item) => Number(item.value) > 0);
  const totalCalls = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 className="mb-0">Call Status Breakdown</h6>
          <small className="text-muted" style={{ fontSize: "11px" }}>
            Click any segment or legend to view calls
          </small>
        </div>
        {totalCalls > 0 && <span className="text-muted small fw-semibold">{totalCalls} Calls</span>}
      </div>
      {rows.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={92}
              paddingAngle={3}
              cursor="pointer"
              onClick={(entry) => {
                if (entry && entry.name) {
                  onSegmentClick?.({ statusSegment: entry.name, title: `Calls — ${entry.name}` });
                }
              }}
            >
              {rows.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={statusColors[entry.name] || defaultColors[index % defaultColors.length]}
                  cursor="pointer"
                  style={{ outline: "none", cursor: "pointer" }}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} calls`, name]} />
            <Legend
              verticalAlign="bottom"
              height={36}
              onClick={(e) => {
                if (e && e.value) {
                  onSegmentClick?.({ statusSegment: e.value, title: `Calls — ${e.value}` });
                }
              }}
              wrapperStyle={{ cursor: "pointer" }}
            />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No call status data available</div>
      )}
    </div>
  );
};

export default CallStatusChart;
