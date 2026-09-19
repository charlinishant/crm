import React from "react";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BookingReportChart = ({ data = [], onSegmentClick }) => {
  const handleBarClick = (entry, dataKey) => {
    if (!entry || !onSegmentClick) return;
    const name = entry.name || entry.payload?.name;
    const count = entry[dataKey] || entry.payload?.[dataKey];
    onSegmentClick({
      segmentType: "bookings",
      name,
      count,
      title: `Bookings: ${name || "All"}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Booking Report</h6>
        {data.length > 0 && onSegmentClick && (
          <small className="text-muted" style={{ fontSize: "11px" }}>💡 Click bar to view leads</small>
        )}
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height={300}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis yAxisId="left" allowDecimals={false} />
            <YAxis yAxisId="right" orientation="right" />
            <Tooltip
              formatter={(value, name) => [
                name === "Bookings" ? `${value} bookings (click to view)` : value,
                name,
              ]}
            />
            <Legend />
            <Bar
              yAxisId="left"
              dataKey="bookings"
              name="Bookings"
              fill="#487fff"
              onClick={(entry) => handleBarClick(entry, "bookings")}
              style={{ cursor: onSegmentClick ? "pointer" : "default" }}
            />
            <Bar yAxisId="right" dataKey="revenue" name="Revenue" fill="#ff9f29" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No booking data</div>
      )}
    </div>
  );
};

export default BookingReportChart;
