import React from "react";

const statusTone = {
  Pending: "pending",
  Done: "done",
  Missed: "missed",
  Rescheduled: "rescheduled",
  Cancelled: "cancelled",
};

const FollowupStatusBadge = ({ status }) => {
  const label = status || "Pending";
  return (
    <span className={`followup-status-badge ${statusTone[label] || "pending"}`}>
      {label}
    </span>
  );
};

export default FollowupStatusBadge;
