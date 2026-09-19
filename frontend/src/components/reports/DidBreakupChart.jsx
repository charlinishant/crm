import React from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const DidBreakupChart = ({ data = [] }) => {
  const hasData = data.some((item) => Number(item.totalCalls) > 0);

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6>Virtual Number (DID) Breakup</h6>
        {/* <span className="badge bg-light text-muted">Inbound Traffic Channels</span> */}
      </div>
      {hasData ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 40, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" horizontal={false} />
            <XAxis type="number" allowDecimals={false} />
            <YAxis type="category" dataKey="didNumber" tick={{ fontSize: 11 }} />
            <Tooltip
              formatter={(value, name) => [`${value} calls`, name]}
            />
            <Legend verticalAlign="top" height={36} />
            <Bar dataKey="inboundCalls" name="Inbound" fill="#06b6d4" stackId="did" />
            <Bar dataKey="outboundCalls" name="Outbound" fill="#8b5cf6" stackId="did" />
            <Bar dataKey="answeredCalls" name="Answered" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No DID traffic data available</div>
      )}
    </div>
  );
};

export default DidBreakupChart;
