import React from "react";
import { Cell, Legend, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors = ["#487fff", "#45b369", "#ff9f29", "#00b8f2", "#8252e9", "#6b7280"];

const LeadSourceChart = ({ data = [] }) => {
  const rows = data.filter((item) => Number(item.value) > 0);

  return (
    <div className="admin-report-chart-card">
      <h6>Lead Source</h6>
      {rows.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <PieChart>
            <Pie data={rows} dataKey="value" nameKey="name" outerRadius={92} label>
              {rows.map((entry, index) => (
                <Cell key={entry.name} fill={colors[index % colors.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No lead source data</div>
      )}
    </div>
  );
};

export default LeadSourceChart;
