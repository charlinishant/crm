import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Line,
  LineChart,
} from "recharts";

const CallHourlyChart = ({ hourlyData = [], dailyData = [] }) => {
  const [viewMode, setViewMode] = useState("hourly"); // "hourly" | "daily"

  const activeData = viewMode === "hourly" ? hourlyData : dailyData;
  const xKey = viewMode === "hourly" ? "hour" : "date";
  const hasData = activeData.some((item) => Number(item.total || item.inbound || item.outbound) > 0);

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6>{viewMode === "hourly" ? "Hourly Call Distribution" : "Daily Call Trend"}</h6>
        <div className="btn-group btn-group-sm" role="group">
          <button
            type="button"
            className={`btn btn-sm ${viewMode === "hourly" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setViewMode("hourly")}
          >
            Hourly
          </button>
          <button
            type="button"
            className={`btn btn-sm ${viewMode === "daily" ? "btn-primary" : "btn-outline-secondary"}`}
            onClick={() => setViewMode("daily")}
          >
            Daily
          </button>
        </div>
      </div>

      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          {viewMode === "hourly" ? (
            <BarChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={36} />
              <Bar dataKey="inbound" name="Inbound" fill="#06b6d4" stackId="calls" />
              <Bar dataKey="outbound" name="Outbound" fill="#8b5cf6" stackId="calls" />
              <Bar dataKey="missed" name="Missed" fill="#ef4444" />
            </BarChart>
          ) : (
            <LineChart data={activeData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend verticalAlign="top" height={36} />
              <Line type="monotone" dataKey="total" name="Total Calls" stroke="#487fff" strokeWidth={2.5} />
              <Line type="monotone" dataKey="answered" name="Answered" stroke="#10b981" strokeWidth={2} />
              <Line type="monotone" dataKey="missed" name="Missed" stroke="#ef4444" strokeWidth={2} strokeDasharray="4 4" />
            </LineChart>
          )}
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No call traffic data in selected range</div>
      )}
    </div>
  );
};

export default CallHourlyChart;
