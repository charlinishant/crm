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

const CallStatusChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value) > 0);
  const totalCalls = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6>Call Status Breakdown</h6>
        {totalCalls > 0 && <span className="badge bg-light text-dark">{totalCalls} Total Calls</span>}
      </div>
      {rows.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie
              data={rows}
              dataKey="value"
              nameKey="name"
              innerRadius={55}
              outerRadius={95}
              paddingAngle={3}
              label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
            >
              {rows.map((entry, index) => (
                <Cell
                  key={entry.name}
                  fill={statusColors[entry.name] || defaultColors[index % defaultColors.length]}
                />
              ))}
            </Pie>
            <Tooltip formatter={(value, name) => [`${value} calls`, name]} />
            <Legend verticalAlign="bottom" height={36} />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No call status data available</div>
      )}
    </div>
  );
};

export default CallStatusChart;
