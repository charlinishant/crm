import React, { useState } from "react";

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const RescheduleFollowupModal = ({ followup, onClose, onSubmit }) => {
  const [formData, setFormData] = useState({
    followUpDate: getTodayDate(),
    followUpTime: "",
    priority: followup?.priority || "Medium",
    notes: followup?.notes || "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.followUpDate || !formData.followUpTime) {
      setError("New date and time are required.");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to reschedule follow-up.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sales-modal-backdrop" role="dialog" aria-modal="true">
      <form className="sales-modal-card followup-modal" onSubmit={handleSubmit}>
        <div className="sales-card-head">
          <div>
            <h2>Reschedule Follow-up</h2>
            <p>{followup?.leadName || "Lead follow-up"}</p>
          </div>
          <button type="button" className="sales-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="sales-visit-form">
          <label>
            <span>New date</span>
            <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} required />
          </label>

          <label>
            <span>New time</span>
            <input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} required />
          </label>

          <label>
            <span>Priority</span>
            <select name="priority" value={formData.priority} onChange={handleChange}>
              {["Low", "Medium", "High"].map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>

          <label className="sales-visit-note">
            <span>Notes</span>
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Reason or next call context" />
          </label>

          {error && <div className="sales-visit-message error">{error}</div>}

          <div className="sales-visit-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="primary" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Reschedule"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RescheduleFollowupModal;
