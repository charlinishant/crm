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

const getSalesUser = (email) =>
  email.sentByName || email.sentByEmail || (email.sentByUserId ? `User #${email.sentByUserId}` : "-");

const EmailLayer = () => {
  const [emailLogs, setEmailLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const loadEmailLogs = useCallback(async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch(`${API_URL}/api/email/logs`);
      const result = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(result?.message || "Unable to load email logs");
      }

      setEmailLogs(Array.isArray(result?.data) ? result.data : []);
    } catch (error) {
      setEmailLogs([]);
      setMessage(error.message || "Unable to load email logs");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadEmailLogs();
  }, [loadEmailLogs]);

  const counts = useMemo(
    () => ({
      all: emailLogs.length,
      sent: emailLogs.filter((item) => item.success).length,
      failed: emailLogs.filter((item) => !item.success).length,
    }),
    [emailLogs]
  );

  const visibleEmails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return emailLogs.filter((email) => {
      const matchesStatus =
        statusFilter === "all" ||
        (statusFilter === "sent" && email.success) ||
        (statusFilter === "failed" && !email.success);

      if (!matchesStatus) return false;
      if (!query) return true;

      return [
        getSalesUser(email),
        email.sentByEmail,
        email.leadName,
        email.leadId ? `Lead #${email.leadId}` : "",
        email.to,
        email.from,
        email.subject,
        email.success ? "sent" : "failed",
        formatDateTime(email.createdAt),
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [emailLogs, searchQuery, statusFilter]);

  return (
    <div className="admin-email-panel">
      <div className="admin-email-header">
        <div>
          <h3>Email Activity</h3>
          <p>Emails sent from CRM sales conversations.</p>
        </div>
        <button
          type="button"
          className="admin-email-refresh"
          onClick={loadEmailLogs}
          disabled={loading}
        >
          <Icon icon="tabler:reload" className={loading ? "icon-spin" : ""} />
          {loading ? "Refreshing" : "Refresh"}
        </button>
      </div>

      <div className="admin-email-stats">
        <button
          type="button"
          className={statusFilter === "all" ? "active" : ""}
          onClick={() => setStatusFilter("all")}
        >
          <Icon icon="ion:paper-plane-outline" />
          <span>All Emails</span>
          <strong>{counts.all}</strong>
        </button>
        <button
          type="button"
          className={statusFilter === "sent" ? "active" : ""}
          onClick={() => setStatusFilter("sent")}
        >
          <Icon icon="solar:check-circle-bold" />
          <span>Sent</span>
          <strong>{counts.sent}</strong>
        </button>
        <button
          type="button"
          className={statusFilter === "failed" ? "active" : ""}
          onClick={() => setStatusFilter("failed")}
        >
          <Icon icon="ph:warning-bold" />
          <span>Failed</span>
          <strong>{counts.failed}</strong>
        </button>
      </div>

      <div className="admin-email-toolbar">
        <label className="crm-table-search admin-email-search">
          <Icon icon="ion:search-outline" />
          <input
            type="search"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search emails..."
            aria-label="Search emails"
          />
        </label>
        <select
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value)}
          aria-label="Filter emails by status"
        >
          <option value="all">All Status</option>
          <option value="sent">Sent</option>
          <option value="failed">Failed</option>
        </select>
      </div>

      <div className="admin-email-table-card">
        {message && (
          <div className="alert alert-danger m-24 mb-0" role="alert">
            {message}
          </div>
        )}

        {loading ? (
          <div className="admin-email-empty">Loading emails...</div>
        ) : visibleEmails.length === 0 ? (
          <div className="admin-email-empty">
            {emailLogs.length === 0 ? "No CRM emails have been sent yet." : "No emails match your search."}
          </div>
        ) : (
          <div className="table-responsive">
            <table>
              <thead>
                <tr>
                  <th>Sales User</th>
                  <th>Lead</th>
                  <th>Receiver</th>
                  <th>Subject</th>
                  <th>Status</th>
                  <th>Time</th>
                </tr>
              </thead>
              <tbody>
                {visibleEmails.map((email) => (
                  <tr key={email.id}>
                    <td>
                      <div className="admin-email-user">{getSalesUser(email)}</div>
                      {email.sentByName && email.sentByEmail && (
                        <span className="admin-email-secondary">{email.sentByEmail}</span>
                      )}
                    </td>
                    <td>{email.leadName || (email.leadId ? `Lead #${email.leadId}` : "-")}</td>
                    <td>{email.to || "-"}</td>
                    <td>{email.subject || "-"}</td>
                    <td>
                      <span className={`admin-email-status ${email.success ? "sent" : "failed"}`}>
                        {email.success ? "Sent" : "Failed"}
                      </span>
                      {!email.success && email.error && (
                        <div className="admin-email-error">{email.error}</div>
                      )}
                    </td>
                    <td>{formatDateTime(email.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
            </div>
  );
};

export default EmailLayer;
