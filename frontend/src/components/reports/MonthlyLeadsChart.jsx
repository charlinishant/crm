import React from "react";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const MonthlyLeadsChart = ({ data = [] }) => (
  <div className="admin-report-chart-card">
    <h6>Monthly Leads</h6>
    {data.length ? (
      <ResponsiveContainer width="100%" height={280}>
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Line type="monotone" dataKey="value" name="Leads" stroke="#487fff" strokeWidth={3} />
        </LineChart>
      </ResponsiveContainer>
    ) : (
      <div className="admin-report-empty">No monthly lead data</div>
    )}
  </div>
);

export default MonthlyLeadsChart;
