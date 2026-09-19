import React from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const FollowupStatusChart = ({ data = [], onSegmentClick }) => {
  const handleClick = (entry) => {
    if (!entry || !onSegmentClick) return;
    const name = entry.name || entry.payload?.name;
    const count = entry.value || entry.payload?.value;
    onSegmentClick({
      segmentType: "followups",
      followupStatus: name,
      count,
      title: `Follow-ups: ${name}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Follow-up Status</h6>
        {data.length > 0 && onSegmentClick && (
          <small className="text-muted" style={{ fontSize: "11px" }}>💡 Click bar to view leads</small>
        )}
      </div>
      {data.length ? (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip
              formatter={(value, name) => [`${value} leads (click to view)`, name]}
            />
            <Bar
              dataKey="value"
              name="Follow-ups"
              fill="#487fff"
              onClick={handleClick}
              style={{ cursor: onSegmentClick ? "pointer" : "default" }}
            />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <div className="admin-report-empty">No follow-up data</div>
      )}
    </div>
  );
};

export default FollowupStatusChart;
