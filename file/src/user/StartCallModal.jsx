import React, { useEffect, useState } from "react";
import { CheckCircle2, Phone, ShieldCheck, Smartphone, X } from "lucide-react";
import countryCallingCodes from "./countryCallingCodes";

const cleanPhone = (value) => String(value || "").replace(/\D/g, "");
const DEFAULT_COUNTRY_CODE = "91";

const splitPhoneNumber = (value) => {
  const digits = cleanPhone(value);
  if (digits.length <= 10) return { countryCode: DEFAULT_COUNTRY_CODE, nationalNumber: digits };

  const match = [...countryCallingCodes]
    .sort((a, b) => b.dialCode.length - a.dialCode.length)
    .find((item) => digits.startsWith(item.dialCode));

  return match
    ? { countryCode: match.dialCode, nationalNumber: digits.slice(match.dialCode.length) }
    : { countryCode: DEFAULT_COUNTRY_CODE, nationalNumber: digits };
};

const getLeadName = (lead) =>
  [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
  lead?.companyName ||
  (lead?.id ? `Lead #${lead.id}` : "Selected lead");

const StartCallModal = ({ lead, leadPhone, initialAgentPhone, onClose, onStart }) => {
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [nationalNumber, setNationalNumber] = useState("");
  const [error, setError] = useState("");
  const [starting, setStarting] = useState(false);
  const [callLog, setCallLog] = useState(null);

  useEffect(() => {
    const parsedPhone = splitPhoneNumber(initialAgentPhone);
    setCountryCode(parsedPhone.countryCode);
    setNationalNumber(parsedPhone.nationalNumber);
    setError("");
    setStarting(false);
    setCallLog(null);
  }, [initialAgentPhone, lead]);

  if (!lead) return null;

  const submit = async (event) => {
    event.preventDefault();
    const normalizedAgentPhone = `${countryCode}${cleanPhone(nationalNumber)}`;

    if (cleanPhone(leadPhone).length < 10) {
      setError("This lead does not have a valid phone number.");
      return;
    }
    if (cleanPhone(nationalNumber).length < 6 || normalizedAgentPhone.length > 15) {
      setError("Enter a valid phone number for the selected country code.");
      return;
    }

    setStarting(true);
    setError("");
    try {
      const result = await onStart?.(normalizedAgentPhone);
      if (!result) throw new Error("Unable to initiate the call.");
      setCallLog(result);
    } catch (startError) {
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
            <p>Secure Exotel bridge call</p>
          </div>
          <button type="button" className="start-call-close" onClick={onClose} disabled={starting} aria-label="Close">
            <X size={19} />
          </button>
        </header>

        {callLog ? (
          <div className="start-call-success">
            <CheckCircle2 size={54} />
            <h4>Check your phone</h4>
            <p>Exotel will call your agent number first. Answer it to connect with {getLeadName(lead)}.</p>
            <div className="start-call-reference">
              <span>Status <strong>{String(callLog.status || "initiated").replace("-", " ")}</strong></span>
              <span>Call reference <strong>#{callLog.id}</strong></span>
            </div>
            <button type="button" className="start-call-primary full" onClick={onClose}>OK, continue</button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <div className="start-call-body">
              <div className="start-call-person">
                <span>{getLeadName(lead).slice(0, 1).toUpperCase()}</span>
                <div><strong>{getLeadName(lead)}</strong><small>{leadPhone || "Phone unavailable"}</small></div>
              </div>

              <div className="start-call-flow" aria-label="Call connection flow">
                <div><Smartphone size={18} /><span>Your phone</span></div>
                <i />
                <div><ShieldCheck size={18} /><span>Exotel</span></div>
                <i />
                <div><Phone size={18} /><span>Lead</span></div>
              </div>

              <label className="start-call-field">
                <span>Agent phone number</span>
                <div>
                  <select value={countryCode} onChange={(event) => setCountryCode(event.target.value)} aria-label="Country calling code">
                    {countryCallingCodes.map((item) => (
                      <option key={`${item.iso}-${item.dialCode}`} value={item.dialCode}>
                        {item.iso} +{item.dialCode} - {item.country}
                      </option>
                    ))}
                  </select>
                  <input autoFocus inputMode="tel" value={nationalNumber} maxLength="15" onChange={(event) => setNationalNumber(cleanPhone(event.target.value))} placeholder="9876543210" aria-label="Agent phone number" />
                </div>
                <small>Select a country code, then enter the phone number. This number rings first.</small>
              </label>

              <div className="start-call-info">
                The lead sees your configured Exophone number. Calls may be recorded for CRM history and quality purposes.
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
