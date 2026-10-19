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

const CallSummaryCards = ({ summary = {}, onCardClick }) => {
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
            className="admin-report-summary-card telephony-card clickable-telephony-card"
            key={card.key}
            style={{
              cursor: "pointer",
              transition: "transform 0.15s ease, box-shadow 0.15s ease",
            }}
            onClick={() => onCardClick?.({ metric: card.key, title: card.label })}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                onCardClick?.({ metric: card.key, title: card.label });
              }
            }}
            title={`Click to view ${card.label} drilldown`}
          >
            <div className="telephony-card-header">
              <span>{card.label}</span>
              <span className="telephony-card-icon" aria-hidden="true">
                {card.icon}
              </span>
            </div>
            <strong>{value}</strong>
            <small
              className="text-primary mt-1 d-flex align-items-center gap-1"
              style={{ fontSize: "11px", fontWeight: 500, opacity: 0.85 }}
            >
              <span>View calls</span> <span>→</span>
            </small>
          </div>
        );
      })}
    </div>
  );
};

export default CallSummaryCards;
