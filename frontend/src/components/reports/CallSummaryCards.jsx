import React from "react";

const cards = [
  { label: "Total Calls", key: "totalCalls", icon: "📞", color: "#487fff" },
  { label: "Inbound Calls", key: "inboundCalls", icon: "📥", color: "#06b6d4" },
  { label: "Outbound Calls", key: "outboundCalls", icon: "📤", color: "#8b5cf6" },
  { label: "Answered / Connected", key: "answeredCalls", icon: "✅", color: "#10b981" },
  { label: "Missed / Busy", key: "missedCalls", icon: "❌", color: "#ef4444" },
  { label: "Answer Rate", key: "answeredRatio", icon: "📊", isPercent: true, color: "#f59e0b" },
  { label: "Total Talk Time", key: "totalTalkTimeFormatted", icon: "⏱️", isText: true, color: "#6366f1" },
  { label: "Average Duration", key: "avgDurationClock", icon: "⏳", isText: true, color: "#ec4899" },
];

const CallSummaryCards = ({ summary = {} }) => {
  return (
    <div className="admin-report-summary telephony-summary-cards">
      {cards.map((card) => {
        let value = summary[card.key];
        if (card.isPercent) {
          value = `${Number(value) || 0}%`;
        } else if (card.isText) {
          value = value || "0s";
        } else {
          value = Number(value) || 0;
        }

        return (
          <div
            className="admin-report-summary-card telephony-card"
            key={card.key}
            style={{ borderTop: `3px solid ${card.color}` }}
          >
            <div className="telephony-card-header">
              <span>{card.label}</span>
              <span className="telephony-card-icon" aria-hidden="true">
                {card.icon}
              </span>
            </div>
            <strong style={{ color: card.color }}>{value}</strong>
          </div>
        );
      })}
    </div>
  );
};

export default CallSummaryCards;
