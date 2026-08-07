import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";

const formatDateTime = (value) => {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const getSalesUserName = (email) =>
  email.sentByName ||
  email.sentByEmail ||
  (email.sentByUserId ? `User #${email.sentByUserId}` : "-");

const getLeadName = (email) =>
  email.leadName || (email.leadId ? `Lead #${email.leadId}` : "-");

const FormLayoutLayer = () => {
  const [emails, setEmails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("sent");
  const [selectedEmail, setSelectedEmail] = useState(null);

  const loadEmails = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(`${API_URL}/api/email/logs`);
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result?.message || "Unable to load email activity");
      setEmails(Array.isArray(result?.data) ? result.data : []);
    } catch (loadError) {
      setEmails([]);
      setError(loadError.message || "Unable to load email activity");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  useEffect(() => {
    if (!selectedEmail) return undefined;

    const closeOnEscape = (event) => {
      if (event.key === "Escape") setSelectedEmail(null);
    };
    document.addEventListener("keydown", closeOnEscape);
    return () => document.removeEventListener("keydown", closeOnEscape);
  }, [selectedEmail]);

  const visibleEmails = useMemo(() => {
    if (filter === "sent") return emails.filter((email) => email.success);
    if (filter === "failed") return emails.filter((email) => !email.success);
    return emails;
  }, [emails, filter]);

  return (
    <div className="card h-100 p-0 admin-email-card">
      <style>{`
        .admin-email-card { border: 0; overflow: hidden; }
        .admin-email-toolbar {
          align-items: center; border-bottom: 1px solid #e5e7eb; display: flex;
          flex-wrap: wrap; gap: 12px; justify-content: space-between; padding: 20px 24px;
        }
        .admin-email-title h6 { color: #111827; font-size: 18px; margin: 0 0 4px; }
        .admin-email-title p { color: #64748b; font-size: 13px; margin: 0; }
        .admin-email-tools { align-items: center; display: flex; gap: 10px; }
        .admin-email-filter {
          background: #fff; border: 1px solid #d1d5db; border-radius: 6px;
          color: #374151; height: 38px; line-height: 38px; min-width: 145px;
          padding: 0 34px 0 11px;
        }
        .admin-email-refresh {
          align-items: center; background: #fff; border: 1px solid #487fff;
          border-radius: 6px; color: #487fff; display: inline-flex; gap: 7px;
          min-height: 38px; padding: 0 12px;
        }
        .admin-email-refresh:disabled { cursor: not-allowed; opacity: .6; }
        .admin-email-table-wrap { overflow-x: auto; padding: 0 24px 24px; }
        .admin-email-table { border-collapse: separate; border-spacing: 0; min-width: 900px; width: 100%; }
        .admin-email-table thead th {
          background: #487fff; border: 0; color: #fff; font-size: 12px;
          font-weight: 600; letter-spacing: .25px; padding: 14px 16px; text-transform: uppercase;
        }
        .admin-email-table thead th:first-child { border-radius: 6px 0 0 6px; }
        .admin-email-table thead th:last-child { border-radius: 0 6px 6px 0; text-align: center; }
        .admin-email-table tbody td {
          border-bottom: 1px solid #e5e7eb; color: #334155; font-size: 14px;
          padding: 15px 16px; vertical-align: middle;
        }
        .admin-email-table tbody tr:hover { background: #f8faff; }
        .admin-email-id { color: #487fff; font-weight: 700; }
        .admin-email-person { color: #0f172a; font-weight: 600; }
        .admin-email-secondary { color: #64748b; display: block; font-size: 12px; margin-top: 2px; }
        .admin-email-subject { display: block; max-width: 260px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .admin-email-action-cell { text-align: center; }
        .admin-email-view {
          align-items: center; background: #eef4ff; border: 1px solid #cfe0ff;
          border-radius: 6px; color: #2563eb; display: inline-flex; gap: 6px;
          font-size: 13px; font-weight: 600; padding: 7px 11px;
        }
        .admin-email-view:hover { background: #487fff; color: #fff; }
        .admin-email-state { color: #64748b; padding: 48px 20px; text-align: center; }
        .admin-email-error { color: #dc2626; padding: 20px 24px; }
        .admin-email-modal-backdrop {
          align-items: center; background: rgba(15, 23, 42, .58); display: flex;
          inset: 0; justify-content: center; padding: 20px; position: fixed; z-index: 9999;
        }
        .admin-email-modal {
          background: #fff; border-radius: 12px; box-shadow: 0 24px 70px rgba(15, 23, 42, .3);
          max-height: 90vh; max-width: 760px; overflow-y: auto; width: 100%;
        }
        .admin-email-modal-head {
          align-items: flex-start; border-bottom: 1px solid #e5e7eb; display: flex;
          gap: 16px; justify-content: space-between; padding: 20px 24px;
        }
        .admin-email-modal-head h5 { color: #0f172a; margin: 0 0 4px; }
        .admin-email-modal-head p { color: #64748b; font-size: 13px; margin: 0; }
        .admin-email-close {
          align-items: center; background: #f8fafc; border: 1px solid #e2e8f0;
          border-radius: 6px; color: #475569; display: inline-flex; height: 36px;
          justify-content: center; width: 36px;
        }
        .admin-email-details {
          display: grid; gap: 0; grid-template-columns: repeat(2, minmax(0, 1fr)); padding: 8px 24px 0;
        }
        .admin-email-detail { border-bottom: 1px solid #eef2f7; padding: 14px 10px; }
        .admin-email-detail span { color: #64748b; display: block; font-size: 11px; font-weight: 700; margin-bottom: 5px; text-transform: uppercase; }
        .admin-email-detail strong { color: #1e293b; font-size: 14px; font-weight: 600; overflow-wrap: anywhere; }
        .admin-email-message { padding: 20px 24px 24px; }
        .admin-email-message h6 { color: #334155; font-size: 12px; margin: 0 0 8px; text-transform: uppercase; }
        .admin-email-message-body {
          background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px;
          color: #334155; line-height: 1.65; min-height: 130px; padding: 16px;
          white-space: pre-wrap; overflow-wrap: anywhere;
        }
        .admin-email-status {
          border-radius: 999px; display: inline-flex; font-size: 12px;
          font-weight: 700; padding: 4px 9px;
        }
        .admin-email-status.sent { background: #dcfce7; color: #15803d; }
        .admin-email-status.failed { background: #fee2e2; color: #dc2626; }
        @media (max-width: 640px) {
          .admin-email-toolbar { align-items: stretch; flex-direction: column; }
          .admin-email-tools { width: 100%; }
          .admin-email-filter { flex: 1; }
          .admin-email-details { grid-template-columns: 1fr; }
        }
      `}</style>

      <div className="admin-email-toolbar">
        <div className="admin-email-title">
          {/* <h6>Sent Email Activity</h6>
          <p>Emails sent by sales users from lead conversations.</p> */}
        </div>
        <div className="admin-email-tools">
          <select
            className="admin-email-filter"
            value={filter}
            onChange={(event) => setFilter(event.target.value)}
          >
            <option value="sent">Sent Emails</option>
            <option value="all">All Emails</option>
            <option value="failed">Failed Emails</option>
          </select>
          <button
            type="button"
            className="admin-email-refresh"
            onClick={loadEmails}
            disabled={loading}
          >
            <Icon icon="tabler:refresh" /> Refresh
          </button>
        </div>
      </div>

      {error ? (
        <div className="admin-email-error">{error}</div>
      ) : loading ? (
        <div className="admin-email-state">Loading email activity...</div>
      ) : visibleEmails.length === 0 ? (
        <div className="admin-email-state">No email activity found.</div>
      ) : (
        <div className="admin-email-table-wrap">
          <table className="admin-email-table">
            <thead>
              <tr>
                <th>ID</th>
                <th>Sales User</th>
                <th>Lead Name</th>
                <th>Subject</th>
                <th>Sent Date</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleEmails.map((email) => (
                <tr key={email.id}>
                  <td><span className="admin-email-id">#{email.id}</span></td>
                  <td>
                    <span className="admin-email-person">{getSalesUserName(email)}</span>
                    {email.sentByName && email.sentByEmail && (
                      <span className="admin-email-secondary">{email.sentByEmail}</span>
                    )}
                  </td>
                  <td>
                    <span className="admin-email-person">{getLeadName(email)}</span>
                    {email.leadId && <span className="admin-email-secondary">Lead #{email.leadId}</span>}
                  </td>
                  <td><span className="admin-email-subject">{email.subject || "-"}</span></td>
                  <td>{formatDateTime(email.createdAt)}</td>
                  <td className="admin-email-action-cell">
                    <button type="button" className="admin-email-view" onClick={() => setSelectedEmail(email)}>
                      <Icon icon="solar:eye-outline" /> View
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedEmail && (
        <div
          className="admin-email-modal-backdrop"
          role="presentation"
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) setSelectedEmail(null);
          }}
        >
          <section className="admin-email-modal" role="dialog" aria-modal="true" aria-labelledby="admin-email-modal-title">
            <div className="admin-email-modal-head">
              <div>
                <h5 id="admin-email-modal-title">Email Details #{selectedEmail.id}</h5>
                <p>{formatDateTime(selectedEmail.createdAt)}</p>
              </div>
              <button type="button" className="admin-email-close" onClick={() => setSelectedEmail(null)} aria-label="Close">
                <Icon icon="material-symbols:close-rounded" className="text-xl" />
              </button>
            </div>

            <div className="admin-email-details">
              <div className="admin-email-detail"><span>Sales User</span><strong>{getSalesUserName(selectedEmail)}</strong></div>
              <div className="admin-email-detail"><span>Lead</span><strong>{getLeadName(selectedEmail)}</strong></div>
              <div className="admin-email-detail"><span>From</span><strong>{selectedEmail.from || "-"}</strong></div>
              <div className="admin-email-detail"><span>To</span><strong>{selectedEmail.to || "-"}</strong></div>
              <div className="admin-email-detail"><span>Subject</span><strong>{selectedEmail.subject || "-"}</strong></div>
              <div className="admin-email-detail">
                <span>Status</span>
                <strong className={`admin-email-status ${selectedEmail.success ? "sent" : "failed"}`}>
                  {selectedEmail.success ? "Sent" : "Failed"}
                </strong>
              </div>
            </div>

            <div className="admin-email-message">
              <h6>Message</h6>
              <div className="admin-email-message-body">
                {selectedEmail.body || "Message content was not recorded for this older email."}
              </div>
              {!selectedEmail.success && selectedEmail.error && (
                <div className="admin-email-error">{selectedEmail.error}</div>
              )}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};

export default FormLayoutLayer;
