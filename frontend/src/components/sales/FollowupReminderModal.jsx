import React, { useEffect, useMemo, useRef, useState } from "react";
import {
  Bell,
  BellOff,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  MessageCircle,
  Phone,
  Volume2,
  X,
} from "lucide-react";
import { markFollowupDone, snoozeFollowup } from "../../services/followupApi";

// Web Audio API synthesized professional reminder chime
const playReminderChime = () => {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();

    if (ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }

    const now = ctx.currentTime;
    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();

    osc1.type = "sine";
    osc1.frequency.setValueAtTime(587.33, now); // D5
    osc1.frequency.setValueAtTime(880, now + 0.12); // A5
    osc1.frequency.setValueAtTime(1174.66, now + 0.25); // D6

    gain1.gain.setValueAtTime(0.001, now);
    gain1.gain.exponentialRampToValueAtTime(0.28, now + 0.04);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.6);

    osc1.connect(gain1);
    gain1.connect(ctx.destination);

    osc1.start(now);
    osc1.stop(now + 0.6);
  } catch (err) {
    console.warn("Unable to play reminder chime:", err);
  }
};

const FollowupReminderModal = ({
  reminders = [],
  onDismiss,
  onOpenLead,
  onCallLead,
  onWhatsAppLead,
  onReminderActionCompleted,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(() => {
    try {
      return localStorage.getItem("reminderSoundEnabled") !== "false";
    } catch {
      return true;
    }
  });
  const [customSnoozeMinutes, setCustomSnoozeMinutes] = useState("15");
  const [showCustomSnooze, setShowCustomSnooze] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [actionMessage, setActionMessage] = useState("");
  const playedReminderIdsRef = useRef(new Set());

  const activeReminders = useMemo(() => {
    return Array.isArray(reminders) ? reminders.filter(Boolean) : [];
  }, [reminders]);

  const currentReminder = activeReminders[currentIndex] || activeReminders[0] || null;

  // Sound playback once per new batch
  useEffect(() => {
    if (!activeReminders.length || !soundEnabled) return;

    const unplayed = activeReminders.filter(
      (r) => r?.followUpId && !playedReminderIdsRef.current.has(r.followUpId)
    );

    if (unplayed.length > 0) {
      unplayed.forEach((r) => playedReminderIdsRef.current.add(r.followUpId));
      playReminderChime();
    }
  }, [activeReminders, soundEnabled]);

  // Request & Trigger native Browser Notification
  useEffect(() => {
    if (!currentReminder || typeof window === "undefined" || !("Notification" in window)) return;

    if (Notification.permission === "default") {
      Notification.requestPermission().catch(() => {});
    }

    if (Notification.permission === "granted") {
      try {
        const leadTitle = currentReminder.leadName || `Lead #${currentReminder.leadId}`;
        const bodyText = `${leadTitle} — ${currentReminder.type || "Follow-up"} at ${
          currentReminder.scheduledTime || "scheduled time"
        }`;
        const offsetLabel = currentReminder.offsetMinutes || 10;
        const notification = new Notification(`Follow-up in ${offsetLabel} minutes`, {
          body: bodyText,
          icon: "/favicon.ico",
          tag: `followup-${currentReminder.followUpId}`,
        });

        notification.onclick = () => {
          window.focus();
          if (onOpenLead && currentReminder.leadId) {
            onOpenLead({ id: currentReminder.leadId, ...currentReminder });
          }
        };
      } catch (err) {
        console.warn("Browser notification skipped:", err);
      }
    }
  }, [currentReminder, onOpenLead]);

  const toggleSound = () => {
    setSoundEnabled((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("reminderSoundEnabled", String(next));
      } catch {}
      return next;
    });
  };

  const handleSnooze = async (minutes) => {
    if (!currentReminder?.followUpId) return;
    setIsProcessing(true);
    setActionMessage("");
    try {
      await snoozeFollowup(currentReminder.followUpId, minutes);
      setActionMessage(`Snoozed for ${minutes} minutes`);
      setTimeout(() => {
        if (onDismiss) onDismiss(currentReminder.followUpId);
        if (onReminderActionCompleted) onReminderActionCompleted();
      }, 500);
    } catch (err) {
      setActionMessage(err.message || "Unable to snooze follow-up");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleComplete = async () => {
    if (!currentReminder?.followUpId) return;
    setIsProcessing(true);
    setActionMessage("");
    try {
      await markFollowupDone(currentReminder.followUpId, {
        note: "Completed from reminder popup",
      });
      setActionMessage("Follow-up marked as Completed");
      setTimeout(() => {
        if (onDismiss) onDismiss(currentReminder.followUpId);
        if (onReminderActionCompleted) onReminderActionCompleted();
      }, 500);
    } catch (err) {
      setActionMessage(err.message || "Unable to complete follow-up");
    } finally {
      setIsProcessing(false);
    }
  };

  if (!currentReminder) return null;

  const totalCount = activeReminders.length;
  const leadName = currentReminder.leadName || `Lead #${currentReminder.leadId || "-"}`;
  const phone = currentReminder.phone || "";
  const type = currentReminder.type || "Call";
  const priority = currentReminder.priority || "Medium";
  const scheduledTime = currentReminder.scheduledTime || "Soon";
  const notes = currentReminder.notes || "";
  const reminderOffsetLabel = currentReminder.offsetMinutes || 10;

  return (
    <div
      className="sales-modal-backdrop followup-reminder-backdrop"
      role="dialog"
      aria-modal="true"
      style={{ zIndex: 10000 }}
    >
      <div className="followup-reminder-card">
        {/* Header */}
        <div className="followup-reminder-header">
          <div className="reminder-header-title">
            <div className="reminder-bell-badge">
              <Bell size={18} className="reminder-bell-icon" />
            </div>
            <div>
              <h3>Follow-up in {reminderOffsetLabel} minutes</h3>
              <p>
                {totalCount > 1 ? (
                  <span className="reminder-counter">
                    Reminder {currentIndex + 1} of {totalCount}
                  </span>
                ) : (
                  "Upcoming scheduled interaction"
                )}
              </p>
            </div>
          </div>

          <div className="reminder-header-controls">
            <button
              type="button"
              className="reminder-sound-btn"
              onClick={toggleSound}
              title={soundEnabled ? "Mute Reminder Buzzer" : "Unmute Reminder Buzzer"}
            >
              {soundEnabled ? <Volume2 size={16} /> : <BellOff size={16} />}
            </button>
            <button
              type="button"
              className="reminder-play-again-btn"
              onClick={playReminderChime}
              title="Play buzzer chime again"
            >
              Play Again
            </button>
            <button
              type="button"
              className="reminder-close-btn"
              onClick={() => onDismiss && onDismiss(currentReminder.followUpId)}
              title="Dismiss"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Lead & Follow-up Details */}
        <div className="followup-reminder-body">
          <div className="reminder-lead-row">
            <div>
              <h4 className="reminder-lead-name">{leadName}</h4>
              <div className="reminder-lead-meta">
                {currentReminder.leadId && <span>Lead ID: #{currentReminder.leadId}</span>}
                {phone && <span>Phone: {phone}</span>}
              </div>
            </div>
            <div className="reminder-badges">
              <span className={`reminder-priority-badge priority-${priority.toLowerCase()}`}>
                {priority} Priority
              </span>
              <span className="reminder-type-badge">{type}</span>
            </div>
          </div>

          <div className="reminder-time-box">
            <Clock size={16} />
            <span>Scheduled for today at <strong>{scheduledTime}</strong></span>
          </div>

          {notes && (
            <div className="reminder-notes-box">
              <div className="reminder-notes-label">Notes / Instructions:</div>
              <p>{notes}</p>
            </div>
          )}

          {actionMessage && (
            <div className="reminder-action-msg">{actionMessage}</div>
          )}
        </div>

        {/* Quick Contact & Action Buttons */}
        <div className="followup-reminder-actions">
          <div className="reminder-contact-row">
            {onOpenLead && (
              <button
                type="button"
                className="reminder-act-btn outline"
                onClick={() => onOpenLead({ id: currentReminder.leadId, ...currentReminder })}
              >
                <ExternalLink size={15} /> Open Lead
              </button>
            )}
            {onCallLead && phone && (
              <button
                type="button"
                className="reminder-act-btn primary"
                onClick={() => onCallLead({ id: currentReminder.leadId, phone, ...currentReminder })}
              >
                <Phone size={15} /> Call Now
              </button>
            )}
            {onWhatsAppLead && phone && (
              <button
                type="button"
                className="reminder-act-btn whatsapp"
                onClick={() => onWhatsAppLead({ id: currentReminder.leadId, phone, ...currentReminder })}
              >
                <MessageCircle size={15} /> WhatsApp
              </button>
            )}
            <button
              type="button"
              className="reminder-act-btn success"
              disabled={isProcessing}
              onClick={handleComplete}
            >
              <CheckCircle2 size={15} /> Mark Completed
            </button>
          </div>

          {/* Snooze Options */}
          <div className="reminder-snooze-row">
            <span className="snooze-label">Snooze:</span>
            <button
              type="button"
              className="snooze-chip"
              disabled={isProcessing}
              onClick={() => handleSnooze(5)}
            >
              5m
            </button>
            <button
              type="button"
              className="snooze-chip"
              disabled={isProcessing}
              onClick={() => handleSnooze(10)}
            >
              10m
            </button>
            <button
              type="button"
              className="snooze-chip"
              disabled={isProcessing}
              onClick={() => handleSnooze(15)}
            >
              15m
            </button>
            <button
              type="button"
              className="snooze-chip"
              disabled={isProcessing}
              onClick={() => handleSnooze(30)}
            >
              30m
            </button>
            <button
              type="button"
              className="snooze-chip custom-toggle"
              onClick={() => setShowCustomSnooze((prev) => !prev)}
            >
              Custom
            </button>

            {showCustomSnooze && (
              <div className="custom-snooze-form">
                <input
                  type="number"
                  min="1"
                  max="1440"
                  value={customSnoozeMinutes}
                  onChange={(e) => setCustomSnoozeMinutes(e.target.value)}
                  placeholder="Min"
                />
                <button
                  type="button"
                  className="snooze-chip primary"
                  disabled={isProcessing}
                  onClick={() => handleSnooze(Number(customSnoozeMinutes) || 15)}
                >
                  Set
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Multi-reminder Carousel Footer */}
        {totalCount > 1 && (
          <div className="reminder-carousel-footer">
            <button
              type="button"
              className="carousel-nav-btn"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((prev) => Math.max(0, prev - 1))}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <span className="carousel-indicator">
              {currentIndex + 1} of {totalCount}
            </span>
            <button
              type="button"
              className="carousel-nav-btn"
              disabled={currentIndex === totalCount - 1}
              onClick={() => setCurrentIndex((prev) => Math.min(totalCount - 1, prev + 1))}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      <style>{`
        .followup-reminder-backdrop {
          position: fixed;
          inset: 0;
          background: rgba(15, 23, 42, 0.6);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 16px;
        }

        .followup-reminder-card {
          background: #ffffff;
          border-radius: 14px;
          box-shadow: 0 20px 40px -10px rgba(0, 0, 0, 0.25), 0 0 0 1px rgba(0, 0, 0, 0.08);
          max-width: 540px;
          width: 100%;
          overflow: hidden;
          animation: reminderSlideUp 0.25s cubic-bezier(0.16, 1, 0.3, 1);
        }

        @keyframes reminderSlideUp {
          from {
            opacity: 0;
            transform: translateY(20px) scale(0.97);
          }
          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        .followup-reminder-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          background: linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%);
          color: #ffffff;
        }

        .reminder-header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .reminder-bell-badge {
          width: 36px;
          height: 36px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.2);
          display: flex;
          align-items: center;
          justify-content: center;
          animation: bellPulse 2s infinite;
        }

        @keyframes bellPulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.1); }
        }

        .reminder-header-title h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
          color: #ffffff;
        }

        .reminder-header-title p {
          margin: 2px 0 0;
          font-size: 12px;
          color: rgba(255, 255, 255, 0.85);
        }

        .reminder-header-controls {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reminder-sound-btn,
        .reminder-play-again-btn,
        .reminder-close-btn {
          background: rgba(255, 255, 255, 0.15);
          border: 0;
          border-radius: 6px;
          color: #ffffff;
          cursor: pointer;
          font-size: 11px;
          font-weight: 600;
          padding: 6px 10px;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: background 0.15s;
        }

        .reminder-sound-btn:hover,
        .reminder-play-again-btn:hover,
        .reminder-close-btn:hover {
          background: rgba(255, 255, 255, 0.3);
        }

        .followup-reminder-body {
          padding: 20px;
          border-bottom: 1px solid #f1f5f9;
        }

        .reminder-lead-row {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .reminder-lead-name {
          margin: 0;
          font-size: 18px;
          font-weight: 700;
          color: #0f172a;
        }

        .reminder-lead-meta {
          margin-top: 4px;
          font-size: 13px;
          color: #64748b;
          display: flex;
          gap: 12px;
        }

        .reminder-badges {
          display: flex;
          gap: 6px;
        }

        .reminder-priority-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          text-transform: uppercase;
        }

        .reminder-priority-badge.priority-high {
          background: #fee2e2;
          color: #b91c1c;
        }

        .reminder-priority-badge.priority-medium {
          background: #fef3c7;
          color: #b45309;
        }

        .reminder-priority-badge.priority-low {
          background: #e0f2fe;
          color: #0369a1;
        }

        .reminder-type-badge {
          font-size: 11px;
          font-weight: 700;
          padding: 3px 8px;
          border-radius: 4px;
          background: #f1f5f9;
          color: #334155;
        }

        .reminder-time-box {
          margin-top: 14px;
          background: #eff6ff;
          border: 1px solid #dbeafe;
          border-radius: 8px;
          padding: 10px 14px;
          font-size: 13px;
          color: #1e40af;
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .reminder-notes-box {
          margin-top: 12px;
          background: #f8fafc;
          border-radius: 8px;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
        }

        .reminder-notes-label {
          font-size: 11px;
          font-weight: 700;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.04em;
          margin-bottom: 4px;
        }

        .reminder-notes-box p {
          margin: 0;
          font-size: 13px;
          color: #334155;
          line-height: 1.4;
        }

        .reminder-action-msg {
          margin-top: 10px;
          font-size: 12px;
          font-weight: 600;
          color: #059669;
        }

        .followup-reminder-actions {
          padding: 16px 20px;
          background: #fafafa;
          display: flex;
          flex-direction: column;
          gap: 12px;
        }

        .reminder-contact-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
        }

        .reminder-act-btn {
          flex: 1;
          min-width: 105px;
          height: 38px;
          border-radius: 8px;
          font-size: 13px;
          font-weight: 600;
          border: 0;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          transition: all 0.15s;
        }

        .reminder-act-btn.outline {
          background: #ffffff;
          border: 1px solid #cbd5e1;
          color: #334155;
        }
        .reminder-act-btn.outline:hover {
          background: #f1f5f9;
        }

        .reminder-act-btn.primary {
          background: #2563eb;
          color: #ffffff;
        }
        .reminder-act-btn.primary:hover {
          background: #1d4ed8;
        }

        .reminder-act-btn.whatsapp {
          background: #16a34a;
          color: #ffffff;
        }
        .reminder-act-btn.whatsapp:hover {
          background: #15803d;
        }

        .reminder-act-btn.success {
          background: #0d9488;
          color: #ffffff;
        }
        .reminder-act-btn.success:hover {
          background: #0f766e;
        }

        .reminder-snooze-row {
          display: flex;
          align-items: center;
          flex-wrap: wrap;
          gap: 6px;
          font-size: 12px;
        }

        .snooze-label {
          font-weight: 600;
          color: #64748b;
          margin-right: 4px;
        }

        .snooze-chip {
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          padding: 4px 10px;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          cursor: pointer;
          transition: all 0.15s;
        }

        .snooze-chip:hover {
          background: #f1f5f9;
          border-color: #cbd5e1;
          color: #1e293b;
        }

        .snooze-chip.primary {
          background: #2563eb;
          color: #ffffff;
          border-color: #2563eb;
        }

        .custom-snooze-form {
          display: inline-flex;
          align-items: center;
          gap: 4px;
          margin-left: 4px;
        }

        .custom-snooze-form input {
          width: 50px;
          height: 28px;
          border: 1px solid #cbd5e1;
          border-radius: 6px;
          padding: 0 6px;
          font-size: 12px;
        }

        .reminder-carousel-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 20px;
          background: #f1f5f9;
          border-top: 1px solid #e2e8f0;
        }

        .carousel-nav-btn {
          background: transparent;
          border: 0;
          color: #475569;
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
        }

        .carousel-nav-btn:disabled {
          opacity: 0.4;
          cursor: not-allowed;
        }

        .carousel-indicator {
          font-size: 12px;
          font-weight: 600;
          color: #64748b;
        }
      `}</style>
    </div>
  );
};

export default FollowupReminderModal;
