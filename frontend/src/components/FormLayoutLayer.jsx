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
