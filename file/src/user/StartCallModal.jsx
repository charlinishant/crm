import React, { useCallback, useEffect, useRef, useState } from "react";
import { PhoneCall, X } from "lucide-react";

const cleanPhone = (value) => String(value || "").replace(/\D/g, "");

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Selected lead");

const StartCallModal = ({ lead, leadPhone, widgetUrl, onClose, onBrowserStart, onDispose }) => {
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [callLog, setCallLog] = useState(null);
  const submitLockRef = useRef(false);
  const autoStartRef = useRef(false);

  useEffect(() => {
    submitLockRef.current = false;
    autoStartRef.current = false;
    setError("");
    setStarting(false);
    setCallLog(null);
  }, [lead]);

  const startCall = useCallback(async (event) => {
    event?.preventDefault();
    if (submitLockRef.current || starting || callLog) return;

    submitLockRef.current = true;
    setStarting(true);
    setError("");
    try {
      const result = await onBrowserStart?.();
      if (!result) throw new Error("Unable to initiate the call.");
      setCallLog({
        ...(result.callLog || result),
        status:["initiated", "queued"].includes(String(result.callLog?.status || result.data?.status || "").toLowerCase())
          ? "ringing"
          : result.callLog?.status || result.data?.status || "ringing",
      });
    } catch (startError) {
      submitLockRef.current = false;
      setError(startError.message || "Unable to initiate the call.");
    } finally {
      setStarting(false);
    }
  }, [callLog, onBrowserStart, starting]);

  useEffect(() => {
    if (!lead || autoStartRef.current || callLog) return;
    autoStartRef.current = true;
    startCall();
  }, [callLog, lead, startCall]);

  if (!lead) return null;

  return (
    <div className="start-call-backdrop" role="presentation">
      <section className="start-call-modal" role="dialog" aria-modal="true" aria-labelledby="start-call-title">
        {callLog ? (
          <div className="start-call-success">
            <button type="button" className="start-call-widget-close" onClick={onClose} aria-label="Close">
              <X size={17} />
            </button>
            <PhoneCall size={54} />
            <h4>Call initiated successfully</h4>
            <p>{`MCube call request sent to ${getLeadName(lead)}. Save the disposition after hang up; recording will attach when MCube sends it.`}</p>
            {widgetUrl && (
              <div className="start-call-widget">
                <iframe title={`MCube softphone for ${getLeadName(lead)}`} src={widgetUrl} allow="microphone; autoplay" />
              </div>
            )}
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
          <div className="start-call-auto">
            <button type="button" className="start-call-close" onClick={onClose} disabled={starting} aria-label="Close">
              <X size={19} />
            </button>
            <PhoneCall size={34} />
            <h3 id="start-call-title">{error ? "Unable to initiate call" : "Initiating call..."}</h3>
            <div className="start-call-reference start-call-ready-reference">
              <span>Selected lead <strong>{getLeadName(lead)}</strong></span>
              <span>Dial number <strong>{cleanPhone(leadPhone) || leadPhone || "-"}</strong></span>
            </div>
            {error && <p className="start-call-error-text">{error}</p>}
            {!error && <p>Sending the lead ID to CRM backend. No customer number is sent from the browser.</p>}
            {error && (
              <button
                type="button"
                className="start-call-primary full"
                onClick={(event) => startCall(event)}
                disabled={starting}
              >
                Try again
              </button>
            )}
          </div>
        )}
      </section>
    </div>
  );
};

export default StartCallModal;
