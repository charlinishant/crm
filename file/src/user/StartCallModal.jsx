import React, { useEffect, useRef, useState } from "react";
import { CheckCircle2, Phone, ShieldCheck, X } from "lucide-react";

const cleanPhone = (value) => String(value || "").replace(/\D/g, "");

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Selected lead");

const getStatusLabel = (value) => {
  const status = String(value || "initiated").toLowerCase();
  if (["initiated", "queued"].includes(status)) return "queued";
  if (["calling", "ringing", "connected", "in-progress"].includes(status)) return "in progress";
  return status.replace(/-/g, " ");
};

const StartCallModal = ({ lead, leadPhone, initialAgentPhone, onClose, onStart, onDispose }) => {
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [callLog, setCallLog] = useState(null);
  const submitLockRef = useRef(false);

  useEffect(() => {
    submitLockRef.current = false;
    setError("");
    setStarting(false);
    setCallLog(null);
  }, [initialAgentPhone, lead]);

  if (!lead) return null;

  const submit = async (event) => {
    event.preventDefault();
    if (submitLockRef.current || starting || callLog) return;

    if (cleanPhone(leadPhone).length < 10) {
      setError("This lead does not have a valid phone number.");
      return;
    }

    submitLockRef.current = true;
    setStarting(true);
    setError("");
    try {
      const result = await onStart?.(cleanPhone(initialAgentPhone));
      if (!result) throw new Error("Unable to initiate the call.");
      setCallLog(result);
    } catch (startError) {
      submitLockRef.current = false;
      setError(startError.message || "Unable to initiate the call.");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="start-call-backdrop" role="presentation">
      <section className="start-call-modal" role="dialog" aria-modal="true" aria-labelledby="start-call-title">
        <header className="start-call-header">
          <div className="start-call-brand"><Phone size={20} /></div>
          <div>
            <h3 id="start-call-title">{callLog ? "Call initiated" : "Start cloud call"}</h3>
            <p>Secure MCube bridge call</p>
          </div>
          <button type="button" className="start-call-close" onClick={onClose} disabled={starting} aria-label="Close">
            <X size={19} />
          </button>
        </header>
     

        {callLog ? (
          <div className="start-call-success">
            <CheckCircle2 size={54} />
            <h4>Call initiated</h4>
            <p>MCube has started the call to {getLeadName(lead)}. After hang up, save the disposition; recording will be attached when MCube sends it.</p>
            <div className="start-call-reference">
              <span>Status <strong>{getStatusLabel(callLog.status)}</strong></span>
              <span>Call reference <strong>#{callLog.id}</strong></span>
            </div>
            <div className="start-call-success-actions">
              <button type="button" className="start-call-secondary" onClick={onClose}>Close</button>
              <button
                type="button"
                className="start-call-primary"
                onClick={() => {
                  onDispose?.(callLog);
                  onClose?.();
                }}
              >
                Dispose call
              </button>
            </div>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="start-call-body">
              <div className="start-call-person">
                <span>{getLeadName(lead).slice(0, 1).toUpperCase()}</span>
                <div><strong>{getLeadName(lead)}</strong><small>{leadPhone || "Phone unavailable"}</small></div>
              </div>

              <div className="start-call-flow" aria-label="Call connection flow">
                <div><ShieldCheck size={18} /><span>MCube</span></div>
                <i />
                <div><Phone size={18} /><span>Lead</span></div>
              </div>

              <div className="start-call-info">
              MCube will call this lead using your configured sales number. Recording and status will be saved after hang up.
              </div>
              {error && <div className="start-call-error" role="alert">{error}</div>}
            </div>
            <footer className="start-call-footer">
              <button type="button" className="start-call-secondary" onClick={onClose} disabled={starting}>Cancel</button>
              <button type="submit" className="start-call-primary" disabled={starting}>
                {starting ? "Connecting..." : "Start call"}
              </button>
            </footer>
          </form>
        )}
      </section>
    </div>
  );
};

export default StartCallModal;
