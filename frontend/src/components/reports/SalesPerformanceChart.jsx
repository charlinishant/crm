import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SalesPerformanceChart = ({ data = [], onSegmentClick }) => {
  const handleBarClick = (entry, dataKey, label) => {
    if (!entry || !onSegmentClick) return;
    const payload = entry.payload || entry;
    const userId = payload.userId;
    const userName = payload.userName || "Sales Executive";
    const count = payload[dataKey];
    onSegmentClick({
      segmentType: "salesPerformance",
      userId,
      salesUserId: userId,
      userName,
      metric: dataKey,
      count,
      title: `${label} Leads — ${userName}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Sales User Performance</h6>
        {data.length > 0 && onSegmentClick && (
          <small className="text-muted" style={{ fontSize: "11px" }}>💡 Click any bar to view leads</small>
        )}
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height={320}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="userName" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value, name) => [`${value} leads (click to view)`, name]}
            />
            <Legend wrapperStyle={{ cursor: "default" }} />
            <Bar
              dataKey="assignedLeads"
              name="Assigned"
              fill="#487fff"
              onClick={(entry) => handleBarClick(entry, "assignedLeads", "Assigned")}
              style={{ cursor: onSegmentClick ? "pointer" : "default" }}
            />
            <Bar
              dataKey="qualifiedLeads"
              name="Qualified"
              fill="#45b369"
              onClick={(entry) => handleBarClick(entry, "qualifiedLeads", "Qualified")}
              style={{ cursor: onSegmentClick ? "pointer" : "default" }}
            />
            <Bar
              dataKey="bookings"
              name="Bookings"
              fill="#ff9f29"
              onClick={(entry) => handleBarClick(entry, "bookings", "Bookings")}
              style={{ cursor: onSegmentClick ? "pointer" : "default" }}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No sales performance data</div>
      )}
    </div>
  );
};

export default SalesPerformanceChart;
