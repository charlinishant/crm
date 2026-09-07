import { Icon } from "@iconify/react/dist/iconify.js";
import React, { useCallback, useEffect, useMemo, useState } from "react";
import TableSelectionCheckbox from "./table/TableSelectionCheckbox";
import { useTableSelection } from "./table/useTableSelection";
import BulkActionToolbar from "./table/BulkActionToolbar";

const API_URL = process.env.REACT_APP_API_URL || "http://localhost:5000";
const RECORDS_PER_PAGE = 10;

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
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState("all");
  const [selectedEmail, setSelectedEmail] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

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

  const filteredEmails = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();

    return emails.filter((email) => {
      // Filter tab
      if (filter === "sent" && !email.success) return false;
      if (filter === "failed" && email.success) return false;

      // Search query
      if (!query) return true;

      const salesUser = String(getSalesUserName(email)).toLowerCase();
      const leadName = String(getLeadName(email)).toLowerCase();
      const subject = String(email.subject || "").toLowerCase();
      const to = String(email.to || "").toLowerCase();
      const id = String(email.id);

      return (
        salesUser.includes(query) ||
        leadName.includes(query) ||
        subject.includes(query) ||
        to.includes(query) ||
        id.includes(query)
      );
    });
  }, [emails, filter, searchQuery]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filter]);

  const totalPages = Math.max(1, Math.ceil(filteredEmails.length / RECORDS_PER_PAGE));

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, totalPages));
  }, [totalPages]);

  const paginatedEmails = useMemo(() => {
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    return filteredEmails.slice(start, start + RECORDS_PER_PAGE);
  }, [currentPage, filteredEmails]);

  const showingFrom = filteredEmails.length === 0 ? 0 : (currentPage - 1) * RECORDS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * RECORDS_PER_PAGE, filteredEmails.length);

  const tableSelection = useTableSelection({
    rows: paginatedEmails,
    getRowId: (item) => item.id,
    disabled: bulkDeleting,
    pruneOnRowsChange: true,
  });

  const handleBulkDelete = async () => {
    if (tableSelection.selectedCount === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${tableSelection.selectedCount} selected email log(s)?`)) {
      return;
    }
    setBulkDeleting(true);
    try {
      const deletePromises = tableSelection.selectedIds.map((id) =>
        fetch(`${API_URL}/api/email/${id}`, { method: "DELETE" })
      );
      await Promise.all(deletePromises);
      setEmails((prev) => prev.filter((e) => !tableSelection.selectedIds.includes(e.id)));
      tableSelection.clearSelection();
      setStatusMessage("Selected email logs deleted successfully.");
      setTimeout(() => setStatusMessage(""), 4000);
    } catch (err) {
      console.error("Bulk delete failed:", err);
      setStatusMessage("Failed to delete selected email logs.");
    } finally {
      setBulkDeleting(false);
    }
  };

  const goToPreviousPage = () => {
    setCurrentPage((page) => Math.max(1, page - 1));
  };

  const goToNextPage = () => {
    setCurrentPage((page) => Math.min(totalPages, page + 1));
  };

  return (
    <div className="floor-dashboard booking-dashboard">
      <div className="floor-card booking-card">
        {/* Top Controls Header */}
        <div className="floor-header d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <select
              className="form-select booking-dropdown"
              value={filter}
              onChange={(event) => setFilter(event.target.value)}
              aria-label="Filter emails by status"
            >
              <option value="all">All Emails</option>
              <option value="sent">Sent Emails</option>
              <option value="failed">Failed Emails</option>
            </select>
            <span className="item-count">{filteredEmails.length} items.</span>
          </div>

          <div className="action-wrapper d-flex align-items-center gap-3">
            <div className="search-container">
              <input
                type="text"
                className="form-control form-control-sm search-input-override"
                placeholder="Search emails..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <span className="search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="11" cy="11" r="8"></circle>
                  <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                </svg>
              </span>
            </div>
            <button
              type="button"
              className="btn btn-outline-primary d-inline-flex align-items-center gap-2 flex-shrink-0"
              style={{ height: "40px", borderRadius: "8px", fontWeight: 600, fontSize: "14px", padding: "0 16px", whiteSpace: "nowrap" }}
              onClick={loadEmails}
              disabled={loading}
              title="Refresh email logs"
            >
              <Icon icon="tabler:refresh" className={loading ? "spin" : ""} /> Refresh
            </button>
          </div>
        </div>

        {/* Status Message */}
        {statusMessage && (
          <div className="booking-status-message mb-3">{statusMessage}</div>
        )}

        {/* Bulk Actions Toolbar */}
        {tableSelection.selectedCount > 0 && (
          <BulkActionToolbar
            count={tableSelection.selectedCount}
            entityLabel="emails"
            isDeleting={bulkDeleting}
            onClear={() => {
              tableSelection.clearSelection();
              setStatusMessage("");
            }}
            onDelete={handleBulkDelete}
            deleteLabel="Delete selected"
          />
        )}

        {/* Error / Table View */}
        {error ? (
          <div className="admin-email-error">{error}</div>
        ) : (
          <div className="table-responsive">
            <table className="floor-table admin-email-table">
              <thead>
                <tr>
                  <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px", width: "48px", textAlign: "center", padding: "14px 12px" }}>
                    <TableSelectionCheckbox
                      checked={tableSelection.allVisibleSelected}
                      indeterminate={tableSelection.isHeaderIndeterminate}
                      label="Select visible emails"
                      onChange={tableSelection.toggleVisible}
                      disabled={bulkDeleting || paginatedEmails.length === 0}
                    />
                  </th>
                  <th>ID</th>
                  <th>Sales User</th>
                  <th>Lead Name</th>
                  <th>Subject</th>
                  <th>Sent Date</th>
                  <th style={{ textAlign: "center" }}>Status</th>
                  <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px", textAlign: "center" }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4">
                      Loading email activity...
                    </td>
                  </tr>
                ) : filteredEmails.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="text-center py-4 text-muted">
                      {searchQuery ? "No matching emails found." : "No email activity found."}
                    </td>
                  </tr>
                ) : (
                  paginatedEmails.map((email) => (
                    <tr
                      key={email.id}
                      className={tableSelection.isSelected(email.id) ? "selected" : ""}
                    >
                      <td style={{ textAlign: "center", padding: "14px 12px" }}>
                        <TableSelectionCheckbox
                          checked={tableSelection.isSelected(email.id)}
                          label={`Select email ${email.id}`}
                          onChange={() => tableSelection.toggleRow(email.id)}
                          disabled={bulkDeleting}
                        />
                      </td>
                      <td>
                        <span className="admin-email-id">#{email.id}</span>
                      </td>
                      <td>
                        <div className="admin-email-person">{getSalesUserName(email)}</div>
                        {email.sentByName && email.sentByEmail && (
                          <div className="admin-email-secondary">{email.sentByEmail}</div>
                        )}
                      </td>
                      <td>
                        <div className="admin-email-person">{getLeadName(email)}</div>
                        {email.leadId && <div className="admin-email-secondary">Lead #{email.leadId}</div>}
                      </td>
                      <td>
                        <span className="admin-email-subject" title={email.subject || ""}>
                          {email.subject || "-"}
                        </span>
                      </td>
                      <td>{formatDateTime(email.createdAt)}</td>
                      <td style={{ textAlign: "center" }}>
                        <span
                          className={`badge ${
                            email.success ? "bg-success-focus text-success-main" : "bg-danger-focus text-danger-main"
                          }`}
                          style={{ fontSize: "12px", padding: "6px 12px", borderRadius: "20px" }}
                        >
                          {email.success ? "Sent" : "Failed"}
                        </span>
                      </td>
                      <td className="admin-email-action-cell" style={{ textAlign: "center" }}>
                        <button
                          type="button"
                          className="admin-email-view"
                          onClick={() => setSelectedEmail(email)}
                          aria-label={`View email ${email.id} details`}
                        >
                          <Icon icon="solar:eye-outline" /> View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {!loading && filteredEmails.length > 0 && (
          <div className="booking-pagination">
            <span className="booking-pagination-info">
              Showing {showingFrom}-{showingTo} of {filteredEmails.length}
            </span>
            <div className="booking-pagination-actions">
              <button
                type="button"
                className="booking-page-button"
                onClick={goToPreviousPage}
                disabled={currentPage === 1}
              >
                Previous
              </button>
              <span className="booking-page-count">
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                className="booking-page-button"
                onClick={goToNextPage}
                disabled={currentPage === totalPages}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Details Modal */}
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
              <button
                type="button"
                className="admin-email-close"
                onClick={() => setSelectedEmail(null)}
                aria-label="Close modal"
              >
                <Icon icon="material-symbols:close-rounded" className="text-xl" />
              </button>
            </div>

            <div className="admin-email-details">
              <div className="admin-email-detail">
                <span>Sales User</span>
                <strong>{getSalesUserName(selectedEmail)}</strong>
              </div>
              <div className="admin-email-detail">
                <span>Lead</span>
                <strong>{getLeadName(selectedEmail)}</strong>
              </div>
              <div className="admin-email-detail">
                <span>From</span>
                <strong>{selectedEmail.from || "-"}</strong>
              </div>
              <div className="admin-email-detail">
                <span>To</span>
                <strong>{selectedEmail.to || "-"}</strong>
              </div>
              <div className="admin-email-detail">
                <span>Subject</span>
                <strong>{selectedEmail.subject || "-"}</strong>
              </div>
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
