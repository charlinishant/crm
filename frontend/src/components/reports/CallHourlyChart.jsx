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

const CallHourlyChart = ({ hourlyData = [], dailyData = [], onBarClick }) => {
  const [viewMode, setViewMode] = useState("hourly"); // "hourly" | "daily"

  const activeData = viewMode === "hourly" ? hourlyData : dailyData;
  const xKey = viewMode === "hourly" ? "hour" : "date";
  const hasData = activeData.some((item) => Number(item.total || item.inbound || item.outbound) > 0);

  const handleBarChartClick = (state) => {
    if (!state || !state.activeLabel) return;
    const hourLabel = String(state.activeLabel);
    const hourVal = hourLabel.split(":")[0];
    onBarClick?.({
      hour: hourVal,
      hourLabel,
      title: `Calls at ${hourLabel}`,
    });
  };

  const handleLineChartClick = (state) => {
    if (!state || !state.activeLabel) return;
    const dateLabel = String(state.activeLabel);
    onBarClick?.({
      date: dateLabel,
      title: `Calls on ${dateLabel}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div>
          <h6 className="mb-0">{viewMode === "hourly" ? "Hourly Call Distribution" : "Daily Call Trend"}</h6>
          <small className="text-muted" style={{ fontSize: "11px" }}>
            Click any bar, series, or time slot to view calls
          </small>
        </div>
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
            <BarChart
              data={activeData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={handleBarChartClick}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip cursor={{ fill: "rgba(0, 0, 0, 0.04)" }} />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ cursor: "pointer" }}
                onClick={(e) => {
                  if (e && e.dataKey) {
                    const ch = String(e.dataKey).toLowerCase();
                    onBarClick?.({
                      channel: ch,
                      title: `${e.value || ch} Calls (All Hours)`,
                    });
                  }
                }}
              />
              <Bar
                dataKey="inbound"
                name="Inbound"
                fill="#06b6d4"
                stackId="calls"
                cursor="pointer"
                onClick={(entry, e) => {
                  if (e) e.stopPropagation();
                  const hourVal = entry?.hour?.split(":")[0];
                  onBarClick?.({
                    hour: hourVal,
                    hourLabel: entry?.hour,
                    channel: "inbound",
                    title: `Inbound Calls at ${entry?.hour}`,
                  });
                }}
              />
              <Bar
                dataKey="outbound"
                name="Outbound"
                fill="#8b5cf6"
                stackId="calls"
                cursor="pointer"
                onClick={(entry, e) => {
                  if (e) e.stopPropagation();
                  const hourVal = entry?.hour?.split(":")[0];
                  onBarClick?.({
                    hour: hourVal,
                    hourLabel: entry?.hour,
                    channel: "outbound",
                    title: `Outbound Calls at ${entry?.hour}`,
                  });
                }}
              />
              <Bar
                dataKey="missed"
                name="Missed"
                fill="#ef4444"
                cursor="pointer"
                onClick={(entry, e) => {
                  if (e) e.stopPropagation();
                  const hourVal = entry?.hour?.split(":")[0];
                  onBarClick?.({
                    hour: hourVal,
                    hourLabel: entry?.hour,
                    channel: "missed",
                    title: `Missed Calls at ${entry?.hour}`,
                  });
                }}
              />
            </BarChart>
          ) : (
            <LineChart
              data={activeData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
              onClick={handleLineChartClick}
              style={{ cursor: "pointer" }}
            >
              <CartesianGrid strokeDasharray="3 3" vertical={false} />
              <XAxis dataKey={xKey} tick={{ fontSize: 11 }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
              <Tooltip />
              <Legend
                verticalAlign="top"
                height={36}
                wrapperStyle={{ cursor: "pointer" }}
                onClick={(e) => {
                  if (e && e.dataKey) {
                    const key = String(e.dataKey).toLowerCase();
                    onBarClick?.({
                      channel: key === "total" ? null : key,
                      title: `${e.value || key} Calls (Daily)`,
                    });
                  }
                }}
              />
              <Line
                type="monotone"
                dataKey="total"
                name="Total Calls"
                stroke="#487fff"
                strokeWidth={2.5}
                activeDot={{ r: 6, cursor: "pointer" }}
              />
              <Line
                type="monotone"
                dataKey="answered"
                name="Answered"
                stroke="#10b981"
                strokeWidth={2}
                activeDot={{ r: 6, cursor: "pointer" }}
              />
              <Line
                type="monotone"
                dataKey="missed"
                name="Missed"
                stroke="#ef4444"
                strokeWidth={2}
                strokeDasharray="4 4"
                activeDot={{ r: 6, cursor: "pointer" }}
              />
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
