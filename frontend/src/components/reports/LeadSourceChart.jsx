import React from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";

const colors = [
  "#3b82f6",
  "#10b981",
  "#f59e0b",
  "#06b6d4",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#14b8a6",
  "#f97316",
  "#6366f1",
  "#84cc16",
  "#a855f7",
  "#64748b",
];

const CustomTooltip = ({ active, payload }) => {
  if (active && payload && payload.length) {
    const data = payload[0];
    const pct = data.payload?.percent !== undefined
      ? `${(data.payload.percent * 100).toFixed(1)}%`
      : data.payload?.pct !== undefined
        ? `${data.payload.pct}%`
        : null;

    return (
      <div
        style={{
          background: "#ffffff",
          border: "1px solid #e2e8f0",
          borderRadius: "8px",
          boxShadow: "0 4px 12px rgba(0,0,0,0.1)",
          padding: "8px 12px",
          fontSize: "12px",
        }}
      >
        <div style={{ fontWeight: 700, color: "#1e293b", marginBottom: 2 }}>{data.name}</div>
        <div style={{ color: "#64748b" }}>
          Leads: <strong style={{ color: data.payload?.fill || "#3b82f6" }}>{data.value}</strong>
          {pct && <span style={{ marginLeft: 6, color: "#94a3b8" }}>({pct})</span>}
        </div>
      </div>
    );
  }
  return null;
};

const LeadSourceChart = ({ data = [], onSegmentClick }) => {
  const rows = data
    .filter((item) => Number(item.value) > 0)
    .sort((a, b) => Number(b.value) - Number(a.value));

  const totalLeads = rows.reduce((sum, item) => sum + Number(item.value || 0), 0);

  const handleClick = (entry) => {
    if (!entry || !onSegmentClick) return;
    const sourceName = entry.name || entry.payload?.name;
    const count = entry.value || entry.payload?.value;
    onSegmentClick({
      segmentType: "source",
      source: sourceName,
      leadSource: sourceName,
      count,
      title: `Lead Source: ${sourceName}`,
    });
  };

  return (
    <div className="admin-report-chart-card">
      <div className="d-flex justify-content-between align-items-center mb-2">
        <h6 className="mb-0">Lead Source</h6>
        {totalLeads > 0 && (
          <span className="badge bg-light text-dark border px-2 py-1" style={{ fontSize: "11px" }}>
            Total: <strong>{totalLeads}</strong>
          </span>
        )}
      </div>

      {rows.length ? (
        <div>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={rows}
                  dataKey="value"
                  nameKey="name"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={2}
                  onClick={handleClick}
                  cursor={onSegmentClick ? "pointer" : "default"}
                >
                  {rows.map((entry, index) => (
                    <Cell
                      key={entry.name}
                      fill={colors[index % colors.length]}
                      style={{ cursor: onSegmentClick ? "pointer" : "default", outline: "none" }}
                    />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div
            style={{
              maxHeight: "90px",
              overflowY: "auto",
              padding: "6px 4px 2px",
              borderTop: "1px solid #f1f5f9",
              marginTop: "4px",
              display: "flex",
              flexWrap: "wrap",
              gap: "6px",
            }}
          >
            {rows.map((item, index) => {
              const color = colors[index % colors.length];
              const pct = totalLeads ? ((Number(item.value) / totalLeads) * 100).toFixed(0) : 0;
              return (
                <button
                  key={item.name}
                  type="button"
                  onClick={() => handleClick(item)}
                  style={{
                    background: "#f8fafc",
                    border: "1px solid #e2e8f0",
                    borderRadius: "6px",
                    padding: "3px 8px",
                    fontSize: "11px",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: "5px",
                    cursor: onSegmentClick ? "pointer" : "default",
                    color: "#334155",
                    whiteSpace: "nowrap",
                  }}
                  title={`Click to view ${item.value} leads from ${item.name}`}
                >
                  <span
                    style={{
                      width: "8px",
                      height: "8px",
                      borderRadius: "50%",
                      backgroundColor: color,
                      flexShrink: 0,
                    }}
                  />
                  <span>{item.name}:</span>
                  <strong style={{ color: "#0f172a" }}>{item.value}</strong>
                  <span style={{ color: "#94a3b8", fontSize: "10px" }}>({pct}%)</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="admin-report-empty">No lead source data</div>
      )}
    </div>
  );
};

export default LeadSourceChart;
