import React from "react";

const LeadSuccessModal = ({ message, onOk }) => {
  if (!message) return null;

  return (
    <div className="lead-success-backdrop" role="presentation">
      <section className="lead-success-modal" role="dialog" aria-modal="true" aria-labelledby="lead-success-title">
        <div className="lead-success-icon">✓</div>
        <h2 id="lead-success-title">Lead Saved</h2>
        <p>{message}</p>
        <button type="button" onClick={onOk}>
          OK
        </button>
      </section>
    </div>
  );
};

export default LeadSuccessModal;
