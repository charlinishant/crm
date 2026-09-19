import React, { useEffect, useRef, useState } from "react";
import {
  Building2,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileText,
  Phone,
  PhoneCall,
  PhoneForwarded,
  PhoneIncoming,
  PhoneOff,
  User,
  Volume2,
  VolumeX,
  X,
} from "lucide-react";

/**
 * Modern Inbound Call Small Popup for Sales Agents & Admins
 * Displays in real-time when an inbound lead call hits the agent
 */
const InboundCallPopup = ({
  inboundCall,
  onClose,
  onViewLead,
  onDispose,
  onAnswer,
  onReject,
}) => {
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const audioContextRef = useRef(null);
  const chimeIntervalRef = useRef(null);

  const rawStatus = String(inboundCall?.status || "ringing").toLowerCase();
  const isRinging = ["initiated", "queued", "calling", "ringing"].includes(rawStatus);
  const isConnected = ["answered", "connected", "in-progress"].includes(rawStatus);
  const isEnded = ["completed", "ended", "failed", "rejected", "missed", "busy", "no-answer"].includes(rawStatus);

  const lead = inboundCall?.lead || null;
  const callerPhone =
    inboundCall?.callerNumber ||
    inboundCall?.customerNumber ||
    inboundCall?.leadPhone ||
    inboundCall?.phone ||
    "-";

  const leadName =
    [lead?.firstName, lead?.lastName].filter(Boolean).join(" ") ||
    lead?.companyName ||
    (lead?.id ? `Lead #${lead.id}` : "Incoming Caller");

  const project =
    lead?.interestedProjects ||
    lead?.project ||
    inboundCall?.interestedProject ||
    inboundCall?.campaignId ||
    "";

  const leadStatus = lead?.status || "New Lead";
  const source = lead?.source || lead?.channelPartner || lead?.tags || "";

  // Live timer for connected call
  useEffect(() => {
    if (!isConnected) {
      setTimerSeconds(0);
      return;
    }
    const connectTime =
      inboundCall?.connectedAt ||
      inboundCall?.answeredAt ||
      inboundCall?.startedAt ||
      Date.now();

    const calculateSeconds = () =>
      Math.max(0, Math.floor((Date.now() - new Date(connectTime).getTime()) / 1000));

    setTimerSeconds(calculateSeconds());
    const interval = window.setInterval(() => {
      setTimerSeconds(calculateSeconds());
    }, 1000);

    return () => window.clearInterval(interval);
  }, [isConnected, inboundCall?.connectedAt, inboundCall?.answeredAt, inboundCall?.startedAt]);

  // Soft Web Audio Ringing Chime
  useEffect(() => {
    if (!isRinging || isMuted) {
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
      return;
    }

    const playDualToneChime = () => {
      try {
        const AudioCtx = window.AudioContext || window.webkitAudioContext;
        if (!AudioCtx) return;
        if (!audioContextRef.current) {
          audioContextRef.current = new AudioCtx();
        }
        const ctx = audioContextRef.current;
        if (ctx.state === "suspended") {
          ctx.resume().catch(() => {});
        }

        const now = ctx.currentTime;
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        const gainNode = ctx.createGain();

        osc1.type = "sine";
        osc1.frequency.setValueAtTime(440, now); // A4
        osc2.type = "sine";
        osc2.frequency.setValueAtTime(480, now);

        gainNode.gain.setValueAtTime(0.001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.05);
        gainNode.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 0.6);
        osc2.stop(now + 0.6);
      } catch (err) {
        // audio policy or unsupported
      }
    };

    playDualToneChime();
    chimeIntervalRef.current = setInterval(playDualToneChime, 2500);

    return () => {
      if (chimeIntervalRef.current) clearInterval(chimeIntervalRef.current);
    };
  }, [isRinging, isMuted]);

  const formatTimer = (totalSeconds = 0) => {
    const mins = Math.floor(totalSeconds / 60);
    const secs = totalSeconds % 60;
    return `${String(mins).padStart(2, "0")}:${String(secs).padStart(2, "0")}`;
  };

  const getInitials = (name) =>
    name
      .split(" ")
      .filter(Boolean)
      .map((part) => part[0])
      .slice(0, 2)
      .join("")
      .toUpperCase() || "LC";

  return (
    <div
      style={{
        position: "fixed",
        bottom: "24px",
        right: "24px",
        zIndex: 999999,
        width: "360px",
        maxWidth: "calc(100vw - 32px)",
        borderRadius: "18px",
        backgroundColor: "#ffffff",
        boxShadow: "0 20px 45px -10px rgba(15, 23, 42, 0.25), 0 0 0 1px rgba(15, 23, 42, 0.08)",
        overflow: "hidden",
        fontFamily: "inherit",
        animation: "swamiInboundPopSlideIn 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
      }}
    >
      <style>
        {`
          @keyframes swamiInboundPopSlideIn {
            from {
              opacity: 0;
              transform: translateY(30px) scale(0.95);
            }
            to {
              opacity: 1;
              transform: translateY(0) scale(1);
            }
          }
          @keyframes swamiRingPulse {
            0% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.6);
              transform: scale(1);
            }
            70% {
              box-shadow: 0 0 0 12px rgba(16, 185, 129, 0);
              transform: scale(1.05);
            }
            100% {
              box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
              transform: scale(1);
            }
          }
        `}
      </style>

      {/* Top Banner Header */}
      <div
        style={{
          background: isRinging
            ? "linear-gradient(135deg, #059669 0%, #10b981 100%)"
            : isConnected
            ? "linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)"
            : "linear-gradient(135deg, #475569 0%, #64748b 100%)",
          padding: "12px 16px",
          color: "#ffffff",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              backgroundColor: "rgba(255, 255, 255, 0.2)",
            }}
          >
            {isRinging ? (
              <PhoneIncoming size={14} style={{ animation: "swamiRingPulse 1.5s infinite" }} />
            ) : isConnected ? (
              <PhoneCall size={14} />
            ) : (
              <PhoneOff size={14} />
            )}
          </span>
          <span style={{ fontWeight: 600, fontSize: "13px", letterSpacing: "0.2px" }}>
            {isRinging ? "Incoming Lead Call" : isConnected ? "Call Connected" : "Call Finished"}
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
          {isRinging && (
            <button
              type="button"
              onClick={() => setIsMuted(!isMuted)}
              title={isMuted ? "Unmute Ringtone" : "Mute Ringtone"}
              style={{
                background: "rgba(255, 255, 255, 0.2)",
                border: "none",
                borderRadius: "6px",
                width: "26px",
                height: "26px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                color: "#ffffff",
                cursor: "pointer",
                padding: 0,
              }}
            >
              {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            title="Close popup"
            style={{
              background: "rgba(255, 255, 255, 0.2)",
              border: "none",
              borderRadius: "6px",
              width: "26px",
              height: "26px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#ffffff",
              cursor: "pointer",
              padding: 0,
            }}
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ padding: "16px" }}>
        {/* Caller Info Header */}
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "12px" }}>
          <div
            style={{
              width: "48px",
              height: "48px",
              borderRadius: "14px",
              background: isRinging ? "#ecfdf5" : isConnected ? "#eff6ff" : "#f1f5f9",
              color: isRinging ? "#059669" : isConnected ? "#2563eb" : "#475569",
              fontWeight: "700",
              fontSize: "16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
              animation: isRinging ? "swamiRingPulse 2s infinite" : "none",
            }}
          >
            {getInitials(leadName)}
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <h4
              style={{
                margin: "0 0 2px 0",
                fontSize: "15px",
                fontWeight: "700",
                color: "#0f172a",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
            >
              {leadName}
            </h4>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", color: "#475569", fontSize: "13px", fontWeight: "500" }}>
              <Phone size={12} color="#059669" />
              <span>{callerPhone}</span>
            </div>
          </div>
        </div>

        {/* Lead Badges / Tags */}
        <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", marginBottom: "14px" }}>
          {project && (
            <span
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: "4px",
                fontSize: "11px",
                fontWeight: "600",
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: "#f8fafc",
                border: "1px solid #e2e8f0",
                color: "#334155",
              }}
            >
              <Building2 size={11} color="#64748b" />
              {project}
            </span>
          )}

          {leadStatus && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "600",
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: "#e0f2fe",
                color: "#0369a1",
              }}
            >
              {leadStatus}
            </span>
          )}

          {source && (
            <span
              style={{
                fontSize: "11px",
                fontWeight: "500",
                padding: "3px 8px",
                borderRadius: "6px",
                backgroundColor: "#f1f5f9",
                color: "#64748b",
              }}
            >
              {source}
            </span>
          )}
        </div>

        {/* Status bar */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "8px 12px",
            borderRadius: "10px",
            backgroundColor: isRinging ? "#ecfdf5" : isConnected ? "#eff6ff" : "#f8fafc",
            marginBottom: "14px",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                backgroundColor: isRinging ? "#10b981" : isConnected ? "#3b82f6" : "#94a3b8",
                display: "inline-block",
              }}
            />
            <span
              style={{
                fontSize: "12px",
                fontWeight: "600",
                color: isRinging ? "#047857" : isConnected ? "#1d4ed8" : "#475569",
              }}
            >
              {isRinging
                ? "Ringing on your device..."
                : isConnected
                ? "In Conversation"
                : "Call Finished"}
            </span>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "4px", fontSize: "12px", fontWeight: "700", color: "#334155" }}>
            <Clock size={12} color="#64748b" />
            <span>
              {isConnected
                ? formatTimer(timerSeconds)
                : isEnded
                ? formatTimer(inboundCall?.duration || timerSeconds)
                : "Live"}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          {onViewLead && (
            <button
              type="button"
              onClick={() => {
                onViewLead(lead || { id: inboundCall?.leadId, phone: callerPhone, firstName: leadName });
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "9px",
                backgroundColor: "#f1f5f9",
                border: "1px solid #e2e8f0",
                color: "#1e293b",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <ExternalLink size={13} />
              View Lead
            </button>
          )}

          {onDispose && (
            <button
              type="button"
              onClick={() => {
                onDispose(lead, inboundCall);
              }}
              style={{
                flex: 1,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "8px 12px",
                borderRadius: "9px",
                backgroundColor: isEnded ? "#2563eb" : "#eff6ff",
                border: isEnded ? "none" : "1px solid #bfdbfe",
                color: isEnded ? "#ffffff" : "#1d4ed8",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                transition: "background 0.2s",
              }}
            >
              <FileText size={13} />
              {isEnded ? "Add Disposition" : "Disposition"}
            </button>
          )}

          {isRinging && onAnswer && (
            <button
              type="button"
              onClick={onAnswer}
              style={{
                padding: "8px 14px",
                borderRadius: "9px",
                backgroundColor: "#10b981",
                border: "none",
                color: "#ffffff",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "4px",
              }}
            >
              <PhoneCall size={13} />
              Answer
            </button>
          )}

          {isRinging && onReject && (
            <button
              type="button"
              onClick={onReject}
              style={{
                padding: "8px 12px",
                borderRadius: "9px",
                backgroundColor: "#fee2e2",
                border: "1px solid #fecaca",
                color: "#dc2626",
                fontSize: "12px",
                fontWeight: "600",
                cursor: "pointer",
              }}
            >
              Ignore
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default InboundCallPopup;
