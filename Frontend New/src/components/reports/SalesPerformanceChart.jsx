import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SalesPerformanceChart = ({ data = [] }) => (
  <div className="admin-report-chart-card">
    <h6>Sales User Performance</h6>
    {data.length ? (
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="userName" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Legend />
          <Bar dataKey="assignedLeads" name="Assigned" fill="#487fff" />
          <Bar dataKey="qualifiedLeads" name="Qualified" fill="#45b369" />
          <Bar dataKey="bookings" name="Bookings" fill="#ff9f29" />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div className="admin-report-empty">No sales performance data</div>
    )}
  </div>
);

export default SalesPerformanceChart;
