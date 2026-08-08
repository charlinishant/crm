import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BookingReportChart = ({ data = [] }) => (
  <div className="admin-report-chart-card">
    <h6>Booking Report</h6>
    {data.length ? (
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="name" />
          <YAxis yAxisId="left" allowDecimals={false} />
          <YAxis yAxisId="right" orientation="right" />
          <Tooltip />
          <Legend />
          <Bar yAxisId="left" dataKey="bookings" name="Bookings" fill="#487fff" />
          <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#ff9f29" />
        </BarChart>
      </ResponsiveContainer>
    ) : (
      <div className="admin-report-empty">No booking data</div>
    )}
  </div>
);

export default BookingReportChart;
