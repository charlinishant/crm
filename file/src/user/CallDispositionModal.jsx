import React, { useEffect, useState } from "react";
import { X } from "lucide-react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const dispositions = [
  "Qualified",
  "Callback Later",
  "Interested Project",
  "Site Visit Scheduled",
  "Not Interested",
  "Wrong Number",
  "Junk",
  "No Answer",
  "Busy",
  "Follow-up Required",
];

const callStatuses = ["completed", "connected", "failed", "no-answer", "busy"];

const getProjectName = (project) =>
  project?.name || project?.projectName || project?.title || project?.label || "";

const getProjectId = (project) => project?.id || project?._id || project?.projectId || "";

const getDefaultDateTime = () => {
  const date = new Date(Date.now() + 60 * 60 * 1000);
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
  return date.toISOString().slice(0, 16);
};

const CallDispositionModal = ({ lead, callLog, projects = [], initialDisposition = "", onClose, onSaved }) => {
  const [form, setForm] = useState({
    callStatus:"completed",
    disposition:"Qualified",
    notes:"",
    nextFollowUpAt:getDefaultDateTime(),
    interestedProjectId:"",
    interestedProject:"",
    budget:"",
    visitDateTime:getDefaultDateTime(),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!callLog) return;
    const budget = lead?.budget || [lead?.budgetMin, lead?.budgetMax].filter(Boolean).join(" - ") || "";
    const savedStatus = String(callLog.status || "completed").toLowerCase();
    const savedProjectId = callLog.interestedProjectId || "";
    const savedProjectName = lead?.interestedProjects || callLog.interestedProject || "";
    const savedProject = projects.find((project) =>
      String(getProjectId(project)) === String(savedProjectId) || getProjectName(project) === savedProjectName
    );
    setForm({
      callStatus:initialDisposition === "No Answer"
        ? "no-answer"
        : initialDisposition === "Busy"
          ? "busy"
          : callStatuses.includes(savedStatus) ? savedStatus : "completed",
      disposition:initialDisposition || callLog.disposition || "Qualified",
      notes:callLog.notes || "",
      nextFollowUpAt:getDefaultDateTime(),
      interestedProjectId:savedProject ? String(getProjectId(savedProject)) : "",
      interestedProject:savedProject ? getProjectName(savedProject) : savedProjectName,
      budget:callLog.budget || budget,
      visitDateTime:getDefaultDateTime(),
    });
    setError("");
  }, [callLog, initialDisposition, lead, projects]);

  if (!lead || !callLog) return null;

  const needsFollowUp = ["Callback Later", "Follow-up Required"].includes(form.disposition);
  const needsVisit = form.disposition === "Site Visit Scheduled";
  const update = (name, value) => setForm((current) => ({ ...current, [name]:value }));
  const updateInterestedProject = (projectId) => {
    const project = projects.find((item) => String(getProjectId(item)) === String(projectId));
    setForm((current) => ({
      ...current,
      interestedProjectId:projectId,
      interestedProject:project ? getProjectName(project) : "",
    }));
  };

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const token = localStorage.getItem("authToken");
      const response = await fetch(`${API_URL}/api/calls/dispose`, {
        method:"POST",
        headers:{
          "Content-Type":"application/json",
          ...(token ? { Authorization:`Bearer ${token}` } : {}),
        },
        body:JSON.stringify({
          callLogId:callLog.id || null,
          leadId:lead.id || callLog.leadId,
          leadPhone:callLog.leadPhone || callLog.phone || lead.leadPhone || lead.phone || "",
          ...form,
          interestedProjectId:form.interestedProjectId || null,
          nextFollowUpAt:needsFollowUp ? form.nextFollowUpAt : null,
          visitDateTime:needsVisit ? form.visitDateTime : null,
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to save disposition");
      onSaved?.(result.callLog);
    } catch (saveError) {
      setError(saveError.message || "Unable to save disposition");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="call-disposition-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !saving) onClose?.();
    }}>
      <section className="call-disposition-modal" role="dialog" aria-modal="true" aria-labelledby="call-disposition-title">
        <div className="call-disposition-head">
          <div>
            <h3 id="call-disposition-title">Call disposition</h3>
            <p>{[lead.firstName, lead.lastName].filter(Boolean).join(" ") || `Lead #${lead.id}`} - {callLog.id ? `Call #${callLog.id}` : "Manual call log"}</p>
          </div>
          <button type="button" onClick={onClose} disabled={saving} aria-label="Close"><X size={18} /></button>
        </div>

        <form onSubmit={submit}>
          <div className="call-disposition-grid">
            <label><span>Call status</span><select value={form.callStatus} onChange={(e) => update("callStatus", e.target.value)}>
              {callStatuses.map((status) => <option key={status} value={status}>{status.replace("-", " ")}</option>)}
            </select></label>
            <label><span>Disposition</span><select value={form.disposition} onChange={(e) => update("disposition", e.target.value)}>
              {dispositions.map((item) => <option key={item} value={item}>{item}</option>)}
            </select></label>
            <label><span>Interested project</span>
              <select value={form.interestedProjectId} onChange={(e) => updateInterestedProject(e.target.value)}>
                <option value="">{projects.length ? "Select project" : "No projects found"}</option>
                {projects.map((project) => {
                  const id = getProjectId(project);
                  return (
                    <option key={id || getProjectName(project)} value={id}>
                      {getProjectName(project)}
                    </option>
                  );
                })}
              </select>
            </label>
            <label><span>Budget</span><input value={form.budget} onChange={(e) => update("budget", e.target.value)} placeholder="Enter budget" /></label>
            {needsFollowUp && <label className="wide"><span>{form.disposition === "Callback Later" ? "Callback date and time" : "Next follow-up date and time"}</span><input type="datetime-local" required value={form.nextFollowUpAt} onChange={(e) => update("nextFollowUpAt", e.target.value)} /></label>}
            {needsVisit && <label className="wide"><span>Visit date and time</span><input type="datetime-local" required value={form.visitDateTime} onChange={(e) => update("visitDateTime", e.target.value)} /></label>}
            <label className="wide"><span>Notes</span><textarea rows="4" value={form.notes} onChange={(e) => update("notes", e.target.value)} placeholder="Call notes and next action" /></label>
          </div>
          {error && <div className="call-disposition-error">{error}</div>}
          <div className="call-disposition-footer">
            <button type="button" className="secondary" onClick={onClose} disabled={saving}>Cancel</button>
            <button type="submit" className="primary" disabled={saving}>{saving ? "Saving..." : "Save disposition"}</button>
          </div>
        </form>
      </section>
    </div>
  );
};

export default CallDispositionModal;
