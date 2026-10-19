import React from "react";

const LoadingSpinner = ({ label = "Loading data..." }) => (
  <div className="crm-loading-spinner" role="status" aria-live="polite">
    <span className="crm-loading-spinner-circle" aria-hidden="true" />
    <span>{label}</span>
  </div>
);

export default LoadingSpinner;
