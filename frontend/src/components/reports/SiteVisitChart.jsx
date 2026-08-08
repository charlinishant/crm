import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const SiteVisitChart = ({ data = [] }) => (
  <div className="admin-report-chart-card">
    <h6>Site Visit Status</h6>
    {data.length ? (
      <ResponsiveContainer width="100%" height={280}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="value" name="Site Visits" fill="#45b369" />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div className="admin-report-empty">No site visit data</div>
    )}
  </div>
);

export default SiteVisitChart;
