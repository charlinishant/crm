import React, { useMemo, useState } from "react";
import CompactSearchSelect from "../common/CompactSearchSelect";

const typeOptions = ["Call", "Callback", "WhatsApp", "Email", "Visit", "Other"];
const priorityOptions = ["Low", "Medium", "High"];

const getLeadId = (lead) => lead?.id || lead?._id || lead?.lead_id || "";

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (getLeadId(lead) ? `Lead #${getLeadId(lead)}` : "Lead");

const getTodayDate = () => new Date().toISOString().slice(0, 10);

const CreateFollowupModal = ({
  currentUser,
  initialLeadId = "",
  leads = [],
  onClose,
  onSubmit,
}) => {
  const [formData, setFormData] = useState({
    leadId: initialLeadId ? String(initialLeadId) : "",
    type: "Call",
    followUpDate: getTodayDate(),
    followUpTime: "",
    priority: "Medium",
    notes: "",
  });
  const [error, setError] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const selectedLead = useMemo(
    () => leads.find((lead) => String(getLeadId(lead)) === String(formData.leadId)),
    [formData.leadId, leads]
  );

  const leadOptions = useMemo(() => {
    return leads.map((lead) => {
      const leadId = getLeadId(lead);
      const leadName = getLeadName(lead);
      const phone = Array.isArray(lead.phones)
        ? lead.phones[0]?.value || lead.phones[0] || ""
        : typeof lead.phones === "object"
        ? lead.phones?.value || ""
        : lead.phones || "";
      const stage = lead.status || lead.stage || "";

      return {
        value: String(leadId),
        label: leadName,
        sub: [phone, stage].filter(Boolean).join(" • "),
      };
    });
  }, [leads]);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");

    if (!formData.leadId || !formData.type || !formData.followUpDate || !formData.followUpTime) {
      setError("Lead, type, date and time are required.");
      return;
    }

    setIsSaving(true);
    try {
      await onSubmit(formData);
      onClose();
    } catch (err) {
      setError(err.message || "Unable to create follow-up.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="sales-modal-backdrop" role="dialog" aria-modal="true">
      <form className="sales-modal-card followup-modal" onSubmit={handleSubmit}>
        <div className="sales-card-head">
          <div>
            <h2>Create Follow-up</h2>
            <p>{currentUser ? `Assigned to ${currentUser.firstName || currentUser.username || currentUser.email}` : "Assigned sales user"}</p>
          </div>
          <button type="button" className="sales-modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>

        <div className="sales-visit-form">
          <label>
            <span>Lead</span>
            <CompactSearchSelect
              value={formData.leadId}
              onChange={(val) => setFormData((current) => ({ ...current, leadId: val }))}
              options={leadOptions}
              placeholder="Select lead"
              searchPlaceholder="Search lead by name, phone or ID..."
            />
          </label>

          <label>
            <span>Assigned sales user</span>
            <input value={currentUser?.firstName || currentUser?.username || currentUser?.email || "-"} readOnly />
          </label>

          <label>
            <span>Follow-up type</span>
            <select name="type" value={formData.type} onChange={handleChange} required>
              {typeOptions.map((type) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Priority</span>
            <select name="priority" value={formData.priority} onChange={handleChange}>
              {priorityOptions.map((priority) => (
                <option key={priority} value={priority}>{priority}</option>
              ))}
            </select>
          </label>

          <label>
            <span>Follow-up date</span>
            <input type="date" name="followUpDate" value={formData.followUpDate} onChange={handleChange} required />
          </label>

          <label>
            <span>Follow-up time</span>
            <input type="time" name="followUpTime" value={formData.followUpTime} onChange={handleChange} required />
          </label>

          <label className="sales-visit-note">
            <span>Notes</span>
            <textarea name="notes" value={formData.notes} onChange={handleChange} placeholder="Customer context, next step, or reminder note" />
          </label>

          <div className="sales-visit-summary">
            <div>
              <span>Selected lead</span>
              <strong>{selectedLead ? getLeadName(selectedLead) : "No lead selected"}</strong>
            </div>
            <div>
              <span>Status</span>
              <strong>Pending</strong>
            </div>
          </div>

          {error && <div className="sales-visit-message error">{error}</div>}

          <div className="sales-visit-actions">
            <button type="button" onClick={onClose}>Cancel</button>
            <button className="primary" type="submit" disabled={isSaving}>
              {isSaving ? "Saving..." : "Save Follow-up"}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default CreateFollowupModal;
