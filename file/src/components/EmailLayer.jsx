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
      delivered: emailLogs.filter((item) => item.success).length,
      failed: emailLogs.filter((item) => !item.success).length,
    }),
    [emailLogs]
  );

  return (
    <div className="row gy-4">
      <div className="col-xxl-3">
        <div className="card h-100 p-0">
          <div className="card-body p-24">
            <div className="d-flex align-items-center gap-2 mb-16">
              <span className="w-40-px h-40-px rounded-circle bg-primary-50 text-primary-600 d-flex align-items-center justify-content-center">
                <Icon icon="uil:envelope" className="text-xl" />
              </span>
              <div>
                <h6 className="mb-0">CRM Emails</h6>
                <span className="text-sm text-secondary-light">Sent email activity</span>
              </div>
            </div>

            <ul>
              <li className="item-active mb-4">
                <span className="bg-hover-primary-50 px-12 py-8 w-100 radius-8 text-secondary-light d-flex align-items-center gap-10 justify-content-between">
                  <span className="d-flex align-items-center gap-10">
                    <Icon icon="ion:paper-plane-outline" className="text-xxl" />
                    <span className="fw-semibold">All Sent</span>
                  </span>
                  <span className="fw-medium">{counts.all}</span>
                </span>
              </li>
              <li className="mb-4">
                <span className="bg-hover-primary-50 px-12 py-8 w-100 radius-8 text-secondary-light d-flex align-items-center gap-10 justify-content-between">
                  <span className="d-flex align-items-center gap-10">
                    <Icon icon="solar:check-circle-bold" className="text-xxl text-success-600" />
                    <span className="fw-semibold">Delivered</span>
                  </span>
                  <span className="fw-medium">{counts.delivered}</span>
                </span>
              </li>
              <li>
                <span className="bg-hover-primary-50 px-12 py-8 w-100 radius-8 text-secondary-light d-flex align-items-center gap-10 justify-content-between">
                  <span className="d-flex align-items-center gap-10">
                    <Icon icon="ph:warning-bold" className="text-xxl text-danger-600" />
                    <span className="fw-semibold">Failed</span>
                  </span>
                  <span className="fw-medium">{counts.failed}</span>
                </span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      <div className="col-xxl-9">
        <div className="card h-100 p-0 email-card">
          <div className="card-header border-bottom bg-base py-16 px-24">
            <div className="d-flex flex-wrap align-items-center justify-content-between gap-3">
              <div>
                <h6 className="mb-0">Admin Email Panel</h6>
                <span className="text-sm text-secondary-light">
                  Emails sent through sales conversation appear here.
                </span>
              </div>
              <button
                type="button"
                className="btn btn-outline-primary btn-sm d-flex align-items-center gap-2"
                onClick={loadEmailLogs}
                disabled={loading}
              >
                <Icon icon="tabler:reload" className={loading ? "icon-spin" : ""} />
                Refresh
              </button>
            </div>
          </div>

          <div className="card-body p-0">
            {message && (
              <div className="alert alert-danger m-24 mb-0" role="alert">
                {message}
              </div>
            )}

            {loading ? (
              <div className="p-24 text-secondary-light">Loading emails...</div>
            ) : emailLogs.length === 0 ? (
              <div className="p-24 text-secondary-light">No CRM emails have been sent yet.</div>
            ) : (
              <div className="table-responsive">
                <table className="table mb-0">
                  <thead>
                    <tr>
                      <th>Sales User</th>
                      <th>Lead</th>
                      <th>Receiver</th>
                      <th>Sender</th>
                      <th>Subject</th>
                      <th>Status</th>
                      <th>Time</th>
                    </tr>
                  </thead>
                  <tbody>
                    {emailLogs.map((email) => (
                      <tr key={email.id}>
                        <td>
                          <div className="fw-semibold text-primary-light">{getSalesUser(email)}</div>
                          {email.sentByName && email.sentByEmail && (
                            <span className="text-sm text-secondary-light">{email.sentByEmail}</span>
                          )}
                        </td>
                        <td>{email.leadName || (email.leadId ? `Lead #${email.leadId}` : "-")}</td>
                        <td>{email.to}</td>
                        <td>{email.from}</td>
                        <td>{email.subject || "-"}</td>
                        <td>
                          <span className={`badge ${email.success ? "bg-success-100 text-success-600" : "bg-danger-100 text-danger-600"}`}>
                            {email.success ? "Delivered" : "Failed"}
                          </span>
                          {!email.success && email.error && (
                            <div className="text-sm text-danger-600 mt-1">{email.error}</div>
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
      </div>
    </div>
  );
};

export default EmailLayer;
