import React, { useMemo, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import TableSelectionCheckbox from "./table/TableSelectionCheckbox";
import { useTableSelection } from "./table/useTableSelection";
import BulkActionToolbar from "./table/BulkActionToolbar";

const RECORDS_PER_PAGE = 10;

const Sms = () => {
  const [currentFilter, setCurrentFilter] = useState("Inbox");
  const [searchQuery, setSearchQuery] = useState("");
  const [smsData, setSmsData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [bulkDeleting, setBulkDeleting] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");

  const handleRefresh = () => {
    setLoading(true);
    setStatusMessage("");
    // Simulated refresh
    setTimeout(() => {
      setLoading(false);
    }, 400);
  };

  const filteredData = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return smsData.filter((item) => {
      if (currentFilter !== "All" && item.folder && item.folder !== currentFilter) {
        return false;
      }
      if (!query) return true;
      const leadId = String(item.leadId || "").toLowerCase();
      const leadName = String(item.leadName || "").toLowerCase();
      const subject = String(item.subject || "").toLowerCase();
      const owner = String(item.activityOwner || "").toLowerCase();
      return (
        leadId.includes(query) ||
        leadName.includes(query) ||
        subject.includes(query) ||
        owner.includes(query)
      );
    });
  }, [smsData, currentFilter, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filteredData.length / RECORDS_PER_PAGE));

  const paginatedData = useMemo(() => {
    const start = (currentPage - 1) * RECORDS_PER_PAGE;
    return filteredData.slice(start, start + RECORDS_PER_PAGE);
  }, [currentPage, filteredData]);

  const showingFrom = filteredData.length === 0 ? 0 : (currentPage - 1) * RECORDS_PER_PAGE + 1;
  const showingTo = Math.min(currentPage * RECORDS_PER_PAGE, filteredData.length);

  const tableSelection = useTableSelection({
    rows: paginatedData,
    getRowId: (item) => item.id,
    disabled: bulkDeleting,
    pruneOnRowsChange: true,
  });

  const handleBulkDelete = () => {
    if (tableSelection.selectedCount === 0) return;
    if (!window.confirm(`Are you sure you want to delete ${tableSelection.selectedCount} selected SMS message(s)?`)) {
      return;
    }
    setBulkDeleting(true);
    setSmsData((prev) => prev.filter((item) => !tableSelection.selectedIds.includes(item.id)));
    tableSelection.clearSelection();
    setStatusMessage("Selected SMS messages deleted successfully.");
    setBulkDeleting(false);
    setTimeout(() => setStatusMessage(""), 4000);
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
        {/* Top Header Controls */}
        <div className="floor-header d-flex justify-content-between align-items-center flex-wrap gap-3">
          <div className="d-flex align-items-center gap-3">
            <select
              className="form-select booking-dropdown"
              value={currentFilter}
              onChange={(e) => {
                setCurrentFilter(e.target.value);
                setCurrentPage(1);
              }}
              aria-label="Filter SMS Messages"
            >
              <option value="Inbox">Inbox</option>
              <option value="Sent">Sent</option>
              <option value="Archive">Archive</option>
              <option value="All">All SMS</option>
            </select>
            <span className="item-count">{filteredData.length} items.</span>
          </div>

          <div className="action-wrapper d-flex align-items-center gap-2">
            <div className="search-container">
              <input
                type="text"
                className="form-control form-control-sm search-input-override"
                placeholder="Search SMS..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
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
              onClick={handleRefresh}
              disabled={loading}
              title="Refresh SMS records"
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
            entityLabel="SMS messages"
            isDeleting={bulkDeleting}
            onClear={() => {
              tableSelection.clearSelection();
              setStatusMessage("");
            }}
            onDelete={handleBulkDelete}
            deleteLabel="Delete selected"
          />
        )}

        {/* Table */}
        <div className="table-responsive">
          <table className="floor-table">
            <thead>
              <tr>
                <th style={{ borderStartStartRadius: "8px", borderEndStartRadius: "8px", width: "48px", textAlign: "center", padding: "14px 12px" }}>
                  <TableSelectionCheckbox
                    checked={tableSelection.allVisibleSelected}
                    indeterminate={tableSelection.isHeaderIndeterminate}
                    label="Select visible messages"
                    onChange={tableSelection.toggleVisible}
                    disabled={bulkDeleting || paginatedData.length === 0}
                  />
                </th>
                <th>LEAD ID</th>
                <th>LEAD NAME</th>
                <th>SUBJECT</th>
                <th>ACTIVITY OWNER</th>
                <th>ACTIVITY DATE</th>
                <th style={{ borderStartEndRadius: "8px", borderEndEndRadius: "8px", textAlign: "center" }}>ACTIONS</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="7" className="text-center py-4 text-muted">
                    Loading SMS messages...
                  </td>
                </tr>
              ) : filteredData.length === 0 ? (
                <tr>
                  <td colSpan="7" className="text-center py-5 text-muted">
                    <div style={{ fontSize: "15px", fontWeight: 600, color: "#475569", marginBottom: "4px" }}>
                      {searchQuery ? "No matching SMS messages found" : "No messages found"}
                    </div>
                    <div style={{ fontSize: "13px", color: "#94a3b8" }}>
                      We couldn't find anything relevant for you.
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedData.map((item) => (
                  <tr
                    key={item.id}
                    className={tableSelection.isSelected(item.id) ? "selected" : ""}
                  >
                    <td style={{ textAlign: "center", padding: "14px 12px" }}>
                      <TableSelectionCheckbox
                        checked={tableSelection.isSelected(item.id)}
                        label={`Select message ${item.id}`}
                        onChange={() => tableSelection.toggleRow(item.id)}
                        disabled={bulkDeleting}
                      />
                    </td>
                    <td>
                      <span className="text-muted" style={{ fontWeight: 600 }}>#{item.leadId}</span>
                    </td>
                    <td>
                      <strong>{item.leadName || "-"}</strong>
                    </td>
                    <td>{item.subject || "-"}</td>
                    <td>{item.activityOwner || "-"}</td>
                    <td>{item.activityDate || "-"}</td>
                    <td className="text-center">
                      <button
                        type="button"
                        className="admin-email-view"
                        aria-label={`View message ${item.id}`}
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

        {/* Pagination Footer */}
        <div className="booking-pagination">
          <span className="booking-pagination-info">
            Showing {showingFrom}-{showingTo} of {filteredData.length}
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
      </div>
    </div>
  );
};

export default Sms;
